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
  assert.match(main, /view==='home'\?<div className="celestial-home-split"/);
  assert.match(main, /className="celestial-home-main"/);
  assert.match(main, /<Browser user=\{user\} onAuth=\{setModal\} onShortcut=\{openDock\} homeMode/);
  assert.match(main, /className="celestial-home-rail"/);
  assert.match(main, /<AI key="celestial-home-sidebar" sidebar/);
  assert.match(browser, /search or enter a url/);
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
});

test('signed-in account is required before the workspace mounts', () => {
  assert.match(main, /if\(!user\) return/);
  assert.match(main, /mode="login" locked/);
  assert.doesNotMatch(main, /Continue exploring as guest/);
});

test('provider implementation details remain hidden from the AI interface', () => {
  assert.doesNotMatch(ai, /NVIDIA|OPENAI_API_KEY|NVIDIA_API_KEY|MODEL NOT CONNECTED|READY \/|AWAITING PROVIDER/i);
});
