import React, { useEffect, useRef, useState } from 'react';
import { channels, api } from './constants.js';
import { Icon } from './icons.jsx';

function since(date) {
  try {return new Date(date).toLocaleString(undefined,{hour:'numeric',minute:'2-digit',month:'short',day:'numeric'});}
  catch{return '';}
}
export function Chat({user,onAuth,signal}){
  const [channel,setChannel]=useState('general');
  const [messages,setMessages]=useState([]);
  const [draft,setDraft]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const stream=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    api('/api/messages?channel='+channel).then(data=>{
      if(!cancelled){setMessages(data.messages||[]);setError('');setLoading(false);}
    }).catch(err=>{if(!cancelled){setError(err.message);setLoading(false);}});
    return()=>{cancelled=true;};
  },[channel,signal]);
  useEffect(()=>{
    const node=new EventSource('/api/events');
    node.addEventListener('refresh',event=>{
      try{
        const data=JSON.parse(event.data);
        if(data.kind==='chat'||data.kind==='all') {
          api('/api/messages?channel='+channel).then(result=>setMessages(result.messages||[])).catch(()=>{});
        }
      }catch{}
    });
    return()=>node.close();
  },[channel]);
  useEffect(()=>{if(stream.current)stream.current.scrollTop=stream.current.scrollHeight;},[messages.length,channel]);

  const submit=async event=>{
    event.preventDefault();
    const text=draft.trim();
    if(!text||sending)return;
    if(!user){onAuth('login');return;}
    setSending(true);
    try{
      await api('/api/messages',{method:'POST',body:JSON.stringify({channel,text})});
      setDraft('');
      const data=await api('/api/messages?channel='+channel);
      setMessages(data.messages||[]);setError('');
    }catch(err){setError(err.message);}
    finally{setSending(false);}
  };

  return <div className="screen chat-screen">
    <div className="screen-head">
      <div><span className="eyebrow">THE CELESTIAL NETWORK</span><h1>Community <em>chat.</em></h1><p>Conversations, ideas and people from across the universe.</p></div>
      <span className="head-side"><i className="online-dot"/> REAL-TIME CHANNELS</span>
    </div>
    <section className="community-layout glass">
      <aside className="channel-sidebar">
        <div className="channel-intro"><span className="micro">YOUR SERVER</span><strong><span>✧</span> Celestial Hub</strong></div>
        <span className="micro group-name">TEXT CHANNELS</span>
        {Object.entries(channels).map(([id,meta])=><button key={id} onClick={()=>setChannel(id)} className={'channel-link '+(id===channel?'active':'')}>
          <span>#</span>{meta.name}{id===channel&&<i/>}
        </button>)}
        <div className="channel-footer"><span>✦</span><p>A community for building, playing and exploring together.</p></div>
      </aside>
      <div className="chat-thread">
        <header className="thread-header"><span>#</span><div><strong>{channels[channel].name}</strong><small>{channels[channel].description}</small></div><span className="thread-live">LIVE</span></header>
        <div ref={stream} className="message-feed" role="log" aria-live="polite">
          {loading?<div className="chat-placeholder">Connecting to the community…</div>:error&&messages.length===0?<div className="chat-placeholder">{error}</div>:messages.length===0?
            <div className="chat-empty"><span>✧</span><h3>Start something here.</h3><p>This channel is waiting for its first message.</p></div>:
            messages.map(message=><article key={message.id} className={'chat-message '+(message.author===user?.username?'mine':'')}>
              <div className="message-avatar">{message.author?.[0]?.toUpperCase()||'?'}</div>
              <div className="message-info"><div className="message-meta"><strong>{message.author}</strong><time dateTime={message.createdAt}>{since(message.createdAt)}</time></div><p>{message.text}</p></div>
            </article>)}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          {user?<>
            <input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={600} aria-label="Type a chat message" placeholder={'Message #'+channels[channel].name}/>
            <button className="primary-btn" disabled={sending||!draft.trim()} type="submit" aria-label="Send message"><Icon name="send" size={16}/></button>
          </>:<button type="button" onClick={()=>onAuth('login')} className="auth-prompt">Sign in to join the conversation <Icon name="arrow" size={15}/></button>}
        </form>
        {error&&messages.length>0&&<div className="chat-error" role="alert">{error}</div>}
      </div>
      <aside className="chat-details">
        <span className="micro">TRANSMISSION INFO</span><div className="chat-world-symbol">✧</div>
        <h3>Connected<br/>across the stars.</h3><p>{channels[channel].description}</p>
        <div className="detail-line"><span>Channel</span><b>#{channels[channel].name}</b></div>
        <div className="detail-line"><span>Messages loaded</span><b>{messages.length}</b></div>
        <div className="detail-line"><span>Access</span><b>{user?'Member':'Guest view'}</b></div>
        <div className="chat-community-tip">✦ Messages are shared with other members and stored on this server.</div>
      </aside>
    </section>
  </div>;
}
