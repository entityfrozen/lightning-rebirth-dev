import {openAboutBlank} from './about-blank.js';
import {I} from './icons.js';
const $=(s,r=document)=>r.querySelector(s);
const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=k=>'<svg viewBox="0 0 256 256" aria-hidden="true">'+(I[k]||I.link||'')+'</svg>';
const cup=()=>'<img src="/assets/celestial-star.svg" alt="Loading" style="width:54px">';
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return ''}};
const favicon=d=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#8a5631"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="white">'+(d[0]||'•').toUpperCase().replace(/[^A-Z0-9]/g,'•')+'</text></svg>');
const FAVS=[];
const watchers=new Set();
const store={get(k,f){try{return JSON.parse(localStorage.getItem('boba.native.'+k))??f}catch{return f}},set(k,v){localStorage.setItem('boba.native.'+k,JSON.stringify(v));watchers.forEach(fn=>fn(k));window.dispatchEvent(new Event('celestial:save-workspace'))},watch(fn){watchers.add(fn)}};
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const get=async()=>[];
const QL_MAX = 12;
const qlLinks = () => {
  const v = store.get("links", null);
  return Array.isArray(v) ? v.filter((x) => Array.isArray(x) && typeof x[1] === "string") : FAVS.map(([n, , u]) => [n, u]);
};
const qlHtml = () => {
  const list = qlLinks();
  return list.map(([n, u], i) => {
    const d = hostOf(u);
    const own = false;
    const img = own ? '<img class="fade" alt="" src="/img/sites/' + esc(d) + '.png">' : '<img class="fade" alt="" src="' + esc(favicon(d)) + '" data-fb="/api/icon?d=' + encodeURIComponent(d) + '">';
    return '<span class="qw"><button class="qi" data-open="' + esc(u) + '" aria-label="' + esc(n) + '" title="' + esc(n) + '">' + img + "</button>" +
      '<button class="qx" data-qx="' + i + '" aria-label="Remove ' + esc(n) + '">' + ico("x") + "</button></span>";
  }).join("") + (list.length < QL_MAX ? '<button class="qi qa" data-qa aria-label="Add" title="Add"><i>' + ico("plus") + "</i></button>" : "");
};
const qlKey = (u) => {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + x.search;
  } catch {
    return u;
  }
};
const linkOf = (raw) => {
  const s = String(raw || "").trim();
  if (!s || /\s/.test(s)) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
    return /^https?:$/.test(u.protocol) && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) ? u.href : "";
  } catch {
    return "";
  }
};

