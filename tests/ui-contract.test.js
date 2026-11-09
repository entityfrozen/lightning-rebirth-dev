import test from 'node:test';
import assert from 'node:assert/strict';
import { navigation, safeUrl, channels } from '../src/constants.js';

test('Celestial keeps exactly four primary applications', () => {
  assert.deepEqual(navigation.map(item => item.label), ['Arcade','Browser','Chat','AI']);
  assert.deepEqual(navigation.map(item => item.id), ['arcade','browser','chat','ai']);
});

test('browser address processing accepts only HTTP(S)', () => {
  assert.equal(safeUrl('example.com/hello'),'https://example.com/hello');
  assert.equal(safeUrl('https://threejs.org/'),'https://threejs.org/');
  assert.match(safeUrl('three js dispersion'),/^https:\/\/www\.google\.com\/search\?q=/);
  assert.equal(safeUrl('javascript:alert(1)'),null);
  assert.equal(safeUrl('data:text/html,payload'),null);
  assert.equal(safeUrl('file:///etc/passwd'),null);
});

test('old community channels remain compatible', () => {
  assert.deepEqual(Object.keys(channels), ['general','help','showcase']);
});
