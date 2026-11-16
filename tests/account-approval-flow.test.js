import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('admin approval actually activates pending signups; rejection stays blocked', {timeout:45000},async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'celestial-approval-'));
 const port=36000+Math.floor(Math.random()*8000);
 const origin='http://127.0.0.1:'+port;
 const adminPassword='isolated admin password for approval checks';
 const child=spawn(process.execPath,['server.js'],{
  cwd:root,stdio:'pipe',
  env:{...process.env,PORT:String(port),BOLT_DATA_DIR:dataDir,
   LIGHTNING_DATA_FILE:path.join(dataDir,'store.json'),
   RAILWAY_VOLUME_MOUNT_PATH:'',DISABLE_WEB_PROXY:'1',
   BOLT_ADMIN_USER:'ApprovalAdmin',BOLT_ADMIN_PASSWORD:adminPassword,
   NVIDIA_API_KEY:'',OPENAI_API_KEY:''}
 });
 let logs='';
 child.stdout.on('data',data=>{logs+=data.toString().slice(-1500)});
 child.stderr.on('data',data=>{logs+=data.toString().slice(-1500)});
 let cookie='';
 const call=async(route,method='GET',body)=>{
  const response=await fetch(origin+route,{method,headers:{
   ...(cookie?{Cookie:cookie}:{}),
   ...(body?{'Content-Type':'application/json'}:{})
  },body:body?JSON.stringify(body):undefined});
  if(response.headers.get('set-cookie')){
   const header=response.headers.get('set-cookie');
   cookie=header.split(';')[0];
  }
  return {status:response.status,data:await response.json()};
 };
 try{
  let ready=false;
  for(let i=0;i<190;i++){
   try{if((await fetch(origin+'/api/me')).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,80));
  }
  assert.ok(ready,'Isolated API server must start: '+logs.slice(-600));
  const applicant={username:'ApprovalMember',password:'approval member password'};
  let result=await call('/api/register','POST',applicant);
  assert.equal(result.status,202);
  assert.equal(result.data.status,'pending');
  result=await call('/api/login','POST',applicant);
  assert.equal(result.status,403,'Pending users must not sign in');
  result=await call('/api/admin/accounts/pending');
  assert.equal(result.status,401,'Anonymous users cannot view requests');
  result=await call('/api/login','POST',{username:'ApprovalAdmin',password:adminPassword});
  assert.equal(result.status,200);
  assert.equal(result.data.user.role,'admin');
  result=await call('/api/admin/accounts/pending');
  assert.equal(result.status,200);
  const target=result.data.accounts.find(x=>x.username===applicant.username);
  assert.ok(target?.id,'Signup must appear in approval queue');
  result=await call('/api/admin/accounts/'+encodeURIComponent(target.id)+'/approve','POST',{});
  assert.equal(result.status,200);
  assert.equal(result.data.status,'approved');
  result=await call('/api/admin/config');
  assert.ok(result.data.accounts.some(x=>x.id===target.id&&x.approved===true&&x.active===true));
  await call('/api/logout','POST',{});
  cookie='';
  result=await call('/api/login','POST',applicant);
  assert.equal(result.status,200,'Approved member must be able to sign in');
  result=await call('/api/admin/accounts/pending');
  assert.equal(result.status,403,'A member cannot review other accounts');
  result=await call('/api/admin/config');
  assert.equal(result.status,403,'A member cannot enter full administration');
  await call('/api/logout','POST',{});
  cookie='';
  const second={username:'RejectedMember',password:'rejected member password'};
  result=await call('/api/register','POST',second);
  assert.equal(result.status,202);
  result=await call('/api/login','POST',{username:'ApprovalAdmin',password:adminPassword});
  assert.equal(result.status,200);
  result=await call('/api/admin/accounts/pending');
  const reject=result.data.accounts.find(x=>x.username===second.username);
  assert.ok(reject?.id);
  result=await call('/api/admin/accounts/'+encodeURIComponent(reject.id)+'/reject','POST',{});
  assert.equal(result.status,200);
  assert.equal(result.data.status,'rejected');
  await call('/api/logout','POST',{});
  cookie='';
  result=await call('/api/login','POST',second);
  assert.equal(result.status,403,'Rejected member stays blocked');
 }finally{
  child.kill('SIGTERM');
  await rm(dataDir,{recursive:true,force:true});
 }
});
