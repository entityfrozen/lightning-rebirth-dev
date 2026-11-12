import {openAboutBlank} from './about-blank.js';
import { I } from './icons.js';
import { createProxyFrame, disposeProxyFrame, getProxyController } from './proxy.js';
import { createUltravioletFrame } from './uv-proxy.js';
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
function failPage(frame,url,retry,message='The page could not load.'){const doc=frame.contentDocument;if(!doc)return;doc.body?.replaceChildren();const p=doc.createElement('p');p.textContent=message;const b=doc.createElement('button');b.textContent='Retry';b.onclick=retry;doc.body?.append(p,b);}
const frames=new WeakMap();
// An about:blank wrapper is a framed workspace. Prefer the engine that does not
// depend on cross-origin-isolated top-level document privileges.
const defaultProxy=()=>window.self!==window.top?'ultraviolet':
  store.get('proxyEngine','scramjet')==='ultraviolet'?'ultraviolet':'scramjet';
const engine={
 normalise(input){const q=String(input||'').trim();if(!q)return '';try{const u=new URL(q);if(['http:','https:'].includes(u.protocol))return u.href}catch{}if(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$)/i.test(q))return 'https://'+q;return 'https://www.google.com/search?q='+encodeURIComponent(q)},
 boot:getProxyController,recover:getProxyController,
 decode(url){try{const src=new URL(url,location.origin);if(src.pathname.startsWith('/uv/service/')){
     const decodeUv=window.__uv$config?.decodeUrl;
     return typeof decodeUv==='function'?decodeUv(src.pathname.slice('/uv/service/'.length)):'';
   }
   if(!src.pathname.startsWith('/~/sj/'))return '';const decode=window.$scramjetController?.config?.prefix?window.$scramjetController?.decodeUrl:null;return typeof decode==='function'?decode(url):''}catch{return ''}},
 failed(d){
   if(!d)return false;
   const title=String(d.title||'').slice(0,120);
   if(/scramjet.*error|failed to fetch/i.test(title))return true;
   // An unclaimed service-worker route used to serve Celestial's own landing
   // page. Treat that as a transport failure rather than a successful page.
   try{
     const location=new URL(d.URL);
     if(!location.pathname.startsWith('/~/sj/'))return false;
     if(d.querySelector('meta[http-equiv="refresh"][content*="/boba/index.html"]'))return true;
     const text=(d.body?.textContent||'').slice(0,300);
     return /Proxy worker did not intercept|The proxy engine is unavailable|Proxy transport failed/i.test(text);
   }catch{return false}
 },
 async openFrame(el,url,onNavigate,onPopup,mode='scramjet'){
   if(!window.isSecureContext)throw Error('Browser proxies require HTTPS.');
   if(mode==='ultraviolet'){
     const frame=await createUltravioletFrame(el,url);
     frames.set(el,{mode,frame});
     return;
   }
   const status=await fetch('/api/browser/status',{credentials:'same-origin'}).then(r=>r.json());
   if(!status.authenticated)throw Error('Sign in to browse with Scramjet.');
   if(!status.proxy)throw Error('Scramjet is unavailable on this server.');
   let record=frames.get(el);
   if(!record||record.mode!=='scramjet'){
     record={mode:'scramjet',frame:await createProxyFrame(el,onNavigate,onPopup)};
     frames.set(el,record);
   }
   record.frame.go(url);
 },
 action(el,kind){
   const record=frames.get(el);
   if(!record)return false;
   if(record.mode==='ultraviolet'){
     try{
       if(kind==='reload'){el.contentWindow.location.reload();return true}
       if(kind==='back'){el.contentWindow.history.back();return true}
       if(kind==='fwd'){el.contentWindow.history.forward();return true}
     }catch{}
     return false;
   }
   const method={back:'back',fwd:'forward',reload:'reload'}[kind];
   const action=record.frame?.[method];
   if(typeof action!=='function')return false;
   action.call(record.frame);return true;
 },
 dispose(el){
   const record=frames.get(el);
   if(record?.mode==='scramjet')disposeProxyFrame(record.frame);
   else record?.frame?.dispose?.();
   frames.delete(el);
 }
};
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
    '<select class="wproxy" data-proxy-mode aria-label="Proxy engine"><option value="scramjet">Scramjet</option><option value="ultraviolet">Ultraviolet</option></select>' +
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
  mount(root, ctx) {
    const st = (this.st = { tabs: [], active: 0, next: 1 });
    const wv = $("[data-wv]", root);
    const page = $("[data-page]", root);
    const nt = $("[data-nt]", root);
    const omni = $("[data-omni]", root);
    const sugg = $("[data-sugg]", root);
    const bl = $("[data-bl]", root);
    const addr = $(".addr", root);
    const disp = $("[data-disp]", root);
    const tabsEl = $("[data-tabs]", root);
    const proxySelect = $("[data-proxy-mode]", root);
    const tip = $("[data-tip]", root);
    const tab = () => st.tabs.find((t) => t.id === st.active);
    const clean = (s) => String(s || "").split(/\s+[-–·|]\s+/)[0].trim();
    const readable = (s) => {
      try {
        return decodeURI(s);
      } catch {
        return s;
      }
    };

    const sync = () => {
      const t = tab();
      bl.classList.toggle("off", !(t && t.busy));
    };
    const track = (t) => {
      let d = null;
      try {
        d = t.frame.contentDocument;
      } catch {}
      if (!d || d.URL === "about:blank") return;
      const read = () => {
        let real = "";
        try {
          real = ctx.engine.decode(t.frame.contentWindow.location.href);
        } catch {}
        const name = clean(d.title);
        const moved = !!real && real !== t.url;
        if (moved) {
          t.url = real;
          t.title = hostOf(real) || t.title;
          ctx.history.push({ kind: "site", key: "site:" + t.title, name: t.title, url: real });
        }
        if (moved || name !== t.name) {
          t.name = name;
          paint();
        }
      };
      read();
      if (t.doc === d) return;
      t.doc = d;
      const ttl = d.querySelector("title");
      if (ttl) new MutationObserver(read).observe(ttl, { childList: true, characterData: true, subtree: true });
    };
    const retry = (t) => {
      t.busy = true;
      sync();
      ctx.engine.recover().finally(() => {
        loading(t);
        try {
          t.frame.contentWindow.location.reload();
        } catch {
          t.frame.src = t.frame.src;
        }
      });
    };
    const clearError=t=>{t.errorEl?.remove();t.errorEl=null;};
    const showError=(t,message)=>{
      clearInterval(t.lt);t.busy=false;sync();clearError(t);
      const panel=document.createElement('div');panel.className='native-browser-error';panel.dataset.browserError='';
      const heading=document.createElement('h2');heading.textContent="This page couldn't be opened";
      const detail=document.createElement('p');detail.textContent=message||'The selected proxy could not load this site.';
      const buttons=document.createElement('div');
      const again=document.createElement('button');again.className='btn k s';again.textContent='Try again';again.onclick=()=>navigate(t.url);
      const direct=document.createElement('a');direct.className='btn s';direct.textContent='Open site directly';direct.href=t.url;direct.target='_blank';direct.rel='noopener noreferrer';
      const embed=document.createElement('button');embed.className='btn s';embed.textContent='Try direct embed';
      embed.onclick=()=>{
        clearError(t);
        clearInterval(t.lt);
        t.busy=false;
        t.direct=true;
        if(t.frame){ctx.engine.dispose(t.frame);t.frame.src=t.url}
        sync();
      };
      const alternative=document.createElement('button');alternative.className='btn k s';
      alternative.textContent=t.mode==='ultraviolet'?'Try Scramjet':'Try Ultraviolet';
      alternative.onclick=()=>{const next=t.mode==='ultraviolet'?'scramjet':'ultraviolet';proxySelect.value=next;proxySelect.dispatchEvent(new Event('change'))};
      buttons.append(again,alternative,embed,direct);panel.append(heading,detail,buttons);page.append(panel);t.errorEl=panel;
    };
    const loaded=t=>{
      let d=null;
      try{d=t.frame?.contentDocument}catch{}
      if(t.direct||!(['/~/sj/','/uv/service/'].some(prefix=>t.frame?.src.includes(prefix)))||!d||d===t.previousDoc||d.URL==='about:blank'||d.readyState==='loading'||(!d.body?.children.length&&!d.body?.textContent?.trim()))return false;
      if(ctx.engine.failed(d)){showError(t,'The proxied site returned an error.');return true}
      clearInterval(t.lt);t.busy=false;sync();clearError(t);track(t);return true;
    };
    const loading=t=>{
      clearInterval(t.lt);clearError(t);try{t.previousDoc=t.frame?.contentDocument||null}catch{t.previousDoc=null}t.busy=true;sync();
      const started=Date.now();
      t.lt=setInterval(()=>{
        if(loaded(t))return;
        if(Date.now()-started>26000)showError(t,'The website did not finish loading. Try again or open it directly.');
      },180);
    };

    const paint = () => {
      wv.classList.toggle("bare", !st.tabs.length);
      if (!st.tabs.length && wv.classList.contains("max")) ctx.focusWeb(false);
      tabsEl.innerHTML = st.tabs.map((t) =>
        '<button class="wtab' + (t.id === st.active ? " on" : "") + '" data-tab="' + t.id + '" aria-label="' + esc(t.name || t.title) + '">' +
        (t.url ? '<img alt="" src="' + favicon(hostOf(t.url)) + '">' : '<span class="ph"></span>') +
        '<span class="x" data-close>' + ico("x") + "</span></button>").join("");
      const t = tab();
      proxySelect.value=t?.mode||defaultProxy();
      nt.style.visibility = t && t.url ? "hidden" : "";
      for(const x of st.tabs){if(x.frame)x.frame.style.display=x.id===st.active&&x.url?"block":"none"}
      if (document.activeElement !== omni) omni.value = t && t.url ? t.url : "";
      show();
      sync();
    };
    const show = () => {
      const t = tab();
      let u = null;
      try {
        u = t && t.url && document.activeElement !== omni && omni.value === t.url ? new URL(t.url) : null;
      } catch {}
      addr.classList.toggle("show", !!u);
      if(u){
        disp.replaceChildren();
        const domain=document.createElement('b');
        domain.textContent=u.hostname.replace(/^www\./,'');
        disp.append(domain);
      }else disp.replaceChildren();
    };
    const closeTab = (id) => {
      const i = st.tabs.findIndex((t) => t.id === id);
      if (i < 0) return;
      clearInterval(st.tabs[i].lt);clearError(st.tabs[i]);
      if (st.tabs[i].frame) { ctx.engine.dispose(st.tabs[i].frame); st.tabs[i].frame.remove(); }
      st.tabs.splice(i, 1);
      if (st.active === id && st.tabs.length) st.active = st.tabs[Math.min(i, st.tabs.length - 1)].id;
      tip.classList.remove("on");
      paint();
    };

    const newTab = () => {
      const t = { id: st.next++, title: "New tab", url: "", frame: null, mode: defaultProxy() };
      st.tabs.push(t);
      st.active = t.id;
      paint();
      return t;
    };

    const navigate = async (input, fresh) => {
      const url = ctx.engine.normalise(input);
      if (!url) return;
      const t = fresh || !tab() ? newTab() : tab();
      t.title = hostOf(url) || "Page";
      t.mode ||= defaultProxy();
      t.direct=false;
      loading(t);
      paint();
      const first = !t.frame;
      if(first){
        t.frame=el('<iframe title="Page" allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"></iframe>');
        page.appendChild(t.frame);
        t.frame.addEventListener("load",()=>loaded(t));
      }
      t.url=url;
      paint();
      try{
        await ctx.engine.openFrame(t.frame,url,real=>{
          t.url=real;t.title=hostOf(real)||"Page";paint();
        },popup=>navigate(popup,true),t.mode);
      }catch(error){
        showError(t,error.message);
        return;
      }
      if(t.busy)loaded(t);
      ctx.history.push({ kind: "site", key: "site:" + t.title, name: t.title, url });
      paint();
    };
    st.navigate = navigate;

    const hideSugg = () => sugg.classList.remove("on");
    const suggest = debounce(async () => {
      const q = omni.value.trim();
      if (q.length < 2) return hideSugg();
      try {
        const list = await get("/api/suggest?q=" + encodeURIComponent(q));
        if (!list.length || document.activeElement !== omni) return hideSugg();
        sugg.innerHTML = list.map((s) => "<div>" + ico("search") + "<span>" + esc(s) + "</span></div>").join("");
        sugg.classList.add("on");
      } catch {
        hideSugg();
      }
    }, 160);
    omni.addEventListener("input", suggest);
    let picked = false;
    const warm = () => ctx.engine.boot().catch(() => {});
    omni.addEventListener("focus", () => {
      addr.classList.remove("show");
      omni.select();
      picked = true;
      warm();
    });
    omni.addEventListener("mouseup", (e) => {
      if (picked) e.preventDefault();
      picked = false;
    });
    omni.addEventListener("blur", () => {
      picked = false;
      show();
      setTimeout(hideSugg, 140);
    });
    tabsEl.addEventListener("pointerover", (e) => {
      const b = e.target.closest("[data-tab]");
      const t = b && st.tabs.find((x) => x.id === +b.dataset.tab);
      if (!t) return;
      tip.textContent = t.name || t.title;
      const r = b.getBoundingClientRect(), w = wv.getBoundingClientRect(), half = tip.offsetWidth / 2;
      tip.style.left = Math.min(Math.max(r.left + r.width / 2 - w.left, half + 8), w.width - half - 8) + "px";
      tip.style.top = r.bottom - w.top + 8 + "px";
      tip.classList.add("on");
    });
    tabsEl.addEventListener("pointerleave", () => tip.classList.remove("on"));
    tabsEl.addEventListener("mousedown", (e) => e.button === 1 && e.preventDefault());
    tabsEl.addEventListener("auxclick", (e) => {
      const b = e.button === 1 && e.target.closest("[data-tab]");
      if (b) closeTab(+b.dataset.tab);
    });
    omni.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        hideSugg();
        omni.blur();
        navigate(omni.value);
      }
      if (e.key === "Escape") hideSugg();
    });
    sugg.addEventListener("mousedown", (e) => {
      const d = e.target.closest("div");
      if (!d) return;
      e.preventDefault();
      hideSugg();
      navigate(d.textContent);
    });
    const bq = $("[data-bq]", root);
    bq.addEventListener("focus", warm);
    bq.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      navigate(e.target.value);
      e.target.value = "";
    });

    const ql = $("[data-ql]", root), qf = $("[data-qf]", root), qin = $("[data-qin]", root);
    const qlClose = () => {
      qf.hidden = true;
      qf.classList.remove("bad");
      ql.hidden = false;
    };
    store.watch((k) => {
      if (k === "links") ql.innerHTML = qlHtml();
    });
    ql.addEventListener("click", (e) => {
      const x = e.target.closest("[data-qx]");
      if (x) {
        const list = qlLinks();
        list.splice(+x.dataset.qx, 1);
        return store.set("links", list);
      }
      if (!e.target.closest("[data-qa]")) return;
      ql.classList.remove("edit");
      ql.hidden = true;
      qf.hidden = false;
      qin.value = "";
      qin.focus();
    });
    ql.addEventListener("contextmenu", (e) => {
      if (!e.target.closest(".qw")) return;
      e.preventDefault();
      ql.classList.toggle("edit");
    });
    document.addEventListener("pointerdown", (e) => {
      if (!ql.contains(e.target)) ql.classList.remove("edit");
    });
    qf.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = linkOf(qin.value);
      if (!u) {
        qf.classList.add("bad");
        return qin.focus();
      }
      const list = qlLinks();
      if (!list.some((x) => qlKey(x[1]) === qlKey(u)) && list.length < QL_MAX) store.set("links", [...list, [hostOf(u), u]]);
      qlClose();
    });
    $(".qok", qf).addEventListener("mousedown", (e) => e.preventDefault());
    qin.addEventListener("input", () => qf.classList.remove("bad"));
    qin.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      qlClose();
      $("[data-qa]", ql)?.focus();
    });
    qf.addEventListener("focusout", (e) => {
      if (qf.contains(e.relatedTarget)) return;
      setTimeout(() => {
        if (document.hasFocus() && !qf.contains(document.activeElement)) qlClose();
      });
    });

    proxySelect.addEventListener('change',()=>{
      const selected=proxySelect.value==='ultraviolet'?'ultraviolet':'scramjet';
      store.set('proxyEngine',selected);
      const current=tab();
      if(!current)return;
      if(current.mode===selected)return;
      current.mode=selected;
      if(current.frame){
        ctx.engine.dispose(current.frame);
        current.frame.remove();
        current.frame=null;
      }
      if(current.url)navigate(current.url);
      else paint();
    });
    root.addEventListener("click", (e) => {
      const close = e.target.closest("[data-close]");
      if (close) return closeTab(+close.closest("[data-tab]").dataset.tab);
      const tb = e.target.closest("[data-tab]");
      if (tb) {
        st.active = +tb.dataset.tab;
        return paint();
      }
      if(e.target.closest('[data-direct]')){
        const target=tab()?.url||ctx.engine.normalise(omni.value||bq.value);
        if(!target)return;
        const result=openAboutBlank(target,{title:hostOf(target)||'Website'});
        if(!result.ok)alert(result.message);
        return;
      }
      if(e.target.closest('[data-standalone]')){
        // Scramjet requires a top-level cross-origin isolated document.
        window.open(location.origin+'/','_blank','noopener,noreferrer');
        return;
      }
      if (e.target.closest("[data-wnew]")) return newTab();
      if (e.target.closest("[data-wmax]")) return ctx.focusWeb(!wv.classList.contains("max"));
      const nb = e.target.closest("[data-wb]");
      if (nb) {
        const t = tab();
        if (!t || !t.frame) return;
        try {
          if(!ctx.engine.action(t.frame,nb.dataset.wb))throw Error("Frame unavailable");
        } catch {
          if (nb.dataset.wb === "reload") t.frame.src = t.frame.src;
        }
        return;
      }
      const f = e.target.closest("[data-open]");
      if (f) navigate(f.dataset.open);
    });
    paint();
  },
  enter(root, ctx) {
    ctx.wash(null);
  },
};


export function mountBrowser(root){
 root.innerHTML=home.html();
 const ctx={engine,history:{push(){}},wash(){},focusWeb(on){const w=root.querySelector('[data-wv]');w.classList.toggle('max',on);document.querySelector('#dock')?.classList.toggle('hide',on);}};
 home.mount(root,ctx);
 function clock(){const d=new Date();const parts=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(d);root.querySelector('[data-ck]').textContent=parts.filter(p=>p.type!=='dayPeriod').map(p=>p.value).join('').trim();root.querySelector('[data-ap]').textContent=parts.find(p=>p.type==='dayPeriod')?.value||'';root.querySelector('[data-dt]').textContent=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});}
 clock();setInterval(clock,30000);return home.st;
}
