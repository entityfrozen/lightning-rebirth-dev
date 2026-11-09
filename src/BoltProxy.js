// Thin adapter around the same Mercury Workshop Scramjet integration used in Bolt.
// The browser transport is authenticated server-side; there is no public Wisp endpoint.
let controllerPromise=null;
async function loadBootstrap() {
  if(typeof window.initBootstrap==='function')return;
  await new Promise((resolve,reject)=>{
    const prior=document.querySelector('script[data-celestial-proxy]');
    if(prior){prior.addEventListener('load',resolve,{once:true});prior.addEventListener('error',()=>reject(Error('Browser bootstrap unavailable')),{once:true});return;}
    const element=document.createElement('script');
    element.dataset.celestialProxy='true';
    element.src='/bootstrap-init.js';
    element.onload=resolve;
    element.onerror=()=>reject(Error('Browser engine unavailable. Sign in and try again.'));
    document.head.append(element);
  });
  if(typeof window.initBootstrap!=='function')throw Error('Scramjet bootstrap could not initialize.');
}
export async function getProxyController(){
  if(!controllerPromise)controllerPromise=(async()=>{
    await loadBootstrap();
    return window.initBootstrap();
  })().catch(error=>{controllerPromise=null;throw error;});
  return controllerPromise;
}
export async function createProxyFrame(element,onNavigate,openTab){
  const controller=await getProxyController();
  const utils=window.$scramjetUtils;
  const plugins=[];
  if(utils?.HttpCachePlugin)plugins.push(new utils.HttpCachePlugin());
  if(utils?.UrlWatcherPlugin)plugins.push(new utils.UrlWatcherPlugin(url=>onNavigate?.(String(url))));
  if(utils?.CatchEscapedLinksPlugin)plugins.push(new utils.CatchEscapedLinksPlugin(url=>{
    const href=url?.href||String(url);
    openTab?.(href);
    return new URL('/',location.origin);
  }));
  return controller.createFrame(element,{plugins});
}
