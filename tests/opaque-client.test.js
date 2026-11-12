import {test} from 'node:test';
import assert from 'node:assert/strict';
import {opaqueClientClasses} from '../scripts/opaque-client.mjs';
import {uiLabel,viewId} from '../public/boba/opaque-ui.js';

test('production class mapping keeps HTML strings, selectors and CSS synchronized',()=>{
 const bundle={
  'main.css':{type:'asset',fileName:'assets/main.css',source:'.arcade-shell{color:red}.cel-dist-card{display:grid}.native-messenger{display:flex}'},
  'main.js':{type:'chunk',fileName:'assets/main.js',code:'const html=`<div class="arcade-shell native-messenger"><button class="cel-dist-card">Play</button></div>`;document.querySelector(".arcade-shell");const protocol="/api/games/catalog";'},
  'icon.svg':{type:'asset',fileName:'assets/icon.svg',source:'<svg class="arcade-shell" />'}
 };
 opaqueClientClasses().generateBundle({},bundle);
 const css=bundle['main.css'].source,js=bundle['main.js'].code;
 assert.doesNotMatch(css,/arcade-shell|cel-dist-card|native-messenger/);
 assert.doesNotMatch(js,/arcade-shell|cel-dist-card|native-messenger/);
 for(const name of [...css.matchAll(/\._[a-f0-9]{10}/g)].map(m=>m[0].slice(1))){
  assert.ok(js.includes(name),'the JavaScript markup/selector must use '+name);
 }
 assert.ok(js.includes('/api/games/catalog'),'the backend route must be unchanged');
 assert.equal(bundle['icon.svg'].source,'<svg class="arcade-shell" />');
});

test('navigation markers are opaque while displayed labels remain accessible',()=>{
 assert.equal(uiLabel(0),'Games');
 assert.equal(uiLabel(1),'Arcade');
 assert.equal(uiLabel(2),'Chat');
 assert.equal(uiLabel(4),'ARCADE LIBRARY');
 assert.equal(viewId('games'),'_v84ae39');
 assert.equal(viewId('chat'),'chat');
});
