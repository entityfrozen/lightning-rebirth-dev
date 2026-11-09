
import React, {Suspense, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Home24Filled, Games24Filled, Grid24Filled, Globe24Filled,
  Cloud24Filled, MusicNote224Filled, Chat24Filled, Settings24Filled,
  ChevronLeft24Filled, Heart20Filled, PeopleCommunity20Filled,
  Person20Filled, CheckmarkCircle20Filled, Sparkle20Filled
} from '@fluentui/react-icons';
import {DialRoot} from 'dialkit';
import 'dialkit/styles.css';
import './styles.css';
import './forest.css';
import './xylora.css';
import {api, readLocal, saveLocal} from './constants.js';
import {Icon} from './icons.jsx';
import {useBoltLive} from './useBoltLive.js';
import {SceneBoundary} from './SceneBoundary.jsx';

const Browser=React.lazy(()=>import('./Browser.jsx').then(mod=>({default:mod.Browser})));
const Arcade=React.lazy(()=>import('./Arcade.jsx').then(mod=>({default:mod.Arcade})));
const Chat=React.lazy(()=>import('./Chat.jsx').then(mod=>({default:mod.Chat})));
const AI=React.lazy(()=>import('./AI.jsx').then(mod=>({default:mod.AI})));
const ForestParticles=React.lazy(()=>import('./ForestParticles.jsx').then(mod=>({default:mod.ForestParticles})));

