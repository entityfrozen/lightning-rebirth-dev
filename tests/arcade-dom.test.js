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
