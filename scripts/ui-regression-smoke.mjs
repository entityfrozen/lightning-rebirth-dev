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
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('input[name="username"]').fill('UIAdmin');
 await page.locator('input[name="password"]').fill(password);
 await page.locator('form button[type="submit"]').click();
 await page.locator('#dock [data-section="home"]').waitFor({timeout:25000});

 // Home must actually render and navigate, not just exist in the DOM.
 const home=page.locator('[data-view="home"].on');
 await home.locator('.cel-simple-greeting h1').waitFor({timeout:10000});
 assert.match(await home.locator('.cel-simple-greeting h1').textContent(),/uiadmin/i);
 assert.equal(await home.locator('.cel-simple-links button').count(),4);
 const bounds=await home.locator('.cel-simple-center').boundingBox();
 assert.ok(bounds&&bounds.width>300&&bounds.height>100,'Home layout must be visible');
 await page.screenshot({path:path.join(screenshots,'home.png')});
 await home.locator('[data-go="games"]').click();
 await page.locator('[data-view="games"].on .arcade-card').first().waitFor({timeout:10000});

 // Test search, no-results and clearing; catalog fetch failures are unrelated.
 const arcade=page.locator('[data-view="games"].on');
 const search=arcade.getByRole('searchbox',{name:'Search the arcade'});
 await search.fill('snake');
 assert.equal(await arcade.locator('.arcade-card').count(),1,'Arcade search should narrow cards');
 assert.match(await arcade.locator('.arcade-card').first().textContent(),/Snake/i);
 await search.fill('no-such-title-987654');
 assert.equal(await arcade.locator('.arcade-card').count(),0);
 assert.match(await arcade.locator('.arcade-grid[data-grid]').textContent(),/No matching titles/);
 await search.fill('');
 assert.ok((await arcade.locator('.arcade-card').count())>=5,'Clearing search should restore games');
 await arcade.locator('.arcade-card').filter({has:page.getByText('2048',{exact:true})}).click();
 assert.equal(await arcade.locator('.cel-2048-tile').count(),16,'2048 must still launch');
 await arcade.locator('[data-back]').click();
 await page.screenshot({path:path.join(screenshots,'arcade.png')});

 // The Home search and other quick links must still activate their sections.
 await page.locator('#dock [data-section="home"]').click();
 await home.locator('.cel-simple-search input').fill('example.com');
 await home.locator('.cel-simple-search button[type="submit"]').click();
 await page.locator('[data-view="browser"].on').waitFor({timeout:10000});
 await page.locator('#dock [data-section="home"]').click();
 await home.locator('[data-go="chat"]').click();
 await page.locator('[data-view="chat"].on .native-messenger').waitFor({timeout:10000});
 await page.locator('#dock [data-section="home"]').click();
 await home.locator('[data-go="ai"]').click();
 await page.locator('[data-view="ai"].on').waitFor({timeout:10000});

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
