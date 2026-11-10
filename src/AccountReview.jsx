import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {api} from './constants.js';

const initials=name=>String(name||'?').slice(0,2).toUpperCase();
const dateLabel=stamp=>{
  if(!stamp)return 'Date unavailable';
  const date=new Date(stamp);
  return Number.isNaN(date.getTime())?'Date unavailable':
    date.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric'});
};
/**
 * An actual review queue, not an imitation admin console. All decisions are
 * made by the existing role-checked server routes. We never expose passwords,
 * tokens, or account records beyond the approved API response.
 */
export function AccountReview(){
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [lastRefresh,setLastRefresh]=useState(null);

  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await api('/api/admin/accounts/pending');
      setAccounts(response.accounts||[]);
      setLastRefresh(Date.now());
      setError('');
    }catch(e){setError(e.message||'Unable to load account requests.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  const matches=useMemo(()=>accounts.filter(account=>account.username.toLowerCase()
    .includes(query.trim().toLowerCase())),[accounts,query]);
  const pending=selected?accounts.find(a=>a.id===selected.id):null;

  const decide=async(account,decision)=>{
    if(busy)return;
    setBusy(account.id);
    setError('');setNotice('');
    try{
      await api('/api/admin/accounts/'+encodeURIComponent(account.id)+'/'+decision,{
        method:'POST',body:'{}'
      });
      setNotice(account.username+(decision==='approve'?' was approved.':' was declined.'));
      setSelected(null);
      await refresh();
    }catch(e){setError(e.message||'This account could not be reviewed.');}
    finally{setBusy('');}
  };

  return <section className="celestial-admin-console" aria-label="Account administration">
    <div className="celestial-admin-overview">
      <div className="celestial-admin-overview-copy">
        <span className="celestial-admin-eyebrow">ACCOUNT ACCESS / REVIEW</span>
        <h2>Keep the doors in good hands.</h2>
        <p>Every new account stays on hold until you approve it. Decisions are saved to the existing Celestial database.</p>
      </div>
      <div className="celestial-admin-stat"><span>AWAITING REVIEW</span>
        <strong>{loading?'—':accounts.length}</strong><small>Pending requests</small>
      </div>
    </div>
    <div className="celestial-admin-toolbar">
      <label className="celestial-admin-search"><span aria-hidden="true">⌕</span>
        <input value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Search requests" aria-label="Search account requests"/></label>
      <span className="celestial-admin-refresh-date">{lastRefresh?
        'Updated '+new Date(lastRefresh).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Waiting for server'}</span>
      <button className="celestial-admin-refresh" type="button" onClick={refresh}
        disabled={loading||!!busy}>↻ Refresh</button>
    </div>
    <div className="celestial-admin-list">
      <div className="celestial-admin-table-head"><span>ACCOUNT</span><span>REQUESTED</span><span>STATUS</span><span>ACTION</span></div>
      {loading&&<div className="celestial-admin-empty"><span>◌</span><strong>Checking account requests…</strong></div>}
      {!loading&&matches.length===0&&<div className="celestial-admin-empty">
        <span>✧</span><strong>{query?'No matching accounts':'All caught up'}</strong>
        <p>{query?'Try another username.':'There are no accounts waiting for your approval.'}</p>
      </div>}
      {!loading&&matches.map(account=><div className="celestial-admin-table-row" key={account.id}>
        <div className="celestial-admin-person">
          <span className="celestial-admin-initials">{initials(account.username)}</span>
          <span><strong>{account.username}</strong><small>Account request</small></span>
        </div>
        <time>{dateLabel(account.joinedAt)}</time>
        <span className="celestial-admin-status"><i/> Pending</span>
        <button className="celestial-admin-review-button" disabled={!!busy}
          onClick={()=>setSelected(account)}>Review <span>↗</span></button>
      </div>)}
    </div>
    {error&&<p className="celestial-admin-error" role="alert">{error}</p>}
    {notice&&<p className="celestial-admin-notice" role="status">{notice}</p>}
    <p className="celestial-admin-explainer">Approval unlocks the account's ability to sign in. Declining a request does not affect existing users, conversations or servers.</p>
    {pending&&<div className="celestial-admin-review-overlay" role="presentation" onMouseDown={e=>{
      if(e.target===e.currentTarget&&!busy)setSelected(null);
    }}>
      <section className="celestial-admin-review-dialog" role="dialog" aria-modal="true"
        aria-labelledby="review-heading">
        <button className="celestial-admin-review-close" onClick={()=>setSelected(null)}
          aria-label="Close account review" disabled={!!busy}>×</button>
        <span className="celestial-admin-eyebrow">ACCOUNT REVIEW</span>
        <span className="celestial-admin-dialog-avatar">{initials(pending.username)}</span>
        <h3 id="review-heading">{pending.username}</h3>
        <p>Requested access on {dateLabel(pending.joinedAt)}. Choose how to handle this request.</p>
        <div className="celestial-admin-dialog-actions">
          <button className="decline" disabled={!!busy} onClick={()=>decide(pending,'reject')}>
            {busy?'Saving…':'Decline request'}</button>
          <button className="approve" disabled={!!busy} onClick={()=>decide(pending,'approve')}>
            {busy?'Saving…':'Approve account'} <span>↗</span></button>
        </div>
      </section>
    </div>}
  </section>;
}
