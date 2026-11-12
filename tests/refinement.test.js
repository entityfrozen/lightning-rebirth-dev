import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('browser recovery controls remain with Celestial Originals',()=>{
 const browser=readFileSync(new URL('../src/Browser.jsx',import.meta.url),'utf8');
 for(const snippet of ['navigator.clipboard.writeText(visibleUrl)','onClick={reconnect}','onClick={closeOtherTabs}']){
  assert.ok(browser.includes(snippet),snippet);
 }
});

test('native navigation separates star Home, Browser and Celestial Originals',()=>{
 const native=readFileSync(new URL('../public/boba/native.js',import.meta.url),'utf8');
 const template=readFileSync(new URL('../public/boba/index.template.html',import.meta.url),'utf8');
 const shell=readFileSync(new URL('../public/boba/shell.js',import.meta.url),'utf8');
 assert.ok(native.includes('mountArcade')&&native.includes('mountHome'));
 assert.ok(native.includes("mountBrowser(view('browser'))"));
 assert.ok(template.includes('id="root"'), 'minimal HTML has the app root');
 for(const name of ['home','browser','games']){
  assert.ok(shell.includes('data-view=')&&shell.includes(name),name+' view is mounted by the bundled shell');
 }
 assert.ok(!/data-view=.{0,4}apps/.test(shell));
 assert.ok(native.includes("mountChat(view('chat'),user)"));
});
