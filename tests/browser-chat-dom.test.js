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
 assert.match(browser,/t\.frame\.src=t\.url/);
 assert.match(browser,/t\.direct=true/);
});

test('Bare hostnames navigate directly instead of being treated as search terms',()=>{
 const browser=source('../public/boba/browser.js');
 assert.match(browser,/\^\[a-z0-9-\]/);
 assert.doesNotMatch(browser,/\^\[\\\\w-\]/);
});

test('Arcade defaults to Scramjet and recreates the iframe when changing sources',()=>{
 const arcade=source('../public/boba/catalog-ui.js');
 assert.match(arcade,/\['ultraviolet','Ultraviolet proxy'\]/);
 assert.match(arcade,/frame\.replaceWith\(replacement\);frame=replacement/);
 assert.match(arcade,/fetch\('\/api\/browser\/status'/);
});


test('Both proxy engines have independent service workers and current-generation transports',()=>{
 const server=source('../server.js');
 const uv=source('../public/boba/uv-proxy.js');
 const worker=source('../public/uv/sw.js');
 const sj=source('../public/boba/proxy.js');
 const browser=source('../public/boba/browser.js');
 assert.match(server,/uvPath/);
 assert.match(server,/baremuxPath/);
 assert.match(server,/epoxyPath/);
 assert.match(server,/application\\/wasm/);
 assert.match(server,/script-src 'self' data: blob:/);
 assert.match(worker,/new UVServiceWorker/);
 assert.match(uv,/scope:ROOT/);
 assert.match(uv,/new BareMux\\.BareMuxConnection/);
 assert.match(uv,/setTransport\\('\/epoxy\/index\\.mjs'/);
 assert.match(sj,/bootstrap-init\\.js/);
 assert.match(browser,/data-proxy-mode/);
 assert.match(browser,/createUltravioletFrame/);
});
