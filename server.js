/** Celestial's small single-instance server. No npm dependencies needed. */
import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const STORE_FILE = process.env.LIGHTNING_DATA_FILE || path.join(ROOT, 'data', 'store.json');
const PORT = Number(process.env.PORT || 3080);
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
function tokenHash(token) {return createHash('sha256').update(token).digest('hex');}
function parseCookie(value='') {return Object.fromEntries(value.split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(p=>p.length===2));}
function account(req) {
  const value = parseCookie(req.headers.cookie).lightning_session;
  if(!value) return null;
  const session = db.sessions.find(s => s.hash===tokenHash(value) && s.expires>Date.now());
  return session ? db.users.find(u=>u.id===session.userId) || null : null;
}
function publicAccount(user) {return user ? {id:user.id,username:user.username,joinedAt:user.joinedAt} : null;}
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
  res.setHeader('Set-Cookie',`lightning_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure?'; Secure':''}`);
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
  if(req.method==='GET' && pathname==='/api/events') {
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(': connected\n\n'); listeners.add(res);
    const timer=setInterval(()=>{try{res.write(': heartbeat\n\n');}catch{}},25000);
    req.on('close',()=>{clearInterval(timer);listeners.delete(res);});
    return;
  }
  if(req.method==='GET' && pathname==='/api/messages') {
    const channel=channels.has(url.searchParams.get('channel'))?url.searchParams.get('channel'):'general';
    return respond(res,200,{messages:db.messages.filter(m=>m.channel===channel).slice(-140)});
  }
  if(req.method==='GET' && pathname==='/api/drops') {
    return respond(res,200,{drops:db.drops.map(d=>publicDrop(d,user)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
  }
  if(req.method==='GET' && /^\/api\/drops\/[^/]+\/download$/.test(pathname)) {
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
    const username=cleanLine(body.username,30);const password=body.password;
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return fail(res,400,'Username must be 3–20 letters, numbers or underscores');
    if(typeof password!=='string' || password.length<8 || password.length>128)return fail(res,400,'Password must be 8–128 characters');
    if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return fail(res,409,'Username is already taken');
    const salt=randomBytes(16).toString('hex');
    const account={id:id(),username,salt,hash:scryptSync(password,salt,64).toString('hex'),joinedAt:new Date().toISOString()};
    db.users.push(account);startSession(res,account,req);await persist();
    return respond(res,201,{user:publicAccount(account)});
  }
  if(pathname==='/api/login' && req.method==='POST') {
    if(limited(req,'login',15,600000))return fail(res,429,'Too many sign-in attempts');
    const username=cleanLine(body.username,30);const password=body.password;
    const found=db.users.find(u=>u.username.toLowerCase()===username.toLowerCase());
    if(typeof password!=='string'||!found)return fail(res,401,'Incorrect username or password');
    const actual=scryptSync(password,found.salt,64);
    if(!timingSafeEqual(actual,Buffer.from(found.hash,'hex')))return fail(res,401,'Incorrect username or password');
    startSession(res,found,req);await persist();return respond(res,200,{user:publicAccount(found)});
  }
  if(pathname==='/api/logout' && req.method==='POST') {
    const token=parseCookie(req.headers.cookie).lightning_session;
    if(token)db.sessions=db.sessions.filter(s=>s.hash!==tokenHash(token));
    res.setHeader('Set-Cookie','lightning_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    await persist();return respond(res,200,{ok:true});
  }
  if(!user)return fail(res,401,'Sign in to use this feature');
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
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
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
    res.writeHead(200,{'Content-Type':type,'Content-Length':content.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Cache-Control':filepath.includes('/assets/')?'public, max-age=3600':'no-cache'});
    return res.end(req.method==='HEAD'?undefined:content);
  }catch{return fail(res,404,'File not found');}
}
export function createServer(){return http.createServer(async(req,res)=>{
  try {const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/'))await handleAPI(req,res,url);
    else await staticFile(req,res,url);
  } catch(error) {console.error('Request error:',error.message);if(!res.headersSent)fail(res,error.message==='Request is too large'?413:400,error.message||'Request failed');else res.end();}
});}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  createServer().listen(PORT,()=>console.log(`✦ Celestial running at http://localhost:${PORT}`));
}
export {validateTheme};
