import {esc} from '../common.js';

// V3 home isn't a marketing landing page: its actions navigate into real tools.
export function mountV3Home(root,{user,navigate,openBrowser}) {
  const greeting=()=>{
    const hour=new Date().getHours();
    return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  };
  const today=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date());
  root.innerHTML=
    '<div class="v3-home">'+
      '<div class="v3-home-overline"><span class="v3-signal"><i></i> YOUR WORKSPACE, ONLINE</span><span class="v3-home-date">'+esc(today)+'</span></div>'+
      '<section class="v3-hero" aria-labelledby="v3-hero-title">'+
        '<div class="v3-hero-copy">'+
          '<span class="v3-eyebrow">AN INTERNET OF YOUR OWN <span class="v3-divider-dot">✦</span> V3 STUDIO</span>'+
          '<h1 id="v3-hero-title">A little more<br><em>room to think.</em></h1>'+
          '<p>'+esc(greeting())+', '+esc(user.username)+'. Open something, start a conversation, or follow your curiosity. It all begins here.</p>'+
          '<div class="v3-hero-actions">'+
            '<button class="v3-button v3-button-primary" type="button" data-v3-go="browser">Open browser <span aria-hidden="true">↗</span></button>'+
            '<button class="v3-button v3-button-quiet" type="button" data-v3-go="ai">Ask Celestial <span aria-hidden="true">✧</span></button>'+
          '</div>'+
        '</div>'+
        '<div class="v3-orbit-wrap" aria-hidden="true"><div class="v3-orbit-grid"></div><canvas class="v3-orbit-canvas"></canvas><span class="v3-orbit-center">✦</span><span class="v3-orbit-mark mark-1">CELESTIAL / 03</span><span class="v3-orbit-mark mark-2">AN OPEN SPACE</span></div>'+
        '<div class="v3-hero-index" aria-hidden="true">001 — YOUR SPACE</div>'+
      '</section>'+
      '<section class="v3-quick-search" aria-label="Web search">'+
        '<form data-v3-search><label for="v3-home-search"><span class="v3-quick-search-icon" aria-hidden="true">⌕</span><input id="v3-home-search" type="search" placeholder="Search, explore, or paste a link…" autocomplete="off" spellcheck="false" aria-label="Search the web or enter an address"><span class="v3-quick-shortcut" aria-hidden="true">↵</span></label><button class="v3-button v3-button-primary" type="submit">Go <span aria-hidden="true">↗</span></button></form>'+
      '</section>'+
      '<div class="v3-section-heading"><div><span class="v3-eyebrow">THE ESSENTIALS / 002</span><h2>Make yourself at home.</h2></div><p>Everything useful, nothing in the way.</p></div>'+
      '<section class="v3-feature-grid" aria-label="Workspace tools">'+
        '<button class="v3-feature v3-feature-browser" type="button" data-v3-go="browser"><span class="v3-feature-number">01 / EXPLORE</span><span class="v3-feature-icon" aria-hidden="true">◌</span><strong>Browse.</strong><span>Go beyond the usual tabs. Your next discovery is one click away.</span><span class="v3-feature-arrow" aria-hidden="true">↗</span></button>'+
        '<button class="v3-feature v3-feature-chat" type="button" data-v3-go="chat"><span class="v3-feature-number">02 / CONNECT</span><span class="v3-feature-icon" aria-hidden="true">✳</span><strong>Connect.</strong><span>Conversations and familiar faces, all in one place.</span><span class="v3-feature-arrow" aria-hidden="true">↗</span></button>'+
        '<button class="v3-feature v3-feature-ai" type="button" data-v3-go="ai"><span class="v3-feature-number">03 / CREATE</span><span class="v3-feature-icon" aria-hidden="true">✧</span><strong>Imagine.</strong><span>A thought, a question, an idea. See where it takes you.</span><span class="v3-feature-arrow" aria-hidden="true">↗</span></button>'+
        '<button class="v3-feature v3-feature-settings" type="button" data-v3-go="settings"><span class="v3-feature-number">04 / PERSONALIZE</span><span class="v3-feature-icon" aria-hidden="true">⊞</span><strong>Make it yours.</strong><span>Fine-tune the details until this space feels like you.</span><span class="v3-feature-arrow" aria-hidden="true">↗</span></button>'+
      '</section>'+
      '<footer class="v3-home-footer"><span>✦ CELESTIAL</span><span>Made for the curious.</span><span>VERSION 03 / PREVIEW</span></footer>'+
    '</div>';

  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-v3-go]');
    if(button){event.stopPropagation();navigate(button.dataset.v3Go);}
  });
  root.querySelector('[data-v3-search]').addEventListener('submit',event=>{
    event.preventDefault();
    const input=root.querySelector('#v3-home-search').value.trim();
    if(input)openBrowser(input);
    else navigate('browser');
  });
  let active=true;
  let disposeOrbit=()=>{};
  import('./orbit.js').then(({mountOrbitScene})=>{
    if(active)disposeOrbit=mountOrbitScene(root.querySelector('.v3-orbit-canvas'));
  }).catch(error=>console.warn('Ambient scene unavailable:',error));
  root.addEventListener('celestial:unmount',()=>{active=false;disposeOrbit();},{once:true});
}
