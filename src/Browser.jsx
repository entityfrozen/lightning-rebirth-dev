import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {readLocal,saveLocal,safeUrl} from './constants.js';
import {createProxyFrame} from './BoltProxy.js';

const shortcuts=[
 {name:'study',query:'research techniques for studying'},
 {name:'apps',query:'web applications'},
 {name:'games',query:'browser games'},
 {name:'music',query:'online music'},
 {name:'cloud',query:'cloud services'}
];
const blank=()=>({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),url:'',history:[],cursor:-1});
function BrowserFrame({tab,active,user,openTab,onLocation,register}){
  const iframe=useRef(null),frame=useRef(null),last=useRef(''),[error,setError]=useState('');
  useEffect(()=>{
    let disposed=false;
    const el=iframe.current;
    if(!el||!tab.url)return;
    (async()=>{
      try {
        if(user){
          const connection=await createProxyFrame(el,location=>{
            last.current=location;onLocation(tab.id,location);
          },openTab);
          if(disposed)return;
          frame.current=connection;
        }
        register(tab.id,{
          back:()=>{try{el.contentWindow?.history.back();}catch{}},
          forward:()=>{try{el.contentWindow?.history.forward();}catch{}},
          reload:()=>{if(frame.current?.reload)frame.current.reload();else if(!user)el.src=tab.url;}
        });
        if(frame.current){
          last.current=tab.url;
          await frame.current.go(tab.url);
        }else{
          el.src=tab.url;
          setError('Some sites block embedded viewing. Sign in to use the full Bolt browser engine.');
        }
      }catch(e){
        if(!disposed){setError(e.message||'The proxy is unavailable');el.src=tab.url;}
      }
    })();
    return()=>{disposed=true;register(tab.id,null);frame.current=null;};
  },[tab.id,Boolean(user),tab.url!=='' ]);
  useEffect(()=>{
    if(!tab.url||!frame.current||tab.url===last.current)return;
    last.current=tab.url;
    frame.current.go(tab.url).catch(e=>setError(e.message||'Unable to open this page'));
  },[tab.url]);
  if(!tab.url)return null;
  return <div className={'browser-frame '+(active?'active':'')} aria-hidden={!active}>
    <iframe ref={iframe} title={'Browsing '+tab.url} className="portal-iframe"
      allow="fullscreen; clipboard-read; clipboard-write; picture-in-picture"
      referrerPolicy="no-referrer"/>
    {error&&active&&<div className="browser-embed-warning">{error} <a href={tab.url} target="_blank" rel="noopener noreferrer">Open directly ↗</a></div>}
  </div>;
}
export function Browser({user,onAuth,compact=false}){
  const [tabs,setTabs]=useState(()=>readLocal('forest-browser-tabs',[blank()]).slice(0,12));
  const [active,setActive]=useState(null);
  const [input,setInput]=useState('');
  const [bookmarks,setBookmarks]=useState(()=>readLocal('forest-browser-bookmarks',[
    {label:'Wikipedia',url:'https://www.wikipedia.org/'},
    {label:'GitHub',url:'https://github.com/'},
    {label:'YouTube',url:'https://www.youtube.com/'}
  ]));
  const [message,setMessage]=useState('');
  const controls=useRef(new Map());
  const box=useRef(null);
  const current=useMemo(()=>tabs.find(t=>t.id===active)||tabs[0], [tabs,active]);
  const activeId=current?.id;
  const visibleUrl=current?.url||'';
  useEffect(()=>{saveLocal('forest-browser-tabs',tabs);},[tabs]);
  useEffect(()=>{saveLocal('forest-browser-bookmarks',bookmarks);},[bookmarks]);
  useEffect(()=>setInput(visibleUrl),[visibleUrl,activeId]);
  useEffect(()=>{
    const onKey=e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='l'){
        e.preventDefault();box.current?.focus();box.current?.select();
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='t'){
        e.preventDefault();addTab();
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='w'){
        e.preventDefault();closeTab(activeId);
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[activeId,tabs]);
  const modify=useCallback((id,fn)=>setTabs(all=>all.map(t=>t.id===id?fn(t):t)),[]);
  const navigate=(value,id=activeId)=>{
    const url=safeUrl(value);
    if(!url)return;
    modify(id,tab=>{
      const history=[...tab.history.slice(0,tab.cursor+1),url].slice(-30);
      return {...tab,url,history,cursor:history.length-1};
    });
    setActive(id);setMessage('');
  };
  const onLocation=useCallback((id,url)=>{
    modify(id,tab=>{
      if(tab.url===url)return tab;
      const previous=tab.history.lastIndexOf(url);
      if(previous>=0)return {...tab,url,cursor:previous};
      const history=[...tab.history.slice(0,tab.cursor+1),url].slice(-30);
      return {...tab,url,history,cursor:history.length-1};
    });
  },[modify]);
  const addTab=()=>{const next=blank();setTabs(all=>[...all.slice(-11),next]);setActive(next.id);setInput('');};
  const closeTab=id=>{
    if(tabs.length===1){const next=blank();setTabs([next]);setActive(next.id);return;}
    const remaining=tabs.filter(t=>t.id!==id);
    setTabs(remaining);if(id===activeId)setActive(remaining[remaining.length-1].id);
  };
  const goHistory=direction=>{
    if(!current || current.cursor+direction<0 || current.cursor+direction>=current.history.length)return;
    modify(activeId,tab=>{
      const cursor=tab.cursor+direction;
      return {...tab,url:tab.history[cursor],cursor};
    });
  };
  const toggleBookmark=()=>{
    if(!visibleUrl)return;
    if(bookmarks.some(b=>b.url===visibleUrl))setBookmarks(all=>all.filter(b=>b.url!==visibleUrl));
    else setBookmarks(all=>[...all,{label:new URL(visibleUrl).hostname,url:visibleUrl}].slice(-30));
  };
  const go=e=>{e.preventDefault();navigate(input);};
  const favorite=bookmarks.some(b=>b.url===visibleUrl);
  return <section className={'forest-browser '+(visibleUrl?'is-browsing':'new-tab')} aria-label="Celestial Browser">
    {visibleUrl&&<div className="forest-browser-chrome">
      <div className="forest-tabs">{tabs.map(t=><div className={'forest-tab '+(t.id===activeId?'active':'')} key={t.id}>
        <button onClick={()=>setActive(t.id)}>{t.url?new URL(t.url).hostname:'New tab'}</button>
        <button className="forest-tab-close" aria-label="Close tab" onClick={()=>closeTab(t.id)}>×</button>
      </div>)}<button className="forest-add-tab" onClick={addTab} aria-label="New tab">＋</button></div>
      <div className="forest-toolbar">
        <button disabled={current?.cursor<=0} onClick={()=>goHistory(-1)} aria-label="Back"><Icon name="back" size={16}/></button>
        <button disabled={current?.cursor>=current?.history.length-1} onClick={()=>goHistory(1)} aria-label="Forward"><Icon name="back" size={16} style={{transform:'rotate(180deg)'}}/></button>
        <button onClick={()=>controls.current.get(activeId)?.reload()} aria-label="Reload"><Icon name="reload" size={16}/></button>
        <form onSubmit={go}><Icon name="browser" size={15}/><input ref={box} value={input} onChange={e=>setInput(e.target.value)} aria-label="Website address" autoComplete="off"/><button type="submit" aria-label="Visit site">→</button></form>
        <button onClick={toggleBookmark} className={favorite?'favorite':''} aria-label="Bookmark"><Icon name="bookmark" size={16}/></button>
        <a href={visibleUrl} target="_blank" rel="noopener noreferrer" title="Open directly"><Icon name="external" size={16}/></a>
      </div>
    </div>}
    <div className="forest-browser-stage">
      {!visibleUrl&&<div className="forest-browser-home">
        <div className="forest-wordmark" aria-label="Celestial">celes<span>tial</span><sup>✦</sup></div>
        <form className="forest-main-search" onSubmit={go}>
          <Icon name="browser" size={19}/>
          <input ref={box} value={input} onChange={e=>setInput(e.target.value)} placeholder="search or enter a url" aria-label="Search or enter a URL" autoComplete="off" spellCheck={false}/>
          <button type="submit" aria-label="Search"><Icon name="arrow" size={20}/></button>
        </form>
        <div className="forest-shortcuts">{shortcuts.map(s=><button key={s.name} onClick={()=>navigate(s.query)}>{s.name}</button>)}</div>
        {bookmarks.length>0&&<div className="forest-bookmarks">{bookmarks.slice(0,4).map(b=><button key={b.url} onClick={()=>navigate(b.url)}>✧ {b.label}</button>)}</div>}
        {!user&&<button className="forest-browser-tip" onClick={()=>onAuth('login')}>Sign in for Bolt's full-site browsing engine ↗</button>}
      </div>}
      {tabs.map(tab=>tab.url?<BrowserFrame key={tab.id} tab={tab} active={tab.id===activeId} user={user}
        onLocation={onLocation} openTab={value=>{const t=blank();setTabs(all=>[...all.slice(-11),{...t,url:value,history:[value],cursor:0}]);setActive(t.id);}}
        register={(id,ctrl)=>{if(ctrl)controls.current.set(id,ctrl);else controls.current.delete(id);}}/>:null)}
    </div>
    {message&&<div className="forest-browser-toast">{message}</div>}
  </section>;
}
