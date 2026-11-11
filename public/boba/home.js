import {esc,ico} from './common.js';

// Home is deliberately its own view: the browser keeps its tabs and session.
export function mountHome(root,user,navigate,openBrowser){
 const hour=new Date().getHours();
 const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
 root.innerHTML=`<div class="cel-home">
  <div class="cel-home-top"><span class="cel-home-kicker">YOUR SPACE</span><span class="cel-home-date" data-date></span></div>
  <section class="cel-home-hero">
   <div class="cel-star-halo"><img src="/assets/celestial-star.svg" alt="Celestial star" class="cel-home-star"></div>
   <div class="cel-home-eyebrow">CELESTIAL</div>
   <h1>${esc(greeting)}, ${esc(user.username)}.</h1>
   <p>Your corner of the internet, all in one place.</p>
   <button type="button" class="cel-home-primary" data-go="browser">${ico('web')} Open browser</button>
  </section>
  <section class="cel-home-links" aria-label="Quick access">
   <button type="button" data-go="browser"><span class="cel-short-icon">${ico('web')}</span><strong>Browser</strong><small>Continue where you left off</small></button>
   <button type="button" data-go="games"><span class="cel-short-icon">${ico('play')}</span><strong>Games</strong><small>Take a quick break</small></button>
   <button type="button" data-go="chat"><span class="cel-short-icon">${ico('people')}</span><strong>Community</strong><small>Catch up with everyone</small></button>
   <button type="button" data-go="ai"><span class="cel-short-icon">${ico('ask')}</span><strong>Ask AI</strong><small>Get answers instantly</small></button>
  </section>
  <footer class="cel-home-foot"><img src="/assets/celestial-star.svg" alt=""> Celestial · Make some space for yourself.</footer>
 </div>`;
 root.querySelector('[data-date]').textContent=new Date().toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
 root.addEventListener('click',e=>{
  const item=e.target.closest('[data-go]');
  if(!item)return;
  if(item.dataset.go==='browser')navigate('browser');
  else navigate(item.dataset.go);
 });
}
