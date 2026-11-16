import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactPageHTML,entityEncode} from '../scripts/compact-boba-html.mjs';

test('production document sends the metadata without literal readable copy',()=>{
 const source=[
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<title>Brightpath | Learning Workspace</title>',
  '<meta name="description" content="A calm personal workspace">',
  '<meta property="og:title" content="Brightpath | Learning Workspace">',
  '</head>',
  '<body>',
  '<div id="root"></div>',
  '<script type="module" src="/boba/dist/assets/app-abc123.js"></script>',
  '</body></html>'
 ].join('\n');
 const result=compactPageHTML(source);
 assert.doesNotMatch(result,/Brightpath|Learning Workspace|A calm personal workspace/);
 assert.match(result,/<div id="root"><\/div>/);
 assert.match(result,/\/boba\/dist\/assets\/app-abc123\.js/);
 assert.equal(result.includes('>\n<'),false,'Adjacent tags are compacted');
 const unescape=value=>value.replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)));
 assert.match(unescape(result),/<title>Brightpath \| Learning Workspace<\/title>/);
 assert.match(unescape(result),/content="A calm personal workspace"/);
});

test('HTML reference encoding handles astral Unicode without truncating characters',()=>{
 assert.equal(entityEncode('✦ 🎮'), '&#10022;&#32;&#127918;');
});

test('No inline scripts or fake security barriers are introduced by compaction',()=>{
 const output=compactPageHTML('<html><head><title>Home</title></head><body><div id="root"></div></body></html>');
 assert.doesNotMatch(output,/<script|oncontextmenu=|onkeydown=/i);
 assert.match(output,/<div id="root"><\/div>/);
});
