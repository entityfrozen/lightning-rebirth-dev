import {openAboutBlank} from '../public/boba/about-blank.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {
  MusicNote220Filled,Cloud20Filled,Settings20Filled,Globe20Filled,Chat20Filled
} from '@fluentui/react-icons';
import {api,readLocal,saveLocal} from './constants.js';
import {browserAddress,browserPreferences} from './Preferences.js';
import {createProxyFrame,disposeProxyFrame} from './BoltProxy.js';

const shortcuts=[
  {id:'browser',name:'browser',icon:Globe20Filled},
  {id:'music',name:'music',icon:MusicNote220Filled},
  {id:'cloud',name:'AI',icon:Cloud20Filled},
  {id:'settings',name:'settings',icon:Settings20Filled}
];
const homeDestinations=[
  {id:'browser',label:'Browser',detail:'Search & open tabs',icon:Globe20Filled},
  {id:'chat',label:'Chat',detail:'Talk to members',icon:Chat20Filled},
  {id:'cloud',label:'AI',detail:'Ask something',icon:Cloud20Filled}
];
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
function BrowserFrame({tab,active,user,onNavigate,onPopup,onTitle,register,retryKey}){
  const iframe=useRef(null),frame=useRef(null),loadingTimeout=useRef(null);
  const lastRenderedDocument=useRef(null);
  const lastUrl=useRef(''),navigateRef=useRef(onNavigate),popupRef=useRef(onPopup),titleRef=useRef(onTitle);
  const [state,setState]=useState('loading'),[error,setError]=useState('');
  const [loadedOnce,setLoadedOnce]=useState(false);
  navigateRef.current=onNavigate;popupRef.current=onPopup;titleRef.current=onTitle;

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
        if(doc.title)titleRef.current(tab.id,doc.title);
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
        // Probe the real Scramjet controller instead of rejecting an embedded
        // page solely because crossOriginIsolated is false.
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
      {window.self!==window.top&&!window.crossOriginIsolated&&
        <a href={location.origin+'/#browser'} target="_blank" rel="noopener noreferrer">Open full Celestial browser ↗</a>}
      <a href={tab.url} target="_blank" rel="noopener noreferrer"
        onClick={event=>{event.preventDefault();const result=openAboutBlank(tab.url,{title:'Website'});if(!result.ok)alert(result.message);}}>Open site directly ↗</a></div>
    </div>}
  </div>;
}
export function Browser({user,onAuth,onShortcut,homeMode=false,launch=null,onOpenBrowser,onCloseBrowser}){
  const [tabs,setTabs]=useState(savedTabs);
  const [activeId,setActiveId]=useState(null);
  const [input,setInput]=useState('');
  const [homeQuery,setHomeQuery]=useState('');
  const [prefs,setPrefs]=useState(browserPreferences);
  const [bookmarks,setBookmarks]=useState(()=>readLocal('forest-browser-bookmarks',[]));
  const [retry,setRetry]=useState({});
  const [fullScreen,setFullScreen]=useState(false);
  const [showBookmarks,setShowBookmarks]=useState(false);
  const [closedTabs,setClosedTabs]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const root=useRef(null);
  const controls=useRef(new Map()),box=useRef(null),homeBox=useRef(null),lastLaunch=useRef(null);
  const current=useMemo(()=>tabs.find(t=>t.id===activeId)||tabs[0], [tabs,activeId]);
  const currentId=current?.id,visibleUrl=current?.url||'';
  const hasTabs=true; // The browser always has tabs and an address bar.

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
  useEffect(()=>{
    const sync=()=>setFullScreen(document.fullscreenElement===root.current);
    document.addEventListener('fullscreenchange',sync);
    return()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  const toggleFullscreen=async()=>{
    try{
      if(document.fullscreenElement===root.current)await document.exitFullscreen();
      else if(root.current?.requestFullscreen)await root.current.requestFullscreen();
      else setMenuOpen(false);
    }catch{
      // Browser policy can deny fullscreen; the button remains available.
      setMenuOpen(false);
    }
  };
  const copyAddress=async()=>{
    if(!visibleUrl)return;
    try{
      await navigator.clipboard.writeText(visibleUrl);
      setNotice('Address copied');
    }catch{
      setNotice('Clipboard unavailable. Select the address bar to copy.');
    }
    setMenuOpen(false);
  };
  const reconnect=()=>{
    if(!currentId||!visibleUrl)return;
    setRetry(all=>({...all,[currentId]:(all[currentId]||0)+1}));
    setNotice('Reconnecting this tab…');
    setMenuOpen(false);
  };
  const closeOtherTabs=()=>{
    if(!current)return;
    setClosedTabs(all=>[...all,...tabs.filter(tab=>tab.id!==current.id&&tab.url)].slice(-8));
    setTabs([current]);
    setActiveId(current.id);
    setMenuOpen(false);
  };
  const restoreClosedTab=()=>{
    const tab=closedTabs.at(-1);
    if(!tab)return;
    setClosedTabs(all=>all.slice(0,-1));
    setTabs(all=>[...all.slice(-11),tab]);
    setActiveId(tab.id);
  };
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
    if(removed?.url)setClosedTabs(all=>[...all.slice(-7),removed]);
    const remaining=tabs.filter(tab=>tab.id!==id);
    const next=remaining.length?remaining:[blank()];
    setTabs(next);
    if(id===currentId)setActiveId(next[next.length-1].id);
  },[tabs,currentId]);
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
      if(ctrl&&key==='l'){event.preventDefault();const target=homeMode?homeBox.current:box.current;target?.focus();target?.select();return;}
      if(ctrl&&key==='t'){event.preventDefault();addTab();return;}
      if(ctrl&&event.shiftKey&&key==='f'){
        event.preventDefault();toggleFullscreen();return;
      }
      if(ctrl&&event.shiftKey&&key==='t'){
        event.preventDefault();restoreClosedTab();return;
      }
      if(!editing&&ctrl&&key==='tab'){
        event.preventDefault();
        const idx=tabs.findIndex(tab=>tab.id===currentId);
        const shift=event.shiftKey?-1:1;
        setActiveId(tabs[(idx+shift+tabs.length)%tabs.length]?.id);
        return;
      }
      if(!editing&&ctrl&&key==='w'&&!homeMode){event.preventDefault();closeTab(currentId);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[addTab,closeTab,currentId,homeMode,tabs,closedTabs,fullScreen]);
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
  const updateTitle=useCallback((id,title)=>{
    const clean=String(title||'').replace(/\s+/g,' ').trim().slice(0,64);
    if(clean)modify(id,tab=>tab.title===clean?tab:{...tab,title:clean});
  },[modify]);
  const submit=event=>{event.preventDefault();navigate(input);};
  const submitHome=event=>{
    event.preventDefault();
    if(!homeQuery.trim())return;
    const url=browserAddress(homeQuery,prefs.searchEngine);
    if(!url)return;
    addTab(url);
    setHomeQuery('');
    onOpenBrowser?.();
  };
  const leaveBrowser=()=>{
    if(document.fullscreenElement===root.current)document.exitFullscreen().catch(()=>{});
    onCloseBrowser?.();
  };
  return <section className={'forest-browser '+(hasTabs?'has-tabs ':'')+
    (homeMode?'home-mode ':'')+(visibleUrl&&!homeMode?'is-browsing':'new-tab')+
    (prefs.compactTabs?' compact-tabs':'')}
    aria-label="Celestial Browser" ref={root} data-fullscreen={fullScreen?'on':'off'}>
    {!homeMode&&hasTabs&&<div className="forest-browser-chrome">
      <div className="celestial-browser-topline">
        <span className="celestial-browser-identity"><span className="celestial-browser-star">✦</span> CELESTIAL <em>/ BROWSER</em></span>
        <div className="celestial-browser-top-actions">
          <span className="celestial-browser-session" role="status">{notice||`${tabs.length} ${tabs.length===1?'tab':'tabs'} open`}</span>
          <button type="button" className="celestial-browser-close" aria-label="Close browser and return Home"
            onClick={leaveBrowser}>× <span>Close browser</span></button>
          <button type="button" className="celestial-browser-top-button" onClick={toggleFullscreen}
            title={fullScreen?'Exit fullscreen (Esc)':'Fullscreen (Ctrl+Shift+F)'}
            aria-label={fullScreen?'Exit browser fullscreen':'Enter browser fullscreen'}
            aria-pressed={fullScreen}>{fullScreen?'▣':'⛶'} <span>{fullScreen?'Exit fullscreen':'Fullscreen'}</span></button>
        </div>
      </div>
      <div className="forest-toolbar">
        <button disabled={current?.cursor<=0} onClick={()=>goHistory(-1)} aria-label="Back"><Icon name="back" size={16}/></button>
        <button disabled={current?.cursor>=current?.history?.length-1} onClick={()=>goHistory(1)} aria-label="Forward">→</button>
        <button onClick={()=>{
          const control=controls.current.get(currentId);
          if(control?.reload)control.reload();
          else if(visibleUrl)setRetry(all=>({...all,[currentId]:(all[currentId]||0)+1}));
        }} aria-label="Reload" disabled={!visibleUrl}><Icon name="reload" size={16}/></button>
        <form onSubmit={submit}><span className="celestial-browser-lock" aria-hidden="true">{visibleUrl?.startsWith('https:')?'⌁':'⌕'}</span>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
            aria-label="Website address" autoComplete="off" spellCheck={false}
            placeholder="Search anything or enter a web address"/>
          <button type="submit" aria-label="Visit site">→</button></form>
        <button onClick={toggleBookmark} className={favorite?'favorite':''}
          disabled={!visibleUrl} aria-label={favorite?'Remove bookmark':'Bookmark this page'}
          title={favorite?'Remove bookmark':'Bookmark this page'}><Icon name="bookmark" size={16}/></button>
        <button onClick={()=>setShowBookmarks(open=>!open)} aria-label="Show saved bookmarks"
          aria-expanded={showBookmarks} title="Bookmarks">▤</button>
        <button onClick={()=>setMenuOpen(open=>!open)} aria-label="Browser menu"
          aria-expanded={menuOpen} title="Browser tools">⋯</button>
        {visibleUrl&&<a href={visibleUrl} target="_blank" rel="noopener noreferrer" title="Open Direct in about:blank" aria-label="Open directly"
        onClick={event=>{event.preventDefault();const result=openAboutBlank(visibleUrl,{title:'Website'});if(!result.ok)alert(result.message);}}><Icon name="external" size={16}/></a>}
      </div>
      {showBookmarks&&<div className="celestial-browser-bookmark-tray">
        <strong>Saved sites</strong>
        {bookmarks.length===0?<span>No bookmarks yet. Save a page with the star.</span>:
          bookmarks.map(bookmark=><button key={bookmark.url} onClick={()=>{
            navigate(bookmark.url);setShowBookmarks(false);
          }} title={bookmark.url}>{bookmark.label}</button>)}
        <button onClick={()=>setShowBookmarks(false)} aria-label="Close bookmarks">×</button>
      </div>}
      {menuOpen&&<div className="celestial-browser-menu" role="group" aria-label="Browser tools">
        <button onClick={()=>{addTab();setMenuOpen(false);}}>＋ New tab <kbd>Ctrl T</kbd></button>
        <button disabled={!closedTabs.length} onClick={()=>{restoreClosedTab();setMenuOpen(false);}}>
          ↶ Reopen closed tab <kbd>Ctrl Shift T</kbd></button>
        <button onClick={()=>{toggleFullscreen();setMenuOpen(false);}}>⛶ {fullScreen?'Exit fullscreen':'Fullscreen'} <kbd>Ctrl Shift F</kbd></button>
        <button onClick={()=>{setShowBookmarks(v=>!v);setMenuOpen(false);}}>☆ Bookmarks</button>
        <button disabled={!visibleUrl} onClick={copyAddress}>⧉ Copy page address</button>
        <button disabled={!visibleUrl} onClick={reconnect}>↻ Reset tab connection</button>
        <button disabled={tabs.length<2} onClick={closeOtherTabs}>× Close other tabs</button>
        <span>Tabs and bookmarks are saved on this device.</span>
      </div>}
    </div>}
    <div className="forest-browser-stage">
      {(homeMode||!visibleUrl)&&<div className="forest-browser-home">
        {window.self!==window.top&&!window.crossOriginIsolated&&
          <div className="celestial-embedded-browser-notice" role="note">
            <strong>Browser needs its own tab</strong>
            <span>The launcher can show Celestial, but Scramjet needs a standalone browser window.</span>
            <a href={location.origin+'/#browser'} target="_blank" rel="noopener noreferrer">Open full browser ↗</a>
          </div>}
        <div className="flare-home-symbol" aria-hidden="true">✦</div>
        <h1 className="forest-wordmark" aria-label="Celestial">celestial<span>.</span></h1>
        <p className="flare-home-hint">{homeMode?'Your web, one search away.':'New tab'}</p>
        <form className="forest-main-search" onSubmit={homeMode?submitHome:submit}>
          <Icon name="browser" size={19}/>
          {homeMode?<input ref={homeBox} value={homeQuery} onChange={e=>setHomeQuery(e.target.value)}
            placeholder="Search the web or enter a URL" aria-label="Search or enter a URL"
            autoComplete="off" spellCheck={false}/>:
            <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
              placeholder="Search the web or enter a URL" aria-label="Search or enter a URL"
              autoComplete="off" spellCheck={false}/>}
          <button type="submit" aria-label="Search">Search <Icon name="arrow" size={18}/></button>
        </form>
        {homeMode?<div className="celestial-home-starter">
          <p className="celestial-home-starter-title">Where to?</p>
          <div className="celestial-home-starter-grid">
            {homeDestinations.map(item=>{
              const Glyph=item.icon;
              return <button type="button" key={item.id} onClick={()=>onShortcut?.(item.id)}>
                <Glyph/><span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </button>;
            })}
          </div>
          <div className="celestial-home-more">
            <button type="button" onClick={()=>onShortcut?.('music')}>Open Music</button>
            <button type="button" onClick={()=>onShortcut?.('settings')}>Settings</button>
          </div>
        </div>:<div className="forest-shortcuts">{shortcuts.map(item=>{
          const Glyph=item.icon;
          return <button key={item.id} onClick={()=>onShortcut?.(item.id)}><Glyph/>{item.name}</button>;
        })}</div>}
        {bookmarks.length>0&&<div className="forest-bookmarks">{bookmarks.slice(-6).map(bookmark=><button key={bookmark.url}
          onClick={()=>{addTab(bookmark.url);if(homeMode)onOpenBrowser?.();}}>✧ {bookmark.label}</button>)}</div>}
      </div>}
      {tabs.map(tab=>tab.url?<BrowserFrame key={tab.id} tab={tab} active={tab.id===currentId}
        user={user} onNavigate={onLocation} onPopup={openPopup} onTitle={updateTitle} retryKey={retry[tab.id]||0}
        register={(id,control)=>{
          if(control?.retry){setRetry(all=>({...all,[id]:(all[id]||0)+1}));return;}
          if(control)controls.current.set(id,control);else controls.current.delete(id);
        }}/>:null)}
    </div>
    {!homeMode&&<div className="flare-browser-bottom-tabs" aria-label="Open browser tabs">
        <div className="forest-tabs">{tabs.map(tab=><div key={tab.id}
          className={'forest-tab '+(tab.id===currentId?'active':'')}>
          <button onClick={()=>setActiveId(tab.id)} title={tab.url||'New tab'}>
            <span className="celestial-browser-tab-mark" aria-hidden="true">{tab.url?'◉':'✦'}</span>
            {tab.title|| (tab.url?new URL(tab.url).hostname:'New tab')}</button>
          <button className="forest-tab-close" onClick={()=>closeTab(tab.id)} aria-label="Close tab">×</button>
        </div>)}
        <button className="forest-add-tab" onClick={()=>addTab()} aria-label="New tab">＋</button></div>
    </div>}
  </section>;
}
