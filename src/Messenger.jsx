import React, {useEffect, useMemo, useRef, useState} from 'react';
import {api} from './constants.js';

const MAIN_SERVER='lightning-main';
const REACTIONS=['♡','✦','👍'];
const ROLE_BADGES={
  admin:{name:'ADMIN',tone:'admin'},
  account_manager:{name:'STAFF',tone:'staff'},
  moderator:{name:'MOD',tone:'moderator'},
  owner:{name:'OWNER',tone:'owner'}
};

function clock(stamp){
  const raw=typeof stamp==='number'?stamp:Date.parse(stamp);
  if(!Number.isFinite(raw))return '';
  const age=Date.now()-raw;
  if(age>=0&&age<60_000)return 'now';
  if(age>=0&&age<3_600_000)return Math.max(1,Math.floor(age/60_000))+'m';
  if(age>=0&&age<86_400_000)return Math.max(1,Math.floor(age/3_600_000))+'h';
  return new Date(raw).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
function roleFor(member,server){
  const platform=String(member?.platformRole||'user').toLowerCase();
  if(ROLE_BADGES[platform])return ROLE_BADGES[platform];
  if(member?.admin)return ROLE_BADGES.admin;
  const custom=server?.roles?.find(role=>role.id===member?.role&&role.id!=='member');
  if(custom)return {
    name:String(custom.name||'MEMBER').slice(0,18).toUpperCase(),
    tone:'custom',
    color:/^#[\da-f]{6}$/i.test(custom.color)?custom.color:undefined
  };
  return null;
}
function RoleBadge({member,server}){
  const badge=roleFor(member,server);
  if(!badge)return null;
  return <span className={'messenger-role '+badge.tone}
    style={badge.color?{'--member-role-color':badge.color}:undefined}>[{badge.name}]</span>;
}
function Avatar({name,person,small=false}){
  const hash=[...String(person?.id||name||'?')].reduce((acc,char)=>acc+char.charCodeAt(0),0)%6;
  return <span className={'messenger-avatar color-'+hash+(small?' small':'')}
    aria-hidden="true">{String(name||'?').slice(0,1).toUpperCase()}</span>;
}
function SelectServer({servers,server,onSelect}){
  return <select className="messenger-server-select" aria-label="Community server" value={server?.id||''}
    onChange={event=>onSelect(event.target.value)}>
    {servers.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
  </select>;
}

/** Shared full-size Chat and the companion Chat beside the browser/games. */
export function Messenger({user,live,compact=false,onClose,onOpenChat}){
  const [serverId,setServerId]=useState(MAIN_SERVER);
  const [channelId,setChannelId]=useState('general');
  const [dmUser,setDmUser]=useState(null);
  const [draft,setDraft]=useState('');
  const [reply,setReply]=useState(null);
  const [error,setError]=useState('');
  const [threads,setThreads]=useState([]);
  const [dmRows,setDmRows]=useState([]);
  const [directory,setDirectory]=useState([]);
  const [memberSearch,setMemberSearch]=useState('');
  const [messageSearch,setMessageSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [membersOpen,setMembersOpen]=useState(false);
  const [channelsOpen,setChannelsOpen]=useState(false);
  const [editing,setEditing]=useState(null);
  const [editText,setEditText]=useState('');
  const feed=useRef(null);

  const server=live.servers.find(s=>s.id===serverId)||live.servers[0]||null;
  const channels=server?.channels||[];
  const activeChannel=channels.find(c=>c.id===channelId)||channels[0]||null;
  const isMember=server?.members?.some(person=>person.id===user?.id)||false;
  const onlineIds=useMemo(()=>new Set((live.online||[]).map(person=>person.id)),[live.online]);
  const roster=useMemo(()=>{
    const byId=new Map((server?.members||[]).map(member=>[member.id,member]));
    if(server?.permanent){
      for(const member of directory){
        byId.set(member.id,{...byId.get(member.id),...member});
      }
    }
    return [...byId.values()].sort((a,b)=>{
      const status=Number(onlineIds.has(b.id))-Number(onlineIds.has(a.id));
      if(status)return status;
      return String(a.name||a.username||'').localeCompare(String(b.name||b.username||''));
    });
  },[server?.members,server?.permanent,directory,onlineIds]);
  const memberIds=useMemo(()=>new Map(roster.map(person=>[person.id,person])),[roster]);
  const memberNames=useMemo(()=>new Map(roster.filter(p=>p.username||p.name).map(p=>
    [String(p.username||p.name).toLowerCase(),p])),[roster]);
  const messages=dmUser?dmRows:(server?.messages?.[activeChannel?.id]||[]);
  const visibleMessages=messageSearch.trim()?messages.filter(message=>{
    const text=dmUser?message.text:message.message;
    return String(text||'').toLowerCase().includes(messageSearch.trim().toLowerCase());
  }):messages;
  const onlineCount=roster.filter(person=>onlineIds.has(person.id)).length;
  const filteredRoster=roster.filter(person=>
    String((person.name||person.username||'')+' '+(person.username||'')).toLowerCase()
      .includes(memberSearch.toLowerCase()));

  useEffect(()=>{
    if(server&&!channels.some(c=>c.id===channelId))setChannelId(channels[0]?.id||'general');
  },[server?.id,channelId,channels.length]);
  useEffect(()=>{
    if(!user)return;
    let cancelled=false;
    const fetchDirectory=async()=>{
      try{
        const data=await api('/api/community/members');
        if(!cancelled)setDirectory(data.members||[]);
      }catch{}
    };
    fetchDirectory();
    const interval=setInterval(fetchDirectory,30000);
    return()=>{cancelled=true;clearInterval(interval);};
  },[user?.id]);
  useEffect(()=>{
    if(!user)return;
    let cancelled=false;
    const refresh=async()=>{
      try{
        const data=await api('/api/dms');
        if(!cancelled)setThreads(data.threads||[]);
      }catch{}
    };
    refresh();
    const interval=setInterval(refresh,10000);
    return()=>{cancelled=true;clearInterval(interval);};
  },[user?.id]);
  useEffect(()=>{
    if(!dmUser?.id)return;
    let cancelled=false;
    const refresh=async()=>{
      try{
        const data=await api('/api/dms/'+encodeURIComponent(dmUser.id));
        if(!cancelled)setDmRows(data.messages||[]);
      }catch(err){if(!cancelled)setError(err.message||'Unable to load messages');}
    };
    refresh();
    const interval=setInterval(refresh,4500);
    return()=>{cancelled=true;clearInterval(interval);};
  },[dmUser?.id]);
  useEffect(()=>{
    if(feed.current)feed.current.scrollTop=feed.current.scrollHeight;
  },[messages.length,dmUser?.id,activeChannel?.id]);

  const selectServer=id=>{
    setServerId(id);
    setChannelId(live.servers.find(s=>s.id===id)?.channels?.[0]?.id||'general');
    setDmUser(null);setReply(null);setError('');setChannelsOpen(false);
  };
  const selectChannel=id=>{
    setChannelId(id);setDmUser(null);setReply(null);
    setError('');setMessageSearch('');setChannelsOpen(false);
  };
  const selectDM=person=>{
    if(person.id===user?.id)return;
    setDmUser({id:person.id,username:person.username||person.name||'Member'});
    setDmRows([]);setReply(null);setError('');setChannelsOpen(false);setMembersOpen(false);
  };
  const sendAction=(type,message,extra={})=>{
    if(!server||!activeChannel)return false;
    return live.send({type,serverId:server.id,channel:activeChannel.id,messageId:message.id,...extra});
  };
  const send=async event=>{
    event.preventDefault();
    const text=draft.trim();
    if(!text)return;
    if(dmUser){
      try{
        const result=await api('/api/dms/'+encodeURIComponent(dmUser.id),{
          method:'POST',body:JSON.stringify({text})
        });
        if(result.message)setDmRows(current=>[...current,result.message].slice(-150));
        setDraft('');setError('');
      }catch(err){setError(err.message||'Unable to send your message');}
      return;
    }
    if(!isMember){setError('Join this server before sending messages.');return;}
    if(!live.send({type:'v2Message',serverId:server.id,channel:activeChannel.id,
      message:text,replyTo:reply?.id||''})){
      setError('Chat is reconnecting. Try sending again in a moment.');return;
    }
    setDraft('');setReply(null);setError('');
  };
  const saveEdit=message=>{
    const text=editText.trim();
    if(text&&!sendAction('v2EditMessage',message,{message:text})){
      setError('Reconnect to edit this message.');
    }else{setEditing(null);setEditText('');}
  };
  const deleteMessage=message=>{
    if(window.confirm('Delete this message permanently?'))sendAction('v2DeleteMessage',message);
  };
  const makeServer=()=>{
    const name=window.prompt('New server name');
    if(name?.trim())live.send({type:'v2Create',name:name.trim(),description:'A Celestial community',icon:'✦'});
  };
  const makeChannel=()=>{
    const name=window.prompt('Channel name');
    if(name?.trim()&&server)live.send({type:'v2AddChannel',serverId:server.id,name:name.trim(),category:'COMMUNITY'});
  };
  const memberFor=message=>{
    const id=dmUser?message.from:message.userId;
    const name=dmUser?message.author:message.by||message.username;
    return memberIds.get(id)||memberNames.get(String(name||'').toLowerCase())||
      (id===user?.id?{id:user?.id,platformRole:user?.role}:null);
  };

  const sidebar=<>
    <div className="messenger-server-heading">
      <SelectServer servers={live.servers} server={server} onSelect={selectServer}/>
      <span className="messenger-server-members">{roster.length} members</span>
    </div>
    <div className="messenger-channel-heading">
      <span>TEXT CHANNELS</span>
      {server?.canManage&&<button title="Create channel" aria-label="Create channel" onClick={makeChannel}>+</button>}
    </div>
    <div className="messenger-channel-list">
      {channels.map(channel=><button key={channel.id}
        className={'messenger-channel '+(!dmUser&&channel.id===activeChannel?.id?'selected':'')}
        onClick={()=>selectChannel(channel.id)}>
        <span className="messenger-hash">#</span>
        <span>{channel.name}</span>{channel.readOnly&&<small>◆</small>}
      </button>)}
    </div>
    <div className="messenger-channel-heading dm-heading"><span>DIRECT MESSAGES</span></div>
    <div className="messenger-dm-list">
      {threads.map(thread=><button key={thread.user.id}
        className={'messenger-dm '+(dmUser?.id===thread.user.id?'selected':'')}
        onClick={()=>selectDM(thread.user)}>
        <Avatar name={thread.user.username} person={thread.user} small/>
        <span><strong>{thread.user.username}</strong>
          <small>{thread.last?.text?.slice(0,35)||'Direct message'}</small></span>
      </button>)}
      {threads.length===0&&<small className="messenger-muted-note">Start a conversation from Members.</small>}
    </div>
    {server&&!isMember&&<button className="messenger-join" onClick={()=>
      live.send({type:'v2Join',serverId:server.id})}>Join {server.name}</button>}
    <div className="messenger-current-user">
      <Avatar name={user.username} person={user} small/>
      <div><strong>{user.username}</strong><small>{live.connected?'Connected':'Reconnecting…'}</small></div>
      <span className={live.connected?'messenger-presence on':'messenger-presence'} />
    </div>
  </>;

  return <section className={'celestial-messenger '+(compact?'compact':'full')}
    aria-label={compact?'Chat while browsing':'Celestial Chat'}>
    {!compact&&<nav className="messenger-server-rail" aria-label="Servers">
      <span className="messenger-rail-star" aria-label="Celestial">✦</span>
      <div className="messenger-rail-divider"/>
      {live.servers.map(item=><button key={item.id}
        title={item.name} aria-label={item.name} aria-current={server?.id===item.id?'page':undefined}
        className={'messenger-guild '+(server?.id===item.id?'selected':'')}
        onClick={()=>selectServer(item.id)}>
        {item.permanent?'✦':String(item.name||'?')[0].toUpperCase()}
      </button>)}
      <button className="messenger-guild add" title="Create server"
        aria-label="Create server" onClick={makeServer}>+</button>
    </nav>}
    {!compact&&<aside className={'messenger-sidebar '+(channelsOpen?'mobile-open':'')}
      aria-label="Channels and direct messages">{sidebar}</aside>}
    <div className="messenger-main">
      <header className="messenger-toolbar">
        {!compact&&<button className="messenger-mobile-menu"
          onClick={()=>setChannelsOpen(open=>!open)}
          aria-expanded={channelsOpen} aria-label="Open channel list">☰</button>}
        <div className="messenger-toolbar-title">
          <span className="messenger-channel-sign">{dmUser?'@':'#'}</span>
          <strong>{dmUser?dmUser.username:activeChannel?.name||'Chat'}</strong>
          {!compact&&<small>{dmUser?'Direct message':activeChannel?.category||'Community'}</small>}
        </div>
        <span className={'messenger-connection '+(live.connected?'connected':'')}>
          <i/>{live.connected?'Live':'Reconnecting'}
        </span>
        {!compact&&<button className={'messenger-icon-action '+(searchOpen?'selected':'')}
          onClick={()=>{setSearchOpen(open=>!open);setMessageSearch('');}}
          aria-label="Search messages" title="Search messages">⌕</button>}
        <button className={'messenger-members-button '+(membersOpen?'selected':'')}
          onClick={()=>setMembersOpen(open=>!open)} aria-expanded={membersOpen}
          title="Show members"><span>Members</span><b>{roster.length}</b></button>
        {compact&&<>
          <button className="messenger-icon-action" onClick={onOpenChat}
            title="Open full chat" aria-label="Open full Chat">↗</button>
          <button className="messenger-icon-action" onClick={onClose}
            title="Close chat panel" aria-label="Close Chat">×</button>
        </>}
      </header>
      {compact&&<div className="messenger-compact-navigation">
        <SelectServer servers={live.servers} server={server} onSelect={selectServer}/>
        <div className="messenger-compact-channels">
          {channels.map(channel=><button key={channel.id}
            className={!dmUser&&channel.id===activeChannel?.id?'selected':''}
            onClick={()=>selectChannel(channel.id)}># {channel.name}</button>)}
        </div>
      </div>}
      {searchOpen&&!compact&&<div className="messenger-search">
        <input autoFocus aria-label="Search this conversation" value={messageSearch}
          placeholder="Search messages in this conversation"
          onChange={event=>setMessageSearch(event.target.value)}/>
        <button onClick={()=>{setMessageSearch('');setSearchOpen(false);}} aria-label="Close search">×</button>
      </div>}
      {dmUser&&<div className="messenger-private-context">
        Private conversation with @{dmUser.username}
        <button onClick={()=>{setDmUser(null);setError('');}}>Back to channels</button>
      </div>}
      <div className="messenger-message-list" ref={feed} role="log" aria-live="polite">
        {(!live.connected&&!dmUser&&!messages.length)&&<p className="messenger-state">Connecting to your channels…</p>}
        {visibleMessages.length===0&&
          <div className="messenger-empty">
            <span>{dmUser?'@':'#'}</span>
            <strong>{messageSearch?'No matching messages.':
              dmUser?'This conversation is just getting started.':
              'Welcome to #'+(activeChannel?.name||'general')}</strong>
            <p>{messageSearch?'Try another search.':'Send a message to start the conversation.'}</p>
          </div>}
        {visibleMessages.map(message=>{
          const person=memberFor(message);
          const id=dmUser?message.from:message.userId;
          const own=id===user?.id;
          const name=dmUser?(message.author|| (own?user.username:dmUser.username)):
            message.by||message.username||'Member';
          const content=dmUser?message.text:message.message;
          return <article className={'messenger-message '+(own?'mine':'')} key={message.id}>
            <Avatar name={name} person={person}/>
            <div className="messenger-message-content">
              <div className="messenger-message-meta">
                <strong>{name}</strong><RoleBadge member={person} server={server}/>
                <time dateTime={new Date(dmUser?message.createdAt:message.at).toISOString?.()}>
                  {clock(dmUser?message.createdAt:message.at)}</time>
                {message.editedAt&&<small>edited</small>}
              </div>
              {message.replyTo&&!dmUser&&<small className="messenger-reply-context">↳ Replying in thread</small>}
              {editing===message.id&&!dmUser?
                <form className="messenger-edit" onSubmit={event=>{event.preventDefault();saveEdit(message);}}>
                  <input value={editText} maxLength={1500} autoFocus
                    onChange={event=>setEditText(event.target.value)}/>
                  <div><button type="button" onClick={()=>setEditing(null)}>Cancel</button>
                    <button type="submit">Save changes</button></div>
                </form>:
                <p className="messenger-message-text">{content}</p>}
              {!dmUser&&Object.entries(message.reactions||{}).length>0&&
                <div className="messenger-reactions">
                  {Object.entries(message.reactions||{}).map(([emoji,voters])=>
                    <button key={emoji} onClick={()=>sendAction('v2React',message,{emoji})}>
                      {emoji}<span>{voters?.length||0}</span>
                    </button>)}
                </div>}
            </div>
            {!compact&&!dmUser&&editing!==message.id&&
              <div className="messenger-message-actions" aria-label="Message actions">
                <button title="Reply" onClick={()=>setReply(message)}>↩</button>
                {REACTIONS.map(emoji=><button key={emoji} title={'React '+emoji}
                  onClick={()=>sendAction('v2React',message,{emoji})}>{emoji}</button>)}
                {own&&<><button title="Edit" onClick={()=>{setEditing(message.id);setEditText(content||'');}}>✎</button>
                  <button title="Delete" onClick={()=>deleteMessage(message)}>×</button></>}
              </div>}
          </article>;
        })}
      </div>
      {reply&&!dmUser&&<div className="messenger-reply-bar">
        <span>Replying to <strong>{reply.by}</strong> · {String(reply.message||'').slice(0,65)}</span>
        <button title="Cancel reply" onClick={()=>setReply(null)}>×</button>
      </div>}
      {error&&<p className="messenger-error" role="alert">{error}
        <button aria-label="Dismiss error" onClick={()=>setError('')}>×</button></p>}
      <form className="messenger-composer" onSubmit={send}>
        <span aria-hidden="true">✦</span>
        <input value={draft} onChange={event=>setDraft(event.target.value)}
          aria-label={dmUser?'Direct message':'Message channel'}
          autoComplete="off" maxLength={dmUser?1000:1500}
          placeholder={dmUser?'Message @'+dmUser.username:'Message #'+(activeChannel?.name||'general')}
          disabled={!dmUser&&(!isMember||activeChannel?.readOnly)}/>
        <button type="submit" aria-label="Send message" disabled={!draft.trim()||
          (!dmUser&&(!isMember||!live.connected||activeChannel?.readOnly))}>↑</button>
      </form>
      {!compact&&<div className="messenger-compose-hint">Enter to send · Keep the conversation going.</div>}
    </div>
    <aside className={'messenger-members '+(membersOpen?'open':'')}
      aria-label="All community members">
      <header>
        <span>MEMBERS <b>{roster.length}</b></span>
        <button aria-label="Close members" onClick={()=>setMembersOpen(false)}>×</button>
      </header>
      <label className="messenger-member-search">
        <span>⌕</span><input aria-label="Find member" placeholder="Find someone…"
          value={memberSearch} onChange={event=>setMemberSearch(event.target.value)}/>
      </label>
      {['online','offline'].map(group=>{
        const people=filteredRoster.filter(person=>onlineIds.has(person.id)===(group==='online'));
        if(!people.length)return null;
        return <div className="messenger-member-group" key={group}>
          <h3>{group==='online'?'ONLINE':'OFFLINE'} — {people.length}</h3>
          {people.map(person=>{
            const name=person.name||person.username||'Member';
            return <button className="messenger-member" key={person.id}
              disabled={person.id===user?.id}
              onClick={()=>selectDM(person)} title={person.id===user?.id?'Your account':'Message '+name}>
              <span className="messenger-member-avatar-wrap"><Avatar name={name} person={person} small/>
                <i className={group==='online'?'on':''}/></span>
              <span className="messenger-member-identity"><strong>{name}</strong>
                <RoleBadge member={person} server={server}/></span>
            </button>;
          })}
        </div>;
      })}
      {!filteredRoster.length&&<p className="messenger-muted-note">No matching members.</p>}
    </aside>
  </section>;
}
