import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Connect Four drops one disc at a time and respects reduced motion',()=>{
 const source=readFileSync(new URL('../public/boba/extra-games.js',import.meta.url),'utf8');
 const section=source.split('export function playConnectFour(stage){')[1]?.split('export function playMines(stage){')[0];
 assert.ok(section,'Connect Four implementation exists');
 assert.match(section,/async function animateDisc\(index\)/);
 assert.match(section,/piece\.animate\(/);
 assert.match(section,/await animateDisc\(index\)/);
 assert.match(section,/await animateDisc\(botIndex\)/);
 assert.match(section,/prefers-reduced-motion/);
 assert.match(section,/round!==currentRound/);
});

test('Arcade is the visible game section label, without a Cel Games header',()=>{
 const games=readFileSync(new URL('../public/boba/games.js',import.meta.url),'utf8');
 const native=readFileSync(new URL('../public/boba/native.js',import.meta.url),'utf8');
 assert.match(games,/const gameWord='Arcade'/);
 assert.match(native,/\['games','Arcade','play'\]/);
});
