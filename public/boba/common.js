import {I,N} from './icons.js';
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const aiIcon='<svg class="cel-ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="5"/><path d="M8 18.5v3l4-3M9 10v4m6-4v4M12 2v3.5"/><path d="M1 10.5v3M23 10.5v3"/></svg>';
export const ico=(k,cl='')=>k==='ask'?aiIcon:'<svg class="'+cl+'" viewBox="0 0 256 256" aria-hidden="true">'+(I[k]||I.link||'')+'</svg>';
export const lic=(k,a,b)=>'<span class="lic" style="background:linear-gradient(145deg,'+a+','+b+')">'+ico(k)+'</span>';
export async function api(path,body){const r=await fetch(path,{credentials:'same-origin',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export const THEMES=[['boba','Celestial','light'],['light','Light','light'],['dark','Dark','dark'],['strawberry','Strawberry','light'],['matcha','Matcha','light'],['mango','Mango','light'],['sky','Sky','light'],['taro','Taro','dark'],['midnight','Midnight','dark'],['brown','Brown','dark'],['black','Black','dark']];
export const ACCENTS=[['#8a5631','#fff'],['#ea6b96','#fff'],['#4c9461','#fff'],['#d69c31','#fff'],['#397cc9','#fff'],['#8d62db','#fff'],['#252b39','#fff']];
export function applyPrefs(){const root=document.documentElement;const v=localStorage.getItem('celestial.boba.theme')||'boba';root.dataset.palette=v;root.dataset.theme=THEMES.find(t=>t[0]===v)?.[2]||'light';root.dataset.fx=localStorage.getItem('boba.fx')||'full';const a=ACCENTS[Number(localStorage.getItem('boba.accent')||0)];if(a){root.style.setProperty('--acc',a[0]);root.style.setProperty('--acc-ink',a[1])}}
export function segThumb(seg){const b=seg.querySelector('button.on');if(b){seg.querySelector('.th').style.width=b.offsetWidth+'px';seg.querySelector('.th').style.transform='translateX('+(b.offsetLeft-3)+'px)'}}
