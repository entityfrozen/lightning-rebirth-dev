import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {CHESS_LEVELS,chooseChessMove} from '../chess-ai.js';

test('all four bot difficulty levels return legal chess.js moves',()=>{
 assert.deepEqual(CHESS_LEVELS,['easy','normal','hard','expert']);
 for(const level of CHESS_LEVELS){
  const position=new Chess();
  const move=chooseChessMove(position,level);
  assert.ok(move,`no move at difficulty ${level}`);
  assert.ok(position.moves({verbose:true}).some(m=>m.from===move.from&&m.to===move.to),
   `illegal move at difficulty ${level}`);
  assert.ok(position.move(move));
 }
});

test('the chess UI sends the chosen difficulty instead of a fixed value',()=>{
 const source=readFileSync(new URL('../src/Arcade.jsx',import.meta.url),'utf8');
 assert.match(source,/type:'chessBot',difficulty:level/);
 assert.match(source,/celestial-chess-level/);
 assert.match(source,/aria-pressed=\{level===item.id\}/);
 assert.match(source,/game\.difficulty/);
 assert.doesNotMatch(source,/type:'chessBot',difficulty:'normal'/);
});

test('Apps category filtering and Browser recovery tools are wired to actions',()=>{
 const apps=readFileSync(new URL('../src/Apps.jsx',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../src/Browser.jsx',import.meta.url),'utf8');
 assert.match(apps,/setCategory\(item.id\)/);
 assert.match(apps,/celestial-apps-filters/);
 assert.match(browser,/navigator\.clipboard\.writeText\(visibleUrl\)/);
 assert.match(browser,/onClick=\{reconnect\}/);
 assert.match(browser,/onClick=\{closeOtherTabs\}/);
});
