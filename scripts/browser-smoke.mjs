/**
 * Real Chromium smoke test. Checks what unit tests cannot:
 * Scramjet's service worker and controller actually initialize in a browser.
 * Uses a disposable local store; never connects to live Railway account data.
 *
 * Usage: npm install --no-save playwright@1.65.0
 *        npx playwright install chromium
 *        node scripts/browser-smoke.mjs
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(tmpdir(),'celestial-browser-smoke-'));
const port=41000+Math.floor(Math.random()*9000);
const base='http://127.0.0.1:'+port;
const screenshots=path.join(root,'artifacts','browser-smoke');
const password='a smoke-test secret password 2026';
let server, browser;
let output='';
const events=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function boot(){
  server=spawn(process.execPath,['server.js'],{
    cwd:root,
    env:{...process.env,PORT:String(port),BOLT_DATA_DIR:dataDir,
      LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
      BOLT_ADMIN_USER:'SmokeAdmin',BOLT_ADMIN_PASSWORD:password,
      DISABLE_WEB_PROXY:'0',OPENAI_API_KEY:'',NVIDIA_API_KEY:''},
    stdio:['ignore','pipe','pipe']
  });
  for(const pipe of [server.stdout,server.stderr]){
    pipe.on('data',chunk=>{
      output=(output+chunk.toString()).slice(-30000);
    });
  }
  const deadline=Date.now()+150000;
  while(Date.now()<deadline){
    if(server.exitCode!==null)throw Error('Test server exited: '+output.slice(-4000));
    try{
      const response=await fetch(base+'/api/me');
      if(response.ok){
        const status=await fetch(base+'/api/browser/status');
        const body=await status.json();
        if(!body.proxy)throw Error('Proxy bootstrap is missing: '+output.slice(-1500));
        return;
      }
    }catch(error){
      if(/Proxy bootstrap is missing/.test(error.message))throw error;
    }
    await pause(400);
  }
  throw Error('Server startup timed out: '+output.slice(-5000));
}

try{
  await mkdir(screenshots,{recursive:true});
  await boot();
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  // Reproduce the unmodified launcher: about:blank is the top-level document,
  // with Celestial inside a cross-site iframe.
  const launcher=await browser.newPage({viewport:{width:1180,height:780}});
  const launcherEvents=[];
  let launcherWorks=false;
  launcher.on('console',msg=>{
    if(msg.type()==='error')launcherEvents.push('console: '+msg.text().slice(0,240));
  });
  launcher.on('pageerror',error=>launcherEvents.push('page: '+error.message.slice(0,240)));
  launcher.on('requestfailed',request=>launcherEvents.push('network: '+request.url()+
    ' '+(request.failure()?.errorText||'')));
  launcher.on('response',response=>{
    if(response.url().startsWith(base))launcherEvents.push('response: '+
      response.status()+' '+response.url().slice(0,120));
  });
  await launcher.goto('about:blank');
  await launcher.setContent(`<iframe title="Lightning launcher" src="${base}/legacy.html?legacy=1#apps"
    style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`);
  try{
    const embedded=launcher.frameLocator('iframe');
    await embedded.locator('input[name="username"]').waitFor({timeout:8500});
    const framed=await embedded.locator('body')
      .evaluate(()=>({embedded:window.top!==window,selfIsolated:window.crossOriginIsolated}));
    assert.equal(framed.embedded,true,'Launcher must render Celestial in an iframe');
    launcherWorks=true;
    assert.equal(framed.selfIsolated,false,'A launcher iframe is not cross-origin isolated');
  }catch(error){
    // Some Chromium versions block opaque-origin -> loopback navigation.
    // Still verify the real HTTPS launcher separately; do not let this local
    // networking restriction skip the core Browser and Chat smoke tests.
    console.warn('Local launcher probe unavailable:',error.message.slice(0,170));
    console.warn('Launcher frames:',JSON.stringify(launcher.frames().map(f=>f.url())));
    console.warn('Launcher events:',launcherEvents.slice(-15).join(' | '));
  }
  await launcher.screenshot({path:path.join(screenshots,'about-blank-launcher.png')});
  await launcher.close();

  // The default site is now the native Boba application, without React.
  const boba=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  boba.on('pageerror',e=>events.push('Native: '+e.message));
  await boba.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await boba.locator('.auth.gl.g2').waitFor({timeout:25000});
  await boba.screenshot({path:path.join(screenshots,'boba-login.png'),fullPage:true});
  await boba.getByRole('button',{name:'Create account',exact:true}).click();
  await boba.locator('input[name="confirmPassword"]').waitFor({timeout:5000});
  await boba.getByRole('button',{name:'Sign in',exact:true}).click();
  await boba.locator('input[name="username"]').fill('SmokeAdmin');
  await boba.locator('input[name="password"]').fill(password);
  await boba.locator('form button[type="submit"]').click();
  await boba.locator('nav#dock .dk').first().waitFor({timeout:25000});
  assert.equal(await boba.locator('#dock .dk').count(),8);
  await boba.locator('[data-section="admin"]').click();
  await boba.locator('[data-view="admin"].on [data-nvidia]').filter({hasText:'Not set'}).waitFor({timeout:10000});
  await boba.locator('[data-view="admin"] input[name="nvidia"]').fill('test-nvidia-not-a-real-key');
  await boba.locator('[data-provider-form] button[type="submit"]').click();
  await boba.locator('[data-nvidia]').filter({hasText:'Configured'}).waitFor({timeout:10000});
  assert.equal(await boba.locator('[data-provider-form] input[name="nvidia"]').inputValue(),'');
  assert.ok(!(await boba.evaluate(async()=>JSON.stringify(await (await fetch('/api/admin/config')).json()))).includes('test-nvidia-not-a-real-key'));
  await boba.locator('[data-section="ai"]').click();
  await boba.locator('[data-view="ai"].on .ai-hi .sugs button').first().waitFor({timeout:10000});
  assert.equal(await boba.locator('#celestialWorkspace,iframe.boba-app-host,script[src="/bundle/main.js"]').count(),0);
  assert.ok(await boba.locator('body').evaluate(()=>[...document.styleSheets].some(s=>s.href?.includes('/boba/dist/assets/'))));
  assert.equal(await boba.locator('script[src="/boba/native.js"],link[href="/boba/original.css"]').count(),0);
  assert.equal(await boba.locator('script[src*="/boba/dist/assets/app-"]').count(),1);
  await boba.locator('[data-section="apps"]').click();
  await boba.locator('[data-view="apps"].on .native-tile').first().waitFor({timeout:10000});
  await boba.screenshot({path:path.join(screenshots,'boba-native-apps.png'),fullPage:true});
  await boba.locator('[data-section="settings"]').click();
  await boba.locator('[data-view="settings"].on [data-v="matcha"]').click();
  assert.equal(await boba.locator('html').getAttribute('data-palette'),'matcha');
  await boba.locator('[data-section="account"]').click();
  await boba.locator('[data-view="account"].on [data-admin]:not([hidden])').waitFor({timeout:10000});
  await boba.locator('[data-section="chat"]').click();
  await boba.locator('[data-view="chat"].on [data-status]').filter({hasText:'Live'}).waitFor({timeout:10000});
  await boba.locator('.native-compose input').fill('Native Boba smoke message');
  await boba.locator('.native-compose button').click();
  await boba.locator('.native-feed').getByText('Native Boba smoke message',{exact:true}).waitFor({timeout:10000});
  const posted=boba.locator('.native-message').filter({hasText:'Native Boba smoke message'});
  assert.match(await posted.locator('.native-role').textContent(),/ADMIN/);
  assert.doesNotMatch(await posted.locator('.native-role').textContent(),/[\[\]]/);
  const postedTime=await posted.locator('small[datetime]').getAttribute('datetime');
  assert.ok(postedTime && Number.isFinite(Date.parse(postedTime)),'timestamp uses the original message date');
  boba.once('dialog',dialog=>dialog.accept());
  await posted.locator('[data-delete-message]').click({force:true});
  await boba.locator('.native-feed').getByText('Native Boba smoke message',{exact:true}).waitFor({state:'detached',timeout:10000});

  // Administrator can clear the entire active public channel.
  await boba.locator('[data-section="chat"]').click();
  await boba.locator('.native-compose input').fill('Clear channel smoke test');
  await boba.locator('.native-compose button').click();
  await boba.locator('.native-feed').getByText('Clear channel smoke test',{exact:true}).waitFor({timeout:10000});
  boba.once('dialog',dialog=>dialog.accept());
  await boba.locator('[data-clear-chat]').click();
  await boba.locator('.native-feed').getByText('Clear channel smoke test',{exact:true}).waitFor({state:'detached',timeout:10000});
  await boba.locator('[data-section="browser"]').click();
  await boba.locator('[data-omni]').fill('https://example.com/');
  await boba.locator('[data-omni]').press('Enter');
  await boba.waitForFunction(()=>Array.from(document.querySelectorAll('.page iframe')).some(f=>f.src.includes('/~/sj/')),{},{timeout:45000});
  await boba.screenshot({path:path.join(screenshots,'boba-native-browser.png'),fullPage:true});
  await boba.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await mobile.goto(base+'/legacy.html?legacy=1',{waitUntil:'domcontentloaded',timeout:30000});
  await mobile.locator('.auth-sheet--v2').waitFor({timeout:25000});
  await mobile.screenshot({path:path.join(screenshots,'login-mobile.png'),fullPage:true});
  await mobile.getByRole('button',{name:'Create account',exact:true}).click();
  await mobile.locator('input[name="confirmPassword"]').waitFor({timeout:5000});
  await mobile.screenshot({path:path.join(screenshots,'signup-mobile.png'),fullPage:true});
  await mobile.getByRole('button',{name:'Sign in',exact:true}).click();
  await mobile.locator('input[name="username"]').fill('SmokeAdmin');
  await mobile.locator('input[name="password"]').fill(password);
  await mobile.locator('.auth-fields form button[type="submit"]').click();
  await mobile.locator('nav[aria-label="Main navigation"] .dock-link').first()
    .waitFor({timeout:25000});
  const mobileNav=await mobile.evaluate(()=>{
    const root=document.querySelector('nav[aria-label="Main navigation"]');
    const rect=root?.getBoundingClientRect();
    return {
      bottom:rect?.bottom,
      labels:[...root.querySelectorAll('.dock-link')].map(button=>
        button.querySelector('.dock-link-label')?.textContent),
      canReadLabels:[...root.querySelectorAll('.dock-link-label')].every(label=>
        getComputedStyle(label).display!=='none')
    };
  });
  assert.deepEqual(mobileNav.labels,['Home','Browser','Apps','Chat','AI','Settings']);
  assert.equal(mobileNav.canReadLabels,true,'Mobile tabs need visible text');
  assert.ok(Math.abs(mobileNav.bottom-844)<5,'Mobile navigation must be at the bottom');
  await mobile.screenshot({path:path.join(screenshots,'navigation-mobile.png'),fullPage:true});
  await mobile.locator('.forest-browser.home-mode .forest-wordmark').waitFor({timeout:12000});
  await mobile.waitForFunction(()=>{
    const title=document.querySelector('.forest-browser.home-mode .forest-browser-home');
    return title && parseFloat(getComputedStyle(title).opacity)>.97;
  },null,{timeout:3000});
  await mobile.screenshot({path:path.join(screenshots,'flare-home-mobile.png'),fullPage:true});
  await mobile.close();

  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const scriptPaths=new Set();
  page.on('request',req=>{
    const route=new URL(req.url()).pathname;
    if(['/proxy-entry.js','/sw.js','/scram/scramjet.js',
      '/controller/controller.api.js','/scram/scramjet-utils.js',
      '/clients/libcurl-client.js','/scram/scramjet.wasm'].includes(route)){
      scriptPaths.add(route);
    }
  });
  page.on('console',msg=>{
    if(msg.type()==='error')events.push('console: '+msg.text().slice(0,350));
  });
  page.on('pageerror',error=>events.push('page: '+error.message.slice(0,500)));
  await page.goto(base+'/legacy.html?legacy=1#browser',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.auth-sheet--v2').waitFor({timeout:25000});
  await page.screenshot({path:path.join(screenshots,'login-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.locator('input[name="confirmPassword"]').waitFor({timeout:5000});
  await page.screenshot({path:path.join(screenshots,'signup-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.locator('input[name="confirmPassword"]').waitFor({state:'detached'});
  await page.locator('input[name="username"]').fill('SmokeAdmin');
  await page.locator('input[name="password"]').fill(password);
  await page.locator('.auth-fields form button[type="submit"]').click();
  await page.locator('.forest-browser-home input[aria-label="Search or enter a URL"]')
    .waitFor({timeout:25000});

  const primaryLabels=await page.locator('nav[aria-label="Main navigation"] .dock-link')
    .evaluateAll(buttons=>buttons.map(button=>button.getAttribute('aria-label')));
  assert.deepEqual(primaryLabels,['Home','Browser','Apps','Chat','AI','Settings']);
  const desktopDock=await page.locator('.dock-shell').evaluate(element=>{
    const r=element.getBoundingClientRect();
    return {bottom:r.bottom,width:r.width,left:r.left};
  });
  assert.ok(Math.abs(desktopDock.bottom-889)<6,
    'Desktop navigation should sit along the bottom with a small gap');
  assert.ok(desktopDock.width>650 && desktopDock.width<900,
    'Desktop navigation should be a compact centered dock');
  await page.getByRole('button',{name:'Quick switch (Ctrl+K)'}).click();
  await page.getByRole('dialog',{name:'Switch to a page'})
    .getByRole('textbox',{name:'Find a page'}).fill('apps');
  await page.getByRole('dialog',{name:'Switch to a page'})
    .getByRole('button',{name:/Apps/}).click();
  await page.locator('.celestial-apps-page').waitFor({timeout:15000});
  await page.getByRole('button',{name:'Browser',exact:true}).first().click();
  await page.locator('.forest-browser-home input[aria-label="Search or enter a URL"]')
    .waitFor({timeout:25000});
  await page.screenshot({path:path.join(screenshots,'navigation-desktop.png'),fullPage:true});

  const isolation=await page.evaluate(()=>window.crossOriginIsolated);
  assert.equal(isolation,true,'Celestial must be cross-origin isolated for Scramjet');
  await page.getByRole('button',{name:'Home',exact:true}).first().click();
  await page.locator('.forest-browser.home-mode .forest-wordmark').waitFor({timeout:15000});
  await page.waitForFunction(()=>{
    const title=document.querySelector('.forest-browser.home-mode .forest-browser-home');
    return title && parseFloat(getComputedStyle(title).opacity)>.97;
  },null,{timeout:3000});
  assert.equal(await page.locator('.forest-browser.home-mode input[aria-label="Search or enter a URL"]').isVisible(),
    true,'Homepage Search should be visible after the entrance animation');
  await page.screenshot({path:path.join(screenshots,'flare-home-desktop.png'),fullPage:true});
  const homeSearch=page.locator('.forest-browser.home-mode input[aria-label="Search or enter a URL"]');
  await homeSearch.fill('https://example.com');
  await page.locator('.forest-browser.home-mode button[aria-label="Search"]').click();
  await page.locator('.forest-browser.is-browsing').waitFor({timeout:20000});
  await page.locator('iframe.portal-iframe').waitFor({timeout:20000});

  await page.waitForFunction(()=>{
    const frame=document.querySelector('iframe.portal-iframe');
    return Boolean(frame && frame.src &&
      (frame.src.includes('/~/sj/')||frame.src.includes('/scram/')));
  },null,{timeout:45000});
  const worker=await page.evaluate(async()=>{
    const registrations=await navigator.serviceWorker.getRegistrations();
    return registrations.map(row=>({
      scope:row.scope,script:row.active?.scriptURL||null,state:row.active?.state||null
    }));
  });
  console.log('Scramjet worker registrations:',JSON.stringify(worker));
  for(const required of ['/proxy-entry.js','/scram/scramjet.js',
      '/controller/controller.api.js','/scram/scramjet-utils.js',
      '/clients/libcurl-client.js']){
    assert.ok(scriptPaths.has(required),'Required browser asset never loaded: '+required+
      '\nObserved: '+[...scriptPaths].join(', ')+'\n'+events.join('\n'));
  }
  const state=await page.evaluate(()=>({
    iframe:document.querySelector('iframe.portal-iframe')?.src,
    sw:navigator.serviceWorker.controller?.scriptURL||'',
    isolated:window.crossOriginIsolated
  }));
  await page.waitForFunction(()=>{
    const loader=document.querySelector('.celestial-browser-loading');
    const failure=document.querySelector('.celestial-browser-failure');
    return !loader&&!failure;
  },null,{timeout:15000}).catch(async error=>{
    const state=await page.evaluate(()=>({
      overlay:document.querySelector('.celestial-browser-loading')?.textContent||null,
      error:document.querySelector('.celestial-browser-failure')?.textContent||null,
      iframe:document.querySelector('iframe.portal-iframe')?.src||null
    }));
    throw Error('Proxy content rendered but browser overlay stayed visible: '+
      JSON.stringify(state)+'; '+error.message);
  });
  // Fullscreen requires a real user click and must exit without dropping
  // the active proxied frame.
  await page.getByRole('button',{name:'Enter browser fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('forest-browser'),
    null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'browser-fullscreen.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit browser fullscreen'}).click();
  await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:10000});
  const originalFrame=await page.locator('iframe.portal-iframe').first().getAttribute('src');
  assert.equal(originalFrame,state.iframe,'Fullscreen cannot reset the active browser page');
  await page.screenshot({path:path.join(screenshots,'browser.png'),fullPage:true});
  const openTabCount=await page.locator('.flare-browser-bottom-tabs .forest-tab').count();
  assert.ok(openTabCount>=1,'Browser tabs should appear in the bottom strip');
  await page.getByRole('button',{name:'Close browser and return Home'}).click();
  await page.locator('.forest-browser.home-mode').waitFor({timeout:15000});
  const hiddenTabSrc=await page.locator('iframe.portal-iframe').first().getAttribute('src');
  assert.equal(hiddenTabSrc,state.iframe,'Closing Browser should preserve the active tab');
  await page.getByRole('button',{name:'Browser',exact:true}).first().click();
  await page.locator('.forest-browser.is-browsing').waitFor({timeout:15000});
  const reopenedTabSrc=await page.locator('iframe.portal-iframe').first().getAttribute('src');
  assert.equal(reopenedTabSrc,state.iframe,'Returning to Browser should reuse the same proxy frame');
  // Prove the rewritten document actually rendered, not merely iframe.src
  // being set. This uses example.com's public, static page as the smoke target.
  await page.waitForFunction(()=>{
    const frame=document.querySelector('iframe.portal-iframe');
    try{
      const document=frame?.contentDocument;
      return Boolean(document?.title==='Example Domain' &&
        document?.body?.innerText?.length>80);
    }catch{return false;}
  },null,{timeout:30000}).catch(async error=>{
    const snapshot=await page.evaluate(()=>{
      const frame=document.querySelector('iframe.portal-iframe');
      try{return {
        url:frame?.src,
        title:frame?.contentDocument?.title,
        content:frame?.contentDocument?.body?.innerText?.slice(0,1000)
      };}catch(e){return {url:frame?.src,error:e.message};}
    });
    throw Error('Scramjet did not render the test website: '+
      JSON.stringify(snapshot)+'; original '+error.message);
  });

  // The companion must work without unmounting the proxied iframe.
  await page.getByRole('button',{name:'Open community Chat beside this page'}).click();
  await page.locator('.celestial-messenger.compact').waitFor({timeout:15000});
  const src=await page.locator('iframe.portal-iframe').first().getAttribute('src');
  assert.equal(src,state.iframe,'Opening Chat must not replace the browser tab');
  await page.screenshot({path:path.join(screenshots,'browser-and-chat.png'),fullPage:true});

  // Full chat and the member roster must be usable too.
  await page.getByRole('button',{name:'Chat',exact:true}).first().click();
  await page.locator('.celestial-messenger.full').waitFor({timeout:15000});
  const composer=page.locator('.celestial-messenger.full .messenger-composer');
  await composer.locator('input').fill('Celestial chat smoke test');
  const sendButton=composer.getByRole('button',{name:'Send message'});
  await sendButton.waitFor({state:'visible',timeout:10000});
  assert.equal(await sendButton.isDisabled(),false,
    'The default community room must allow approved accounts to send chat messages');
  await sendButton.click();
  await page.locator('.celestial-messenger.full .messenger-message-text')
    .filter({hasText:'Celestial chat smoke test'}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Fullscreen chat'}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('celestial-messenger'),
    null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'chat-fullscreen.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit chat fullscreen'}).click();
  await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'full-chat.png'),fullPage:true});
  // Admin workspace must be present for the approved bootstrap administrator.
  await page.getByRole('button',{name:'Settings',exact:true}).first().click();
  await page.getByRole('navigation',{name:'Settings categories'}).getByRole('button',
    {name:/Administration/}).click();
  await page.locator('.celestial-admin-console').waitFor({timeout:15000});
  await page.getByRole('textbox',{name:'Search account requests'}).fill('not-a-user');
  await page.getByText('No matching accounts').waitFor({timeout:10000});
  await page.getByRole('textbox',{name:'Search account requests'}).fill('');
  await page.screenshot({path:path.join(screenshots,'administration.png'),fullPage:true});
  // A native fullscreen game should preserve its own component and board.
  await page.getByRole('button',{name:'Apps',exact:true}).first().click();
  await page.locator('.celestial-app-tile').filter({hasText:'2048'}).click();
  await page.locator('.celestial-embedded-game').waitFor({timeout:15000});
  await page.getByRole('button',{name:'Fullscreen game'}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('celestial-tool-shell'),
    null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'game-fullscreen.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit game fullscreen'}).click();
  await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:10000});
  assert.ok(await page.locator('.celestial-embedded-game').count(),
    'Fullscreen must preserve the active game');

  console.log(JSON.stringify({
    ok:true,launcherWorks,worker,state,scriptPaths:[...scriptPaths],
    consoleErrors:events.slice(-12),screenshots
  },null,2));
}catch(error){
  console.error('Browser smoke test failed:',error.message);
  console.error('Browser console:',events.slice(-20).join('\n'));
  console.error('Server output:',output.slice(-4000));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  server?.kill();
  await pause(200);
  await rm(dataDir,{recursive:true,force:true});
}
