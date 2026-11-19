import {recordScramjet} from './scramjet-diagnostics.js';

// Boba's Scramjet V2 adapter. Reflux/Ultraviolet keep their own transport.
const KEY='boba.scramjet.transport';
let bootstrapPromise=null;
let keepalive=null;
const supported=new Set(['libcurl','epoxy']);

export function getScramjetTransport(){
  try{const value=localStorage.getItem(KEY);return supported.has(value)?value:'libcurl'}
  catch{return 'libcurl'}
}

function withTimeout(promise,label,ms=40000){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(label+' timed out')),ms);
  })]).finally(()=>clearTimeout(timer));
}

async function loadBootstrap(){
  if(typeof window.initBootstrap==='function')return;
  if(!bootstrapPromise){
    bootstrapPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='/proxy-entry.js';
      script.dataset.celestialProxy='v2';
      script.onload=()=>typeof window.initBootstrap==='function'
        ?resolve():reject(new Error('Scramjet V2 bootstrap unavailable'));
      script.onerror=()=>{
        script.remove();
        reject(new Error('Scramjet V2 bootstrap could not load'));
      };
      document.head.append(script);
    }).catch(error=>{
      bootstrapPromise=null;
      document.querySelector('script[data-celestial-proxy="v2"]')?.remove();
      throw error;
    });
  }
  await withTimeout(bootstrapPromise,'Scramjet bootstrap',16000);
}

export async function getProxyController(transport=getScramjetTransport()){
  if(!supported.has(transport))transport='libcurl';
  recordScramjet('controller-init','start');
  const began=performance.now();
  try{
    await loadBootstrap();
    if(!window.isSecureContext)throw new Error('Browser requires HTTPS.');
    if(!('serviceWorker' in navigator))throw new Error('Service workers unsupported.');
    const controller=await withTimeout(window.initBootstrap(transport),'Scramjet V2 handshake');
    if(typeof controller?.createFrame!=='function'){
      throw new Error('Scramjet V2 controller did not initialize.');
    }
    if(!keepalive)keepalive=setInterval(()=>{
      try{
        (controller.serviceWorkerController||navigator.serviceWorker.controller)?.postMessage('keepalive');
      }catch{}
    },15000);
    recordScramjet('controller-ready','ok',{durationMs:performance.now()-began});
    return controller;
  }catch(error){
    recordScramjet('controller-init',/timed out/i.test(error?.message)?'timeout':'error',{error});
    throw error;
  }
}

export async function setScramjetTransport(next){
  if(!supported.has(next))throw new Error('Unsupported Scramjet transport');
  // Test the new transport before persisting the choice.
  if(typeof window.initBootstrap==='function')await getProxyController(next);
  localStorage.setItem(KEY,next);
  window.dispatchEvent(new CustomEvent('celestial:scramjet-transport',{detail:{transport:next}}));
  return next;
}

export function disposeProxyFrame(frame){
  if(!frame)return;
  try{
    const list=frame.controller?.frames;
    if(Array.isArray(list)){
      const index=list.indexOf(frame);
      if(index>=0)list.splice(index,1);
    }
  }catch{}
}

export async function createProxyFrame(element,onNavigate,openTab){
  const controller=await getProxyController();
  const utils=window.$scramjetUtils;
  const plugins=[];
  if(utils?.HttpCachePlugin)plugins.push(new utils.HttpCachePlugin());
  if(utils?.UrlWatcherPlugin)plugins.push(new utils.UrlWatcherPlugin(url=>onNavigate?.(String(url))));
  if(utils?.CatchEscapedLinksPlugin)plugins.push(new utils.CatchEscapedLinksPlugin(url=>{
    const href=url?.href||String(url);
    try{
      const parsed=new URL(href);
      if(parsed.protocol==='http:'||parsed.protocol==='https:')openTab?.(parsed.href);
    }catch{}
    return new URL('/',location.origin);
  }));

  const started=performance.now();
  recordScramjet('frame-create','start');
  let frame;
  try{
    frame=controller.createFrame(element,{plugins});
    recordScramjet('frame-create','ok',{durationMs:performance.now()-started});
  }catch(error){
    recordScramjet('frame-create','error',{error});
    throw error;
  }
  const upstreamGo=frame.go.bind(frame);
  frame.go=url=>{
    recordScramjet('navigate','start');
    try{return upstreamGo(url)}
    catch(error){recordScramjet('navigation-failed','error',{error});throw error}
  };
  return frame;
}
