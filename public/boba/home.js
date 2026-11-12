import {esc,ico} from './common.js';
import {uiLabel,viewId} from './opaque-ui.js';

const links=[
  ['browser','Browser','web'],
  ['games',uiLabel(1),'play'],
  ['chat','Community','discord'],
  ['ai','AI','ask']
];

function hello(){
  const hour=new Date().getHours();
  return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
}

export function mountHome(root,user,navigate,openBrowser){
  root.innerHTML=`
    <main class="cel-simple-home">
      <header class="cel-simple-top">
        <div class="cel-simple-wordmark">
          <img src="/assets/celestial-star.svg" width="22" height="22" alt="">
          <span>celestial</span>
        </div>
        <span class="cel-simple-date"></span>
      </header>
      <div class="cel-simple-center">
        <div class="cel-simple-greeting">
          <h1><span data-greeting>${esc(hello())}</span>, ${esc(user.username)}.</h1>
          <p>What would you like to do today?</p>
        </div>
        <form class="cel-simple-search" data-search role="search">
          <span aria-hidden="true">${ico('search')}</span>
          <input type="search" aria-label="Search the web or enter a URL"
            placeholder="Search the web or enter a URL…" autocomplete="off" spellcheck="false">
          <button type="submit" aria-label="Search">↗</button>
        </form>
        <nav class="cel-simple-links" aria-label="Quick access">
          ${links.map(([id,name,icon])=>`<button type="button" data-go="${viewId(id)}"><span class="cel-simple-link-icon">${ico(icon)}</span><span>${name}</span></button>`).join('')}
        </nav>
      </div>
    </main>`;
  const updateGreeting=()=>{const label=root.querySelector('[data-greeting]');if(label)label.textContent=hello();};
  updateGreeting();
  const greetingTimer=setInterval(updateGreeting,60_000);
  // The home view stays mounted for the session; stop refreshing if removed.
  const originalOnRemove=()=>clearInterval(greetingTimer);
  root.addEventListener('celestial:unmount',originalOnRemove,{once:true});
  root.querySelector('.cel-simple-date').textContent=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date());
  root.querySelector('[data-search]').addEventListener('submit',event=>{
    event.preventDefault();
    const query=event.currentTarget.querySelector('input').value.trim();
    if(!query)return navigate('browser');
    const target=/^https?:\/\//i.test(query)?query:
      /^(?:localhost|(?:[a-z\d-]+\.)+[a-z]{2,})(?::\d+)?(?:\/\S*)?$/i.test(query)?'https://'+query:
      'https://www.google.com/search?q='+encodeURIComponent(query);
    if(openBrowser)openBrowser(target);
    else navigate('browser');
  });
  root.querySelector('.cel-simple-links').addEventListener('click',event=>{
    const button=event.target.closest('[data-go]');
    if(button){const link=links.find(([id])=>viewId(id)===button.dataset.go);if(link)navigate(link[0])}
  });
}
