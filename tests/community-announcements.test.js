import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCommunityStore,MAIN_SERVER_ID} from '../community-v2.js';

function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'cel-community-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const events=[];
 const store=createCommunityStore({
  dataDir:dir,
  sendToUser:(userId,event)=>events.push({userId,event}),
  sendAll:event=>events.push({event}),
  getRole:id=>id==='a'?'admin':'user'
 });
 const admin={id:'a',role:'admin',username:'admin',name:'Admin'};
 const member={id:'m',role:'user',username:'member',name:'Member'};
 store.snapshot(admin);store.snapshot(member);
 return {store,admin,member,events,dir};
}

test('announcement requires admin role and is persisted in the protected channel',t=>{
 const {store,admin,member,events,dir}=setup(t);
 assert.throws(()=>store.postAnnouncement(member,{message:'Unauthorized',pin:false}),/Administrator required/);
 const announcement=store.postAnnouncement(admin,{message:'Service update',pin:true});
 assert.equal(announcement.message,'Service update');
 assert.equal(store.listAnnouncements()[0].pinnedAt>0,true);
 const saved=JSON.parse(readFileSync(join(dir,'lightning-v2-communities.json'),'utf8'));
 const main=saved.servers.find(s=>s.id===MAIN_SERVER_ID);
 assert.equal(main.messages.announcements.at(-1).message,'Service update');
 assert.ok(events.some(({userId,event})=>userId===member.id&&event.type==='v2Message'&&event.entry.channel==='announcements'));
 assert.ok(events.some(({event})=>event.type==='v2Announcement'));
});

test('channel message carries clientId back in the broadcast for delivery confirmation',t=>{
 const {store,member,events}=setup(t);
 store.handle(member,{type:'v2Message',serverId:MAIN_SERVER_ID,channel:'general',message:'Hello',clientId:'send-123'});
 const delivered=events.find(({event})=>event.type==='v2Message'&&event.entry.clientId==='send-123');
 assert.ok(delivered);
 assert.equal(delivered.event.entry.message,'Hello');
});
