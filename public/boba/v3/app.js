import {api,applyPrefs,esc} from '../common.js';
import {viewMarker} from '../view-markers.js';
import {startAccountSync} from '../account-sync.js';
import {mountV3Shell} from './shell.js';

// Each feature keeps its existing API contract and mounts exactly once.
// The navigation layer is separate from the business logic, and boot only
// needs to authenticate plus mount the first visible view.
export async function bootV3(){
  const {user}=await api('/api/me');
  if(!user){location.replace('/login');return;}
  applyPrefs();
  const ui=mountV3Shell(user);
  const mounted=new Map();
  let active='home',focusBeforeDialog=null;

  const getView=id=>ui.views.querySelector('[data-view="'+viewMarker(id)+'"]');
  const section=id=>ui.sections.find(entry=>entry.id===id);
  const loaders={
    home:async root=>{
      const {mountV3Home}=await import('./home.js');
      mountV3Home(root,{user,navigate,openBrowser});
    },
    browser:async root=>{
      const {mountBrowser}=await import('../browser.js');
      const browser=mountBrowser(root);
      return browser;
    },
    chat:async root=>{
      const {mountChat}=await import('../chat.js');
      const result=mountChat(root,user);
      // Retain the proven chat backend; remove the retired UI identity.
      const heading=root.querySelector('.cel-chat-brand strong');
      if(heading)heading.textContent='Celestial';
      return result;
    },
    ai:async root=>{
      const {mountAsk}=await import('../native-views.js');
      return mountAsk(root,user);
    },
    settings:async root=>{
      const {settings}=await import('../settings.js');
      root.innerHTML=settings.html();
      return settings.mount(root);
    },
    account:async root=>{
      const {mountAccount}=await import('../native-views.js');
      return mountAccount(root,user);
    },
    admin:async root=>{
      const {mountAdmin}=await import('../admin.js');
      return mountAdmin(root,user);
    }
  };
  async function ensure(id){
    if(mounted.has(id))return mounted.get(id);
    const root=getView(id);
    if(!root||!loaders[id])return null;
    root.innerHTML='<div class="v3-loading" role="status"><span class="v3-loading-symbol">✦</span><strong>Opening '+esc(section(id)?.label||'workspace')+'…</strong><small>Preparing your space</small></div>';
    const task=Promise.resolve().then(()=>loaders[id](root)).catch(error=>{
      console.error('Celestial V3 feature failed:',id,error);
      mounted.delete(id);
      root.replaceChildren();
      const panel=document.createElement('div');
      panel.className='v3-loading v3-error';
      const title=document.createElement('strong');
      title.textContent='This part of your space could not load.';
      const description=document.createElement('p');
      description.textContent=error.message||'An unexpected error occurred.';
      const retry=document.createElement('button');
      retry.type='button';retry.className='v3-button v3-button-primary';
      retry.textContent='Try again';
      retry.addEventListener('click',()=>ensure(id));
      panel.append(title,description,retry);root.append(panel);
      return null;
    });
    mounted.set(id,task);
    return task;
  }
  function activate(id){
    active=id;
    ui.title.textContent=section(id).label;
    for(const view of ui.views.querySelectorAll('.view')){
      const on=view.dataset.view===viewMarker(id);
      view.classList.toggle('on',on);
      view.setAttribute('aria-hidden',String(!on));
      view.inert=!on;
    }
    for(const button of ui.root.querySelectorAll('[data-section]')){
      const on=button.dataset.section===viewMarker(id);
      button.classList.toggle('on',on);
      button.setAttribute('aria-current',on?'page':'false');
    }
    const browser=ui.root.querySelector('[data-wv]');
    if(id!=='browser')browser?.classList.remove('max');
    if(id!=='browser')ui.dock.classList.remove('hide');
    try{sessionStorage.setItem('celestial.lastView',id);}catch{}
    if(location.hash||location.pathname!=='/')history.replaceState(null,'','/');
  }
  async function navigate(request){
    const id=section(request)?request:'home';
    if(id==='ai'&&localStorage.getItem('boba.dock.ai')==='false')return navigate('home');
    activate(id);
    closeCommand();
    const instance=await ensure(id);
    if(active!==id)return;
    if(id==='browser'&&instance&&!instance.tabs.length)getView('browser').querySelector('[data-wnew]')?.click();
    if((id==='settings'||id==='admin')&&typeof instance==='function')instance();
  }
  async function openBrowser(input){
    await navigate('browser');
    const browser=await ensure('browser');
    if(browser?.navigate)browser.navigate(input,true);
  }
  function commandMatches(value){
    const query=value.trim().toLowerCase();
    return ui.sections.filter(item=>(item.label+' '+item.detail).toLowerCase().includes(query));
  }
  let commandIndex=0;
  function renderCommand(query=''){
    const results=ui.command.querySelector('[data-v3-command-results]');
    const items=commandMatches(query);
    commandIndex=Math.min(commandIndex,Math.max(0,items.length-1));
    results.innerHTML=items.length?items.map((item,index)=>
      '<button type="button" class="v3-command-item '+(index===commandIndex?'selected':'')+'" data-v3-go="'+item.id+'"><span>✦</span><strong>'+esc(item.label)+'</strong><small>'+esc(item.detail)+'</small><span aria-hidden="true">↗</span></button>'
    ).join(''):'<p class="v3-command-empty">Nothing here by that name.</p>';
  }
  function openCommand(){
    if(!ui.command.hidden)return;
    focusBeforeDialog=document.activeElement;
    ui.command.hidden=false;
    ui.root.querySelector('.v3-sidebar').inert=true;
    ui.root.querySelector('.v3-main').inert=true;
    commandIndex=0;
    const input=ui.command.querySelector('input');
    input.value='';renderCommand();
    input.focus();
  }
  function closeCommand(){
    if(ui.command.hidden)return;
    ui.command.hidden=true;
    ui.root.querySelector('.v3-sidebar').inert=false;
    ui.root.querySelector('.v3-main').inert=false;
    focusBeforeDialog?.focus?.();
  }
  // Keep keyboard focus inside the switcher while it is open.
  ui.command.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...ui.command.querySelectorAll('input, button:not([disabled])')]
      .filter(element=>element.getClientRects().length>0);
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();first.focus();
    }
  });
  ui.root.addEventListener('click',event=>{
    if(event.target.closest('[data-v3-command]'))return openCommand();
    if(event.target.closest('[data-v3-command-close]'))return closeCommand();
    const button=event.target.closest('[data-v3-go]');
    if(button)navigate(button.dataset.v3Go);
  });
  ui.command.querySelector('input').addEventListener('input',event=>{commandIndex=0;renderCommand(event.target.value);});
  ui.command.querySelector('input').addEventListener('keydown',event=>{
    const items=commandMatches(event.target.value);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(items.length)commandIndex=(commandIndex+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      renderCommand(event.target.value);
    }
    if(event.key==='Enter'&&items.length){event.preventDefault();navigate(items[commandIndex].id);}
  });
  document.addEventListener('keydown',event=>{
    const modifier=event.ctrlKey||event.metaKey;
    if(modifier&&event.key.toLowerCase()==='k'){event.preventDefault();ui.command.hidden?openCommand():closeCommand();}
    if(event.key==='Escape'&&!ui.command.hidden){event.preventDefault();closeCommand();}
    if(modifier&&event.key.toLowerCase()==='l'){
      event.preventDefault();
      navigate('browser').then(()=>getView('browser').querySelector('[data-omni]')?.focus());
    }
    if(event.key==='Escape'&&ui.dock.classList.contains('hide')){
      ui.dock.classList.remove('hide');getView('browser').querySelector('[data-wv]')?.classList.remove('max');
    }
  });
  window.addEventListener('celestial:dock-settings',()=>{
    const button=ui.root.querySelector('[data-v3-go="ai"]');
    if(button)button.hidden=localStorage.getItem('boba.dock.ai')==='false';
    if(active==='ai'&&button?.hidden)navigate('home');
  });
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
  ui.views.hidden=false;
  ui.dock.hidden=false;
  const initial=location.hash.slice(1)||sessionStorage.getItem('celestial.lastView')||'home';
  await navigate(initial);
  // Cross-device settings update asynchronously; a slow sync cannot block boot.
  void startAccountSync(user).then(applyPrefs).catch(error=>console.warn('Preferences sync unavailable:',error));
}
