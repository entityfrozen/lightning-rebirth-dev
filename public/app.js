/** Lightning UI: uncomplicated, dependency-free modules and intentionally visible state. */
const defaultTheme = {
  accent:'#bb80ff', background:'#100a1b', surface:'#241631',
  text:'#fff5ff', muted:'#bfaace', line:'#654677',
  glow:58, radius:17, petals:true
};
const presets = {
  Rebirth:{...defaultTheme},
  Eclipse:{...defaultTheme, accent:'#9866f1', background:'#0c0a16',surface:'#1b162b',line:'#45405e',glow:36,petals:false},
  Sakura:{...defaultTheme, accent:'#f5a5da', background:'#21121f',surface:'#3b243c',muted:'#edbdde',line:'#955a8c',glow:70},
  Frost:{...defaultTheme, accent:'#8cdbff', background:'#091520',surface:'#142d3a',muted:'#a9c4d6',line:'#416c85',glow:46,petals:false},
  Ember:{...defaultTheme, accent:'#f9a46c',background:'#20121b',surface:'#3c242f',muted:'#d5b5be',line:'#82515e',glow:40,petals:false}
};
const iconPaths = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  library:'<path d="M4 6l8-4 8 4-8 4zM4 12l8 4 8-4M4 18l8 4 8-4"/>',
  chat:'<path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 9-9h2a8 8 0 0 1 8 9Z"/><path d="M7 10h.01M12 10h.01M17 10h.01"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M22 20v-2a5 5 0 0 0-4-4.9"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h1.3a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.4-2.9H18a5 5 0 0 0 5-5 7 7 0 0 0-7-7h-4Z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="15" r="1"/>',
  tool:'<path d="m15 5 4 4M18 2l4 4-8 8-4-4zM3 21l8-8M2 15l7 7"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.5 1.5 0 0 0 .3 1.6l.1.1-2.1 2.1-.2-.1a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-.9 1.4V21h-3v-1.2a1.5 1.5 0 0 0-.9-1.4 1.5 1.5 0 0 0-1.6.3l-.2.1-2.1-2.1.1-.1a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.4-.9H5v-3h1.2a1.5 1.5 0 0 0 1.4-.9 1.5 1.5 0 0 0-.3-1.6l-.1-.2 2.1-2.1.2.1a1.5 1.5 0 0 0 1.6.3 1.5 1.5 0 0 0 .9-1.4V4h3v1.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.6-.3l.2-.1 2.1 2.1-.1.2a1.5 1.5 0 0 0-.3 1.6 1.5 1.5 0 0 0 1.4.9H22v3h-1.2a1.5 1.5 0 0 0-1.4.9z"/>',
  spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',
  megaphone:'<path d="m3 11 14-7v16L3 13v-2ZM17 9a3 3 0 0 1 0 6M7 15l2 5"/>',
  gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8C6 8 6 2 9 2c2 0 3 3 3 6ZM12 8c6 0 6-6 3-6-2 0-3 3-3 6Z"/>',
  arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
  arrowUp:'<path d="M12 19V4m-6 6 6-6 6 6"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
  heart:'<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  save:'<path d="M4 3h14l3 3v15H3V3h1Z M7 3v6h10V3M7 21v-9h10v9"/>',
  shield:'<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  pen:'<path d="m5 19 4-.8L20 7a2.1 2.1 0 0 0-3-3L6 15l-1 4ZM14 7l3 3"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
  moon:'<path d="M20 16a8 8 0 0 1-12-12A8 8 0 1 0 20 16Z"/>',
  sliders:'<path d="M4 7h16M4 17h16M9 4v6M16 14v6"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17v.5"/>'
};
const navLinks = [
  ['home','Home','home'],['browse','Browse','compass'],['library','Library','library'],
  ['ai','AI Assistant','chat'],['community','Community','users'],['studio','Theme Studio','palette'],
  ['toolkit','Toolkit','tool'],['settings','Settings','settings']
];
const channels={general:{title:'general',description:'Anything Lightning. Introduce yourself, talk ideas, share what you are making.'},help:{title:'help-desk',description:'Ask questions and help people get unstuck.'},showcase:{title:'showcase',description:'Show off the themes and projects you are working on.'}};
const colorFields=[['accent','Accent'],['background','Background'],['surface','Cards & panels'],['text','Primary text'],['muted','Secondary text'],['line','Borders']];
const $=(selector)=>document.querySelector(selector);
const store=(key,value)=>{try{localStorage.setItem('lightning.'+key,JSON.stringify(value));}catch{}};
const restore=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('lightning.'+key))??fallback;}catch{return fallback;}};
const escapeHTML=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const glyph=(name,size=20)=>`<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`;
const infoTime=(date)=>{const sec=Math.max(0,(Date.now()-Date.parse(date))/1000);if(sec<60)return 'just now';if(sec<3600)return Math.floor(sec/60)+'m ago';if(sec<86400)return Math.floor(sec/3600)+'h ago';if(sec<604800)return Math.floor(sec/86400)+'d ago';return new Date(date).toLocaleDateString();};
const validateTheme=(theme)=>{
  if(!theme||typeof theme!=='object')throw Error('This file does not contain a Lightning theme');
  const cleaned={};
  for(const [key] of colorFields){if(typeof theme[key]!=='string'||!/^#[\da-f]{6}$/i.test(theme[key]))throw Error(`Invalid ${key} color`);cleaned[key]=theme[key];}
  cleaned.glow=Math.max(0,Math.min(100,Number(theme.glow)||0));
  cleaned.radius=Math.max(4,Math.min(28,Number(theme.radius)||16));
  cleaned.petals=Boolean(theme.petals);return cleaned;
};
const state={view:'home',communityTab:'chat',channel:'general',filter:'all',sort:'new',search:'',user:null,stats:{members:0,drops:0,messages:0},drops:[],messages:[],loaded:false,companion:restore('companion',false),motion:restore('motion',true),theme:{...defaultTheme,...restore('theme',defaultTheme)},themeName:restore('themeName','My lightning theme'),myThemes:restore('myThemes',[]),savedDrops:restore('savedDrops',[]),notes:restore('notes',''),guestSeen:restore('guestSeen',false),autoDialogue:false,log:[],dialogueIndex:0};
let eventSource=null,dialogueTimer=null,autoTimer=null;

async function api(route,options={}) {
  const result=await fetch(route,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  const data=await result.json().catch(()=>({}));
  if(!result.ok)throw Error(data.error||'Something went wrong');
  return data;
}
const send=(route,data,method='POST')=>api(route,{method,body:JSON.stringify(data)});
function toast(message,type='good'){
  const el=document.createElement('div');el.className='toast '+type;el.textContent=message;$('#toastLayer').append(el);setTimeout(()=>el.remove(),4000);
}
function applyTheme(){
  const root=document.documentElement;
  for(const [key] of colorFields)root.style.setProperty('--'+key,state.theme[key]);
  root.style.setProperty('--round',state.theme.radius+'px');
  root.style.setProperty('--glow-power',(state.theme.glow/100).toFixed(2));
  root.classList.toggle('without-petals',!state.theme.petals);
  root.classList.toggle('reduce-motion',!state.motion);
  root.classList.toggle('chan-active',state.companion);
  store('theme',state.theme);
}
function persistPersonal(){store('myThemes',state.myThemes);store('savedDrops',state.savedDrops);store('themeName',state.themeName);}
function actionButton(label,action,variant='primary',extra='') {return `<button class="btn ${variant}" data-action="${action}" ${extra}>${label}</button>`;}
function navigate(view,sub=''){
  if(!navLinks.some(link=>link[0]===view))view='home';
  state.view=view;if(view==='community'&&sub)state.communityTab=sub;
  history.replaceState(null,'',`#${view}${view==='community'&&state.communityTab==='drops'?'/drops':''}`);
  $('#sidebar').classList.remove('open');render();$('#view').scrollTop=0;
  if(state.companion)say({home:'Hey! Welcome back to Lightning! ✦',browse:'Found something interesting? Save it for later!',library:'Your collection is looking lovely.',ai:'I can keep you company, even if AI is offline.',community:'Check out what everyone is making!',studio:'Ooh, let’s make your very own colors!',toolkit:'Tools out! What are we building today?',settings:'Make yourself comfortable. I’m optional, you know!'}[view]);
}
function updateShell(){
  $('#mainNav').innerHTML=navLinks.map(([id,label,icon])=>`<button class="nav-link ${state.view===id?'selected':''}" data-nav="${id}">${glyph(icon,20)}<span>${label}</span></button>`).join('');
  $('#topLocation').textContent=navLinks.find(n=>n[0]===state.view)?.[1]||'Home';
  $('#profileName').textContent=state.user?.username||'Guest';
  $('#profileSub').textContent=state.user?'Lightning member':'Sign in to share';
  $('#profileInitial').textContent=state.user?.username[0].toUpperCase()||'G';
  $('#topAvatar').textContent=state.user?.username[0].toUpperCase()||'G';
  $('#searchInput').value=state.search;
}
function render(){
  updateShell();
  const pages={home:homePage,browse:browsePage,library:libraryPage,ai:aiPage,community:communityPage,studio:studioPage,toolkit:toolkitPage,settings:settingsPage};
  $('#view').innerHTML=pages[state.view]();
  $('.app-shell').classList.toggle('mode-chan',state.companion);
  $('#mascot').setAttribute('aria-hidden',String(!state.companion));
  $('#dialogue').hidden=!state.companion;
  if(state.view==='community'&&state.communityTab==='chat')scrollChat();
}
function pageEyebrow(text){return `<div class="eyebrow">${text}</div>`;}
function sectionHeader(title,icon,side=''){return `<div class="panel-heading"><div class="panel-title">${glyph(icon,22)}<strong>${title}</strong></div>${side}</div>`;}
function homePage(){
  const featured=state.drops.slice(0,3);
  return `<div class="page home-page">
    <section class="welcome-card"><div class="welcome-art" aria-hidden="true"><span class="moon-disc"></span><div class="window-panes"></div><div class="welcome-bloom bloom-a">✿</div><div class="welcome-bloom bloom-b">✿</div></div><div class="welcome-content">${pageEyebrow('HOME')}<h1>Welcome back.</h1><p>Pick up where you left off.</p></div></section>
    <div class="home-grid"><section class="panel announcements">${sectionHeader('Latest from Lightning','megaphone','<button class="quiet-link" data-nav="community">Go to Community '+glyph('arrow',15)+'</button>')}<div class="announcement-feature"><span class="announce-icon">${glyph('spark',29)}</span><div><strong>Lightning v5.1</strong><p>Accounts, community chat, themes, and saved items.</p></div><span class="small-tag">UPDATE</span></div><div class="announce-row"><span class="announce-round">${glyph('palette',19)}</span><div><strong>Theme Studio is open</strong><p>Create, save, and share custom themes.</p></div></div><div class="announce-row"><span class="announce-round">${glyph('users',19)}</span><div><strong>Community chat</strong><p>Talk with other members in Community.</p></div></div></section>
      <section class="panel quick-panel">${sectionHeader('Quick Actions','spark')}<div class="quick-grid"><button class="quick-tile" data-nav="studio">${glyph('palette',28)}<span>Theme Studio</span><small>Create a theme</small></button><button class="quick-tile" data-action="open-drops">${glyph('gift',28)}<span>Community Drops</span><small>Browse themes</small></button><button class="quick-tile" data-nav="ai">${glyph('chat',28)}<span>AI Assistant</span><small>AI tools</small></button><button class="quick-tile" data-nav="library">${glyph('library',28)}<span>Library</span><small>Saved items</small></button></div></section></div>
    <div class="lower-grid"><section class="panel theme-feature"><div class="theme-feature-copy"><h2>Theme Studio</h2><p>Edit colors and layout settings, then save your theme.</p><button class="btn primary" data-nav="studio">Create a theme ${glyph('arrow',17)}</button></div><div class="theme-feature-art"><span class="floating-palette">◉ ◉ ◉ ◉</span><span class="feature-lightning">ϟ</span></div></section>
    <section class="panel drops-mini">${sectionHeader('From Community Drops','gift','<button class="quiet-link" data-action="open-drops">Explore all '+glyph('arrow',15)+'</button>')}<div class="mini-drop-list">${featured.map(d=>`<button class="mini-drop" data-action="inspect-drop" data-id="${d.id}"><span class="mini-swatch" style="--swatch:${d.theme.accent};--swatch-bg:${d.theme.background}">ϟ</span><span><strong>${escapeHTML(d.title)}</strong><small>by ${escapeHTML(d.author)}</small></span>${glyph('chevron',15)}</button>`).join('')||'<p class="muted">No Drops yet.</p>'}</div></section></div>
    <div class="home-footer">Lightning v5.1 <span class="footer-right">${state.user?escapeHTML(state.user.username):'Guest'}</span></div>
  </div>`;
}
function filterDrops(){
  let list=[...state.drops];
  if(state.filter==='favorites')list=list.filter(d=>state.savedDrops.includes(d.id));
  if(state.filter==='mine')list=list.filter(d=>state.user&&d.ownerId===state.user.id);
  if(state.filter==='starter')list=list.filter(d=>d.ownerId==='system');
  const query=state.search.trim().toLowerCase();
  if(query)list=list.filter(d=>[d.title,d.author,d.description,...d.tags].join(' ').toLowerCase().includes(query));
  if(state.sort==='popular')list.sort((a,b)=>b.likes-a.likes || b.downloads-a.downloads);
  else list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return list;
}
function previewArt(theme){return `<div class="drop-art" style="--drop-accent:${theme.accent};--drop-background:${theme.background};--drop-surface:${theme.surface};--drop-line:${theme.line}"><div class="drop-art-grid"></div><span class="drop-bolt">ϟ</span><span class="drop-art-orbit"></span><span class="drop-art-bottom"><i></i><i></i><i></i></span></div>`;}
function dropCard(d){return `<article class="drop-card">${previewArt(d.theme)}<div class="drop-card-body"><div class="drop-card-top"><span class="type-tag">THEME</span><span class="drop-author">by ${escapeHTML(d.author)}</span></div><h3>${escapeHTML(d.title)}</h3><p>${escapeHTML(d.description)}</p><div class="drop-card-bottom"><span>${glyph('heart',14)} ${d.likes}</span><span>${glyph('download',14)} ${d.downloads}</span><button class="card-arrow" data-action="inspect-drop" data-id="${d.id}" aria-label="View ${escapeHTML(d.title)}">${glyph('arrow',19)}</button></div></div></article>`;}
function dropList(){const items=filterDrops();return `<div class="drop-cards">${items.map(dropCard).join('')}</div>${items.length?'':`<div class="empty-state">${glyph('search',28)}<strong>No Drops here yet.</strong><p>Try a different filter, or publish the first one.</p></div>`}`;}
function browsePage(){return `<div class="page inner-page"><div class="page-title-row"><div>${pageEyebrow('BROWSE')}<h1>Browse themes</h1><p>Find themes shared by the community.</p></div><button class="btn primary" data-nav="studio">${glyph('plus',17)} Make a theme</button></div><div class="content-panel browser-intro"><div><h2>Community themes</h2><p>Preview, apply, and save themes.</p></div><div class="browser-bolts">ϟ ✦ ϟ</div></div><div class="filter-row"><div class="chip-group">${[['all','All Drops'],['starter','Starter Packs'],['favorites','Saved'],['mine','My Drops']].map(([id,name])=>`<button class="chip ${state.filter===id?'active':''}" data-filter="${id}">${name}</button>`).join('')}</div><label class="sort-label">Sort <select id="dropSort"><option value="new" ${state.sort==='new'?'selected':''}>Newest</option><option value="popular" ${state.sort==='popular'?'selected':''}>Popular</option></select></label></div>${dropList()}</div>`;}
function libraryPage(){const saved=state.drops.filter(d=>state.savedDrops.includes(d.id));return `<div class="page inner-page"><div class="page-title-row"><div>${pageEyebrow('COLLECTION / LIBRARY')}<h1>Your <em>library.</em></h1><p>All the little things you wanted to keep.</p></div><button class="btn secondary" data-nav="browse">${glyph('compass',17)} Explore Drops</button></div><div class="stat-strip"><div><span>COLLECTED DROPS</span><strong>${saved.length}</strong></div><div><span>SAVED THEMES</span><strong>${state.myThemes.length}</strong></div><div><span>YOUR SPACE</span><strong>LOCAL</strong></div></div><h2 class="section-h2">Saved Drops</h2>${saved.length?`<div class="drop-cards">${saved.map(dropCard).join('')}</div>`:'<div class="empty-state"><strong>Your collection is empty.</strong><p>Find something you love in Community Drops, then save it here.</p><button class="btn primary" data-nav="browse">Browse themes</button></div>'}<h2 class="section-h2">My Theme Designs</h2>${myThemesMarkup()}</div>`;}
function aiPage(){return `<div class="page inner-page ai-page"><div class="page-title-row"><div>${pageEyebrow('WORKSPACE / ASSISTANT')}<h1>AI <em>Assistant.</em></h1><p>One place for questions, ideas and creating.</p></div><span class="connection-badge">${glyph('alert',15)} NOT CONNECTED</span></div><div class="ai-shell"><div class="ai-center"><span class="assistant-orb">${glyph('spark',43)}</span><h2>Your creative sidekick.</h2><p>The assistant UI is ready, but no AI provider is configured on this server yet. Chat responses are intentionally disabled instead of being faked.</p><div class="prompt-ideas"><button data-nav="studio">${glyph('palette',17)} Make a new theme</button><button data-action="open-drops">${glyph('gift',17)} Explore community Drops</button><button data-nav="toolkit">${glyph('tool',17)} Open the Toolkit</button></div></div><div class="ai-input-bar"><input disabled placeholder="Connect a server-side AI provider to start chatting…"><button disabled class="btn primary">Send ${glyph('arrow',16)}</button></div></div></div>`;}
function renderMessages(){
  if(!state.messages.length)return `<div class="chat-empty"><span>${glyph('chat',28)}</span><h3>Start the conversation.</h3><p>This channel is yours to fill. Say hello!</p></div>`;
  return state.messages.map(message=>`<div class="message-row"><span class="message-avatar">${escapeHTML(message.author[0].toUpperCase())}</span><div class="message-content"><div class="message-head"><strong>${escapeHTML(message.author)}</strong><span>${infoTime(message.createdAt)}</span></div><p>${escapeHTML(message.text)}</p></div></div>`).join('');
}
function scrollChat(){const area=$('#messageList');if(area)area.scrollTop=area.scrollHeight;}
function communityPage(){return `<div class="page community-page"><div class="community-header"><div>${pageEyebrow('PEOPLE / COMMUNITY')}<h1>Made better <em>together.</em></h1><p>Talk, share, remix. This is your place.</p></div><div class="community-tabs"><button class="segmented ${state.communityTab==='chat'?'active':''}" data-community-tab="chat">${glyph('chat',17)} Chat</button><button class="segmented ${state.communityTab==='drops'?'active':''}" data-community-tab="drops">${glyph('gift',17)} Drops</button></div></div>${state.communityTab==='chat'?communityChat():communityDrops()}</div>`;}
function communityChat(){const channel=channels[state.channel];return `<section class="chat-layout"><aside class="chat-channels"><div class="chat-server"><span>ϟ</span><strong>Lightning Hub</strong><small>COMMUNITY</small></div><div class="chat-channel-caption">TEXT CHANNELS</div>${Object.entries(channels).map(([key,value])=>`<button class="channel ${state.channel===key?'selected':''}" data-channel="${key}"><span>#</span>${value.title}</button>`).join('')}<div class="channel-footer">${glyph('shield',17)}<span>A welcoming place to create.</span></div></aside><div class="chat-main"><div class="chat-main-header"><span class="hash">#</span><strong>${channel.title}</strong><span>${channel.description}</span></div><div class="message-list" id="messageList" role="log" aria-live="polite">${renderMessages()}</div>${state.user?`<form id="chatForm" class="chat-composer"><input id="chatInput" maxlength="600" placeholder="Message #${channel.title}" autocomplete="off" aria-label="Chat message" required><button type="submit" aria-label="Send message">${glyph('arrowUp',20)}</button></form>`:`<div class="guest-composer"><span>Want to join the conversation?</span><button class="btn primary small" data-action="show-login">Sign in</button></div>`}</div><aside class="chat-about"><span class="overline">ABOUT THIS CHANNEL</span><span class="about-icon">${glyph('users',28)}</span><h3>A little corner of Lightning.</h3><p>${channel.description}</p><hr><span class="overline">HOUSE RULES</span><div class="rule">✦ Be kind to each other</div><div class="rule">✦ Keep the channel on-topic</div><div class="rule">✦ Share your own work</div><div class="rule">✦ No spam or personal data</div><div class="presence">${glyph('shield',17)} Messages are stored on this server</div></aside></section>`;}
function communityDrops(){return `<div class="drops-community"><div class="drops-lead"><div><div class="overline">COMMUNITY DROP ZONE</div><h2>Share the vibe.</h2><p>Publish a theme, find a new look, and show some love to other creators.</p></div><button class="btn primary" data-action="publish-theme">${glyph('upload',17)} Publish my theme</button></div><div class="drop-filters"><div class="chip-group">${[['all','Explore'],['starter','Official'],['favorites','Saved'],['mine','My uploads']].map(([id,label])=>`<button class="chip ${state.filter===id?'active':''}" data-filter="${id}">${label}</button>`).join('')}</div><label class="sort-label">Order <select id="dropSort"><option value="new" ${state.sort==='new'?'selected':''}>Newest</option><option value="popular" ${state.sort==='popular'?'selected':''}>Most loved</option></select></label></div>${dropList()}</div>`;}
function colorControl(key,name){return `<label class="color-control"><span class="color-name">${name}</span><span class="color-input-wrap"><span class="color-hex" data-color-label="${key}">${state.theme[key]}</span><input type="color" data-theme-field="${key}" value="${state.theme[key]}" aria-label="${name} color"></span></label>`;}
function themePreview(){return `<div class="theme-mini-app"><div class="mini-side"><div class="mini-logo"><img src="/assets/lightning-mark.svg" alt=""> Lightning</div><span class="mini-menu selected">⌂ &nbsp; Home</span><span class="mini-menu">◇ &nbsp; Explore</span><span class="mini-menu">▤ &nbsp; Library</span><span class="mini-menu">✧ &nbsp; Studio</span><span class="mini-profile">◉ &nbsp; Your profile</span></div><div class="mini-work"><div class="mini-top"><span>⌁ &nbsp; HOME / LIGHTNING</span><i>✧</i></div><div class="mini-hero"><span>✦ LIGHTNING</span><h3>Looks like you.</h3><p>A little more personality, a lot more color.</p></div><div class="mini-panels"><div class="mini-panel"><strong>What's new</strong><span class="mini-bar long"></span><span class="mini-bar"></span><span class="mini-bar short"></span></div><div class="mini-panel"><strong>Quick actions</strong><div class="mini-squares"><span>✦</span><span>◇</span><span>▦</span><span>⚙</span></div></div></div></div></div>`;}
function studioPage(){return `<div class="page inner-page studio-page"><div class="page-title-row"><div>${pageEyebrow('CREATIVE / DESIGN LAB')}<h1>Theme <em>Studio.</em></h1><p>Build something that feels completely yours. Everything updates live.</p></div><div class="studio-head-actions"><button class="btn secondary" data-action="import-theme">${glyph('upload',17)} Import</button><button class="btn primary" data-action="export-theme">${glyph('download',17)} Export JSON</button></div></div><div class="studio-layout"><div class="studio-controls panel"><div class="studio-block-title"><div><span class="mini-overline">01 / START HERE</span><h3>Choose a direction</h3></div>${glyph('spark',19)}</div><div class="preset-grid">${Object.entries(presets).map(([name,theme])=>`<button class="preset" data-preset="${name}"><span class="preset-orbs" style="--preset-a:${theme.accent};--preset-b:${theme.background}"></span><span>${name}</span></button>`).join('')}</div><div class="studio-block-title second"><div><span class="mini-overline">02 / THE DETAILS</span><h3>Color palette</h3></div>${glyph('palette',19)}</div><div class="color-controls">${colorFields.map(([key,name])=>colorControl(key,name)).join('')}</div><div class="studio-block-title second"><div><span class="mini-overline">03 / FINISHING TOUCHES</span><h3>The little extras</h3></div>${glyph('sliders',19)}</div><div class="range-control"><label for="glowRange">Ambient glow <span id="glowValue">${state.theme.glow}%</span></label><input type="range" min="0" max="100" id="glowRange" data-theme-field="glow" value="${state.theme.glow}"></div><div class="range-control"><label for="radiusRange">Corner softness <span id="radiusValue">${state.theme.radius}px</span></label><input type="range" min="4" max="28" id="radiusRange" data-theme-field="radius" value="${state.theme.radius}"></div><label class="switch-row"><span>Blossom decorations<small>A subtle sakura touch</small></span><input type="checkbox" data-theme-field="petals" ${state.theme.petals?'checked':''}><i></i></label></div><div class="studio-preview-column"><section class="studio-preview panel"><div class="preview-heading"><div><span class="mini-overline">LIVE PREVIEW</span><h3>See your theme in action</h3></div><span class="live-dot">LIVE</span></div>${themePreview()}<p class="preview-note">The actual app uses these colors too. This isn't a static screenshot.</p></section><section class="panel studio-save-panel"><div><span class="mini-overline">YOUR CREATION</span><h3>Give it a name.</h3><p>Save it here, export it as a file, or release it as a Community Drop.</p></div><label class="theme-name-label">Theme name <input id="themeName" maxlength="46" value="${escapeHTML(state.themeName)}" placeholder="Midnight bloom"></label><div class="studio-save-actions"><button class="btn secondary" data-action="save-theme">${glyph('save',17)} Save to Library</button><button class="btn primary" data-action="publish-theme">${glyph('upload',17)} Publish Drop</button></div></section></div></div><h2 class="section-h2">Your saved designs</h2>${myThemesMarkup()}<input hidden type="file" id="themeFileInput" accept=".json,application/json"></div>`;}
function myThemesMarkup(){return state.myThemes.length?`<div class="saved-theme-grid">${state.myThemes.map((entry,index)=>`<div class="saved-theme" style="--saved-accent:${entry.theme.accent};--saved-bg:${entry.theme.background}"><span class="saved-dot"></span><div><strong>${escapeHTML(entry.name)}</strong><small>Saved in this browser</small></div><button data-action="apply-saved-theme" data-index="${index}">Apply</button><button data-action="delete-saved-theme" data-index="${index}" aria-label="Delete theme">×</button></div>`).join('')}</div>`:'<div class="saved-empty">Nothing saved yet. Your designs will appear here.</div>';}
function toolkitPage(){return `<div class="page inner-page"><div class="page-title-row"><div>${pageEyebrow('TOOLS / WORKBENCH')}<h1>Your <em>toolkit.</em></h1><p>A place for your scratch work and shortcuts.</p></div></div><div class="toolkit-grid"><div class="panel note-panel">${sectionHeader('Scratchpad','pen')}<p class="muted">Quick ideas stay saved in this browser as you type.</p><textarea id="notesArea" spellcheck="false" placeholder="That one idea you don't want to forget...">${escapeHTML(state.notes)}</textarea><span class="note-saved">✦ Autosaved locally</span></div><div class="panel toolkit-shortcuts">${sectionHeader('Shortcuts','spark')}<button data-nav="studio">${glyph('palette',20)} <span>Open Theme Studio<small>Customize the whole interface</small></span>${glyph('arrow',16)}</button><button data-action="open-drops">${glyph('gift',20)} <span>Community Drops<small>Discover new theme packages</small></span>${glyph('arrow',16)}</button><button data-action="export-theme">${glyph('download',20)} <span>Export current theme<small>Save a portable JSON package</small></span>${glyph('arrow',16)}</button><button data-nav="settings">${glyph('settings',20)} <span>Preferences<small>Companion mode and accessibility</small></span>${glyph('arrow',16)}</button></div></div></div>`;}
function settingsPage(){return `<div class="page inner-page settings-page"><div class="page-title-row"><div>${pageEyebrow('WORKSPACE / PREFERENCES')}<h1>Your <em>space.</em></h1><p>Everything how you like it, down to the last detail.</p></div></div><div class="setting-groups"><section class="panel setting-panel">${sectionHeader('Companion','spark')}<div class="setting-switch-row"><div class="setting-face"><img src="/assets/lightning-chan-idle.png" alt="Lightning-chan portrait"></div><div class="setting-description"><h3>Lightning-chan Mode</h3><p>Transforms the layout into a visual-novel-inspired workspace with a real 2D character, dialogue and expressions.</p><span class="setting-label">OPTIONAL · OFF BY DEFAULT</span></div><label class="switch-control"><input id="companionToggle" type="checkbox" ${state.companion?'checked':''}><i></i><span class="sr-only">Toggle Lightning-chan Mode</span></label></div></section><section class="panel setting-panel">${sectionHeader('Appearance','palette')}<div class="setting-row"><div><strong>Theme Studio</strong><p>Edit the active colors, panels and glow.</p></div><button class="btn secondary" data-nav="studio">Customize ${glyph('arrow',15)}</button></div><div class="setting-row"><div><strong>Interface animations</strong><p>Turn off motion and moving effects.</p></div><label class="switch-control"><input id="motionToggle" type="checkbox" ${state.motion?'checked':''}><i></i><span class="sr-only">Toggle animations</span></label></div><div class="setting-row"><div><strong>Reset visual theme</strong><p>Return to the original Rebirth palette.</p></div><button class="btn secondary" data-action="reset-theme">Reset theme</button></div></section><section class="panel setting-panel">${sectionHeader('Account','shield')}<div class="setting-row"><div><strong>${state.user?escapeHTML(state.user.username):'Guest session'}</strong><p>${state.user?'Signed in to this Lightning server. Your shared posts and Drops are stored here.':'Guest mode lets you preview. Sign in to chat and publish.'}</p></div>${state.user?`<button class="btn secondary" data-action="logout">${glyph('logout',16)} Sign out</button>`:`<button class="btn primary" data-action="show-login">Sign in</button>`}</div></section></div></div>`;}
function renderLogin(mode='login',mandatory=false,error=''){
  const register=mode==='register';
  $('#authLayer').innerHTML=`<div class="auth-overlay"><div class="auth-frame"><section class="auth-art"><div class="auth-logo"><img src="/assets/lightning-mark.svg" alt="">Lightning<span>REBIRTH</span></div><div class="auth-light"></div><img class="auth-character" src="/assets/lightning-chan-wave.png" alt="Lightning-chan waving"><div class="auth-art-caption"><span>✦ YOUR SPACE, YOUR RULES</span><h2>A little spark<br>goes a long way.</h2><p>Create. Connect. Make something wonderful.</p></div></section><section class="auth-form-side"><div class="auth-top"><span>LIGHTNING // ACCOUNT</span>${!mandatory?`<button class="close-auth" data-action="close-auth" aria-label="Close login">×</button>`:''}</div><div class="auth-form-center"><div class="auth-mini-mark"><img src="/assets/lightning-mark.svg" alt=""></div><div class="mini-overline">${register?'JOIN THE COMMUNITY':'GOOD TO SEE YOU AGAIN'}</div><h1>${register?'Make yourself <em>at home.</em>':'Welcome <em>back.</em>'}</h1><p class="auth-sub">${register?'Create an account to join the chat and share your themes.':'Sign in to pick up where you left off.'}</p>${error?`<div class="form-error" role="alert">${escapeHTML(error)}</div>`:''}<form id="authForm" data-mode="${mode}"><label>USERNAME<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" placeholder="Your username" required autofocus></label><label>PASSWORD<input name="password" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="8" maxlength="128" placeholder="At least 8 characters" required></label><button class="btn primary auth-submit" type="submit">${register?'Create my account':'Sign in'} ${glyph('arrow',18)}</button></form><div class="auth-swap">${register?'Already have an account?':'New to Lightning?'} <button data-action="switch-auth" data-mode="${register?'login':'register'}">${register?'Sign in':'Create an account'}</button></div><div class="auth-divider">or</div><button class="guest-button" data-action="guest">Continue as guest ${glyph('arrow',16)}</button><p class="auth-disclaimer">Accounts belong to this server. No email is required. Guest mode can browse, but can't post.</p></div><div class="auth-bottom">© LIGHTNING REBIRTH <span>✦ BUILT FOR CREATORS</span></div></section></div></div>`;
  $('#authForm [name="username"]')?.focus();
}
function closeAuth(){ $('#authLayer').innerHTML=''; }
function showModal(content){$('#modalLayer').innerHTML=`<div class="modal-backdrop" data-action="close-modal"><div class="modal-panel" role="dialog" aria-modal="true" aria-label="Lightning detail">${content}</div></div>`;}
function closeModal(){$('#modalLayer').innerHTML='';}
function inspectDrop(id){const drop=state.drops.find(d=>d.id===id);if(!drop)return toast('Drop not found','bad');showModal(`<div class="modal-head"><span class="mini-overline">COMMUNITY DROP / THEME</span><button class="modal-x" data-action="close-modal">×</button></div><div class="modal-hero">${previewArt(drop.theme)}</div><div class="modal-details"><h2>${escapeHTML(drop.title)}</h2><div class="modal-byline">by ${escapeHTML(drop.author)} · ${infoTime(drop.createdAt)}</div><p>${escapeHTML(drop.description)}</p><div class="modal-colors">${colorFields.slice(0,4).map(([key])=>`<span style="background:${drop.theme[key]}" title="${key}: ${drop.theme[key]}"></span>`).join('')}</div><div class="modal-stats">${glyph('heart',16)} ${drop.likes} likes &nbsp;&nbsp; ${glyph('download',16)} ${drop.downloads} installs</div><div class="modal-actions"><button class="btn primary" data-action="apply-drop" data-id="${drop.id}">${glyph('palette',17)} Apply theme</button><button class="btn secondary" data-action="download-drop" data-id="${drop.id}">${glyph('download',17)} Download</button><button class="btn icon-label" data-action="save-drop" data-id="${drop.id}">${glyph('library',17)} ${state.savedDrops.includes(drop.id)?'Saved':'Save'}</button></div><div class="modal-actions secondary-actions"><button class="text-btn" data-action="star-drop" data-id="${drop.id}">${glyph('heart',15)} ${drop.liked?'Unlike':'Like'} this Drop</button>${state.user?.id===drop.ownerId?`<button class="text-btn danger" data-action="remove-drop" data-id="${drop.id}">${glyph('trash',15)} Delete my Drop</button>`:''}</div></div>`);}
function packageTheme(name=state.themeName,theme=state.theme){return {format:'lightning.theme',version:1,name:name.trim()||'My Lightning theme',author:state.user?.username||'Local designer',theme:validateTheme(theme)};}
function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});downloadBlob(filename,blob);}
function downloadBlob(filename,blob){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function say(line){if(!state.companion)return;const sentences=[line,'You can click this box to continue.'];state.log.push({at:new Date().toLocaleTimeString(),text:line});state.dialogueIndex=0;clearInterval(dialogueTimer);clearTimeout(autoTimer);$('#dialogue').hidden=false;typeLine(sentences[0]);}
function typeLine(line){clearInterval(dialogueTimer);const display=$('#dialogueLine');if(!display)return;display.textContent='';let current=0;$('#mascotSprite').src='/assets/lightning-chan-talk.png';dialogueTimer=setInterval(()=>{display.textContent=line.slice(0,++current);if(current%3===0)$('#mascotSprite').src=current%6===0?'/assets/lightning-chan-idle.png':'/assets/lightning-chan-talk.png';if(current>=line.length){clearInterval(dialogueTimer);$('#mascotSprite').src='/assets/lightning-chan-idle.png';if(state.autoDialogue)autoTimer=setTimeout(()=>{$('#dialogue').hidden=true;},2800);}},32);}
async function refreshRemote(kind='all'){
  try{
    if(kind==='all'){const [who,drops]=await Promise.all([api('/api/me'),api('/api/drops')]);state.user=who.user;state.stats=who.stats;state.drops=drops.drops;}
    else if(kind==='drops')state.drops=(await api('/api/drops')).drops;
    if(kind==='all'||kind==='chat')state.messages=(await api('/api/messages?channel='+state.channel)).messages;
    if(state.loaded){if(kind==='chat'&&state.view==='community'&&state.communityTab==='chat') {const list=$('#messageList');if(list){const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<130;list.innerHTML=renderMessages();if(atBottom)scrollChat();}}else if(kind==='drops'&&(state.view==='community'&&state.communityTab==='drops'||state.view==='browse'||state.view==='library'||state.view==='home'))render();else if(kind==='all')render();}
  }catch(error){console.warn('Sync unavailable:',error.message);if(!state.loaded)toast('Could not connect to Lightning server.','bad');}
}
async function downloadDrop(id){try{const response=await fetch(`/api/drops/${encodeURIComponent(id)}/download`);if(!response.ok)throw Error('Download failed');const blob=await response.blob();downloadBlob(`lightning-${id}.json`,blob);await refreshRemote('drops');toast('Theme package downloaded');}catch(e){toast(e.message,'bad');}}
async function handleAction(action,button){const id=button.dataset.id;switch(action){
  case 'menu':$('#sidebar').classList.toggle('open');break;
  case 'profile':state.user?navigate('settings'):renderLogin('login');break;
  case 'show-login':closeModal();renderLogin('login');break;
  case 'switch-auth':renderLogin(button.dataset.mode);break;
  case 'close-auth':closeAuth();break;
  case 'guest':state.guestSeen=true;store('guestSeen',true);closeAuth();navigate('home');break;
  case 'close-modal':closeModal();break;
  case 'open-drops':state.filter='all';navigate('community','drops');break;
  case 'inspect-drop':inspectDrop(id);break;
  case 'save-drop':state.savedDrops=state.savedDrops.includes(id)?state.savedDrops.filter(v=>v!==id):[...state.savedDrops,id];persistPersonal();inspectDrop(id);toast(state.savedDrops.includes(id)?'Saved to Library':'Removed from Library');break;
  case 'apply-drop':{const d=state.drops.find(d=>d.id===id);if(!d)return;state.theme=validateTheme(d.theme);state.themeName=d.title;applyTheme();persistPersonal();closeModal();render();toast(`Applied ${d.title}`);break;}
  case 'download-drop':await downloadDrop(id);break;
  case 'star-drop':if(!state.user){renderLogin('login');return;}try{await send(`/api/drops/${id}/star`,{});await refreshRemote('drops');inspectDrop(id);}catch(e){toast(e.message,'bad');}break;
  case 'remove-drop':if(!window.confirm('Delete your published Drop?'))return;try{await api(`/api/drops/${id}`,{method:'DELETE'});closeModal();await refreshRemote('drops');toast('Drop removed');}catch(e){toast(e.message,'bad');}break;
  case 'save-theme':{const input=$('#themeName');state.themeName=input?.value.trim()||state.themeName;state.myThemes.unshift({id:Date.now(),name:state.themeName,theme:structuredClone(state.theme)});state.myThemes=state.myThemes.slice(0,30);persistPersonal();render();toast('Theme saved to your Library');break;}
  case 'export-theme':downloadJson('lightning-'+(state.themeName||'theme').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json',packageTheme());toast('Theme exported');break;
  case 'import-theme':if($('#themeFileInput'))$('#themeFileInput').click();else {navigate('studio');toast('Choose Import to load your file');}break;
  case 'publish-theme':{if(!state.user){renderLogin('login');return;}const name=$('#themeName')?.value.trim()||state.themeName;state.themeName=name;persistPersonal();showModal(`<div class="modal-head"><span class="mini-overline">SHARE WITH COMMUNITY</span><button class="modal-x" data-action="close-modal">×</button></div><div class="publish-modal"><h2>Publish your theme.</h2><p>Share your current colors and settings as a downloadable Community Drop.</p><form id="publishForm"><label>Theme title<input name="title" maxlength="46" minlength="3" required value="${escapeHTML(name)}"></label><label>Tell people about it<textarea name="description" maxlength="240" minlength="8" required placeholder="What inspired these colors?"></textarea></label><button type="submit" class="btn primary">${glyph('upload',17)} Publish to Drops</button></form></div>`);break;}
  case 'apply-saved-theme':{const item=state.myThemes[Number(button.dataset.index)];if(!item)return;state.theme=validateTheme(item.theme);state.themeName=item.name;applyTheme();persistPersonal();render();toast(`Applied ${item.name}`);break;}
  case 'delete-saved-theme':state.myThemes.splice(Number(button.dataset.index),1);persistPersonal();render();toast('Saved theme deleted');break;
  case 'reset-theme':state.theme={...defaultTheme};state.themeName='My lightning theme';applyTheme();persistPersonal();render();toast('Rebirth theme restored');break;
  case 'logout':await send('/api/logout',{});state.user=null;state.guestSeen=false;store('guestSeen',false);render();renderLogin('login',true);toast('Signed out');break;
  case 'auto-dialogue':state.autoDialogue=!state.autoDialogue;$('#autoDialogue')?.classList.toggle('active',state.autoDialogue);break;
  case 'skip-dialogue':clearInterval(dialogueTimer);$('#dialogue').hidden=true;$('#mascotSprite').src='/assets/lightning-chan-idle.png';break;
  case 'close-dialogue':clearInterval(dialogueTimer);$('#dialogue').hidden=true;break;
  case 'next-dialogue':clearInterval(dialogueTimer);$('#mascotSprite').src='/assets/lightning-chan-idle.png';$('#dialogue').hidden=true;break;
  case 'dialogue-log':showModal(`<div class="modal-head"><span class="mini-overline">LIGHTNING-CHAN / DIALOGUE LOG</span><button class="modal-x" data-action="close-modal">×</button></div><div class="log-modal"><h2>Our little conversations</h2>${state.log.slice(-25).map(m=>`<p><small>${escapeHTML(m.at)}</small> ${escapeHTML(m.text)}</p>`).join('')}</div>`);break;
}}

document.addEventListener('click',async event=>{
  const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
  const tab=event.target.closest('[data-community-tab]');if(tab){state.communityTab=tab.dataset.communityTab;navigate('community');return;}
  const channel=event.target.closest('[data-channel]');if(channel){state.channel=channel.dataset.channel;await refreshRemote('chat');render();return;}
  const filter=event.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;render();return;}
  const preset=event.target.closest('[data-preset]');if(preset){state.theme={...presets[preset.dataset.preset]};applyTheme();render();toast(`${preset.dataset.preset} colors loaded`);return;}
  const button=event.target.closest('[data-action]');if(!button)return;
  if(button.dataset.action==='close-modal' && event.target.closest('.modal-panel') && event.target===button)return;
  if(button.classList.contains('modal-backdrop')&&event.target!==button)return;
  try{await handleAction(button.dataset.action,button);}catch(error){toast(error.message,'bad');}
});
document.addEventListener('submit',async event=>{
  if(!['authForm','chatForm','publishForm'].includes(event.target.id))return;
  event.preventDefault();const form=event.target;
  try{
    if(form.id==='authForm'){
      const formData=new FormData(form);const body={username:String(formData.get('username')||'').trim(),password:String(formData.get('password')||'')};const register=form.dataset.mode==='register';
      const response=await send(register?'/api/register':'/api/login',body);state.user=response.user;state.guestSeen=true;store('guestSeen',true);closeAuth();await refreshRemote('all');navigate('home');toast(`Welcome ${state.user.username}!`);
    }else if(form.id==='chatForm'){
      const input=$('#chatInput');const text=input.value.trim();if(!text)return;input.value='';await send('/api/messages',{channel:state.channel,text});await refreshRemote('chat');scrollChat();
    }else if(form.id==='publishForm'){
      const formData=new FormData(form);const body={title:String(formData.get('title')||'').trim(),description:String(formData.get('description')||'').trim(),theme:state.theme};await send('/api/drops',body);closeModal();state.filter='all';await refreshRemote('drops');navigate('community','drops');toast('Your Drop is live on this server!');
    }
  }catch(error){if(form.id==='authForm')renderLogin(form.dataset.mode,false,error.message);else toast(error.message,'bad');}
});
document.addEventListener('input',event=>{
  const field=event.target.dataset.themeField;
  if(field){const value=field==='petals'?event.target.checked:field==='glow'||field==='radius'?Number(event.target.value):event.target.value;state.theme[field]=value;applyTheme();const label=$(`[data-color-label="${field}"]`);if(label)label.textContent=value;const other=field==='glow'?$('#glowValue'):field==='radius'?$('#radiusValue'):null;if(other)other.textContent=value+(field==='glow'?'%':'px');}
  if(event.target.id==='notesArea'){state.notes=event.target.value;store('notes',state.notes);}
  if(event.target.id==='themeName'){state.themeName=event.target.value;store('themeName',state.themeName);}
});
document.addEventListener('change',async event=>{
  if(event.target.id==='dropSort'){state.sort=event.target.value;render();}
  if(event.target.id==='companionToggle'){state.companion=event.target.checked;store('companion',state.companion);applyTheme();render();if(state.companion)say('Lightning-chan Mode activated! I missed you! ✦');}
  if(event.target.id==='motionToggle'){state.motion=event.target.checked;store('motion',state.motion);applyTheme();render();}
  if(event.target.id==='themeFileInput'){
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>15000)throw Error('That theme file is too large');const data=JSON.parse(await file.text());if(data.format!=='lightning.theme'||data.version!==1)throw Error('This is not a Lightning theme package');state.theme=validateTheme(data.theme);state.themeName=String(data.name||'Imported theme').slice(0,46);applyTheme();persistPersonal();render();toast(`${state.themeName} imported and applied`);}catch(error){toast(error.message,'bad');}
  }
});
$('#searchInput').addEventListener('keydown',event=>{if(event.key==='Enter'){state.search=event.target.value;navigate('browse');}});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#searchInput').focus();$('#searchInput').select();}if(event.key==='Escape'){closeModal();if($('#authLayer').innerHTML&&state.guestSeen)closeAuth();$('#sidebar').classList.remove('open');}});
window.addEventListener('hashchange',()=>{const hash=location.hash.replace('#','').split('/');state.view=navLinks.some(x=>x[0]===hash[0])?hash[0]:'home';if(hash[0]==='community')state.communityTab=hash[1]==='drops'?'drops':'chat';render();});

async function boot(){
  applyTheme();const hash=location.hash.replace('#','').split('/');state.view=navLinks.some(x=>x[0]===hash[0])?hash[0]:'home';if(hash[0]==='community'&&hash[1]==='drops')state.communityTab='drops';
  await refreshRemote('all');state.loaded=true;render();
  if(!state.user && !state.guestSeen)renderLogin('login',true);
  eventSource=new EventSource('/api/events');eventSource.addEventListener('refresh',async event=>{try{const {kind}=JSON.parse(event.data);await refreshRemote(kind);}catch{}});
  if(state.companion)say('Lightning is looking good today, don’t you think?');
}
boot();
