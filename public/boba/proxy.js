// Scramjet adapter. The page owns a same-origin loader because the upstream
// proxy-bootstrap loader dynamically imports data: modules, blocked by our CSP.
// Proxy assets and Wisp remain session-protected by the server.
let controllerPromise=null;
let keepalive=null;
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
 // Lightning's official proxy-bootstrap was working before the custom loader.
 // Use it first; retain the same-origin loader only for compatibility.
 if(!window.__celestialProxyLoader){
  window.__celestialProxyLoader=(async()=>{
   try{await load('/bootstrap-init.js')}
   catch(primaryError){
    if(typeof window.initBootstrap==='function')return;
    try{await load('/proxy-entry.js')}
    catch(fallbackError){throw Error('Scramjet bootstrap failed: '+primaryError.message+'; '+fallbackError.message)}
   }
  })().catch(error=>{window.__celestialProxyLoader=null;throw error});
 }
 await window.__celestialProxyLoader;
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
