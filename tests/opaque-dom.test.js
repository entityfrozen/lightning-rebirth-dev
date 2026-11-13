import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 buildOpaqueClassMap,replaceOpaqueClasses,opaqueDomClasses
} from '../scripts/opaque-dom.mjs';
import {viewMarker,originalView} from '../public/boba/view-markers.js';

test('production UI classes resolve to the same opaque names in CSS and markup',()=>{
 const css='.arcade-shell .arcade-card,.cel-simple-home,.celestial-discord{display:block}';
 const map=buildOpaqueClassMap(css);
 const markup='<main class="cel-simple-home"><button class="arcade-card"></button></main>';
 const result=replaceOpaqueClasses(markup,map);
 const styles=replaceOpaqueClasses(css,map);
 for(const [semantic,opaque] of map){
  assert.match(opaque,/^_bp[a-f0-9]{10}$/);
  assert.ok(styles.includes('.'+opaque));
  assert.ok(!result.includes('class="'+semantic+'"'));
 }
 assert.match(result,/class="_bp/);
 assert.doesNotMatch(result,/arcade-card|cel-simple-home/);
});

test('CSS obfuscation is production-only and preserves URLs, storage and APIs',()=>{
 const css='.arcade-shell,.celestial-discord,.cel-dock-star{display:block}';
 const plugin=opaqueDomClasses({stylesheet:css});
 const js="const markup='<div class=\"arcade-shell celestial-discord\"></div>'; const api=\"/api/games/catalog\"; const asset=\"/assets/celestial-star.svg\"; const key=\"celestial.lastView\";";
 const result=plugin.transform(js,'/app/public/boba/games.js')?.code;
 assert.ok(result&&result.includes('class="_bp'));
 assert.doesNotMatch(result,/class="arcade-shell/);
 assert.ok(result.includes('/api/games/catalog'));
 assert.ok(result.includes('/assets/celestial-star.svg'));
 assert.ok(result.includes('celestial.lastView'));
 assert.equal(plugin.transform(js,'/app/server.js'),null);
 assert.equal(plugin.apply,'build');
 assert.equal(plugin.enforce,'pre');
});

test('live view IDs are opaque but map back to persisted internal IDs',()=>{
 for(const name of ['home','browser','games','chat','ai','settings','admin','account']){
  assert.match(viewMarker(name),/^s[0-7]$/);
  assert.equal(originalView(viewMarker(name)),name);
 }
 const shell=readFileSync(new URL('../public/boba/shell.js',import.meta.url),'utf8');
 assert.doesNotMatch(shell,/data-view=\\\"games\\\"/);
 assert.match(shell,/data-view=\\\"s2\\\"/);
});
