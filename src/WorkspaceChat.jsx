import React, {useEffect, useMemo, useRef, useState} from 'react';
import {api} from './constants.js';

const MAIN = 'lightning-main';
const shortTime = value => {
  const date = new Date(typeof value === 'number' ? value : Date.parse(value));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
};
const roleLabels = {
  admin:['ADMIN','admin'],
  account_manager:['STAFF','staff'],
  moderator:['MOD','moderator'],
  owner:['OWNER','owner']
};
function Role({person}) {
  const tag = roleLabels[String(person?.platformRole || person?.role || '').toLowerCase()];
  if (!tag) return null;
  return <span className={'celestial-role-badge '+tag[1]}>[{tag[0]}]</span>;
}

export function WorkspaceChat({user, live, onClose, onOpenChat}) {
  const [serverId,setServerId] = useState(MAIN);
  const [channelId,setChannelId] = useState('general');
  const [draft,setDraft] = useState('');
  const [dm,setDm] = useState(null);
  const [directMessages,setDirectMessages] = useState([]);
  const [directory,setDirectory] = useState([]);
  const [showPeople,setShowPeople] = useState(false);
  const [error,setError] = useState('');
  const feed = useRef(null);

  const server = live.servers.find(s=>s.id===serverId)||live.servers[0];
  const channel = server?.channels.find(c=>c.id===channelId)||server?.channels[0];
  const inServer = server?.members.some(m=>m.id===user?.id);
  const online = useMemo(()=>new Set(live.online.map(person=>person.id)),[live.online]);
  const roster = useMemo(()=>{
    const people = new Map((server?.members||[]).map(m=>[m.id,m]));
    if(server?.permanent)for(const member of directory)people.set(member.id,{...people.get(member.id),...member});
    return [...people.values()].sort((a,b)=>(Number(online.has(b.id))-Number(online.has(a.id)))||
      String(a.username||a.name).localeCompare(String(b.username||b.name)));
  },[server?.members,server?.permanent,directory,online]);
  const memberLookup=useMemo(()=>new Map(roster.map(m=>[m.id,m])),[roster]);
  const messages=dm?directMessages:(server?.messages?.[channel?.id]||[]);

  useEffect(()=>{
    if(!user)return;
    let cancelled=false;
    api('/api/community/members').then(response=>{
      if(!cancelled)setDirectory(response.members||[]);
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[user?.id]);
  useEffect(()=>{
    if(!dm?.id)return;
    let cancelled=false;
    const refresh=()=>api('/api/dms/'+encodeURIComponent(dm.id))
      .then(data=>{if(!cancelled)setDirectMessages(data.messages||[]);})
      .catch(e=>{if(!cancelled)setError(e.message);});
    refresh();
    const interval=setInterval(refresh,4500);
    return()=>{cancelled=true;clearInterval(interval);};
  },[dm?.id]);
  useEffect(()=>{
    if(!server||server.channels.some(c=>c.id===channelId))return;
    setChannelId(server.channels[0]?.id||'general');
  },[server?.id,channelId]);
  useEffect(()=>{
    if(feed.current)feed.current.scrollTop=feed.current.scrollHeight;
  },[messages.length,channel?.id,dm?.id]);

  async function send(event) {
    event.preventDefault();
    const text=draft.trim();
    if(!text)return;
    if(dm){
      try {
        const result=await api('/api/dms/'+encodeURIComponent(dm.id),{
          method:'POST',body:JSON.stringify({text})
        });
        setDirectMessages(all=>[...all,result.message].slice(-150));
        setDraft('');setError('');
      }catch(e){setError(e.message||'Unable to send message');}
      return;
    }
    if(!server||!channel||!inServer){setError('Join this server to send messages.');return;}
    if(!live.send({type:'v2Message',serverId:server.id,channel:channel.id,message:text})){
      setError('Reconnecting to chat. Try again in a moment.');return;
    }
    setDraft('');setError('');
  }

  return <section className="celestial-companion-chat" aria-label="Chat while you browse or play">
    <header className="celestial-companion-heading">
      <span className="celestial-companion-brand">✦</span>
      <div><strong>Chat</strong><small><i className={live.connected?'online':''}/> {live.connected?'Connected':'Reconnecting'} · {live.online.length} online</small></div>
      <button title="Open full chat" aria-label="Open full Chat" onClick={onOpenChat}>↗</button>
      <button title="Close chat panel" aria-label="Close Chat" onClick={onClose}>×</button>
    </header>
    <div className="celestial-companion-rooms">
      <select aria-label="Community server" value={server?.id||''} onChange={e=>{
        setServerId(e.target.value);
        setChannelId(live.servers.find(s=>s.id===e.target.value)?.channels[0]?.id||'general');
        setDm(null);
      }}>
        {live.servers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" className={showPeople?'selected':''}
        aria-expanded={showPeople} onClick={()=>setShowPeople(v=>!v)}>
        People <span>{roster.length}</span>
      </button>
    </div>
    {!dm&&!showPeople&&<div className="celestial-companion-channels">
      {(server?.channels||[]).map(c=><button key={c.id}
        className={c.id===channel?.id?'selected':''}
        onClick={()=>{setChannelId(c.id);setError('');}}>
        <span>#</span>{c.name}
      </button>)}
    </div>}
    {showPeople?<div className="celestial-companion-members">
      <span className="celestial-companion-section-label">MEMBERS · ONLINE & OFFLINE</span>
      {roster.map(person=><button key={person.id} disabled={person.id===user?.id}
        onClick={()=>{setDm({id:person.id,username:person.username||person.name});setShowPeople(false);setDirectMessages([]);setError('');}}>
        <span className="celestial-companion-avatar">{String(person.name||person.username||'?')[0].toUpperCase()}</span>
        <span className="celestial-companion-member-name"><strong>{person.name||person.username}</strong><Role person={person}/></span>
        <i className={online.has(person.id)?'online':''} title={online.has(person.id)?'Online':'Offline'}/>
      </button>)}
      {roster.length===0&&<p>No members are available.</p>}
    </div>:<>
      {dm&&<button className="celestial-companion-dm-back" onClick={()=>{setDm(null);setDirectMessages([]);}}>
        ← Back to #{channel?.name||'general'} · @{dm.username}
      </button>}
      <div className="celestial-companion-feed" ref={feed} role="log" aria-live="polite">
        {!messages.length&&<div className="celestial-companion-empty">
          <span>✧</span>
          <strong>{dm?'Start a private conversation.':'Say hello.'}</strong>
          <small>{dm?'Only you and this member can see these messages.':'Your friends are one message away.'}</small>
        </div>}
        {messages.slice(-150).map(message=>{
          const authorId=dm?message.from:message.userId;
          const mine=authorId===user?.id;
          const person=memberLookup.get(authorId)||
            directory.find(row=>row.id===authorId)||
            (mine?{platformRole:user.role}:null);
          const author=dm?(message.author|| (mine?user.username:dm.username)):(message.by||message.username||'Member');
          return <article key={message.id} className={'celestial-companion-message '+(mine?'mine':'')}>
            <div className="celestial-companion-message-meta">
              <strong>{author}</strong><Role person={person}/><time>{shortTime(dm?message.createdAt:message.at)}</time>
            </div>
            <p>{dm?message.text:message.message}</p>
          </article>;
        })}
      </div>
      {error&&<p className="celestial-companion-error" role="alert">{error}</p>}
      <form className="celestial-companion-compose" onSubmit={send}>
        <input aria-label="Send a chat message" maxLength={1000} autoComplete="off"
          value={draft} onChange={e=>setDraft(e.target.value)}
          placeholder={dm?'Message @'+dm.username:'Message #'+(channel?.name||'general')}
          disabled={!dm&&(!inServer||channel?.readOnly)}/>
        <button type="submit" aria-label="Send message"
          disabled={!draft.trim()||(!dm&&(!live.connected||!inServer||channel?.readOnly))}>↑</button>
      </form>
    </>}
  </section>;
}
