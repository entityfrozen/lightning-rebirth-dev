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
test('account screen is plain, with no marketing panel, brand label or orbital art',()=>{
  const auth=main.split('function AuthSheet(')[1].split('function Modal(')[0];
  for(const phrase of [
    'YOUR SPACE, YOUR PACE',
    'Everything in',
    'Hang out, play',
    'CELESTIAL NETWORK',
    'EST. 2026',
    'PLAY · BROWSE · CONNECT',
    '© CELESTIAL'
  ])assert.ok(!auth.includes(phrase),'Marketing copy remains: '+phrase);
  for(const className of [
    'auth-art','auth-brand','auth-constellation','auth-orbit',
    'auth-core','auth-mobile-mark','auth-bottom-line'
  ])assert.ok(!auth.includes(className),'Old artwork remains: '+className);
  assert.doesNotMatch(css,/auth-orbit|auth-constellation|celestial-auth-spin/);
  assert.match(css,/width: min\(440px, 100%\)/);
  assert.match(auth,/Create an account/);
  assert.match(auth,/Sign in/);
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
