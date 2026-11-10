import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const browser=readFileSync(new URL('../src/Browser.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/navigation.css',import.meta.url),'utf8');

test('primary navigation is always available with visible labels',()=>{
  for(const item of ['Home','Browser','Apps','Chat','AI']){
    assert.match(shell,new RegExp("label:'"+item+"'"));
  }
  assert.match(shell,/aria-label="Main navigation"/);
  assert.match(shell,/dock-link-label/);
  assert.match(shell,/aria-current=\{selected\?'page':undefined\}/);
  assert.match(shell,/className="dock-toggle"/);
  assert.match(shell,/navigation-expanded/);
  assert.doesNotMatch(shell,/inert=\{!dockOpen\}/);
  assert.match(css,/\.celestial-workspace\.nav-compact \.dock-link/);
  assert.match(css,/\.celestial-workspace\.nav-compact \.dock-link-label/);
});

test('mobile navigation keeps labeled destinations accessible',()=>{
  assert.match(css,/@media \(max-width: 820px\)/);
  assert.match(css,/\.celestial-workspace \.dock-group\.main-links/);
  assert.match(css,/\.celestial-workspace \.dock-link-label,\s*\n\s*\.celestial-workspace\.nav-compact \.dock-link-label/);
  assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/\.celestial-workspace \.celestial-stage \{/);
});

test('the home page explains where every primary action goes',()=>{
  for(const label of ['Browser','Apps','Chat','AI']){
    assert.match(browser,new RegExp("label:'"+label+"'"));
  }
  assert.match(browser,/homeMode\?<div className="celestial-home-starter"/);
  assert.match(browser,/Where to\?/);
  assert.match(browser,/onShortcut\?\.\(item\.id\)/);
});

test('quick switcher supports keyboard access and search',()=>{
  assert.match(shell,/event\.key\.toLowerCase\(\)==='k'/);
  assert.match(shell,/setJumpOpen/);
  assert.match(shell,/role="dialog" aria-modal="true" aria-label="Switch to a page"/);
  assert.match(shell,/aria-label="Find a page"/);
  assert.match(shell,/event\.key==='Enter'/);
  assert.match(shell,/event\.key==='Escape'/);
});
