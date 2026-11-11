import {$,$$,esc,ico,lic,api} from './common.js';
export function mountApps(root,open,navigate){
 root.innerHTML='<div class="mw"><div class="mw-bar r"><label class="mw-q">'+ico('search')+'<input type="search" placeholder="Search games by title or distributor" aria-label="Search games by title or distributor"></label></div><div class="native-library-filters" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"></div><p class="native-library-status" role="status"></p><div class="native-app-grid mw-wall r"></div><button class="btn s" data-more-games hidden>Show more</button><section class="grp gl g2 native-tool" hidden></section><footer class="native-library-credits"><strong>Game library credits</strong> · Catalogs and artwork courtesy of <a href="https://selenite.cc/" target="_blank" rel="noopener noreferrer">Selenite</a> · <a href="https://wasm.rip/" target="_blank" rel="noopener noreferrer">WASM.rip</a> · <a href="https://gn-math.github.io/" target="_blank" rel="noopener noreferrer">GN-Math</a>. All game names, cover art, and original code belong to their respective creators. Attribution is also shown when launching a game.</footer></div>';
 const apps=[['browser','Browser','web'],['chat','Chat','people'],['ai','Ask','ask'],['notes','Notes','notes'],['calculator','Calculator','bolt'],['focus','Focus timer','clock'],['music','Music','listen'],['2048','2048','play'],['chess','Chess','play'],['rps','Rock Paper Scissors','play'],['mines','Minesweeper','play'],['world','WorldPvP','play'],['uma','Uma Versus','play']];
 const grid=$('.native-app-grid',root),tool=$('.native-tool',root);
 const originals=new Set(['2048','chess','rps','mines','world']);
 const sources=[['Selenite','https://selenite.cc/resources/games.json'],['WASM.rip','https://wasm.rip/games.json'],['GN-Math','https://raw.githubusercontent.com/gn-math/assets/main/zones.json']];
 const safeUrl=(value,base)=>{if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,base);return u.protocol==='https:'?u.href:''}catch{return ''}};
 const key=name=>name.normalize('NFKD').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
 const nativeGameKeys=new Set(['2048','chess','minesweeper','rockpaperscissors','worldpvp','umaversus']);
 const aliases=new Map([['tictactoe','tictactoe'],['ovo','ovo'],['fridaynightfunkin','fridaynightfunkin']]);
 const canonical=name=>{const k=key(name);return aliases.get(k)||k};
 const artFallback=escText=>'<span class="native-game-fallback">'+esc(escText)+'</span>';
 const external=new Map(),byId=new Map();let filter='All',limit=80,failed=[];
 const filters=$('.native-library-filters',root),status=$('.native-library-status',root),more=$('[data-more-games]',root);
 const categories=['All','Celestial Originals','Selenite','WASM.rip','GN-Math','Tools'];
 filters.innerHTML=categories.map(name=>'<button class="btn s" type="button" data-filter="'+esc(name)+'">'+esc(name)+'</button>').join('');
 function paint(){
  const search=$('input',root).value.trim().toLowerCase();
  const searchKey=canonical(search);
  const native=apps.filter(([id,name])=>(filter==='All'||filter==='Celestial Originals'&&originals.has(id)||filter==='Tools'&&!originals.has(id)&&id!=='uma')&&(name.toLowerCase().includes(search)||canonical(name).includes(searchKey)));
  const games=[...external.values()].filter(g=>(filter==='All'||g.sources.some(s=>s.source===filter))&&(g.name.toLowerCase().includes(search)||canonical(g.name).includes(searchKey)||g.sources.some(s=>s.source.toLowerCase().includes(search)))).sort((a,b)=>a.name.localeCompare(b.name));
  const cards=native.map(([id,name,icon])=>'<button class="mw-p sq native-tile" data-app="'+esc(id)+'"><span class="native-app-icon">'+(originals.has(id)||id==='uma'?artFallback(name):ico(icon))+'</span><span class="mw-i"><b>'+esc(name)+'</b></span></button>');
  for(const game of games.slice(0,limit)){const source=game.sources.find(s=>s.source===filter&&s.cover)||game.sources.find(s=>s.cover)||game.sources[0];cards.push('<button class="mw-p sq native-tile native-game-tile" data-external="'+esc(game.id)+'"><span class="native-app-icon" style="overflow:hidden;position:relative"><span style="font-size:13px;text-align:center;padding:6px">'+esc(game.name)+'</span>'+(source.cover?'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" src="'+esc(source.cover)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')+'</span><span class="mw-i"><b>'+esc(game.name)+'</b><small>'+esc(game.sources.map(s=>s.source).join(' · '))+'</small></span></button>')}
  grid.innerHTML=cards.join('')||'<p>No matching games or apps.</p>';
  grid.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
  more.hidden=games.length<=limit;
  status.dataset.visibleCount=String(native.length+Math.min(games.length,limit));
  filters.querySelectorAll('button').forEach(b=>{b.classList.toggle('k',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter))});
 }
 filters.onclick=e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;limit=80;paint()}};
 more.onclick=()=>{limit+=80;paint()};
 $('input',root).addEventListener('input',()=>{limit=80;paint()});paint();
 function ingest(source,rows){
  for(const row of rows){
   if(!row||typeof row.name!=='string'||!row.name.trim()||row.id===-1)continue;
   let cover='',url='',credit='';
   if(source==='Selenite'&&typeof row.directory==='string'){const base='https://selenite.cc/resources/semag/'+encodeURIComponent(row.directory)+'/';cover=safeUrl(row.image||'',base);url=safeUrl('index.html',base);credit=row.author||''}
   if(source==='WASM.rip'){cover=safeUrl(row.imageUrl||'','https://wasm.rip/');url=safeUrl(row.gameUrl||'','https://wasm.rip/');credit=row.porter||''}
   if(source==='GN-Math'){const resolve=v=>String(v||'').replaceAll('{COVER_URL}','https://raw.githubusercontent.com/gn-math/covers/main').replaceAll('{HTML_URL}','https://raw.githack.com/gn-math/html/main');cover=safeUrl(resolve(row.cover),'https://gn-math.github.io/');url=safeUrl(resolve(row.url),'https://gn-math.github.io/');credit=row.author||''}
   if(!url||!key(row.name))continue;
   if(new URL(url).origin===location.origin)continue;
   const id=canonical(row.name);
   if(nativeGameKeys.has(id))continue;
   const game=external.get(id)||{id,name:row.name,sources:[]};
   if(!game.sources.some(s=>s.url===url))game.sources.push({source,cover,url,credit:String(credit)});
   external.set(id,game);byId.set(id,game);
  }
 }
 status.textContent='Loading game catalogs…';
 Promise.allSettled(sources.map(async ([name,url])=>{try{const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Catalog unavailable');const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid catalog');ingest(name,rows)}catch{failed.push(name)}})).then(()=>{status.textContent=external.size.toLocaleString()+' games'+(failed.length?' · Could not load '+failed.join(', '):'');paint()});
 let timer=0;
 function showTool(name){clearInterval(timer);tool.hidden=false;tool.innerHTML='<div class="lr"><h3>'+esc(name)+'</h3><button class="btn s" data-close>Close</button></div><div class="native-tool-body"></div>';$('[data-close]',tool).onclick=()=>{clearInterval(timer);tool.hidden=true;tool.replaceChildren()};return $('.native-tool-body',tool)}
 grid.addEventListener('click',e=>{const game=byId.get(e.target.closest('[data-external]')?.dataset.external);if(game){
  const entry=game.sources.find(s=>s.source===filter)||game.sources[0];
  // Many distributors forbid cross-site iframe embedding; use the existing
  // Celestial browser view instead of leaving users on a blocked frame.
  if(entry?.url)open(entry.url);
  return;
 }const id=e.target.closest('[data-app]')?.dataset.app;if(!id)return;if(['browser','chat','ai'].includes(id))return navigate(id);if(id==='music')return open('https://music.youtube.com');if(id==='notes'){const el=showTool('Notes');el.innerHTML='<textarea aria-label="Notes" placeholder="Write something…"></textarea>';$('textarea',el).value=localStorage.getItem('boba.notes')||'';$('textarea',el).oninput=e=>localStorage.setItem('boba.notes',e.target.value);return}if(id==='calculator'){const el=showTool('Calculator');el.innerHTML='<div class="native-calc"><label class="fld"><input type="number" value="0" aria-label="First number"></label><select aria-label="Operation"><option>+</option><option>−</option><option>×</option><option>÷</option></select><label class="fld"><input type="number" value="0" aria-label="Second number"></label></div><h2 data-result>0</h2>';el.oninput=()=>{const [a,b]=$$('input',el).map(n=>Number(n.value));const op=$('select',el).value;$('[data-result]',el).textContent=String(op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:b?a/b:'Undefined')};return}if(id==='focus'){const el=showTool('Focus timer');let seconds=1500;el.innerHTML='<h1 data-time>25:00</h1><button class="btn k s" data-start>Start</button> <button class="btn s" data-reset>Reset</button>';const paint=()=>{$('[data-time]',el).textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')};$('[data-start]',el).onclick=()=>{if(timer){clearInterval(timer);timer=0;$('[data-start]',el).textContent='Start'}else{timer=setInterval(()=>{seconds=Math.max(0,seconds-1);paint();if(!seconds){clearInterval(timer);timer=0}},1000);$('[data-start]',el).textContent='Pause'}};$('[data-reset]',el).onclick=()=>{clearInterval(timer);timer=0;seconds=1500;paint();$('[data-start]',el).textContent='Start'};return}if(['2048','chess','rps','mines','world','uma'].includes(id)){const el=showTool(apps.find(a=>a[0]===id)[1]);const frame=document.createElement('iframe');frame.title='Celestial game';frame.src='/legacy.html?embedded=1&game='+encodeURIComponent(id)+'#apps';frame.allow='fullscreen';frame.style.cssText='width:100%;height:min(75vh,800px);border:0;border-radius:12px';el.append(frame);return}});
}
const originalAsk = {
  flush: true,
  html: () =>
    '<div class="ai"><aside class="ai-side"><button class="btn k s" type="button" data-new>' + ico("plus") + "New chat</button>" +
    '<label class="ai-find">' + ico("search") + '<input data-find placeholder="Search chats" aria-label="Search chats" autocomplete="off" spellcheck="false"></label>' +
    '<div class="ai-list srl" data-list></div></aside>' +
    '<section class="ai-main"><div class="ai-thread srl" data-thread><div class="ai-in" data-in></div></div>' +
    '<form class="ai-box gl g2" data-form><p class="ai-note" data-note hidden></p><div class="ai-atts" data-atts hidden></div>' +
    '<textarea data-aq rows="1" maxlength="2500" placeholder="Ask anything" aria-label="Ask anything"></textarea>' +
    '<div class="ai-tools"><button class="ai-t" type="button" data-add aria-label="Attach a text file">' + ico("plus") + "</button>" +
    '<button class="ai-t" type="button" data-web aria-pressed="false" disabled>' + ico("web") + "Search</button>" +
    '<label class="ai-t celestial-effort"><span class="tv">' + ico("ask") + '</span><select data-effort aria-label="AI reasoning mode"><option value="instant">Instant</option><option value="smart" selected>Smart</option><option value="ultra">Ultra Smart</option></select></label>' +
    '<span class="sp"></span><button class="cb" type="submit" data-asend aria-label="Send">' + ico("send") + "</button></div>" +
    '<input type="file" data-pick hidden accept=".txt,.md,.csv,.json,.js,.ts,.py,.java,.html,.css,.xml,.yml,.yaml"></form></section></div>',
};
export function mountAsk(root,user){
 root.innerHTML=originalAsk.html();
 let chats=[];try{chats=JSON.parse(localStorage.getItem('boba.ask.'+user.id)||'[]')}catch{}
 let active=null,busy=null,attachment=null,menu=null,web=false;
 const effortSelect=$('[data-effort]',root);
 const savedEffort=localStorage.getItem('celestial.ai.effort');
 if(['instant','smart','ultra'].includes(savedEffort))effortSelect.value=savedEffort;
 effortSelect.onchange=()=>localStorage.setItem('celestial.ai.effort',effortSelect.value);
 const inner=$('[data-in]',root),thread=$('[data-thread]',root),list=$('[data-list]',root),q=$('[data-aq]',root),note=$('[data-note]',root),form=$('[data-form]',root),find=$('[data-find]',root),send=$('[data-asend]',root),atts=$('[data-atts]',root),pick=$('[data-pick]',root);
 const save=()=>localStorage.setItem('boba.ask.'+user.id,JSON.stringify(chats));
 const webButton=$('[data-web]',root);async function checkWeb(){try{webButton.disabled=!(await api('/api/ai/search/status')).configured;if(webButton.disabled){web=false;webButton.classList.remove('on');webButton.setAttribute('aria-pressed','false')}}catch{webButton.disabled=true}}
 webButton.onclick=()=>{web=!web;webButton.classList.toggle('on',web);webButton.setAttribute('aria-pressed',String(web))};checkWeb();root.addEventListener('pointerenter',checkWeb);
 const say=t=>{note.textContent=t||'';note.hidden=!t};
 const grow=()=>{q.style.height='auto';q.style.height=Math.min(q.scrollHeight,200)+'px'};
 const escText=t=>esc(t).replace(/\x60([^\x60\n]+)\x60/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
 function body(text){return String(text||'').split(/\x60\x60\x60(?:[^\n]*\n)?/).map((part,i)=>i%2?'<pre><code>'+esc(part)+'</code></pre>':part.split(/\n\n+/).filter(Boolean).map(p=>'<p>'+escText(p).replace(/\n/g,'<br>')+'</p>').join('')).join('')}
 function closeMenu(){menu?.remove();menu=null}
 function paintList(){closeMenu();const filter=find.value.trim().toLowerCase();const sorted=chats.filter(c=>c.title.toLowerCase().includes(filter)).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.updated||0)-(a.updated||0));const item=c=>'<div class="ai-it'+(c===active?' on':'')+'" data-id="'+esc(c.id)+'" role="button" tabindex="0">'+(c.pinned?ico('pin','i pn'):'')+'<span>'+esc(c.title)+'</span><button class="mo" type="button" data-more aria-label="More">'+ico('dots')+'</button></div>';const pinned=sorted.filter(c=>c.pinned),rest=sorted.filter(c=>!c.pinned);list.innerHTML=filter?(sorted.length?sorted.map(item).join(''):'<p class="ai-none">No chats found</p>'):(pinned.length?'<div class="ai-sec">Pinned</div>'+pinned.map(item).join('')+(rest.length?'<div class="ai-sec">Recent</div>':''):'')+rest.map(item).join('')}
 function paint(){paintList();const messages=active?.messages||[];thread.classList.toggle('empty',!messages.length);const h=new Date().getHours(),greet=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', '+user.username+'.';inner.innerHTML=messages.length?messages.map((m,i)=>m.role==='user'?'<div class="ai-q" data-index="'+i+'"><div class="ai-qr"><button class="ai-ed" data-edit type="button" aria-label="Edit">'+ico('pencil')+'</button><div class="ai-u">'+esc(m.display||m.content)+'</div></div></div>':'<div class="ai-a" data-index="'+i+'"><div class="ai-body">'+body(m.content)+'</div><div class="ai-f"><button data-copy type="button" aria-label="Copy">'+ico('copy')+'</button><button data-regen type="button" aria-label="Regenerate">'+ico('reload')+'</button></div></div>').join(''):'<div class="ai-hi"><h1>'+esc(greet)+'</h1><div class="sugs">'+['Explain photosynthesis simply','Outline an essay on climate','Quiz me on world capitals','Fix this sentence’s grammar'].map(s=>'<button type="button" data-s>'+esc(s)+'</button>').join('')+'</div></div>';if(busy)inner.insertAdjacentHTML('beforeend','<div class="ai-a"><span class="ai-dots"><i></i><i></i><i></i></span></div>');send.innerHTML=ico(busy?'x':'send');send.setAttribute('aria-label',busy?'Stop':'Send');send.classList.toggle('stop',!!busy);thread.scrollTop=thread.scrollHeight}
 async function run(){if(busy||!active)return;const chat=active,ctl=new AbortController();busy=ctl;paint();say('');try{const r=await fetch('/api/ai',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({web,effort:effortSelect.value,messages:chat.messages.slice(-14).map(m=>({role:m.role,content:m.content.slice(0,2500)}))})});const data=await r.json();if(!r.ok)throw Error(data.error||'Couldn’t answer that.');if(!ctl.signal.aborted){chat.messages.push({role:'assistant',content:data.text||'',sources:data.sources||[]});chat.updated=Date.now();save()}}catch(e){if(!ctl.signal.aborted)say(e.message)}finally{busy=null;paint()}}
 function paintAtt(){atts.hidden=!attachment;atts.innerHTML=attachment?'<span class="ai-chip"><span class="fi">'+ico('file')+'</span><span class="nm"><b>'+esc(attachment.name)+'</b></span><button class="x" type="button" data-rm aria-label="Remove">'+ico('x')+'</button></span>':''}
 async function submit(text){text=String(text||'').trim();if(busy||(!text&&!attachment))return;const display=text||'Review this file';const content=attachment?display+'\n\nFile: '+attachment.name+'\n'+attachment.text:display;if(content.length>2500){say('Your message and file must total 2,500 characters or fewer.');return}if(!active){active={id:crypto.randomUUID(),title:display.slice(0,60),messages:[],updated:Date.now()};chats.unshift(active)}active.messages.push({role:'user',content,display:attachment?display+' · '+attachment.name:display});active.updated=Date.now();attachment=null;paintAtt();q.value='';grow();save();await run()}
 $('[data-new]',root).onclick=()=>{if(!busy){active=null;say('');paint();q.focus()}};find.oninput=paintList;q.oninput=grow;q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit(q.value)}};form.onsubmit=e=>{e.preventDefault();busy?busy.abort():submit(q.value)};
 $('[data-add]',root).onclick=()=>pick.click();pick.onchange=async()=>{const f=pick.files[0];pick.value='';if(!f)return;if(f.size>12000){say('Choose a short text file.');return}try{attachment={name:f.name,text:await f.text()};paintAtt();say('')}catch{say('Could not read file.')}};atts.onclick=e=>{if(e.target.closest('[data-rm]')){attachment=null;paintAtt()}};
 function select(it){if(!busy&&it){active=chats.find(c=>c.id===it.dataset.id)||null;say('');paint()}}
 list.onclick=e=>{const it=e.target.closest('[data-id]');if(!it)return;if(!e.target.closest('[data-more]'))return select(it);const chat=chats.find(c=>c.id===it.dataset.id);closeMenu();if(!chat)return;menu=document.createElement('div');menu.className='ai-menu ai-imenu gl g3';menu.innerHTML='<button data-act="rename">'+ico('pencil')+'Rename</button><button data-act="pin">'+ico('pin')+(chat.pinned?'Unpin':'Pin')+'</button><button class="bad" data-act="del">'+ico('trash')+'Delete</button>';const side=$('.ai-side',root),r=it.getBoundingClientRect(),b=side.getBoundingClientRect();menu.style.top=r.bottom-b.top+4+'px';menu.style.left='8px';side.append(menu);menu.onclick=e=>{const act=e.target.closest('[data-act]')?.dataset.act;if(!act)return;if(act==='rename'){const t=prompt('Chat name',chat.title);if(t?.trim())chat.title=t.trim().slice(0,60)}if(act==='pin')chat.pinned=!chat.pinned;if(act==='del'&&!busy&&confirm('Delete this chat?')){chats=chats.filter(c=>c!==chat);if(active===chat)active=null}save();paint()}};
 list.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();select(e.target.closest('[data-id]'))}};document.addEventListener('click',e=>{if(menu&&!e.target.closest('.ai-imenu,[data-more]'))closeMenu()});
 inner.onclick=async e=>{const s=e.target.closest('[data-s]');if(s)return submit(s.textContent);const row=e.target.closest('[data-index]'),i=Number(row?.dataset.index);if(!active||!Number.isInteger(i))return;const m=active.messages[i];if(e.target.closest('[data-copy]')){try{await navigator.clipboard.writeText(m.content);e.target.closest('button').innerHTML=ico('check')}catch{}return}if(busy)return;if(e.target.closest('[data-edit]')){const t=prompt('Edit message',m.display||m.content);if(t?.trim()){active.messages.splice(i);active.messages.push({role:'user',content:t.trim().slice(0,2500)});save();run()}}if(e.target.closest('[data-regen]')){active.messages.splice(i);save();run()}};
 paint();
}
export function mountAccount(root,user){
 root.innerHTML='<div class="acct"><div class="acg"><section class="pass r"><div class="top"><span class="av native-avatar">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div class="nm"><h1>'+esc(user.username)+'</h1><p>'+esc(user.role||'user')+'</p></div><div class="pbs"><button class="pb" data-out>'+ico('signout')+'Sign out</button></div></div><div class="bot">Member since<b>'+esc(user.joinedAt?new Date(user.joinedAt).toLocaleDateString():'—')+'</b></div></section><section class="grp gl g2 r"><h3 class="cardh">Account</h3><div class="lr">'+lic('user','#b98cff','#7a4cf0')+'<h3>Username</h3><span class="val">'+esc(user.username)+'</span></div><div class="lr">'+lic('shield','#5ee08a','#139b48')+'<h3>Role</h3><span class="val">'+esc(user.role||'user')+'</span></div></section><section class="grp gl g2 wide r" data-admin hidden><h3 class="cardh">Account requests</h3><div class="native-requests"></div><div class="lr"><button class="btn s" data-refresh>Refresh</button></div></section></div></div>';
 $('[data-out]',root).onclick=async()=>{await api('/api/logout',{});location.replace('/')};
 async function review(){try{const d=await api('/api/admin/accounts/pending');$('[data-admin]',root).hidden=false;$('.native-requests',root).innerHTML=d.accounts.length?d.accounts.map(a=>'<div class="lr"><h3>'+esc(a.username)+'</h3><button class="btn s" data-review="approve" data-id="'+esc(a.id)+'">Approve</button><button class="btn bad s" data-review="reject" data-id="'+esc(a.id)+'">Reject</button></div>').join(''):'<div class="lr">No pending accounts.</div>'}catch{}}
 root.onclick=async e=>{const b=e.target.closest('[data-review]');if(b){b.disabled=true;try{await api('/api/admin/accounts/'+encodeURIComponent(b.dataset.id)+'/'+b.dataset.review,{});await review()}catch(err){alert(err.message);b.disabled=false}}if(e.target.closest('[data-refresh]'))review()};review();
}
