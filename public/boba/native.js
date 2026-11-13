import {mountReimuEffects} from './reimu-effects.js';
import {startAccountSync} from './account-sync.js';
import {mountShell} from './shell.js';
import {viewMarker} from './view-markers.js';
import {$,$$,ico,api,applyPrefs} from './common.js';
import {mountBrowser} from './browser.js';
import {mountHome} from './home.js';
import {mountArcade} from './games.js';
import {mountAsk,mountAccount} from './native-views.js';
import {mountChat} from './chat.js';
import {settings} from './settings.js';
import {mountAdmin} from './admin.js';
import {N} from './icons.js';
mountShell();
applyPrefs();
mountReimuEffects();
async function start(){
 const data=await api('/api/me');
 if(!data.user){location.replace('/login');return}
 const user=data.user,views=$('#views'),dock=$('#dock');
 // An account sync outage must never prevent the local workspace from opening.
 try{await startAccountSync(user)}catch(error){console.warn('Account preferences unavailable:',error)}
 applyPrefs();
 window.dispatchEvent(new Event('celestial:reimu-refresh'));
 const items=[['home','Home','star'],['browser','Browser','web'],['games','Library','play'],['chat','Chat','discord'],['ai','Ask','ask'],['settings','Settings','settings'],['account','Account','user']];
 if(user.role==='admin')items.splice(items.length-1,0,['admin','Administration','shield']);
 const view=id=>$('[data-view="'+viewMarker(id)+'"]');
 let current='home',paintSettings=()=>{},loadAdmin=()=>{};
 const mountSafely=(name,element,callback)=>{
  try{return callback()}catch(error){
   console.error('Brightpath '+name+' startup failed:',error);
   element.replaceChildren();
   const message=document.createElement('p');
   message.className='native-start-error';
   message.textContent=name+' is temporarily unavailable: '+error.message;
   element.append(message);
   return null;
  }
 };
 const browser=mountSafely('Browser',view('browser'),()=>mountBrowser(view('browser')))||{tabs:[],navigate(){},available:false};
 const open=url=>{navigate('browser');browser.navigate(url,true)};
 mountSafely('Home',view('home'),()=>mountHome(view('home'),user,navigate,open));
 mountSafely('Library',view('games'),()=>mountArcade(view('games')));
 function navigate(id){
  if(!items.some(x=>x[0]===id))id='home';
  current=id;
  if(id!=='browser'){$('[data-wv]')?.classList.remove('max');dock.classList.remove('hide')}
  const active=id;
  for(const el of views.querySelectorAll('.view')){const on=el.dataset.view===viewMarker(active);el.classList.toggle('on',on);el.setAttribute('aria-hidden',String(!on));el.inert=!on}
  for(const el of dock.querySelectorAll('.dk')){const on=el.dataset.section===viewMarker(id);el.classList.toggle('on',on);el.setAttribute('aria-current',on?'page':'false')}
  if(id==='browser'&&browser.available!==false&&!browser.tabs.length) $('[data-wnew]')?.click();
  if(id==='settings')paintSettings();
  if(id==='admin')loadAdmin();
  // Short public URL: page selection stays in memory rather than the address bar.
  sessionStorage.setItem('celestial.lastView',id);
  if(location.pathname!=='/'||location.hash)history.replaceState(null,'','/');
 }
 const updateDock=()=>{
  const ai=$('.dk[data-section="'+viewMarker('ai')+'"]',dock);
  if(ai)ai.hidden=localStorage.getItem('boba.dock.ai')==='false';
  if(current==='ai'&&ai?.hidden)navigate('home');
 };
 window.addEventListener('celestial:dock-settings',updateDock);
 for(const [id,label,key] of items){const b=document.createElement('button');b.type='button';b.className='dk'+(id==='account'?' native-profile':'');b.dataset.section=viewMarker(id);b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<span class="t">'+(id==='home'?'<img src="/assets/brightpath-star.svg" alt="" class="cel-dock-star">':id==='ai'?ico('ask'):N[key]?'<svg viewBox="0 0 24 24" aria-hidden="true">'+N[key]+'</svg>':ico(key))+'</span>';b.onclick=()=>navigate(id);dock.append(b)}
 mountSafely('AI',view('ai'),()=>mountAsk(view('ai'),user));
 mountSafely('Chat',view('chat'),()=>mountChat(view('chat'),user));
 mountSafely('Account',view('account'),()=>mountAccount(view('account'),user));
 if(user.role==='admin')loadAdmin=mountSafely('Administration',view('admin'),()=>mountAdmin(view('admin'),user))||(()=>{});
 mountSafely('Settings',view('settings'),()=>{
  view('settings').innerHTML=settings.html();
  paintSettings=settings.mount(view('settings'));
 });
 updateDock();
 views.hidden=false;dock.hidden=false;
 navigate(location.hash.slice(1)||sessionStorage.getItem('celestial.lastView')||'home');
 window.addEventListener('hashchange',()=>{if(location.hash)navigate(location.hash.slice(1))});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dock.classList.contains('hide')){$('[data-wv]').classList.remove('max');dock.classList.remove('hide')}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='l'){e.preventDefault();navigate('browser');$('[data-omni]').focus()}});
}
start().catch(err=>{
 console.error('Brightpath critical startup failure:',err);
 const p=document.createElement('p');p.className='native-start-error';
 p.textContent='Unable to load Brightpath: '+err.message;
 document.body.append(p);
});
