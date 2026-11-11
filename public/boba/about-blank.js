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
  doc.body.append(frame,notice);
  // Only trust appearance messages from the iframe we created on our origin.
  popup.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
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
