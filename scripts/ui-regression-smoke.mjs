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
 let routeHits=0;
 await page.route('**/iframe-navigation-fixture?*',route=>{
  routeHits++;
  return route.fulfill({status:200,contentType:'text/html',
   body:'<!doctype html><title>Frame fixture</title><p>Navigation succeeded</p>'});
 });
 await page.route('https://example.com/celestial-vault-test/**',route=>route.fulfill({
  contentType:'text/html',body:'<!doctype html><title>Vault Fixture</title><h1>Game launched</h1>'
 }));
 // The account route should have the same root-and-bundle source structure
 // as the signed-in Celestial workspace. Form controls remain in the DOM.
 const loginSource=await (await page.request.get(base+'/login')).text();
 const loginTitle=loginSource.match(/<title>([^<]+)<\/title>/)?.[1]
   .replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number)));
 assert.match(loginTitle,/Celestial/,'Encoded source must preserve its browser title');
 assert.ok(loginSource.includes('href="/assets/celestial-star.svg"'));
 assert.match(loginSource,/<div id="root"><\/div>/);
 assert.match(loginSource,/\/boba\/dist\/assets\/auth-[a-zA-Z0-9_-]+\.js/);
 assert.doesNotMatch(loginSource,/<input|<form|data-aform|<section/);
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('input[name="username"]').fill('UIAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="s0"]').waitFor({timeout:25000});
 // The real iframe must navigate without writing the search term into its
 // src attribute. A mock Frame.go simulates the upstream setter, and Chromium
 // verifies that both initial and subsequent window navigations still work.
 const navSource=await readFile(path.join(root,'public/boba/frame-navigation.js'),'utf8');
 const frameResult=await page.evaluate(async source=>{
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  const frame=document.createElement('iframe');
  frame.src='about:blank';
  const initial=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
  document.body.append(frame);
  await initial;
  try{
   const {navigateWithNeutralFrameSrc}=await import(url);
   const proxy={element:frame,go(next){this.element.src=next}};
   const results=[];
   for(const q of ['fort','second']){
    const loaded=new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('Frame did not navigate')),5000);
     frame.addEventListener('load',()=>{
      clearTimeout(timer);resolve();
     },{once:true});
    });
    navigateWithNeutralFrameSrc(proxy,location.origin+'/iframe-navigation-fixture?q='+q);
    await loaded;
    results.push({attr:frame.getAttribute('src')});
   }
   return results;
  }finally{frame.remove();URL.revokeObjectURL(url)}
 },navSource);
 assert.deepEqual(frameResult.map(result=>result.attr),['about:blank','about:blank'],
  'The iframe source must remain a neutral about:blank attribute');
 assert.equal(routeHits,2,'Both destinations must really be requested');


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
 assert.equal(await home.locator('nav[aria-label="Quick access"] button').count(),3);
 // Guard against a rebrand accidentally replacing the original star art.
 const starIcon=home.locator('header img').first();
 assert.equal(await starIcon.getAttribute('src'),'/assets/celestial-star.svg');
 await page.waitForFunction(()=>{
  const img=document.querySelector('[data-view="s0"].on header img');
  return !!img?.complete&&img.naturalWidth>0;
 },null,{timeout:10000});
 const dockStar=page.locator('#dock [data-section="s0"] img');
 assert.equal(await dockStar.getAttribute('src'),'/assets/celestial-star.svg');
 await page.waitForFunction(()=>{
  const img=document.querySelector('#dock [data-section="s0"] img');
  return !!img?.complete&&img.naturalWidth>0;
 },null,{timeout:10000});
 const icon=await page.locator('link[rel="icon"]').getAttribute('href');
 assert.equal(new URL(icon,base).pathname,'/assets/celestial-star.svg');
 for(const asset of ['/assets/celestial-star.svg']){
  const response=await page.request.get(base+asset);
  assert.equal(response.status(),200,asset+' must be available');
  assert.match(await response.text(),/<svg\s/);
 }
 const bounds=await home.locator('main').boundingBox();
 assert.ok(bounds&&bounds.width>300&&bounds.height>100,'Home layout must be visible');
 await page.screenshot({path:path.join(screenshots,'home.png')});
 // Games are retired. View Source should contain only the small
 // application shell, not the original feature modules.
 const documentSource=await (await page.request.get(base+'/')).text();
 assert.match(documentSource,/<title>&#/);
 assert.doesNotMatch(documentSource,/Brightpath \| Learning Workspace/);
 assert.doesNotMatch(documentSource,/data-view=["']games|CELESTIAL ORIGINALS/i);
 assert.match(documentSource,/\/boba\/dist\/assets\/app-[a-zA-Z0-9_-]+\.js/);
 assert.doesNotMatch(documentSource,/src=["']\/boba\/(?:native|games|catalog-ui)\.js/);
 assert.equal(await page.locator('[data-view="s2"]').count(),0,
  'The retired Games section must stay unmounted');
 assert.equal(await page.locator('#dock [data-section="s2"]').count(),0,
  'The retired Games button must stay absent');
 for(const privatePath of ['/boba/shell.js','/boba/browser.js','/boba/auth-shell.js',
  '/boba/dist/.vite/manifest.json','/boba/dist/assets/test.map']){
  const result=await page.request.get(base+privatePath);
  assert.equal(result.status(),404,privatePath+' must not expose authored source');
 }

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
 console.log('Boba Home, quick links, source isolation, Browser and Chat UI smoke tests passed.');
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
