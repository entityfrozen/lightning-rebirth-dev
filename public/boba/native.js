import {mountReimuEffects} from './reimu-effects.js';
import {startAccountSync} from './account-sync.js';
import {mountShell} from './shell.js';
import {$,$$,ico,api,applyPrefs} from './common.js';
import {mountBrowser} from './browser.js';
import {mountHome} from './home.js';
import {mountGames} from './games.js';
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
 await startAccountSync(user);
 applyPrefs();
 window.dispatchEvent(new Event('celestial:reimu-refresh'));
 const items=[['home','Home','star'],['browser','Browser','web'],['games','Games','play'],['chat','Chat','discord'],['ai','Ask','ask'],['settings','Settings','settings'],['account','Account','user']];
 if(user.role==='admin')items.splice(items.length-1,0,['admin','Administration','shield']);
 const view=id=>$('[data-view="'+id+'"]');
 let current='home',paintSettings=()=>{},loadAdmin=()=>{};
 const browser=mountBrowser(view('browser'));
 const open=url=>{navigate('browser');browser.navigate(url,true)};
 mountHome(view('home'),user,navigate,open);
 mountGames(view('games'));
 function navigate(id){
  if(!items.some(x=>x[0]===id))id='home';
  current=id;
  if(id!=='browser'){$('[data-wv]')?.classList.remove('max');dock.classList.remove('hide')}
  const active=id;
  $$('.view',views).forEach(el=>{const on=el.dataset.view===active;el.classList.toggle('on',on);el.setAttribute('aria-hidden',String(!on));el.inert=!on});
  $$('.dk',dock).forEach(el=>{const on=el.dataset.section===id;el.classList.toggle('on',on);el.setAttribute('aria-current',on?'page':'false')});
  if(id==='browser'&&!browser.tabs.length) $('[data-wnew]').click();
  if(id==='settings')paintSettings();
  if(id==='admin')loadAdmin();
  // Short public URL: page selection stays in memory rather than the address bar.
  sessionStorage.setItem('celestial.lastView',id);
  if(location.pathname!=='/'||location.hash)history.replaceState(null,'','/');
 }
 const updateDock=()=>{
  const ai=$('.dk[data-section="ai"]',dock);
  if(ai)ai.hidden=localStorage.getItem('boba.dock.ai')==='false';
  if(current==='ai'&&ai?.hidden)navigate('home');
 };
 window.addEventListener('celestial:dock-settings',updateDock);
 items.forEach(([id,label,key])=>{const b=document.createElement('button');b.type='button';b.className='dk'+(id==='account'?' native-profile':'');b.dataset.section=id;b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<span class="t">'+(id==='home'?'<img src="/assets/celestial-star.svg" alt="" class="cel-dock-star">':id==='ai'?ico('ask'):N[key]?'<svg viewBox="0 0 24 24" aria-hidden="true">'+N[key]+'</svg>':ico(key))+'</span>';b.onclick=()=>navigate(id);dock.append(b)});
 mountAsk(view('ai'),user);mountChat(view('chat'),user);mountAccount(view('account'),user);
 if(user.role==='admin')loadAdmin=mountAdmin(view('admin'),user);
 view('settings').innerHTML=settings.html();paintSettings=settings.mount(view('settings'));
 updateDock();
 views.hidden=false;dock.hidden=false;
 navigate(location.hash.slice(1)||sessionStorage.getItem('celestial.lastView')||'home');
 window.addEventListener('hashchange',()=>{if(location.hash)navigate(location.hash.slice(1))});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dock.classList.contains('hide')){$('[data-wv]').classList.remove('max');dock.classList.remove('hide')}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='l'){e.preventDefault();navigate('browser');$('[data-omni]').focus()}});
}
start().catch(err=>{const p=document.createElement('p');p.className='native-start-error';p.textContent='Unable to load Celestial: '+err.message;document.body.append(p)});
