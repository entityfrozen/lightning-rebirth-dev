import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('Scramjet uses the upstream Frame.go on the real iframe',()=>{
 const proxy=source('../public/boba/proxy.js');
 assert.match(proxy,/const upstreamGo=frame\.go\.bind\(frame\)/);
 assert.match(proxy,/return upstreamGo\(url\)/);
 assert.doesNotMatch(proxy,/navigateWithNeutralFrameSrc/);
 assert.doesNotMatch(proxy,/frame\.element=scratch/);
});

test('Scramjet frames are created once and stale navigations cannot win',()=>{
 const browser=source('../public/boba/browser.js');
 assert.match(browser,/record\.pending=createProxyFrame/);
 assert.match(browser,/const sequence=\+\+record\.navSequence/);
 assert.match(browser,/sequence!==record\.navSequence/);
 assert.match(browser,/record\.disposed=true/);
 assert.match(browser,/frames\.get\(el\)!==record/);
});
