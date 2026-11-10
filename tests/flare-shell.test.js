import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const main=read('src/main.jsx');
const browser=read('src/Browser.jsx');
const css=read('src/flare-shell.css');
const cloak=read('src/Cloak.js');
const html=read('public/index.html');

test('new-tab screen uses centered Search while retaining a working browser',()=>{
  assert.match(browser,/homeMode\?submitHome:submit/);
  assert.match(browser,/aria-label="Search"/);
  assert.match(browser,/Search the web or enter a URL/);
  assert.match(browser,/const url=browserAddress\(homeQuery,prefs\.searchEngine\)/);
  assert.match(browser,/addTab\(url\)/);
  assert.match(browser,/onOpenBrowser\?\.\(\)/);
  assert.match(browser,/onCloseBrowser\?\.\(\)/);
  assert.match(browser,/Close browser and return Home/);
  assert.match(browser,/flare-browser-bottom-tabs/);
  assert.match(browser,/\{!homeMode&&<div className="flare-browser-bottom-tabs"/);
});
test('same Browser component survives moving between Home and Browser',()=>{
  assert.match(main,/\['home','browser'\]\.includes\(view\)\?<div/);
  assert.match(main,/homeMode=\{view==='home'\}/);
  assert.match(main,/onOpenBrowser=\{\(\)=>selectSection\('browser'\)\}/);
  assert.match(main,/onCloseBrowser=\{\(\)=>selectSection\('home'\)\}/);
  assert.match(css,/\.forest-browser\.home-mode \.browser-frame/);
  assert.match(css,/visibility:hidden !important/);
});
test('all workspace destinations and tab strips sit at the bottom',()=>{
  assert.match(css,/\.celestial-workspace \.dock-shell\.closed/);
  assert.match(css,/bottom:calc\(11px \+ env\(safe-area-inset-bottom/);
  assert.match(css,/\.flare-browser-bottom-tabs/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.celestial-workspace \.celestial-stage/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Study Portal tab identity is local, optional and does not add third-party scripts',()=>{
  assert.match(cloak,/study:\{label:'Study Portal'/);
  assert.match(cloak,/celestial:\{label:'Celestial'/);
  assert.match(html,/<title>Study Portal \| Research Workspace<\/title>/);
  assert.match(html,/study-portal\.svg/);
  assert.doesNotMatch(html,/googletagmanager|bicea\.org|flare\.svg/);
  assert.doesNotMatch(main,/script\.woff2|umt224\.js|t5pnyv\.js/);
  assert.match(css,/linear-gradient\(145deg/);
});
