import {esc,ico} from '../common.js';
import {viewMarker} from '../view-markers.js';

export const V3_SECTIONS=[
  {id:'home',label:'Overview',icon:'star',detail:'Your space'},
  {id:'browser',label:'Browser',icon:'web',detail:'Explore the web'},
  {id:'chat',label:'Community',icon:'discord',detail:'Stay connected'},
  {id:'ai',label:'Celestial AI',icon:'ask',detail:'Ideas, on demand'},
  {id:'settings',label:'Preferences',icon:'settings',detail:'Your experience'},
  {id:'account',label:'Account',icon:'user',detail:'Your profile'},
  {id:'admin',label:'Administration',icon:'shield',detail:'Manage Celestial',admin:true}
];

export function mountV3Shell(user){
  const root=document.getElementById('root');
  if(!root)throw Error('Celestial root is missing');
  const sections=V3_SECTIONS.filter(item=>!item.admin||user.role==='admin');
  root.innerHTML=
    '<div class="v3-shell" data-celestial-v3>'+
      '<div class="v3-ambient" aria-hidden="true"><span></span><span></span></div>'+
      '<aside class="v3-sidebar" aria-label="Workspace sidebar">'+
        '<div class="v3-brand"><span class="v3-brand-glyph" aria-hidden="true">✦</span><div><strong>celestial</strong><small>YOUR DIGITAL SPACE</small></div></div>'+
        '<div class="v3-sidebar-label">WORKSPACE <span>01 — 06</span></div>'+
        '<nav id="dock" class="dock v3-dock" aria-label="Main sections" hidden>'+
        sections.filter(x=>!['settings','account','admin'].includes(x.id)).map(item=>navItem(item)).join('')+
        '</nav>'+
        '<div class="v3-sidebar-bottom">'+
          '<div class="v3-sidebar-label">PERSONAL</div>'+
          '<div class="v3-personal-nav">'+sections.filter(x=>['settings','account','admin'].includes(x.id)).map(item=>navItem(item)).join('')+'</div>'+
          '<div class="v3-sidebar-card"><span>✳ STUDIO PREVIEW</span><strong>A new kind of everyday.</strong><p>The next Celestial is taking shape.</p></div>'+
          '<button type="button" class="v3-user" data-v3-go="account"><span class="v3-avatar">'+esc(user.username.slice(0,2).toUpperCase())+'</span><span><strong>'+esc(user.username)+'</strong><small>'+esc(user.role||'Member')+'</small></span><span aria-hidden="true">⌄</span></button>'+
        '</div>'+
      '</aside>'+
      '<div class="v3-main">'+
        '<header class="v3-topbar">'+
          '<div class="v3-breadcrumb"><span>✦</span><span>Workspace</span><span class="v3-breadcrumb-slash">/</span><strong data-v3-title>Overview</strong></div>'+
          '<div class="v3-top-actions">'+
            '<button class="v3-command-trigger" type="button" data-v3-command aria-label="Open quick switcher"><span aria-hidden="true">⌕</span> <span>Search anything</span><kbd>⌘ K</kbd></button>'+
            '<span class="v3-top-dot" aria-hidden="true"></span><span class="v3-online">PERSONAL SPACE</span>'+
            '<button class="v3-top-avatar" type="button" data-v3-go="account" aria-label="Open account">'+esc(user.username.slice(0,1).toUpperCase())+'</button>'+
          '</div>'+
        '</header>'+
        '<main class="views v3-views" id="views" hidden>'+
        sections.map(item=>'<section class="view v3-view '+(['browser','chat','ai'].includes(item.id)?'flush':'')+'" data-view="'+viewMarker(item.id)+'" aria-label="'+esc(item.label)+'" aria-hidden="true" inert></section>').join('')+
        '</main>'+
      '</div>'+
      '<div id="mini" class="mini gl" hidden></div><div id="scrim" class="scrim"></div><div id="sheet" class="sheet gl g3" role="dialog" aria-modal="true"></div><div id="over" class="over"></div>'+
      '<div class="v3-command-layer" data-v3-command-layer hidden>'+
        '<div class="v3-command-shade" data-v3-command-close></div>'+
        '<div class="v3-command-dialog" role="dialog" aria-modal="true" aria-label="Quick navigation">'+
          '<label class="v3-command-field"><span aria-hidden="true">⌕</span><input data-v3-command-input aria-label="Search workspace sections" placeholder="Where to?" autocomplete="off"><kbd>ESC</kbd></label>'+
          '<div class="v3-command-caption">NAVIGATE</div>'+
          '<div class="v3-command-results" data-v3-command-results></div>'+
          '<div class="v3-command-foot"><span>↑ ↓ move</span><span>↵ open</span><span>esc close</span></div>'+
        '</div>'+
      '</div>'+
    '</div>';
  // The original feature modules still own their own tools and API calls.
  // V3 owns navigation, feature loading and the outer experience.
  return {root,views:root.querySelector('#views'),dock:root.querySelector('#dock'),sections,
    title:root.querySelector('[data-v3-title]'),
    command:root.querySelector('[data-v3-command-layer]')};
}

function navItem(item){
  return '<button class="dk v3-nav" type="button" data-section="'+viewMarker(item.id)+'" data-v3-go="'+item.id+'" aria-label="'+esc(item.label)+'" title="'+esc(item.detail)+'">'+
    '<span class="v3-nav-symbol">'+ico(item.icon)+'</span><span class="v3-nav-text">'+esc(item.label)+'</span><span class="v3-nav-indicator" aria-hidden="true"></span></button>';
}
