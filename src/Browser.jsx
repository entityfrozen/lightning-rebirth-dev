import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {
  Grid20Filled,MusicNote220Filled,Cloud20Filled,Settings20Filled,Globe20Filled
} from '@fluentui/react-icons';
import {api,readLocal,saveLocal} from './constants.js';
import {browserAddress,browserPreferences} from './Preferences.js';
import {createProxyFrame,disposeProxyFrame} from './BoltProxy.js';

const shortcuts=[
  {id:'apps',name:'apps',icon:Grid20Filled},
  {id:'browser',name:'browser',icon:Globe20Filled},
  {id:'music',name:'music',icon:MusicNote220Filled},
  {id:'cloud',name:'AI',icon:Cloud20Filled},
  {id:'settings',name:'settings',icon:Settings20Filled}
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
function BrowserFrame({tab,active,user,onNavigate,onPopup,register,retryKey}){
  const iframe=useRef(null),frame=useRef(null);
  const lastUrl=useRef(''),navigateRef=useRef(onNavigate),popupRef=useRef(onPopup);
  const [state,setState]=useState('loading'),[error,setError]=useState('');
  navigateRef.current=onNavigate;popupRef.current=onPopup;

  useEffect(()=>{
    let cancelled=false;
    const el=iframe.current;
    if(!el||!tab.url)return;
    setState('loading');setError('');
    (async()=>{
      try{
        if(!user)throw Error('Sign in to browse in Celestial.');
        const status=await api('/api/browser/status');
        if(!status.authenticated)throw Error('Sign in to browse in Celestial.');
        if(!status.proxy)throw Error('The browser engine is unavailable on this server.');
        const connection=await createProxyFrame(el,
          url=>{if(!cancelled)navigateRef.current(tab.id,url);},
          url=>{if(!cancelled)popupRef.current(url);});
        if(cancelled)return;
        frame.current=connection;
        register(tab.id,{
          back:()=>connection.back(),
          forward:()=>connection.forward(),
          reload:()=>connection.reload()
        });
        lastUrl.current=tab.url;
        connection.go(tab.url); // Scramjet Frame.go() is synchronous.
      }catch(failure){
        if(!cancelled){setState('error');setError(failure.message||'Unable to open this site.');}
      }
    })();
    return()=>{cancelled=true;register(tab.id,null);disposeProxyFrame(frame.current);frame.current=null;};
  },[tab.id,Boolean(user),retryKey]);
  useEffect(()=>{
    if(!tab.url||!frame.current||tab.url===lastUrl.current)return;
    try{
      lastUrl.current=tab.url;
      setState('loading');setError('');
      frame.current.go(tab.url);
    }catch(failure){setState('error');setError(failure.message||'Unable to navigate.');}
  },[tab.url]);
  if(!tab.url)return null;
  return <div className={'browser-frame '+(active?'active':'')} aria-hidden={!active}>
    <iframe ref={iframe} title={'Browsing '+tab.url} className="portal-iframe"
      allow="fullscreen; clipboard-read; clipboard-write; picture-in-picture"
      referrerPolicy="no-referrer"
      onLoad={()=>{if(frame.current)setState('ready');}}/>
    {state==='loading'&&active&&<div className="celestial-browser-loading"><span className="celestial-browser-spinner"/>Opening page…</div>}
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
  const controls=useRef(new Map()),box=useRef(null),lastLaunch=useRef(null);
  const current=useMemo(()=>tabs.find(t=>t.id===activeId)||tabs[0], [tabs,activeId]);
  const currentId=current?.id,visibleUrl=current?.url||'';

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
    setTabs(all=>{
      const rest=all.filter(tab=>tab.id!==id);
      if(rest.length===0){const newTab=blank();setActiveId(newTab.id);return [newTab];}
      if(id===currentId)setActiveId(rest[rest.length-1].id);
      return rest;
    });
  },[currentId]);
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
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement){
        if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='l'){
          event.preventDefault();box.current?.focus();box.current?.select();
        }
        return;
      }
      const ctrl=event.metaKey||event.ctrlKey;
      if(ctrl&&event.key.toLowerCase()==='l'){event.preventDefault();box.current?.focus();box.current?.select();}
      if(ctrl&&event.key.toLowerCase()==='t'){event.preventDefault();addTab();}
      if(ctrl&&event.key.toLowerCase()==='w'&&!homeMode){event.preventDefault();closeTab(currentId);}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[addTab,closeTab,currentId,homeMode]);
  const goHistory=direction=>{
    const tab=current;
    if(!tab||tab.cursor+direction<0||tab.cursor+direction>=tab.history.length)return;
    const proxy=controls.current.get(tab.id);
    if(proxy&&!proxy.retry){
      try{direction<0?proxy.back():proxy.forward();}catch{}
    }
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
  const submit=event=>{event.preventDefault();navigate(input);};
  return <section className={'forest-browser '+(visibleUrl?'is-browsing':'new-tab')+(prefs.compactTabs?' compact-tabs':'')}
    aria-label="Celestial Browser">
    {visibleUrl&&<div className="forest-browser-chrome">
      <div className="forest-tabs">{tabs.map(tab=><div key={tab.id}
        className={'forest-tab '+(tab.id===currentId?'active':'')}>
        <button onClick={()=>setActiveId(tab.id)} title={tab.url||'New tab'}>
          {tab.url?new URL(tab.url).hostname:'New tab'}</button>
        <button className="forest-tab-close" onClick={()=>closeTab(tab.id)} aria-label="Close tab">×</button>
      </div>)}
      <button className="forest-add-tab" onClick={()=>addTab()} aria-label="New tab">＋</button></div>
      <div className="forest-toolbar">
        <button disabled={current?.cursor<=0} onClick={()=>goHistory(-1)} aria-label="Back"><Icon name="back" size={16}/></button>
        <button disabled={current?.cursor>=current?.history?.length-1} onClick={()=>goHistory(1)} aria-label="Forward">→</button>
        <button onClick={()=>controls.current.get(currentId)?.reload()} aria-label="Reload"><Icon name="reload" size={16}/></button>
        <form onSubmit={submit}><Icon name="browser" size={15}/>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
            aria-label="Website address" autoComplete="off"/>
          <button type="submit" aria-label="Visit site">→</button></form>
        <button onClick={toggleBookmark} className={favorite?'favorite':''} aria-label="Bookmark"><Icon name="bookmark" size={16}/></button>
        <a href={visibleUrl} target="_blank" rel="noopener noreferrer" title="Open directly" aria-label="Open directly"><Icon name="external" size={16}/></a>
      </div>
    </div>}
    <div className="forest-browser-stage">
      {!visibleUrl&&<div className="forest-browser-home">
        <div className="forest-wordmark" aria-label="Celestial">celes<span>tial</span></div>
        <form className="forest-main-search" onSubmit={submit}>
          <Icon name="browser" size={19}/>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)}
            placeholder="search or enter a url" aria-label="Search or enter a URL" autoComplete="off" spellCheck={false}/>
          <button type="submit" aria-label="Search"><Icon name="arrow" size={20}/></button>
        </form>
        <div className="forest-shortcuts">{shortcuts.map(item=>{
          const Glyph=item.icon;
          return <button key={item.id} onClick={()=>onShortcut?.(item.id)}><Glyph/>{item.name}</button>;
        })}</div>
        {bookmarks.length>0&&<div className="forest-bookmarks">{bookmarks.slice(-6).map(bookmark=><button key={bookmark.url}
          onClick={()=>navigate(bookmark.url)}>✧ {bookmark.label}</button>)}</div>}
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
