// Scramjet adapter. The page owns a same-origin loader because the upstream
// proxy-bootstrap loader dynamically imports data: modules, blocked by our CSP.
// Proxy assets and Wisp remain session-protected by the server.
let controllerPromise=null;
let keepalive=null;
async function loadBootstrap() {
  if(typeof window.initBootstrap==='function')return;
  await new Promise((resolve,reject)=>{
    const prior=document.querySelector('script[data-celestial-proxy]');
    if(prior){
      if(prior.dataset.state==='loaded'){
        if(typeof window.initBootstrap==='function'){resolve();return;}
        prior.remove();
      }else if(prior.dataset.state!=='error'){
        prior.addEventListener('load',resolve,{once:true});
        prior.addEventListener('error',()=>reject(Error('Browser bootstrap unavailable')),{once:true});
        return;
      }else prior.remove();
    }
    const element=document.createElement('script');
    element.dataset.celestialProxy='true';
    element.src='/proxy-entry.js';
    element.onload=()=>{element.dataset.state='loaded';resolve();};
    element.onerror=()=>{element.dataset.state='error';reject(Error('Browser engine unavailable. Sign in and try again.'));};
    document.head.append(element);
  });
  if(typeof window.initBootstrap!=='function')throw Error('Scramjet bootstrap could not initialize.');
}
export async function getProxyController(){
  if(!controllerPromise)controllerPromise=(async()=>{
    await loadBootstrap();
    if(!window.isSecureContext)throw Error('Open Celestial over HTTPS to use the browser.');
    if(!('serviceWorker' in navigator))throw Error('Service workers are unavailable in this browser.');
    // The same-origin bootstrap creates its worker, loads the published
    // runtime in order, then awaits the controller's Wisp/WASM handshake.
    const controller=await window.initBootstrap();
    if(!controller?.createFrame)throw Error('The browser engine did not finish initializing.');
    if(typeof controller.wait==='function')await controller.wait();
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
  return controller.createFrame(element,{plugins});
}
