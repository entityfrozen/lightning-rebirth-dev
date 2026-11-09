import React,{useEffect,useRef,useState} from 'react';
import {api,readLocal,saveLocal} from './constants.js';
import {Icon} from './icons.jsx';

const examples=[
  ['BUILD','Help me design a creative game mechanic.'],
  ['LEARN','Explain a complicated concept in plain English.'],
  ['CODE','Review my JavaScript approach and suggest improvements.'],
  ['CREATE','Brainstorm a unique project I can build this weekend.']
];
const makeChat=()=>({id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),title:'New conversation',messages:[],created:Date.now()});
function contentFor(message){return typeof message.content==='string'?message.content:'';}
export function AI({user,onAuth}){
  const storage='ai-conversations-'+(user?.id||'guest');
  const [status,setStatus]=useState({configured:false,provider:null});
  const [chats,setChats]=useState(()=>readLocal(storage,[makeChat()]));
  const [active,setActive]=useState(null);
  const [draft,setDraft]=useState('');
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const bottom=useRef(null);
  const activeChat=chats.find(c=>c.id===active)||chats[0];
  useEffect(()=>{api('/api/ai/status').then(setStatus).catch(()=>{});},[]);
  useEffect(()=>{
    const existing=readLocal(storage,null);
    setChats(Array.isArray(existing)&&existing.length?existing:[makeChat()]);
    setActive(null);
  },[storage]);
  useEffect(()=>{saveLocal(storage,chats);},[storage,chats]);
  useEffect(()=>bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),[activeChat?.messages?.length,sending]);
  const fresh=()=>{
    const chat=makeChat();
    setChats(all=>[chat,...all].slice(0,35));
    setActive(chat.id);setDraft('');setError('');
  };
  const remove=id=>{
    const others=chats.filter(c=>c.id!==id);
    if(!others.length){const chat=makeChat();setChats([chat]);setActive(chat.id);}
    else{setChats(others);if(activeChat.id===id)setActive(others[0].id);}
  };
  const rename=id=>{
    const old=chats.find(c=>c.id===id);
    const title=prompt('Conversation name',old?.title||'');
    if(title?.trim())setChats(all=>all.map(c=>c.id===id?{...c,title:title.trim().slice(0,55)}:c));
  };
  const send=async(event,example)=>{
    event?.preventDefault();
    const text=(example||draft).trim();
    if(!text||sending)return;
    if(!user){onAuth('login');return;}
    if(!status.configured){setError('Connect an NVIDIA or OpenAI API key on the server to enable AI.');return;}
    const target=activeChat;
    const messages=[...target.messages,{role:'user',content:text}];
    setChats(all=>all.map(c=>c.id===target.id?{...c,title:c.messages.length===0?text.slice(0,49):c.title,messages}:c));
    setDraft('');setError('');setSending(true);
    try{
      const result=await api('/api/ai',{method:'POST',body:JSON.stringify({messages:messages.slice(-14).map(m=>({role:m.role,content:m.content}))})});
      setChats(all=>all.map(c=>c.id===target.id?{...c,messages:[...messages,{role:'assistant',content:result.text||'No text returned.'}]}:c));
    }catch(e){setError(e.message);}
    finally{setSending(false);}
  };
  return <section className="screen ai-screen">
    <header className="screen-head"><div><span className="eyebrow">CELESTIAL / INTELLIGENCE</span><h1>Think <em>beyond.</em></h1><p>Ask, create, build and figure things out.</p></div>
      <span className={'head-side '+(status.configured?'online':'offline')}><i className="online-dot"/>{status.configured?(status.provider||'AI')+' CONNECTED':'MODEL NOT CONNECTED'}</span></header>
    <div className="ai-layout">
      <aside className="ai-side glass"><span className="micro">YOUR CONVERSATIONS</span>
        <button className="secondary-btn full" onClick={fresh}>＋ New conversation</button>
        <div className="ai-side-separator"/>
        <div className="forest-ai-chat-list">{chats.map(c=><div className={'forest-ai-chat '+(c.id===activeChat.id?'active':'')} key={c.id}>
          <button onClick={()=>{setActive(c.id);setError('')}} title={c.title}><span>✧</span>{c.title}</button>
          <button onClick={()=>rename(c.id)} aria-label="Rename chat">✎</button>
          <button onClick={()=>remove(c.id)} aria-label="Delete chat">×</button>
        </div>)}</div>
        <div className="ai-side-foot"><span>✧</span><strong>Built for your ideas.</strong><p>Conversations are saved in this browser. Model requests run through your server—not the frontend.</p></div>
      </aside>
      <div className="ai-panel glass">
        <div className="ai-panel-top"><strong><span>✧</span> Celestial Intelligence</strong><span>{status.configured?'READY / '+(status.provider||'PROVIDER'):'AWAITING PROVIDER'}</span></div>
        <div className="ai-message-list">
          {activeChat.messages.length===0?<div className="ai-welcome">
            <div className="ai-core">✦<div className="ai-orbit"/></div>
            <span className="micro">AN OPEN SPACE FOR YOUR MIND</span>
            <h2>What's on your <em>mind?</em></h2>
            <p>Start with a question or use a prompt to get things moving.</p>
            <div className="forest-ai-starters">{examples.map(([kind,prompt])=><button key={kind} onClick={()=>send(null,prompt)}><small>{kind}</small><span>{prompt}</span><b>↗</b></button>)}</div>
            {!status.configured&&<div className="provider-warning"><span>◈</span> Add <code>NVIDIA_API_KEY</code> or <code>OPENAI_API_KEY</code> to your server environment. Until then, no fake answers.</div>}
          </div>:activeChat.messages.map((m,i)=><article className={'ai-message '+m.role} key={i}>{m.role==='assistant'&&<span className="ai-message-star">✧</span>}<div>{contentFor(m)}</div></article>)}
          {sending&&<div className="ai-thinking"><span>✧</span> Generating response···</div>}
          <div ref={bottom}/>
        </div>
        <form className="ai-composer" onSubmit={send}><textarea value={draft} onChange={e=>setDraft(e.target.value)}
          placeholder={status.configured?'Ask Celestial something…':'Configure an AI provider on the server to chat'} aria-label="Message AI" rows={2}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}}/>
          <button className="primary-btn" disabled={sending||!draft.trim()||!status.configured} type="submit" aria-label="Send"><Icon name="send" size={17}/></button></form>
        {error&&<div className="ai-error" role="alert">{error}</div>}
        <p className="ai-disclaimer">AI may make mistakes. Check important details.</p>
      </div>
    </div>
  </section>;
}
