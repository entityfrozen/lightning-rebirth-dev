// A one-time, dismissible academic welcome screen. Not an access-control
// bypass: authenticated pages and browser inspection remain unchanged.
(()=>{
 const key='celestial.school.intro.v1';
 if(window.self!==window.top)return;
 try{if(sessionStorage.getItem(key)==='seen')return;}catch{}
 const overlay=document.createElement('div');
 overlay.className='cel-school-cover';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-label','Brightpath Academy welcome');
 overlay.setAttribute('aria-modal','true');
 overlay.innerHTML='<header class="cel-school-top"><div class="cel-school-utility"><div class="cel-school-brand"><span class="cel-school-seal" aria-hidden="true">B</span><div><strong>Brightpath Academy</strong><small>Explore · Learn · Create</small></div></div><span class="cel-school-meta">WELCOME TO OUR COMMUNITY</span></div><nav class="cel-school-nav" aria-label="Welcome sections"><div><span>Home</span><span>Academics</span><span>Student Life</span><span>Resources</span></div></nav></header><main class="cel-school-hero"><section class="cel-school-banner"><div class="cel-school-caption"><span>YOUR SPACE TO GROW</span><h1>Welcome to Brightpath</h1><p>A place for curiosity, creativity, and connection.</p></div></section></main><footer class="cel-school-bottom"><p>Welcome to your Brightpath workspace.</p><button class="cel-school-enter" type="button">Enter Brightpath →</button></footer>';
 document.body.append(overlay);
 let closed=false;
 const close=()=>{
  if(closed)return;closed=true;
  clearTimeout(timer);
  try{sessionStorage.setItem(key,'seen')}catch{}
  overlay.remove();
 };
 overlay.querySelector('button').addEventListener('click',close);
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
 const timer=setTimeout(close,2400);
 overlay.querySelector('button').focus();
})();
