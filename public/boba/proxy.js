import {navigateWithNeutralFrameSrc} from './frame-navigation.js';
import {recordScramjet} from './scramjet-diagnostics.js';

// Scramjet adapter. The page owns a same-origin loader because the upstream
// proxy-bootstrap loader dynamically imports data: modules, blocked by our CSP.
// Proxy assets and Wisp remain session-protected by the server.
let controllerPromise=null;
let keepalive=null;
const timed=async(promise,label,ms=28000)=>{
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),ms)})])}
 finally{clearTimeout(timer)}
};
async function loadBootstrap(){
 if(typeof window.initBootstrap==='function')return;
 const load=url=>new Promise((resolve,reject)=>{
  const element=document.createElement('script');
  element.dataset.celestialProxy='true';
  element.src=url;
  element.onload=()=>typeof window.initBootstrap==='function'?resolve():reject(Error('Bootstrap did not initialize: '+url));
  element.onerror=()=>reject(Error('Could not load '+url));
  document.head.append(element);
 });
 // Prefer the same-origin bootstrap; vendor uses CSP-blocked data: modules.
 if(!window.__celestialProxyLoader){
  window.__celestialProxyLoader=(async()=>{
   const started=performance.now();
   recordScramjet('bootstrap','start');
   try{
    await timed(load('/proxy-entry.js'),'Local Scramjet bootstrap',12000);
    recordScramjet('bootstrap','ok',{durationMs:performance.now()-started});
   }catch(error){
    recordScramjet('bootstrap','error',{error});
    if(typeof window.initBootstrap==='function')return;
    await timed(load('/bootstrap-init.js'),'Fallback Scramjet bootstrap',12000);
   }
  })().catch(error=>{window.__celestialProxyLoader=null;throw error});
 }
 await timed(window.__celestialProxyLoader,'Loading Scramjet bootstrap',28000);
}
export async function getProxyController(){
  if(!controllerPromise)controllerPromise=(async()=>{
    await loadBootstrap();
    if(!window.isSecureContext)throw Error('Open Celestial over HTTPS to use the browser.');
    if(!('serviceWorker' in navigator))throw Error('Service workers are unavailable in this browser.');
    // The same-origin bootstrap creates its worker, loads the published
    // runtime in order, then awaits the controller's Wisp/WASM handshake.
    const started=performance.now();
    recordScramjet('controller-init','start');
    let controller;
    try{
      controller=await timed(Promise.resolve().then(()=>window.initBootstrap()),'Starting Scramjet',40000);
      if(!controller?.createFrame)throw Error('The browser engine did not finish initializing.');
      if(typeof controller.wait==='function')await timed(controller.wait(),'Waiting for Scramjet',26000);
      recordScramjet('controller-ready','ok',{durationMs:performance.now()-started});
    }catch(error){
      recordScramjet('controller-init',/timed out/.test(error.message)?'timeout':'error',{error,durationMs:performance.now()-started});
      throw error;
    }
    if(!keepalive)keepalive=window.setInterval(()=>{
      try{navigator.serviceWorker.controller?.postMessage('keepalive');}catch{}
    },15000);
    return controller;
  })().catch(error=>{controllerPromise=null;throw error;});
  return controllerPromise;
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
      if(['http:','https:'].includes(parsed.protocol))openTab?.(parsed.href);
    }catch{}
    return new URL('/',location.origin);
  }));
  const started=performance.now();
  recordScramjet('frame-create','start');
  let frame;
  try{
    frame=controller.createFrame(element,{plugins});
    recordScramjet('frame-create','ok',{durationMs:performance.now()-started});
  }catch(error){recordScramjet('frame-create','error',{error});throw error}
  const originalGo=frame.go;
  frame.go=url=>{
    frame.go=originalGo;
    recordScramjet('navigate','start');
    try{return navigateWithNeutralFrameSrc(frame,url)}
    catch(error){recordScramjet('navigation-failed','error',{error});throw error}
    finally{frame.go=navigate}
  };
  const navigate=frame.go;
  return frame;
}
