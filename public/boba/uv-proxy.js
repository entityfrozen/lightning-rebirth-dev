// Reflux adds request/response middleware to the Ultraviolet browser engine.
// The underlying network connection is Epoxy over Celestial's own Wisp server.
// BareMux must be initialized BEFORE registering the Ultraviolet worker.
const loaded=new Map();
let enginePromise=null;
const ROOT='/uv/service/';
const withTimeout=(promise,label,ms=15000)=>{
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),ms)})])
  .finally(()=>clearTimeout(timer));
};
function loadScript(url){
 if(loaded.has(url))return loaded.get(url);
 const task=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=url;script.async=false;
  script.onload=resolve;
  script.onerror=()=>{script.remove();reject(Error('Could not load '+url))};
  document.head.append(script);
 }).catch(error=>{loaded.delete(url);throw error});
 loaded.set(url,task);
 return task;
}
async function startWorker(){
 const registration=await withTimeout(navigator.serviceWorker.register('/uv/sw.js',{
  scope:ROOT,updateViaCache:'none'
 }),'Installing the browser worker');
 if(registration.active)return;
 const worker=registration.installing||registration.waiting;
 if(!worker)throw Error('The browser worker could not start.');
 await withTimeout(new Promise((resolve,reject)=>{
  const changed=()=>{
   if(worker.state==='activated'){worker.removeEventListener('statechange',changed);resolve()}
   if(worker.state==='redundant'){worker.removeEventListener('statechange',changed);reject(Error('Browser worker became redundant'))}
  };
  worker.addEventListener('statechange',changed);changed();
 }),'Activating the browser worker');
}
export async function getUltravioletEngine(){
 if(!enginePromise)enginePromise=(async()=>{
  if(!window.isSecureContext||!navigator.serviceWorker)throw Error('Secure browsing requires HTTPS and service workers.');
  const response=await fetch('/api/browser/status',{credentials:'same-origin'});
  if(!response.ok)throw Error('Unable to check browser availability');
  const status=await response.json();
  if(!status.authenticated)throw Error('Sign in to use the browser.');
  if(!status.proxy)throw Error('The browser network connection is unavailable.');
  await loadScript('/baremux/index.js');
  await loadScript('/uv/uv.bundle.js');
  await loadScript('/uv/uv.config.js');
  if(!window.BareMux?.BareMuxConnection||!window.__uv$config?.encodeUrl){
   throw Error('The browser engine did not initialize.');
  }
  const connection=new BareMux.BareMuxConnection('/baremux/worker.js');
  const wisp=(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/wisp/';
  // Reflux 2.2.0 is a transport wrapper, not a replacement page rewriter.
  // An automatic Epoxy fallback preserves browsing when the optional layer
  // can't initialize. Both share the same Wisp endpoint and BareMux worker.
  let transport='reflux';
  try{
   await withTimeout(connection.setTransport('/reflux/index.mjs',[{
    base:'/epoxy/index.mjs',wisp
   }]),'Starting Reflux',18000);
  }catch(error){
   console.warn('Reflux unavailable; connecting directly:',error);
   transport='epoxy';
   await withTimeout(connection.setTransport('/epoxy/index.mjs',[{wisp}]),
    'Starting browser connection',18000);
  }
  // Verify the SharedWorker actually selected the transport we asked for,
  // then allow the Ultraviolet worker to intercept the first navigation.
  const selected=await withTimeout(connection.getTransport(),'Checking browser connection',8000);
  if(selected!==(transport==='reflux'?'/reflux/index.mjs':'/epoxy/index.mjs')){
   throw Error('The browser transport was not activated.');
  }
  // Ordering matters: set the BareMux transport before the SW is usable.
  await startWorker();
  return {
   transport,
   encode(url){
    const parsed=new URL(url);
    if(!['http:','https:'].includes(parsed.protocol))throw Error('Only HTTP(S) links are supported');
    return ROOT+window.__uv$config.encodeUrl(parsed.href);
   }
  };
 })().catch(error=>{enginePromise=null;throw error});
 return enginePromise;
}
export async function createUltravioletFrame(element,url){
 const engine=await getUltravioletEngine();
 const frame={
  go(nextUrl){element.src=engine.encode(nextUrl)},
  reload(){element.contentWindow?.location.reload()},
  dispose(){element.removeAttribute('src')}
 };
 frame.go(url);
 return frame;
}
