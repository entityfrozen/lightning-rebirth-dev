import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
const ai = readFileSync(path.join(root, 'src/AI.jsx'), 'utf8');

test('the homepage is a real AI conversation, not the web browser', () => {
  assert.match(main, /sections\.has\(route\).*:'home'/);
  assert.match(main, /view==='home'\?<AI/);
  assert.match(ai, /celestial-home-ai/);
  assert.match(ai, /ask celestial anything/);
  assert.match(ai, /\/api\/ai/);
});

test('a signed-in account is required before the workspace mounts', () => {
  assert.match(main, /if\(!user\) return/);
  assert.match(main, /mode="login" locked/);
  assert.doesNotMatch(main, /Continue exploring as guest/);
});

test('provider implementation details are absent from the AI interface', () => {
  assert.doesNotMatch(ai, /NVIDIA|OPENAI_API_KEY|NVIDIA_API_KEY|MODEL NOT CONNECTED|READY \/|AWAITING PROVIDER/i);
});
