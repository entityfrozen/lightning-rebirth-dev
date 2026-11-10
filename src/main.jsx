
import React, {Suspense, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Home24Filled, Grid24Filled, Globe24Filled,
  Cloud24Filled, MusicNote224Filled, Chat24Filled, Settings24Filled,
  ChevronLeft24Filled, Person20Filled, Sparkle20Filled
} from '@fluentui/react-icons';
import {DialRoot} from 'dialkit';
if(new URLSearchParams(location.search).has('tune'))import('dialkit/styles.css');
import './styles.css';
import './forest.css';
import './xylora.css';
import './home-split.css';
import './qol.css';
import './workspace.css';
import './messenger.css';
import './studio.css';
import {api, readLocal, saveLocal} from './constants.js';
import {Icon} from './icons.jsx';
import {useBoltLive} from './useBoltLive.js';
import {SceneBoundary} from './SceneBoundary.jsx';
import {AccountReview} from './AccountReview.jsx';
import {applyCloak} from './Cloak.js';

const Browser=React.lazy(()=>import('./Browser.jsx').then(mod=>({default:mod.Browser})));
const Apps=React.lazy(()=>import('./Apps.jsx').then(mod=>({default:mod.Apps})));
const Settings=React.lazy(()=>import('./Settings.jsx').then(mod=>({default:mod.Settings})));
const Chat=React.lazy(()=>import('./Chat.jsx').then(mod=>({default:mod.Chat})));
const AI=React.lazy(()=>import('./AI.jsx').then(mod=>({default:mod.AI})));
const ForestParticles=React.lazy(()=>import('./ForestParticles.jsx').then(mod=>({default:mod.ForestParticles})));
const WorkspaceChat=React.lazy(()=>import('./WorkspaceChat.jsx').then(mod=>({default:mod.WorkspaceChat})));

