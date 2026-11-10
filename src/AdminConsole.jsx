import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {api} from './constants.js';

const ROLE_LABELS={
  admin:'ADMIN',account_manager:'STAFF',moderator:'MOD',
  owner:'OWNER',user:'MEMBER'
};

function MemberBadge({role}){
  const type=String(role||'user').toLowerCase();
  return <span className={'celestial-console-role '+type}>
    {ROLE_LABELS[type]||type.toUpperCase()}</span>;
}
function Initial({name}){
  const value=(name||'?').trim();
  const index=[...value].reduce((total,char)=>total+char.charCodeAt(0),0)%6;
  return <span className={'celestial-console-avatar shade-'+index}>
    {value.charAt(0).toUpperCase()}</span>;
}

/** A real administration surface, backed by the existing approved-account API. */
export function AdminConsole({user}){
  const [queue,setQueue]=useState([]);
  const [members,setMembers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [tab,setTab]=useState('requests');
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const canReview=['admin','account_manager'].includes(user?.role);
  const refresh=useCallback(async()=>{
    if(!canReview)return;
    try{
      setError('');
      const [pending,directory]=await Promise.all([
        api('/api/admin/accounts/pending'),
        api('/api/community/members')
      ]);
      setQueue(pending.accounts||[]);
      setMembers(directory.members||[]);
    }catch(err){setError(err.message||'Could not load the directory.');}
    finally{setLoading(false);}
  },[canReview]);
  useEffect(()=>{refresh();},[refresh]);

  const staff=useMemo(()=>members.filter(person=>
    ['admin','account_manager','moderator','owner'].includes(person.platformRole)),[members]);
  const matchingQueue=queue.filter(account=>account.username.toLowerCase().includes(query.toLowerCase()));
  const matchingMembers=members.filter(person=>person.username.toLowerCase().includes(query.toLowerCase()));
  const decide=async(account,action)=>{
    if(action==='reject'&&!window.confirm('Decline the account request from '+account.username+'?'))return;
    setBusy(account.id);setError('');setMessage('');
    try{
      await api('/api/admin/accounts/'+encodeURIComponent(account.id)+'/'+action,{
        method:'POST',body:'{}'
      });
      setMessage(account.username+(action==='approve'?' was approved.':' was declined.'));
      await refresh();
    }catch(err){setError(err.message||'The request could not be updated.');}
    finally{setBusy('');}
  };
  if(!canReview)return <div className="celestial-console-denied">You don't have access to account review.</div>;

  return <div className="celestial-console">
    <header className="celestial-console-heading">
      <div>
        <span className="celestial-console-eyebrow"><i/> CELESTIAL / CONTROL ROOM</span>
        <h2>Member management<span>.</span></h2>
        <p>Review requests, check who has access, and keep the community moving.</p>
      </div>
      <button type="button" onClick={refresh} disabled={loading||!!busy}
        className="celestial-console-refresh"><span aria-hidden="true">↻</span> Refresh</button>
    </header>
    <div className="celestial-console-stat-grid">
      <article className="celestial-console-stat pending">
        <div className="celestial-console-stat-top"><span>AWAITING REVIEW</span><i>◷</i></div>
        <strong>{queue.length}</strong><small>{queue.length===1?'Request':'Requests'} in your queue</small>
      </article>
      <article className="celestial-console-stat">
        <div className="celestial-console-stat-top"><span>APPROVED MEMBERS</span><i>✧</i></div>
        <strong>{members.length}</strong><small>Can sign in to Celestial</small>
      </article>
      <article className="celestial-console-stat">
        <div className="celestial-console-stat-top"><span>STAFF ACCOUNTS</span><i>✦</i></div>
        <strong>{staff.length}</strong><small>Members with elevated roles</small>
      </article>
    </div>
    <div className="celestial-console-panel">
      <div className="celestial-console-panel-nav">
        <div role="tablist" aria-label="Admin views">
          <button role="tab" aria-selected={tab==='requests'} className={tab==='requests'?'active':''}
            onClick={()=>{setTab('requests');setQuery('');}}>
            Requests <span>{queue.length}</span>
          </button>
          <button role="tab" aria-selected={tab==='members'} className={tab==='members'?'active':''}
            onClick={()=>{setTab('members');setQuery('');}}>Directory <span>{members.length}</span></button>
        </div>
        <label className="celestial-console-search"><span aria-hidden="true">⌕</span>
          <input value={query} onChange={event=>setQuery(event.target.value)}
            placeholder={tab==='requests'?'Search requests':'Search members'}
            aria-label={tab==='requests'?'Search account requests':'Search approved members'}/>
        </label>
      </div>
      {loading?<div className="celestial-console-state">Loading account records…</div>:
        tab==='requests'?<div className="celestial-console-rows" role="tabpanel">
          <div className="celestial-console-row-label"><span>REQUESTING ACCOUNT</span><span>SUBMITTED</span><span>REVIEW</span></div>
          {matchingQueue.length===0?<div className="celestial-console-empty">
            <span>✓</span><strong>{query?'No matching requests':"You're all caught up."}</strong>
            <p>{query?'Try a different name.':'New accounts will show up here for manual approval.'}</p>
          </div>:matchingQueue.map(account=><article className="celestial-console-request" key={account.id}>
            <div className="celestial-console-request-member"><Initial name={account.username}/>
              <div><strong>{account.username}</strong><small>New account request</small></div></div>
            <time>{account.joinedAt?new Date(account.joinedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Recently'}</time>
            <div className="celestial-console-request-actions">
              <button disabled={!!busy} className="decline" onClick={()=>decide(account,'reject')}>Decline</button>
              <button disabled={!!busy} className="approve" onClick={()=>decide(account,'approve')}>
                {busy===account.id?'Working…':'Approve'} <span>↗</span></button>
            </div>
          </article>)}
        </div>:<div className="celestial-console-rows" role="tabpanel">
          <div className="celestial-console-row-label member"><span>ACCOUNT</span><span>ROLE</span><span>ACCESS</span></div>
          {matchingMembers.length===0?<div className="celestial-console-empty">
            <strong>No members found.</strong><p>Try a different name.</p>
          </div>:matchingMembers.map(member=><article className="celestial-console-member-row" key={member.id}>
            <div className="celestial-console-request-member"><Initial name={member.username}/>
              <div><strong>{member.username}</strong><small>Celestial member</small></div></div>
            <MemberBadge role={member.platformRole}/>
            <span className="celestial-console-approved"><i/> Approved</span>
          </article>)}
        </div>}
    </div>
    {error&&<p role="alert" className="celestial-console-alert">{error}</p>}
    {message&&<p role="status" className="celestial-console-confirmation">{message}</p>}
    <p className="celestial-console-footnote">
      Account approval is manual. This screen doesn't change existing roles or message history.
    </p>
  </div>;
}
