/**
 * Encrypted at-rest snapshots of discoverable external game assets.
 *
 * Scramjet and Ultraviolet still handle live execution. Never put the key
 * into a client bundle, write a plaintext asset to disk, or fetch arbitrary
 * hosts supplied by a distributor manifest.
 */
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,readdir,rename,stat,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';

const MAGIC=Buffer.from('CGA1');
const AAD=Buffer.from('celestial:external-game-assets:v1');
const IV_BYTES=12;
const TAG_BYTES=16;
const MAX_FILES=36;
const MAX_FILE_BYTES=8*1024*1024;
const MAX_TOTAL_BYTES=32*1024*1024;
const MAX_ARCHIVE_BYTES=45*1024*1024;
const ARCHIVE_TTL_MS=24*60*60*1000;
const FAILURE_RETRY_MS=10*60*1000;
const MAX_REDIRECTS=3;
const MAX_HOST_URL=2048;
const MAX_ARCHIVES=128;
const MAX_PARALLEL_CAPTURES=2;
const MAX_VAULT_BYTES=512*1024*1024;

const knownTypes=new Set([
 'text/html','text/css','text/javascript','application/javascript',
 'application/x-javascript','application/wasm','application/json',
 'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
 'image/avif','image/x-icon','font/woff','font/woff2',
 'audio/mpeg','audio/ogg','audio/wav','video/mp4','video/webm',
 'application/octet-stream'
]);
const typeByExtension={
 html:'text/html',htm:'text/html',js:'text/javascript',mjs:'text/javascript',
 css:'text/css',wasm:'application/wasm',json:'application/json',
 png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',
 webp:'image/webp',svg:'image/svg+xml',avif:'image/avif',ico:'image/x-icon',
 woff:'font/woff',woff2:'font/woff2',mp3:'audio/mpeg',ogg:'audio/ogg',
 wav:'audio/wav',mp4:'video/mp4',webm:'video/webm'
};

