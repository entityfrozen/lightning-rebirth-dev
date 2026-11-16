/**
 * Production-package smoke for the current Boba workspace.
 * Run a real browser against isolated local account data. No public website
 * is needed, so a blocked external Wisp connection cannot fake a UI failure.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(tmpdir(),'boba-package-'));
const shots=path.join(root,'artifacts','boba-package');
const port=35000+Math.floor(Math.random()*7000);
const origin='http://127.0.0.1:'+port;
const password='isolated boba smoke password 2026';
const errors=[];
let browser,logs='';
const server=spawn(process.execPath,['server.js'],{
 cwd:root,
 env:{...process.env,PORT:String(port),BOLT_DATA_DIR:dataDir,
  LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
  BOLT_ADMIN_USER:'BobaAdmin',BOLT_ADMIN_PASSWORD:password,
  DISABLE_WEB_PROXY:'1',OPENAI_API_KEY:'',NVIDIA_API_KEY:''},
 stdio:['ignore','pipe','pipe']
});
for(const stream of [server.stdout,server.stderr]){
 stream.on('data',data=>{logs=(logs+data.toString()).slice(-12000)});
}
async function waitForServer(){
 for(let i=0;i<150;i++){
  if(server.exitCode!==null)throw Error('Boba server exited: '+logs);
  try{if((await fetch(origin+'/api/me')).ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Boba server did not start: '+logs);
}
async function expectPrivate(request,path){
 const response=await request.get(origin+path);
 assert.equal(response.status(),404,path+' must not expose authored source');
}

try{
 await mkdir(shots,{recursive:true});
 await waitForServer();
 browser=await chromium.launch({
  headless:true,channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||undefined,
  args:['--disable-dev-shm-usage']
 });
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>errors.push(error.message));
 const loginSource=await (await page.request.get(origin+'/login')).text();
 assert.match(loginSource,/<title>&#/);
 assert.doesNotMatch(loginSource,/<title>Brightpath/);
 assert.match(loginSource,/<div id="root"><\/div>/);
 assert.doesNotMatch(loginSource,/<form|<input|data-aform/);
 for(const privatePath of [
  '/boba/native.js','/boba/home.js','/boba/shell.js','/boba/chat.js',
  '/boba/auth-shell.js','/boba/view-markers.js','/boba/index.template.html',
  '/boba/dist/.vite/manifest.json','/boba/dist/assets/example.js.map'
 ])await expectPrivate(page.request,privatePath);
 const appSource=await (await page.request.get(origin+'/')).text();
 assert.doesNotMatch(appSource,/Brightpath \| Learning Workspace/);
 const appAsset=appSource.match(/src="(\/boba\/dist\/assets\/app-[a-zA-Z0-9_-]+\.js)"/)?.[1];
 assert.ok(appAsset,'View Source should load a compiled hashed app entry');
 assert.equal((await page.request.get(origin+appAsset)).status(),200);
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.match(await page.title(),/Brightpath/,'HTML entity encoding must not change rendered title');
 await page.locator('input[name="username"]').fill('BobaAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="s0"]').waitFor({timeout:25000});
 assert.equal(await page.locator('#dock .dk').count(),7);
 assert.equal(await page.locator('#dock [data-section="s2"]').count(),0);
 const home=page.locator('[data-view="s0"].on');
 await home.locator('h1').waitFor({timeout:12000});
 assert.match(await home.locator('h1').innerText(),/bobaadmin/i);
 const originalClasses=await home.locator('main').first().getAttribute('class');
 assert.match(originalClasses,/^_bp[0-9a-f]{10}$/,'Semantic authored CSS names should be hashed');
 await page.screenshot({path:path.join(shots,'boba-home.png')});

 // Reopen each tool through the actual dock. Bundled labels still render.
 await page.locator('#dock [data-section="s1"]').click();
 await page.locator('[data-view="s1"].on [data-omni]').waitFor({timeout:15000});
 assert.equal(await page.locator('[data-engine-mode]').count(),1);
 await page.screenshot({path:path.join(shots,'boba-browser.png')});
 await page.locator('#dock [data-section="s3"]').click();
 const chat=page.locator('[data-view="s3"].on');
 await chat.locator('.native-messenger').waitFor({timeout:15000});
 const message='Boba source hardening smoke';
 await chat.locator('textarea[aria-label="Message"]').fill(message);
 await chat.locator('[data-send-btn]').click();
 await chat.getByText(message,{exact:true}).first().waitFor({timeout:12000});
 await page.screenshot({path:path.join(shots,'boba-chat.png')});
 await page.locator('#dock [data-section="s4"]').click();
 await page.locator('[data-view="s4"].on [data-aq]').waitFor({timeout:15000});
 await page.locator('#dock [data-section="s5"]').click();
 await page.locator('[data-view="s5"].on [data-tab-blank]').waitFor({timeout:15000});
 await page.locator('#dock [data-section="s7"]').click();
 await page.locator('[data-view="s7"].on').waitFor({timeout:10000});
 await page.locator('#dock [data-section="s6"]').click();
 await page.locator('[data-view="s6"].on').waitFor({timeout:15000});
 assert.equal(await page.locator('.native-start-error').count(),0,
  'Original Boba feature modules must mount successfully');
 assert.deepEqual(errors,[], 'No uncaught UI JavaScript errors expected');

 await page.locator('#dock [data-section="s0"]').click();
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-view="s0"].on h1').waitFor();
 assert.equal(await page.locator('#dock .dk').count(),7);
 await page.screenshot({path:path.join(shots,'boba-mobile.png')});
 console.log('Boba packaging, login, source isolation, all feature routes, chat and mobile smoke passed.');
}catch(error){
 console.error('Boba packaging smoke failed:',error.stack||error.message);
 console.error('Page errors:',errors.slice(-15));
 console.error('Server log:',logs);
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
 await rm(dataDir,{recursive:true,force:true});
}