const home = {
  flush: true,
  html: () =>
    '<div class="wv bare" data-wv>' +
    '<div class="wbar">' +
    '<button class="cb sm gh" data-wb="back" aria-label="Back">' + ico("back") + "</button>" +
    '<button class="cb sm gh" data-wb="fwd" aria-label="Forward">' + ico("fwd") + "</button>" +
    '<button class="cb sm gh" data-wb="reload" aria-label="Reload">' + ico("reload") + "</button>" +
    '<label class="addr">' + ico("lock") + '<input data-omni placeholder="Search or enter a link" aria-label="Address" autocomplete="off" spellcheck="false">' +
    '<span class="disp" data-disp></span><div class="sugg gl g3" data-sugg></div></label>' +
    '<select class="engine-switch" data-engine-mode aria-label="Browsing engine"><option value="native">Celestial Engine</option></select>' +
    '<span class="engine-active" data-active-engine title="Active browser engine" aria-live="polite"></span>' +
    '<span class="wsep"></span><div class="wtabs" data-tabs></div>' +
    '<button class="cb sm gh" data-wnew aria-label="New tab">' + ico("plus") + "</button>" +
    '<button class="cb sm gh" data-direct title="Open direct in about:blank" aria-label="Open Direct">' + ico("link") + '</button>' +

    '<button class="cb sm gh" data-wmax aria-label="Full screen">' + ico("expand") + "</button></div>" +
    '<span class="wtip" data-tip></span>' +
    '<div class="page" data-page><div class="gload off" data-bl>' + cup() + '</div><div class="home" data-nt>' +
    '<div class="hwm"><img alt="" src="/assets/celestial-star.svg"></div><div class="hcol"><div class="clock">' +
    '<div class="t num r"><span data-ck></span><i data-ap></i></div>' +
    '<div class="d r" style="--d:.03s" data-dt></div></div>' +
    '<label class="big-q r" style="--d:.06s">' + ico("search") + '<input data-bq placeholder="Search or enter a link" aria-label="Search or enter a link" autocomplete="off" spellcheck="false"></label>' +
    '<div class="ql r" style="--d:.09s" data-ql>' + qlHtml() + "</div>" +
    '<form class="qf" data-qf hidden><label class="big-q">' + ico("link") + '<input data-qin placeholder="Paste a link" aria-label="Paste a link" autocomplete="off" spellcheck="false" inputmode="url">' +
    '<button class="qok" type="submit" aria-label="Add">' + ico("plus") + "</button></label></form>" +
    "</div></div></div></div>",
  mount(root,ctx){
    const st=this.st={tabs:[],active:0,next:1};
    const page=$('[data-page]',root);
    const overlay=$('[data-bl]',root);
    const newtab=$('[data-nt]',root);
    const omni=$('[data-omni]',root);
    const bq=$('[data-bq]',root);
    const tabs=$('[data-tabs]',root);
    const wv=$('[data-wv]',root);
    const indicator=$('[data-active-engine]',root);
    const select=$('[data-engine-mode]',root);
    const tip=$('[data-tip]',root);
    const address=$('.addr',root);
    const display=$('[data-disp]',root);
    const suggestions=$('[data-sugg]',root);
    select.value='native';
    select.disabled=true;
    let access=null;
    const active=()=>st.tabs.find(x=>x.id===st.active);
    function normalise(input){
      const text=String(input||'').trim();
      if(!text)return '';
      try{const u=new URL(text);if(['http:','https:'].includes(u.protocol))return u.href}catch{}
      if(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$)/i.test(text))return 'https://'+text;
      return 'https://www.google.com/search?q='+encodeURIComponent(text);
    }
    function encode(value){
      const bytes=new TextEncoder().encode(value);
      let input='';for(const byte of bytes)input+=String.fromCharCode(byte);
      return btoa(input).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }
    function report(status){
      if(window.parent!==window){
        try{window.parent.postMessage({type:'celestial:browser-status',status},location.origin)}catch{}
      }
    }
    function clearError(t){
      t?.errorEl?.remove();
      if(t)t.errorEl=null;
    }
    function cleanup(t){
      clearTimeout(t.timer);
      clearError(t);
      t.frame?.remove();
      t.frame=null;
    }
    function sync(){
      const t=active();
      // The loader is only displayed while a navigation starts. A page's
      // late images or analytics must never cover the rendered iframe.
      overlay.classList.toggle('off',!t?.busy);
    }
    function repaint(){
      const t=active();
      wv.classList.toggle('bare',!st.tabs.length);
      newtab.style.visibility=t?.url?'hidden':'';
      tabs.innerHTML=st.tabs.map(x=>'<button class="wtab'+(x.id===st.active?' on':'')+
        '" data-tab="'+x.id+'" aria-label="Browser tab '+x.id+'">'+
        (x.url?'<img alt="" src="'+favicon(hostOf(x.url))+'">':'<span class="ph"></span>')+
        '<span class="x" data-close>'+ico('x')+'</span></button>').join('');
      for(const x of st.tabs)if(x.frame)x.frame.style.display=(x.id===st.active?'block':'none');
      if(document.activeElement!==omni)omni.value=t?.url?hostOf(t.url):'';
      indicator.textContent=t?.url?'Celestial':'';
      indicator.hidden=!t?.url;
      const domain=t?.url?hostOf(t.url):'';
      address.classList.toggle('show',!!domain);
      display.replaceChildren();
      if(domain){const name=document.createElement('b');name.textContent=domain;display.append(name)}
      sync();
    }
    function failure(t,message){
      clearTimeout(t.timer);
      t.busy=false;
      report('failed');
      clearError(t);
      const panel=document.createElement('div');
      panel.className='native-browser-error';
      const title=document.createElement('h2');
      title.textContent='This page could not be opened';
      const detail=document.createElement('p');
      detail.textContent=String(message||'The page could not be loaded').slice(0,300);
      const buttons=document.createElement('div');
      const retry=document.createElement('button');
      retry.className='btn k s';retry.textContent='Try again';
      retry.onclick=()=>void navigate(t.url,false,t,true);
      const external=document.createElement('a');
      external.className='btn s';
      external.href=t.url;external.target='_blank';external.rel='noopener noreferrer';
      external.textContent='Open directly';
      buttons.append(retry,external);
      panel.append(title,detail,buttons);
      page.append(panel);t.errorEl=panel;
      repaint();
    }
    function finished(t,title){
      if(!t.busy)return;
      clearTimeout(t.timer);
      t.busy=false;
      if(title)t.name=String(title).slice(0,100);
      clearError(t);
      report('ready');
      repaint();
    }
    const receive=event=>{
      const t=st.tabs.find(x=>x.frame?.contentWindow===event.source);
      if(!t||event.data?.type!=='celestial:browse')return;
      if(event.data.state==='error'){
        failure(t,'The remote page returned a connection error.');
      }else if(event.data.state==='ready'){
        finished(t,event.data.title);
      }
    };
    window.addEventListener('message',receive);
    async function token(){
      if(access)return access;
      const response=await fetch('/api/browser/token',{credentials:'same-origin'});
      if(!response.ok)throw Error('Sign in to use the browser.');
      const data=await response.json();
      access=data.token;
      return access;
    }
    function newTab(){
      const t={id:st.next++,url:'',title:'New tab',name:'New tab',
        frame:null,busy:false,history:[],position:-1};
      st.tabs.push(t);st.active=t.id;repaint();return t;
    }
    function closeTab(id){
      const index=st.tabs.findIndex(x=>x.id===id);
      if(index<0)return;
      const t=st.tabs[index];cleanup(t);
      st.tabs.splice(index,1);
      if(st.active===id)st.active=st.tabs[Math.max(0,Math.min(index,st.tabs.length-1))]?.id||0;
      repaint();
    }
    async function navigate(input,fresh=false,existing=null,noHistory=false){
      const url=normalise(input);
      if(!url)return;
      const t=existing||(fresh||!active()?newTab():active());
      clearTimeout(t.timer);
      clearError(t);
      t.url=url;t.title=hostOf(url)||'Page';
      t.busy=true;st.active=t.id;
      if(!noHistory){
        t.history=t.history.slice(0,t.position+1);
        t.history.push(url);t.position=t.history.length-1;
      }
      repaint();
      const ticket=Symbol('navigation');
      t.ticket=ticket;
      try{
        const key=await token();
        if(t.ticket!==ticket||!st.tabs.includes(t))return;
        if(!t.frame){
          t.frame=el('<iframe title="Page" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" sandbox="allow-scripts allow-forms allow-popups allow-downloads"></iframe>');
          page.append(t.frame);
          // An iframe load alone does not mean the site rendered successfully.
          // The injected client reports readiness after the remote DOM loads.
        }
        t.timer=setTimeout(()=>{if(t.ticket===ticket)failure(t,'The page did not respond within 30 seconds.')},30000);
        t.frame.src='/browse/u/'+encode(url)+'?key='+encodeURIComponent(key);
        repaint();
      }catch(error){
        if(t.ticket===ticket)failure(t,error.message);
      }
    }
    function action(kind){
      const t=active();if(!t?.url)return;
      if(kind==='reload')return void navigate(t.url,false,t,true);
      const next=t.position+(kind==='back'?-1:1);
      if(next<0||next>=t.history.length)return;
      t.position=next;
      void navigate(t.history[next],false,t,true);
    }
    st.navigate=navigate;
    const hideSuggestions=()=>suggestions.classList.remove('on');
    const search=debounce(async()=>{
      const input=omni.value.trim();
      if(input.length<2)return hideSuggestions();
      try{
        const data=await get('/api/suggest?q='+encodeURIComponent(input));
        if(!Array.isArray(data)||!data.length||document.activeElement!==omni)return hideSuggestions();
        suggestions.innerHTML=data.map(x=>'<div>'+ico('search')+'<span>'+esc(x)+'</span></div>').join('');
        suggestions.classList.add('on');
      }catch{hideSuggestions()}
    },180);
    omni.addEventListener('input',search);
    omni.addEventListener('keydown',event=>{
      if(event.key==='Enter'){hideSuggestions();omni.blur();void navigate(omni.value)}
      if(event.key==='Escape')hideSuggestions();
    });
    bq.addEventListener('keydown',event=>{
      if(event.key==='Enter'){void navigate(bq.value);bq.value=''}
    });
    suggestions.addEventListener('mousedown',event=>{
      const item=event.target.closest('div');
      if(item){event.preventDefault();hideSuggestions();void navigate(item.textContent)}
    });
    const ql=$('[data-ql]',root);
    const form=$('[data-qf]',root);
    const input=$('[data-qin]',root);
    store.watch(k=>{if(k==='links')ql.innerHTML=qlHtml()});
    ql.addEventListener('click',event=>{
      const remove=event.target.closest('[data-qx]');
      if(remove){const entries=qlLinks();entries.splice(Number(remove.dataset.qx),1);store.set('links',entries);return}
      if(event.target.closest('[data-qa]')){
        ql.hidden=true;form.hidden=false;input.value='';input.focus();
      }
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();const u=linkOf(input.value);if(!u)return;
      const items=qlLinks();
      if(items.length<QL_MAX&&!items.some(x=>qlKey(x[1])===qlKey(u))){
        store.set('links',[...items,[hostOf(u),u]]);
      }
      form.hidden=true;ql.hidden=false;
    });
    root.addEventListener('click',event=>{
      const close=event.target.closest('[data-close]');
      if(close){closeTab(Number(close.closest('[data-tab]').dataset.tab));return}
      const tabButton=event.target.closest('[data-tab]');
      if(tabButton){st.active=Number(tabButton.dataset.tab);repaint();return}
      const item=event.target.closest('[data-open]');
      if(item){void navigate(item.dataset.open);return}
      if(event.target.closest('[data-wnew]')){newTab();return}
      if(event.target.closest('[data-wmax]')){
        ctx.focusWeb(!wv.classList.contains('max'));return;
      }
      if(event.target.closest('[data-direct]')){
        const value=active()?.url||normalise(omni.value||bq.value);
        if(!value)return;
        const result=openAboutBlank(value,{title:hostOf(value)||'Website'});
        if(!result.ok)alert(result.message);
        return;
      }
      const nav=event.target.closest('[data-wb]');
      if(nav){action(nav.dataset.wb);return}
    });
    repaint();
  },
  enter(root,ctx){ctx.wash(null)}
};

export function mountBrowser(root){
  root.innerHTML=home.html();
  const ctx={history:{push(){}},wash(){},focusWeb(on){
    root.querySelector('[data-wv]')?.classList.toggle('max',on);
    document.querySelector('#dock')?.classList.toggle('hide',on);
  }};
  home.mount(root,ctx);
  const clock=()=>{
    const d=new Date();
    const parts=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(d);
    root.querySelector('[data-ck]').textContent=parts.filter(p=>p.type!=='dayPeriod').map(p=>p.value).join('').trim();
    root.querySelector('[data-ap]').textContent=parts.find(p=>p.type==='dayPeriod')?.value||'';
    root.querySelector('[data-dt]').textContent=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  };
  clock();setInterval(clock,30000);
  return home.st;
}