const sections=new Set(['home','browser','apps','chat','ai','settings']);
const dockItems=[
  {id:'home',label:'Home',icon:Home24Filled},
  {id:'apps',label:'Apps',icon:Grid24Filled},
  {id:'browser',label:'Browser',icon:Globe24Filled},
  {id:'cloud',label:'AI',icon:Cloud24Filled},
  {id:'music',label:'Music',icon:MusicNote224Filled},
  {id:'chat',label:'Chat',icon:Chat24Filled}
];
const routeFromHash=()=>{
  const route=location.hash.replace(/^#/,'').split('/')[0];
  return sections.has(route)?route:route==='community'?'chat':route==='arcade'?'apps':'home';
};

function AuthSheet({mode,close,onLoggedIn,locked=false}){
  const [method,setMethod]=useState(mode);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [requested,setRequested]=useState(false);
  async function submit(event){
    event.preventDefault();
    const body=Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);setError('');
    try{
      const result=await api(method==='register'?'/api/register':'/api/login',{
        method:'POST',body:JSON.stringify({username:body.username,password:body.password})
      });
      if(method==='register'&&result.status==='pending'){
        setRequested(true);
        return;
      }
      if(!result.user)throw Error('Unable to sign in right now');
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
        <h2>{requested?'Request received.':method==='register'?'Join the network.':'Welcome back.'}</h2>
        <p>{requested?'An administrator will review your account. You can sign in once they approve it.':
          method==='register'?'Request an account. Approval is required before you can sign in.':'Sign in to continue your conversation.'}</p>
        {requested?<button className="primary-btn full" onClick={()=>{setRequested(false);setMethod('login');setError('');}}>
          Return to sign in <Icon name="arrow" size={16}/>
        </button>:<><form onSubmit={submit}>
          <label>USERNAME<input autoFocus required name="username" autoComplete="username"
            pattern={method==='register'?'[A-Za-z0-9_]{3,20}':undefined}
            minLength={3} maxLength={method==='register'?20:32}
            placeholder={method==='register'?'Choose a username':'Username'}/></label>
          <label>PASSWORD<input required name="password" type="password" minLength={8} maxLength={128} autoComplete={method==='register'?'new-password':'current-password'} placeholder="At least 8 characters"/></label>
          {error&&<div className="form-error" role="alert">{error}</div>}
          <button className="primary-btn full" disabled={busy}>{busy?'Connecting…':method==='register'?'Request account':'Sign in'} <Icon name="arrow" size={16}/></button>
        </form>
        <button className="auth-swap" onClick={()=>{setMethod(method==='register'?'login':'register');setError('');}}>
          {method==='register'?'Already have an account? Sign in':'New to Celestial? Create an account'}
        </button></>}

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
function App() {
  const [view,setView]=useState(routeFromHash);
  const [activeDock,setActiveDock]=useState(()=>{
    const initial=routeFromHash();
    return initial==='home'?'home':initial==='ai'?'cloud':initial==='chat'?'chat':initial==='apps'?'apps':initial==='settings'?'settings':'browser';
  });
  const [dockOpen,setDockOpen]=useState(()=>readLocal('dock-open',true));
  const [showHomeAI,setShowHomeAI]=useState(()=>readLocal('home-ai-sidebar',true)!==false);
  const [chatOpen,setChatOpen]=useState(()=>readLocal('workspace-chat-open',false)===true);
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
  const showCompanion=chatOpen&&['home','browser','apps'].includes(view);

  useEffect(()=>{
    document.documentElement.dataset.palette=palette;
    document.documentElement.dataset.backdrop=backdrop;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette==='amethyst'?'#151026':'#06141b');
    saveLocal('celestial-palette',palette);
    saveLocal('celestial-backdrop',backdrop);
  },[palette,backdrop]);
  useEffect(()=>{
    saveLocal('reduce-motion',reduced);
    document.documentElement.dataset.motion=reduced?'reduced':'full';
  },[reduced]);
  useEffect(()=>saveLocal('dock-open',dockOpen),[dockOpen]);
  useEffect(()=>saveLocal('home-ai-sidebar',showHomeAI),[showHomeAI]);
  useEffect(()=>saveLocal('workspace-chat-open',chatOpen),[chatOpen]);
  useEffect(()=>{applyCloak();},[]);
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
      setActiveDock(next==='home'?'home':next==='ai'?'cloud':next==='chat'?'chat':next==='apps'?'apps':next==='settings'?'settings':'browser');
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
    setActiveDock(section==='home'?'home':section==='ai'?'cloud':section==='chat'?'chat':section==='apps'?'apps':section==='settings'?'settings':'browser');
    if(location.hash!=='#'+section){internalHashChange.current=true;location.hash=section;}
  }
  function openDock(id) {
    if(id==='settings'||id==='apps'){selectSection(id);return;}
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
    selectSection(id==='cloud'?'ai':id);
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
    <SceneBoundary><Suspense fallback={null}><ForestParticles reduced={effectiveReduced||['browser','chat','apps'].includes(view)}/></Suspense></SceneBoundary>
    <div className="celestial-workspace">
      <main className="celestial-stage" id="main-content">
        <div className={'celestial-activity-layout '+(showCompanion?'with-chat':'')}>
          <div className="celestial-activity-main">
            <Suspense fallback={<div className="celestial-loading">Opening Celestial…</div>}>
              {view==='home'?<div className={'celestial-home-split '+(!showHomeAI||showCompanion?'ai-hidden':'')}>
                <section className="celestial-home-main" aria-label="Main page">
                  <Browser user={user} onAuth={setModal} onShortcut={openDock} homeMode/>
                  {!showHomeAI&&!showCompanion&&<button type="button" className="celestial-show-home-ai"
                    aria-label="Show Celestial AI sidebar" title="Restore Celestial AI"
                    onClick={()=>setShowHomeAI(true)}><span aria-hidden="true">✧</span> Show Celestial AI</button>}
                </section>
                {showHomeAI&&!showCompanion&&<aside className="celestial-home-rail" aria-label="Celestial AI sidebar">
                  <AI key="celestial-home-sidebar" sidebar user={user} onAuth={setModal}
                    onHide={()=>setShowHomeAI(false)}/>
                </aside>}
              </div>:
              view==='browser'?<Browser user={user} onAuth={setModal} onShortcut={openDock}
                launch={activeDock==='music'?browserLaunch:null}/>:
              view==='apps'?<Apps user={user} live={live} onAuth={setModal}
                onNavigate={selectSection} onMusic={()=>openDock('music')}/>:
              view==='settings'?<Settings user={user} palette={palette} setPalette={setPalette}
                backdrop={backdrop} setBackdrop={setBackdrop} reduced={reduced} setReduced={setReduced}
                showHomeAI={showHomeAI} setShowHomeAI={setShowHomeAI}
                onBack={()=>selectSection('home')} onLogout={logout}/>:
              view==='chat'?<Chat user={user} onAuth={setModal} live={live}/>:
              <AI key="celestial-ai" user={user} onAuth={setModal}/>}
            </Suspense>
            {['home','browser','apps'].includes(view)&&<button type="button"
              className={'celestial-chat-toggle '+(showCompanion?'is-open':'')+
                (view==='home'&&showHomeAI&&!showCompanion?' beside-ai':'')}
              aria-label={showCompanion?'Hide community Chat panel':'Open community Chat beside this page'}
              aria-expanded={showCompanion}
              onClick={()=>setChatOpen(value=>!value)}>
              <Chat24Filled/>
              <span>{showCompanion?'Hide Chat':'Chat while you '+(view==='apps'?'play':'browse')}</span>
              <i aria-hidden="true">{live.online.length}</i>
            </button>}
          </div>
          {showCompanion&&<aside className="celestial-activity-chat" aria-label="Community Chat panel">
            <Suspense fallback={<div className="celestial-chat-loading">Connecting to chat…</div>}>
              <WorkspaceChat user={user} live={live} onClose={()=>setChatOpen(false)}
                onOpenChat={()=>selectSection('chat')}/>
            </Suspense>
          </aside>}
        </div>
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
                className={'dock-link '+(activeDock===item.id?'active':'')}
                aria-current={activeDock===item.id?'page':undefined}
                onClick={()=>openDock(item.id)}><FilledIcon/></button>;
            })}
          </div>
          <div className="dock-group dock-bottom">
            <button type="button" className={'dock-link '+(view==='settings'?'active':'')}
              title="Settings" aria-label="Settings" onClick={()=>selectSection('settings')}><Settings24Filled/></button>
          </div>
        </aside>
        <button className="dock-toggle" type="button" title={dockOpen?'Hide sidebar':'Show sidebar'}
          aria-label={dockOpen?'Hide sidebar':'Show sidebar'}
          aria-expanded={dockOpen} onClick={()=>setDockOpen(state=>!state)}>
          <ChevronLeft24Filled/>
        </button>
      </div>
      <div className="celestial-corner-actions">
        <button type="button" onClick={()=>setModal('profile')}>
          <Person20Filled/> {user.username}
        </button>
      </div>
    </div>
    {(modal==='login'||modal==='register')&&<AuthSheet mode={modal} close={()=>setModal(null)}
      onLoggedIn={person=>{setUser(person);setToast('Welcome, '+person.username);}}/>}
    {modal==='profile'&&<Modal title="Account" close={()=>setModal(null)}>
      <div className="celestial-account"><span className="celestial-big-avatar">{actor[0]?.toUpperCase()}</span>
        <h2>{actor}</h2><p>Signed in to Celestial.</p>
        <button className="celestial-sheet-action" onClick={()=>{setModal(null);logout();}}>Sign out</button>
      </div>
      {['admin','account_manager'].includes(user.role)&&<button className="celestial-sheet-action"
        onClick={()=>{saveLocal('celestial-settings-start-panel','administration');selectSection('settings');}}>
        Open administration ↗
      </button>}
    </Modal>}
    {toast&&<div className="celestial-toast" role="status"><Sparkle20Filled/> {toast}</div>}
    <DialRoot productionEnabled={new URLSearchParams(location.search).has('tune')}/>
  </>;
}
createRoot(document.getElementById('app')).render(<App/>);
