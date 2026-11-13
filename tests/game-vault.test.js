import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createGameVault,sealGameCatalog,openGameCatalog} from '../game-vault.js';

const example={
 expiresAt:Date.now()+100000,
 catalog:{
  total:1,unavailable:[],updatedAt:'2026-11-12T00:00:00Z',
  games:[{id:'geometrydash',name:'Geometry Dash',sources:[
   {name:'Selenite',url:'https://selenite.cc/resources/semag/geometry/index.html',cover:'https://selenite.cc/cover.webp',creator:'Author'}
  ]}]
 }
};

test('game catalog AES-256-GCM round-trip, fresh IV and tamper rejection',()=>{
 const key=randomBytes(32),a=sealGameCatalog(example,key),b=sealGameCatalog(example,key);
 assert.notDeepEqual(a,b,'each encryption must use a fresh IV');
 assert.deepEqual(openGameCatalog(a,key),example);
 assert.doesNotMatch(a.toString('utf8'),/selenite\.cc/);
 assert.throws(()=>openGameCatalog(a,randomBytes(32)));
 const modified=Buffer.from(a);modified[modified.length-1]^=1;
 assert.throws(()=>openGameCatalog(modified,key),'GCM must reject altered ciphertext');
 assert.throws(()=>openGameCatalog(Buffer.from('no'),key));
});

test('vault persists ciphertext, hides source URLs until authenticated resolution',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'celestial-game-vault-'));
 try{
  const key=randomBytes(32).toString('hex');
  const a=await createGameVault({directory:dir,keyHex:key});
  await a.save(example);
  const raw=await readFile(path.join(dir,'catalog.enc'));
  assert.doesNotMatch(raw.toString('utf8'),/geometrydash|selenite\.cc|Geometry Dash/);
  const b=await createGameVault({directory:dir,keyHex:key});
  assert.deepEqual(await b.load(),example);
  const view=b.publicCatalog(example.catalog);
  assert.match(view.games[0].id,/^g_[\w-]{24}$/);
  assert.equal(view.games[0].sources[0].url,undefined);
  assert.equal(JSON.stringify(view).includes('selenite.cc/resources/semag'),false);
  assert.equal(b.launchUrl(example.catalog,view.games[0].id,0),example.catalog.games[0].sources[0].url);
  assert.equal(b.launchUrl(example.catalog,'geometrydash',0),null);
  assert.equal(b.launchUrl(example.catalog,view.games[0].id,1),null);
  assert.equal(b.launchUrl(example.catalog,view.games[0].id,-1),null);
  assert.deepEqual(b.publicCatalog(example.catalog),view);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('wrong key fails and local development fallback key remains stable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'celestial-game-vault-'));
 try{
  const one=await createGameVault({directory:dir,keyHex:null});
  await one.save(example);
  const two=await createGameVault({directory:dir,keyHex:null});
  assert.deepEqual(await two.load(),example);
  await assert.rejects(()=>createGameVault({directory:dir,keyHex:'1234'}),/64 hex/);
  const wrong=await createGameVault({directory:dir,keyHex:randomBytes(32).toString('hex')});
  await assert.rejects(()=>wrong.load());
 }finally{await rm(dir,{recursive:true,force:true})}
});
