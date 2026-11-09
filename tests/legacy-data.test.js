import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {scryptSync} from 'node:crypto';
import path from 'node:path';
import {importBoltData,bootstrapAdministrator} from '../legacy-data.js';

const salt='0123456789abcdef0123456789abcdef';
const legacyHash=password=>'scrypt$'+salt+'$'+scryptSync(password,salt,64).toString('hex');
const oldUsers=[
  {id:'usr_AdminUser77B',username:'oldadmin',passwordHash:legacyHash('old secure admin login'),role:'admin',enabled:true,approved:true,createdAt:1710000000000},
  {id:'usr_OldUser123A',username:'old.member',passwordHash:legacyHash('old secure member login'),role:'user',enabled:true,approved:true,createdAt:1720000000000},
  {id:'usr_Pendingabc123',username:'waiting.member',passwordHash:legacyHash('unapproved member login'),role:'user',enabled:true,approved:false,createdAt:1730000000000},
  {id:'usr_Disabledabc12',username:'disabled.member',passwordHash:legacyHash('disabled login'),role:'user',enabled:false,approved:true,createdAt:1731000000000}
];

test('Bolt importer preserves IDs, account states, messages, and original files',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'celestial-legacy-'));
  const original=JSON.stringify({users:oldUsers,sessions:[],passes:[],settings:{}});
  const dms=JSON.stringify({dm:{thread:{
    people:[oldUsers[0].id,oldUsers[1].id],
    messages:[{id:'da123456789abcdef0',from:oldUsers[1].id,to:oldUsers[0].id,text:'A real old DM',at:1730000000000}]
  }}});
  const db={users:[],dms:[],sessions:[],messages:[],drops:[]};
  try{
    await writeFile(path.join(dir,'bolt.json'),original);
    await writeFile(path.join(dir,'lightning-accounts.json'),dms);
    const report=await importBoltData(db,dir);
    assert.equal(report.legacyFound,true);
    assert.equal(report.accountsImported,4);
    assert.equal(report.conversationsImported,1);
    assert.equal(db.users[0].id,oldUsers[0].id);
    assert.equal(db.users[0].role,'admin');
    assert.equal(db.users[1].passwordHash,oldUsers[1].passwordHash);
    assert.equal(db.users[2].approved,false);
    assert.equal(db.users[3].enabled,false);
    assert.equal(db.dms[0].text,'A real old DM');
    assert.equal(db.dms[0].from,oldUsers[1].id);
    const next=await importBoltData(db,dir);
    assert.equal(next.accountsImported,0);
    assert.equal(next.conversationsImported,0);
    assert.equal(bootstrapAdministrator(db,{BOLT_ADMIN_USER:'newadmin',BOLT_ADMIN_PASSWORD:'a safe long secret'}),false);
    assert.equal(await readFile(path.join(dir,'bolt.json'),'utf8'),original);
    assert.equal(await readFile(path.join(dir,'lightning-accounts.json'),'utf8'),dms);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('importer does not silently replace an existing username with a different ID',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'celestial-collision-'));
  try{
    await writeFile(path.join(dir,'bolt.json'),JSON.stringify({users:[oldUsers[1]]}));
    const db={users:[{id:'ea9876543210fedcba987654',username:oldUsers[1].username,approved:true}],dms:[]};
    const report=await importBoltData(db,dir);
    assert.equal(report.accountsImported,0);
    assert.equal(report.skippedConflicts,1);
    assert.equal(db.users[0].id,'ea9876543210fedcba987654');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('malformed legacy data fails closed instead of creating a replacement store',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'celestial-invalid-'));
  try{
    await writeFile(path.join(dir,'bolt.json'),'{invalid');
    await assert.rejects(()=>importBoltData({users:[],dms:[]},dir),/Unable to safely read existing data/);
    assert.equal(await readFile(path.join(dir,'bolt.json'),'utf8'),'{invalid');
  }finally{await rm(dir,{recursive:true,force:true});}
});
