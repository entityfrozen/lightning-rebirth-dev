// The game catalog is public metadata, not an encrypted asset.
// Fetch only the three approved distributor manifests; keep these URLs
// server-side so the Boba shell never depends on cross-origin JSON requests.
const SOURCES=[
  ['Selenite','https://selenite.cc/resources/games.json'],
  ['WASM.rip','https://wasm.rip/games.json'],
  ['GN-Math','https://raw.githubusercontent.com/gn-math/assets/main/zones.json']
];
const ORIGINALS=new Set(['2048','tictactoe','rockpaperscissors']);
const MAX_ENTRIES=3000;
const CACHE_MS=6*60*60*1000;
let cache=null,cacheExpires=0,pending=null;

export function gameKey(name){
  return String(name||'').normalize('NFKD').toLowerCase()
    .replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
}
const httpsUrl=(raw,base)=>{
  if(typeof raw!=='string'||!raw.trim())return '';
  try{const url=new URL(raw,base);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}
  catch{return ''}
};
const replaceGN=value=>String(value||'')
  .replaceAll('{COVER_URL}','https://raw.githubusercontent.com/gn-math/covers/main')
  .replaceAll('{HTML_URL}','https://raw.githack.com/gn-math/html/main');

export function normalizeGame(source,item){
  if(!item||typeof item.name!=='string'||!item.name.trim()||item.id===-1)return null;
  const name=item.name.trim().slice(0,120),key=gameKey(name);
  if(!key||ORIGINALS.has(key))return null;
  let url='',cover='',creator='';
  if(source==='Selenite'){
    if(!/^[a-zA-Z0-9_-]+$/.test(item.directory||''))return null;
    const base='https://selenite.cc/resources/semag/'+item.directory+'/';
    url=httpsUrl('index.html',base);
    cover=httpsUrl(item.image,base);
    creator=item.author;
  }else if(source==='WASM.rip'){
    url=httpsUrl(item.gameUrl,'https://wasm.rip/');
    cover=httpsUrl(item.imageUrl,'https://wasm.rip/');
    creator=item.porter;
  }else if(source==='GN-Math'){
    url=httpsUrl(replaceGN(item.url),'https://gn-math.github.io/');
    cover=httpsUrl(replaceGN(item.cover),'https://gn-math.github.io/');
    creator=item.author;
  }else return null;
  if(!url)return null;
  return {id:key,name,source,url,cover,creator:String(creator||'').slice(0,120)};
}

export function mergeCatalogs(catalogs){
  const map=new Map();
  for(const [source,items] of catalogs){
    if(!Array.isArray(items))continue;
    for(const item of items.slice(0,MAX_ENTRIES)){
      const next=normalizeGame(source,item);
      if(!next)continue;
      const existing=map.get(next.id)||{id:next.id,name:next.name,sources:[]};
      if(!existing.sources.some(s=>s.url===next.url)){
        existing.sources.push({name:next.source,url:next.url,cover:next.cover,creator:next.creator});
      }
      map.set(next.id,existing);
    }
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

export async function getGameCatalog({fetcher=fetch,refresh=false}={}){
  if(!refresh&&cache&&Date.now()<cacheExpires)return cache;
  if(!refresh&&pending)return pending;
  const work=(async()=>{
    const failures=[];
    const results=await Promise.all(SOURCES.map(async ([name,url])=>{
      try{
        const response=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{'Accept':'application/json'}});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const payload=await response.json();
        if(!Array.isArray(payload))throw new Error('Unexpected manifest');
        return [name,payload];
      }catch{
        failures.push(name);
        return [name,[]];
      }
    }));
    const games=mergeCatalogs(results);
    // A temporary distributor outage must not erase a good cache.
    if(!games.length&&cache)return {...cache,stale:true,unavailable:failures};
    const response={games,total:games.length,unavailable:failures,updatedAt:new Date().toISOString()};
    if(games.length){cache=response;cacheExpires=Date.now()+CACHE_MS;}
    return response;
  })();
  pending=work;
  try{return await work;}finally{if(pending===work)pending=null;}
}
