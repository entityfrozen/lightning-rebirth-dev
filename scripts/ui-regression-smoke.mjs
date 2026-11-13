/**
 * Small, network-independent UI smoke test.
 * Catches broken Home, navigation, and Arcade search after production builds.
 * The full proxy smoke suite runs separately.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
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
  json:{games:[{id:sealedId,name:'A Game About Feeding A Black Hole',sources:[
   {name:'Selenite',cover:'/api/brightpath/d?id='+sealedId+'&source=0',creator:'Fixture'}
  ]}],total:1,unavailable:[],updatedAt:'2026-11-12T00:00:00Z'}
 }));
 const demoCover=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
 await page.route('**/api/brightpath/d?*',route=>route.fulfill({
  status:200,contentType:'image/gif',body:demoCover
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
 // The account route should have the same root-and-bundle source structure
 // as the signed-in Brightpath workspace. Form controls remain in the DOM.
 const loginSource=await (await page.request.get(base+'/login')).text();
 assert.match(loginSource,/<title>Brightpath/);
 assert.match(loginSource,/href="\/assets\/brightpath-icon\.svg"/);
 assert.match(loginSource,/<div id="root"><\/div>/);
 assert.match(loginSource,/\/boba\/dist\/assets\/auth-[a-zA-Z0-9_-]+\.js/);
 assert.doesNotMatch(loginSource,/<input|<form|data-aform|celestial-star|<section/);
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('input[name="username"]').fill('UIAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="s0"]').waitFor({timeout:25000});

 // Verify the browser's DOM-only query mask in a same-origin iframe, without
 // relying on external Google navigation in CI.
 const maskSource=await readFile(path.join(root,'public/boba/search-link-mask.js'),'utf8');
 const maskResult=await page.evaluate(async source=>{
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  const frame=document.createElement('iframe');
  frame.style.cssText='width:360px;height:50px';
  document.body.append(frame);
  try{
   const {maskFrameSearchLinks}=await import(url);
   const doc=frame.contentDocument;
   const rewritten=location.origin+'/~/sj/abc/xyz/https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dfort%26udm%3D50';
   doc.body.innerHTML='<a href="'+rewritten+'" scramjet-attr-href="/search?q=fort&udm=50">AI Mode</a>';
   const navigations=[];
   const dispose=maskFrameSearchLinks(doc,target=>navigations.push(target));
   const tick=()=>new Promise(resolve=>frame.contentWindow.requestAnimationFrame(resolve));
   await tick();await tick();
   const anchor=doc.querySelector('a');
   const before={href:anchor.getAttribute('href'),backup:anchor.getAttribute('scramjet-attr-href')};
   anchor.click();
   const next=doc.createElement('a');
   next.href=rewritten.replace('fort','second%2520search');
   next.setAttribute('scramjet-attr-href','/search?q=second%20search');
   doc.body.append(next);
   await tick();await tick();
   const after={href:next.getAttribute('href'),backup:next.getAttribute('scramjet-attr-href')};
   dispose();
   return {before,after,navigations,rewritten};
  }finally{frame.remove();URL.revokeObjectURL(url)}
 },maskSource);
 assert.deepEqual(maskResult.before,{href:'#',backup:null},'Search link must have no visible query attributes');
 assert.deepEqual(maskResult.after,{href:'#',backup:null},'New search links must also be sanitized');
 assert.deepEqual(maskResult.navigations,[maskResult.rewritten],'Masked links must remain clickable');


 // Home must actually render and navigate, not just exist in the DOM.
 const home=page.locator('[data-view="s0"].on');
 await home.locator('h1').waitFor({timeout:10000});
 assert.match(await home.locator('h1').textContent(),/uiadmin/i);
 assert.equal(await home.locator('nav[aria-label="Quick access"] button').count(),4);
 // Guard against a rebrand accidentally replacing the original star art.
 const starIcon=home.locator('header img').first();
 assert.equal(await starIcon.getAttribute('src'),'/assets/brightpath-star.svg');
 await page.waitForFunction(()=>{
  const img=document.querySelector('[data-view="s0"].on header img');
  return !!img?.complete&&img.naturalWidth>0;
 },null,{timeout:10000});
 const dockStar=page.locator('#dock [data-section="s0"] img');
 assert.equal(await dockStar.getAttribute('src'),'/assets/brightpath-star.svg');
 await page.waitForFunction(()=>{
  const img=document.querySelector('#dock [data-section="s0"] img');
  return !!img?.complete&&img.naturalWidth>0;
 },null,{timeout:10000});
 const icon=await page.locator('link[rel="icon"]').getAttribute('href');
 assert.equal(new URL(icon,base).pathname,'/assets/brightpath-icon.svg');
 for(const asset of ['/assets/brightpath-star.svg','/assets/brightpath-icon.svg']){
  const response=await page.request.get(base+asset);
  assert.equal(response.status(),200,asset+' must be available');
  assert.match(await response.text(),/<svg\s/);
 }
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
 // Library-owned rendered markup must not expose the generic term, even in
 // card descriptions, credits, status labels or accessibility attributes.
 assert.doesNotMatch(await page.locator('[data-view="s2"]').evaluate(el=>el.outerHTML),/\bgame\b/i,
  'The Library shell should use neutral copy in all of its DOM markup');
 const originals=page.locator('[data-view="s2"] button[data-index]');
 assert.equal(await originals.filter({hasText:'UmaVersus'}).locator('small').textContent(),
  'Challenge rivals in the original online fighter.');

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
 // Canvas paints the catalog title; the button gets a stable, neutral
 // accessible name instead of repeating arbitrary title text in attributes.
 const catalogCard=arcade.getByRole('button',{name:'Open library item 1'});
 assert.equal(await catalogCard.count(),1,'Canvas cards must remain keyboard-accessible');
 assert.equal(await catalogCard.getAttribute('aria-label'),'Open library item 1');
 assert.doesNotMatch(await catalogCard.evaluate(el=>el.outerHTML),/\bgame\b/i,
  'Rendered card markup must not contain the word game, even when the title does');
 assert.equal(await catalogCard.locator('span').filter({hasText:'A Game About Feeding A Black Hole'}).count(),0,
  'Catalog titles should not be duplicated as HTML text nodes');
 const titleCanvas=catalogCard.locator('canvas[data-paint="0"]');
 const sourceCanvas=catalogCard.locator('canvas[data-paint="1"]');
 await titleCanvas.waitFor({timeout:10000});
 await sourceCanvas.waitFor({timeout:10000});
 assert.equal(await catalogCard.locator('small').count(),0,'Distributor captions render as pixels');
 const cover= catalogCard.locator('img');
 assert.match(await cover.getAttribute('src'),/^\/api\/brightpath\/d\?id=g_/);
 assert.equal(await cover.evaluate(img=>img.complete&&img.naturalWidth>0),true,
  'First-party artwork should still load');
 assert.equal(await sourceCanvas.evaluate(el=>el.width>0&&el.height>0),true,
  'Distributor caption should be painted on canvas');
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('[data-view="s2"] button[data-entry-index] canvas');
  if(!canvas||canvas.width===0||canvas.height===0)return false;
  const c=canvas.getContext('2d',{willReadFrequently:true});
  const pixels=c?.getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=3;pixels&&i<pixels.length;i+=4)if(pixels[i]>0)return true;
  return false;
 },null,{timeout:10000});
 const beforeWidth=await titleCanvas.evaluate(el=>el.width);
 await page.setViewportSize({width:520,height:860});
 await page.waitForFunction(previous=>{
  const el=document.querySelector('[data-view="s2"] button[data-entry-index] canvas');
  return !!el&&el.width!==previous&&el.width>0;
 },beforeWidth,{timeout:10000});
 await page.setViewportSize({width:1440,height:900});
 await catalogCard.focus();
 await catalogCard.press('Enter');
 await arcade.locator('select[aria-label="Embedding mode"]').selectOption('direct');
 await page.waitForFunction(target=>{
  const section=document.querySelector('[data-view="s2"].on');
  return !!section?.querySelector('[data-stage] a[href="'+target+'"]')&&
   !!section?.querySelector('[data-stage] iframe[src="'+target+'"]');
 },sampleUrl,{timeout:12000});
 assert.ok(gameResolutions>0,'External games should resolve opaque IDs at launch');
 await arcade.locator('[data-vault-status]').filter({hasText:'AES-256-GCM · 7 assets'}).waitFor({timeout:10000});
 const playerTitle=arcade.locator('[data-stage] [data-item-title] canvas');
 await playerTitle.waitFor({timeout:10000});
 assert.ok(await playerTitle.evaluate(el=>el.width>0&&el.height>0),
  'The launched title should render into canvas pixels');
 assert.doesNotMatch(await arcade.evaluate(el=>el.outerHTML),/\bgame\b/i,
  'Opening an entry must not reinsert its full title into the HTML DOM');
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
