// Celestial live community transport. Game engines and matchmaking removed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {createCommunityStore} from './community-v2.js';
import {hasPermission} from './staff-roles.js';

const CHANNELS=['general','games','suggestions','support']; // Preserve historical chat channels.
const LIMIT=1100;
const trim=(value,max=LIMIT)=>String(value??'').trim().slice(0,max);
const uid=()=>crypto.randomBytes(7).toString('hex');
const send=(socket,payload)=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(payload))};

export function attachLightningLive({
 server,sessionFromHeaders,dataDir,getDisplayName=(_id,username)=>username,
 getRole=()=>null,notifyMentions=()=>{}
}){
 const clients=new Map();
 const identity=id=>[...clients.entries()].filter(([,user])=>user.id===id);
 const members=()=>[...new Set([...clients.values()].map(user=>user.id))];
 const online=()=>members().map(id=>{const user=identity(id)[0]?.[1];return {
  id,name:user?.name||id,username:user?.username||'',role:user?.role||'user'
 }});
 const broadcast=payload=>{for(const socket of clients.keys())send(socket,payload)};
 const sendUser=(id,payload)=>{for(const [socket] of identity(id))send(socket,payload)};
 const presence=()=>broadcast({type:'presence',users:members().length,online:online()});
 const communities=createCommunityStore({
  dataDir,sendToUser:sendUser,sendAll:broadcast,getRole,notifyMentions
 });
 // Keep the legacy chat history on disk; deleting the game backend must not
 // remove messages or alter the attached Railway volume.
 const file=path.join(dataDir,'lightning-social.json');
 let history={};
 try{history=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
 for(const channel of CHANNELS){
  if(!Array.isArray(history[channel]))history[channel]=[];
  history[channel]=history[channel].filter(entry=>entry&&!entry.deleted);
 }
 let pending=false;
 const save=()=>{
  if(pending)return;pending=true;
  const timer=setTimeout(()=>{
   pending=false;
   try{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(history));fs.renameSync(tmp,file)}
   catch(error){console.warn('Community message save:',error.message)}
  },450);
  timer.unref?.();
 };
 const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  if(!req.url?.startsWith('/live'))return;
  let originHost='';
  try{originHost=new URL(req.headers.origin).host}catch{}
  if(req.headers.origin&&originHost!==req.headers.host){
   socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
   socket.destroy();return;
  }
  const auth=sessionFromHeaders(req.headers);
  if(!auth){
   socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
   socket.destroy();return;
  }
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,auth,req));
 });
 wss.on('connection',(socket,auth,req)=>{
  const id=auth.identity.id;
  const user={
   ws:socket,id,username:trim(auth.identity.username||'guest',32),
   name:getDisplayName(id,trim(auth.identity.username||'guest',32)),
   role:auth.identity.role||'user',last:0
  };
  clients.set(socket,user);
  send(socket,{
   type:'hello',id,name:user.name,username:user.username,role:user.role,
   channels:CHANNELS,history,online:online(),summary:{users:members().length}
  });
  send(socket,{type:'v2State',...communities.snapshot(user)});
  presence();
  socket.on('message',raw=>{
   const active=sessionFromHeaders(req.headers);
   if(!active||active.identity.id!==id){socket.close(4003,'Session expired');return}
   user.role=active.identity.role||'user';
   user.username=trim(active.identity.username||user.username,32);
   user.name=getDisplayName(id,user.username);
   let data;try{data=JSON.parse(raw.toString())}catch{return}
   if(!data||typeof data!=='object')return;
   if(Date.now()-user.last<130){
    send(socket,{type:'error',message:"You're sending commands too quickly."});return;
   }
   user.last=Date.now();
   if(typeof data.type==='string'&&data.type.startsWith('v2')){
    communities.handle(user,data);return;
   }
   if(data.type==='chat'){
    const channel=trim(data.channel,25),message=trim(data.message,1000);
    if(!CHANNELS.includes(channel)||!message)return;
    const replyTo=trim(data.replyTo,32);
    const parent=replyTo?history[channel].find(e=>e.id===replyTo):null;
    const entry={
     id:uid(),by:user.name,username:user.username,userId:user.id,
     channel,message,at:Date.now(),replyTo:parent?.id||null,reactions:{}
    };
    history[channel].push(entry);
    history[channel]=history[channel].slice(-120);
    save();
    notifyMentions({text:message,authorId:id,authorName:user.name,
     channel,replyToId:parent?.userId||null});
    broadcast({type:'chat',entry});return;
   }
   if(data.type==='typing'){
    const channel=trim(data.channel,25);
    if(CHANNELS.includes(channel))broadcast({
     type:'chatTyping',channel,by:user.name,userId:id
    });
    return;
   }
   if(['chatEdit','chatDelete','chatReact'].includes(data.type)){
    const channel=trim(data.channel,25),messageId=trim(data.id,32);
    if(!CHANNELS.includes(channel)||!messageId)return;
    const entry=history[channel].find(e=>e.id===messageId);
    if(!entry||entry.deleted)return;
    if(data.type==='chatEdit'){
     if(entry.userId!==id||Date.now()-entry.at>900000){
      send(socket,{type:'error',message:'You can only edit your recent messages.'});
      return;
     }
     const value=trim(data.message,1000);if(!value)return;
     entry.message=value;entry.editedAt=Date.now();
    }else if(data.type==='chatDelete'){
     if(entry.userId!==id&&!hasPermission(user.role,'community.moderate')){
      send(socket,{type:'error',message:'You cannot delete that message.'});return;
     }
     history[channel].splice(history[channel].indexOf(entry),1);
     save();broadcast({type:'chatDeleted',channel,id:messageId});return;
    }else{
     const emoji=trim(data.emoji,8);
     const allowed=['👍','👎','❤️','😂','🤣','🔥','💀','😭','😍','😎','👀','🙏','✨','🎉','💯','👏','🤝','😮','😢','😡','🤔','🤯','✅','❌','💜','🤍','💚','👋'];
     if(!allowed.includes(emoji))return;
     entry.reactions||={};
     const users=Array.isArray(entry.reactions[emoji])?entry.reactions[emoji]:[];
     entry.reactions[emoji]=users.includes(id)?users.filter(v=>v!==id):[...users.slice(-119),id];
    }
    save();broadcast({type:'chatUpdate',channel,entry});
   }
  });
  socket.on('close',()=>{clients.delete(socket);presence()});
 });
 console.log('Celestial Live: community messaging ready');
 return {wss,sendToUser:sendUser,listAnnouncements:communities.listAnnouncements,postAnnouncement:communities.postAnnouncement,removeAnnouncement:communities.removeAnnouncement};
}
