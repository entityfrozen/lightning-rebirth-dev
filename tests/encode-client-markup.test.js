import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {parseAst} from 'rollup/parseAst';
import {codePoints,encodeMarkupSource,encodeClientMarkup} from '../scripts/encode-client-markup.mjs';

test('numeric encoding preserves markup, Unicode, selectors and captions',()=>{
 const original=[
  "const html='<button class=\"arcade-card\" data-arcade-index=\"1\">Play ♥ 🎮</button>';",
  "const selector='[data-arcade-index]';",
  "const label='Arcade';",
  "JSON.stringify({html,selector,label});"
 ].join('\n');
 const changed=encodeMarkupSource(original,parseAst);
 assert.ok(changed?.count>=2,'Markup and caption should be encoded');
 assert.doesNotMatch(changed.code,/<button class="arcade-card"/);
 assert.doesNotMatch(changed.code,/const label='Arcade'/);
 assert.match(changed.code,/String\.fromCharCode\(/);
 assert.equal(runInNewContext(changed.code),runInNewContext(original));
 assert.ok(changed.code.includes("'[data-arcade-index]'"),
  'DOM selectors must remain unchanged');
});

test('static HTML templates encode; dynamic templates retain interpolations',()=>{
 const tick=String.fromCharCode(96);
 const original=[
  'const template='+tick+'<section class="cel-dist-grid">Discover more</section>'+tick+';',
  "const name='Alice';",
  'const dynamic='+tick+'<button>$'+'{name}</button>'+tick+';',
  'JSON.stringify({template,dynamic});'
 ].join('\n');
 const changed=encodeMarkupSource(original,parseAst);
 assert.ok(changed?.count>=1);
 assert.doesNotMatch(changed.code,/<section class="cel-dist-grid">/);
 assert.match(changed.code,/<button>\$\{name\}<\/button>/);
 assert.equal(runInNewContext(changed.code),runInNewContext(original));
});

test('encoding never changes API paths or other modules',()=>{
 const original='Restore 🎮 Unicode \u00e9';
 assert.equal(runInNewContext(codePoints(original)),original);
 assert.equal(encodeMarkupSource("const url='/api/games/catalog';",parseAst),null);
 const plugin=encodeClientMarkup();
 assert.equal(plugin.apply,'build');
 assert.equal(plugin.transform("const markup='<div>Safe</div>';",'/some/other/source.js'),null);
});
