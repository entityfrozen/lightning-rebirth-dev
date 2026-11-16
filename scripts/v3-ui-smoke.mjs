/**
 * Browser-level V3 smoke test: live login, actual UI interaction, lazy modules,
 * keyboard navigation and mobile layout. Uses an isolated disposable account
 * store and never touches production accounts.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(tmpdir(),'celestial-v3-'));
const screenshots=path.join(root,'artifacts','v3');
const port=33400+Math.floor(Math.random()*9000);
const base='http://127.0.0.1:'+port;
const password='isolated v3 smoke password 2026';
let browser,logs='';
const errors=[];
const server=spawn(process.execPath,['server.js'],{
  cwd:root,
  env:{...process.env,PORT:String(port),BOLT_DATA_DIR:dataDir,
    LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
    BOLT_ADMIN_USER:'V3Admin',BOLT_ADMIN_PASSWORD:password,
    DISABLE_WEB_PROXY:'1',NVIDIA_API_KEY:'',OPENAI_API_KEY:''},
  stdio:['ignore','pipe','pipe']
});
for(const stream of [server.stdout,server.stderr])stream.on('data',part=>{
  logs=(logs+part.toString()).slice(-9000);
});
async function ready(){
  for(let attempt=0;attempt<150;attempt++){
    if(server.exitCode!==null)throw Error('Test server exited: '+logs);
    try{if((await fetch(base+'/api/me')).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('V3 test server timed out: '+logs);
}
try{
  await mkdir(screenshots,{recursive:true});
  await ready();
  browser=await chromium.launch({
    headless:true,channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||undefined,
    args:['--disable-dev-shm-usage']
  });
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.v3-auth-layout').waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,'sign-in.png')});
  await page.getByRole('button',{name:'Create account',exact:true}).first().click();
  await page.locator('input[name="confirmPassword"]:enabled').waitFor({timeout:5000});
  await page.getByRole('button',{name:'Sign in',exact:true}).first().click();
  await page.locator('input[name="username"]').fill('V3Admin');
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.locator('[data-celestial-v3]').waitFor({timeout:30000});
  await page.locator('.v3-hero h1').waitFor({timeout:15000});
  assert.equal(await page.locator('#dock [data-section="s2"]').count(),0,
    'Games must remain retired');
  assert.equal(await page.locator('#dock .v3-nav').count(),4);
  assert.match(await page.locator('.v3-hero h1').innerText(),/room to think/);
  await page.screenshot({path:path.join(screenshots,'desktop-home.png')});

  await page.keyboard.press('Control+k');
  await page.locator('[data-v3-command-layer]:not([hidden])').waitFor();
  await page.locator('[data-v3-command-input]').fill('celestial ai');
  await page.keyboard.press('Enter');
  await page.locator('[data-view="s4"].on .ai').waitFor({timeout:15000});
  assert.equal(await page.locator('[data-v3-command-layer]:not([hidden])').count(),0);

  await page.locator('[data-v3-go="chat"]').first().click();
  await page.locator('[data-view="s3"].on .native-messenger').waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,'community.png')});

  await page.locator('#dock [data-section="s1"]').click();
  await page.locator('[data-view="s1"].on [data-wv]').waitFor({timeout:15000});
  await page.screenshot({path:path.join(screenshots,'browser.png')});

  await page.locator('[data-v3-go="settings"]').first().click();
  await page.locator('[data-view="s5"].on .set').waitFor({timeout:15000});
  await page.locator('[data-v3-go="account"]').first().click();
  await page.locator('[data-view="s7"].on').waitFor({timeout:15000});
  await page.locator('[data-v3-go="admin"]').first().click();
  await page.locator('[data-view="s6"].on').waitFor({timeout:15000});

  await page.locator('#dock [data-section="s0"]').click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.v3-hero').waitFor();
  const overflow=await page.evaluate(()=>({
    pageWidth:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,
    navVisible:getComputedStyle(document.querySelector('.v3-sidebar')).display!=='none'
  }));
  assert.ok(overflow.pageWidth<=overflow.viewport+2,'Mobile shell must not overflow horizontally');
  assert.equal(overflow.navVisible,true);
  const mobileTabs=await page.locator('#dock .v3-nav, .v3-personal-nav .v3-nav[data-v3-go="settings"]')
    .evaluateAll(buttons=>buttons.map(button=>{
      const r=button.getBoundingClientRect();
      return {name:button.getAttribute('aria-label'),left:r.left,top:r.top,width:r.width,right:r.right,bottom:r.bottom};
    }));
  assert.equal(mobileTabs.length,5,'Home, Browser, Chat, AI and Settings stay reachable on phones');
  for(const item of mobileTabs){
    assert.ok(item.width>34&&item.left>=0&&item.right<=392&&item.top>=0&&item.bottom<=844,
      'Mobile tab must fit onscreen: '+JSON.stringify(item));
  }
  await page.screenshot({path:path.join(screenshots,'mobile-home.png')});
  assert.deepEqual(errors,[],'No uncaught runtime errors allowed');
  console.log('Celestial V3 desktop, feature routes, command palette, and mobile smoke passed.');
} catch(error){
  console.error('V3 smoke failed:',error.stack||error.message);
  console.error('Page errors:',errors);
  console.error('Server output:',logs);
  process.exitCode=1;
} finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
  await rm(dataDir,{recursive:true,force:true});
}
