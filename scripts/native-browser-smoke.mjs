/*
 * End-to-end Celestial native browser test.
 * The proxy is only healthy when the sandboxed iframe renders real HTML.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=await mkdtemp(path.join(tmpdir(),'celestial-native-test-'));
const shots=path.join(root,'artifacts','native-browser');
const port=34500+Math.floor(Math.random()*10000);
const origin='http://127.0.0.1:'+port;
const password='isolated native browser admin password';
let errors=[],requestFailures=[],log='',browser;
const server=spawn(process.execPath,['server.js'],{
  cwd:root,env:{...process.env,PORT:String(port),BOLT_DATA_DIR:temp,
    RAILWAY_VOLUME_MOUNT_PATH:'',LIGHTNING_DATA_FILE:path.join(temp,'store.json'),
    BOLT_ADMIN_USER:'BrowserAdmin',BOLT_ADMIN_PASSWORD:password,
    OPENAI_API_KEY:'',NVIDIA_API_KEY:'',DISABLE_WEB_PROXY:'0'},
  stdio:['ignore','pipe','pipe']
});
for(const channel of [server.stdout,server.stderr]){
  channel.on('data',chunk=>{log=(log+String(chunk)).slice(-16000)});
}
async function waitForServer(){
  for(let n=0;n<180;n++){
    if(server.exitCode!==null)throw Error('Server exited: '+log);
    try{if((await fetch(origin+'/api/me')).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw Error('Server startup timed out: '+log);
}
try{
  await mkdir(shots,{recursive:true});
  await waitForServer();
  browser=await chromium.launch({headless:true,
    channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||undefined,
    // The production host is a public HTTPS origin. Mark the ephemeral CI
    // loopback port as public so Chrome's Local Network Access permission
    // does not block an intentionally opaque-origin test frame.
    args:['--disable-dev-shm-usage',
      '--ip-address-space-overrides=127.0.0.1:'+port+'=public,[::1]:'+port+'=public',
      // Test-only: localhost is intentionally loaded by a sandboxed frame.
      '--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessPermissions']});
  const page=await browser.newPage({viewport:{width:1360,height:820}});
  page.on('pageerror',error=>errors.push(String(error.message)));
  page.on('requestfailed',request=>requestFailures.push({
    path:new URL(request.url()).pathname,error:request.failure()?.errorText
  }));
  // Modern Chrome blocks loopback subresources originating from opaque
  // sandbox origins, even with localhost IP-space overrides. Relay only
  // the CI loopback gateway responses through Playwright's Node request
  // client. These are the actual server-generated HTML and JS bytes.
  // Production runs on public HTTPS and does not use this relay.
  await page.route('**/browse/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(url.hostname!=='127.0.0.1'||url.port!==String(port)){
      await route.continue();return;
    }
    try{
      const response=await page.request.fetch(request);
      await route.fulfill({response});
    }catch(error){await route.abort('failed')}
  });
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#academyLanding').waitFor({state:'detached',timeout:30000});
  await page.locator('input[name="username"]').fill('BrowserAdmin');
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.locator('#dock [data-section="s1"]').waitFor({timeout:15000});
  const token=await page.request.get(origin+'/api/browser/token');
  assert.equal(token.status(),200,'Signed-in user can request a browser grant');

  await page.locator('#dock [data-section="s1"]').click();
  await page.locator('[data-view="s1"].on [data-omni]').fill('https://example.com/');
  await page.locator('[data-view="s1"].on [data-omni]').press('Enter');
  const outer=page.locator('[data-view="s1"].on');
  const frame=outer.locator('iframe[title="Page"]');
  await frame.waitFor({timeout:20000});
  const probeResponse=await page.request.get(new URL(await frame.getAttribute('src'),origin).href);
  assert.equal(probeResponse.status(),200,'The gateway must serve a rewritten document');
  assert.match(await probeResponse.text(),/Example Domain/);
  // Example Domain now renders explanatory paragraphs without an <h1>.
  // A valid smoke test checks the final document, not incidental tag choice.
  const node=await frame.elementHandle();
  const inner=await node.contentFrame();
  assert.ok(inner,'The iframe must have an active browsing context');
  await inner.waitForFunction(()=>document.title==='Example Domain'&&
    document.body?.innerText?.trim().length>80,
    null,{timeout:35000});
  const documentInfo=await inner.evaluate(()=>({
    title:document.title,
    length:document.body?.innerText?.trim().length||0,
    state:document.readyState
  }));
  assert.equal(documentInfo.title,'Example Domain');
  assert.ok(documentInfo.length>80,'Remote HTML must contain readable content');
  await page.waitForFunction(()=>{
    const view=document.querySelector('[data-view="s1"].on');
    return view?.querySelector('[data-bl]')?.classList.contains('off')===true;
  },null,{timeout:10000});
  assert.equal(await outer.locator('.native-browser-error').count(),0,
    'A successful page should not show the error panel');
  await page.screenshot({path:path.join(shots,'native-browser-example.png')});

  await page.locator('#dock [data-section="s5"]').click();
  const check=page.locator('[data-browser-test]');
  await check.click();
  await page.getByRole('button',{name:'Page loaded'}).waitFor({timeout:35000});
  const report=await page.locator('[data-browser-log]').textContent();
  assert.match(report||'',/"result": "Passed"/);

  await page.locator('#dock [data-section="s3"]').click();
  await page.locator('.native-messenger').waitFor({timeout:15000});
  assert.deepEqual(errors,[],'Boba and Community UI must not emit uncaught errors');
  console.log('Native browser: external HTML, loading state, page health, Community all passed.');
}catch(error){
  console.error('Native browser smoke failed:',error.stack||error);
  console.error('Chromium errors:',JSON.stringify(errors.slice(-15)));
  console.error('Failed browser requests:',JSON.stringify(requestFailures.slice(-15)));
  console.error('Server output:',log);
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
  await rm(temp,{recursive:true,force:true});
}
