import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {api} from './constants.js';
const MAIN='lightning-main';
const clock=stamp=>{const n=Number(stamp)||Date.parse(stamp);if(!n)return '';const d=Date.now()-n;return d<60000?'now':d<3600000?Math.floor(d/60000)+'m':d<86400000?Math.floor(d/3600000)+'h':new Date(n).toLocaleDateString();};
const reactions=['❤️','😂','🔥','✨','💚','👍'];
const roleStyle={
  admin:{label:'ADMIN',tone:'admin'},
  account_manager:{label:'STAFF',tone:'staff'},
  moderator:{label:'MOD',tone:'moderator'},
  owner:{label:'OWNER',tone:'owner'}
};
function memberRole(person,server){
  const platform=String(person?.platformRole||'user').toLowerCase();
  if(roleStyle[platform])return roleStyle[platform];
  if(person?.admin)return roleStyle.admin;
  const serverRole=server?.roles?.find(role=>role.id===person?.role&&role.id!=='member');
  if(serverRole)return {label:String(serverRole.name||'ROLE').slice(0,20).toUpperCase(),tone:'custom',color:/^#[\da-f]{6}$/i.test(serverRole.color)?serverRole.color:undefined};
  return null;
}
function RoleBadge({member,server}){
  const tag=memberRole(member,server);
  return tag?<span className={'celestial-role-badge '+tag.tone} style={tag.color?{'--role-accent':tag.color}:undefined}>[{tag.label}]</span>:null;
}
export function Chat({user,onAuth,live}){
  const [sid,setSid]=useState(MAIN),[channel,setChannel]=useState('general'),[draft,setDraft]=useState(''),[reply,setReply]=useState(null),[error,setError]=useState('');
  const feed=useRef(null);
  const [dmUser,setDmUser]=useState(null);
  const [dmRows,setDmRows]=useState([]);
  const [dmThreads,setDmThreads]=useState([]);

  const server=live.servers.find(s=>s.id===sid)||live.servers[0];
  const channels=server?.channels||[];
  const active=channels.find(c=>c.id===channel)||channels[0];
  const messages=server?.messages?.[active?.id]||[];
  const visibleMessages=dmUser?dmRows.map(row=>({id:row.id,by:row.author,userId:row.from,message:row.text,at:row.createdAt})):messages;
  const member=server?.members?.some(m=>m.id===user?.id);
  const [memberSearch,setMemberSearch]=useState('');
  const [rosterOpen,setRosterOpen]=useState(false);
  const onlineIds=useMemo(()=>new Set(live.online.map(person=>person.id)),[live.online]);
  const fullRoster=useMemo(()=>(server?.members||[]).slice().sort((a,b)=>{
    const aOn=onlineIds.has(a.id),bOn=onlineIds.has(b.id);
    if(aOn!==bOn)return aOn?-1:1;
    return (a.name||a.username||'').localeCompare(b.name||b.username||'');
  }),[server?.members,onlineIds]);
  const matchingRoster=fullRoster.filter(person=>(person.name+' '+person.username).toLowerCase().includes(memberSearch.toLowerCase()));
  const onlineCount=fullRoster.filter(person=>onlineIds.has(person.id)).length;
  const rosterById=useMemo(()=>new Map((server?.members||[]).map(person=>[person.id,person])),[server?.members]);
  const rosterByName=useMemo(()=>new Map((server?.members||[]).filter(person=>person.username||person.name).map(person=>[String(person.username||person.name).toLowerCase(),person])),[server?.members]);
  const taggedMember=row=>rosterById.get(row.userId)||rosterByName.get(String(row.username||row.by||'').toLowerCase())||
    (row.userId===user.id?{id:user.id,platformRole:user.role,role:'member'}:null);
  useEffect(()=>{if(server&&!channels.some(c=>c.id===channel))setChannel(channels[0]?.id||'general');},[server?.id,channels.length]);
  useEffect(()=>{if(feed.current)feed.current.scrollTop=feed.current.scrollHeight;},[messages.length,active?.id]);
  useEffect(()=>{if(live.error&&!dmUser)setError(live.error);},[live.error]);
  useEffect(()=>{
    if(!user)return;
    let cancelled=false;
    const refresh=async()=>{
      try{
        const threads=await api('/api/dms');
        if(!cancelled)setDmThreads(threads.threads||[]);
        if(dmUser?.id){
          const detail=await api('/api/dms/'+dmUser.id);
          if(!cancelled)setDmRows(detail.messages||[]);
        }
      }catch(e){if(!cancelled&&dmUser)setError(e.message);}
    };
    refresh();
    const timer=setInterval(refresh,4500);
    return()=>{cancelled=true;clearInterval(timer);};
  },[user?.id,dmUser?.id]);

  const send=async e=>{
    e.preventDefault();
    const message=draft.trim();
    if(!user){onAuth('login');return;}
    if(!message)return;
    if(dmUser){
      try{
        await api('/api/dms/'+dmUser.id,{method:'POST',body:JSON.stringify({text:message})});
        const fresh=await api('/api/dms/'+dmUser.id);
        setDmRows(fresh.messages||[]);
        setDraft('');setError('');
      }catch(err){setError(err.message);}
      return;
    }
    if(!server||!active)return;
    if(!live.send({type:'v2Message',serverId:server.id,channel:active.id,message,replyTo:reply?.id||''})){
      setError('Reconnecting. Try again.');return;
    }
    setDraft('');setReply(null);setError('');
  };
  const sendAction=(type,row,extra={})=>live.send({type,serverId:server.id,channel:active.id,messageId:row.id,...extra});
  const edit=row=>{const message=prompt('Edit your message',row.message);if(message?.trim())sendAction('v2EditMessage',row,{message:message.trim()});};
  const remove=row=>{if(confirm('Delete your message?'))sendAction('v2DeleteMessage',row);};
  const create=()=>{const name=prompt('New server name');if(name?.trim())live.send({type:'v2Create',name:name.trim(),description:'A Celestial community',icon:'✦'});};
  const addChannel=()=>{const name=prompt('New channel name');if(name?.trim())live.send({type:'v2AddChannel',serverId:server.id,name:name.trim(),category:'COMMUNITY'});};
  if(!user)return <section className="forest-app forest-chat guest-chat"><div className="forest-app-head"><span className="eyebrow">CELESTIAL COMMUNITY</span><h1>Find your <em>people.</em></h1><p>Real channels, servers and game nights, all in one place.</p></div><div className="forest-auth-invitation"><span>✧</span><h2>Come on in.</h2><p>Sign in to enter the Celestial community.</p><button onClick={()=>onAuth('login')}>Enter community <Icon name="arrow" size={16}/></button></div></section>;
  return <section className="forest-app forest-chat">
    <div className="forest-app-head"><span className="eyebrow">CELESTIAL / COMMUNITY</span><h1>Community <em>chat.</em></h1><p>Conversations and people, all in one place.</p><span className="forest-chat-presence"><i/>{live.online.length} online · {live.connected?'connected':'reconnecting'}</span></div>
    <div className="forest-chat-layout">
      <aside className="forest-chat-servers"><span className="chat-group-label">SERVERS</span>{live.servers.map(s=><button key={s.id} title={s.name} className={'forest-server-icon '+(s.id===server?.id?'active':'')} onClick={()=>{setDmUser(null);setSid(s.id);setChannel(s.channels[0]?.id||'general')}}>{s.permanent?'✦':s.name?.[0]}</button>)}<button title="Create server" className="forest-server-add" onClick={create}>+</button></aside>
      <aside className="forest-chat-channels"><div className="forest-chat-server-title"><span>{server?.name||'Celestial'}</span><small>{server?.memberCount||0} members</small></div><span className="chat-group-label">TEXT CHANNELS {server?.canManage&&<button title="Add channel" onClick={addChannel}>+</button>}</span><div className="forest-channel-list">{channels.map(c=><button key={c.id} className={'forest-channel-link '+(active?.id===c.id?'active':'')} onClick={()=>{setDmUser(null);setChannel(c.id);setReply(null)}}><span>#</span>{c.name}{c.readOnly&&<small>◆</small>}</button>)}</div><div className="forest-dm-block"><span className="chat-group-label">DIRECT MESSAGES</span>
        {dmThreads.map(thread=><button key={thread.user.id} className={'forest-dm-link '+(dmUser?.id===thread.user.id?'active':'')}
          onClick={()=>{setDmUser(thread.user);setError('')}}><span>◉</span>{thread.user.username}</button>)}
        </div>{server&&!member&&<button className="forest-join-server" onClick={()=>live.send({type:'v2Join',serverId:server.id})}>Join server ↗</button>}<div className="forest-chat-channel-footer">✦ {user.username}</div></aside>
      <div className="forest-chat-main"><header className="forest-chat-titlebar"><span>{dmUser?'@':'#'}</span><strong>{dmUser?dmUser.username:active?.name||'general'}</strong>
        <small>{dmUser?'PRIVATE CONVERSATION':active?.category||'COMMUNITY'}</small>
        {dmUser&&<button className="forest-dm-back" onClick={()=>setDmUser(null)}>← Channels</button>}
        <b>{dmUser?'PRIVATE':live.connected?'● LIVE':'○ OFFLINE'}</b>
        <button className="celestial-chat-roster-toggle" onClick={()=>setRosterOpen(value=>!value)} aria-expanded={rosterOpen}>{rosterOpen?'Close':'Members'} ({fullRoster.length})</button></header>
        <div className="forest-chat-feed" ref={feed} role="log" aria-live="polite">
          {!dmUser&&!live.connected&&!live.servers.length&&<div className="forest-chat-empty">Connecting to Celestial Live…</div>}
          {(dmUser?visibleMessages.length===0:live.connected&&visibleMessages.length===0)&&<div className="forest-chat-empty"><span>✧</span><h2>{dmUser?'A private conversation.':'The beginning of #'+(active?.name||'general')+'.'}</h2><p>Say something worth remembering.</p></div>}
          {visibleMessages.map(row=><article className={'forest-message '+(row.userId===user.id?'own':'')} key={row.id}>
            <div className="forest-message-avatar">{row.by?.[0]?.toUpperCase()||'?'}</div><div className="forest-message-body"><div className="forest-message-meta"><strong>{row.by}</strong><RoleBadge member={taggedMember(row)} server={server}/><time>{clock(row.at)}</time>{row.editedAt&&<small>edited</small>}{row.pinnedAt&&<small>PINNED</small>}</div>{row.replyTo&&<div className="forest-message-reply">↳ Reply in thread</div>}<p>{row.message}</p>{!dmUser&&<div className="forest-message-reactions">{Object.entries(row.reactions||{}).map(([emoji,ids])=><button key={emoji} onClick={()=>sendAction('v2React',row,{emoji})}>{emoji} {ids.length}</button>)}</div>}</div>
            {!dmUser&&<div className="forest-message-actions"><button title="Reply" onClick={()=>setReply(row)}>↩</button>{reactions.slice(0,3).map(emoji=><button key={emoji} title={'React '+emoji} onClick={()=>sendAction('v2React',row,{emoji})}>{emoji}</button>)}{row.userId===user.id&&<><button title="Edit" onClick={()=>edit(row)}>✎</button><button title="Delete" onClick={()=>remove(row)}>×</button></>}</div>}
          </article>)}
        </div>
        {reply&&!dmUser&&<div className="forest-reply-strip">Replying to {reply.by}: {reply.message?.slice(0,50)} <button onClick={()=>setReply(null)}>×</button></div>}{error&&<div className="forest-chat-error">{error}</div>}
        <form className="forest-chat-compose" onSubmit={send}><span>✧</span><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1500} aria-label="Message channel" placeholder={dmUser?'Message @'+dmUser.username:'Message #'+(active?.name||'general')} disabled={!dmUser&&(!member||active?.readOnly)}/><button disabled={!draft.trim()||(!dmUser&&(!live.connected||!member||active?.readOnly))} type="submit"><Icon name="send" size={18}/></button></form>
      </div>
      <aside className={"forest-chat-members celestial-chat-directory "+(rosterOpen?"is-open":"")}>
        <div className="celestial-members-heading"><span className="chat-group-label">MEMBERS — {fullRoster.length}</span>
          <small><i/> {onlineCount} online</small>
        </div>
        <input className="celestial-members-search" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}
          aria-label="Find member" placeholder="Find a member…"/>
        <div className="celestial-members-scroll">
          {matchingRoster.map(person=>{
            const isOnline=onlineIds.has(person.id);
            const name=person.name||person.username||'Member';
            return <button className={'forest-online-member celestial-member-entry '+(isOnline?'is-online':'is-offline')}
              key={person.id} disabled={person.id===user.id}
              onClick={()=>{setDmUser({id:person.id,username:person.username||name});setError('');}}
              title={person.id===user.id?'Your account':'Message '+name}>
              <span className="forest-member-avatar">{name[0]?.toUpperCase()||'?'}</span>
              <span className="celestial-member-label"><strong>{name}</strong><RoleBadge member={person} server={server}/></span>
              <i aria-label={isOnline?'Online':'Offline'}/>
            </button>;
          })}
          {!matchingRoster.length&&<p className="celestial-member-empty">No matching members.</p>}
        </div>
      </aside>
    </div>
  </section>;
}
