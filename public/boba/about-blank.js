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
  // about:blank has no stable URL base; use an absolute favicon reference.
  const favicon=doc.createElement('link');favicon.rel='icon';favicon.type='image/svg+xml';
  const defaultIcon=new URL('/assets/celestial-star.svg',location.origin).href;
  try{
   const supplied=new URL(appearance.icon||defaultIcon,location.origin);
   favicon.href=supplied.protocol==='https:'||supplied.origin===location.origin?supplied.href:defaultIcon;
  }catch{favicon.href=defaultIcon}
  doc.head.append(favicon);
  // Native beforeunload prompts are optional at the browser's discretion.
  // They cannot forcibly prevent closing a tab.
  const guardEnabled=appearance.preventClose!==false&&
    localStorage.getItem('boba.preventClose')!=='false';
  if(guardEnabled)popup.addEventListener('beforeunload',event=>{
   event.preventDefault();event.returnValue='';
  });
  const frame=doc.createElement('iframe');
  frame.title='Website';
  frame.src=destination.href;
  frame.referrerPolicy='no-referrer';
  // Delegate media and isolation permissions through the cloaked workspace.
  frame.allow='cross-origin-isolated; autoplay; encrypted-media; fullscreen; clipboard-read; clipboard-write; picture-in-picture';
  frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:#111621';
  // A framed workspace is a real application, not just an iframe. Keep a
  // small recovery surface in the about:blank tab so blocked workers do not
  // leave the user staring at an unresponsive blank page.
  const notice=doc.createElement('aside');
  notice.dataset.cloakStatus='true';
  notice.style.cssText='position:fixed;left:14px;bottom:14px;z-index:10;display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:9px 12px;border-radius:11px;background:#202936;color:white;font:12px system-ui;box-shadow:0 2px 12px #0006;max-width:calc(100% - 28px)';
  const label=doc.createElement('span');
  label.textContent='Starting Celestial browser…';
  const restart=doc.createElement('button');
  restart.type='button';
  restart.textContent='Restart browser';
  restart.dataset.cloakRestart='true';
  const fallback=doc.createElement('a');
  fallback.href=destination.origin+'/';
  fallback.target='_blank';fallback.rel='noopener noreferrer';
  fallback.textContent='Open regular tab';
  const dismiss=doc.createElement('button');
  dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','Hide status');
  for(const element of [restart,dismiss]){
   element.style.cssText='border:1px solid #ffffff36;border-radius:7px;padding:6px 9px;background:#303d4e;color:white;font:600 12px system-ui;cursor:pointer';
  }
  fallback.style.cssText='color:#9dd9ff;white-space:nowrap';
  dismiss.onclick=()=>{notice.style.display='none'};
  let ready=false,failures=0,watchdog;
  const display=(message,failed=false)=>{
   label.textContent=message;
   notice.style.display='flex';
   restart.hidden=!failed;
  };
  const startWatchdog=()=>{
   popup.clearTimeout(watchdog);
   watchdog=popup.setTimeout(()=>{
    if(ready)return;
    display('Celestial did not finish opening. Restart the browser to reconnect.',true);
   },22000);
  };
  const restartFrame=()=>{
   if(failures>=3){
    display('Repeated startup failures. Try a regular tab or clear this site\'s browser data.',true);
    return;
   }
   failures+=1;
   ready=false;
   display('Reconnecting browser…');
   // Use a fresh document rather than reloading a stalled iframe in place.
   // Existing authentication stays in the site's normal secure cookies.
   frame.src=destination.origin+'/?cloaked=1&retry='+failures;
   startWatchdog();
  };
  restart.onclick=restartFrame;
  notice.append(label,restart,fallback,dismiss);
  restart.hidden=true;
  doc.body.append(frame,notice);
  const isWorkspace=destination.origin===location.origin&&
    (destination.pathname==='/'||destination.pathname==='/boba/index.html');
  if(isWorkspace){
   frame.src=destination.origin+'/?cloaked=1';
   fallback.href=destination.origin+'/';
   startWatchdog();
  }else{
   label.textContent='This website may prevent being opened inside a frame.';
   fallback.href=destination.href;
   restart.hidden=true;
  }
  popup.addEventListener('pagehide',()=>popup.clearTimeout(watchdog),{once:true});
  // Only accept signals from the workspace we created. Other pages or
  // unrelated iframes cannot dismiss an error or rewrite this control.
  popup.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
   const message=event.data;
   if(!message||typeof message!=='object')return;
   if(message.type==='celestial:auth-success'){
    restartFrame();
    return;
   }
   if(message.type==='celestial:auth-required'){
    ready=true;popup.clearTimeout(watchdog);
    display('Sign in to Celestial in this window to enable the browser.');
    return;
   }
   if(message.type==='celestial:workspace-failed'){
    ready=false;popup.clearTimeout(watchdog);
    display('Celestial could not finish starting. Restart the browser.',true);
    return;
   }
   if(message.type==='celestial:workspace-ready'){
    ready=true;failures=0;
    popup.clearTimeout(watchdog);
    display('Celestial browser ready');
    popup.setTimeout(()=>{if(ready)notice.style.display='none'},1800);
    return;
   }
   if(message.type==='celestial:browser-status'){
    if(message.status==='failed'){
     ready=false;
     display('Browser navigation failed. Change engines in Browser, or restart the workspace.',true);
    }else if(message.status==='ready'){
     ready=true;popup.clearTimeout(watchdog);
     notice.style.display='none';
    }
    return;
   }
   if(message.type!=='celestial:appearance')return;
   doc.title=String(message.title||doc.title).slice(0,70);
   try{
    const icon=new URL(message.icon,location.origin);
    if(icon.protocol==='https:'||icon.origin===location.origin)favicon.href=icon.href;
   }catch{}
  });
  popup.focus();
  return {ok:true};
 }catch(error){try{popup.close()}catch{}
  return {ok:false,message:'This browser does not allow an about:blank wrapper. Open a regular tab instead.'}
 }
}
