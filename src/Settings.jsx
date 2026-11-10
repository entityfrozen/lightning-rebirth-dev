import React,{useEffect,useState} from 'react';
import {
  Color24Filled,Globe24Filled,Shield24Filled,Person24Filled,
  ArrowLeft20Filled,CheckmarkCircle20Filled,ArrowUpRight20Filled,
  ArrowDownload20Filled,ArrowUpload20Filled,People24Filled
} from '@fluentui/react-icons';
import {readLocal,saveLocal} from './constants.js';
import {browserPreferences,setBrowserPreferences,searchEngines} from './Preferences.js';
import {getCloakSettings,saveCloak,cloakPresets,openCloakedTab} from './Cloak.js';
import {AccountReview} from './AccountReview.jsx';

const palettes=[
  {id:'aurora',name:'Aurora',description:'Midnight blue and icy teal'},
  {id:'jade',name:'Evergreen',description:'Pine green with fresh mint'},
  {id:'amethyst',name:'Amethyst',description:'Soft violet on deep purple'}
];
const backdrops=[
  {id:'aurora',name:'Northern lights'},
  {id:'forest',name:'Deep forest'},
  {id:'minimal',name:'Midnight gradient'}
];
const panels=[
  {id:'appearance',label:'Appearance',description:'How Celestial looks',icon:Color24Filled},
  {id:'browser',label:'Browser',description:'Searching and tabs',icon:Globe24Filled},
  {id:'privacy',label:'Privacy & cloaking',description:'Tab identity and shortcuts',icon:Shield24Filled},
  {id:'account',label:'Account & data',description:'Your profile and saved preferences',icon:Person24Filled}
];

