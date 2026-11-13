// Optional tab wrapper for display preferences and sites that allow framing.
// A browser's security restrictions still apply; this is not a proxy.
export function openAboutBlank(target,appearance={}){
 let destination;
 try{
  destination=new URL(target,location.href);
  if(!['http:','https:'].includes(destination.protocol))throw Error('Unsupported address');
 }catch{return {ok:false,message:'Enter a valid website address.'}}
 const popup=window.open('about:blank','_blank');
 if(!popup)return {ok:false,message:'The browser blocked the new tab. Allow popups and try again.'};
 try{
  const doc=popup.document;
  doc.title=String(appearance.title||'Celestial').slice(0,70);
  doc.body.replaceChildren();
  doc.documentElement.style.cssText='width:100%;height:100%;margin:0';
  doc.body.style.cssText='width:100%;height:100%;margin:0;overflow:hidden;background:#111621';
  const favicon=doc.createElement('link');favicon.rel='icon';
  favicon.href=appearance.icon||'/assets/celestial-star.svg';doc.head.append(favicon);
  const frame=doc.createElement('iframe');
  frame.title='Website';
  frame.src=destination.href;
  frame.referrerPolicy='no-referrer';
  frame.allow='fullscreen; clipboard-read; clipboard-write; picture-in-picture';
  frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:#111621';
  const notice=doc.createElement('aside');
  notice.style.cssText='position:fixed;left:14px;bottom:14px;z-index:10;display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:10px;background:#202936;color:white;font:12px system-ui;box-shadow:0 2px 12px #0006;max-width:calc(100% - 28px)';
  const label=doc.createElement('span');
  label.textContent='If the page is blank, this site may block embedded windows.';
  const fallback=doc.createElement('a');
  fallback.href=destination.href;fallback.target='_blank';fallback.rel='noopener noreferrer';
  fallback.textContent='Open regular tab';fallback.style.cssText='color:#9dd9ff;white-space:nowrap';
  const dismiss=doc.createElement('button');
  dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','Dismiss');
  dismiss.style.cssText='border:0;background:none;color:white;font:20px system-ui;cursor:pointer';
  dismiss.onclick=()=>notice.remove();
  notice.append(label,fallback,dismiss);
  // A Scramjet controller needs a top-level isolated HTTPS document.
  // Keep an escape hatch in the *wrapper*, not in the framed application:
  // privacy checks or frame restrictions can prevent the iframe loading.
  if(destination.origin===location.origin&&(destination.pathname==='/'||destination.pathname==='/boba/index.html')){
   label.textContent='Embedded browsing starts with Ultraviolet. Scramjet may require a regular tab.';
   const standalone=doc.createElement('button');
   standalone.type='button';
   standalone.dataset.openStandalone='true';
   standalone.textContent='Open Browser';
   standalone.style.cssText='border:0;border-radius:7px;padding:7px 10px;background:#75d4df;color:#06141b;font-weight:700;cursor:pointer;white-space:nowrap';
   standalone.onclick=()=>{
    const browser=new URL('/',destination.origin);
    popup.location.assign(browser.href);
   };
   notice.insertBefore(standalone,fallback);
  }
  doc.body.append(frame,notice);
  // The iframe handles its own sign-in redirect. The parent also refreshes it
  // on a successful login in case the browser delays child navigation.
  // Only trust messages from the iframe we created on our origin.
  popup.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
   if(event.data?.type==='celestial:auth-success'){
    frame.src=destination.origin+'/';
    return;
   }
   if(event.data?.type!=='celestial:appearance')return;
   doc.title=String(event.data.title||doc.title).slice(0,70);
   try{const icon=new URL(event.data.icon,location.origin);
    if(icon.protocol==='https:'||icon.origin===location.origin)favicon.href=icon.href}catch{}
  });
  popup.focus();
  return {ok:true};
 }catch(error){try{popup.close()}catch{}
  return {ok:false,message:'This browser does not allow an about:blank wrapper. Open a regular tab instead.'}
 }
}
