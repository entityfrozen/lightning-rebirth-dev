import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {opaqueDomClasses} from '../scripts/opaque-dom.mjs';

const read = file => readFileSync(new URL(file,import.meta.url),'utf8');

test('the academy page is the initial source document, not the workspace',()=>{
  const html=read('../public/boba/index.template.html');
  assert.match(html,/<html lang="en" class="academy-loading"/);
  assert.match(html,/<main id="academyLanding"/);
  assert.match(html,/Asterfield Academy/);
  assert.match(html,/<div id="root" aria-busy="true"><\/div>/);
  assert.doesNotMatch(html,/<select|wproxy|scramjet|ultraviolet|proxy/i);
});

test('the launch module defers the workspace until the three-second intro completes',()=>{
  const script=read('../src/boba-launch.js');
  const config=read('../vite.boba.config.js');
  const injector=read('../scripts/inject-native-assets.mjs');
  assert.match(script,/INTRO_MS = 3000/);
  assert.match(script,/setTimeout\(begin,/);
  assert.match(script,/await import\('\.\/boba-client\.js'\)/);
  assert.match(script,/matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(config,/launch:resolve\('src\/boba-launch\.js'\)/);
  assert.match(injector,/\['index','src\/boba-launch\.js'\]/);
});

test('published engine selector class is opaque instead of exposing an implementation label',()=>{
  const plugin=opaqueDomClasses({stylesheet:'.cel-simple-home{display:block}'});
  const input='<select class="wproxy" data-engine-mode><option>Reflux</option></select>';
  const app=plugin.transform('const html='+JSON.stringify(input),'/app/public/boba/browser.js')?.code;
  const stylesheet=plugin.transform('.wproxy{padding:8px}', '/app/public/boba/original.css')?.code;
  assert.ok(app);
  assert.ok(stylesheet);
  assert.doesNotMatch(app,/wproxy/);
  assert.doesNotMatch(stylesheet,/wproxy/);
  assert.match(app,/_bp[a-f0-9]{10}/);
  assert.match(stylesheet,/_bp[a-f0-9]{10}/);
  assert.match(app,/data-engine-mode/);
  assert.match(app,/Reflux/);
});
