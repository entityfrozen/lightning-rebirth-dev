import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const palette={accent:'#b67cff',background:'#0f0b1b',surface:'#20152f',text:'#f9f2ff',muted:'#b8a9cb',line:'#513966',glow:55,radius:16,petals:true};

test('end-to-end account, chat, and community drop API', {timeout:18000}, async ()=>{
  const tmp=await mkdtemp(path.join(tmpdir(),'lightning-test-'));
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
    let result=await call('/api/me');assert.equal(result.response.status,200);assert.equal(result.data.user,null);
    result=await call('/api/messages','POST',{channel:'general',text:'Guest post'});assert.equal(result.response.status,401);
    result=await call('/api/register','POST',{username:'TestLightning',password:'correct horse battery staple'});assert.equal(result.response.status,201);assert.equal(result.data.user.username,'TestLightning');
    result=await call('/api/messages','POST',{channel:'general',text:'Hello from API test'});assert.equal(result.response.status,201);
    result=await call('/api/messages?channel=general');assert.equal(result.data.messages.at(-1).text,'Hello from API test');
    result=await call('/api/drops','POST',{title:'New Theme',description:'My favorite purple palette',theme:palette});assert.equal(result.response.status,201);
    const dropId=result.data.drop.id;
    result=await call('/api/drops');assert.ok(result.data.drops.some(d=>d.id===dropId));
    result=await call(`/api/drops/${dropId}/star`,'POST',{});assert.equal(result.data.drop.likes,1);
    result=await call('/api/drops','POST',{title:'bad',description:'description',theme:{...palette,accent:'javascript:alert(1)'}});assert.equal(result.response.status,400);
    result=await call('/api/logout','POST',{});assert.equal(result.response.status,200);
    result=await call('/api/login','POST',{username:'TestLightning',password:'correct horse battery staple'});assert.equal(result.response.status,200);
    result=await call(`/api/drops/${dropId}`,'DELETE');assert.equal(result.response.status,200);
    result=await call('/api/drops');assert.ok(!result.data.drops.some(d=>d.id===dropId));
  }finally{server.kill();await rm(tmp,{recursive:true,force:true});}
});
