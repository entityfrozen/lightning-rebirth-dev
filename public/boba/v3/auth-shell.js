// V3 login shares the existing auth API and validation, but no longer reuses
// Boba's visual shell. The form selectors are a deliberate compatibility contract.
export function mountV3AuthShell(){
  const root=document.getElementById('root');
  if(!root)throw Error('Celestial sign-in root is missing');
  root.innerHTML=
    '<div class="v3-auth-layout">'+
      '<section class="v3-auth-world" aria-label="Welcome to Celestial">'+
        '<header class="v3-auth-brand"><span aria-hidden="true">✦</span><strong>celestial</strong><small>STUDIO / 03</small></header>'+
        '<div class="v3-auth-world-main">'+
          '<div class="v3-auth-signal">THE NEXT CHAPTER <span>✳</span> YOUR DIGITAL SPACE</div>'+
          '<h1>Somewhere<br>to <em>be yourself.</em></h1>'+
          '<p>Your own corner of the internet. A place to explore, connect, and bring every idea to life.</p>'+
        '</div>'+
        '<div class="v3-auth-scene" aria-hidden="true"><div class="v3-auth-scene-grid"></div><canvas data-v3-auth-orbit></canvas><span>✦</span></div>'+
        '<footer class="v3-auth-world-foot"><span>CELESTIAL / NOCTURNE</span><span>AN OPEN SPACE FOR EVERY IDEA</span></footer>'+
      '</section>'+
      '<main class="v3-auth-panel">'+
        '<div class="v3-auth-form-wrap">'+
          '<span class="v3-auth-form-mark">✦</span>'+
          '<span class="v3-auth-eyebrow">WELCOME BACK TO CELESTIAL</span>'+
          '<h2>Make yourself<br><em>at home.</em></h2>'+
          '<p class="v3-auth-description">Your workspace is right where you left it.</p>'+
          '<section class="auth v3-auth-form" aria-label="Celestial account">'+
            '<div class="seg v3-auth-switch" data-amode role="group" aria-label="Account action"><span class="th"></span><button class="on" type="button" data-v="in" aria-pressed="true">Sign in</button><button type="button" data-v="up" aria-pressed="false">Create account</button></div>'+
            '<h3 class="ah" data-atitle hidden></h3>'+
            '<form data-aform>'+
              '<label class="fld" data-f="user"><span class="v3-auth-label">USERNAME</span><input name="username" type="text" minlength="3" maxlength="32" required autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="Enter your username" aria-label="Username"></label>'+
              '<label class="fld" data-f="password"><span class="v3-auth-label">PASSWORD</span><span class="v3-auth-password"><input name="password" type="password" minlength="8" maxlength="128" required autocomplete="current-password" placeholder="Enter your password" aria-label="Password"><button class="reveal" type="button" data-reveal="password" aria-label="Show password">Show</button></span></label>'+
              '<label class="fld" data-f="confirm" hidden><span class="v3-auth-label">CONFIRM PASSWORD</span><span class="v3-auth-password"><input name="confirmPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="Confirm your password" aria-label="Confirm password" disabled><button class="reveal" type="button" data-reveal="confirmPassword" aria-label="Show confirmation password">Show</button></span></label>'+
              '<p class="msg" data-amsg role="status" aria-live="polite" hidden></p>'+
              '<button class="btn k v3-auth-submit" data-asub type="submit">Sign in</button>'+
              '<p class="note" data-anote hidden>New accounts are reviewed by an administrator before approval.</p>'+
              '<div class="alt v3-auth-alt"><button data-alt type="button">Create an account</button></div>'+
            '</form>'+
          '</section>'+
          '<p class="v3-auth-privacy">Secure sign-in · Your space, your account</p>'+
        '</div>'+
        '<footer class="v3-auth-panel-footer"><span>✦ CELESTIAL</span><span>DESIGNED TO FEEL DIFFERENT</span></footer>'+
      '</main>'+
    '</div>';
  // The illustration is optional; failed WebGL never blocks sign-in.
  import('./orbit.js').then(({mountOrbitScene})=>{
    const scene=root.querySelector('[data-v3-auth-orbit]');
    if(scene)mountOrbitScene(scene);
  }).catch(()=>{});
}
