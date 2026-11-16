import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
 createEncryptedGameAssetCache,openAssetArchive,safeGameAssetUrl,sealAssetArchive
} from '../game-asset-vault.js';

const handle='g_'+ 'p'.repeat(24);
const entry='https://selenite.cc/resources/semag/demo/index.html';
function fakeOrigin(){
 const resources=new Map([
  [entry,['<html><head><link href="style.css" rel="stylesheet"><script src="game.js"></script></head><body><img src="sprite.webp"></body></html>','text/html']],
  [new URL('style.css',entry).href,['body{background:url("tile.png")}','text/css']],
  [new URL('game.js',entry).href,['import "./level.js";const file=new URL("./core.wasm",import.meta.url);','text/javascript']],
  [new URL('level.js',entry).href,['export default 1;','text/javascript']],
  [new URL('core.wasm',entry).href,[Buffer.from([0,97,115,109,1,0,0,0]),'application/wasm']],
  [new URL('sprite.webp',entry).href,[Buffer.from([82,73,70,70,0]),'image/webp']],
  [new URL('tile.png',entry).href,[Buffer.from([137,80,78,71]),'image/png']]
 ]);
 const seen=[];
 return {seen,fetcher:async url=>{
  seen.push(url);
  const item=resources.get(url);
  if(!item)return new Response('Missing',{status:404});
  return new Response(item[0],{headers:{'content-type':item[1]}});
 }};
}
test('only trusted HTTPS game hosts can be captured, never internal hosts',()=>{
 assert.equal(safeGameAssetUrl(entry,'Selenite'),entry);
 assert.equal(safeGameAssetUrl('https://127.0.0.1/secret','Selenite'),null);
 assert.equal(safeGameAssetUrl('http://selenite.cc/games','Selenite'),null);
 assert.equal(safeGameAssetUrl('https://selenite.cc:8443/secret','Selenite'),null);
 assert.equal(safeGameAssetUrl('https://selenite.cc@localhost/secrets','Selenite'),null);
 assert.equal(safeGameAssetUrl('https://selenite.cc/a','WASM.rip'),null);
 assert.equal(safeGameAssetUrl('https://evilselenite.cc/a','Selenite'),null);
});
test('AES-256-GCM protects every stored asset and rejects tampering',()=>{
 const key=randomBytes(32);
 const record={savedAt:Date.now(),bytes:4,partial:false,assets:[
  {url:entry,type:'text/html',data:Buffer.from('<html>').toString('base64'),bytes:6}
 ]};
 const a=sealAssetArchive(record,key),b=sealAssetArchive(record,key);
 assert.notDeepEqual(a,b,'a fresh nonce is required');
 assert.deepEqual(openAssetArchive(a,key),record);
 assert.doesNotMatch(a.toString('utf8'),/selenite|html/);
 assert.throws(()=>openAssetArchive(a,randomBytes(32)));
 const altered=Buffer.from(a);altered[altered.length-1]^=1;
 assert.throws(()=>openAssetArchive(altered,key));
});
test('captures linked HTML, JS, CSS, images and WASM encrypted on disk',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'celestial-asset-cache-'));
 try{
  const key=randomBytes(32),origin=fakeOrigin();
  const cache=await createEncryptedGameAssetCache({
   directory:dir,key,fetcher:origin.fetcher
  });
  const result=await cache.capture({handle,index:0,sourceName:'Selenite',url:entry});
  assert.equal(result.encrypted,true);
  assert.equal(result.cached,true);
  assert.equal(result.files,7);
  assert.equal(result.partial,false);
  const archive=await cache.load(handle,0);
  assert.equal(archive.assets.length,7);
  assert.ok(archive.assets.some(x=>x.type==='application/wasm'));
  assert.ok(archive.assets.some(x=>x.type==='text/javascript'));
  const {readdir}=await import('node:fs/promises');
  const files=await readdir(dir);
  assert.equal(files.length,1);
  assert.match(files[0],/^[a-f0-9]{64}\.enc$/);
  const disk=await readFile(path.join(dir,files[0]));
  assert.ok(disk.subarray(0,4).equals(Buffer.from('CGA1')));
  assert.equal(disk.includes(Buffer.from('selenite.cc')),false);
  assert.equal(disk.includes(Buffer.from('<html>')),false);
  const second=await createEncryptedGameAssetCache({directory:dir,key,fetcher:async()=>{throw Error('should reuse cache')}});
  assert.equal((await second.capture({handle,index:0,sourceName:'Selenite',url:entry})).files,7);
  const before=origin.seen.length;
  await cache.capture({handle,index:0,sourceName:'Selenite',url:entry});
  assert.equal(origin.seen.length,before,'cache prevents repeated downloads');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('never follows a redirect to internal network addresses',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'celestial-asset-redirect-'));
 const seen=[];
 try{
  const cache=await createEncryptedGameAssetCache({
   directory:dir,key:randomBytes(32),
   fetcher:async url=>{
    seen.push(url);
    return new Response(null,{status:302,headers:{location:'http://127.0.0.1/admin'}});
   }
  });
  await assert.rejects(
   ()=>cache.capture({handle,index:0,sourceName:'Selenite',url:entry}),
   /No approved assets/
  );
  assert.deepEqual(seen,[entry]);
  assert.equal((await cache.status(handle,0)).cached,false);
 }finally{await rm(dir,{recursive:true,force:true})}
});
