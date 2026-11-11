import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('browser recovery controls still work after removing the game clients',()=>{
 const browser=readFileSync(new URL('../src/Browser.jsx',import.meta.url),'utf8');
 assert.match(browser,/navigator\\.clipboard\\.writeText\\(visibleUrl\\)/);
 assert.match(browser,/onClick=\\{reconnect\\}/);
 assert.match(browser,/onClick=\\{closeOtherTabs\\}/);
});

test('native navigation excludes removed game and apps routes',()=>{
 const native=readFileSync(new URL('../public/boba/native.js',import.meta.url),'utf8');
 const template=readFileSync(new URL('../public/boba/index.template.html',import.meta.url),'utf8');
 assert.doesNotMatch(native,/mountGames|mountApps|games\\.js/);
 assert.doesNotMatch(template,/data-view="games"|data-view="apps"/);
 assert.match(native,/mountChat\\(view\\('chat'\\)/);
});
