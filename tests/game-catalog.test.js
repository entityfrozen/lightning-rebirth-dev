import test from 'node:test';
import assert from 'node:assert/strict';
import {gameKey,normalizeGame,mergeCatalogs,getGameCatalog} from '../game-catalog.js';

test('catalog merges duplicate game names without losing alternate sources',()=>{
  const result=mergeCatalogs([
    ['Selenite',[{name:'Geometry Dash',directory:'webdash',image:'gd.webp'}]],
    ['GN-Math',[{name:'Geometry-Dash',url:'{HTML_URL}/33.html',cover:'{COVER_URL}/33.png',author:'Developer'}]],
    ['WASM.rip',[{name:'2048',gameUrl:'files/2048/index.html',imageUrl:'img/2048.png'}]]
  ]);
  assert.equal(gameKey('Geometry Dash'),gameKey('Geometry-Dash'));
  assert.equal(result.length,1);
  assert.equal(result[0].sources.length,2);
  assert.match(result[0].sources[0].cover,/\/resources\/semag\/webdash\/gd.webp/);
  assert.match(result[0].sources[1].cover,/raw.githubusercontent.com\/gn-math\/covers/);
  assert.match(result[0].sources[1].url,/raw.githack.com\/gn-math\/html/);
});

test('catalog rejects unsafe URLs and directory traversal',()=>{
  assert.equal(normalizeGame('WASM.rip',{name:'Unsafe',gameUrl:'javascript:alert(1)'}),null);
  assert.equal(normalizeGame('Selenite',{name:'Unsafe',directory:'../secret',image:'img.png'}),null);
  assert.equal(normalizeGame('GN-Math',{name:'No URL',cover:'{COVER_URL}/1.png'}),null);
});

test('catalog fetch normalizes the three distributor manifests',async()=>{
  const manifests={
    'https://selenite.cc/resources/games.json':[{name:'Selenite Game',directory:'sample',image:'cover.png'}],
    'https://wasm.rip/games.json':[{name:'WASM Game',gameUrl:'files/game.html',imageUrl:'img/game.png'}],
    'https://raw.githubusercontent.com/gn-math/assets/main/zones.json':[{name:'GN Game',url:'{HTML_URL}/1.html',cover:'{COVER_URL}/1.png'}]
  };
  const result=await getGameCatalog({refresh:true,fetcher:async url=>({ok:true,json:async()=>manifests[url]})});
  assert.equal(result.total,3);
  assert.deepEqual(result.unavailable,[]);
});
