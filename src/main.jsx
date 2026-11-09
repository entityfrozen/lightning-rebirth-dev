import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';
import './styles.css';
import { Arcade } from './Arcade.jsx';
import { Browser } from './Browser.jsx';
import { Chat } from './Chat.jsx';
import { AI } from './AI.jsx';
import { api, navigation, readLocal, saveLocal } from './constants.js';
import { Icon } from './icons.jsx';
import { SceneBoundary } from './SceneBoundary.jsx';

const allowed=new Set(['arcade','browser','chat','ai']);
const fromHash=()=>{
  const route=location.hash.replace(/^#/,'').split('/')[0];
  if(route==='community')return 'chat';
  if(route==='home')return 'arcade';
  return allowed.has(route)?route:'arcade';
};
function StarDrift({reduced}){
  const ref=useRef();
  useFrame((_,dt)=>{if(ref.current&&!reduced)ref.current.rotation.y+=dt*.0027;});
  return <group ref={ref}>
    <Stars radius={75} depth={48} count={800} factor={2.6} saturation={0} fade speed={reduced?0:.2}/>
    <mesh position={[4,1,-14]} scale={[8,8,1]}>
      <planeGeometry args={[1,1]}/>
      <meshBasicMaterial color="#4d3a83" transparent opacity={.09} depthWrite={false}/>
    </mesh>
  </group>;
}
function Atmosphere({reduced}){
  return <div className="atmosphere" aria-hidden="true">
    <Canvas dpr={[.65,1.2]} gl={{alpha:true,antialias:false,powerPreference:'low-power'}}
      camera={{fov:65,position:[0,0,5]}} frameloop={reduced?'demand':'always'} fallback={null}>
      <StarDrift reduced={reduced}/>
    </Canvas>
  </div>;
}
function AuthSheet({mode,close,onLoggedIn}){
  const [method,setMethod]=useState(mode);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event){
    event.preventDefault();
    const body=Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);setError('');
    try{
      const result=await api(method==='register'?'/api/register':'/api/login',{
        method:'POST',body:JSON.stringify({username:body.username,password:body.password})
      });
      onLoggedIn(result.user);close();
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
    <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-label="Celestial account">
      <div className="auth-art"><img src="/assets/celestial-star.svg" alt=""/>
        <span className="micro">THE CELESTIAL NETWORK</span>
        <h2>Your place<br/><em>among the stars.</em></h2>
        <p>Play. Explore. Create connections. All from one extraordinary space.</p>
        <div className="auth-halo">✧</div>
      </div>
      <div className="auth-fields">
        <button className="auth-close" onClick={close} aria-label="Close account dialog">×</button>
        <span className="eyebrow">CELESTIAL / ACCOUNT</span>
        <h2>{method==='register'?'Join the network.':'Welcome back.'}</h2>
        <p>{method==='register'?'Create an account to participate in Chat and AI.':'Sign in to continue your conversation.'}</p>
        <form onSubmit={submit}>
          <label>USERNAME<input autoFocus required name="username" autoComplete="username" pattern="[A-Za-z0-9_]{3,20}" minLength={3} maxLength={20} placeholder="Choose a username"/></label>
          <label>PASSWORD<input required name="password" type="password" minLength={8} maxLength={128} autoComplete={method==='register'?'new-password':'current-password'} placeholder="At least 8 characters"/></label>
          {error&&<div className="form-error" role="alert">{error}</div>}
          <button className="primary-btn full" disabled={busy}>{busy?'Connecting…':method==='register'?'Create account':'Sign in'} <Icon name="arrow" size={16}/></button>
        </form>
        <button className="auth-swap" onClick={()=>{setMethod(method==='register'?'login':'register');setError('');}}>
          {method==='register'?'Already have an account? Sign in':'New to Celestial? Create an account'}
        </button>
        <button className="auth-guest" onClick={close}>Continue exploring as guest ↗</button>
      </div>
    </section>
  </div>;
}
function App(){
  const [view,setView]=useState(fromHash);
  const [theme,setTheme]=useState(()=>readLocal('theme','dark'));
  const [reduced,setReduced]=useState(()=>readLocal('reduce-motion',false));
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [signal,setSignal]=useState(0);
  const [toast,setToast]=useState('');
  const name=navigation.find(i=>i.id===view);
  const model=useRef(null);
  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    saveLocal('theme',theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#eff4fb':'#070a12');
  },[theme]);
  useEffect(()=>{saveLocal('reduce-motion',reduced);},[reduced]);
  useEffect(()=>{
    let live=true;
    api('/api/me').then(data=>{if(live)setUser(data.user);}).catch(()=>{}).finally(()=>{if(live)setLoading(false);});
    const change=()=>setView(fromHash());
    window.addEventListener('hashchange',change);
    return()=>{live=false;window.removeEventListener('hashchange',change);};
  },[]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(''),3000);
    return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    if(!modal)return;
    const escape=e=>{if(e.key==='Escape')setModal(null);};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[modal]);
  const navigate=id=>{
    if(!allowed.has(id))return;
    location.hash=id;
    setView(id);
    setSignal(n=>n+1);
  };
  const logout=async()=>{
    try{await api('/api/logout',{method:'POST',body:'{}'});setUser(null);setToast('You have signed out.');}
    catch(err){setToast(err.message);}
  };
  const actor=user?.username||'Guest';
  const effectiveReduced=reduced||(typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return <>
    <SceneBoundary><Atmosphere reduced={effectiveReduced}/></SceneBoundary>
    <div className="workspace-shell">
      <aside className="launcher glass">
        <button className="brand-mark" onClick={()=>navigate('arcade')} aria-label="Celestial Arcade"><img src="/assets/celestial-star.svg" alt=""/></button>
        <div className="launcher-rule"/>
        <nav className="launcher-nav" aria-label="Main navigation">
          {navigation.map(item=><button key={item.id} className={'launcher-link '+(view===item.id?'active':'')} onClick={()=>navigate(item.id)} aria-current={view===item.id?'page':undefined}>
            <Icon name={item.id} size={23}/><span>{item.label}</span>
          </button>)}
        </nav>
        <div className="launcher-bottom"><span className="launcher-constellation">✧</span><span className="launcher-orbit">✦</span><span className="micro vertical">CELESTIAL SYSTEM</span></div>
      </aside>
      <div className="main-shell glass">
        <header className="app-topbar">
          <div className="top-identity"><span className="top-identity-icon"><Icon name={view} size={19}/></span><span><small>CELESTIAL / {name.detail}</small><strong>{name.label}</strong></span></div>
          <div className="topbar-actions">
            <span className="online-pill"><i/> SYSTEM ONLINE</span>
            <button className="icon-button" title={theme==='dark'?'Switch to light':'Switch to dark'} aria-label="Toggle light mode" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}><Icon name={theme==='dark'?'sun':'moon'} size={17}/></button>
            <button className="icon-button" title={reduced?'Enable motion':'Reduce motion'} aria-label="Toggle motion" aria-pressed={reduced} onClick={()=>setReduced(v=>!v)}>◉</button>
            <button className="profile-menu" onClick={()=>user?setModal('profile'):setModal('login')}><span className="avatar">{actor[0]?.toUpperCase()}</span><span>{actor}</span></button>
          </div>
        </header>
        <main className="content-shell" id="main-content">
          {view==='arcade'?<Arcade reduced={effectiveReduced}/>:view==='browser'?<Browser/>:view==='chat'?<Chat user={user} onAuth={setModal} signal={signal}/>:<AI user={user} onAuth={setModal}/>}
        </main>
        <footer className="app-status"><span><i/> {loading?'CONNECTING':'ALL SYSTEMS READY'}</span><span>CELESTIAL / 8.0 <b>•</b> {name.label.toUpperCase()}</span></footer>
      </div>
    </div>
    {modal==='login'||modal==='register'?<AuthSheet mode={modal} close={()=>setModal(null)} onLoggedIn={person=>{setUser(person);setToast('Welcome, '+person.username+'!');}}/>:null}
    {modal==='profile'&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}>
      <section className="profile-sheet glass" role="dialog" aria-modal="true" aria-label="Account">
        <button className="auth-close" onClick={()=>setModal(null)}>×</button><span className="micro">CELESTIAL ACCOUNT</span>
        <div className="profile-big-avatar">{actor[0]?.toUpperCase()}</div>
        <h2>{actor}</h2><p>Your chat messages and account are stored on the Celestial server.</p>
        <button className="secondary-btn full" onClick={()=>{setModal(null);logout();}}>Sign out ↗</button>
      </section>
    </div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
    <DialRoot productionEnabled={new URLSearchParams(location.search).has('tune')}/>
  </>;
}

createRoot(document.getElementById('app')).render(<App/>);
