import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/auth.css',import.meta.url),'utf8');

test('login and signup still use existing account endpoints',()=>{
  assert.match(main,/registering\?'\/api\/register':'\/api\/login'/);
  assert.match(main,/onLoggedIn\(result\.user\)/);
  assert.match(main,/result\.status==='pending'/);
  assert.match(main,/confirmPassword/);
  assert.match(main,/Those passwords don/);
});
test('auth form remains usable without animation and has accessible labels',()=>{
  assert.match(main,/name="username" autoComplete="username"/);
  assert.match(main,/autoComplete=\{registering\?'new-password':'current-password'\}/);
  assert.match(main,/role="alert"/);
  assert.match(main,/aria-pressed=\{registering\}/);
  assert.match(main,/type="submit" disabled=\{busy\}/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/:root\[data-motion="reduced"\]/);
  assert.match(css,/@media \(max-width: 420px\)/);
  assert.match(main,/import '\.\/auth\.css'/);
});
