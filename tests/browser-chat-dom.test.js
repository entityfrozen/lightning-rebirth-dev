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
