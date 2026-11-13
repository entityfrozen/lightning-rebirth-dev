/**
 * Small, network-independent UI smoke test.
 * Catches broken Home, navigation, and Arcade search after production builds.
 * The full proxy smoke suite runs separately.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(tmpdir(),'celestial-ui-'));
const screenshots=path.join(root,'artifacts','ui-regression');
const port=32000+Math.floor(Math.random()*12000);
const base='http://127.0.0.1:'+port;
const password='a long temporary UI test password 2026';
const pageErrors=[];
let browser;
let logs='';
const server=spawn(process.execPath,['server.js'],{
 cwd:root,
 env:{...process.env,PORT:String(port),BOLT_DATA_DIR:dataDir,
  LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
  BOLT_ADMIN_USER:'UIAdmin',BOLT_ADMIN_PASSWORD:password,
  DISABLE_WEB_PROXY:'1',OPENAI_API_KEY:'',NVIDIA_API_KEY:''},
 stdio:['ignore','pipe','pipe']
});
for(const stream of [server.stdout,server.stderr]){
 stream.on('data',chunk=>{logs=(logs+chunk.toString()).slice(-10000)});
}

async function waitForServer(){
 for(let attempt=0;attempt<150;attempt++){
  if(server.exitCode!==null)throw Error('UI test server exited: '+logs);
  try{if((await fetch(base+'/api/me')).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('UI test server timed out: '+logs);
}

try{
 await mkdir(screenshots,{recursive:true});
 await waitForServer();
 browser=await chromium.launch({
  headless:true,
  channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||undefined,
  args:['--disable-dev-shm-usage']
 });
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>pageErrors.push(error.message));
 // A synthetic distributor fixture lets CI verify the encrypted-catalog
 // launch handshake without third-party websites or a working remote proxy.
 const sealedId='g_'+'x'.repeat(24);
 const sampleUrl='https://example.com/celestial-vault-test/index.html';
 let gameResolutions=0;
 await page.route('**/api/brightpath/a',route=>route.fulfill({
  json:{games:[{id:sealedId,name:'Vault Fixture',sources:[
   {name:'Selenite',cover:'',creator:'Fixture'}
  ]}],total:1,unavailable:[],updatedAt:'2026-11-12T00:00:00Z'}
 }));
 await page.route('**/api/brightpath/c?*',route=>route.fulfill({
  json:{encrypted:true,cached:true,files:7,bytes:1127,partial:false}
 }));
 await page.route('**/api/brightpath/b?*',route=>{
  const target=new URL(route.request().url());
  assert.equal(target.searchParams.get('id'),sealedId);
  assert.equal(target.searchParams.get('source'),'0');
  gameResolutions++;
  return route.fulfill({json:{url:sampleUrl}});
 });
 await page.route('https://example.com/celestial-vault-test/**',route=>route.fulfill({
  contentType:'text/html',body:'<!doctype html><title>Vault Fixture</title><h1>Game launched</h1>'
 }));
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('input[name="username"]').fill('UIAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="s0"]').waitFor({timeout:25000});

 // Home must actually render and navigate, not just exist in the DOM.
 const home=page.locator('[data-view="s0"].on');
 await home.locator('h1').waitFor({timeout:10000});
 assert.match(await home.locator('h1').textContent(),/uiadmin/i);
 assert.equal(await home.locator('nav[aria-label="Quick access"] button').count(),4);
 const bounds=await home.locator('main').boundingBox();
 assert.ok(bounds&&bounds.width>300&&bounds.height>100,'Home layout must be visible');
 await page.screenshot({path:path.join(screenshots,'home.png')});
 await home.locator('[data-go="s2"]').click();
 await page.locator('[data-view="s2"].on button[data-index]').first().waitFor({timeout:10000});
 // View Source has only the Brightpath shell and hashed production assets.
 const documentSource=await (await page.request.get(base+'/')).text();
 assert.match(documentSource,/<title>Brightpath/);
 assert.doesNotMatch(documentSource,/data-view=["']games|celestial-star\.svg|CELESTIAL ORIGINALS/i);
 assert.match(documentSource,/\/boba\/dist\/assets\/app-[a-zA-Z0-9_-]+\.js/);
 assert.doesNotMatch(documentSource,/src=["']\/boba\/(?:native|games|catalog-ui)\.js/);
 // The actual DOM is still inspectable, but should no longer leak feature
 // names through CSS classes or raw section identifiers.
 const liveClasses=await page.locator('[data-view="s2"]').evaluate(node=>
  [...node.querySelectorAll('*')].flatMap(el=>[...el.classList]));
 assert.equal(liveClasses.filter(name=>/^(?:arcade-|cel-|celestial-)/.test(name)).length,0,
  'The production Library should use only neutral class tokens');
 assert.equal(await page.locator('[data-view="s2"]').getAttribute('aria-label'),'Brightpath Library');

 // Test search, no-results and clearing; catalog fetch failures are unrelated.
 const arcade=page.locator('[data-view="s2"].on');
 const search=arcade.getByRole('searchbox',{name:'Search the library'});
 await search.fill('snake');
 assert.equal(await arcade.locator('button[data-index]').count(),1,'Arcade search should narrow cards');
 assert.match(await arcade.locator('button[data-index]').first().textContent(),/Snake/i);
 await search.fill('no-such-title-987654');
 assert.equal(await arcade.locator('button[data-index]').count(),0);
 assert.match(await arcade.locator('section[data-grid]').textContent(),/No matching titles/);
 await search.fill('');
 assert.ok((await arcade.locator('button[data-index]').count())>=5,'Clearing search should restore games');
 await arcade.locator('button[data-index]').filter({has:page.getByText('2048',{exact:true})}).click();
 assert.equal(await arcade.locator('[data-board][role="group"] [data-value]').count(),16,'2048 must still launch');
 await arcade.locator('[data-back]').click();
 await arcade.locator('button[data-index]').filter({has:page.getByText('Rock Paper Scissors',{exact:true})}).click();
 assert.equal(await arcade.locator('[data-stage] [data-pick]').count(),3,'RPS should still mount');
 const gameClasses=await arcade.locator('[data-stage]').evaluate(el=>
  [el,...el.querySelectorAll('*')].flatMap(node=>[...node.classList]));
 assert.equal(gameClasses.filter(name=>/^(?:arcade-|cel-|celestial-)/.test(name)).length,0,
  'Launched games should use neutral class names');
 await arcade.locator('[data-back]').click();
 // The library's launch links must be absent from listing metadata and
 // resolved on demand, while Direct embed keeps working as a fallback.
 await arcade.locator('button[data-entry-index]').filter({hasText:'Vault Fixture'}).click();
 await arcade.locator('select[aria-label="Embedding mode"]').selectOption('direct');
 await page.waitForFunction(target=>{
  const section=document.querySelector('[data-view="s2"].on');
  return !!section?.querySelector('[data-stage] a[href="'+target+'"]')&&
   !!section?.querySelector('[data-stage] iframe[src="'+target+'"]');
 },sampleUrl,{timeout:12000});
 assert.ok(gameResolutions>0,'External games should resolve opaque IDs at launch');
 await arcade.locator('[data-vault-status]').filter({hasText:'AES-256-GCM · 7 assets'}).waitFor({timeout:10000});
 await arcade.locator('[data-back]').click();
 await page.screenshot({path:path.join(screenshots,'arcade.png')});

 // The Home search and other quick links must still activate their sections.
 await page.locator('#dock [data-section="s0"]').click();
 await home.locator('form[role="search"] input').fill('example.com');
 await home.locator('form[role="search"] button[type="submit"]').click();
 await page.locator('[data-view="s1"].on').waitFor({timeout:10000});
 await page.locator('#dock [data-section="s0"]').click();
 await home.locator('[data-go="s3"]').click();
 await page.locator('[data-view="s3"].on .native-messenger').waitFor({timeout:10000});
 await page.locator('#dock [data-section="s0"]').click();
 await home.locator('[data-go="s4"]').click();
 await page.locator('[data-view="s4"].on').waitFor({timeout:10000});

 assert.equal(await page.locator('.native-start-error').count(),0,'No section may crash on startup');
 assert.deepEqual(pageErrors,[],'The main UI must not throw uncaught exceptions');
 console.log('Home, quick links, Arcade search, game launch, Browser and Chat UI smoke tests passed.');
}catch(error){
 console.error('UI regression smoke failed:',error.stack||error.message);
 console.error('Browser exceptions:',pageErrors);
 console.error('Server output:',logs);
 process.exitCode=1;
}finally{
 if(browser)await browser.close().catch(()=>{});
 server.kill('SIGTERM');
 await rm(dataDir,{recursive:true,force:true});
}
