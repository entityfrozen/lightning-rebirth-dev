import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('Boba retains its tabs, search bar, new-tab page and fullscreen UI',()=>{
  const ui=source('../public/boba/browser.js');
  for(const marker of ['data-omni','data-bq','data-wnew','data-wmax',
    'data-tabs','data-ql','data-direct','data-wb="reload"']){
    assert.ok(ui.includes(marker),marker);
  }
  assert.match(ui,/aria-label="Browser tab /);
  assert.match(ui,/hostOf\(t\.url\)/);
  assert.match(ui,/data-engine-mode/);
  assert.match(ui,/Celestial Engine/);
});

test('Remote page frames cannot read the app origin or control the Boba shell',()=>{
  const ui=source('../public/boba/browser.js');
  const gateway=source('../browser-gateway.js');
  assert.match(ui,/sandbox="allow-scripts allow-forms allow-popups allow-downloads"/);
  assert.doesNotMatch(ui,/allow-same-origin/);
  assert.match(ui,/event\.source!==event\.source|event\.source===/);
  assert.match(gateway,/handleBrowse/);
  assert.match(gateway,/guardedLookup/);
  assert.doesNotMatch(gateway,/proxy-bootstrap|ultraviolet|baremux|Scramjet/);
});

test('Boba displays meaningful failures and never claims navigation success from a status API',()=>{
  const ui=source('../public/boba/browser.js');
  assert.match(ui,/native-browser-error/);
  assert.match(ui,/The page did not respond within 30 seconds/);
  assert.match(ui,/state==='ready'/);
  assert.match(ui,/state==='error'/);
  assert.doesNotMatch(ui,/status\.proxy/);
});

test('Arcade library routes documents through the same engine and keeps source credits',()=>{
  const catalog=source('../public/boba/catalog-ui.js');
  assert.match(catalog,/api\/browser\/token/);
  assert.match(catalog,/Celestial Engine/);
  assert.match(catalog,/Direct embed/);
  assert.match(catalog,/Source: /);
  assert.doesNotMatch(catalog,/createUltravioletFrame|createProxyFrame/);
});

test('Chat preserves its channel keys and visible community labels',()=>{
  const chat=source('../public/boba/chat.js');
  assert.match(chat,/channelLabel=c=>c\?\.id==='games'\?'arcade'/);
  assert.match(chat,/data-channel-index/);
  assert.match(chat,/dataset\.channelIndex/);
  assert.doesNotMatch(chat,/data-channel="/);
});

test('Cloaked browser maintains startup and failure reporting',()=>{
  const wrapper=source('../public/boba/about-blank.js');
  const native=source('../public/boba/native.js');
  const browser=source('../public/boba/browser.js');
  assert.match(wrapper,/notice\.dataset\.cloakStatus='true'/);
  assert.match(wrapper,/message\.type==='celestial:workspace-ready'/);
  assert.match(wrapper,/message\.type==='celestial:auth-required'/);
  assert.match(wrapper,/message\.type==='celestial:workspace-failed'/);
  assert.match(native,/parent\.postMessage\(\{type:'celestial:auth-required'\}/);
  assert.match(native,/parent\.postMessage\(\{type:'celestial:workspace-failed'\}/);
  assert.match(wrapper,/message\.type==='celestial:browser-status'/);
  assert.match(wrapper,/event\.source!==frame\.contentWindow/);
  assert.match(browser,/report\('failed'\)/);
  assert.match(browser,/report\('ready'\)/);
});