const sections=new Set(['home','browser','arcade','chat','ai']);
const dockItems=[
  {id:'home',label:'Home',icon:Home24Filled},
  {id:'study',label:'Games',icon:Games24Filled},
  {id:'apps',label:'Apps',icon:Grid24Filled},
  {id:'browser',label:'Browser',icon:Globe24Filled},
  {id:'cloud',label:'AI',icon:Cloud24Filled},
  {id:'music',label:'Music',icon:MusicNote224Filled},
  {id:'chat',label:'Chat',icon:Chat24Filled}
];
const appItems=[
  {id:'browser',label:'Browser',description:'Search, tabs and bookmarks',icon:Globe24Filled},
  {id:'arcade',label:'Games',description:'Chess, WorldPvP and more',icon:Games24Filled},
  {id:'chat',label:'Chat',description:'Channels, servers and messages',icon:Chat24Filled},
  {id:'ai',label:'Celestial AI',description:'Write, learn and create',icon:Cloud24Filled}
];
const routeFromHash=()=>{
  const route=location.hash.replace(/^#/,'').split('/')[0];
  return sections.has(route)?route:route==='community'?'chat':'home';
};

function AuthSheet({mode,close,onLoggedIn,locked=false}){
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
  return <div className={'overlay '+(locked?'auth-locked':'')} onMouseDown={e=>{
    if(!locked&&e.target===e.currentTarget)close();
  }}>
    <section className="auth-sheet glass" role="dialog" aria-modal="true" aria-label="Celestial account">
      <div className="auth-art"><img src="/assets/celestial-star.svg" alt=""/>
        <span className="micro">THE CELESTIAL NETWORK</span>
        <h2>Your place<br/><em>among the stars.</em></h2>
        <p>Play. Explore. Create connections. All from one extraordinary space.</p>
        <div className="auth-halo">✧</div>
      </div>
      <div className="auth-fields">
        {!locked&&<button className="auth-close" onClick={close} aria-label="Close account dialog">×</button>}
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

      </div>
    </section>
  </div>;
}


function Modal({title,close,children}) {
  return <div className="celestial-modal-overlay" onMouseDown={event=>{
    if(event.target===event.currentTarget)close();
  }}>
    <section className="celestial-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="celestial-sheet-heading"><span>CELESTIAL / {title.toUpperCase()}</span>
        <button onClick={close} title="Close" aria-label="Close dialog">×</button></div>
      {children}
    </section>
  </div>;
}
function Appearance({palette,setPalette,backdrop,setBackdrop,reduced,setReduced,close}) {
  const colors=[
    {id:'aurora',name:'Aurora',sub:'Ice teal + violet'},
    {id:'jade',name:'Evergreen',sub:'Fresh mint + pine'},
    {id:'amethyst',name:'Amethyst',sub:'Lavender + midnight'}
  ];
  const scenes=[
    {id:'aurora',name:'Northern lights'},
    {id:'forest',name:'Deep forest'},
    {id:'minimal',name:'Midnight gradient'}
  ];
  return <Modal title="Settings" close={close}>
    <h2>Make it yours.</h2>
    <p>Same clean layout. Pick the atmosphere you like.</p>
    <div className="celestial-setting-group"><strong>COLOR THEME</strong>
      <div className="celestial-theme-list">{colors.map(theme=><button key={theme.id}
        className={'celestial-theme-tile '+(theme.id===palette?'selected':'')}
        aria-pressed={theme.id===palette} onClick={()=>setPalette(theme.id)}>
        <i className={'celestial-color-sample '+theme.id}/>
        <span><b>{theme.name}</b><small>{theme.sub}</small></span>
        {theme.id===palette&&<CheckmarkCircle20Filled/>}
      </button>)}</div>
    </div>
    <div className="celestial-setting-group"><strong>BACKGROUND</strong>
      <div className="celestial-scene-list">{scenes.map(scene=><button key={scene.id}
        className={'celestial-scene-option '+(scene.id===backdrop?'selected':'')}
        onClick={()=>setBackdrop(scene.id)} aria-pressed={scene.id===backdrop}>
        <span className={'celestial-scene-preview '+scene.id}/>
        <span>{scene.name}</span>
        {scene.id===backdrop&&<CheckmarkCircle20Filled/>}
      </button>)}</div>
    </div>
    <label className="celestial-motion-setting">
      <span><b>Reduce animation</b><small>Less movement in the background</small></span>
      <input type="checkbox" checked={reduced} onChange={event=>setReduced(event.target.checked)}/>
    </label>
  </Modal>;
}
function App() {
  const [view,setView]=useState(routeFromHash);
  const [activeDock,setActiveDock]=useState(()=>{
    const initial=routeFromHash();
    return initial==='home'?'home':initial==='arcade'?'study':initial==='ai'?'cloud':initial==='chat'?'chat':'browser';
  });
  const [dockOpen,setDockOpen]=useState(()=>readLocal('dock-open',true));
  const [palette,setPalette]=useState(()=>readLocal('celestial-palette','aurora'));
  const [backdrop,setBackdrop]=useState(()=>readLocal('celestial-backdrop','aurora'));
  const [reduced,setReduced]=useState(()=>readLocal('reduce-motion',false));
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState('');
  const [browserLaunch,setBrowserLaunch]=useState(null);
  const internalHashChange=useRef(false);
  const live=useBoltLive(user);
  const actor=user?.username||'Guest';
  const effectiveReduced=reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(()=>{
    document.documentElement.dataset.palette=palette;
    document.documentElement.dataset.backdrop=backdrop;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette==='amethyst'?'#151026':'#06141b');
    saveLocal('celestial-palette',palette);
    saveLocal('celestial-backdrop',backdrop);
  },[palette,backdrop]);
  useEffect(()=>saveLocal('reduce-motion',reduced),[reduced]);
  useEffect(()=>saveLocal('dock-open',dockOpen),[dockOpen]);
  useEffect(()=>{
    let mounted=true;
    api('/api/me').then(data=>{if(mounted)setUser(data.user);}).catch(()=>{}).finally(()=>{
      if(mounted)setLoading(false);
    });
    const sync=()=>{
      const next=routeFromHash();
      setView(next);
      if(internalHashChange.current){
        internalHashChange.current=false;
        return;
      }
      setActiveDock(next==='home'?'home':next==='arcade'?'study':next==='ai'?'cloud':next==='chat'?'chat':'browser');
    };
    window.addEventListener('hashchange',sync);
    return()=>{mounted=false;window.removeEventListener('hashchange',sync);};
  },[]);
  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(''),3200);
    return()=>clearTimeout(timer);
  },[toast]);
  useEffect(()=>{
    if(!modal)return;
    const escape=event=>{if(event.key==='Escape')setModal(null);};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[modal]);

  function selectSection(section) {
    setModal(null);
    setView(section);
    setActiveDock(section==='home'?'home':section==='arcade'?'study':section==='ai'?'cloud':section==='chat'?'chat':'browser');
    if(location.hash!=='#'+section){internalHashChange.current=true;location.hash=section;}
  }
  function openDock(id) {
    if(id==='settings'){setModal('settings');return;}
    if(id==='apps'){setModal('apps');return;}
    if(id==='home'){
      selectSection('home');
      return;
    }
    if(id==='music'){
      setBrowserLaunch({id:Date.now(),url:'https://music.youtube.com/'});
      setView('browser');setActiveDock('music');setModal(null);
      if(location.hash!=='#browser'){internalHashChange.current=true;location.hash='browser';}
      return;
    }
    selectSection(id==='study'?'arcade':id==='cloud'?'ai':id);
    setActiveDock(id);
  }
  async function logout() {
    try{
      await api('/api/logout',{method:'POST',body:'{}'});
      setUser(null);
      setToast('Signed out');
    }catch(error){setToast(error.message);}
  }

  if(loading) return <div className="celestial-entry">
    <div className="celestial-backdrop" aria-hidden="true"><div className="celestial-ambient"/></div>
    <div className="celestial-entry-loading">✧ Celestial</div>
  </div>;

  if(!user) return <div className="celestial-entry">
    <div className="celestial-backdrop" aria-hidden="true"><div className="celestial-ambient"/></div>
    <AuthSheet mode="login" locked close={()=>{}} onLoggedIn={person=>setUser(person)}/>
  </div>;

  return <>
    <div className="celestial-backdrop" aria-hidden="true"><div className="celestial-ambient"/></div>
    <SceneBoundary><Suspense fallback={null}><ForestParticles reduced={effectiveReduced}/></Suspense></SceneBoundary>
    <div className="celestial-workspace">
      <main className="celestial-stage" id="main-content">
        <Suspense fallback={<div className="celestial-loading">Opening Celestial…</div>}>
          {view==='home'?<div className="celestial-home-split">
            <section className="celestial-home-main" aria-label="Main page">
              <Browser user={user} onAuth={setModal} onShortcut={openDock} homeMode/>
            </section>
            <aside className="celestial-home-rail" aria-label="Celestial AI sidebar">
              <AI key="celestial-home-sidebar" sidebar user={user} onAuth={setModal}/>
            </aside>
          </div>:
          view==='browser'?<Browser user={user} onAuth={setModal} onShortcut={openDock}
            launch={activeDock==='music'?browserLaunch:null}/>:
          view==='arcade'?<Arcade user={user} onAuth={setModal} live={live}/>:
          view==='chat'?<Chat user={user} onAuth={setModal} live={live}/>:
          <AI key="celestial-ai" user={user} onAuth={setModal}/>}
        </Suspense>
      </main>
      <div className="celestial-online" title={loading?'Connecting':'Current live connections'}>
        online users: <strong>{live.connected?live.online.length:'—'}</strong>
      </div>
      <div className={'dock-shell '+(!dockOpen?'closed':'')}>
        <aside className="dock" aria-label="Celestial navigation" inert={!dockOpen}>
          <div className="dock-group main-links">
            {dockItems.map(item=>{
              const FilledIcon=item.icon;
              return <button key={item.id} type="button" aria-label={item.label} title={item.label}
                className={'dock-link '+((modal==='apps'?item.id==='apps':activeDock===item.id)?'active':'')}
                aria-current={(modal==='apps'?item.id==='apps':activeDock===item.id)?'page':undefined}
                onClick={()=>openDock(item.id)}><FilledIcon/></button>;
            })}
          </div>
          <div className="dock-group dock-bottom">
            <button type="button" className={'dock-link '+(modal==='settings'?'active':'')}
              title="Settings" aria-label="Settings" onClick={()=>openDock('settings')}><Settings24Filled/></button>
          </div>
        </aside>
        <button className="dock-toggle" type="button" title={dockOpen?'Hide sidebar':'Show sidebar'}
          aria-label={dockOpen?'Hide sidebar':'Show sidebar'}
          aria-expanded={dockOpen} onClick={()=>setDockOpen(state=>!state)}>
          <ChevronLeft24Filled/>
        </button>
      </div>
      <div className="celestial-corner-actions">
        <button type="button" onClick={()=>setModal('credits')}><Heart20Filled/> credits</button>
        <button type="button" onClick={()=>openDock('chat')}><PeopleCommunity20Filled/> community</button>
        <button type="button" onClick={()=>setModal(user?'profile':'login')}><Person20Filled/> {user?'profile':'sign in'}</button>
      </div>
    </div>
    {(modal==='login'||modal==='register')&&<AuthSheet mode={modal} close={()=>setModal(null)}
      onLoggedIn={person=>{setUser(person);setToast('Welcome, '+person.username);}}/>}
    {modal==='profile'&&<Modal title="Account" close={()=>setModal(null)}>
      <div className="celestial-account"><span className="celestial-big-avatar">{actor[0]?.toUpperCase()}</span>
        <h2>{actor}</h2><p>Signed in to Celestial.</p>
        <button className="celestial-sheet-action" onClick={()=>{setModal(null);logout();}}>Sign out</button>
      </div>
    </Modal>}
    {modal==='settings'&&<Appearance palette={palette} setPalette={setPalette} backdrop={backdrop}
      setBackdrop={setBackdrop} reduced={reduced} setReduced={setReduced} close={()=>setModal(null)}/>}
    {modal==='apps'&&<Modal title="Apps" close={()=>setModal(null)}>
      <h2>Where to?</h2><p>Your Celestial spaces, all one click away.</p>
      <div className="celestial-app-list">{appItems.map(item=>{
        const FilledIcon=item.icon;
        return <button key={item.id} onClick={()=>selectSection(item.id)}>
          <FilledIcon/><span><b>{item.label}</b><small>{item.description}</small></span><span className="celestial-app-arrow">↗</span>
        </button>;
      })}</div>
    </Modal>}
    {modal==='credits'&&<Modal title="Credits" close={()=>setModal(null)}>
      <h2>About Celestial.</h2>
      <p>Celestial brings your games, browser, chat and AI together with a compact dock,
        a custom color palette and an aurora backdrop.</p>
      <p>The northern-lights photograph is by Troy Olson, available under the Unsplash License.</p>
      <a className="celestial-credit-link" href="https://unsplash.com/photos/aurora-borealis-lights-up-the-night-sky-over-forest-9h8pkF_N0FE"
        rel="noopener noreferrer" target="_blank">View background photo ↗</a>
    </Modal>}
    {toast&&<div className="celestial-toast" role="status"><Sparkle20Filled/> {toast}</div>}
    <DialRoot productionEnabled={new URLSearchParams(location.search).has('tune')}/>
  </>;
}
createRoot(document.getElementById('app')).render(<App/>);
