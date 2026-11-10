
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
import './refinement.css';
import './auth.css';
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
  const [method,setMethod]=useState(mode==='register'?'register':'login');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [requested,setRequested]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const registering=method==='register';

  useEffect(()=>{
    setMethod(mode==='register'?'register':'login');
    setError('');
    setRequested(false);
  },[mode]);

  function switchMethod(next){
    if(busy)return;
    setMethod(next);
    setError('');
    setRequested(false);
    setShowPassword(false);
    setShowConfirm(false);
  }

  async function submit(event){
    event.preventDefault();
    if(busy)return;
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    if(registering&&fields.password!==fields.confirmPassword){
      setError('Those passwords don\'t match. Try again.');
      return;
    }
    setBusy(true);
    setError('');
    try{
      const result=await api(registering?'/api/register':'/api/login',{
        method:'POST',body:JSON.stringify({username:fields.username,password:fields.password})
      });
      if(registering&&result.status==='pending'){
        setRequested(true);
        return;
      }
      if(!result.user)throw Error('Could not sign in. Please try again.');
      onLoggedIn(result.user);
      close();
    }catch(err){
      setError(err.message||'Something went wrong. Please try again.');
    }finally{
      setBusy(false);
    }
  }

  return <div className={'overlay celestial-auth '+(locked?'auth-locked':'')} onMouseDown={event=>{
    if(!locked&&event.target===event.currentTarget)close();
  }}>
    <section className="auth-sheet auth-sheet--v2 glass" role="dialog" aria-modal="true"
      aria-label={registering?'Create an account':'Sign in'}>
      <div className="auth-fields">
        {!locked&&<button type="button" className="auth-close" onClick={close} aria-label="Close account dialog">×</button>}
        <div className="auth-form-content">
          {requested?<div className="auth-requested" role="status">
            <div className="auth-success-mark" aria-hidden="true">✓</div>
            <h1>You're on the list.</h1>
            <p>Your account request is in. An admin needs to approve it before you can sign in.</p>
            <button type="button" className="auth-submit" onClick={()=>switchMethod('login')}>
              Back to sign in <Icon name="arrow" size={16}/>
            </button>
          </div>:<>
            <div className="auth-form-intro">
              <h1>{registering?'Create an account':'Sign in'}</h1>
              <p>{registering?'Choose a username and password. An admin will approve your request.':'Enter your username and password.'}</p>
            </div>
            <div className="auth-mode-switch" role="group" aria-label="Account action">
              <button type="button" className={!registering?'is-active':''}
                aria-pressed={!registering} disabled={busy} onClick={()=>switchMethod('login')}>Sign in</button>
              <button type="button" className={registering?'is-active':''}
                aria-pressed={registering} disabled={busy} onClick={()=>switchMethod('register')}>Create account</button>
            </div>
            <form key={method} className="auth-form" onSubmit={submit}>
              <label className="auth-field" htmlFor="auth-username">Username
                <input id="auth-username" required name="username" autoComplete="username"
                  pattern={registering?'[A-Za-z0-9_]{3,20}':undefined}
                  minLength={3} maxLength={registering?20:32}
                  placeholder={registering?'Choose a username':'Enter your username'}/>
              </label>
              <div className="auth-field"><label htmlFor="auth-password">Password</label>
                <span className="auth-password-wrap">
                  <input id="auth-password" required name="password"
                    type={showPassword?'text':'password'} minLength={8} maxLength={128}
                    autoComplete={registering?'new-password':'current-password'}
                    placeholder={registering?'At least 8 characters':'Enter your password'}/>
                  <button type="button" className="auth-reveal" disabled={busy}
                    aria-label={showPassword?'Hide password':'Show password'}
                    onClick={()=>setShowPassword(value=>!value)}>{showPassword?'Hide':'Show'}</button>
                </span>
              </div>
              {registering&&<div className="auth-field"><label htmlFor="auth-confirm">Confirm password</label>
                <span className="auth-password-wrap">
                  <input id="auth-confirm" required name="confirmPassword"
                    type={showConfirm?'text':'password'} minLength={8} maxLength={128}
                    autoComplete="new-password" placeholder="Enter it one more time"/>
                  <button type="button" className="auth-reveal" disabled={busy}
                    aria-label={showConfirm?'Hide confirmation password':'Show confirmation password'}
                    onClick={()=>setShowConfirm(value=>!value)}>{showConfirm?'Hide':'Show'}</button>
                </span>
              </div>}
              {error&&<div className="form-error" role="alert">{error}</div>}
              <button className="auth-submit" type="submit" disabled={busy}>
                <span>{busy?'One moment…':registering?'Request account':'Sign in'}</span>
                <span className="auth-submit-arrow"><Icon name="arrow" size={17}/></span>
              </button>
            </form>
            {registering?
              <p className="auth-form-note"><span aria-hidden="true">✳</span> New accounts are approved by an admin.</p>:
              <p className="auth-form-note">Don't have an account? <button type="button"
                onClick={()=>switchMethod('register')}>Create one</button></p>}
          </>}
        </div>
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
    <SceneBoundary><Suspense fallback={null}><ForestParticles reduced={effectiveReduced||['browser','chat','apps','settings'].includes(view)}/></Suspense></SceneBoundary>
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
