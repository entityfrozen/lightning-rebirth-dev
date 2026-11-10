
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
import './navigation.css';
import './flare-shell.css';
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
  {id:'home',label:'Home',icon:Home24Filled,detail:'Your starting point'},
  {id:'browser',label:'Browser',icon:Globe24Filled,detail:'Tabs and web search'},
  {id:'apps',label:'Apps',icon:Grid24Filled,detail:'Games and tools'},
  {id:'chat',label:'Chat',icon:Chat24Filled,detail:'Messages and members'},
  {id:'cloud',label:'AI',icon:Cloud24Filled,detail:'Ask a question'}
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
  const [dockOpen,setDockOpen]=useState(()=>readLocal('navigation-expanded',true)!==false);
  const [jumpOpen,setJumpOpen]=useState(false);
  const [jumpQuery,setJumpQuery]=useState('');
  const [showHomeAI,setShowHomeAI]=useState(()=>readLocal('home-ai-sidebar-flare',false)===true);
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
  useEffect(()=>saveLocal('navigation-expanded',dockOpen),[dockOpen]);
  useEffect(()=>{
    saveLocal('home-ai-sidebar',showHomeAI);
    saveLocal('home-ai-sidebar-flare',showHomeAI);
  },[showHomeAI]);
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

  useEffect(()=>{
    const shortcut=event=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        setJumpQuery('');
        setJumpOpen(value=>!value);
      }else if(event.key==='Escape'){
        setJumpOpen(false);
      }
    };
    window.addEventListener('keydown',shortcut);
    return()=>window.removeEventListener('keydown',shortcut);
  },[]);

  function selectSection(section) {
    setJumpOpen(false);
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
    <div className={'celestial-workspace '+(dockOpen?'nav-wide':'nav-compact')}>
      <main className="celestial-stage" id="main-content">
        <div className={'celestial-activity-layout '+(showCompanion?'with-chat':'')}>
          <div className="celestial-activity-main">
            <Suspense fallback={<div className="celestial-loading">Opening Celestial…</div>}>
              {['home','browser'].includes(view)?<div className={'celestial-home-split '+(
                view==='browser'||!showHomeAI||showCompanion?'ai-hidden':'')}>
                <section className="celestial-home-main" aria-label="Main page">
                  <Browser user={user} onAuth={setModal} onShortcut={openDock}
                    homeMode={view==='home'} onOpenBrowser={()=>selectSection('browser')}
                    onCloseBrowser={()=>selectSection('home')}
                    launch={activeDock==='music'?browserLaunch:null}/>
                  {view==='home'&&!showHomeAI&&!showCompanion&&
                    <button type="button" className="celestial-show-home-ai"
                      aria-label="Show Celestial AI sidebar" title="Open AI beside Home"
                      onClick={()=>setShowHomeAI(true)}>✧ Open AI panel</button>}
                </section>
                {view==='home'&&showHomeAI&&!showCompanion&&
                  <aside className="celestial-home-rail" aria-label="Celestial AI sidebar">
                    <AI key="celestial-home-sidebar" sidebar user={user} onAuth={setModal}
                      onHide={()=>setShowHomeAI(false)}/>
                  </aside>}
              </div>:
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
      <div className={'dock-shell '+(!dockOpen?'closed':'')}>
        <nav className="dock" aria-label="Main navigation">
          <div className="dock-brand" aria-label="Celestial">
            <span className="dock-brand-icon" aria-hidden="true">✦</span>
            <span className="dock-brand-name">celestial</span>
          </div>
          <button type="button" className="dock-command" title="Quick switch (Ctrl+K)"
            aria-label="Quick switch (Ctrl+K)" onClick={()=>{setJumpQuery('');setJumpOpen(true);}}>
            <span className="dock-command-icon" aria-hidden="true">⌕</span>
            <span className="dock-command-label">Jump to...</span>
            <kbd>⌘K</kbd>
          </button>
          <span className="dock-section-label">WORKSPACE</span>
          <div className="dock-group main-links">
            {dockItems.map(item=>{
              const FilledIcon=item.icon;
              const target=item.id==='cloud'?'ai':item.id;
              const selected=view===target;
              return <button key={item.id} type="button" aria-label={item.label}
                title={item.label} className={'dock-link '+(selected?'active':'')}
                aria-current={selected?'page':undefined}
                onClick={()=>openDock(item.id)}>
                <FilledIcon/><span className="dock-link-label">{item.label}</span>
                {item.id==='chat'&&live.connected&&live.online.length>0&&
                  <span className="dock-count" aria-label={live.online.length+' online'}>{live.online.length}</span>}
              </button>;
            })}
          </div>
          <div className="dock-spacer"/>
          <div className="dock-group dock-bottom">
            <button type="button" className={'dock-link '+(view==='settings'?'active':'')}
              title="Settings" aria-label="Settings" aria-current={view==='settings'?'page':undefined}
              onClick={()=>selectSection('settings')}>
              <Settings24Filled/><span className="dock-link-label">Settings</span>
            </button>
            <div className="dock-presence" role="status">
              <i className={live.connected?'is-online':''} aria-hidden="true"/>
              <span className="dock-presence-label">{live.connected?live.online.length+' online':'Connecting…'}</span>
            </div>
            <button type="button" className="dock-profile" title="Account"
              aria-label={'Account: '+user.username} onClick={()=>setModal('profile')}>
              <span className="dock-avatar" aria-hidden="true">{actor[0]?.toUpperCase()}</span>
              <span className="dock-profile-name">{user.username}</span>
            </button>
          </div>
        </nav>
        <button className="dock-toggle" type="button"
          title={dockOpen?'Compact navigation':'Expand navigation'}
          aria-label={dockOpen?'Compact navigation':'Expand navigation'}
          aria-expanded={dockOpen} onClick={()=>setDockOpen(value=>!value)}>
          <ChevronLeft24Filled/><span>{dockOpen?'Compact':'Expand'}</span>
        </button>
      </div>
      <div className="celestial-corner-actions">
        <button type="button" aria-label={'Account: '+user.username} onClick={()=>setModal('profile')}>
          <Person20Filled/> {user.username}
        </button>
      </div>
    </div>
    {jumpOpen&&<div className="nav-switcher-overlay" onMouseDown={event=>{
      if(event.target===event.currentTarget)setJumpOpen(false);
    }}>
      <div className="nav-switcher" role="dialog" aria-modal="true" aria-label="Switch to a page">
        <div className="nav-switcher-search">
          <span aria-hidden="true">⌕</span>
          <input autoFocus value={jumpQuery} onChange={event=>setJumpQuery(event.target.value)}
            placeholder="Where do you want to go?" aria-label="Find a page"
            onKeyDown={event=>{
              if(event.key!=='Enter')return;
              const match=[...dockItems,{id:'settings',label:'Settings',detail:'Preferences and account'}]
                .find(item=>(item.label+' '+item.detail).toLowerCase().includes(jumpQuery.trim().toLowerCase()));
              if(match){event.preventDefault();openDock(match.id);setJumpOpen(false);}
            }}/>
          <kbd>ESC</kbd>
        </div>
        <div className="nav-switcher-results">
          {[...dockItems,{id:'settings',label:'Settings',detail:'Preferences and account',icon:Settings24Filled}]
            .filter(item=>(item.label+' '+item.detail).toLowerCase().includes(jumpQuery.trim().toLowerCase()))
            .map(item=>{
              const Symbol=item.icon;
              return <button type="button" key={item.id} onClick={()=>{openDock(item.id);setJumpOpen(false);}}>
                <Symbol/><span><strong>{item.label}</strong><small>{item.detail}</small></span>
                <span className="nav-switcher-arrow" aria-hidden="true">↗</span>
              </button>;
            })}
          {![...dockItems,{id:'settings',label:'Settings',detail:'Preferences and account'}]
            .some(item=>(item.label+' '+item.detail).toLowerCase().includes(jumpQuery.trim().toLowerCase()))&&
            <p className="nav-switcher-empty">No matching page. Try Home, Apps, Browser, Chat, AI, or Settings.</p>}
        </div>
        <div className="nav-switcher-hint">Select a page to jump there. Press Esc to close.</div>
      </div>
    </div>}
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
