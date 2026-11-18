/**
 * Real transport check: browser + service worker + Reflux + Epoxy + Wisp.
 * No mocked page content. This is an external-network smoke test and should
 * fail with useful diagnostics instead of silently claiming the engine works.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(tmpdir(),'celestial-reflux-'));
const shots=path.join(root,'artifacts','reflux-live');
const port=39000+Math.floor(Math.random()*6000);
const origin='http://127.0.0.1:'+port;
const password='isolated transport smoke password';
const errors=[];
let logs='',browser,page;
const server=spawn(process.execPath,['server.js'],{
 cwd:root,
 env:{...process.env,PORT:String(port),RAILWAY_VOLUME_MOUNT_PATH:'',
  BOLT_DATA_DIR:dataDir,LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
  BOLT_ADMIN_USER:'RefluxAdmin',BOLT_ADMIN_PASSWORD:password,
  DISABLE_WEB_PROXY:'0',OPENAI_API_KEY:'',NVIDIA_API_KEY:''},
 stdio:['ignore','pipe','pipe']
});
for(const output of [server.stdout,server.stderr])output.on('data',chunk=>{logs=(logs+chunk.toString()).slice(-12000)});
try{
 await mkdir(shots,{recursive:true});
 let started=false;
 for(let i=0;i<200;i++){
  if(server.exitCode!==null)throw Error('Server exited: '+logs);
  try{if((await fetch(origin+'/api/me')).ok){started=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 assert.ok(started,'Server must start: '+logs);
 browser=await chromium.launch({
  headless:true,channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||undefined,
  args:['--disable-dev-shm-usage']
 });
 page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',error=>errors.push('page: '+error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text().slice(0,300))});
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('input[name="username"]').fill('RefluxAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="s1"]').waitFor({timeout:25000});
 const status=await page.request.get(origin+'/api/browser/status');
 assert.equal(status.status(),200);
 assert.equal((await status.json()).proxy,true,'Browser backend must bootstrap');
 const entry=await page.request.get(origin+'/');
 assert.equal(entry.headers()['referrer-policy'],'strict-origin-when-cross-origin',
   'The Boba workspace must identify itself to the official YouTube embed');
 for(const asset of ['/baremux/index.js','/baremux/worker.js',
  '/uv/sw.js','/uv/uv.bundle.js','/epoxy/index.mjs','/reflux/index.mjs']){
  const response=await page.request.get(origin+asset);
  assert.equal(response.status(),200,asset+' must be served to signed-in users');
 }
 await page.locator('#dock [data-section="s1"]').click();
 await page.locator('[data-view="s1"].on [data-omni]').waitFor();
 assert.equal(await page.locator('[data-engine-mode]').inputValue(),'smart');
 assert.equal(await page.locator('[data-engine-mode] option:checked').textContent(),'Smart');
 await page.locator('[data-omni]').fill('https://example.com/');
 await page.locator('[data-omni]').press('Enter');
 await page.waitForFunction(()=>{
  const frame=document.querySelector('[data-view="s1"].on iframe[src*="/uv/service/"]');
  return !!frame;
 },null,{timeout:30000});
 const transport=await page.evaluate(async()=>{
  const connection=new BareMux.BareMuxConnection('/baremux/worker.js');
  return connection.getTransport();
 });
 assert.equal(transport,'/reflux/index.mjs','The browser must select Reflux in BareMux');
 await page.waitForFunction(()=>{
  const frame=document.querySelector('[data-view="s1"].on iframe[src*="/uv/service/"]');
  try{return frame?.contentDocument?.title==='Example Domain'&&
    (frame.contentDocument.body?.textContent||'').trim().length>100}catch{return false}
 },null,{timeout:65000});
 assert.equal(await page.locator('.native-browser-error').count(),0,'Browsing must not show an error card');
 await page.screenshot({path:path.join(shots,'reflux-example-domain.png')});
 // The about:blank wrapper must browse too, not just render Celestial.
 await page.locator('#dock [data-section="s5"]').click();
 const [popup]=await Promise.all([
   page.waitForEvent('popup',{timeout:12000}),
   page.locator('[data-tab-blank]').click()
 ]);
 await popup.waitForLoadState('domcontentloaded');
 const workspace=popup.frameLocator('iframe[title="Website"]');
 await workspace.locator('#dock [data-section="s1"]').waitFor({timeout:25000});
 await workspace.locator('#dock [data-section="s1"]').click();
 await workspace.locator('[data-omni]').fill('https://example.com/');
 await workspace.locator('[data-omni]').press('Enter');
 await popup.waitForTimeout(12000);
 const nested=await popup.evaluate(async()=>{
   const iframe=document.querySelector('iframe[title="Website"]');
   const win=iframe?.contentWindow;
   const doc=iframe?.contentDocument;
   const child=doc?.querySelector('[data-view="s1"] iframe');
   let connection='unavailable';
   try{connection=win?.BareMux?.BareMuxConnection?await new win.BareMux.BareMuxConnection('/baremux/worker.js').getTransport():'missing'}catch(e){connection=e.message}
   return {crossOriginIsolated:win?.crossOriginIsolated,secure:win?.isSecureContext,
      workerSupported:!!win?.navigator?.serviceWorker,transport:connection,
      mode:doc?.querySelector('[data-engine-mode]')?.value,
      error:doc?.querySelector('.native-browser-error')?.textContent,
      childSrc:child?.getAttribute('src'),childUrl:child?.contentDocument?.URL,
      childTitle:child?.contentDocument?.title,childBody:child?.contentDocument?.body?.textContent?.slice(0,350)};
 });
 console.log('CLOAKED_BROWSER_DIAGNOSTIC',JSON.stringify(nested));
 assert.equal(nested.mode,'smart','Framed browser should prefer Smart mode');
 assert.equal(nested.transport,'/reflux/index.mjs','Smart mode should still use Reflux on ordinary sites');
 assert.ok(nested.childTitle==='Example Domain'&&nested.childBody?.length>100,
   'Cloaked tab must render actual external content: '+JSON.stringify(nested));
 // The about:blank launcher must acknowledge genuine browser readiness,
 // expose recovery on a failed navigation, and reopen the authenticated app.
 await popup.locator('[data-cloak-status]').waitFor({state:'hidden',timeout:12000});
 await workspace.locator('#dock [data-section="s1"]').evaluate(el=>{
   window.parent.postMessage({type:'celestial:browser-status',status:'failed'},location.origin);
 });
 await popup.locator('[data-cloak-status]').waitFor({state:'visible',timeout:10000});
 assert.match(await popup.locator('[data-cloak-status]').innerText(),/Browser navigation failed/);
 await popup.locator('[data-cloak-restart]').click();
 await workspace.locator('#dock [data-section="s1"]').waitFor({timeout:30000});
 await workspace.locator('#dock [data-section="s1"]').click();
 await workspace.locator('[data-omni]').fill('https://example.com/');
 await workspace.locator('[data-omni]').press('Enter');
 await popup.waitForFunction(()=>{
   const host=document.querySelector('iframe[title="Website"]')?.contentDocument;
   const frame=host?.querySelector('[data-view="s1"] iframe');
   try{return frame?.contentDocument?.title==='Example Domain'}catch{return false}
 },null,{timeout:60000});
 assert.equal(await workspace.locator('.native-browser-error').count(),0,
   'Cloked workspace should navigate after restart');
 // Explicitly exercise the other engine in a framed about:blank workspace.
 // Previously only Reflux was verified inside the cloak.
 await workspace.locator('[data-engine-mode]').selectOption('scramjet');
 await workspace.locator('[data-omni]').fill('https://example.com/');
 await workspace.locator('[data-omni]').press('Enter');
 await popup.waitForFunction(()=>{
   const host=document.querySelector('iframe[title="Website"]')?.contentDocument;
   const frame=host?.querySelector('[data-view="s1"] iframe');
   try{return frame?.contentDocument?.title==='Example Domain'}catch{return false}
 },null,{timeout:60000});
 assert.equal(await workspace.locator('.native-browser-error').count(),0,
   'Scramjet must browse through the about:blank workspace');
 const proxiedSrc=await workspace.locator('iframe[title="Page"]').getAttribute('src');
 assert.match(proxiedSrc,/\/\~\/sj\//,
   'Scramjet must navigate through its upstream iframe src protocol');

 // The in-memory diagnostics must report Scramjet startup and navigation,
 // without ever exposing the visited website address.
 await workspace.locator('#dock [data-section="s5"]').click();
 await workspace.locator('[data-scramjet-log]').waitFor({timeout:10000});
 const scramjetLog=await workspace.locator('[data-scramjet-log]').innerText();
 assert.match(scramjetLog,/bootstrap|controller-ready|frame-create/);
 assert.match(scramjetLog,/navigate/);
 assert.doesNotMatch(scramjetLog,/https?:\/\/|example\.com|cookie|password/);
 await workspace.locator('[data-scramjet-test]').click();
 await workspace.locator('[data-scramjet-test]').filter({hasText:'Ready'}).waitFor({timeout:30000});
 assert.match(await workspace.locator('[data-scramjet-log]').innerText(),/health\s+ok/);
 await workspace.locator('[data-scramjet-clear]').click();
 assert.match(await workspace.locator('[data-scramjet-log]').innerText(),
   /No Scramjet events recorded/);
 await workspace.locator('#dock [data-section="s1"]').click();
 // Watch pages must never run YouTube's entire dynamic app in the
 // rewriter: even in a cloaked iframe, an official embed can be used instead.
 const watch='https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3';
 await workspace.locator('[data-omni]').fill(watch);
 await workspace.locator('[data-omni]').press('Enter');
 await workspace.locator('[data-youtube-player]').waitFor({timeout:10000});
 const player=workspace.locator('[data-youtube-player] iframe');
 const embed=await player.getAttribute('src');
 assert.match(embed,/^https:\/\/www\.youtube-nocookie\.com\/embed\/jNQXAC9IVRw\?/);
 assert.equal(new URL(embed).searchParams.get('start'),'3');
 assert.equal(await player.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
 assert.match(await popup.locator('iframe[title="Website"]').getAttribute('allow'),
   /autoplay; encrypted-media;/);
 assert.equal(await workspace.locator('[data-view="s1"].on').count(),1,
   'The browser shell must survive switching from a proxied site to video playback');
 await popup.screenshot({path:path.join(shots,'cloaked-youtube-player.png')});
 await popup.close();
 await page.locator('#dock [data-section="s1"]').click();
 await page.locator('[data-omni]').fill(watch);
 await page.locator('[data-omni]').press('Enter');
 await page.locator('[data-youtube-player]').waitFor({timeout:10000});
 assert.equal(await page.locator('[data-youtube-player] iframe').getAttribute('referrerpolicy'),
   'strict-origin-when-cross-origin');
 assert.equal(await page.locator('[data-youtube-player] [data-video-full]').count(),1);
 assert.equal(await page.locator('[data-youtube-player] [data-video-external]').getAttribute('href'),
   'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3');
 // The engine chooser is functional, not decorative. A user can override
 // Smart for a tab and return to Smart without changing the other tabs.
 await page.locator('[data-wnew]').click();
 await page.locator('[data-engine-mode]').selectOption('scramjet');
 assert.equal(await page.locator('[data-engine-mode]').inputValue(),'scramjet');
 await page.locator('[data-engine-mode]').selectOption('smart');
 assert.equal(await page.locator('[data-engine-mode]').inputValue(),'smart');
 console.log('Reflux and cloaked browsing work; lightweight YouTube player controls are mounted.');
 console.log('External media decoding was not asserted: Google may block cloud-test traffic.');
}catch(error){
 console.error('Reflux live smoke failed:',error.stack||error.message);
 if(page){
  try{
   const state=await page.evaluate(async()=>{
    const frame=document.querySelector('[data-view="s1"] iframe');
    let doc;
    try{doc={title:frame?.contentDocument?.title,body:frame?.contentDocument?.body?.textContent?.slice(0,350)}}catch(e){doc={error:e.message}}
    let transport;
    try{transport=window.BareMux?.BareMuxConnection?
      await new BareMux.BareMuxConnection('/baremux/worker.js').getTransport():'unavailable'
    }catch(e){transport=e.message}
    return {frame:frame?.src,doc,transport,
      mode:document.querySelector('[data-engine-mode]')?.value,
      error:document.querySelector('.native-browser-error')?.textContent};
   });
   console.error('Browser state:',JSON.stringify(state));
   await page.screenshot({path:path.join(shots,'failure.png')});
  }catch{}
 }
 console.error('Browser events:',errors.slice(-20));
 console.error('Server logs:',logs.slice(-5500));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
 await rm(dataDir,{recursive:true,force:true});
}
