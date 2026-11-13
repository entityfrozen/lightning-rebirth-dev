import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapCanvasTitle} from '../public/boba/canvas-titles.js';

const units=value=>Array.from(value).length;

test('canvas titles preserve names while wrapping complete words',()=>{
 assert.deepEqual(
  wrapCanvasTitle('A Difficult Game About Climbing',units,12),
  ['A Difficult','Game About','Climbing']
 );
 assert.deepEqual(wrapCanvasTitle('One   title',units,12),['One title']);
});

test('canvas titles wrap unbroken names and Unicode without truncating',()=>{
 assert.deepEqual(wrapCanvasTitle('abcdefghijk',units,4),['abcd','efgh','ijk']);
 assert.deepEqual(wrapCanvasTitle('🪐☀️🚀',units,1),Array.from('🪐☀️🚀'));
 assert.deepEqual(wrapCanvasTitle(' ',units,140),['']);
});

test('canvas title layout uses the measured font width rather than characters',()=>{
 const measure=value=>Array.from(value).reduce((width,glyph)=>width+(glyph==='W'?4:1),0);
 assert.deepEqual(wrapCanvasTitle('WWW WIN',measure,11),['WW','W WIN']);
});