function Toggle({title,description,checked,onChange}){
  return <label className="celestial-pref-toggle">
    <span><strong>{title}</strong><small>{description}</small></span>
    <input type="checkbox" checked={Boolean(checked)} onChange={e=>onChange(e.target.checked)}/>
  </label>;
}
export function Settings({user,palette,setPalette,backdrop,setBackdrop,reduced,setReduced,showHomeAI,setShowHomeAI,onBack,onLogout}){
  const [panel,setPanel]=useState(()=>{
    const next=readLocal('celestial-settings-start-panel','appearance');
    return ['appearance','browser','privacy','account','administration'].includes(next)?next:'appearance';
  });
  const isAdmin=['admin','account_manager'].includes(user?.role);
  const visiblePanels=isAdmin?[...panels,{id:'administration',label:'Administration',description:'Review access requests',icon:People24Filled}]:panels;
  const [browser,setBrowser]=useState(browserPreferences);
  const [cloak,setCloak]=useState(getCloakSettings);
  const [notification,setNotification]=useState('');
  const [importing,setImporting]=useState(false);

  useEffect(()=>{
    const sync=event=>setBrowser(event.detail);
    window.addEventListener('celestial:browser-preferences',sync);
    return()=>window.removeEventListener('celestial:browser-preferences',sync);
  },[]);
  const preference=patch=>setBrowser(setBrowserPreferences(patch));
  const identity=patch=>setCloak(saveCloak(patch));
  const notify=message=>{setNotification(message);};
  const exportSettings=()=>{
    const safe={version:1,palette,backdrop,reduced,showHomeAI,browser:browserPreferences(),cloak:getCloakSettings()};
    const file=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file);
    const link=document.createElement('a');link.href=url;link.download='celestial-settings.json';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
    notify('Settings exported.');
  };
  const importSettings=async file=>{
    if(!file||file.size>25000){notify('Choose a small Celestial settings file.');return;}
    setImporting(true);
    try{
      const data=JSON.parse(await file.text());
      if(!data||data.version!==1)throw Error('Invalid settings file');
      if(palettes.some(x=>x.id===data.palette))setPalette(data.palette);
      if(backdrops.some(x=>x.id===data.backdrop))setBackdrop(data.backdrop);
      if(typeof data.reduced==='boolean')setReduced(data.reduced);
      if(typeof data.showHomeAI==='boolean')setShowHomeAI(data.showHomeAI);
      if(data.browser&&typeof data.browser==='object'){
        const prefs={};
        for(const key of ['restoreTabs','saveHistory','compactTabs','openLinksInTabs']){
          if(typeof data.browser[key]==='boolean')prefs[key]=data.browser[key];
        }
        if(Object.hasOwn(searchEngines,data.browser.searchEngine))prefs.searchEngine=data.browser.searchEngine;
        preference(prefs);
      }
      if(data.cloak&&Object.hasOwn(cloakPresets,data.cloak.preset)){
        identity({preset:data.cloak.preset,
          title:typeof data.cloak.title==='string'?data.cloak.title.slice(0,70):'',
          icon:typeof data.cloak.icon==='string'?data.cloak.icon.slice(0,500):''});
      }
      notify('Settings restored.');
    }catch{notify('This settings file could not be imported.');}
    finally{setImporting(false);}
  };

  return <section className="celestial-settings-page">
    <div className="celestial-settings-wrap">
      <button className="celestial-settings-back" onClick={onBack}><ArrowLeft20Filled/> Back home</button>
      <header className="celestial-settings-heading">
        <span>CELESTIAL / PREFERENCES</span>
        <h1>Make this place yours<span>.</span></h1>
        <p>Change what you see, how you browse, and how Celestial works for you.</p>
        <span className="celestial-settings-version">WORKSPACE SETTINGS <i/> SAVED ON THIS DEVICE</span>
      </header>
      <div className="celestial-settings-layout">
        <nav className="celestial-settings-nav" aria-label="Settings categories">
          {visiblePanels.map(item=>{
            const Glyph=item.icon;
            return <button key={item.id} className={panel===item.id?'active':''}
              aria-current={panel===item.id?'page':undefined} onClick={()=>{setPanel(item.id);saveLocal('celestial-settings-start-panel',item.id);setNotification('');}}>
              <Glyph/><span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>;
          })}
        </nav>
        <div className="celestial-settings-content">
          {panel==='appearance'&&<>
            <div className="celestial-settings-section-head"><span>01 / APPEARANCE</span><h2>The look and feel.</h2><p>A few details that make your workspace feel like your own.</p></div>
            <div className="celestial-settings-group"><h3>COLOR PALETTE</h3>
              <div className="celestial-settings-color-grid">
                {palettes.map(theme=><button key={theme.id} className={'celestial-settings-color '+(palette===theme.id?'selected':'')}
                  onClick={()=>setPalette(theme.id)} aria-pressed={palette===theme.id}>
                  <i className={'celestial-color-sample '+theme.id}/>
                  <strong>{theme.name}</strong><small>{theme.description}</small>
                  {palette===theme.id&&<CheckmarkCircle20Filled className="selected-check"/>}
                </button>)}
              </div>
            </div>
            <div className="celestial-settings-group"><h3>BACKGROUND</h3>
              <div className="celestial-settings-scene-grid">
                {backdrops.map(scene=><button key={scene.id} className={backdrop===scene.id?'selected':''}
                  aria-pressed={backdrop===scene.id} onClick={()=>setBackdrop(scene.id)}>
                  <span className={'celestial-scene-preview '+scene.id}/><strong>{scene.name}</strong>
                  {backdrop===scene.id&&<CheckmarkCircle20Filled/>}
                </button>)}
              </div>
            </div>
            <div className="celestial-settings-group"><h3>HOMEPAGE LAYOUT</h3>
              <Toggle title="Celestial AI sidebar"
                description="Show AI beside the main page. Turn it off for a full-width homepage."
                checked={showHomeAI} onChange={setShowHomeAI}/>
            </div>
            <div className="celestial-settings-group"><h3>ANIMATION</h3>
              <Toggle title="Reduce motion" description="Keep the background still and pause the moving particles."
                checked={reduced} onChange={setReduced}/>
            </div>
          </>}
          {panel==='browser'&&<>
            <div className="celestial-settings-section-head"><span>02 / BROWSER</span><h2>Every tab, your way.</h2>
              <p>Small controls that make a difference when you're switching between sites and conversations.</p></div>
            <div className="celestial-settings-group"><h3>SEARCH</h3>
              <label className="celestial-settings-select"><span><strong>Search engine</strong><small>Used whenever you search from the address bar.</small></span>
                <select value={browser.searchEngine} onChange={e=>preference({searchEngine:e.target.value})}>
                  {Object.entries(searchEngines).map(([id,engine])=><option key={id} value={id}>{engine.label}</option>)}
                </select>
              </label>
            </div>
            <div className="celestial-settings-group"><h3>TABS & HISTORY</h3>
              <Toggle title="Restore tabs" description="Reopen the tabs you left here last time."
                checked={browser.restoreTabs} onChange={v=>preference({restoreTabs:v})}/>
              <Toggle title="Save browsing history" description="Keep recent addresses locally for the Back/Forward controls."
                checked={browser.saveHistory} onChange={v=>preference({saveHistory:v})}/>
              <Toggle title="Compact tabs" description="Fit more tabs across a smaller toolbar."
                checked={browser.compactTabs} onChange={v=>preference({compactTabs:v})}/>
              <Toggle title="Open site links in new tabs" description="When the proxy opens a new window, make a Celestial tab."
                checked={browser.openLinksInTabs} onChange={v=>preference({openLinksInTabs:v})}/>
            </div>
            <div className="celestial-settings-group"><h3>KEYBOARD SHORTCUTS</h3>
              <div className="celestial-shortcut-grid">
                <span>Jump to address bar <kbd>Ctrl</kbd> <kbd>L</kbd></span>
                <span>Open a new tab <kbd>Ctrl</kbd> <kbd>T</kbd></span>
                <span>Reopen closed tab <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>T</kbd></span>
                <span>Next / previous tab <kbd>Ctrl</kbd> <kbd>Tab</kbd></span>
                <span>Fullscreen browser <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>F</kbd></span>
              </div>
              <button className="celestial-settings-quick-action" onClick={()=>{location.hash='browser';}}>Open Browser <span>↗</span></button>
            </div>
          </>}
          {panel==='privacy'&&<>
            <div className="celestial-settings-section-head"><span>03 / PRIVACY</span><h2>Your tab, your identity.</h2>
              <p>Customize the tab's title and icon, or open Celestial inside a separate blank wrapper.</p></div>
            <div className="celestial-settings-group"><h3>TAB CLOAKING</h3>
              <label className="celestial-settings-select"><span><strong>Tab style</strong><small>Only the visible title and icon change.</small></span>
                <select value={cloak.preset} onChange={e=>identity({preset:e.target.value})}>
                  {Object.entries(cloakPresets).map(([id,preset])=><option key={id} value={id}>{preset.label}</option>)}
                </select>
              </label>
              {cloak.preset==='custom'&&<>
                <label className="celestial-settings-field"><span>Custom title</span><input value={cloak.title}
                  maxLength={70} placeholder="My workspace" onChange={e=>identity({title:e.target.value})}/></label>
                <label className="celestial-settings-field"><span>Favicon URL</span><input value={cloak.icon}
                  maxLength={500} placeholder="https://example.com/favicon.ico"
                  onChange={e=>identity({icon:e.target.value})}/></label>
              </>}
              <div className="celestial-settings-action-row">
                <button onClick={()=>{identity({preset:'celestial',title:'',icon:''});notify('Tab identity reset.');}}>Reset tab identity</button>
                <button className="primary" onClick={()=>{
                  const result=openCloakedTab();notify(result.ok?'Opened Celestial in a new tab.':result.error);
                }}><ArrowUpRight20Filled/> Open in about:blank</button>
              </div>
              <p className="celestial-settings-footnote">Cloaking changes appearance, not your network traffic or browser history. Some browsers block blank-tab windows or embedding.</p>
            </div>
          </>}
          {panel==='account'&&<>
            <div className="celestial-settings-section-head"><span>04 / ACCOUNT</span><h2>Everything tied to you.</h2>
              <p>Your session and preferences stay in your control.</p></div>
            <div className="celestial-settings-user"><span>{user.username?.charAt(0).toUpperCase()}</span>
              <div><strong>{user.username}</strong><small>Signed in to Celestial</small></div></div>
            {isAdmin&&<div className="celestial-settings-group"><h3>ADMINISTRATION</h3>
              <button className="celestial-settings-quick-action" onClick={()=>setPanel('administration')}>
                Open account approvals <span>↗</span></button></div>}
            <div className="celestial-settings-group"><h3>SETTINGS FILE</h3>
              <div className="celestial-settings-action-row">
                <button onClick={exportSettings}><ArrowDownload20Filled/> Export settings</button>
                <label className="celestial-settings-import"><ArrowUpload20Filled/> Import settings
                  <input type="file" accept="application/json,.json" disabled={importing}
                    onChange={e=>{importSettings(e.target.files?.[0]);e.target.value='';}}/>
                </label>
              </div>
              <p className="celestial-settings-footnote">Exports only appearance and browser preferences—not your password, account data or messages.</p>
            </div>
            <div className="celestial-settings-group"><h3>ACCOUNT</h3>
              <button className="celestial-settings-signout" onClick={onLogout}>Sign out of Celestial</button>
            </div>
          </>}
          {panel==='administration'&&isAdmin&&<>
            <div className="celestial-settings-section-head"><span>05 / ADMINISTRATION</span>
              <h2>Access control.</h2><p>Review requests without leaving Celestial. Only authorized staff can act on them.</p></div>
            <AccountReview/>
          </>}
          {notification&&<p className="celestial-settings-notice" role="status">{notification}</p>}
        </div>
      </div>
    </div>
  </section>;
}
