/** Celestial's small single-instance server. No npm dependencies needed. */
import http from 'node:http';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { bootstrap } from '@mercuryworkshop/proxy-bootstrap';
import { attachLightningLive } from './live.js';
import {importBoltData,bootstrapAdministrator,backupBoltData} from './legacy-data.js';
import { completeAi, TEXT_MODEL, usableModel } from './ai-provider.js';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR=path.resolve(ROOT,process.env.BOLT_DATA_DIR||
  process.env.RAILWAY_VOLUME_MOUNT_PATH||
  (process.env.LIGHTNING_DATA_FILE?path.dirname(process.env.LIGHTNING_DATA_FILE):path.join(ROOT,'data')));
const STORE_FILE=process.env.LIGHTNING_DATA_FILE||path.join(DATA_DIR,'store.json');
const PORT=Number(process.env.PORT||3080);
const hadStore=existsSync(STORE_FILE);
if(process.env.RAILWAY_VOLUME_MOUNT_PATH){
  const mount=path.resolve(ROOT,process.env.RAILWAY_VOLUME_MOUNT_PATH);
  const onVolume=value=>value===mount||value.startsWith(mount+path.sep);
  if(!onVolume(DATA_DIR)||!onVolume(path.resolve(STORE_FILE))){
    throw Error('Account data paths are outside the attached Railway volume; refusing ephemeral storage');
  }
}
mkdirSync(DATA_DIR,{recursive:true});
// The Bolt-era backend provides real browser proxying and multiplayer.
// Missing proxy downloads must never block the rest of the platform.
let proxyBackend=null;
if(process.env.DISABLE_WEB_PROXY!=='1')try{
  proxyBackend=await bootstrap();
}catch(error){console.warn('Browser proxy unavailable:',error.message);}

const channels = new Set(['general', 'help', 'showcase']);
const listeners = new Set();
const loginAttempts = new Map();
let writeChain = Promise.resolve();

const palette = (accent, background, surface, text, muted, line) => ({accent, background, surface, text, muted, line, glow: 55, radius: 16, petals: true});
const starterDrops = [
  {id:'starter-void', ownerId:'system', author:'Celestial Studio', title:'Eclipse', description:'For late nights and clean focus. Violet starlight over a deep midnight canvas.', tags:['dark','neon'], createdAt:'2026-11-01T12:00:00Z', downloads:0, likedBy:[], theme:palette('#b67cff','#0f0b1b','#20152f','#f9f2ff','#b8a9cb','#513966')},
  {id:'starter-sakura', ownerId:'system', author:'Celestial Studio', title:'Sakura Afterglow', description:'Soft cherry-blossom pinks, lavender glass and a little extra glow.', tags:['pastel','sakura'], createdAt:'2026-11-01T12:00:00Z', downloads:0, likedBy:[], theme:palette('#f29be9','#211426','#38213c','#fff3fc','#d4b8d5','#86547f')},
  {id:'starter-ice', ownerId:'system', author:'Celestial Studio', title:'Frostbyte', description:'A crystalline cold blue spin in the Celestial interface.', tags:['cool','minimal'], createdAt:'2026-11-01T12:00:00Z', downloads:0, likedBy:[], theme:palette('#8edcff','#0b1421','#142738','#eaf9ff','#a5c5d7','#37617c')},
  {id:'starter-ember', ownerId:'system', author:'Celestial Studio', title:'Solar Flare', description:'Warm sunset contrast. Copper, coral and violet in one mix.', tags:['warm','contrast'], createdAt:'2026-11-01T12:00:00Z', downloads:0, likedBy:[], theme:palette('#f6a66d','#201019','#38222e','#fff0e9','#d0b5bd','#845563')}
];
const emptyStore = () => ({users:[], sessions:[], messages:[], drops:starterDrops});
let db;
try {
  db = JSON.parse(await readFile(STORE_FILE,'utf8'));
  if (!Array.isArray(db.users) || !Array.isArray(db.drops) || !Array.isArray(db.messages) || !Array.isArray(db.sessions)) throw Error('Malformed store');
} catch(error) {
  if(error.code !== 'ENOENT') throw error;
  db = emptyStore();
}
if(!Array.isArray(db.dms))db.dms=[];

