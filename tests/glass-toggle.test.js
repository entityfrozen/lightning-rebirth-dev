import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlassToggle, makePairs } from '../public/glass-toggle.js';

test('pixel morph preserves the complete sun and covers every moon dot', () => {
  const pairs = makePairs();
  assert.equal(pairs.length, 49 * 4);
  const origins = new Set();
  const destinations = new Set();
  let previousAngle = -Infinity;
  for (let i = 0; i < pairs.length; i += 4) {
    const dot = [...pairs.slice(i, i + 4)];
    assert.ok(dot.every(value => Number.isFinite(value) && Math.abs(value) <= 6));
    const angle = Math.atan2(dot[1], dot[0]);
    assert.ok(angle >= previousAngle);
    previousAngle = angle;
    origins.add(dot[0] + ',' + dot[1]);
    destinations.add(dot[2] + ',' + dot[3]);
  }
  assert.equal(origins.size, 46);
  assert.equal(destinations.size, 49);
});

test('dragging pauses the morph halfway and commits only on release', () => {
  const frames = [];
  let frameNumber = 0;
  let timestamp = 0;
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {} })
  };
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = callback => {
    frames.push(callback);
    return ++frameNumber;
  };
  const flush = () => {
    let n = 0;
    while (frames.length && n++ < 200) {
      timestamp += 16.667;
      frames.shift()(timestamp);
    }
    assert.ok(n < 200, 'animation should settle');
  };
  const listeners = new Map();
  const props = new Map();
  const button = {
    dataset: {},
    classList: { add() {}, remove() {} },
    style: { setProperty: (key, value) => props.set(key, value) },
    addEventListener: (type, handler) => listeners.set(type, handler),
    querySelector: () => ({ getContext: () => null, addEventListener() {} }),
    setAttribute: (key, value) => { button[key] = value; },
    setPointerCapture() {},
    focus() {},
    getBoundingClientRect: () => ({ left: 0, width: 148 })
  };
  const changes = [];
  const toggle = createGlassToggle(button, {
    initial: 'dark',
    onChange: mode => changes.push(mode)
  });
  flush();
  listeners.get('pointerdown')({
    button: 0, pointerId: 1, clientX: 37, preventDefault() {}
  });
  listeners.get('pointermove')({ pointerId: 1, clientX: 74 });
  flush();

  assert.equal(Number(props.get('--glass-position')), 0.5);
  assert.deepEqual(changes, []);
  listeners.get('pointerup')({ pointerId: 1, clientX: 111 });
  flush();
  assert.deepEqual(changes, ['light']);
  assert.equal(button['aria-checked'], 'true');
  assert.equal(Number(props.get('--glass-position')), 1);

  // Browser pointer clicks should not also toggle the control.
  listeners.get('click')({ detail: 1 });
  assert.deepEqual(changes, ['light']);
  listeners.get('click')({ detail: 0 });
  flush();
  assert.deepEqual(changes, ['light', 'dark']);
  toggle.setReducedMotion(true);
});
