import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { readLocal, saveLocal, safeUrl } from './constants.js';

const sites=[
  {name:'MDN Web Docs',url:'https://developer.mozilla.org/'},
  {name:'GitHub',url:'https://github.com/'},
  {name:'Three.js',url:'https://threejs.org/'},
  {name:'OpenAI',url:'https://openai.com/'}
];
let nextId=1;
const newTab=()=>({id:++nextId,entry:'',history:[],cursor:-1});

export function Browser(){
  const [tabs,setTabs]=useState(()=>readLocal('browser-tabs',[newTab()]));
  const [activeId,setActiveId]=useState(()=>readLocal('browser-active',null));
  const [bookmarks,setBookmarks]=useState(()=>readLocal('bookmarks',sites));
  const [address,setAddress]=useState('');
  const current=tabs.find(t=>t.id===activeId)||tabs[0]||null;
  const active=current?.id;
  const url=current?.cursor>=0?current.history[current.cursor]:'';
  const frame=useRef(null);

  useEffect(()=>{saveLocal('browser-tabs',tabs);saveLocal('browser-active',active);},[tabs,active]);
  useEffect(()=>saveLocal('bookmarks',bookmarks),[bookmarks]);
  useEffect(()=>setAddress(url||''),[url,active]);
  const change=fn=>setTabs(prev=>prev.map(t=>t.id===active?fn(t):t));
  const navigate=value=>{
    const next=safeUrl(value);if(!next)return;
    change(t=>({ ...t, history:[...t.history.slice(0,t.cursor+1),next].slice(-25),cursor:Math.min(t.cursor+1,24),entry:next }));
    setAddress(next);
  };
  const add=()=>{const t=newTab();setTabs(prev=>[...prev,t]);setActiveId(t.id);};
  const close=id=>{
    if(tabs.length===1){setTabs([newTab()]);return;}
    const remaining=tabs.filter(t=>t.id!==id);
    setTabs(remaining);
    if(id===active)setActiveId(remaining[Math.max(0,tabs.findIndex(t=>t.id===id)-1)]?.id||remaining[0].id);
  };
  const canBack=(current?.cursor??-1)>0;
  const canForward=(current?.cursor??-1)<(current?.history.length??0)-1;
  const favorite=bookmarks.some(b=>b.url===url);
  const toggleBookmark=()=>{
    if(!url)return;
    setBookmarks(prev=>favorite?prev.filter(b=>b.url!==url):[...prev,{name:new URL(url).hostname,url}]);
  };
  return <div className="screen browser-screen">
    <div className="screen-head"><div><span className="eyebrow">WORLD WIDE / INFINITE</span><h1>Browser<span className="heading-dot">.</span></h1><p>A space to explore, discover and keep what matters.</p></div><span className="head-side">TABS, BOOKMARKS & NAVIGATION <i>↗</i></span></div>
    <section className="browser-window glass">
      <div className="browser-tabs">
        {tabs.map(t=>{
          const location=t.cursor>=0?t.history[t.cursor]:null;
          const title=location?new URL(location).hostname.replace(/^www\./,''):'New tab';
          return <div className={'browser-tab '+(active===t.id?'active':'')} key={t.id}>
            <button className="tab-name" onClick={()=>setActiveId(t.id)}><span className="tab-favicon">{location?'◈':'✧'}</span><span>{title}</span></button>
            <button className="tab-x" onClick={()=>close(t.id)} aria-label={'Close '+title}>×</button>
          </div>;
        })}
        <button className="add-tab" aria-label="New tab" onClick={add}><Icon name="plus" size={15}/></button>
      </div>
      <div className="browser-toolbar">
        <button className="toolbar-button" disabled={!canBack} onClick={()=>change(t=>({...t,cursor:t.cursor-1}))} aria-label="Back"><Icon name="back" size={17}/></button>
        <button className="toolbar-button flipped" disabled={!canForward} onClick={()=>change(t=>({...t,cursor:t.cursor+1}))} aria-label="Forward"><Icon name="back" size={17}/></button>
        <button className="toolbar-button" onClick={()=>{if(frame.current)frame.current.src=url;else setTabs(prev=>prev.slice());}} aria-label="Reload"><Icon name="reload" size={17}/></button>
        <form className="address-input" onSubmit={e=>{e.preventDefault();navigate(address);}}>
          <span>{url?.startsWith('https:')?'♢':'⌕'}</span>
          <input aria-label="Website address or search" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Search or enter a web address"/>
          <button aria-label="Go to address" type="submit"><Icon name="arrow" size={16}/></button>
        </form>
        <button className={'toolbar-button '+(favorite?'bookmarked':'')} onClick={toggleBookmark} aria-label={favorite?'Remove bookmark':'Add bookmark'}><Icon name="bookmark" size={17}/></button>
        {url&&<a className="toolbar-button" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab"><Icon name="external" size={16}/></a>}
      </div>
      <div className="bookmark-strip">
        <span className="micro">SAVED</span>
        {bookmarks.map(b=><button key={b.url} onClick={()=>navigate(b.url)}>✧ {b.name}</button>)}
      </div>
      <div className="browser-viewport">
        {!url?<div className="browser-start">
          <div className="browser-emblem"><img alt="" src="/assets/celestial-star.svg"/></div>
          <span className="micro">WELCOME TO CELESTIAL BROWSER</span>
          <h2>The internet,<br/><em>beautifully framed.</em></h2>
          <p>Search the web or open a destination to start exploring.</p>
          <form onSubmit={e=>{e.preventDefault();navigate(address);}} className="start-search">
            <Icon name="browser" size={20}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Search for anything..." aria-label="Search the web"/><button className="primary-btn" type="submit">Explore <Icon name="arrow" size={15}/></button>
          </form>
          <div className="quick-sites">{sites.map(b=><button key={b.url} onClick={()=>navigate(b.url)}><span>✦</span><strong>{b.name}</strong><small>Open ↗</small></button>)}</div>
        </div>:<iframe ref={frame} key={active+':'+url} title={'Website: '+url} src={url} referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />}
      </div>
      <div className="browser-footer">
        <span>{url?'Viewing '+new URL(url).hostname:'READY TO EXPLORE'} · {tabs.length} TAB{tabs.length===1?'':'S'}</span>
        {url?<span>Some websites block embedding. <a href={url} target="_blank" rel="noopener noreferrer">Open directly ↗</a></span>:<span>POWERED BY CELESTIAL</span>}
      </div>
    </section>
  </div>;
}
