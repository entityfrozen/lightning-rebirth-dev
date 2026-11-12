import {openAboutBlank} from './about-blank.js';
import {$,$$,ico,lic,THEMES,ACCENTS,applyPrefs,segThumb,api} from './common.js';
const identityPresets={
 celestial:['Celestial','/assets/celestial-star.svg'],
 brightpath:['Brightpath | Learning Workspace','/assets/brightpath.svg'],
 workspace:['Workspace','/assets/celestial-star.svg'],
 notes:['My Notes','/assets/celestial-star.svg'],
 dcss:['DCSS Portal','https://www.google.com/s2/favicons?domain=portal.dcssga.org&sz=64'],
 classroom:['Google Classroom','https://ssl.gstatic.com/classroom/favicon.ico'],
 docs:['Google Docs','https://www.google.com/s2/favicons?domain=docs.google.com&sz=64'],
 drive:['Google Drive','https://drive.google.com/favicon.ico'],
 clever:['Clever | Portal','https://clever.com/favicon.ico'],
 canvas:['Dashboard','https://canvas.instructure.com/favicon.ico'],
 wikipedia:['Wikipedia','https://www.wikipedia.org/static/favicon/wikipedia.ico'],
 custom:['','/assets/celestial-star.svg']
};
const fallbackIcon='/assets/celestial-star.svg';
const validIcon=value=>{try{const url=new URL(value,location.origin);return url.protocol==='https:'||url.origin===location.origin?url.href:fallbackIcon}catch{return fallbackIcon}};
const tabIdentity=()=>{const preset=localStorage.getItem('boba.tab.preset')||'celestial';const item=identityPresets[preset]||identityPresets.celestial;const title=preset==='custom'?localStorage.getItem('boba.tab.title'):item[0];const customIcon=localStorage.getItem('boba.tab.icon');return {preset,title:String(title||'Celestial').slice(0,70),icon:validIcon(preset==='custom'?customIcon:item[1])}};

