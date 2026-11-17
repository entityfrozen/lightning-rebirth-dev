import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('browser displays hostname only without exposing query path in its address overlay',()=>{
 const browser=source('../public/boba/browser.js');
 assert.match(browser,/domain\.textContent=u\.hostname/);
 assert.match(browser,/disp\.append\(domain\)/);
 assert.doesNotMatch(browser,/disp\.innerHTML\s*=\s*["']<b>/);
 assert.doesNotMatch(browser,/readable\(\(u\.pathname\s*\+\s*u\.search/);
});

test('chat shows Arcade label without exposing the legacy games channel ID in buttons',()=>{
 const chat=source('../public/boba/chat.js');
 assert.match(chat,/channelLabel=c=>c\?\.id==='games'\?'arcade'/);
 assert.match(chat,/data-channel-index/);
 assert.match(chat,/dataset\.channelIndex/);
 assert.doesNotMatch(chat,/data-channel="/);
});

test('Browser offers direct embedding if the Scramjet navigation fails',()=>{
 const browser=source('../public/boba/browser.js');
 assert.match(browser,/Try direct embed/);
 assert.match(browser,/t\.frame\.contentWindow\?\.location\.replace\(t\.url\)/);
 assert.doesNotMatch(browser,/t\.frame\.src=t\.url/);
 assert.match(browser,/t\.direct=true/);
});

test('Bare hostnames navigate directly instead of being treated as search terms',()=>{
 const browser=source('../public/boba/browser.js');
 assert.match(browser,/\^\[a-z0-9-\]/);
 assert.doesNotMatch(browser,/\^\[\\\\w-\]/);
});

test('Arcade defaults to Scramjet and recreates the iframe when changing sources',()=>{
 const arcade=source('../public/boba/catalog-ui.js');
 assert.match(arcade,/\['ultraviolet','Reflux browser'\]/);
 assert.match(arcade,/frame\.replaceWith\(replacement\);frame=replacement/);
 assert.match(arcade,/fetch\('\/api\/browser\/status'/);
});


test('Both proxy engines use separate service workers and transports',()=>{
 const server=source('../server.js');
 const uv=source('../public/boba/uv-proxy.js');
 const worker=source('../public/uv/sw.js');
 const sj=source('../public/boba/proxy.js');
 const browser=source('../public/boba/browser.js');
 assert.ok(server.includes('uvPath')&&server.includes('baremuxPath')&&server.includes('epoxyPath'));
 assert.ok(server.includes('application/wasm'));
 assert.ok(server.includes("script-src 'self' data: blob:"));
 assert.ok(worker.includes('new UVServiceWorker'));
 assert.ok(uv.includes('scope:ROOT'));
 assert.ok(uv.includes('new BareMux.BareMuxConnection'));
 assert.ok(uv.includes("setTransport('/epoxy/index.mjs'"));
 assert.ok(sj.includes('/bootstrap-init.js'));
 assert.ok(browser.includes('data-engine-mode'));
 assert.ok(browser.includes('createUltravioletFrame'));
});

test('cloaked browser selects the lightweight Reflux route for ordinary sites',()=>{
 const browser=source('../public/boba/browser.js');
 const arcade=source('../public/boba/catalog-ui.js');
 const wrapper=source('../public/boba/about-blank.js');
 assert.match(browser,/const defaultEngineChoice=/);
 assert.match(browser,/browserRouter\.select\(url,t\.engineChoice\)/);
 assert.match(arcade,/if\(window\.self!==window\.top\)modeSelect\.value='ultraviolet'/);
 assert.match(wrapper,/frame\.src=destination\.origin\+'\/\?cloaked=1'/);
});

test('Browser tabs and framed navigation avoid exposing search URLs as element attributes',()=>{
 const browser=source('../public/boba/browser.js');
 const proxy=source('../public/boba/proxy.js');
 const adapter=source('../public/boba/frame-navigation.js');
 assert.match(browser,/aria-label="Browser tab /);
 assert.doesNotMatch(browser,/esc\(t\.name \|\| t\.title\)/);
 assert.match(browser,/omni\.value = t && t\.url \? hostOf\(t\.url\)/);
 assert.match(proxy,/navigateWithNeutralFrameSrc/);
 assert.match(adapter,/contentWindow\.location\.replace\(destination\)/);
 assert.doesNotMatch(adapter,/element\.removeAttribute\('src'\)/);
});

test('Smart browsing defaults to Reflux on ordinary sites and recovers once',()=>{
 const browser=source('../public/boba/browser.js');
 const uv=source('../public/boba/uv-proxy.js');
 const server=source('../server.js');
 assert.match(browser,/store\.get\('browserEngine','smart'\)/);
 assert.match(browser,/<option value="smart">Smart<\/option>/);
 assert.match(browser,/<option value="ultraviolet">Reflux<\/option>/);
 assert.match(browser,/aria-label="Browsing engine"/);
 assert.doesNotMatch(browser,/aria-label="Proxy engine"/);
 assert.match(browser,/!t.autoFallbackAttempted&&!t.direct/);
 assert.match(browser,/t.autoFallbackAttempted=true/);
 assert.match(browser,/t.mode=t.mode==='ultraviolet'\?'scramjet':'ultraviolet'/);
 assert.match(browser,/t.frame.remove\(\)/);
 assert.match(browser,/void navigate\(t.url\)/);
 assert.match(browser,/if\(url!==t.url\)t.autoFallbackAttempted=false/);
 assert.match(uv,/connection.setTransport\('\/reflux\/index.mjs'/);
 assert.match(uv,/connection.getTransport\(\)/);
 assert.ok(uv.indexOf('await startWorker()')>uv.indexOf("connection.setTransport('/reflux/index.mjs'"));
 assert.match(uv,/setTransport\('\/epoxy\/index.mjs'/);
 assert.doesNotMatch(server,/fail\(res,502,'Proxy worker/);
});

test('the cloaked workspace delegates isolation to its iframe',()=>{
  const wrapper=source('../public/boba/about-blank.js');
  assert.match(wrapper,/frame\.allow='cross-origin-isolated;/);
  assert.match(wrapper,/frame\.src=destination\.href/);
});

test('Smart mode routes Google and YouTube through Scramjet without overriding manual choices',()=>{
 const router=source('../public/boba/engine-router.js');
 const browser=source('../public/boba/browser.js');
 assert.match(router,/host==='google.com'|\x27google.com\x27/);
 assert.match(router,/youtube.com/);
 assert.match(browser,/browserRouter\.select\(url,t\.engineChoice\)/);
 assert.match(browser,/current\.engineChoice=choice/);
 assert.match(browser,/store\.get\('browserEngine','smart'\)/);
 assert.match(browser,/browserRouter\.remember\(t\.url,t\.mode\)/);
});

test('YouTube Music opens with Scramjet by default and Ultraviolet error pages trigger recovery',()=>{
  const browser=source('../public/boba/browser.js');
  const router=source('../public/boba/engine-router.js');
  assert.match(router,/youtube.com/);
  assert.match(router,/youtu.be/);
  assert.match(browser,/error processing your request/i);
  assert.match(browser,/internal server error/i);
  assert.match(browser,/return ultravioletError\|\|/);
  assert.match(browser,/!t\.autoFallbackAttempted&&!t\.direct/);
  assert.match(browser,/t\.mode=t\.mode==='ultraviolet'\?'scramjet':'ultraviolet'/);
});

test('cloaked workspace detects real startup and browsing status instead of iframe load',()=>{
 const wrapper=source('../public/boba/about-blank.js');
 const native=source('../public/boba/native.js');
 const browser=source('../public/boba/browser.js');
 assert.match(wrapper,/notice\.dataset\.cloakStatus='true'/);
 assert.match(wrapper,/message\.type==='celestial:workspace-ready'/);
 assert.match(wrapper,/message\.type==='celestial:browser-status'/);
 assert.match(wrapper,/message\.status==='failed'/);
 assert.match(wrapper,/event\.source!==frame\.contentWindow/);
 assert.match(wrapper,/if\(failures>=3\)/);
 assert.match(wrapper,/\?cloaked=1&retry=/);
 assert.match(native,/parent\.postMessage\(\{type:'celestial:workspace-ready'\}/);
 assert.match(browser,/reportStatus\('failed'\)/);
 assert.match(browser,/reportStatus\('ready'\)/);
});
