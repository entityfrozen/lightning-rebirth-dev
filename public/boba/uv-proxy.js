// Ultraviolet 3.x uses its own service worker and BareMux transport.
// It must not reuse Scramjet's Controller or its newer transport generation.
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
  script.onerror=()=>reject(Error('Could not load '+url));
  document.head.append(script);
 }).catch(error=>{loaded.delete(url);throw error});
 loaded.set(url,task);
 return task;
}
export async function getUltravioletEngine(){
 if(!enginePromise)enginePromise=(async()=>{
  if(!window.isSecureContext||!navigator.serviceWorker)throw Error('Ultraviolet requires HTTPS and service workers.');
  const response=await fetch('/api/browser/status',{credentials:'same-origin'});
  if(!response.ok)throw Error('Unable to check browser availability');
  const status=await response.json();
  if(!status.authenticated)throw Error('Sign in to use Ultraviolet.');
  if(!status.proxy)throw Error('The Wisp transport is unavailable.');
  await loadScript('/baremux/index.js');
  await loadScript('/uv/uv.bundle.js');
  await loadScript('/uv/uv.config.js');
  if(!window.BareMux?.BareMuxConnection||!window.__uv$config?.encodeUrl)throw Error('Ultraviolet scripts did not initialize.');
  const registration=await withTimeout(navigator.serviceWorker.register('/uv/sw.js',{
   scope:ROOT,updateViaCache:'none'
  }),'Installing Ultraviolet service worker');
  if(!registration.active){
   const installing=registration.installing||registration.waiting;
   if(!installing)throw Error('Ultraviolet worker could not start.');
   await withTimeout(new Promise((resolve,reject)=>{
    function changed(){
     if(installing.state==='activated'){installing.removeEventListener('statechange',changed);resolve();}
     if(installing.state==='redundant'){installing.removeEventListener('statechange',changed);reject(Error('Ultraviolet worker became redundant.'));}
    }
    installing.addEventListener('statechange',changed);changed();
   }),'Activating Ultraviolet worker');
  }
  const connection=new BareMux.BareMuxConnection('/baremux/worker.js');
  const wisp=(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/wisp/';
  await withTimeout(connection.setTransport('/epoxy/index.mjs',[{wisp}]),'Connecting Ultraviolet transport',25000);
  return {
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
