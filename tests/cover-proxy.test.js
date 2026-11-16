import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCoverUrl,loadCover} from '../cover-proxy.js';

const good='https://raw.githubusercontent.com/gn-math/covers/main/719.png';

test('cover URLs accept approved distributors and reject SSRF destinations',()=>{
 assert.equal(approvedCoverUrl(good),good);
 assert.equal(approvedCoverUrl('https://selenite.cc/resources/semag/game/cover.webp'),
  'https://selenite.cc/resources/semag/game/cover.webp');
 assert.equal(approvedCoverUrl('https://wasm.rip/img/cover.png'),'https://wasm.rip/img/cover.png');
 for(const url of [
  'http://raw.githubusercontent.com/gn-math/covers/main/719.png',
  'https://raw.githubusercontent.com.attacker.invalid/a.png',
  'https://raw.githubusercontent.com/other-owner/thing.png',
  'https://127.0.0.1/image.png','https://localhost/x.png',
  'https://selenite.cc.evil.invalid/x.png',
  'https://selenite.cc:444/x.png',
  'https://user:password@selenite.cc/x.png',
  'https://selenite.cc/img.png#fragment'
 ])assert.equal(approvedCoverUrl(url),null,url);
});

test('images are fetched with manual redirects and a strict content type',async()=>{
 const image=new Uint8Array([137,80,78,71,13,10,26,10]);
 let calls=0;
 const fetcher=async (url,opts)=>{
  calls++;
  assert.equal(url,good);
  assert.equal(opts.redirect,'manual');
  return new Response(image,{status:200,headers:{'Content-Type':'image/png','Content-Length':String(image.length)}});
 };
 const first=await loadCover(good,{fetcher});
 assert.equal(first.contentType,'image/png');
 assert.deepEqual(first.content,Buffer.from(image));
 const second=await loadCover(good,{fetcher});
 assert.deepEqual(second,first);
 assert.equal(calls,1,'cache should avoid redundant upstream requests');
});

test('rejects redirects, HTML and oversized artwork',async()=>{
 const cover='https://wasm.rip/img/size-check-a.png';
 await assert.rejects(()=>loadCover(cover,{fetcher:async()=>
  new Response(null,{status:302,headers:{Location:'http://127.0.0.1/'}})}),/HTTP 302/);
 await assert.rejects(()=>loadCover(cover,{fetcher:async()=>
  new Response('<html></html>',{headers:{'Content-Type':'text/html'}})}),/Unsupported artwork/);
 await assert.rejects(()=>loadCover(cover,{fetcher:async()=>
  new Response(new Uint8Array([1]),{headers:{'Content-Type':'image/png','Content-Length':'5000000'}})}),/size limit/);
 await assert.rejects(()=>loadCover(cover,{fetcher:async()=>
  new Response(new Uint8Array(2*1024*1024+1),{headers:{'Content-Type':'image/png'}})}),/size limit/);
 await assert.rejects(()=>loadCover('https://bad.invalid/thing.png',{fetcher:async()=>
  {throw Error('Fetch should not be reached')}}),/not approved/);
});
