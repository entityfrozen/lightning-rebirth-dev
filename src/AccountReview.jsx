import React,{useCallback,useEffect,useState} from 'react';
import {api} from './constants.js';

/** Only rendered for approved administrators and account managers. */
export function AccountReview() {
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const refresh=useCallback(async()=>{
    try{
      setError('');
      const result=await api('/api/admin/accounts/pending');
      setAccounts(result.accounts||[]);
    }catch(failure){
      setError(failure.message||'Unable to load requests');
    }finally{setLoading(false);}
  },[]);

  useEffect(()=>{refresh();},[refresh]);

  const decide=async(account,decision)=>{
    if(decision==='reject'&&!confirm('Decline the request from '+account.username+'?'))return;
    setBusy(account.id);
    setError('');setNotice('');
    try{
      await api('/api/admin/accounts/'+encodeURIComponent(account.id)+'/'+decision,{
        method:'POST',body:'{}'
      });
      setNotice(account.username+(decision==='approve'?' was approved.':' was declined.'));
      await refresh();
    }catch(failure){setError(failure.message||'Unable to review this account');}
    finally{setBusy('');}
  };

  return <section className="celestial-account-review">
    <header>
      <div><h3>Account requests</h3><p>Only approved accounts can sign in.</p></div>
      <button onClick={refresh} disabled={loading||!!busy} aria-label="Refresh requests">↻</button>
    </header>
    {loading?<p>Loading requests…</p>:
      accounts.length===0?<p>No accounts waiting for approval.</p>:
      <div className="celestial-review-queue">
        {accounts.map(account=><article key={account.id}>
          <div><strong>{account.username}</strong>
            <small>{account.joinedAt?new Date(account.joinedAt).toLocaleDateString():'New request'}</small></div>
          <button disabled={!!busy} onClick={()=>decide(account,'approve')}>Approve</button>
          <button disabled={!!busy} onClick={()=>decide(account,'reject')}>Decline</button>
        </article>)}
      </div>}
    {error&&<p className="celestial-review-error" role="alert">{error}</p>}
    {notice&&<p className="celestial-review-notice" role="status">{notice}</p>}
  </section>;
}
