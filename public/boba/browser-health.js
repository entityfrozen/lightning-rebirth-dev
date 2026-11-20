// Browser health is measured by a page render, never by a controller handshake.
export function installBrowserHealth(root,api){
  const find=selector=>root.querySelector(selector);
  const button=find('[data-browser-test]');
  const output=find('[data-browser-log]');
  const copy=find('[data-browser-copy]');
  let report={stage:'idle',result:'Not tested'};
  const paint=()=>{output.textContent=JSON.stringify(report,null,2)};
  const encode=value=>{
    let raw='';
    for(const byte of new TextEncoder().encode(value))raw+=String.fromCharCode(byte);
    return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  button.onclick=async()=>{
    button.disabled=true;button.textContent='Testing page…';
    const begin=performance.now();
    report={stage:'connecting',result:'Testing'};paint();
    let frame=null;
    try{
      const grant=await api('/api/browser/token');
      if(!grant.token)throw Error('Browser session unavailable');
      frame=document.createElement('iframe');
      frame.title='Connection test';
      frame.setAttribute('sandbox','allow-scripts allow-forms');
      frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:absolute;left:-10000px;top:0;width:10px;height:10px;opacity:0';
      root.append(frame);
      const loaded=new Promise((resolve,reject)=>{
        let timer;
        const finish=error=>{
          clearTimeout(timer);
          window.removeEventListener('message',listener);
          error?reject(error):resolve();
        };
        const listener=event=>{
          if(event.source!==frame.contentWindow||event.data?.type!=='celestial:browse')return;
          if(event.data.state==='error')finish(Error('The remote page failed'));
          else if(event.data.state==='ready'){
            event.data.title==='Example Domain'
              ?finish():finish(Error('The wrong page was returned'));
          }
        };
        window.addEventListener('message',listener);
        timer=setTimeout(()=>finish(Error('No rendered page after 25 seconds')),25000);
      });
      frame.src='/browse/u/'+encode('https://example.com/')+'?key='+encodeURIComponent(grant.token);
      await loaded;
      report={stage:'page-rendered',result:'Passed',durationMs:Math.round(performance.now()-begin)};
      button.textContent='Page loaded';
    }catch(error){
      report={stage:'page-failed',result:'Failed',reason:String(error?.message||'Connection unavailable').slice(0,120)};
      button.textContent='Page test failed';
    }finally{
      frame?.remove();
      button.disabled=false;paint();
    }
  };
  copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(JSON.stringify(report,null,2));copy.textContent='Copied'}
    catch{paint()}
  };
  find('[data-browser-clear]').onclick=()=>{
    report={stage:'idle',result:'Not tested'};
    button.textContent='Test page';
    copy.textContent='Copy report';
    paint();
  };
  paint();
}
