import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
const ai = readFileSync(path.join(root, 'src/AI.jsx'), 'utf8');
const browser = readFileSync(path.join(root, 'src/Browser.jsx'), 'utf8');
const layout = readFileSync(path.join(root, 'src/home-split.css'), 'utf8');

test('home splits the real main page and Celestial AI into side-by-side panels', () => {
  assert.match(main, /sections\.has\(route\).*:'home'/);
  assert.match(main, /\['home','browser'\]\.includes\(view\)\?<div className=\{[\s\S]*?celestial-home-split/);
  assert.match(main, /className="celestial-home-main"/);
  assert.match(main, /<Browser user=\{user\} onAuth=\{setModal\} onShortcut=\{openDock\}/);
  assert.match(main, /className="celestial-home-rail"/);
  assert.match(main, /<AI key="celestial-home-sidebar" sidebar/);
  assert.match(browser, /Search the web or enter a URL/);
  assert.match(layout, /grid-template-columns:\s*minmax\(0, 1fr\) var\(--celestial-sidebar-width\)/);
});

test('AI sidebar is a functional conversation, not a decorative widget', () => {
  assert.match(ai, /if \(sidebar\)/);
  assert.match(ai, /celestial-ai-sidebar-feed/);
  assert.match(ai, /celestial-ai-sidebar-composer/);
  assert.match(ai, /celestial-ai-sidebar-history/);
  assert.match(ai, /New conversation/);
  assert.match(ai, /\/api\/ai/);
  assert.match(layout, /@media\(max-width: 760px\)/);
  assert.match(main, /\[showHomeAI,setShowHomeAI\]=useState/);
  assert.match(main, /setShowHomeAI\(false\)/);
  assert.match(main, /setShowHomeAI\(true\)/);
  assert.match(ai, /Hide Celestial AI sidebar/);
  assert.match(layout, /\.celestial-home-split\.ai-hidden/);
  assert.match(layout, /grid-template-rows: minmax\(100dvh, 1fr\)/);

});

test('AI sidebar preference can be changed and restored from Settings', () => {
  const settings=readFileSync(path.join(root,'src/Settings.jsx'),'utf8');
  assert.match(settings, /Celestial AI sidebar/);
  assert.match(settings, /checked=\{showHomeAI\} onChange=\{setShowHomeAI\}/);
  assert.match(main, /saveLocal\('home-ai-sidebar',showHomeAI\)/);
  assert.match(settings, /if\(typeof data\.showHomeAI==='boolean'\)setShowHomeAI\(data\.showHomeAI\)/);
});

test('signed-in account is required before the workspace mounts', () => {
  assert.match(main, /if\(!user\) return/);
  assert.match(main, /mode="login" locked/);
  assert.doesNotMatch(main, /Continue exploring as guest/);
});

test('provider implementation details remain hidden from the AI interface', () => {
  assert.doesNotMatch(ai, /NVIDIA|OPENAI_API_KEY|NVIDIA_API_KEY|MODEL NOT CONNECTED|READY \/|AWAITING PROVIDER/i);
});
