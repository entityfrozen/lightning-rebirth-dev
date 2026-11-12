import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {scryptSync} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const salt='0123456789abcdef0123456789abcdef';
const passwordHash=p=>'scrypt$'+salt+'$'+scryptSync(p,salt,64).toString('hex');
const oldId='usr_OldMember12A', adminId='usr_OldAdmin123B', waitingId='usr_Waiting1234C';

test('old Bolt accounts and chat servers remain accessible after upgrading', {timeout:35000}, async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'celestial-bolt-live-'));
  const port=40000+Math.floor(Math.random()*14000);
  const oldState=JSON.stringify({users:[
    {id:oldId,username:'old.member',passwordHash:passwordHash('old member login'),role:'user',approved:true,enabled:true,createdAt:1700000000000},
    {id:adminId,username:'oldadmin',passwordHash:passwordHash('old admin login'),role:'admin',approved:true,enabled:true,createdAt:1700000000000},
    {id:waitingId,username:'waiting.member',passwordHash:passwordHash('wait for approval'),role:'user',approved:false,enabled:true,createdAt:1710000000000}
  ],sessions:[]});
  const oldCommunities=JSON.stringify({version:3,servers:[{
    id:'lightning-main',name:'Lightning',icon:'bolt',description:'Original server',
    owner:null,permanent:true,members:[oldId,adminId],roles:[{id:'member',name:'Member',color:'#eeeeee'}],
    memberRoles:{},profiles:{
      [oldId]:{name:'old.member',username:'old.member',admin:false},
      [adminId]:{name:'oldadmin',username:'oldadmin',admin:true}
    },
    channels:[{id:'general',name:'general',category:'COMMUNITY',protected:true}],
    messages:{general:[{id:'old-msg-001',channel:'general',message:'Our original community chat',
      by:'old.member',userId:oldId,at:1710000000000,reactions:{}}]},createdAt:1700000000000
  }]});
  let server=null;
  const url='http://127.0.0.1:'+port;
  let cookie='';
  const call=async(endpoint,method='GET',payload)=>{
    const res=await fetch(url+endpoint,{method,headers:{
      ...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})
    },body:payload?JSON.stringify(payload):undefined});
    if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
    return {status:res.status,data:await res.json()};
  };
  try{
    await writeFile(path.join(dir,'bolt.json'),oldState);
    await writeFile(path.join(dir,'lightning-v2-communities.json'),oldCommunities);
    server=spawn(process.execPath,['server.js'],{cwd:root,env:{
      ...process.env,RAILWAY_VOLUME_MOUNT_PATH:'',DISABLE_WEB_PROXY:'1',BOLT_DATA_DIR:dir,LIGHTNING_DATA_FILE:'',
      BOLT_ADMIN_USER:'',BOLT_ADMIN_PASSWORD:'',PORT:String(port),
      OPENAI_API_KEY:'',NVIDIA_API_KEY:''
    },stdio:'pipe'});
    let ready=false;
    let output='';
    server.stdout.on('data',chunk=>{output+=chunk.toString().slice(0,1000);});
    server.stderr.on('data',chunk=>{output+=chunk.toString().slice(0,1000);});
    for(let i=0;i<250;i++){
      if(server.exitCode!==null)break;
      try{
        const res=await fetch(url+'/api/me');
        if(res.ok){ready=true;break;}
      }catch{}
      await new Promise(done=>setTimeout(done,70));
    }
    assert.equal(ready,true,'legacy-backed server must boot: '+output.slice(-900));
    const guestDirectory=await call('/api/community/members');
    assert.equal(guestDirectory.status,401);
    let result=await call('/api/login','POST',{username:'old.member',password:'old member login'});
    assert.equal(result.status,200);
    assert.equal(result.data.user.id,oldId);
    assert.equal(result.data.user.role,'user');
    result=await call('/api/community/members');
    assert.equal(result.status,200);
    assert.ok(result.data.members.some(member=>member.id===adminId&&member.platformRole==='admin'));
    assert.ok(result.data.members.some(member=>member.id===oldId));
    assert.ok(!result.data.members.some(member=>member.id===waitingId),
      'pending accounts must be omitted from the directory');
    const ws=new WebSocket(url.replace(/^http/,'ws')+'/live',{headers:{Cookie:cookie}});
    const events=[];
    ws.on('message',raw=>{try{events.push(JSON.parse(raw.toString()));}catch{}});
    try {
      await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
      let snapshot=null;
      for(let i=0;i<160;i++){
        snapshot=events.find(event=>event.type==='v2State');
        if(snapshot)break;
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      assert.ok(snapshot,'community snapshot arrives');
      const main=snapshot.servers.find(server=>server.id==='lightning-main');
      assert.ok(main,'original community retained');
      assert.ok(main.messages.general.some(row=>row.message==='Our original community chat'));
      assert.ok(main.members.some(member=>member.id===adminId),
        'offline admins remain in the saved member list');
      const offlineAdmin=main.members.find(member=>member.id===adminId);
      assert.equal(offlineAdmin.platformRole,'admin');
      assert.equal(offlineAdmin.admin,true);
      assert.equal(main.members.find(member=>member.id===oldId).platformRole,'user');
      const currentlyOnline=events.find(event=>event.type==='hello')?.online||[];
      assert.ok(!currentlyOnline.some(member=>member.id===adminId),
        'offline role labels do not depend on active sockets');
    }finally{ws.close();}
    result=await call('/api/logout','POST',{});
    assert.equal(result.status,200);
    cookie='';
    result=await call('/api/login','POST',{username:'waiting.member',password:'wait for approval'});
    assert.equal(result.status,403,'old pending users do not get auto-approved');
    result=await call('/api/login','POST',{username:'oldadmin',password:'old admin login'});
    assert.equal(result.status,200);
    result=await call('/api/admin/accounts/pending');
    assert.equal(result.status,200);
    assert.ok(result.data.accounts.some(account=>account.id===waitingId));
    assert.equal(await readFile(path.join(dir,'bolt.json'),'utf8'),oldState);
    assert.ok(await readFile(path.join(dir,'celestial-backups','before-celestial-v1','lightning-v2-communities.json'),'utf8'));
  }finally{
    server?.kill();
    await rm(dir,{recursive:true,force:true});
  }
});
