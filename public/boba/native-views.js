import {$,$$,esc,ico,lic,api} from './common.js';
const originalAsk = {
  flush: true,
  html: () =>
    '<div class="ai"><aside class="ai-side"><button class="btn k s" type="button" data-new>' + ico("plus") + "New chat</button>" +
    '<label class="ai-find">' + ico("search") + '<input data-find placeholder="Search chats" aria-label="Search chats" autocomplete="off" spellcheck="false"></label>' +
    '<div class="ai-list srl" data-list></div></aside>' +
    '<section class="ai-main"><div class="ai-thread srl" data-thread><div class="ai-in" data-in></div></div>' +
    '<form class="ai-box gl g2" data-form><p class="ai-note" data-note hidden></p><div class="ai-atts" data-atts hidden></div>' +
    '<textarea data-aq rows="1" maxlength="8000" placeholder="Ask anything" aria-label="Ask anything"></textarea>' +
    '<div class="ai-tools"><button class="ai-t" type="button" data-add aria-label="Attach an image or text file">' + ico("plus") + "</button>" +
    '<button class="ai-t cel-ai-generate-toggle" type="button" data-generate aria-pressed="false" title="Generate an image with NVIDIA FLUX">✧ Image</button>' +
    '<button class="ai-t" type="button" data-web aria-pressed="false" disabled>' + ico("web") + "Search</button>" +
    '<label class="ai-t celestial-effort"><span class="tv">' + ico("ask") + '</span><select data-effort aria-label="AI reasoning mode"><option value="instant" selected>Instant</option><option value="smart">Smart</option><option value="ultra">Ultra Smart</option></select></label>' +
    '<span class="sp"></span><button class="cb" type="submit" data-asend aria-label="Send">' + ico("send") + "</button></div>" +
    '<input type="file" data-pick hidden accept=".txt,.md,.csv,.json,.js,.ts,.py,.java,.html,.css,.xml,.yml,.yaml"></form></section></div>',
};
export function mountAsk(root,user){
 root.innerHTML=originalAsk.html();
 let chats=[];try{chats=JSON.parse(localStorage.getItem('boba.ask.'+user.id)||'[]')}catch{}
 let active=null,busy=null,attachment=null,menu=null,mode='chat',web=localStorage.getItem('celestial.ai.web')==='true';
 const effortSelect=$('[data-effort]',root);
 const savedEffort=localStorage.getItem('celestial.ai.effort');
 if(['instant','smart','ultra'].includes(savedEffort))effortSelect.value=savedEffort;
 effortSelect.onchange=()=>{localStorage.setItem('celestial.ai.effort',effortSelect.value);window.dispatchEvent(new Event('celestial:save-workspace'))};
 const inner=$('[data-in]',root),thread=$('[data-thread]',root),list=$('[data-list]',root),q=$('[data-aq]',root),note=$('[data-note]',root),form=$('[data-form]',root),find=$('[data-find]',root),send=$('[data-asend]',root),atts=$('[data-atts]',root),pick=$('[data-pick]',root);
 const save=()=>{
  try{
   localStorage.setItem('boba.ask.'+user.id,JSON.stringify(chats));
   window.dispatchEvent(new Event('celestial:save-workspace'));
  }catch(error){say('Chat history storage is full. Consider deleting older image chats.');}
 };
 const imageButton=$('[data-generate]',root);
 const setMode=next=>{
  mode=next;
  imageButton.classList.toggle('on',mode==='image');
  imageButton.setAttribute('aria-pressed',String(mode==='image'));
  q.placeholder=mode==='image'?'Describe the image you want to create…':'Ask anything';
  if(mode==='image'&&attachment)say('Image generation uses a text prompt. Switch to chat to analyze attached images.');
  else say('');
 };
 imageButton.onclick=()=>{if(!busy){setMode(mode==='image'?'chat':'image');q.focus()}};
 const webButton=$('[data-web]',root);async function checkWeb(){try{webButton.disabled=!(await api('/api/ai/search/status')).configured;if(webButton.disabled){web=false;webButton.classList.remove('on');webButton.setAttribute('aria-pressed','false')}}catch{webButton.disabled=true}}
 webButton.classList.toggle('on',web);webButton.setAttribute('aria-pressed',String(web));
 webButton.onclick=()=>{web=!web;webButton.classList.toggle('on',web);webButton.setAttribute('aria-pressed',String(web));localStorage.setItem('celestial.ai.web',String(web));window.dispatchEvent(new Event('celestial:save-workspace'))};checkWeb();root.addEventListener('pointerenter',checkWeb);
 const say=t=>{note.textContent=t||'';note.hidden=!t};
 const grow=()=>{q.style.height='auto';q.style.height=Math.min(q.scrollHeight,200)+'px'};
 const escText=t=>esc(t).replace(/\x60([^\x60\n]+)\x60/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
 function body(text){return String(text||'').split(/\x60\x60\x60(?:[^\n]*\n)?/).map((part,i)=>i%2?'<pre><code>'+esc(part)+'</code></pre>':part.split(/\n\n+/).filter(Boolean).map(p=>'<p>'+escText(p).replace(/\n/g,'<br>')+'</p>').join('')).join('')}
 function closeMenu(){menu?.remove();menu=null}
 function paintList(){closeMenu();const filter=find.value.trim().toLowerCase();const sorted=chats.filter(c=>c.title.toLowerCase().includes(filter)).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.updated||0)-(a.updated||0));const item=c=>'<div class="ai-it'+(c===active?' on':'')+'" data-id="'+esc(c.id)+'" role="button" tabindex="0">'+(c.pinned?ico('pin','i pn'):'')+'<span>'+esc(c.title)+'</span><button class="mo" type="button" data-more aria-label="More">'+ico('dots')+'</button></div>';const pinned=sorted.filter(c=>c.pinned),rest=sorted.filter(c=>!c.pinned);list.innerHTML=filter?(sorted.length?sorted.map(item).join(''):'<p class="ai-none">No chats found</p>'):(pinned.length?'<div class="ai-sec">Pinned</div>'+pinned.map(item).join('')+(rest.length?'<div class="ai-sec">Recent</div>':''):'')+rest.map(item).join('')}
 function paint(){paintList();const messages=active?.messages||[];thread.classList.toggle('empty',!messages.length);const h=new Date().getHours(),greet=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', '+user.username+'.';inner.innerHTML=messages.length?messages.map((m,i)=>m.role==='user'?'<div class="ai-q" data-index="'+i+'"><div class="ai-qr"><button class="ai-ed" data-edit type="button" aria-label="Edit">'+ico('pencil')+'</button><div class="ai-u">'+esc(m.display||m.content)+'</div></div></div>':'<div class="ai-a" data-index="'+i+'">'+(m.generatedImage?'<div class="cel-ai-generated"><img src="'+esc(m.generatedImage)+'" alt="'+esc(m.imagePrompt||'AI generated image')+'" loading="lazy"><a href="'+esc(m.generatedImage)+'" download="celestial-generated-image" class="cel-ai-download">Download image ↧</a></div>':'')+'<div class="ai-body">'+body(m.content)+'</div><div class="ai-f"><button data-copy type="button" aria-label="Copy">'+ico('copy')+'</button><button data-regen type="button" aria-label="Regenerate">'+ico('reload')+'</button></div></div>').join(''):'<div class="ai-hi"><h1>'+esc(greet)+'</h1><div class="sugs">'+['Explain photosynthesis simply','Outline an essay on climate','Quiz me on world capitals','Fix this sentence’s grammar'].map(s=>'<button type="button" data-s>'+esc(s)+'</button>').join('')+'</div></div>';if(busy)inner.insertAdjacentHTML('beforeend','<div class="ai-a"><span class="ai-dots"><i></i><i></i><i></i></span></div>');send.innerHTML=ico(busy?'x':'send');send.setAttribute('aria-label',busy?'Stop':'Send');send.classList.toggle('stop',!!busy);thread.scrollTop=thread.scrollHeight}
 async function run(){if(busy||!active)return;const chat=active,ctl=new AbortController();busy=ctl;paint();say('');try{const r=await fetch('/api/ai',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({web,effort:effortSelect.value,messages:(()=>{
 const recent=chat.messages.slice(-14);
 const latestImage=[...recent].reverse().find(m=>m.role==='user'&&m.image);
 return recent.map(m=>({role:m.role,content:m.content.slice(0,8000),...(m===latestImage?{image:m.image}:{})}));
})()})});const data=await r.json();if(!r.ok)throw Error(data.error||'Couldn’t answer that.');if(!ctl.signal.aborted){chat.messages.push({role:'assistant',content:data.text||'',sources:data.sources||[]});chat.updated=Date.now();save()}}catch(e){if(!ctl.signal.aborted)say(e.message)}finally{busy=null;paint()}}
 function paintAtt(){
  atts.hidden=!attachment;
  atts.innerHTML=attachment?'<span class="ai-chip">'+
   (attachment.image?'<img class="cel-ai-upload-thumb" src="'+esc(attachment.image)+'" alt="">':'<span class="fi">'+ico('file')+'</span>')+
   '<span class="nm"><b>'+esc(attachment.name)+'</b></span><button class="x" type="button" data-rm aria-label="Remove attachment">'+ico('x')+'</button></span>':'';
 }
 async function compressImage(file){
  if(file.size>6*1024*1024)throw Error('Choose an image under 6 MB.');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();
   await new Promise((resolve,reject)=>{
    img.onload=resolve;img.onerror=()=>reject(Error('Could not decode image.'));
    img.src=url;
   });
   if(!img.naturalWidth||!img.naturalHeight)throw Error('Invalid image.');
   const canvas=document.createElement('canvas');
   const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Image processing is unavailable.');
   // JPEG provides predictable sizes and avoids sending large uploads to the server.
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   let data='';
   for(let step=0;step<9;step++){
    data=canvas.toDataURL('image/jpeg',Math.max(.42,.84-step*.055));
    if(data.length<=440000)break;
    const nextWidth=Math.max(180,Math.round(canvas.width*.82));
    const nextHeight=Math.max(180,Math.round(canvas.height*.82));
    const buffer=document.createElement('canvas');
    buffer.width=nextWidth;buffer.height=nextHeight;
    buffer.getContext('2d').drawImage(canvas,0,0,nextWidth,nextHeight);
    canvas.width=nextWidth;canvas.height=nextHeight;
    canvas.getContext('2d').drawImage(buffer,0,0);
   }
   if(data.length>440000)throw Error('Image is too detailed to attach. Try a smaller picture.');
   return data;
  }finally{URL.revokeObjectURL(url)}
 }
 async function makeImage(text){
  const prompt=String(text||'').trim();
  if(busy||!prompt)return;
  if(attachment){say('Switch to Chat to analyze an uploaded image. Image creation currently uses text prompts.');return}
  if(prompt.length<3||prompt.length>1600){say('Describe your image in 3 to 1,600 characters.');return}
  if(!active){active={id:crypto.randomUUID(),title:prompt.slice(0,60),messages:[],updated:Date.now()};chats.unshift(active)}
  const chat=active;
  chat.messages.push({role:'user',content:prompt,display:prompt});
  chat.updated=Date.now();
  q.value='';grow();save();
  const ctl=new AbortController();busy=ctl;paint();say('Generating with NVIDIA FLUX…');
  try{
    const response=await fetch('/api/ai/images',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:ctl.signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Could not create an image.');
    if(!ctl.signal.aborted){
      chat.messages.push({role:'assistant',content:'Image generated with '+(data.model||'NVIDIA FLUX')+'.',generatedImage:data.image,imagePrompt:prompt});
      chat.updated=Date.now();save();say('');
    }
  }catch(error){if(!ctl.signal.aborted)say(error.message||'Image generation failed')}
  finally{busy=null;paint()}
 }
 async function submit(text){
  if(mode==='image')return makeImage(text);
  text=String(text||'').trim();
  if(busy||(!text&&!attachment))return;
  const file=attachment;
  const isImage=!!file?.image;
  const display=text||(isImage?'What is in this image?':'Review this file');
  const content=file&&!isImage?display+'\n\nFile: '+file.name+'\n'+file.text:display;
  if(content.length>8000){say('Your message and attached text must be 8,000 characters or fewer.');return}
  if(!active){active={id:crypto.randomUUID(),title:display.slice(0,60),messages:[],updated:Date.now()};chats.unshift(active)}
  active.messages.push({role:'user',content,display:file?display+' · '+file.name:display,...(isImage?{image:file.image}:{})});
  active.updated=Date.now();attachment=null;paintAtt();q.value='';grow();save();await run();
 }
 $('[data-new]',root).onclick=()=>{if(!busy){active=null;say('');paint();q.focus()}};
 find.oninput=paintList;
 q.oninput=grow;
 q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit(q.value)}};
 form.onsubmit=e=>{e.preventDefault();busy?busy.abort():submit(q.value)};
 $('[data-add]',root).onclick=()=>pick.click();
 pick.onchange=async()=>{
  const file=pick.files[0];pick.value='';if(!file)return;
  try{
   if(['image/png','image/jpeg','image/webp'].includes(file.type)){
    attachment={name:file.name,image:await compressImage(file)};
   }else{
    if(file.size>12000)throw Error('Choose a text file under 12 KB.');
    attachment={name:file.name,text:await file.text()};
   }
   paintAtt();say('');
  }catch(error){say(error.message||'Could not attach that file.')}
 };
 atts.onclick=e=>{if(e.target.closest('[data-rm]')){attachment=null;paintAtt()}};

 function select(it){if(!busy&&it){active=chats.find(c=>c.id===it.dataset.id)||null;say('');paint()}}
 list.onclick=e=>{const it=e.target.closest('[data-id]');if(!it)return;if(!e.target.closest('[data-more]'))return select(it);const chat=chats.find(c=>c.id===it.dataset.id);closeMenu();if(!chat)return;menu=document.createElement('div');menu.className='ai-menu ai-imenu gl g3';menu.innerHTML='<button data-act="rename">'+ico('pencil')+'Rename</button><button data-act="pin">'+ico('pin')+(chat.pinned?'Unpin':'Pin')+'</button><button class="bad" data-act="del">'+ico('trash')+'Delete</button>';const side=$('.ai-side',root),r=it.getBoundingClientRect(),b=side.getBoundingClientRect();menu.style.top=r.bottom-b.top+4+'px';menu.style.left='8px';side.append(menu);menu.onclick=e=>{const act=e.target.closest('[data-act]')?.dataset.act;if(!act)return;if(act==='rename'){const t=prompt('Chat name',chat.title);if(t?.trim())chat.title=t.trim().slice(0,60)}if(act==='pin')chat.pinned=!chat.pinned;if(act==='del'&&!busy&&confirm('Delete this chat?')){chats=chats.filter(c=>c!==chat);if(active===chat)active=null}save();paint()}};
 list.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();select(e.target.closest('[data-id]'))}};document.addEventListener('click',e=>{if(menu&&!e.target.closest('.ai-imenu,[data-more]'))closeMenu()});
 inner.onclick=async e=>{const s=e.target.closest('[data-s]');if(s)return submit(s.textContent);const row=e.target.closest('[data-index]'),i=Number(row?.dataset.index);if(!active||!Number.isInteger(i))return;const m=active.messages[i];if(e.target.closest('[data-copy]')){try{await navigator.clipboard.writeText(m.content);e.target.closest('button').innerHTML=ico('check')}catch{}return}if(busy)return;if(e.target.closest('[data-edit]')){const t=prompt('Edit message',m.display||m.content);if(t?.trim()){active.messages.splice(i);active.messages.push({role:'user',content:t.trim().slice(0,8000)});save();run()}}if(e.target.closest('[data-regen]')){active.messages.splice(i);save();run()}};
 paint();
}
export function mountAccount(root,user){
 root.innerHTML='<div class="acct"><div class="acg"><section class="pass r"><div class="top"><span class="av native-avatar">'+esc(user.username.slice(0,2).toUpperCase())+'</span><div class="nm"><h1>'+esc(user.username)+'</h1><p>'+esc(user.role||'user')+'</p></div><div class="pbs"><button class="pb" data-out>'+ico('signout')+'Sign out</button></div></div><div class="bot">Member since<b>'+esc(user.joinedAt?new Date(user.joinedAt).toLocaleDateString():'—')+'</b></div></section><section class="grp gl g2 r"><h3 class="cardh">Account</h3><div class="lr">'+lic('user','#b98cff','#7a4cf0')+'<h3>Username</h3><span class="val">'+esc(user.username)+'</span></div><div class="lr">'+lic('shield','#5ee08a','#139b48')+'<h3>Role</h3><span class="val">'+esc(user.role||'user')+'</span></div></section><section class="grp gl g2 wide r" data-admin hidden><h3 class="cardh">Account requests</h3><div class="native-requests"></div><div class="lr"><button class="btn s" data-refresh>Refresh</button></div></section></div></div>';
 $('[data-out]',root).onclick=async()=>{await api('/api/logout',{});location.replace('/')};
 async function review(){try{const d=await api('/api/admin/accounts/pending');$('[data-admin]',root).hidden=false;$('.native-requests',root).innerHTML=d.accounts.length?d.accounts.map(a=>'<div class="lr"><h3>'+esc(a.username)+'</h3><button class="btn s" data-review="approve" data-id="'+esc(a.id)+'">Approve</button><button class="btn bad s" data-review="reject" data-id="'+esc(a.id)+'">Reject</button></div>').join(''):'<div class="lr">No pending accounts.</div>'}catch{}}
 root.onclick=async e=>{const b=e.target.closest('[data-review]');if(b){b.disabled=true;try{await api('/api/admin/accounts/'+encodeURIComponent(b.dataset.id)+'/'+b.dataset.review,{});await review()}catch(err){alert(err.message);b.disabled=false}}if(e.target.closest('[data-refresh]'))review()};review();
}