export function applyTabAppearance(){
 const identity=tabIdentity();document.title=identity.title;
 let icon=document.querySelector('link[rel="icon"]');
 if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.append(icon)}
 icon.href=identity.icon;
 if(window.parent!==window){
  try{window.parent.postMessage({type:'celestial:appearance',title:identity.title,icon:identity.icon},location.origin)}catch{}
 }
 document.dispatchEvent(new CustomEvent('celestial:tab-appearance',{detail:identity}));
 return identity;
}
const accountSave=()=>window.dispatchEvent(new Event('celestial:save-workspace'));
export const settings = {
  html: () => {
    return '<div class="set"><h1 class="r">Settings</h1>' +
      '<div class="gt r" style="--d:.04s">Look</div><section class="grp gl g2 r" style="--d:.04s">' +
      '<div class="lr">' + lic("tv", "#7d8ba0", "#4a5566") + "<h3>Theme</h3></div>" +
      '<div class="thms" data-themes>' + THEMES.map(([v, n, m]) => '<button class="thm" type="button" data-v="' + v + '" data-pal="' + v + '" data-mode="' + m + '" aria-label="' + n + '"><span class="pv"></span><span>' + n + "</span></button>").join("") + "</div>" +
      '<div class="lr">' + lic("star", "#ffb547", "#ff7a1a") + '<h3>Accent</h3><div class="sws" data-acc>' +
      ACCENTS.map((c, i) => '<button class="sw" data-i="' + i + '" aria-label="Accent ' + (i + 1) + '" style="background:' + c[0] + '"></button>').join("") + "</div></div>" +
      '<div class="lr">' + lic("ask", "#c084fc", "#7c3aed") + '<h3>Effects</h3><div class="seg" data-fx><span class="th"></span><button data-v="full">Full</button><button data-v="lite">Lite</button></div></div>' +
      '<div class="lr"><span class="lic">'+ico("ask")+'</span><h3>AI dock icon</h3><label class="native-pref-switch"><input type="checkbox" data-show-ai> Show AI in the dock</label></div></section>' +
      '<div class="gt r" style="--d:.08s">Browsing</div><section class="grp gl g2 r" style="--d:.08s">' +
      '<div class="lr">' + lic("link", "#2be0e6", "#0b8f86") + '<h3>Connection</h3><span class="netst"><i data-cn></i><span data-cnm>Checking</span></span></div></section>' +
      '<div class="gt r" style="--d:.12s">This tab</div><section class="grp gl g2 r" style="--d:.12s">' +
      '<div class="lr">' + lic("tv", "#7d8ba0", "#4a5566") + '<h3>Tab appearance</h3><select data-tab aria-label="Tab appearance"><option value="celestial">Celestial</option><option value="brightpath">Brightpath</option><option value="workspace">Workspace</option><option value="notes">My Notes</option><option value="dcss">DCSS Portal</option><option value="classroom">Google Classroom</option><option value="docs">Google Docs</option><option value="drive">Google Drive</option><option value="clever">Clever Portal</option><option value="canvas">Canvas</option><option value="wikipedia">Wikipedia</option><option value="custom">Custom title & icon</option></select></div>' +
      '<div class="lr" data-custom-tab hidden><h3>Custom title</h3><label class="fld"><input data-tab-title maxlength="70" aria-label="Tab title"></label></div>' +
      '<div class="lr" data-custom-icon hidden><h3>Custom icon URL</h3><label class="fld"><input type="url" data-tab-icon maxlength="500" placeholder="https://example.com/favicon.ico" aria-label="Custom favicon URL"></label></div>' +
      '<div class="lr native-tab-preview"><img data-preview-icon width="28" height="28" alt=""><div><h3 data-preview-title>Celestial</h3><small>Browser tab preview · title and icon only</small></div><button class="btn s" type="button" data-tab-reset>Reset</button></div>' +
      '<p class="native-tab-note">Cloaking only changes how this tab looks. It does not change the address, browser history, network activity, or school monitoring.</p>' +
      '<div class="lr"><h3>Open in about:blank</h3><button type="button" class="btn s" data-tab-blank>Open cloaked tab</button></div>' +
      '<p class="native-tab-note">Framed tabs prefer Ultraviolet. Scramjet may require a standalone tab, and browsers can still block embedded sites.</p>' +
      '<div class="lr"><h3>Account sync</h3><span class="netst" data-account-sync>Saving preferences across your devices</span></div>' +
      '<div class="lr">' + lic("trash", "#ff6b6b", "#d62e4a") + '<h3>Reset appearance preferences</h3><button class="btn s" data-reset>Reset</button></div></section></div>';
  },

  mount(root){
    const paint=()=>{applyPrefs();const p=localStorage.getItem('celestial.boba.theme')||'boba';window.dispatchEvent(new Event('celestial:reimu-refresh'));for(const b of root.querySelectorAll('.thm'))b.classList.toggle('on',b.dataset.v===p);for(const b of root.querySelectorAll('.sw'))b.classList.toggle('on',Number(b.dataset.i)===Number(localStorage.getItem('boba.accent')||0));const seg=$('[data-fx]',root);for(const b of seg.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===document.documentElement.dataset.fx);segThumb(seg)};
    root.addEventListener('click',e=>{const t=e.target.closest('.thm'),a=e.target.closest('.sw'),f=e.target.closest('[data-fx] button');if(t){localStorage.setItem('celestial.boba.theme',t.dataset.v);if(t.dataset.v==='touhou')requestAnimationFrame(()=>window.dispatchEvent(new Event('celestial:reimu-activated')))}if(a)localStorage.setItem('boba.accent',a.dataset.i);if(f)localStorage.setItem('boba.fx',f.dataset.v);if(e.target.closest('[data-reset]')){for(const k of ['celestial.boba.theme','boba.accent','boba.fx'])localStorage.removeItem(k)}paint();accountSave()});
    api('/api/browser/status').then(d=>{$('[data-cnm]',root).textContent=d.proxy?'Available':'Unavailable'}).catch(()=>{$('[data-cnm]',root).textContent='Offline'});
    const showAi=$('[data-show-ai]',root);
    showAi.checked=localStorage.getItem('boba.dock.ai')!=='false';
    showAi.onchange=()=>{localStorage.setItem('boba.dock.ai',String(showAi.checked));window.dispatchEvent(new Event('celestial:dock-settings'));accountSave()};
    const tab=$('[data-tab]',root),title=$('[data-tab-title]',root),iconInput=$('[data-tab-icon]',root);
    tab.value=localStorage.getItem('boba.tab.preset')||'celestial';title.value=localStorage.getItem('boba.tab.title')||'';iconInput.value=localStorage.getItem('boba.tab.icon')||'';
    const tabPaint=()=>{const custom=tab.value==='custom';$('[data-custom-tab]',root).hidden=!custom;$('[data-custom-icon]',root).hidden=!custom;
      const identity=applyTabAppearance();$('[data-preview-title]',root).textContent=identity.title;
      const preview=$('[data-preview-icon]',root);preview.src=identity.icon;preview.onerror=()=>{preview.onerror=null;preview.src=fallbackIcon};
    };
    tab.onchange=()=>{localStorage.setItem('boba.tab.preset',tab.value);tabPaint();accountSave()};
    title.oninput=()=>{localStorage.setItem('boba.tab.title',title.value);tabPaint();accountSave()};
    iconInput.onchange=()=>{localStorage.setItem('boba.tab.icon',iconInput.value.trim());tabPaint();accountSave()};
    $('[data-tab-blank]',root).onclick=()=>{
     const identity=applyTabAppearance();
     const result=openAboutBlank(location.origin+'/',{title:identity.title,icon:identity.icon});
     if(!result.ok)alert(result.message);
    };
    $('[data-tab-reset]',root).onclick=()=>{for(const key of ['boba.tab.preset','boba.tab.title','boba.tab.icon'])localStorage.removeItem(key);tab.value='celestial';title.value='';iconInput.value='';tabPaint();accountSave()};
    tabPaint();
    window.addEventListener('celestial:workspace-sync',e=>{const indicator=$('[data-account-sync]',root);if(indicator)indicator.textContent=e.detail?.ok?'Saved to your account':'Not synced — will retry when online'});
    paint();return paint;
  }
};
