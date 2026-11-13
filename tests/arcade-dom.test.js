import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Arcade markup and styles use matching class names without legacy cel-games identifiers',()=>{
 const markup=read('../public/boba/games.js');
 const extras=read('../public/boba/extra-games.js');
 const styles=read('../public/boba/native.css');
 for(const source of [markup,extras,styles]){
  assert.doesNotMatch(source,/\bcel-games(?:-[a-z]+)?\b|\bcel-game-[a-z-]+\b|\bcel-extra-game\b|\bcel-simple-game\b/);
 }
 const catalog=read('../public/boba/catalog-ui.js');
 assert.match(catalog,/root\.querySelector\(['"]\.arcade-shell['"]\)/);
 assert.doesNotMatch(catalog,/root\.querySelector\(['"]\.cel-games['"]\)/);
 assert.match(catalog,/arcade\.append\(section\)/);
 for(const name of ['arcade-shell','arcade-head','arcade-search','arcade-grid','arcade-card','arcade-stage','arcade-panel']){
  assert.ok(markup.includes(name)||extras.includes(name),name+' exists in game markup');
  assert.ok(styles.includes('.'+name),name+' has matching CSS');
 }
});

test('Arcade card buttons use stable numeric indices rather than exposing internal game IDs',()=>{
 const markup=read('../public/boba/games.js');
 assert.match(markup,/data-index/);
 assert.doesNotMatch(markup,/data-arcade-index|data-game-title|data-play-area/);
 assert.match(markup,/querySelector\('\[data-canvas\]'\)/);
 assert.match(markup,/querySelector\('\[data-item-title\]'\)/);
 assert.match(markup,/closest\('\[data-index\]'\)/);
 assert.match(markup,/arcadeItems\.indexOf\(g\)/);
 assert.match(markup,/arcadeItems\[index\]/);
 assert.doesNotMatch(markup,/data-game="'+g\.id/);
 assert.doesNotMatch(markup,/b\.dataset\.game/);
});

test('Arcade startup calls the mount function exported by the game module',()=>{
 const entry=read('../public/boba/native.js');
 const games=read('../public/boba/games.js');
 assert.match(entry,/import\s*\{\s*mountArcade\s*\}\s*from\s*['"]\.\/games\.js['"]/);
 assert.match(games,/export function mountArcade\s*\(/);
 assert.match(entry,/mountSafely\('Library',view\('games'\),\(\)=>mountArcade\(view\('games'\)\)\)/);
 assert.doesNotMatch(entry,/\bmountGames\s*\(/);
});

test('Distributor Canvas cards retain neutral accessible names even when titles contain game',()=>{
 const catalog=read('../public/boba/catalog-ui.js');
 assert.match(catalog,/aria-label="Open library item /);
 assert.doesNotMatch(catalog,/aria-label="'\+esc\(game\.name\)/);
 assert.match(catalog,/<canvas class=\\?"cel-dist-name/);
});

test('Brightpath originals avoid the generic term in rendered text',()=>{
 const own=read('../public/boba/games.js');
 const extras=read('../public/boba/extra-games.js');
 const catalog=read('../public/boba/catalog-ui.js');
 assert.match(own,/Challenge rivals in the original online fighter/);
 for(const phrase of ['New game','Start a new game','Game over','Connect Four game board',
  'Play the original online fighting game','Each game and its cover artwork',
  'select a game','Preparing game source','Unable to open this game'])
  assert.ok(![own,extras,catalog].some(source=>source.includes(phrase)),phrase);
 assert.match(own,/data-stage-title/);
 assert.match(own,/drawCanvasTitle/);
 assert.match(catalog,/frame\.title='Library player'/);
});
