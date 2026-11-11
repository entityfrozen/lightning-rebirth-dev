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
  const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'',NVIDIA_API_KEY:'',BOLT_ADMIN_USER:'ReviewAdmin',BOLT_ADMIN_PASSWORD:'a very long test password 123!',BOLT_DATA_DIR:tmp,PORT:String(port),LIGHTNING_DATA_FILE:path.join(tmp,'store.json')},stdio:'pipe'});
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
    assert.equal(homepage.headers.get('cross-origin-opener-policy'),'same-origin');
    assert.equal(homepage.headers.get('cross-origin-embedder-policy'),'credentialless');
    assert.equal(homepage.headers.get('x-frame-options'),null);
    assert.doesNotMatch(homepage.headers.get('content-security-policy')||'',/frame-ancestors/);
    assert.equal(homepage.headers.get('cross-origin-resource-policy'),'cross-origin');

    const html=await homepage.text();
    assert.ok(html.includes('<title>Celestial</title>'));
    assert.match(html,/\/boba\/index\.html/);
    assert.doesNotMatch(html,/\/bundle\/main\.js/);
    assert.match(html,/celestial-star\.svg/);
    assert.doesNotMatch(html,/lightning-chan|mascotSprite|lightning-mark/);
    const appAsset=await fetch(url+'/bundle/main.js');
    assert.equal(appAsset.status,200);
    assert.match(await appAsset.text(),/Celestial/);
    const cssAsset=await fetch(url+'/bundle/style.css');
    assert.equal(cssAsset.status,200);
    assert.equal(cssAsset.headers.get('cross-origin-opener-policy'),'same-origin');
    assert.equal(cssAsset.headers.get('cross-origin-embedder-policy'),'credentialless');
    assert.equal(cssAsset.headers.get('cross-origin-resource-policy'),'same-origin');
    const loader=await fetch(url+'/proxy-entry.js');
    assert.equal(loader.status,200);
    const loaderCode=await loader.text();
    assert.match(loaderCode,/window\.initBootstrap/);
    assert.match(loaderCode,/navigator\.serviceWorker\.register/);
    assert.match(loaderCode,/scramjet\.js/);
    assert.match(loaderCode,/libcurl-client\.js/);
    assert.doesNotMatch(loaderCode,/import\(["']data:/);
    const policy=loader.headers.get('content-security-policy')||'';
    assert.match(policy,/script-src 'self' blob:/);
    assert.doesNotMatch(policy,/script-src[^;]*data:/);
    assert.match(policy,/connect-src 'self' data:/);


    assert.match(await cssAsset.text(),/browser-window/);
    const guestAiStatus=await call('/api/ai/status');
    assert.equal(guestAiStatus.response.status,401);
    const guestAiMessage=await call('/api/ai','POST',{messages:[{role:'user',content:'Hello'}]});
    assert.equal(guestAiMessage.response.status,401);
    const starAsset=await fetch(url+'/assets/celestial-star.svg');
    assert.equal(starAsset.status,200);
    assert.match(await starAsset.text(),/<svg/);
    const studyAsset=await fetch(url+'/assets/study-portal.svg');
    assert.equal(studyAsset.status,200);
    assert.match(await studyAsset.text(),/<svg/);
    const retiredAsset=await fetch(url+'/assets/lightning-chan-idle.png');
    assert.equal(retiredAsset.status,404);
    let result=await call('/api/me');assert.equal(result.response.status,200);assert.equal(result.data.user,null);
    result=await call('/api/messages','POST',{channel:'general',text:'Guest post'});assert.equal(result.response.status,401);
    result=await call('/api/register','POST',{username:'TestCelestial',password:'correct horse battery staple'});
    assert.equal(result.response.status,202);
    assert.equal(result.data.status,'pending');
    assert.equal(cookie,'');
    result=await call('/api/login','POST',{username:'TestCelestial',password:'correct horse battery staple'});
    assert.equal(result.response.status,403);
    result=await call('/api/admin/accounts/pending');
    assert.equal(result.response.status,401);
    result=await call('/api/login','POST',{username:'ReviewAdmin',password:'a very long test password 123!'});
    assert.equal(result.response.status,200);
    assert.equal(result.data.user.role,'admin');
    let config=await call('/api/admin/config');
    assert.equal(config.response.status,200);
    assert.equal(config.data.providers.nvidiaConfigured,false);
    assert.equal(config.data.providers.tavilyConfigured,false);
    config=await call('/api/admin/config/providers','POST',{nvidia:'test-nvidia-secret',tavily:'test-tavily-secret'});
    assert.equal(config.response.status,200);
    assert.equal(config.data.providers.nvidiaConfigured,true);
    assert.equal(config.data.providers.tavilyConfigured,true);
    assert.doesNotMatch(JSON.stringify(config.data),/test-nvidia-secret|test-tavily-secret/);
    config=await call('/api/admin/config');
    assert.doesNotMatch(JSON.stringify(config.data),/test-nvidia-secret|test-tavily-secret|passwordHash|"salt"|"hash"/);
    const self=config.data.accounts.find(a=>a.username.toLowerCase()==='reviewadmin');
    assert.equal((await call('/api/admin/config/accounts/'+self.id,'POST',{role:'user'})).response.status,400);
    const extra=await call('/api/admin/config/accounts','POST',{username:'ManagedTest',password:'a managed test password',role:'user'});
    assert.equal(extra.response.status,201);
    const edited=await call('/api/admin/config/accounts/'+extra.data.account.id,'POST',{enabled:false});
    assert.equal(edited.data.account.active,false);
    await call('/api/admin/config/providers','POST',{nvidia:'',tavily:''});
    result=await call('/api/admin/accounts/pending');
    assert.equal(result.response.status,200);
    const request=result.data.accounts.find(a=>a.username==='TestCelestial');
    assert.ok(request);
    result=await call('/api/admin/accounts/'+request.id+'/approve','POST',{});
    assert.equal(result.response.status,200);
    assert.equal(result.data.status,'approved');
    result=await call('/api/logout','POST',{});
    assert.equal(result.response.status,200);
    cookie='';
    result=await call('/api/login','POST',{username:'TestCelestial',password:'correct horse battery staple'});
    assert.equal(result.response.status,200);
    const ownerId=result.data.user.id;
    result=await call('/api/admin/accounts/pending');
    assert.equal(result.response.status,403);
    assert.equal((await call('/api/admin/config')).response.status,403);
    assert.equal((await call('/api/admin/config/providers','POST',{nvidia:'not-authorized'})).response.status,403);
    const aiStatus=await call('/api/ai/status');
    assert.equal(aiStatus.response.status,200);
    assert.equal(typeof aiStatus.data.configured,'boolean');
    assert.deepEqual(Object.keys(aiStatus.data),['configured']);
    const aiRequest=await call('/api/ai','POST',{messages:[{role:'user',content:'Hello'}]});
    assert.equal(aiRequest.response.status,503);
    assert.doesNotMatch(aiRequest.data.error,/nvidia|openai|provider|api key|model/i);
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
    assert.equal(result.response.status,202);
    cookie='';
    result=await call('/api/login','POST',{username:'ReviewAdmin',password:'a very long test password 123!'});
    assert.equal(result.response.status,200);
    result=await call('/api/admin/accounts/pending');
    assert.equal(result.response.status,200);
    const peerRequest=result.data.accounts.find(a=>a.username==='TestPeer');
    assert.ok(peerRequest);
    const peerId=peerRequest.id;
    result=await call('/api/admin/accounts/'+peerId+'/approve','POST',{});
    assert.equal(result.response.status,200);
    cookie='';
    result=await call('/api/login','POST',{username:'TestPeer',password:'another correct horse staple'});
    assert.equal(result.response.status,200);
    result=await call('/api/dms/'+ownerId,'POST',{text:'A private message from TestPeer'});
    assert.equal(result.response.status,201);
    result=await call('/api/dms/'+ownerId);
    assert.equal(result.data.messages.length,1);
    assert.equal(result.data.messages[0].text,'A private message from TestPeer');
    const peerCookie=cookie;
    cookie=ownerCookie;
    result=await call('/api/dms/'+peerId);
    assert.equal(result.data.messages.length,1);
    assert.equal(result.data.messages[0].author,'TestPeer');
    result=await call('/api/dms');
    assert.ok(result.data.threads.some(t=>t.user.id===peerId));
    result=await call('/api/dms/'+peerId+'/clear','POST',{});
    assert.equal(result.response.status,200);
    result=await call('/api/dms/'+peerId);
    assert.deepEqual(result.data.messages,[]);
    result=await call('/api/dms');
    assert.ok(!result.data.threads.some(t=>t.user.id===peerId));
    cookie=peerCookie;
    result=await call('/api/dms/'+ownerId);
    assert.equal(result.data.messages.length,1,'other participant must keep their copy');
    cookie=ownerCookie;

    result=await call('/api/drops','POST',{title:'New Theme',description:'My favorite purple palette',theme:palette});assert.equal(result.response.status,201);
    const dropId=result.data.drop.id;
    result=await call('/api/drops');assert.ok(result.data.drops.some(d=>d.id===dropId));
    assert.ok(result.data.drops.some(d=>d.ownerId==='system'&&d.author==='Celestial Studio'));
    const download=await fetch(url+`/api/drops/${dropId}/download`,{headers:{Cookie:cookie}});
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
