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
 for(const asset of ['/baremux/index.js','/baremux/worker.js',
  '/uv/sw.js','/uv/uv.bundle.js','/epoxy/index.mjs','/reflux/index.mjs']){
  const response=await page.request.get(origin+asset);
  assert.equal(response.status(),200,asset+' must be served to signed-in users');
 }
 await page.locator('#dock [data-section="s1"]').click();
 await page.locator('[data-view="s1"].on [data-omni]').waitFor();
 assert.equal(await page.locator('[data-engine-mode]').inputValue(),'ultraviolet');
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
    frame.contentDocument.body?.textContent?.includes('Example Domain')}catch{return false}
 },null,{timeout:65000});
 assert.equal(await page.locator('.native-browser-error').count(),0,'Browsing must not show an error card');
 await page.screenshot({path:path.join(shots,'reflux-example-domain.png')});
 console.log('Reflux transport, worker and actual external webpage rendered successfully.');
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
