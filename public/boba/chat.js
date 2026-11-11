import {$,$$,esc,ico,api} from './common.js';
export function mountChat(root,user){
 root.innerHTML='<div class="native-messenger celestial-discord"><aside class="cel-chat-rail"><span class="cel-chat-logo">✦</span><span class="cel-chat-rail-node">✧</span></aside><aside class="native-rooms"><div class="cel-chat-brand"><strong>Celestial</strong><small>COMMUNITY</small></div><select aria-label="Server" data-server></select><div class="cel-chat-side-title">TEXT CHANNELS</div><div data-channels></div><div class="cel-chat-side-title">DIRECT MESSAGES</div><div class="cel-dm-list" data-dm-list></div><button class="btn s" data-join hidden>Join server</button><button class="btn s" data-new-server>+ New server</button><div class="cel-chat-self"><span class="native-person-icon">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div><strong>'+esc(user.username)+'</strong><small>'+esc(user.role||'Member')+'</small></div><span class="cel-chat-self-dot"></span></div></aside><section class="native-conversation"><header class="native-chat-head"><div class="cel-chat-current"><span>#</span><div><h2 data-title>Chat</h2><small data-status>Connecting…</small></div></div><div class="native-chat-actions"><button class="btn s native-clear-chat" type="button" data-clear-chat hidden>Clear chat</button><button class="cb sm gh" aria-label="Fullscreen chat" data-full>'+ico('expand')+'</button></div></header><div class="native-feed srl" role="log"></div><div class="cel-compose-wrap"><div class="cel-reply-preview" data-reply hidden><span data-reply-text></span><button type="button" data-cancel-reply aria-label="Cancel reply">×</button></div><div class="cel-mention-picker" data-mentions hidden role="listbox"></div><form class="native-compose gl g2"><span class="cel-compose-plus">＋</span><textarea aria-label="Message" maxlength="1500" rows="1" placeholder="Message #general"></textarea><button class="cb" type="submit" aria-label="Send message">'+ico('send')+'</button></form><small class="cel-compose-hint">Type @ to mention · Enter to send · Shift + Enter for a new line</small></div><p class="msg" data-error hidden></p></section><aside class="native-members"><h3>MEMBERS <span data-member-count></span></h3><label class="fld"><input data-search placeholder="Search members…" aria-label="Find a member"></label><div data-people></div></aside></div>';
 let socket,servers=[],people=[],online=[],serverId='',channelId='',dm=null,dmRows=[],closed=false,revision=0,reply=null,mentionMatches=[];
 const $r=s=>$(s,root),send=d=>{if(socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify(d));return true},role=p=>({admin:'ADMIN',owner:'OWNER',account_manager:'STAFF',moderator:'MOD'}[p?.platformRole||p?.role]||'');
 const badge=p=>role(p)?'<span class="native-role role-'+esc(role(p).toLowerCase())+'">'+role(p)+'</span>':'';
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
 const mentionHTML=text=>esc(String(text||'')).replace(/(^|[^\w])@([A-Za-z0-9_.-]+)/g,(_m,prefix,name)=>prefix+'<span class="cel-mention'+(name.toLowerCase()===user.username.toLowerCase()?' mine':'')+'">@'+name+'</span>');
 const server=()=>servers.find(s=>s.id===serverId)||servers[0];
 const channel=()=>server()?.channels?.find(c=>c.id===channelId)||server()?.channels?.[0];
 const say=t=>{$r('[data-error]').hidden=!t;$r('[data-error]').textContent=t||''};
 function render(){
  const s=server(),c=channel(),sel=$r('[data-server]');if(s)serverId=s.id;if(c)channelId=c.id;sel.innerHTML=servers.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');sel.value=serverId;
  $r('[data-channels]').innerHTML=(s?.channels||[]).map(x=>'<button class="native-chat-link '+(!dm&&x.id===channelId?'on':'')+'" data-channel="'+esc(x.id)+'"># '+esc(x.name||x.id)+'</button>').join('');
  $r('[data-join]').hidden=!s||s.members?.some(p=>p.id===user.id);
  $r('[data-clear-chat]').hidden=!dm&&user.role!=='admin';
  $r('[data-clear-chat]').textContent=dm?'Clear DM':'Clear channel';
  $r('[data-title]').textContent=dm?dm.username:'# '+(c?.name||'general');$r('[data-status]').textContent=socket?.readyState===WebSocket.OPEN?'Live':'Reconnecting…';
  const feed=$r('.native-feed'),near=feed.scrollHeight-feed.scrollTop-feed.clientHeight<100;
  const roster=new Map((s?.members||[]).map(p=>[p.id,p]));for(const p of people)roster.set(p.id,{...roster.get(p.id),...p});const all=[...roster.values()];const rows=dm?dmRows:(s?.messages?.[c?.id]||[]);
  feed.innerHTML=rows.map(m=>{const p=roster.get(dm?m.from:m.userId)||all.find(x=>(x.username||x.name)===(dm?m.author:m.by||m.username));const name=dm?m.author:m.by||m.username||p?.username||'Member';return '<article class="native-message'+(new RegExp('(^|[^a-z0-9_])@'+user.username+'(?![a-z0-9_])','i').test(dm?m.text:m.message)?' mentioned':'')+'"><span class="native-person-icon">'+esc(name.slice(0,2).toUpperCase())+'</span><div><div class="native-message-meta"><b>'+esc(name)+'</b>'+badge(p)+timestamp(m)+'</div><p>'+mentionHTML(dm?m.text:m.message)+'</p></div><button class="cel-reply-action" type="button" data-reply-id="'+esc(m.id)+'" aria-label="Reply">↩</button>'+(!dm&&(user.role==='admin'||m.userId===user.id)?'<button type="button" class="native-delete-message" aria-label="Delete message" title="Delete message" data-delete-message="'+esc(m.id)+'" data-delete-channel="'+esc(c?.id||'')+'">'+ico('trash')+'</button>':'')+'</article>'}).join('');
  if(near)feed.scrollTop=feed.scrollHeight;
  $r('[data-member-count]').textContent=all.length;
  input.placeholder=dm?'Message @'+dm.username:'Message #'+(c?.name||'general');
  $r('[data-dm-list]').innerHTML=people.filter(p=>p.id!==user.id).slice(0,10).map(p=>'<button class="cel-dm-link" data-person="'+esc(p.id)+'"><span class="native-person-icon">'+esc((p.username||p.name||'?').slice(0,2).toUpperCase())+'</span>'+esc(p.username||p.name)+'</button>').join('');
  const q=$r('[data-search]').value.toLowerCase(),ids=new Set(online.map(p=>p.id));$r('[data-people]').innerHTML=all.filter(p=>(p.username||p.name||'').toLowerCase().includes(q)).sort((a,b)=>Number(ids.has(b.id))-Number(ids.has(a.id))||String(a.username||a.name).localeCompare(String(b.username||b.name))).map(p=>'<button class="native-member" data-person="'+esc(p.id)+'"><i class="'+(ids.has(p.id)?'online':'')+'"></i><span>'+esc(p.username||p.name)+badge(p)+'</span></button>').join('');
 }
 async function refresh(){try{people=(await api('/api/community/members')).members||[];render()}catch{}}
 async function readDM(){if(!dm)return;const id=dm.id;const n=++revision;try{const d=await api('/api/dms/'+encodeURIComponent(id));if(dm?.id===id&&n===revision){dmRows=d.messages||[];render()}}catch(e){say(e.message)}}
 function connect(){if(closed)return;socket=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/live');socket.onopen=render;socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='hello'||m.type==='presence')online=m.online||[];if(m.type==='v2State')servers=m.servers||[];if(m.type==='v2Server'){servers=servers.filter(s=>s.id!==m.server.id).concat(m.server)}if(['v2Message','v2MessageUpdate','v2MessageDeleted'].includes(m.type)){const s=servers.find(s=>s.id===m.serverId);const ch=m.channel||m.entry?.channel;if(s&&ch){s.messages||={};let rows=s.messages[ch]||[];if(m.type==='v2Message')rows=rows.concat(m.entry);if(m.type==='v2MessageUpdate')rows=rows.map(r=>r.id===m.entry.id?m.entry:r);if(m.type==='v2MessageDeleted')rows=rows.filter(r=>r.id!==m.id);s.messages[ch]=rows.slice(-150)}}if(m.type==='error')say(m.message);render()};socket.onclose=()=>{render();if(!closed)setTimeout(connect,2500)}}
 $r('.native-feed').addEventListener('click',e=>{
  const replyButton=e.target.closest('[data-reply-id]');
  if(replyButton){const row=(dm?dmRows:(server()?.messages?.[channelId]||[])).find(m=>m.id===replyButton.dataset.replyId);if(row){reply={id:row.id,author:row.by||row.author||'Member',text:row.message||row.text||''};$r('[data-reply]').hidden=false;$r('[data-reply-text]').textContent='Replying to '+reply.author+': '+reply.text.slice(0,70);input.focus()}return}
  const button=e.target.closest('[data-delete-message]');
  if(!button||dm||!(user.role==='admin'||(server()?.messages?.[channelId]||[]).some(m=>m.id===button.dataset.deleteMessage&&m.userId===user.id)))return;
  const messageId=button.dataset.deleteMessage;
  const currentChannel=button.dataset.deleteChannel;
  if(!confirm('Delete this message for everyone?'))return;
  if(!send({type:'v2DeleteMessage',serverId,channel:currentChannel,messageId}))say('Chat is reconnecting. Try again.');
 });
 $r('[data-cancel-reply]').onclick=()=>{reply=null;$r('[data-reply]').hidden=true};
 $r('[data-server]').onchange=e=>{serverId=e.target.value;channelId='';dm=null;render()};$r('[data-channels]').onclick=e=>{const b=e.target.closest('[data-channel]');if(b){dm=null;channelId=b.dataset.channel;render()}};$r('[data-search]').oninput=render;$r('[data-people]').onclick=e=>{const b=e.target.closest('[data-person]');if(b&&b.dataset.person!==user.id){dm=people.find(p=>p.id===b.dataset.person);if(dm){dmRows=[];render();readDM()}}};
 $r('[data-dm-list]').onclick=e=>{const b=e.target.closest('[data-person]');if(b&&b.dataset.person!==user.id){dm=people.find(p=>p.id===b.dataset.person);if(dm){dmRows=[];render();readDM()}}};
 $r('[data-join]').onclick=()=>send({type:'v2Join',serverId:serverId});$r('[data-new-server]').onclick=()=>{const name=prompt('Server name');if(name?.trim())send({type:'v2Create',name:name.trim(),description:'A Celestial community',icon:'✦'})};
 $r('[data-clear-chat]').onclick=async()=>{
  if(dm){
    const target=dm.id,name=dm.username;
    if(!confirm('Clear your conversation with '+name+'? This only hides messages for you.'))return;
    try{await api('/api/dms/'+encodeURIComponent(target)+'/clear',{});dmRows=[];render();await readDM();say('Conversation cleared from your view.')}catch(e){say(e.message)}
    return;
  }
  if(user.role!=='admin'||!server()||!channel())return;
  const channelName=channel().name||channel().id;
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
 input.oninput=()=>{suggestions();input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px'};
 input.onkeydown=e=>{if(e.key==='Escape'){picker.hidden=true;return}if(!picker.hidden&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();insertMention(0);return}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$r('form').requestSubmit()}};
 $r('form').onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;try{if(dm){await api('/api/dms/'+encodeURIComponent(dm.id),{text});await readDM()}else if(!send({type:'v2Message',serverId,channel:channelId,message:text,replyTo:reply?.id||''}))throw Error('Chat is reconnecting.');input.value='';input.style.height='auto';reply=null;$r('[data-reply]').hidden=true;picker.hidden=true;say('')}catch(err){say(err.message)}};
 connect();refresh();setInterval(refresh,30000);setInterval(()=>{if(dm)readDM()},4000);window.addEventListener('pagehide',()=>{closed=true;socket?.close()});
}
