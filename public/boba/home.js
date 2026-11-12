import {esc,ico} from './common.js';

const shortcuts=[
 {id:'games',name:'Games',label:'Browse the library',icon:'play',tag:'PLAY'},
 {id:'chat',name:'Community',label:'Channels & messages',icon:'people',tag:'CONNECT'},
 {id:'ai',name:'Celestial AI',label:'Ask something new',icon:'ask',tag:'CREATE'},
 {id:'settings',name:'Personalize',label:'Make it yours',icon:'settings',tag:'CUSTOMIZE'}
];

function greeting(){
 const hour=new Date().getHours();
 return hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
}
const dateLabel=()=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date());

// Home is a functional launchpad, not a second copy of the browser's new tab page.
export function mountHome(root,user,navigate,openBrowser){
 const name=esc(user.username);
 root.innerHTML=`
 <div class="cel-hub">
  <header class="cel-hub-top">
   <div class="cel-hub-brand"><span class="cel-hub-brandmark">✦</span><span>CELESTIAL <i>/</i> HOME</span></div>
   <span class="cel-hub-today" data-date></span>
  </header>
  <div class="cel-hub-content">
   <div class="cel-hub-welcome"><span class="cel-hub-intro"><i></i> YOUR WORKSPACE</span>
    <h1>${esc(greeting())}, <span>${name}</span><em>.</em></h1>
    <p>Everything you need, without the extra noise.</p>
   </div>
   <div class="cel-hub-feature-layout">
    <section class="cel-hub-browser" aria-labelledby="hub-browser-heading">
     <div class="cel-hub-browser-ornament" aria-hidden="true"><span></span><span></span><span></span></div>
     <div class="cel-hub-browser-top"><span class="cel-hub-overline">01 / DISCOVER</span><span class="cel-hub-arrow">↗</span></div>
     <div class="cel-hub-browser-main">
      <div class="cel-hub-browser-mark">${ico('web')}</div>
      <h2 id="hub-browser-heading">Where to?</h2>
      <p>Pick up where you left off, or go somewhere new.</p>
      <form class="cel-hub-search" data-search>
       ${ico('search')}
       <input type="text" aria-label="Search or enter a website" placeholder="Search the web or enter a URL" autocomplete="off" spellcheck="false">
       <button type="submit" aria-label="Go to website">↗</button>
      </form>
      <div class="cel-hub-browser-foot"><span>Powered by your Celestial browser</span><button type="button" data-go="browser">Open browser <span>↗</span></button></div>
     </div>
    </section>
    <section class="cel-hub-side" aria-label="Featured destinations">
     <button class="cel-hub-sidecard cel-hub-games" type="button" data-go="games">
      <span class="cel-hub-overline">02 / PLAY</span>
      <span class="cel-hub-side-graphic" aria-hidden="true">♞</span>
      <span class="cel-hub-side-bottom"><strong>Game library</strong><small>Chess, 2048, UmaVersus & more</small></span>
      <span class="cel-hub-corner">↗</span>
     </button>
     <button class="cel-hub-sidecard cel-hub-social" type="button" data-go="chat">
      <span class="cel-hub-overline">03 / CONNECT</span>
      <span class="cel-hub-bubbles" aria-hidden="true"><i>✳</i><i>#</i><i>✦</i></span>
      <span class="cel-hub-side-bottom"><strong>Community</strong><small>Servers, channels, and DMs</small></span>
      <span class="cel-hub-corner">↗</span>
     </button>
    </section>
   </div>
   <section class="cel-hub-explore" aria-labelledby="hub-launch-heading">
    <div class="cel-hub-sectionhead"><div><span class="cel-hub-overline">YOUR SHORTCUTS</span><h2 id="hub-launch-heading">Jump back in.</h2></div><span>Everything, one click away.</span></div>
    <div class="cel-hub-shortcuts">
     ${shortcuts.map(item=>`<button type="button" data-go="${item.id}" class="cel-hub-shortcut"><span class="cel-hub-shortcut-icon">${ico(item.icon)}</span><span><small>${item.tag}</small><strong>${item.name}</strong><em>${item.label}</em></span><b aria-hidden="true">↗</b></button>`).join('')}
    </div>
   </section>
   <footer class="cel-hub-footer"><span>✦</span> Your space. Your pace.</footer>
  </div>
 </div>`;
 root.querySelector('[data-date]').textContent=dateLabel();
 const search=root.querySelector('[data-search]');
 search.onsubmit=event=>{
  event.preventDefault();
  const text=search.querySelector('input').value.trim();
  if(!text)return navigate('browser');
  const target=/^(?:https?:\/\/)/i.test(text)?text:
   /^(?:localhost|(?:[a-z\d-]+\.)+[a-z]{2,})(?::\d+)?(?:\/\S*)?$/i.test(text)?'https://'+text:
   'https://www.google.com/search?q='+encodeURIComponent(text);
  if(typeof openBrowser==='function')openBrowser(target);
  else navigate('browser');
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-go]');
  if(button)navigate(button.dataset.go);
 });
}
