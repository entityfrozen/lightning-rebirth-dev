// A bounded image fetcher for the public artwork already referenced by the
// distributor catalog. Never accepts a client-supplied URL.
const MAX_BYTES=2*1024*1024;
const TTL=60*60*1000;
const MAX_CACHE_BYTES=24*1024*1024;
const MAX_ENTRIES=64;
const ALLOWED_TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif']);
const cache=new Map();
let cacheBytes=0;

export function approvedCoverUrl(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return null;
  const host=url.hostname.toLowerCase();
  if(host!=='selenite.cc'&&!host.endsWith('.selenite.cc')&&
     host!=='wasm.rip'&&!host.endsWith('.wasm.rip')&&
     host!=='gn-math.github.io'&&
     !(host==='raw.githubusercontent.com'&&url.pathname.startsWith('/gn-math/')))return null;
  return url.href;
 }catch{return null}
}

function store(url,value){
 const bytes=value.content.byteLength;
 if(bytes>MAX_CACHE_BYTES)return;
 if(cache.has(url)){cacheBytes-=cache.get(url).content.byteLength;cache.delete(url)}
 cache.set(url,{...value,expires:Date.now()+TTL});
 cacheBytes+=bytes;
 while(cache.size>MAX_ENTRIES||cacheBytes>MAX_CACHE_BYTES){
  const key=cache.keys().next().value;
  cacheBytes-=cache.get(key).content.byteLength;
  cache.delete(key);
 }
}

export async function loadCover(url,{fetcher=fetch,timeoutMs=9000}={}){
 const approved=approvedCoverUrl(url);
 if(!approved)throw Error('Cover host is not approved');
 const cached=cache.get(approved);
 if(cached&&cached.expires>Date.now()){
  cache.delete(approved);cache.set(approved,cached);
  return {contentType:cached.contentType,content:cached.content};
 }
 if(cached){cache.delete(approved);cacheBytes-=cached.content.byteLength}
 const response=await fetcher(approved,{
  redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
  headers:{'Accept':'image/avif,image/webp,image/png,image/jpeg,image/gif'}
 });
 if(!response.ok)throw Error('Artwork fetch returned HTTP '+response.status);
 const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 if(!ALLOWED_TYPES.has(type))throw Error('Unsupported artwork content type');
 const declared=Number(response.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>MAX_BYTES)throw Error('Artwork exceeds size limit');
 if(!response.body)throw Error('Artwork response has no body');
 const pieces=[];
 let total=0;
 const reader=response.body.getReader();
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>MAX_BYTES)throw Error('Artwork exceeds size limit');
   pieces.push(Buffer.from(value));
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 if(!total)throw Error('Empty artwork');
 const value={contentType:type,content:Buffer.concat(pieces,total)};
 store(approved,value);
 return value;
}