function checkKey(key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw Error('A 256-bit game vault key is required');
}
function cacheId(handle,index){
 if(!/^g_[a-zA-Z0-9_-]{24}$/.test(handle)||!Number.isInteger(index)||index<0||index>999)
  throw Error('Invalid external game handle');
 return createHash('sha256').update(handle+':'+index).digest('hex');
}
function allowedHost(host,sourceName){
 const name=String(sourceName||'');
 if(name==='Selenite')return host==='selenite.cc'||host.endsWith('.selenite.cc');
 if(name==='WASM.rip')return host==='wasm.rip'||host.endsWith('.wasm.rip');
 if(name==='GN-Math')return new Set([
  'raw.githack.com','raw.githubusercontent.com','gn-math.github.io'
 ]).has(host);
 return false;
}
export function safeGameAssetUrl(value,sourceName){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.port||url.username||url.password||
    url.href.length>MAX_HOST_URL||!allowedHost(url.hostname,sourceName))
   return null;
  url.hash='';
  return url.href;
 }catch{return null}
}
function assetMime(url,header){
 const type=String(header||'').split(';')[0].trim().toLowerCase();
 const ext=new URL(url).pathname.split('/').pop().split('.').pop().toLowerCase();
 const fallback=typeByExtension[ext];
 return knownTypes.has(type)?type:(fallback||null);
}
function hrefs(content,base,mime){
 const links=[];
 const add=raw=>{
  const candidate=String(raw||'').trim().replace(/&amp;/gi,'&');
  if(!candidate||candidate.startsWith('#')||/^(?:data:|blob:|javascript:|mailto:)/i.test(candidate))return;
  try{links.push(new URL(candidate,base).href)}catch{}
 };
 if(mime==='text/html'){
  // Static linked resources only; never attempt to evaluate third-party JS.
  for(const match of content.matchAll(/<(?:script|link|img|source|video|audio|iframe|embed|object)\b[^>]*?\b(?:src|href|data)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi))
   add(match[1]||match[2]);
  for(const match of content.matchAll(/\bsrcset\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)){
   for(const part of (match[1]||match[2]).split(','))add(part.trim().split(/\s+/)[0]);
  }
 }
 if(mime==='text/css'){
  for(const match of content.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)]+))\s*\)/gi))
   add(match[1]||match[2]||match[3]);
  for(const match of content.matchAll(/@import\s+(?:"([^"]+)"|'([^']+)')/gi))add(match[1]||match[2]);
 }
 if(mime==='text/javascript'||mime==='application/javascript'||mime==='application/x-javascript'){
  for(const match of content.matchAll(/\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?["']([^"']+)["']/g))add(match[1]);
  for(const match of content.matchAll(/\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g))add(match[1]);
 }
 return links;
}
export function sealAssetArchive(data,key){
 checkKey(key);
 const clear=Buffer.from(JSON.stringify(data),'utf8');
 if(clear.length>MAX_ARCHIVE_BYTES)throw Error('Game snapshot is too large');
 const iv=randomBytes(IV_BYTES),cipher=createCipheriv('aes-256-gcm',key,iv,{authTagLength:TAG_BYTES});
 cipher.setAAD(AAD);
 const ciphertext=Buffer.concat([cipher.update(clear),cipher.final()]);
 return Buffer.concat([MAGIC,iv,cipher.getAuthTag(),ciphertext]);
}
export function openAssetArchive(data,key){
 checkKey(key);
 const buf=Buffer.from(data);
 if(buf.length<33||buf.length>MAX_ARCHIVE_BYTES+32||!buf.subarray(0,4).equals(MAGIC))
  throw Error('Invalid encrypted game snapshot');
 const cipher=createDecipheriv('aes-256-gcm',key,buf.subarray(4,16),{authTagLength:TAG_BYTES});
 cipher.setAAD(AAD);
 cipher.setAuthTag(buf.subarray(16,32));
 const clear=Buffer.concat([cipher.update(buf.subarray(32)),cipher.final()]);
 const archive=JSON.parse(clear.toString('utf8'));
 if(!archive||typeof archive.savedAt!=='number'||!Array.isArray(archive.assets)||
    archive.assets.length>MAX_FILES||!archive.assets.every(item=>
     item&&typeof item.url==='string'&&typeof item.data==='string'))
  throw Error('Invalid decrypted game asset snapshot');
 return archive;
}
async function responseBuffer(response,maxBytes){
 const advertised=Number(response.headers.get('content-length')||0);
 if(advertised>maxBytes)throw Error('Game asset exceeds per-file limit');
 const reader=response.body?.getReader();
 if(!reader)throw Error('Empty game asset response');
 const parts=[];
 let size=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes)throw Error('Game asset exceeded per-file limit');
   parts.push(Buffer.from(value));
  }
 }catch(error){
  await reader.cancel().catch(()=>{});
  throw error;
 }
 return Buffer.concat(parts,size);
}
async function getAsset(url,sourceName,fetcher,room){
 let current=safeGameAssetUrl(url,sourceName);
 if(!current)return null;
 for(let hop=0;hop<=MAX_REDIRECTS;hop++){
  const response=await fetcher(current,{
   redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{Accept:'*/*','User-Agent':'CelestialGameVault/1.0'}
  });
  if(response.status>=300&&response.status<400){
   const next=response.headers.get('location');
   if(!next)return null;
   current=safeGameAssetUrl(new URL(next,current).href,sourceName);
   if(!current)return null;
   continue;
  }
  if(!response.ok)return null;
  const type=assetMime(current,response.headers.get('content-type'));
  if(!type)return null;
  const buffer=await responseBuffer(response,Math.min(room,MAX_FILE_BYTES));
  return {url:current,type,bytes:buffer.byteLength,data:buffer.toString('base64')};
 }
 return null;
}
export async function createEncryptedGameAssetCache({
 directory,key,fetcher=fetch,now=Date.now
}={}){
 checkKey(key);
 if(!directory)throw Error('Encrypted asset cache directory is required');
 await mkdir(directory,{recursive:true,mode:0o700});
 const running=new Map(),attempts=new Map();
 let activeCaptures=0;
 const location=(handle,index)=>path.join(directory,cacheId(handle,index)+'.enc');
 async function load(handle,index){
  return openAssetArchive(await readFile(location(handle,index)),key);
 }
 async function status(handle,index){
  try{
   const archive=await load(handle,index);
   return {
    encrypted:true,cached:true,files:archive.assets.length,
    bytes:archive.bytes,partial:archive.partial,savedAt:archive.savedAt
   };
  }catch(error){
   if(error.code!=='ENOENT'&&error.message!=='Invalid encrypted game snapshot')
    console.warn('Game asset cache could not be read:',error.message);
   return {encrypted:true,cached:false,files:0,bytes:0};
  }
 }
 async function prune(){
  const entries=await readdir(directory);
  const records=[];
  for(const name of entries){
   if(!/^[a-f0-9]{64}\.enc$/.test(name))continue;
   try{
    const info=await stat(path.join(directory,name));
    records.push({name,mtime:info.mtimeMs,size:info.size});
   }catch{}
  }
  records.sort((a,b)=>b.mtime-a.mtime);
  let size=0;
  for(const [index,item] of records.entries()){
   size+=item.size;
   if(index<MAX_ARCHIVES&&size<=MAX_VAULT_BYTES)continue;
   await unlink(path.join(directory,item.name)).catch(()=>{});
   size-=item.size;
  }
 }
 async function capture({handle,index,sourceName,url}){
  const id=cacheId(handle,index);
  const start=safeGameAssetUrl(url,sourceName);
  if(!start)throw Error('External game host is not approved for caching');
  if(running.has(id))return running.get(id);
  // Ignore surplus snapshot work instead of allowing logins to spawn an
  // unbounded fleet of third-party downloads. Live game play is unaffected.
  if(activeCaptures>=MAX_PARALLEL_CAPTURES)return status(handle,index);
  const lastTry=attempts.get(id)||0;
  if(now()-lastTry<FAILURE_RETRY_MS)return status(handle,index);
  activeCaptures++;
  const job=(async()=>{
   try{
    const existing=await load(handle,index).catch(()=>null);
    if(existing&&now()-existing.savedAt<ARCHIVE_TTL_MS)return status(handle,index);
    attempts.set(id,now());
    const seen=new Set(),queue=[start],assets=[];
    let total=0,partial=false;
    while(queue.length&&assets.length<MAX_FILES&&total<MAX_TOTAL_BYTES){
     const candidate=queue.shift();
     const safe=safeGameAssetUrl(candidate,sourceName);
     if(!safe||seen.has(safe))continue;
     seen.add(safe);
     try{
      const asset=await getAsset(safe,sourceName,fetcher,MAX_TOTAL_BYTES-total);
      if(!asset){partial=true;continue}
      assets.push(asset);
      total+=asset.bytes;
      if(['text/html','text/css','text/javascript','application/javascript','application/x-javascript'].includes(asset.type)){
       const decoded=Buffer.from(asset.data,'base64').toString('utf8');
       for(const href of hrefs(decoded,asset.url,asset.type)){
        const next=safeGameAssetUrl(href,sourceName);
        if(next&&!seen.has(next)&&!queue.includes(next))queue.push(next);
       }
      }
     }catch{partial=true}
    }
    if(queue.length)partial=true;
    if(!assets.length)throw Error('No approved assets could be securely cached');
    const record={savedAt:now(),entry:start,assets,bytes:total,partial};
    const encrypted=sealAssetArchive(record,key);
    const temp=location(handle,index)+'.'+randomBytes(6).toString('hex')+'.tmp';
    try{
     await writeFile(temp,encrypted,{flag:'wx',mode:0o600});
     await rename(temp,location(handle,index));
    }catch(error){await unlink(temp).catch(()=>{});throw error}
    await prune().catch(error=>console.warn('Asset vault pruning failed:',error.message));
    return status(handle,index);
   }finally{running.delete(id);activeCaptures--}
  })();
  running.set(id,job);
  return job;
 }
 return {capture,status,load};
}
