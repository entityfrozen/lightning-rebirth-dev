import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const palette={accent:'#b67cff',background:'#0f0b1b',surface:'#20152f',text:'#f9f2ff',muted:'#b8a9cb',line:'#513966',glow:55,radius:16,petals:true};

test('end-to-end account, chat, and community drop API', {timeout:18000}, async ()=>{
  const tmp=await mkdtemp(path.join(tmpdir(),'celestial-test-'));
  const port=31000+Math.floor(Math.random()*10000);
  const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),LIGHTNING_DATA_FILE:path.join(tmp,'store.json')},stdio:'pipe'});
  let cookie='';
  const url=`http://127.0.0.1:${port}`;
  const call=async(route,method='GET',body)=>{
    const response=await fetch(url+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{'Cookie':cookie}:{})},body:body?JSON.stringify(body):undefined});
    const data=await response.json();if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
    return {response,data};
  };
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{await fetch(url+'/api/me');ready=true;break;}catch{await new Promise(r=>setTimeout(r,80));}}
    assert.equal(ready,true,'server started');
    const homepage=await fetch(url+'/');
    assert.equal(homepage.status,200);
    const html=await homepage.text();
    assert.match(html,/<title>Celestial/);
    assert.match(html,/celestial-star\.svg/);
    assert.doesNotMatch(html,/lightning-chan|mascotSprite|lightning-mark/);
    const appAsset=await fetch(url+'/bundle/main.js');
    assert.equal(appAsset.status,200);
    assert.match(await appAsset.text(),/Celestial/);
    const cssAsset=await fetch(url+'/bundle/style.css');
    assert.equal(cssAsset.status,200);
    assert.match(await cssAsset.text(),/browser-window/);
    const aiStatus=await call('/api/ai/status');
    assert.equal(aiStatus.response.status,200);
    assert.equal(typeof aiStatus.data.configured,'boolean');
    const starAsset=await fetch(url+'/assets/celestial-star.svg');
    assert.equal(starAsset.status,200);
    assert.match(await starAsset.text(),/<svg/);
    const retiredAsset=await fetch(url+'/assets/lightning-chan-idle.png');
    assert.equal(retiredAsset.status,404);
    let result=await call('/api/me');assert.equal(result.response.status,200);assert.equal(result.data.user,null);
    result=await call('/api/messages','POST',{channel:'general',text:'Guest post'});assert.equal(result.response.status,401);
    result=await call('/api/register','POST',{username:'TestCelestial',password:'correct horse battery staple'});assert.equal(result.response.status,201);assert.equal(result.data.user.username,'TestCelestial');
    const ownerId=result.data.user.id;
    result=await call('/api/messages','POST',{channel:'general',text:'Hello from API test'});assert.equal(result.response.status,201);
    result=await call('/api/messages?channel=general');assert.equal(result.data.messages.at(-1).text,'Hello from API test');
    const browserStatus=await call('/api/browser/status');
    assert.equal(browserStatus.response.status,200);
    assert.equal(browserStatus.data.authenticated,true);
    assert.equal(typeof browserStatus.data.proxy,'boolean');

    const live=new WebSocket(url.replace(/^http/,'ws')+'/live',{
      headers:{Cookie:cookie},handshakeTimeout:5500
    });
    const events=[];
    live.on('message',raw=>{
      try{events.push(JSON.parse(raw.toString()));}catch{}
    });
    try{
      await new Promise((resolve,reject)=>{
        live.once('open',resolve);
        live.once('error',reject);
      });
      const awaitEvent=async match=>{
        for(let i=0;i<220;i++){
          const found=events.find(match);
          if(found)return found;
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        throw new Error('Expected live event not received');
      };
      const hello=await awaitEvent(event=>event.type==='hello');
      assert.equal(hello.username,'TestCelestial');
      const snapshot=await awaitEvent(event=>event.type==='v2State');
      assert.ok(snapshot.servers.some(s=>s.id==='lightning-main'));
      live.send(JSON.stringify({type:'v2Message',serverId:'lightning-main',channel:'general',message:'Hello live forest'}));
      const posted=await awaitEvent(event=>event.type==='v2Message'&&event.entry?.message==='Hello live forest');
      assert.equal(posted.entry.by,'TestCelestial');
    }finally{
      live.close();
    }


    const ownerCookie=cookie;
    result=await call('/api/register','POST',{username:'TestPeer',password:'another correct horse staple'});
    assert.equal(result.response.status,201);
    const peerId=result.data.user.id;
    result=await call('/api/dms/'+ownerId,'POST',{text:'A private message from TestPeer'});
    assert.equal(result.response.status,201);
    result=await call('/api/dms/'+ownerId);
    assert.equal(result.data.messages.length,1);
    assert.equal(result.data.messages[0].text,'A private message from TestPeer');
    cookie=ownerCookie;
    result=await call('/api/dms/'+peerId);
    assert.equal(result.data.messages.length,1);
    assert.equal(result.data.messages[0].author,'TestPeer');
    result=await call('/api/dms');
    assert.ok(result.data.threads.some(t=>t.user.id===peerId));

    result=await call('/api/drops','POST',{title:'New Theme',description:'My favorite purple palette',theme:palette});assert.equal(result.response.status,201);
    const dropId=result.data.drop.id;
    result=await call('/api/drops');assert.ok(result.data.drops.some(d=>d.id===dropId));
    assert.ok(result.data.drops.some(d=>d.ownerId==='system'&&d.author==='Celestial Studio'));
    const download=await fetch(url+`/api/drops/${dropId}/download`);
    assert.equal(download.status,200);
    assert.equal((await download.json()).format,'celestial.theme');
    result=await call(`/api/drops/${dropId}/star`,'POST',{});assert.equal(result.data.drop.likes,1);
    result=await call('/api/drops','POST',{title:'bad',description:'description',theme:{...palette,accent:'javascript:alert(1)'}});assert.equal(result.response.status,400);
    result=await call('/api/logout','POST',{});assert.equal(result.response.status,200);
    result=await call('/api/login','POST',{username:'TestCelestial',password:'correct horse battery staple'});assert.equal(result.response.status,200);
    result=await call(`/api/drops/${dropId}`,'DELETE');assert.equal(result.response.status,200);
    result=await call('/api/drops');assert.ok(!result.data.drops.some(d=>d.id===dropId));
  }finally{server.kill();await rm(tmp,{recursive:true,force:true});}
});
