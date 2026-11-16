// Celestial V3 is isolated from the previous Boba runtime.
// The existing authenticated APIs and feature modules remain compatible.
import '../public/boba/original.css';
import '../public/boba/native.css';
import '../public/boba/v3/style.css';
import {bootV3} from '../public/boba/v3/app.js';

bootV3().catch(error=>{
 console.error('Celestial V3 could not start:',error);
 const root=document.getElementById('root')||document.body;
 const notice=document.createElement('main');
 notice.className='v3-start-error';
 notice.style.cssText='min-height:100vh;display:grid;place-items:center;background:#090e17;color:#e1f2e9;font:15px system-ui;padding:32px;text-align:center';
 const message=document.createElement('p');
 message.textContent='Celestial could not open. '+(error?.message||'Please reload the page.');
 notice.append(message);root.replaceChildren(notice);
});
