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
  await page.goto(base+'/#browser',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('input[name="username"]').fill('SmokeAdmin');
  await page.locator('input[name="password"]').fill(password);
  await page.locator('.auth-fields form button').click();
  await page.locator('.forest-browser-home input[aria-label="Search or enter a URL"]')
    .waitFor({timeout:25000});

  const isolation=await page.evaluate(()=>window.crossOriginIsolated);
  assert.equal(isolation,true,'Celestial must be cross-origin isolated for Scramjet');
  await page.getByRole('textbox',{name:'Search or enter a URL'})
    .fill('https://example.com');
  await page.getByRole('textbox',{name:'Search or enter a URL'}).press('Enter');
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
  await page.screenshot({path:path.join(screenshots,'browser.png'),fullPage:true});
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
  await page.screenshot({path:path.join(screenshots,'full-chat.png'),fullPage:true});

  // Settings is a real workspace with working navigation.
  await page.locator('.dock').getByRole('button',{name:'Settings'}).click();
  await page.locator('.celestial-settings-page').waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,'settings.png'),fullPage:true});
  await page.locator('.celestial-settings-nav').getByRole('button',{name:/Admin console/}).click();
  await page.locator('.celestial-console').waitFor({timeout:15000});
  await page.getByRole('tab',{name:/Directory/}).click();
  await page.locator('.celestial-console-member-row').first().waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,'admin-console.png'),fullPage:true});

  // Browser fullscreen must be native (a real fullscreenElement) and reversible.
  await page.locator('.dock').getByRole('button',{name:'Browser'}).click();
  await page.locator('.forest-browser.has-tabs').waitFor({timeout:15000});
  await page.getByRole('button',{name:'Enter fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('celestial-browser-v2'),
    null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'browser-fullscreen.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement===null,null,{timeout:10000});

  // The new library must list websites actually visited in this session.
  await page.getByRole('button',{name:'Library'}).click();
  await page.locator('.celestial-browser-library').waitFor({timeout:10000});
  await page.locator('.celestial-library-recent').first().waitFor({timeout:10000});
  await page.screenshot({path:path.join(screenshots,'browser-library.png'),fullPage:true});
  await page.getByRole('button',{name:'Close library'}).click();

  // Fullscreen is also available for real playable Apps, not just webpages.
  await page.locator('.dock').getByRole('button',{name:'Apps'}).click();
  await page.locator('.celestial-app-tile').filter({hasText:'2048'}).click();
  await page.getByRole('button',{name:'Play fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('celestial-tool-shell'),
    null,{timeout:10000});
  await page.screenshot({path:path.join(screenshots,'game-fullscreen.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit game fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement===null,null,{timeout:10000});

  console.log(JSON.stringify({
    ok:true,worker,state,scriptPaths:[...scriptPaths],
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
