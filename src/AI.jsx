import React, {useEffect, useRef, useState} from 'react';
import {api, readLocal, saveLocal} from './constants.js';
import {Icon} from './icons.jsx';

const starters = [
  ['CREATE', 'Help me come up with something original.'],
  ['LEARN', 'Explain a difficult topic simply.'],
  ['CODE', 'Help me solve a coding problem.'],
  ['IDEAS', 'Give me inspiration for my next project.']
];

const newConversation = () => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  title: 'New conversation',
  messages: [],
  created: Date.now()
});

function savedConversations(key) {
  const saved = readLocal(key, null);
  return Array.isArray(saved) && saved.length ? saved : [newConversation()];
}

function Message({message}) {
  return <article className={'ai-message ' + message.role}>
    {message.role === 'assistant' && <span className="ai-message-star">✧</span>}
    <div>{typeof message.content === 'string' ? message.content : ''}</div>
  </article>;
}

export function AI({user, onAuth, sidebar = false}) {
  const storage = 'ai-conversations-' + (user?.id || 'guest');
  const [chats, setChats] = useState(() => savedConversations(storage));
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottom = useRef(null);
  const activeChat = chats.find(chat => chat.id === active) || chats[0];
  const messages = activeChat?.messages || [];

  useEffect(() => saveLocal(storage, chats), [storage, chats]);
  useEffect(() => {
    bottom.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [messages.length, sending, sidebar]);

  function fresh() {
    const chat = newConversation();
    setChats(previous => [chat, ...previous].slice(0, 35));
    setActive(chat.id);
    setDraft('');
    setError('');
  }

  function remove(id) {
    const remaining = chats.filter(chat => chat.id !== id);
    if (!remaining.length) {
      const chat = newConversation();
      setChats([chat]);
      setActive(chat.id);
      return;
    }
    setChats(remaining);
    if (activeChat.id === id) setActive(remaining[0].id);
  }

  function rename(id) {
    const previous = chats.find(chat => chat.id === id);
    const title = prompt('Rename conversation', previous?.title || '');
    if (title?.trim()) {
      setChats(all => all.map(chat =>
        chat.id === id ? {...chat, title: title.trim().slice(0, 55)} : chat
      ));
    }
  }

  async function send(event, suggestion) {
    event?.preventDefault();
    const text = (suggestion || draft).trim();
    if (!text || sending) return;
    if (!user) {
      onAuth('login');
      return;
    }

    const conversationId = activeChat.id;
    const updated = [...messages, {role: 'user', content: text}];
    setChats(all => all.map(chat => chat.id === conversationId ? {
      ...chat,
      title: chat.messages.length ? chat.title : text.slice(0, 49),
      messages: updated
    } : chat));
    setDraft('');
    setError('');
    setSending(true);

    try {
      const response = await api('/api/ai', {
        method: 'POST',
        body: JSON.stringify({messages: updated.slice(-14)})
      });
      setChats(all => all.map(chat => chat.id === conversationId ? {
        ...chat,
        messages: [...updated, {role: 'assistant', content: response.text || ''}]
      } : chat));
    } catch (failure) {
      setError(failure.message?.includes('Too many') ?
        'Slow down a little and try again soon.' :
        'Celestial could not respond right now. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return <div className="celestial-ai-locked">
      <span>✧</span>
      <h2>Welcome to Celestial.</h2>
      <p>Sign in to start a conversation.</p>
      <button onClick={() => onAuth('login')}>Sign in</button>
    </div>;
  }

  if (sidebar) {
    return <section className="celestial-ai-sidebar" aria-label="Celestial AI">
      <header className="celestial-ai-sidebar-header">
        <span className="celestial-ai-sidebar-symbol" aria-hidden="true">✧</span>
        <div className="celestial-ai-sidebar-heading">
          <strong>Celestial AI</strong>
          <small>Your space to think and create</small>
        </div>
        <button type="button" className={'celestial-ai-sidebar-icon ' + (historyOpen ? 'active' : '')}
          aria-label={historyOpen ? 'Close conversations' : 'Show conversations'}
          title="Conversations" aria-expanded={historyOpen}
          onClick={() => setHistoryOpen(value => !value)}>☷</button>
        <button type="button" className="celestial-ai-sidebar-icon"
          aria-label="New conversation" title="New conversation"
          onClick={() => {fresh(); setHistoryOpen(false);}}>＋</button>
      </header>
      {historyOpen && <nav className="celestial-ai-sidebar-history" aria-label="Your conversations">
        <div className="celestial-ai-history-title">CONVERSATIONS</div>
        <div className="celestial-ai-history-list">
          {chats.map(chat => <div key={chat.id}
            className={'celestial-ai-history-row ' + (activeChat.id === chat.id ? 'active' : '')}>
            <button type="button" className="celestial-ai-history-open"
              title={chat.title} onClick={() => {
                setActive(chat.id);
                setHistoryOpen(false);
                setError('');
              }}>{chat.title}</button>
            <button type="button" aria-label={'Rename ' + chat.title}
              title="Rename" onClick={() => rename(chat.id)}>✎</button>
            <button type="button" aria-label={'Delete ' + chat.title}
              title="Delete" onClick={() => remove(chat.id)}>×</button>
          </div>)}
        </div>
      </nav>}
      <div className="celestial-ai-sidebar-feed" role="log" aria-live="polite">
        {!messages.length && <div className="celestial-ai-sidebar-welcome">
          <div className="celestial-ai-welcome-star" aria-hidden="true">✦</div>
          <h2>What can we make <em>today?</em></h2>
          <p>Anything on your mind, start here.</p>
          <div className="celestial-ai-sidebar-prompts">
            {starters.slice(0, 3).map(([kind, suggestion]) =>
              <button key={kind} type="button" onClick={() => send(null, suggestion)}>
                <span>{suggestion}</span><b>↗</b>
              </button>
            )}
          </div>
        </div>}
        {messages.map((message, index) => <Message key={index} message={message}/>)}
        {sending && <div className="celestial-ai-sidebar-thinking">✧ Thinking…</div>}
        <div ref={bottom}/>
      </div>
      {error && <p className="celestial-ai-sidebar-error" role="alert">{error}</p>}
      <form className="celestial-ai-sidebar-composer" onSubmit={send}>
        <textarea rows={2} maxLength={2500} value={draft}
          aria-label="Message Celestial" placeholder="Ask Celestial anything…"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send(event);
            }
          }}/>
        <button type="submit" aria-label="Send message"
          disabled={sending || !draft.trim()}><Icon name="send" size={18}/></button>
      </form>
    </section>;
  }

  return <section className="screen ai-screen">
    <header className="screen-head">
      <div>
        <span className="eyebrow">CELESTIAL</span>
        <h1>Think <em>beyond.</em></h1>
        <p>Ask, create, build and figure things out.</p>
      </div>
    </header>
    <div className="ai-layout">
      <aside className="ai-side glass">
        <span className="micro">CONVERSATIONS</span>
        <button className="secondary-btn full" onClick={fresh}>＋ New conversation</button>
        <div className="ai-side-separator"/>
        <div className="forest-ai-chat-list">
          {chats.map(chat => <div className={'forest-ai-chat ' + (chat.id === activeChat.id ? 'active' : '')}
            key={chat.id}>
            <button onClick={() => {setActive(chat.id); setError('');}} title={chat.title}>
              <span>✧</span>{chat.title}
            </button>
            <button onClick={() => rename(chat.id)} aria-label="Rename conversation">✎</button>
            <button onClick={() => remove(chat.id)} aria-label="Delete conversation">×</button>
          </div>)}
        </div>
        <div className="ai-side-foot">
          <span>✧</span>
          <strong>A place for your ideas.</strong>
          <p>Every good idea starts somewhere.</p>
        </div>
      </aside>
      <section className="ai-panel glass">
        <div className="ai-panel-top"><strong><span>✧</span> Celestial</strong></div>
        <div className="ai-message-list">
          {!messages.length ? <div className="ai-welcome">
            <div className="ai-core">✦<div className="ai-orbit"/></div>
            <span className="micro">LET'S MAKE SOMETHING</span>
            <h2>What's on your <em>mind?</em></h2>
            <p>Start with a question or pick a prompt.</p>
            <div className="forest-ai-starters">
              {starters.map(([kind, suggestion]) => <button key={kind} onClick={() => send(null, suggestion)}>
                <small>{kind}</small><span>{suggestion}</span><b>↗</b>
              </button>)}
            </div>
          </div> : messages.map((message, index) => <Message key={index} message={message}/>)}
          {sending && <div className="ai-thinking"><span>✧</span> Thinking…</div>}
          <div ref={bottom}/>
        </div>
        <form className="ai-composer" onSubmit={send}>
          <textarea value={draft} onChange={event => setDraft(event.target.value)}
            aria-label="Message Celestial" placeholder="Ask Celestial anything…" rows={2}
            maxLength={2500} onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}/>
          <button className="primary-btn" type="submit" disabled={sending || !draft.trim()}
            aria-label="Send message"><Icon name="send" size={17}/></button>
        </form>
        {error && <div className="ai-error" role="alert">{error}</div>}
        <p className="ai-disclaimer">Celestial can make mistakes. Check important details.</p>
      </section>
    </div>
  </section>;
}
