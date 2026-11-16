import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Settings theme controls iterate every theme rather than calling forEach on one element',()=>{
 const source=readFileSync(new URL('../public/boba/settings.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\$\(['"]\.thm['"],root\)\.forEach\(/);
 assert.match(source,/root\.querySelectorAll\(['"]\.thm['"]\)/);
});
