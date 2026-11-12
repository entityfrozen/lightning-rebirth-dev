import {$,$$,esc,ico,api} from './common.js';
export function mountChat(root,user){
 root.innerHTML='<div class="native-messenger celestial-discord"><aside class="cel-chat-rail"><span class="cel-chat-logo">✦</span><span class="cel-chat-rail-node">✧</span></aside><aside class="native-rooms"><div class="cel-chat-brand"><strong>Celestial</strong><small>COMMUNITY</small></div><select aria-label="Server" data-server></select><div class="cel-chat-side-title">TEXT CHANNELS</div><div data-channels></div><div class="cel-chat-side-title">DIRECT MESSAGES</div><div class="cel-dm-list" data-dm-list></div><button class="btn s" data-join hidden>Join server</button><div class="cel-chat-self"><span class="native-person-icon">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div><strong>'+esc(user.username)+'</strong><small>'+esc(user.role||'Member')+'</small></div><span class="cel-chat-self-dot"></span></div></aside><section class="native-conversation"><header class="native-chat-head"><div class="cel-chat-current"><span>#</span><div><h2 data-title>Chat</h2><small data-status>Connecting…</small></div></div><div class="native-chat-actions"><button class="btn s native-clear-chat" type="button" data-clear-chat hidden>Clear chat</button><button class="cb sm gh" aria-label="Fullscreen chat" data-full>'+ico('expand')+'</button></div></header><aside class="cel-chat-announcement" data-announcement hidden><span>📣</span><strong data-announcement-text></strong><button type="button" data-open-announcements>View ↗</button><button type="button" data-dismiss-announcement aria-label="Dismiss announcement">×</button></aside><div class="native-feed srl" role="log"></div><div class="cel-chat-typing" data-typing aria-live="polite" hidden></div><div class="cel-compose-wrap"><div class="cel-reply-preview" data-reply hidden><span data-reply-text></span><button type="button" data-cancel-reply aria-label="Cancel reply">×</button></div><div class="cel-mention-picker" data-mentions hidden role="listbox"></div><form class="native-compose gl g2"><span class="cel-compose-plus">＋</span><textarea aria-label="Message" maxlength="1500" rows="1" placeholder="Message #general"></textarea><button class="cb" type="submit" data-send-btn aria-label="Send message">'+ico('send')+'</button></form><small class="cel-compose-hint">Type @ to mention · Enter to send · Shift + Enter for a new line <span data-send-state role="status"></span></small></div><p class="msg" data-error hidden></p></section><aside class="native-members"><h3>MEMBERS <span data-member-count></span></h3><label class="fld"><input data-search placeholder="Search members…" aria-label="Find a member"></label><div data-people></div></aside></div>';
 let socket,servers=[],people=[],online=[],serverId='',channelId='',dm=null,dmRows=[],closed=false,revision=0,reply=null,mentionMatches=[],sending=null,announcement=null,typingUsers=new Map(),drafts=new Map(),lastTypingAt=0,reconnectDelay=1000;
 const $r=s=>$(s,root),send=d=>{if(socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify(d));return true},role=p=>({admin:'ADMIN',owner:'OWNER',account_manager:'STAFF',moderator:'MOD'}[p?.platformRole||p?.role]||'');
 const badge=p=>role(p)?'<span data-role-badge class="native-role role-'+esc(role(p).toLowerCase())+'">'+role(p)+'</span>':'';
 const messageDate=m=>{
  const raw=m.createdAt??m.at??m.ts??m.time;
  const value=typeof raw==='number'&&raw<1e11?raw*1000:raw;
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date:null;
 };
 const timestamp=m=>{
  const date=messageDate(m);
  if(!date)return '<small>Unknown time</small>';
  const exact=date.toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
  const clock=date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return '<small title="'+esc(exact)+'" datetime="'+esc(date.toISOString())+'">'+esc(clock)+'</small>';
 };
 const input=$r('.native-compose textarea'),picker=$r('[data-mentions]');
 const sendButton=$r('[data-send-btn]'),sendState=$r('[data-send-state]');
 const scope=()=>dm?'dm:'+dm.id:'channel:'+serverId+':'+channelId;
 const storeDraft=()=>drafts.set(scope(),input.value);
 const restoreDraft=()=>{input.value=drafts.get(scope())||'';input.style.height='auto';input.style.height=Math.min(150,input.scrollHeight)+'px';picker.hidden=true};
 const clearReply=()=>{reply=null;$r('[data-reply]').hidden=true};
 const setSending=busy=>{sendButton.disabled=busy;sendButton.setAttribute('aria-busy',String(busy))};
 const statusText=text=>{sendState.textContent=text||''};
 const latestAnnouncement=()=>servers.find(s=>s.id==='lightning-main')?.messages?.announcements?.at(-1)||announcement;
 const paintAnnouncement=()=>{
  const latest=latestAnnouncement();
  const banner=$r('[data-announcement]');
  banner.hidden=!latest||sessionStorage.getItem('celestial.announcement.dismissed')===latest.id;
  if(latest)$r('[data-announcement-text]').textContent=latest.message.slice(0,120);
 };
 const paintTyping=()=>{
  const list=[...typingUsers.entries()].filter(([id,v])=>id!==user.id&&Date.now()-v.at<3500&&v.serverId===serverId&&v.channel===channelId&&!dm).map(([,v])=>v.name);
  const node=$r('[data-typing]');node.hidden=!list.length;node.textContent=list.length===1?list[0]+' is typing…':list.length+' people are typing…';
 };
 const mentionHTML=text=>esc(String(text||'')).replace(/(^|[^\w])@([A-Za-z0-9_.-]+)/g,(_m,prefix,name)=>prefix+'<span class="cel-mention'+(name.toLowerCase()===user.username.toLowerCase()?' mine':'')+'">@'+name+'</span>');
 const server=()=>servers.find(s=>s.id===serverId)||servers[0];
 const channel=()=>server()?.channels?.find(c=>c.id===channelId)||server()?.channels?.[0];
 const channelLabel=c=>c?.id==='games'?'arcade':c?.name||c?.id||'general';
 const say=t=>{$r('[data-error]').hidden=!t;$r('[data-error]').textContent=t||''};
 function render(){
  const s=server(),c=channel(),sel=$r('[data-server]');if(s)serverId=s.id;if(c)channelId=c.id;sel.innerHTML=servers.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');sel.value=serverId;
  $r('[data-channels]').innerHTML=(s?.channels||[]).map((x,index)=>'<button type="button" class="native-chat-link '+(!dm&&x.id===channelId?'on':'')+'" data-channel-index="'+index+'"># '+esc(channelLabel(x))+'</button>').join('');
  $r('[data-join]').hidden=!s||s.members?.some(p=>p.id===user.id);
  $r('[data-clear-chat]').hidden=dm?false:user.role!=='admin';
  $r('[data-clear-chat]').textContent=dm?'Clear DM':'Clear channel';
  $r('[data-title]').textContent=dm?dm.username:'# '+channelLabel(c);$r('[data-status]').textContent=socket?.readyState===WebSocket.OPEN?'Live':'Reconnecting…';
  const feed=$r('.native-feed'),near=feed.scrollHeight-feed.scrollTop-feed.clientHeight<100,previousScroll=feed.scrollTop;
  const roster=new Map((s?.members||[]).map(p=>[p.id,p]));for(const p of people)roster.set(p.id,{...roster.get(p.id),...p});const all=[...roster.values()];const rows=dm?dmRows:(s?.messages?.[c?.id]||[]);
  feed.innerHTML=rows.map(m=>{const p=roster.get(dm?m.from:m.userId)||all.find(x=>(x.username||x.name)===(dm?m.author:m.by||m.username));const name=dm?m.author:m.by||m.username||p?.username||'Member';const parent=!dm&&m.replyTo?rows.find(item=>item.id===m.replyTo):null;return '<article class="native-message'+(String(dm?m.text:m.message||'').split(/\s+/).some(part=>part.toLowerCase().replace(/[^a-z0-9_@-]/g,'')==='@'+user.username.toLowerCase())?' mentioned':'')+'"><span class="native-person-icon">'+esc(name.slice(0,2).toUpperCase())+'</span><div><div class="native-message-meta"><b>'+esc(name)+'</b>'+badge(p)+timestamp(m)+'</div>'+(parent?'<small class="cel-message-parent">↳ '+esc(parent.by||parent.username||'Member')+': '+esc((parent.message||'').slice(0,85))+'</small>':'')+(m.announcement?'<small class="cel-message-parent">📣 Official announcement</small>':'')+'<p>'+mentionHTML(dm?m.text:m.message)+'</p>'+(m.editedAt?'<small class="cel-message-edited">edited</small>':'')+
(!dm&&m.pinnedAt?'<span class="cel-message-pin">📌 Pinned</span>':'')+
(!dm?'<div class="cel-message-reactions">'+Object.entries(m.reactions||{}).filter(([,votes])=>Array.isArray(votes)&&votes.length).map(([emoji,votes])=>'<button type="button" data-react="'+esc(m.id)+'" data-emoji="'+esc(emoji)+'" class="'+(votes.includes(user.id)?'mine':'')+'">'+esc(emoji)+' '+votes.length+'</button>').join('')+'</div>':'')+'</div>'+
(!dm?'<div class="cel-message-actions"><button class="cel-reply-action" type="button" data-reply-id="'+esc(m.id)+'" title="Reply">↩</button><button type="button" data-react="'+esc(m.id)+'" data-emoji="❤️" title="React">♡</button>'+
(m.userId===user.id&&Date.now()-(Number(m.at)||0)<900000?'<button type="button" data-edit-message="'+esc(m.id)+'" title="Edit message">✎</button>':'')+
((user.role==='admin'||user.role==='community_manager'||user.role==='moderator')?'<button type="button" data-pin-message="'+esc(m.id)+'" title="'+(m.pinnedAt?'Unpin':'Pin')+'">📌</button>':'')+'</div>':'')+(!dm&&(user.role==='admin'||m.userId===user.id)?'<button type="button" class="native-delete-message" aria-label="Delete message" title="Delete message" data-delete-message="'+esc(m.id)+'" data-delete-channel="'+esc(c?.id||'')+'">'+ico('trash')+'</button>':'')+'</article>'}).join('');
  if(near)feed.scrollTop=feed.scrollHeight;else feed.scrollTop=previousScroll;
  input.disabled=!dm&&!!c?.readOnly&&!['admin','community_manager'].includes(user.role);
  if(input.disabled)input.placeholder='Only staff can post in this channel';
  paintAnnouncement();paintTyping();
  $r('[data-member-count]').textContent=all.length;
  if(!input.disabled)input.placeholder=dm?'Message @'+dm.username:'Message #'+channelLabel(c);
  $r('[data-dm-list]').innerHTML=people.filter(p=>p.id!==user.id).slice(0,10).map(p=>'<button class="cel-dm-link" data-person="'+esc(p.id)+'"><span class="native-person-icon">'+esc((p.username||p.name||'?').slice(0,2).toUpperCase())+'</span>'+esc(p.username||p.name)+'</button>').join('');
  const q=$r('[data-search]').value.toLowerCase(),ids=new Set(online.map(p=>p.id));$r('[data-people]').innerHTML=all.filter(p=>(p.username||p.name||'').toLowerCase().includes(q)).sort((a,b)=>Number(ids.has(b.id))-Number(ids.has(a.id))||String(a.username||a.name).localeCompare(String(b.username||b.name))).map(p=>'<button class="native-member" data-person="'+esc(p.id)+'"><i class="'+(ids.has(p.id)?'online':'')+'"></i><span>'+esc(p.username||p.name)+badge(p)+'</span></button>').join('');
 }
 async function refresh(){try{people=(await api('/api/community/members')).members||[];render()}catch{}}
 async function readDM(){if(!dm)return;const id=dm.id;const n=++revision;try{const d=await api('/api/dms/'+encodeURIComponent(id));if(dm?.id===id&&n===revision){dmRows=d.messages||[];render()}}catch(e){say(e.message)}}
 function connect(){
  if(closed)return;
  socket=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/live');
  socket.onopen=()=>{reconnectDelay=1000;statusText('Connected');render()};
  socket.onmessage=e=>{
   let m;try{m=JSON.parse(e.data)}catch{return}
   if(m.type==='hello'||m.type==='presence')online=m.online||[];
   if(m.type==='v2State')servers=m.servers||[];
   if(m.type==='v2Server')servers=servers.filter(s=>s.id!==m.server.id).concat(m.server);
   if(m.type==='v2Announcement'){
    announcement=m.entry;
    sessionStorage.removeItem('celestial.announcement.dismissed');
    paintAnnouncement();
    if(document.visibilityState==='hidden'&&'Notification' in window&&Notification.permission==='granted')
      new Notification('Celestial announcement',{body:m.entry.message.slice(0,150)});
   }
   if(m.type==='v2AnnouncementRemoved'){
    if(announcement?.id===m.id)announcement=null;
    const main=servers.find(s=>s.id==='lightning-main');
    if(main?.messages?.announcements)main.messages.announcements=main.messages.announcements.filter(item=>item.id!==m.id);
    paintAnnouncement();render();return;
   }
   if(m.type==='v2Typing'){
    typingUsers.set(m.userId,{name:m.name||'Someone',at:Date.now(),serverId:m.serverId,channel:m.channel});paintTyping();return;
   }
   if(['v2Message','v2MessageUpdate','v2MessageDeleted'].includes(m.type)){
    const s=servers.find(s=>s.id===m.serverId),ch=m.channel||m.entry?.channel;
    if(s&&ch){
     s.messages||={};let rows=s.messages[ch]||[];
     if(m.type==='v2Message'&&!rows.some(r=>r.id===m.entry.id))rows=rows.concat(m.entry);
     if(m.type==='v2MessageUpdate')rows=rows.map(row=>row.id===m.entry.id?m.entry:row);
     if(m.type==='v2MessageDeleted')rows=rows.filter(row=>row.id!==m.id);
     s.messages[ch]=rows.slice(-150);
    }
    if(m.type==='v2Message'&&sending?.clientId&&m.entry?.clientId===sending.clientId&&m.entry.userId===user.id){
     clearTimeout(sending.timer);
     if(sending.scope===scope()){
      input.value='';drafts.delete(scope());input.style.height='auto';clearReply();picker.hidden=true;
     }else drafts.delete(sending.scope);
     sending=null;setSending(false);statusText('Sent');say('');
    }
   }
   if(m.type==='error'){
    say(m.message);if(sending){clearTimeout(sending.timer);sending=null;setSending(false);statusText('Not sent')};
   }
   render();
  };
  socket.onclose=()=>{
   if(sending){clearTimeout(sending.timer);sending=null;setSending(false);statusText('Disconnected — message not confirmed');}
   render();
   if(!closed){const delay=reconnectDelay;reconnectDelay=Math.min(12000,reconnectDelay*1.7);setTimeout(connect,delay)}
  };
 }
 $r('.native-feed').addEventListener('click',e=>{
  const replyButton=e.target.closest('[data-reply-id]');
  if(replyButton){const row=(dm?dmRows:(server()?.messages?.[channelId]||[])).find(m=>m.id===replyButton.dataset.replyId);if(row){reply={id:row.id,author:row.by||row.author||'Member',text:row.message||row.text||''};$r('[data-reply]').hidden=false;$r('[data-reply-text]').textContent='Replying to '+reply.author+': '+reply.text.slice(0,70);input.focus()}return}
  const reactButton=e.target.closest('[data-react]');
  if(reactButton&&!dm){
   send({type:'v2React',serverId,channel:channelId,messageId:reactButton.dataset.react,emoji:reactButton.dataset.emoji});return;
  }
  const pin=e.target.closest('[data-pin-message]');
  if(pin&&!dm){
   send({type:'v2PinMessage',serverId,channel:channelId,messageId:pin.dataset.pinMessage});return;
  }
  const edit=e.target.closest('[data-edit-message]');
  if(edit&&!dm){
   const row=server()?.messages?.[channelId]?.find(m=>m.id===edit.dataset.editMessage);
   if(!row||row.userId!==user.id)return;
   const article=edit.closest('.native-message');
   const body=article?.querySelector('p');
   if(!body)return;
   const form=document.createElement('form');form.className='cel-inline-edit';
   const textarea=document.createElement('textarea');textarea.maxLength=1500;textarea.value=row.message||'';
   const buttons=document.createElement('div');
   const save=document.createElement('button');save.type='submit';save.className='btn k s';save.textContent='Save';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='btn s';cancel.textContent='Cancel';
   buttons.append(save,cancel);form.append(textarea,buttons);
   const original=body;original.hidden=true;original.after(form);textarea.focus();
   cancel.onclick=()=>{original.hidden=false;form.remove()};
   textarea.onkeydown=event=>{if(event.key==='Escape')cancel.click();if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}};
   form.onsubmit=event=>{
    event.preventDefault();const message=textarea.value.trim();
    if(!message)return;save.disabled=true;
    if(send({type:'v2EditMessage',serverId,channel:channelId,messageId:row.id,message}))form.remove();
    else{save.disabled=false;say('Reconnecting — edit not saved.')}
   };
   return;
  }
  const button=e.target.closest('[data-delete-message]');
  if(!button||dm||!(user.role==='admin'||(server()?.messages?.[channelId]||[]).some(m=>m.id===button.dataset.deleteMessage&&m.userId===user.id)))return;
  const messageId=button.dataset.deleteMessage;
  const currentChannel=button.dataset.deleteChannel;
  if(!confirm('Delete this message for everyone?'))return;
  if(!send({type:'v2DeleteMessage',serverId,channel:currentChannel,messageId}))say('Chat is reconnecting. Try again.');
 });
 $r('[data-cancel-reply]').onclick=()=>{reply=null;$r('[data-reply]').hidden=true};
 const switchTo=(newServer,newChannel,newDM)=>{
  storeDraft();serverId=newServer;channelId=newChannel;dm=newDM;clearReply();render();restoreDraft();say('');statusText('');
  if(dm){dmRows=[];readDM()}
 };
 $r('[data-server]').onchange=e=>switchTo(e.target.value,'',null);
 $r('[data-channels]').onclick=e=>{
  const b=e.target.closest('[data-channel-index]');
  if(!b)return;
  const index=Number(b.dataset.channelIndex);
  const id=server()?.channels?.[index]?.id;
  if(id)switchTo(serverId,id,null);
 };
 $r('[data-search]').oninput=render;
 const choosePerson=e=>{
  const b=e.target.closest('[data-person]');
  if(!b||b.dataset.person===user.id)return;
  const person=people.find(p=>p.id===b.dataset.person);
  if(person)switchTo(serverId,channelId,person);
 };
 $r('[data-people]').onclick=choosePerson;
 $r('[data-dm-list]').onclick=choosePerson;
 $r('[data-open-announcements]').onclick=()=>switchTo('lightning-main','announcements',null);
 $r('[data-dismiss-announcement]').onclick=()=>{
  const latest=latestAnnouncement();
  if(latest)sessionStorage.setItem('celestial.announcement.dismissed',latest.id);
  paintAnnouncement();
 };
 $r('[data-join]').onclick=()=>send({type:'v2Join',serverId});
 $r('[data-clear-chat]').onclick=async()=>{
  if(dm){
    const target=dm.id,name=dm.username;
    if(!confirm('Clear your conversation with '+name+'? This only hides messages for you.'))return;
    try{await api('/api/dms/'+encodeURIComponent(target)+'/clear',{});dmRows=[];render();await readDM();say('Conversation cleared from your view.')}catch(e){say(e.message)}
    return;
  }
  if(user.role!=='admin'||!server()||!channel())return;
  const channelName=channelLabel(channel());
  if(!confirm('Clear every message in #'+channelName+' for everyone? This cannot be undone.'))return;
  if(!send({type:'v2ClearChannel',serverId,channel:channelId}))say('Chat is reconnecting. Try again.');
 };
 $r('[data-full]').onclick=()=>document.fullscreenElement?document.exitFullscreen():root.requestFullscreen();
 const suggestions=()=>{
   const match=input.value.slice(0,input.selectionStart).match(/(?:^|\s)@([A-Za-z0-9_.-]*)$/);
   mentionMatches=match?people.filter(p=>p.id!==user.id&&(p.username||p.name||'').toLowerCase().startsWith(match[1].toLowerCase())).slice(0,7):[];
   picker.hidden=!mentionMatches.length;
   picker.innerHTML=mentionMatches.map((p,i)=>'<button type="button" data-mention="'+i+'" role="option"><span class="native-person-icon">'+esc((p.username||p.name).slice(0,2).toUpperCase())+'</span>@'+esc(p.username||p.name)+'</button>').join('');
 };
 const insertMention=i=>{
   const p=mentionMatches[i];if(!p)return;
   const at=input.selectionStart,before=input.value.slice(0,at),after=input.value.slice(at);
   input.value=before.replace(/@([A-Za-z0-9_.-]*)$/,'@'+(p.username||p.name)+' ')+after;
   picker.hidden=true;mentionMatches=[];input.focus();
 };
 picker.onclick=e=>{const b=e.target.closest('[data-mention]');if(b)insertMention(Number(b.dataset.mention))};
 input.oninput=()=>{
  suggestions();storeDraft();input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px';
  if(!dm&&socket?.readyState===WebSocket.OPEN&&Date.now()-lastTypingAt>2600&&input.value.trim()){
   lastTypingAt=Date.now();setTimeout(()=>{if(socket?.readyState===WebSocket.OPEN&&!sending&&input.value.trim())send({type:'v2Typing',serverId,channel:channelId})},550);
  }
 };
 input.onkeydown=e=>{
  if(e.key==='Escape'){picker.hidden=true;return}
  if(!picker.hidden&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();insertMention(0);storeDraft();return}
  if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$r('form').requestSubmit()}
 };
 $r('form').onsubmit=async event=>{
  event.preventDefault();
  const message=input.value.trim();
  if(!message||sending||input.disabled)return;
  const target=scope();
  say('');statusText('Sending…');setSending(true);
  if(dm){
   try{
    const recipient=dm.id;await api('/api/dms/'+encodeURIComponent(recipient),{text:message});
    if(scope()===target){input.value='';input.style.height='auto';clearReply();}
    drafts.delete(target);await readDM();statusText('Sent');
   }catch(error){say(error.message);statusText('Not sent — try again')}
   finally{setSending(false)}
   return;
  }
  const clientId=globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
  if(!send({type:'v2Message',serverId,channel:channelId,message,replyTo:reply?.id||'',clientId})){
   setSending(false);statusText('Not sent');say('Connection lost. Your message is still in the composer.');return;
  }
  const timer=setTimeout(()=>{
   if(sending?.clientId===clientId){
    sending=null;setSending(false);statusText('Delivery unconfirmed');
    say('No server confirmation. Check the channel before retrying to avoid a duplicate.');
   }
  },10000);
  sending={clientId,scope:target,timer};
 };
 connect();refresh();
 const refreshTimer=setInterval(refresh,30000);
 const dmTimer=setInterval(()=>{if(dm)readDM()},6500);
 const typingTimer=setInterval(paintTyping,1500);
 window.addEventListener('pagehide',()=>{closed=true;clearInterval(refreshTimer);clearInterval(dmTimer);clearInterval(typingTimer);socket?.close()});
}
