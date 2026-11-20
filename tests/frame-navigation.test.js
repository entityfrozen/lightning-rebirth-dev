import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=()=>readFileSync(new URL('../public/boba/browser.js',import.meta.url),'utf8');

test('native browser navigates in its own sandboxed iframe',()=>{
  const code=source();
  assert.match(code,/t\.frame\.src='\/browse\/u\/'/);
  assert.match(code,/sandbox="allow-scripts allow-forms allow-popups allow-downloads"/);
  assert.doesNotMatch(code,/createProxyFrame|createUltravioletFrame/);
});

test('newer tab navigation wins and old asynchronous grants cannot override it',()=>{
  const code=source();
  assert.match(code,/const ticket=Symbol\('navigation'\)/);
  assert.match(code,/if\(t\.ticket!==ticket/);
  assert.match(code,/clearTimeout\(t\.timer\)/);
  assert.match(code,/t\.frame\?\.remove\(\)/);
});