// Migrate the original Celestial public chat history into Bolt's
// social format once. Keep the source store untouched.
const SOCIAL_FILE=path.join(DATA_DIR,'lightning-social.json');
if(!existsSync(SOCIAL_FILE)&&db.messages.length){
  const history={general:[],games:[],suggestions:[],support:[]};
  for(const message of db.messages){
    const channel=message.channel==='help'?'support':message.channel==='showcase'?'games':'general';
    history[channel].push({
      id:message.id,by:message.author,username:message.author,
      userId:message.ownerId,channel,message:message.text,
      at:Date.parse(message.createdAt)||Date.now(),replyTo:null,reactions:{}
    });
  }
  try{writeFileSync(SOCIAL_FILE,JSON.stringify(history),{flag:'wx'});}
  catch(error){console.warn('Legacy chat migration unavailable:',error.message);}
}

function persist() {
  const snapshot = JSON.stringify(db, null, 2);
  writeChain = writeChain.then(async () => {
    await mkdir(path.dirname(STORE_FILE), {recursive:true});
    const temp = STORE_FILE + '.tmp';
    await writeFile(temp, snapshot, {mode:0o600});
    await rename(temp, STORE_FILE);
  });
  return writeChain;
}
const legacyBackup=await backupBoltData(DATA_DIR);
const legacyImport=await importBoltData(db,DATA_DIR);
if(process.env.RAILWAY_VOLUME_MOUNT_PATH&&!hadStore&&!legacyImport.legacyFound){
  throw Error('No account database found on the mounted Railway volume; refusing to start with empty accounts');
}
const adminCreated=bootstrapAdministrator(db);
if(legacyImport.accountsImported||legacyImport.conversationsImported||adminCreated)await persist();
console.log('Celestial data ready',JSON.stringify({
  directory:DATA_DIR,legacyFound:legacyImport.legacyFound,
  originalFilesBackedUp:legacyBackup.files,
  accountsImported:legacyImport.accountsImported,
  directMessagesImported:legacyImport.conversationsImported,
  skippedConflicts:legacyImport.skippedConflicts,
  hasApprover:db.users.some(u=>u.role==='admin'||u.role==='account_manager')
}));
function tokenHash(token) {return createHash('sha256').update(token).digest('hex');}
function parseCookie(value='') {return Object.fromEntries(value.split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(p=>p.length===2));}
// A partitioned cookie lets the same account work in third-party launcher frames.
// Keep the original first-party cookie for normal tabs and existing logins.
function sessionToken(headers){
  const cookies=parseCookie(headers.cookie||'');
  return cookies.lightning_embed_session||cookies.lightning_session;
}
function activeAccount(user) {
  return Boolean(user && user.approved!==false && user.enabled!==false &&
    user.reviewStatus!=='rejected' &&
    (!user.expiresAt || Number(user.expiresAt)>Date.now()));
}
function managesAccounts(user) {
  return activeAccount(user) && ['admin','account_manager'].includes(user.role);
}
function account(req) {
  const value = sessionToken(req.headers);
  if(!value) return null;
  const session = db.sessions.find(s => s.hash===tokenHash(value) && s.expires>Date.now());
  const user = session ? db.users.find(u=>u.id===session.userId) : null;
  return activeAccount(user)?user:null;
}
function liveIdentity(headers){
  const token=sessionToken(headers);
  if(!token)return null;
  const session=db.sessions.find(row=>row.hash===tokenHash(token)&&row.expires>Date.now());
  if(!session)return null;
  const user=db.users.find(row=>row.id===session.userId);
  if(!activeAccount(user))return null;
  return {identity:{id:user.id,username:user.username,role:user.role||'user'},session};
}
function publicAccount(user) {return user ? {id:user.id,username:user.username,joinedAt:user.joinedAt,role:user.role||'user'} : null;}
function respond(res,status,body,headers={}) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(JSON.stringify(body));
}
function fail(res,status,error) {respond(res,status,{error});}
async function bodyJSON(req) {
  let content='';
  for await (const chunk of req) {
    content += chunk;
    if(content.length > 18000) throw new Error('Request is too large');
  }
  if(!req.headers['content-type']?.startsWith('application/json')) throw new Error('JSON content type required');
  try{return JSON.parse(content || '{}');}catch{throw new Error('Invalid JSON');}
}
function cleanLine(value,max=500) {return typeof value==='string' ? value.trim().slice(0,max) : '';}
function id() {return randomBytes(12).toString('hex');}
function startSession(res,user,req) {
  const token=randomBytes(32).toString('base64url');
  db.sessions.push({hash:tokenHash(token),userId:user.id,expires:Date.now()+30*864e5});
  const secure=req.headers['x-forwarded-proto']==='https' || req.socket.encrypted;
  const cookies=[`lightning_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure?'; Secure':''}`];
  if(secure)cookies.push(`lightning_embed_session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=2592000`);
  res.setHeader('Set-Cookie',cookies);
}
function limited(req,action,max,windowMs) {
  const addr=req.socket.remoteAddress || 'unknown';
  const key=`${addr}:${action}`; const now=Date.now();
  const recent=(loginAttempts.get(key)||[]).filter(t=>now-t<windowMs);
  recent.push(now); loginAttempts.set(key,recent);
  return recent.length>max;
}
function notify(kind) {
  for(const res of listeners) {
    try {res.write(`event: refresh\ndata: ${JSON.stringify({kind})}\n\n`);}catch{listeners.delete(res);}
  }
}
function validateTheme(input) {
  if(!input || typeof input!=='object'||Array.isArray(input)) throw Error('Invalid theme data');
  const colors=['accent','background','surface','text','muted','line'];
  const result={};
  for(const color of colors) {
    if(typeof input[color] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(input[color])) throw Error(`Invalid ${color} color`);
    result[color]=input[color].toLowerCase();
  }
  result.radius=Math.min(28,Math.max(4,Number(input.radius)||16));
  result.glow=Math.min(100,Math.max(0,Number.isFinite(Number(input.glow))?Number(input.glow):55));
  result.petals=Boolean(input.petals);
  return result;
}
function publicDrop(drop,user) {
  const {likedBy=[],...rest}=drop;
  return {...rest,author:drop.ownerId==='system'?'Celestial Studio':rest.author,likes:likedBy.length,liked:Boolean(user && likedBy.includes(user.id))};
}
function safeOrigin(req) {
  const origin=req.headers.origin;
  if(!origin)return true; // non-browser API clients; session cookies still SameSite=Lax
  const target=`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  return origin===target || origin===`http://${req.headers.host}` || origin===`https://${req.headers.host}`;
}
async function handleAPI(req,res,url) {
  const user=account(req);
  const pathname=url.pathname;
  if(req.method==='GET' && pathname==='/api/me') return respond(res,200,{user:publicAccount(user),stats:{members:db.users.length,drops:db.drops.length,messages:db.messages.length}});
  if(req.method==='GET' && pathname==='/api/ai/status'){
    if(!user)return fail(res,401,'Sign in required');
    return respond(res,200,{configured:Boolean(process.env.OPENAI_API_KEY||process.env.NVIDIA_API_KEY)});
  }
  if(req.method==='GET' && pathname==='/api/browser/status')return respond(res,200,{proxy:Boolean(proxyBackend),authenticated:Boolean(user)});
  if(req.method==='GET' && pathname==='/api/community/members'){
    if(!user)return fail(res,401,'Sign in required');
    // The community directory includes approved accounts, even when offline.
    // Never expose passwords, session tokens, pending accounts, or staff notes.
    return respond(res,200,{members:db.users.filter(activeAccount)
      .map(person=>({id:person.id,username:person.username,
        name:person.username,platformRole:person.role||'user'}))
      .sort((a,b)=>a.username.localeCompare(b.username)).slice(0,500)});
  }
  if(req.method==='GET' && pathname==='/api/admin/accounts/pending'){
    if(!user)return fail(res,401,'Sign in required');
    if(!managesAccounts(user))return fail(res,403,'Not authorized to review accounts');
    return respond(res,200,{accounts:db.users.filter(u=>u.approved===false&&u.reviewStatus!=='rejected')
      .map(u=>({id:u.id,username:u.username,joinedAt:u.joinedAt||null}))
      .sort((a,b)=>String(a.joinedAt||'').localeCompare(String(b.joinedAt||'')))});
  }

  if(req.method==='GET' && pathname==='/api/dms'){
    if(!user)return fail(res,401,'Sign in to view direct messages');
    const people=db.users.filter(other=>other.id!==user.id&&activeAccount(other));
    const threads=people.map(other=>{
      const messages=db.dms.filter(row=>(row.from===user.id&&row.to===other.id)||(row.to===user.id&&row.from===other.id));
      const last=messages.at(-1);
      return last?{user:{id:other.id,username:other.username},last:{id:last.id,text:last.text,createdAt:last.createdAt},count:messages.length}:null;
    }).filter(Boolean).sort((a,b)=>b.last.createdAt.localeCompare(a.last.createdAt)).slice(0,60);
    return respond(res,200,{threads});
  }
  const directTarget=pathname.match(/^\/api\/dms\/(usr_[a-zA-Z0-9_-]{8,40}|[a-f0-9]{24})$/);
  if(req.method==='GET'&&directTarget){
    if(!user)return fail(res,401,'Sign in to view direct messages');
    const other=db.users.find(member=>member.id===directTarget[1]&&member.id!==user.id&&activeAccount(member));
    if(!other)return fail(res,404,'Member not found');
    const messages=db.dms.filter(row=>(row.from===user.id&&row.to===other.id)||(row.to===user.id&&row.from===other.id)).slice(-150);
    return respond(res,200,{user:{id:other.id,username:other.username},messages:messages.map(row=>({
      id:row.id,from:row.from,to:row.to,text:row.text,createdAt:row.createdAt,
      author:row.from===user.id?user.username:other.username
    }))});
  }


  if(req.method==='GET' && pathname==='/api/events') {
    if(!user)return fail(res,401,'Sign in required');
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(': connected\n\n'); listeners.add(res);
    const timer=setInterval(()=>{try{res.write(': heartbeat\n\n');}catch{}},25000);
    req.on('close',()=>{clearInterval(timer);listeners.delete(res);});
    return;
  }
  if(req.method==='GET' && pathname==='/api/messages') {
    if(!user)return fail(res,401,'Sign in required');
    const channel=channels.has(url.searchParams.get('channel'))?url.searchParams.get('channel'):'general';
    return respond(res,200,{messages:db.messages.filter(m=>m.channel===channel).slice(-140)});
  }
  if(req.method==='GET' && pathname==='/api/drops') {
    if(!user)return fail(res,401,'Sign in required');
    return respond(res,200,{drops:db.drops.map(d=>publicDrop(d,user)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
  }
  if(req.method==='GET' && /^\/api\/drops\/[^/]+\/download$/.test(pathname)) {
    if(!user)return fail(res,401,'Sign in required');
    const drop=db.drops.find(d=>d.id===pathname.split('/')[3]);
    if(!drop)return fail(res,404,'Drop not found');
    drop.downloads=(drop.downloads||0)+1;
    await persist();
    const packageData={format:'celestial.theme',version:1,name:drop.title,author:drop.author,theme:drop.theme};
    res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':`attachment; filename="celestial-${drop.id}.json"`,'Cache-Control':'no-store'});
    return res.end(JSON.stringify(packageData,null,2));
  }
  if(!['POST','DELETE'].includes(req.method)) return fail(res,404,'API route not found');
  if(!safeOrigin(req))return fail(res,403,'Origin not allowed');
  const body=req.method==='POST'?await bodyJSON(req):{};
  if(pathname==='/api/register' && req.method==='POST') {
    if(limited(req,'register',7,600000))return fail(res,429,'Too many sign-up attempts');
    const username=cleanLine(body.username,40);const password=body.password;
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return fail(res,400,'Username must be 3–20 letters, numbers or underscores');
    if(typeof password!=='string' || password.length<8 || password.length>128)return fail(res,400,'Password must be 8–128 characters');
    if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return fail(res,409,'Username is already taken');
    const salt=randomBytes(16).toString('hex');
    const pending={id:id(),username,salt,hash:scryptSync(password,salt,64).toString('hex'),
      joinedAt:new Date().toISOString(),role:'user',enabled:true,
      approved:false,reviewStatus:'pending'};
    db.users.push(pending);
    await persist();
    return respond(res,202,{ok:true,status:'pending',
      message:'Your account request was received. An administrator must approve it before you can sign in.'});
  }
  if(pathname==='/api/login' && req.method==='POST') {
    if(limited(req,'login',15,600000))return fail(res,429,'Too many sign-in attempts');
    const username=cleanLine(body.username,40);const password=body.password;
    const found=db.users.find(u=>u.username.toLowerCase()===username.toLowerCase());
    if(typeof password!=='string'||!found)return fail(res,401,'Incorrect username or password');
    let valid=false;
    try{
      if(typeof found.passwordHash==='string'&&found.passwordHash.startsWith('scrypt$')){
        const [,salt,hash]=found.passwordHash.split('$');
        const expected=Buffer.from(hash,'hex');
        const actual=scryptSync(password,salt,expected.length);
        valid=expected.length===64&&timingSafeEqual(actual,expected);
      }else if(typeof found.salt==='string'&&typeof found.hash==='string'){
        const actual=scryptSync(password,found.salt,64);
        const expected=Buffer.from(found.hash,'hex');
        valid=expected.length===actual.length&&timingSafeEqual(actual,expected);
      }
    }catch{valid=false;}
    if(!valid)return fail(res,401,'Incorrect username or password');
    if(found.approved===false)return fail(res,403,found.reviewStatus==='rejected'?
      'Your account request was declined. Contact an administrator.' :
      'Your account is awaiting manual approval.');
    if(!activeAccount(found))return fail(res,403,'This account is disabled or expired.');
    startSession(res,found,req);await persist();return respond(res,200,{user:publicAccount(found)});
  }
  if(pathname==='/api/logout' && req.method==='POST') {
    const token=sessionToken(req.headers);
    if(token)db.sessions=db.sessions.filter(s=>s.hash!==tokenHash(token));
    res.setHeader('Set-Cookie',[
      'lightning_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'lightning_embed_session=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0'
    ]);
    await persist();return respond(res,200,{ok:true});
  }
  if(!user)return fail(res,401,'Sign in to use this feature');
  const review=pathname.match(/^\/api\/admin\/accounts\/(usr_[a-zA-Z0-9_-]{8,40}|[a-f0-9]{24})\/(approve|reject)$/);
  if(review&&req.method==='POST'){
    if(!managesAccounts(user))return fail(res,403,'Not authorized to review accounts');
    if(limited(req,'review:'+user.id,100,60000))return fail(res,429,'Too many review actions');
    const target=db.users.find(u=>u.id===review[1]);
    if(!target)return fail(res,404,'Account not found');
    if(target.approved!==false)return fail(res,409,'Account is already active');
    if(target.role&&target.role!=='user')return fail(res,403,'Staff accounts need a separate review');
    if(review[2]==='approve'){
      target.approved=true;target.reviewStatus='approved';
    }else{
      target.approved=false;target.reviewStatus='rejected';
      db.sessions=db.sessions.filter(session=>session.userId!==target.id);
    }
    target.reviewedAt=new Date().toISOString();
    target.reviewedBy=user.id;
    await persist();
    return respond(res,200,{ok:true,username:target.username,status:target.reviewStatus});
  }
  if(pathname.startsWith('/api/dms/')&&req.method==='POST'){
    const match=pathname.match(/^\/api\/dms\/(usr_[a-zA-Z0-9_-]{8,40}|[a-f0-9]{24})$/);
    if(!match)return fail(res,404,'Member not found');
    const other=db.users.find(member=>member.id===match[1]&&member.id!==user.id&&activeAccount(member));
    if(!other)return fail(res,404,'Member not found');
    if(limited(req,'dm:'+user.id,28,60000))return fail(res,429,'Too many messages. Try again shortly.');
    const text=cleanLine(body.text,1000);
    if(!text)return fail(res,400,'Write a message first');
    const row={id:id(),from:user.id,to:other.id,text,createdAt:new Date().toISOString()};
    db.dms.push(row);
    db.dms=db.dms.slice(-5000);
    await persist();
    notify('dm');
    return respond(res,201,{message:{...row,author:user.username}});
  }
  if(pathname==='/api/ai' && req.method==='POST'){
    if(!process.env.OPENAI_API_KEY&&!process.env.NVIDIA_API_KEY)return fail(res,503,'Celestial is unavailable right now.');
    if(limited(req,'ai:'+user.id,16,3600000))return fail(res,429,'Too many AI requests. Try again later.');
    if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>14) return fail(res,400,'Send between 1 and 14 messages');
    const messages=[];
    for(const item of body.messages) {
      if(!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||item.content.length>2500)return fail(res,400,'Invalid AI message');
      messages.push({role:item.role,content:item.content.trim()});
    }
    if(messages.at(-1).role!=='user'||messages.reduce((total,m)=>total+m.content.length,0)>12000)return fail(res,400,'Invalid conversation');
    try {
      if(!process.env.OPENAI_API_KEY&&process.env.NVIDIA_API_KEY){
        const answer=await completeAi({
          apiKey:process.env.NVIDIA_API_KEY,
          model:usableModel(process.env.NVIDIA_MODEL,TEXT_MODEL),
          messages:[{role:'system',content:'You are Celestial AI, an attentive assistant in a workspace for games, browsing and community chat. Provide concrete and grounded help. Never invent browsing results.'},...messages],
          stream:false,
          signal:AbortSignal.timeout(40000),
          maxTokens:950
        });
        return respond(res,200,{text:answer.reply.slice(0,10000)});
      }
      const upstream=await fetch('https://api.openai.com/v1/responses',{
        method:'POST',
        headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:process.env.OPENAI_MODEL||'gpt-4.1-mini',
          instructions:'You are Celestial AI, a helpful, clear creative assistant inside a workspace with Arcade, Browser and Community Chat. Be warm, practical and concise. Never claim you accessed user data or websites unless that data is actually provided.',
          input:messages,
          max_output_tokens:850,
          store:false
        }),
        signal:AbortSignal.timeout(35000)
      });
      const data=await upstream.json().catch(()=>({}));
      if(!upstream.ok){
        console.warn('AI provider response:',upstream.status,data?.error?.type||'unknown');
        return fail(res,502,'Celestial is temporarily unavailable. Please try again.');
      }
      const text=(data.output||[]).flatMap(item=>item.type==='message'?item.content||[]:[]).filter(part=>part.type==='output_text').map(part=>part.text).join('\n').trim();
      if(!text)return fail(res,502,'Celestial could not complete that request.');
      return respond(res,200,{text:text.slice(0,10000)});
    }catch(error){
      console.warn('AI request failed:',error?.name||'unknown');
      return fail(res,502,'Celestial is temporarily unavailable. Please try again.');
    }
  }
  if(pathname==='/api/messages' && req.method==='POST') {
    if(limited(req,`message:${user.id}`,18,60000))return fail(res,429,'Slow down a little');
    const text=cleanLine(body.text,600);const channel=body.channel;
    if(!channels.has(channel))return fail(res,400,'Unknown channel');
    if(text.length<1)return fail(res,400,'Write something first');
    const msg={id:id(),channel,author:user.username,ownerId:user.id,text,createdAt:new Date().toISOString()};
    db.messages.push(msg);db.messages=db.messages.slice(-2000);
    await persist();notify('chat');return respond(res,201,{message:msg});
  }
  if(pathname==='/api/drops' && req.method==='POST') {
    if(limited(req,`drop:${user.id}`,12,3600000))return fail(res,429,'Too many new Drops in one hour');
    const title=cleanLine(body.title,46),description=cleanLine(body.description,240);
    if(title.length<3 || description.length<8)return fail(res,400,'Add a title and a short description');
    const theme=validateTheme(body.theme);
    const drop={id:id(),ownerId:user.id,author:user.username,title,description,tags:['community','theme'],createdAt:new Date().toISOString(),downloads:0,likedBy:[],theme};
    db.drops.push(drop);await persist();notify('drops');return respond(res,201,{drop:publicDrop(drop,user)});
  }
  const star=pathname.match(/^\/api\/drops\/([^/]+)\/star$/);
  if(star && req.method==='POST') {
    const drop=db.drops.find(d=>d.id===star[1]);if(!drop)return fail(res,404,'Drop not found');
    drop.likedBy=drop.likedBy||[];
    if(drop.likedBy.includes(user.id))drop.likedBy=drop.likedBy.filter(v=>v!==user.id);
    else drop.likedBy.push(user.id);
    await persist();notify('drops');return respond(res,200,{drop:publicDrop(drop,user)});
  }
  const removeDrop=pathname.match(/^\/api\/drops\/([^/]+)$/);
  if(removeDrop && req.method==='DELETE') {
    const drop=db.drops.find(d=>d.id===removeDrop[1]);
    if(!drop)return fail(res,404,'Drop not found');
    if(drop.ownerId!==user.id)return fail(res,403,'You can only remove your own Drops');
    db.drops=db.drops.filter(d=>d.id!==drop.id);await persist();notify('drops');return respond(res,200,{ok:true});
  }
  return fail(res,404,'API route not found');
}
const types={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
async function staticFile(req,res,url) {
  if(req.method!=='GET' && req.method!=='HEAD')return fail(res,405,'Method not allowed');
  let filename;
  try {filename=decodeURIComponent(url.pathname);}catch{return fail(res,400,'Bad path');}
  if(filename==='/' || (!path.extname(filename) && !filename.startsWith('/assets/')))filename='/index.html';
  const filepath=path.resolve(PUBLIC,'.'+filename);
  if(!(filepath===PUBLIC||filepath.startsWith(PUBLIC+path.sep)))return fail(res,403,'Invalid file path');
  const type=types[path.extname(filepath)];if(!type)return fail(res,404,'File not found');
  try {
    const info=await stat(filepath);if(!info.isFile())throw Error('Not a file');
    const content=await readFile(filepath);
    res.writeHead(200,{'Content-Type':type,'Content-Length':content.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.unsplash.com; connect-src 'self' data: https://*.unsplash.com wss: ws:; frame-src 'self' https: http:; font-src 'self'; object-src 'none'; base-uri 'none'",'Cache-Control':filepath.includes('/assets/')?'public, max-age=3600':'no-cache'});
    return res.end(req.method==='HEAD'?undefined:content);
  }catch{return fail(res,404,'File not found');}
}
export function createServer(){
  const server=http.createServer(async(req,res)=>{
    try {const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
      if(url.pathname.startsWith('/api/'))return await handleAPI(req,res,url);
      // All Scramjet bootstrap, service worker and rewritten pages are
      // session protected, just like the original Bolt implementation.
      if(proxyBackend&&liveIdentity(req.headers)&&proxyBackend.routeRequest(req,res))return;
      return await staticFile(req,res,url);
    }catch(error){
      console.error('Request error:',error.message);
      if(!res.headersSent)fail(res,error.message==='Request is too large'?413:400,error.message||'Request failed');
      else res.end();
    }
  });
  if(proxyBackend)server.on('upgrade',(req,socket,head)=>{
    if(req.url?.startsWith('/live'))return;
    if(!liveIdentity(req.headers)){
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();return;
    }
    try{proxyBackend.routeUpgrade(req,socket,head);}
    catch(error){console.warn('Browser transport failed:',error.message);socket.destroy();}
  });
  // Bridge Celestial's existing accounts to Bolt's proven multiplayer
  // server; old user IDs remain stable, preserving community identity.
  attachLightningLive({
    server,sessionFromHeaders:liveIdentity,dataDir:DATA_DIR,
    getDisplayName:(_id,username)=>username,
    getRole:userId=>db.users.find(person=>person.id===userId&&activeAccount(person))?.role||'user'
  });
  return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  createServer().listen(PORT,()=>console.log(`✦ Celestial running at http://localhost:${PORT}`));
}
export {validateTheme};
