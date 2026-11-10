import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {
  Grid20Filled,MusicNote220Filled,Cloud20Filled,Settings20Filled,Globe20Filled
} from '@fluentui/react-icons';
import {api,readLocal,saveLocal} from './constants.js';
import {browserAddress,browserPreferences} from './Preferences.js';
import {createProxyFrame,disposeProxyFrame} from './BoltProxy.js';
import {useElementFullscreen} from './useElementFullscreen.js';

const shortcuts=[
  {id:'apps',name:'apps',icon:Grid20Filled},
  {id:'browser',name:'browser',icon:Globe20Filled},
  {id:'music',name:'music',icon:MusicNote220Filled},
  {id:'cloud',name:'AI',icon:Cloud20Filled},
  {id:'settings',name:'settings',icon:Settings20Filled}
];
function BrowserGlyph({name,size=17}){
  const icons={
    expand:<><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></>,
    shrink:<><path d="M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5"/></>,
    library:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 5V3h10v2M8 11h8m-8 4h5"/></>,
    focus:<><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M3 15v4a2 2 0 0 0 2 2h4m12-6v4a2 2 0 0 1-2 2h-4"/></>,
    copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    shield:<><path d="M12 2 4 6v5c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    star:<><path d="m12 2 3.1 6.5 7.1 1-5.1 5 .9 7-6-3.3-6 3.3.9-7-5.1-5 7.1-1L12 2Z"/></>,
    back:<><path d="m14 6-6 6 6 6"/></>,
    forward:<><path d="m10 6 6 6-6 6"/></>,
    reload:<><path d="M20 11a8 8 0 1 0-2.4 6.4M20 4v7h-7"/></>,
    external:<><path d="M13 4h7v7m0-7-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
    close:<><path d="M6 6 18 18M18 6 6 18"/></>,
    plus:<><path d="M12 5v14M5 12h14"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">{icons[name]||icons.star}</svg>;
}
const blank=()=>({id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),url:'',history:[],cursor:-1});
const savedTabs=()=> {
  const prefs=browserPreferences();
  if(!prefs.restoreTabs)return [blank()];
  const list=readLocal('forest-browser-tabs',[]);
  return Array.isArray(list)&&list.length?list.filter(tab=>tab&&typeof tab.id==='string'&&
    (!tab.url||/^https?:\/\//.test(tab.url))).slice(-12).map(tab=>({
      ...tab,history:Array.isArray(tab.history)?tab.history.slice(-30):[],
      cursor:typeof tab.cursor==='number'?tab.cursor:-1
    })):[blank()];
};
function BrowserFrame({tab,active,user,onNavigate,onPopup,register,retryKey}){
  const iframe=useRef(null),frame=useRef(null),loadingTimeout=useRef(null);
  const lastRenderedDocument=useRef(null);
  const lastUrl=useRef(''),navigateRef=useRef(onNavigate),popupRef=useRef(onPopup);
  const [state,setState]=useState('loading'),[error,setError]=useState('');
  const [loadedOnce,setLoadedOnce]=useState(false);
  navigateRef.current=onNavigate;popupRef.current=onPopup;

  useEffect(()=>{
    let cancelled=false;
    const el=iframe.current;
    if(!el||!tab.url)return;
    setState('loading');setError('');setLoadedOnce(false);
    lastRenderedDocument.current=null;
    // Scramjet replaces iframe documents through a service worker.
    // Chromium may render those documents without firing the host iframe's
    // onLoad callback reliably. Watch the real proxied document instead.
    const watchDocument=setInterval(()=>{
      if(cancelled||!frame.current)return;
      try{
        if(!el.src.includes('/~/sj/'))return;
        const doc=el.contentDocument;
        if(!doc||doc===lastRenderedDocument.current||doc.readyState==='loading')return;
        if(!doc.body||(doc.body.children.length===0&&!doc.body.textContent?.trim()))return;
        lastRenderedDocument.current=doc;
        clearTimeout(loadingTimeout.current);
        setState('ready');setError('');setLoadedOnce(true);
      }catch{}
    },180);
    clearTimeout(loadingTimeout.current);
    loadingTimeout.current=setTimeout(()=>{
      if(!cancelled){setState('error');setError('The site took too long to respond. Try again or open it directly.');}
    },26000);
    (async()=>{
      try{
        if(!user)throw Error('Sign in to browse in Celestial.');
        if(!window.isSecureContext)throw Error('The browser needs a secure HTTPS connection.');
        if(!window.crossOriginIsolated)throw Error('Browser isolation is not enabled. Reload Celestial once; if this persists, the server needs a configuration update.');
        const status=await api('/api/browser/status');
        if(!status.authenticated)throw Error('Sign in to browse in Celestial.');
        if(!status.proxy)throw Error('The browser engine is unavailable on this server.');
        const connection=await createProxyFrame(el,
          url=>{
            if(cancelled)return;
            // The proxy already navigated: sync the address bar without
            // sending frame.go() a second time for the same navigation.
            lastUrl.current=url;
            navigateRef.current(tab.id,url);
          },
          url=>{if(!cancelled)popupRef.current(url);});
        if(cancelled){disposeProxyFrame(connection);return;}
        frame.current=connection;
        register(tab.id,{
          back:()=>connection.back(),
          forward:()=>connection.forward(),
          reload:()=>connection.reload()
        });
        lastUrl.current=tab.url;
        connection.go(tab.url); // Frame.go() navigates synchronously.
      }catch(failure){
        if(!cancelled){clearTimeout(loadingTimeout.current);setState('error');setError(failure.message||'Unable to open this site.');}
      }
    })();
    return()=>{
      cancelled=true;clearInterval(watchDocument);clearTimeout(loadingTimeout.current);
      register(tab.id,null);disposeProxyFrame(frame.current);frame.current=null;
    };
  },[tab.id,Boolean(user),retryKey]);
  useEffect(()=>{
    if(!tab.url||!frame.current||tab.url===lastUrl.current)return;
    try{
      lastUrl.current=tab.url;
      setState('loading');setError('');
      clearTimeout(loadingTimeout.current);
      loadingTimeout.current=setTimeout(()=>{
        setState('error');setError('This page did not finish loading. Try again or open it directly.');
      },26000);
      frame.current.go(tab.url);
    }catch(failure){setState('error');setError(failure.message||'Unable to navigate.');}
  },[tab.url]);
  if(!tab.url)return null;
  return <div className={'browser-frame '+(active?'active':'')} aria-hidden={!active}>
    <iframe ref={iframe} title={'Browsing '+tab.url} className="portal-iframe"
      allow="fullscreen; clipboard-read; clipboard-write; picture-in-picture"
      referrerPolicy="no-referrer"
      onLoad={()=>{
        if(!frame.current||!iframe.current?.src.includes('/~/sj/'))return;
        clearTimeout(loadingTimeout.current);setState('ready');setLoadedOnce(true);
      }}/> 
    {state==='loading'&&active&&!loadedOnce&&<div className="celestial-browser-loading"><span className="celestial-browser-spinner"/>Connecting to the site…</div>}
    {state==='error'&&active&&<div className="celestial-browser-failure">
      <span className="celestial-browser-failure-icon">◈</span>
      <h2>We couldn't open that page.</h2>
      <p>{error}</p>
      <div><button onClick={()=>register(tab.id,{retry:true})}>Try again</button>
      <a href={tab.url} target="_blank" rel="noopener noreferrer">Open directly ↗</a></div>
    </div>}
  </div>;
}
export function Browser({user,onAuth,onShortcut,homeMode=false,launch=null}){
  const [tabs,setTabs]=useState(savedTabs);
  const [activeId,setActiveId]=useState(null);
  const [input,setInput]=useState('');
  const [prefs,setPrefs]=useState(browserPreferences);
  const [bookmarks,setBookmarks]=useState(()=>readLocal('forest-browser-bookmarks',[]));
  const [retry,setRetry]=useState({});
  const [recent,setRecent]=useState(()=>readLocal('celestial-browser-recent',[]));
  const [closedTabs,setClosedTabs]=useState([]);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [libraryQuery,setLibraryQuery]=useState('');
  const [focusMode,setFocusMode]=useState(false);
  const [notice,setNotice]=useState('');
  const browserSurface=useRef(null);
  const controls=useRef(new Map()),box=useRef(null),lastLaunch=useRef(null);
  const {isFullscreen,fullscreenError,toggleFullscreen}=useElementFullscreen(browserSurface);
  const current=useMemo(()=>tabs.find(t=>t.id===activeId)||tabs[0], [tabs,activeId]);
  const currentId=current?.id,visibleUrl=current?.url||'';
  const hasTabs=tabs.length>1||tabs.some(tab=>tab.url);

  useEffect(()=>{
    const listener=event=>setPrefs(event.detail);
    window.addEventListener('celestial:browser-preferences',listener);
    return()=>window.removeEventListener('celestial:browser-preferences',listener);
  },[]);
  useEffect(()=>{
    if(prefs.restoreTabs){
      saveLocal('forest-browser-tabs',tabs.map(t=>prefs.saveHistory?t:{...t,history:t.url?[t.url]:[],cursor:t.url?0:-1}));
    }else{saveLocal('forest-browser-tabs',[blank()]);}
  },[tabs,prefs.restoreTabs,prefs.saveHistory]);
  useEffect(()=>saveLocal('forest-browser-bookmarks',bookmarks),[bookmarks]);
  useEffect(()=>saveLocal('celestial-browser-recent',recent),[recent]);
  useEffect(()=>{
    if(!visibleUrl||!/^https?:\/\//i.test(visibleUrl))return;
    setRecent(rows=>[{url:visibleUrl,label:new URL(visibleUrl).hostname,at:Date.now()},
      ...rows.filter(row=>row.url!==visibleUrl)].slice(0,24));
  },[visibleUrl]);
  useEffect(()=>{
    const clear=()=>{
      setTabs([blank()]);setActiveId(null);setInput('');
      setBookmarks([]);setRecent([]);setClosedTabs([]);setLibraryOpen(false);
    };
    window.addEventListener('celestial:browser-clear-data',clear);
    return()=>window.removeEventListener('celestial:browser-clear-data',clear);
  },[]);
  useEffect(()=>{
    if(!notice&&!fullscreenError)return;
    const timer=setTimeout(()=>setNotice(''),2900);
    return()=>clearTimeout(timer);
  },[notice,fullscreenError]);
  useEffect(()=>setInput(visibleUrl),[visibleUrl,currentId]);
  const modify=useCallback((id,fn)=>setTabs(all=>all.map(tab=>tab.id===id?fn(tab):tab)),[]);
  const addTab=useCallback((url='')=>{
    const next=blank();
    if(url){next.url=url;next.history=[url];next.cursor=0;}
    setTabs(all=>[...all.slice(-11),next]);
    setActiveId(next.id);
    setInput(url);
    return next.id;
  },[]);
  const closeTab=useCallback(id=>{
    const removed=tabs.find(tab=>tab.id===id);
    if(removed?.url)setClosedTabs(all=>[removed,...all].slice(0,12));
    const remaining=tabs.filter(tab=>tab.id!==id);
    const next=remaining.length?remaining:[blank()];
    setTabs(next);
    if(id===currentId)setActiveId(next[next.length-1].id);
  },[tabs,currentId]);
  const reopenClosed=useCallback(()=>{
    const last=closedTabs[0];
    if(!last)return;
    const restored={...last,id:blank().id};
    setTabs(all=>[...all.slice(-11),restored]);
    setActiveId(restored.id);
    setClosedTabs(all=>all.slice(1));
    setLibraryOpen(false);
  },[closedTabs]);
  const navigate=useCallback((raw,id=currentId)=>{
    const url=browserAddress(raw,prefs.searchEngine);
    if(!url||!id)return;
    modify(id,tab=>{
      if(tab.url===url)return tab;
      const history=prefs.saveHistory?
        [...(tab.history||[]).slice(0,tab.cursor+1),url].slice(-30):[url];
      return {...tab,url,history,cursor:history.length-1};
    });
    setActiveId(id);
  },[currentId,modify,prefs.searchEngine,prefs.saveHistory]);
  const onLocation=useCallback((id,url)=>{
    if(!/^https?:\/\//i.test(url))return;
    modify(id,tab=>{
      if(tab.url===url)return tab;
      const index=prefs.saveHistory?(tab.history||[]).lastIndexOf(url):-1;
      if(index>=0)return {...tab,url,cursor:index};
      const history=prefs.saveHistory?[...(tab.history||[]).slice(0,tab.cursor+1),url].slice(-30):[url];
      return {...tab,url,history,cursor:history.length-1};
    });
  },[modify,prefs.saveHistory]);
  const openPopup=useCallback(url=>{
    const safe=browserAddress(url,prefs.searchEngine);
    if(!safe)return;
    if(prefs.openLinksInTabs)addTab(safe);
    else window.open(safe,'_blank','noopener,noreferrer');
  },[addTab,prefs.openLinksInTabs,prefs.searchEngine]);
  useEffect(()=>{
    if(!launch?.url||lastLaunch.current===launch.id)return;
    lastLaunch.current=launch.id;
    addTab(launch.url);
  },[launch?.id,addTab]);
  useEffect(()=>{
    const onKey=event=>{
      const ctrl=event.metaKey||event.ctrlKey;
      const key=event.key.toLowerCase();
      const editing=event.target instanceof HTMLInputElement||
        event.target instanceof HTMLTextAreaElement||event.target?.isContentEditable;
      if(ctrl&&key==='l'){event.preventDefault();box.current?.focus();box.current?.select();return;}
      if(ctrl&&event.shiftKey&&key==='t'){event.preventDefault();reopenClosed();return;}
      if(ctrl&&event.shiftKey&&key==='f'){event.preventDefault();toggleFullscreen();return;}
      if(ctrl&&key==='t'){event.preventDefault();addTab();return;}
      if(ctrl&&key==='tab'){
        event.preventDefault();
        const index=tabs.findIndex(tab=>tab.id===currentId);
        const offset=event.shiftKey?-1:1;
        setActiveId(tabs[(index+offset+tabs.length)%tabs.length]?.id);
        return;
      }
      if(ctrl&&/^[1-9]$/.test(key)){
        event.preventDefault();
        const index=key==='9'?tabs.length-1:Math.min(tabs.length-1,Number(key)-1);
        setActiveId(tabs[index]?.id);
        return;
      }
      if(event.key==='Escape'&&libraryOpen)setLibraryOpen(false);
      if(!editing&&ctrl&&key==='w'&&!homeMode){event.preventDefault();closeTab(currentId);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[addTab,closeTab,currentId,homeMode,reopenClosed,toggleFullscreen,tabs,libraryOpen]);
  const goHistory=direction=>{
    const tab=current;
    if(!tab||tab.cursor+direction<0||tab.cursor+direction>=tab.history.length)return;
    // One navigation only; frame.go() reacts to the updated tab URL.
    // Calling frame.back() here as well caused duplicate navigations.
    modify(tab.id,old=>{
      const cursor=old.cursor+direction;
      return {...old,url:old.history[cursor],cursor};
    });
  };
  const toggleBookmark=()=>{
    if(!visibleUrl)return;
    if(bookmarks.some(b=>b.url===visibleUrl))setBookmarks(all=>all.filter(b=>b.url!==visibleUrl));
    else setBookmarks(all=>[...all,{label:new URL(visibleUrl).hostname,url:visibleUrl}].slice(-30));
  };
  const favorite=bookmarks.some(bookmark=>bookmark.url===visibleUrl);
  const submit=event=>{event.preventDefault();navigate(input);setLibraryOpen(false);};
  const copyAddress=()=>{
    if(!visibleUrl)return;
    if(!navigator.clipboard?.writeText){setNotice('Copying is not supported here.');return;}
    navigator.clipboard.writeText(visibleUrl)
      .then(()=>setNotice('Link copied'))
      .catch(()=>setNotice('Could not copy the link'));
  };
  const recentItems=recent.filter(row=>row&&row.url?.startsWith('http')&&
    (row.label||'').toLowerCase().includes(libraryQuery.toLowerCase()));
  const bookmarkedItems=bookmarks.filter(row=>(row.label||row.url).toLowerCase()
    .includes(libraryQuery.toLowerCase()));
  return <section ref={browserSurface}
    className={'forest-browser celestial-browser-v2 '+(hasTabs?'has-tabs ':'')+
      (visibleUrl?'is-browsing ':'new-tab ')+(prefs.compactTabs?' compact-tabs ':'')+
      (focusMode?' focus-mode ':'')+(isFullscreen?' is-fullscreen':'')}
    aria-label="Celestial Browser">
    {hasTabs&&<div className="forest-browser-chrome">
      <div className="forest-tabs">
        <div className="celestial-browser-brand" aria-label="Celestial Browser">
          <span className="celestial-browser-brand-star">✦</span><strong>celestial</strong>
          <span className="celestial-browser-brand-divider"/>
        </div>
        <div className="celestial-browser-tab-track" role="tablist" aria-label="Browser tabs">
          {tabs.map(tab=><div key={tab.id}
            className={'forest-tab '+(tab.id===currentId?'active':'')}
            role="presentation">
            <span className="celestial-tab-monogram" aria-hidden="true">{tab.url?new URL(tab.url).hostname.charAt(0).toUpperCase():'✦'}</span>
            <button role="tab" aria-selected={tab.id===currentId}
              onClick={()=>setActiveId(tab.id)} title={tab.url||'New tab'}>
              {tab.url?new URL(tab.url).hostname:'New tab'}</button>
            <button className="forest-tab-close" onClick={()=>closeTab(tab.id)}
              aria-label={'Close '+(tab.url?new URL(tab.url).hostname:'New tab')+' tab'}>
              <BrowserGlyph name="close" size={14}/></button>
          </div>)}
          <button className="forest-add-tab" onClick={()=>addTab()} title="New tab (Ctrl+T)"
            aria-label="New tab"><BrowserGlyph name="plus" size={18}/></button>
        </div>
        <div className="celestial-browser-tab-actions">
          <button onClick={reopenClosed} disabled={!closedTabs.length} title="Reopen last closed tab (Ctrl+Shift+T)"
            aria-label="Reopen closed tab"><BrowserGlyph name="clock"/></button>
          <button onClick={toggleFullscreen} aria-label={isFullscreen?'Exit fullscreen':'Enter fullscreen'}
            title={isFullscreen?'Exit fullscreen (Esc)':'Fullscreen (Ctrl+Shift+F)'}>
            <BrowserGlyph name={isFullscreen?'shrink':'expand'}/></button>
        </div>
      </div>
      <div className="forest-toolbar">
        <div className="celestial-browser-transport">
          <button disabled={current?.cursor<=0} onClick={()=>goHistory(-1)}
            aria-label="Back" title="Back"><BrowserGlyph name="back"/></button>
          <button disabled={current?.cursor>=current?.history?.length-1} onClick={()=>goHistory(1)}
            aria-label="Forward" title="Forward"><BrowserGlyph name="forward"/></button>
          <button onClick={()=>{
            const control=controls.current.get(currentId);
            if(control?.reload)control.reload();
            else if(visibleUrl)setRetry(all=>({...all,[currentId]:(all[currentId]||0)+1}));
          }} aria-label="Reload" title="Reload" disabled={!visibleUrl}><BrowserGlyph name="reload"/></button>
        </div>
        <form onSubmit={submit} className="celestial-browser-address">
          <span className={'celestial-address-security '+(visibleUrl.startsWith('https:')?'secure':'')}
            title={visibleUrl.startsWith('https:')?'HTTPS connection':'Search or enter a website'}>
            <BrowserGlyph name={visibleUrl.startsWith('https:')?'shield':'star'} size={15}/>
          </span>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
            aria-label="Website address" placeholder="Search or enter a web address"
            spellCheck={false} autoComplete="off"/>
          <kbd>⌘ L</kbd>
          <button type="submit" aria-label="Visit site" title="Go to address">→</button>
        </form>
        <div className="celestial-browser-tools">
          <button onClick={toggleBookmark} disabled={!visibleUrl} title={favorite?'Remove bookmark':'Bookmark this page'}
            className={favorite?'favorite':''} aria-label={favorite?'Remove bookmark':'Bookmark'}>
            <BrowserGlyph name="star"/></button>
          <button onClick={copyAddress} disabled={!visibleUrl} aria-label="Copy link"
            title="Copy link"><BrowserGlyph name="copy"/></button>
          <button onClick={()=>setLibraryOpen(value=>!value)} aria-expanded={libraryOpen}
            aria-label="Library" title="Bookmarks and history"
            className={libraryOpen?'active':''}><BrowserGlyph name="library"/></button>
          <button onClick={()=>setFocusMode(value=>!value)} aria-pressed={focusMode}
            aria-label={focusMode?'Show browser chrome':'Focus mode'}
            title={focusMode?'Exit focus mode':'Focus mode'}
            className={focusMode?'active':''}><BrowserGlyph name="focus"/></button>
          {visibleUrl&&<a href={visibleUrl} target="_blank" rel="noopener noreferrer"
            title="Open this site directly" aria-label="Open directly"><BrowserGlyph name="external"/></a>}
        </div>
      </div>
    </div>}
    {libraryOpen&&<aside className="celestial-browser-library" aria-label="Browser library">
      <header><div><span className="celestial-browser-eyebrow">YOUR SPACE</span><h2>Library</h2></div>
        <button onClick={()=>setLibraryOpen(false)} aria-label="Close library">
          <BrowserGlyph name="close"/></button></header>
      <label className="celestial-library-search">
        <span aria-hidden="true">⌕</span>
        <input value={libraryQuery} onChange={e=>setLibraryQuery(e.target.value)}
          placeholder="Find a saved site" aria-label="Search bookmarks and history"/>
      </label>
      <div className="celestial-library-section">
        <div className="celestial-library-section-head"><strong>BOOKMARKS</strong><span>{bookmarkedItems.length}</span></div>
        {bookmarkedItems.length===0&&<p>No saved sites yet. Use the star in the address bar.</p>}
        {bookmarkedItems.map(item=><div className="celestial-library-entry" key={item.url}>
          <button onClick={()=>{navigate(item.url);setLibraryOpen(false);}}>
            <span className="celestial-library-glyph">✦</span>
            <span><strong>{item.label||new URL(item.url).hostname}</strong><small>{new URL(item.url).hostname}</small></span>
          </button>
          <button className="celestial-library-remove" aria-label={'Remove '+(item.label||item.url)+' bookmark'}
            onClick={()=>setBookmarks(all=>all.filter(b=>b.url!==item.url))}>×</button>
        </div>)}
      </div>
      <div className="celestial-library-section">
        <div className="celestial-library-section-head"><strong>RECENT</strong><span>{recentItems.length}</span></div>
        {recentItems.length===0&&<p>Sites you visit will show up here.</p>}
        {recentItems.slice(0,14).map(item=><button className="celestial-library-recent"
          key={item.url} onClick={()=>{navigate(item.url);setLibraryOpen(false);}}>
          <BrowserGlyph name="clock" size={16}/><span>{item.label||new URL(item.url).hostname}</span>
        </button>)}
      </div>
    </aside>}
    {(notice||fullscreenError)&&<div className="celestial-browser-notice" role="status">{fullscreenError||notice}</div>}
    <div className="forest-browser-stage">
      {!visibleUrl&&<div className="forest-browser-home">
        <div className="celestial-browser-start-kicker"><span>✦</span> CELESTIAL / EXPLORE</div>
        <div className="forest-wordmark" aria-label="Celestial">celes<span>tial</span></div>
        <p className="celestial-browser-start-caption">One place for everything you're into.</p>
        <form className="forest-main-search" onSubmit={submit}>
          <Icon name="browser" size={19}/>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
            placeholder="Search the web or enter a URL" aria-label="Search or enter a URL" autoComplete="off" spellCheck={false}/>
          <button type="submit" aria-label="Search"><Icon name="arrow" size={20}/></button>
        </form>
        <div className="forest-shortcuts">{shortcuts.map(item=>{
          const Glyph=item.icon;
          return <button key={item.id} onClick={()=>onShortcut?.(item.id)}><Glyph/>{item.name}</button>;
        })}</div>
        {(bookmarks.length>0||recent.length>0)&&<div className="celestial-browser-start-links">
          <div className="celestial-start-links-label"><span>JUMP BACK IN</span>
            <button onClick={()=>setLibraryOpen(true)}>View library <BrowserGlyph name="forward" size={13}/></button></div>
          <div className="celestial-start-link-grid">
            {(bookmarks.length?bookmarks.slice(-4):recent.slice(0,4)).map(item=><button
              key={item.url} onClick={()=>navigate(item.url)}>
              <span className="celestial-start-link-avatar">{(item.label||new URL(item.url).hostname).slice(0,1).toUpperCase()}</span>
              <span>{item.label||new URL(item.url).hostname}</span>
              <BrowserGlyph name="external" size={14}/>
            </button>)}
          </div>
        </div>}
      </div>}
      {tabs.map(tab=>tab.url?<BrowserFrame key={tab.id} tab={tab} active={tab.id===currentId}
        user={user} onNavigate={onLocation} onPopup={openPopup} retryKey={retry[tab.id]||0}
        register={(id,control)=>{
          if(control?.retry){setRetry(all=>({...all,[id]:(all[id]||0)+1}));return;}
          if(control)controls.current.set(id,control);else controls.current.delete(id);
        }}/>:null)}
    </div>
  </section>;
}
