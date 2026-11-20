// Legacy React shell adapter for Celestial's first-party HTTP gateway.
// The frame is sandboxed because remote HTML must not share our app origin.
function encode(value){
  const bytes=new TextEncoder().encode(value);
  let raw='';
  for(const byte of bytes)raw+=String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function disposeProxyFrame(frame){frame?.dispose?.()}
export async function createProxyFrame(element,onNavigate,openTab){
  const response=await fetch('/api/browser/token',{credentials:'same-origin'});
  if(!response.ok)throw Error('Browser session unavailable');
  const {token}=await response.json();
  if(!token)throw Error('Browser session unavailable');
  element.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-downloads');
  let disposed=false;
  let current='';
  const listener=event=>{
    if(disposed||event.source!==element.contentWindow||event.data?.type!=='celestial:browse')return;
    if(event.data.state==='ready')onNavigate?.(current);
  };
  window.addEventListener('message',listener);
  return {
    go(url){
      current=new URL(url).href;
      element.src='/browse/u/'+encode(current)+'?key='+encodeURIComponent(token);
    },
    reload(){if(current)this.go(current)},
    back(){element.contentWindow?.history.back()},
    forward(){element.contentWindow?.history.forward()},
    dispose(){disposed=true;window.removeEventListener('message',listener)}
  };
}
