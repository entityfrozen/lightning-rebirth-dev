import {esc} from './common.js';
import {createProxyFrame,disposeProxyFrame} from './proxy.js';
import {createUltravioletFrame} from './uv-proxy.js';

const DISTRIBUTORS=[
  ['All','All titles'],
  ['Selenite','Selenite'],
  ['WASM.rip','WASM.rip'],
  ['GN-Math','GN-Math']
];
const PAGE_SIZE=72;

export function mountDistributorLibrary(root,{launch}){
  const section=document.createElement('section');
  section.className='cel-dist-section';
  section.innerHTML=`
    <header class="cel-dist-header">
      <div><span class="cel-home-kicker">ARCADE LIBRARY</span><h2>Discover more.</h2>
      <p>Titles from Selenite, WASM.rip and GN-Math, in one library.</p></div>
      <span class="cel-dist-count" data-count>Loading library…</span>
    </header>
    <div class="cel-dist-filters" data-filters role="group" aria-label="Arcade sources"></div>
    <p class="cel-dist-status" data-status role="status">Loading distributor entries…</p>
    <div class="cel-dist-grid" data-grid></div>
    <button class="btn s cel-dist-more" type="button" data-more hidden>Show more entries</button>
    <footer class="cel-dist-credits">
      <strong>Library credits</strong>
      <p>With thanks to <a href="https://selenite.cc/" target="_blank" rel="noopener noreferrer">Selenite</a>,
      <a href="https://wasm.rip/" target="_blank" rel="noopener noreferrer">WASM.rip</a>, and
      <a href="https://gn-math.github.io/" target="_blank" rel="noopener noreferrer">GN-Math</a>.
      Each game and its cover artwork belong to their respective developers and porters.
      Individual credits and alternate sources appear when you select a game.</p>
    </footer>`;
  const arcade=root.querySelector('.arcade-shell');
  if(!arcade)throw Error('Arcade container is missing');
  arcade.append(section);
  const grid=section.querySelector('[data-grid]');
  const status=section.querySelector('[data-status]');
  const count=section.querySelector('[data-count]');
  const more=section.querySelector('[data-more]');
  const filters=section.querySelector('[data-filters]');
  let entries=[],filter='All',query='',limit=PAGE_SIZE,unavailable=[];
  filters.innerHTML=DISTRIBUTORS.map(([id,label])=>'<button type="button" data-filter="'+esc(id)+'">'+esc(label)+'</button>').join('');
  function paint(){
    const needle=query.toLocaleLowerCase();
    const results=entries.filter(game=>(filter==='All'||game.sources.some(s=>s.name===filter))&&
      (!needle||game.name.toLocaleLowerCase().includes(needle)||
      game.sources.some(source=>source.name.toLowerCase().includes(needle))));
    count.textContent=results.length.toLocaleString()+' entries';
    status.textContent=unavailable.length?'Some catalogs are unavailable: '+unavailable.join(', ')+'.':'';
    grid.innerHTML=results.slice(0,limit).map(game=>{
      const art=game.sources.find(s=>s.name===filter&&s.cover)||game.sources.find(s=>s.cover)||game.sources[0];
      return '<button class="cel-dist-card" type="button" data-entry-index="'+entries.indexOf(game)+'" aria-label="Play '+esc(game.name)+'">'+
        '<span class="cel-dist-art"><span class="cel-dist-fallback">'+esc(game.name)+'</span>'+
        (art.cover?'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+esc(art.cover)+'" alt="">':'')+
        '</span><span class="cel-dist-name">'+esc(game.name)+'</span>'+
        '<small>'+esc(game.sources.map(s=>s.name).join(' · '))+'</small></button>';
    }).join('')||(entries.length?'<p class="cel-dist-empty">No entries match this search.</p>':'');
    for(const img of grid.querySelectorAll('img'))img.addEventListener('error',()=>img.remove(),{once:true});
    more.hidden=results.length<=limit;
    for(const btn of filters.querySelectorAll('[data-filter]')){
      btn.setAttribute('aria-pressed',String(btn.dataset.filter===filter));
    }
  }
  filters.addEventListener('click',event=>{
    const b=event.target.closest('[data-filter]');if(!b)return;
    filter=b.dataset.filter;limit=PAGE_SIZE;paint();
  });
  more.onclick=()=>{limit+=PAGE_SIZE;paint()};
  grid.onclick=event=>{
    const button=event.target.closest('[data-entry-index]');if(!button)return;
    const index=Number(button.dataset.entryIndex);
    const game=Number.isInteger(index)&&index>=0?entries[index]:null;
    if(game)launch(game);
  };
  async function reload(){
    status.textContent='Loading Selenite, WASM.rip and GN-Math…';
    try{
      const response=await fetch('/api/games/catalog',{credentials:'same-origin'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.games))throw Error('Invalid library data');
      entries=data.games;unavailable=Array.isArray(data.unavailable)?data.unavailable:[];
      paint();
    }catch{
      status.innerHTML='arcade library unavailable. <button type="button" class="btn s" data-retry>Retry</button>';
      status.querySelector('[data-retry]').onclick=reload;
      count.textContent='Unavailable';
    }
  }
  reload();
  return {
    section,
    setQuery(value){query=String(value||'').trim();limit=PAGE_SIZE;paint()},
    hide(){section.hidden=true},
    show(){section.hidden=false}
  };
}

async function resolveExternalGameUrl(game,source,sourceIndex){
 // Built-in specials can supply a URL directly. Distributor entries carry
 // only opaque IDs: request the original source when the player launches it.
 if(source.url)return source.url;
 if(!/^g_[a-zA-Z0-9_-]{24}$/.test(game.id||''))throw Error('Game source is unavailable');
 const endpoint='/api/games/resolve?id='+encodeURIComponent(game.id)+'&source='+sourceIndex;
 const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
 if(!response.ok)throw Error('Unable to resolve game (HTTP '+response.status+')');
 const payload=await response.json();
 if(typeof payload.url!=='string'||!payload.url.startsWith('https://'))
  throw Error('The game source URL is invalid');
 return payload.url;
}

export function openDistributorGame(stage,game){
 stage.replaceChildren();
 const bar=document.createElement('div');bar.className='cel-dist-player-toolbar';
 const sourceSelect=document.createElement('select');sourceSelect.setAttribute('aria-label','Choose source');
 for(const [index,source] of game.sources.entries()){
  const option=document.createElement('option');option.value=String(index);option.textContent=source.name;sourceSelect.append(option);
 }
 const modeSelect=document.createElement('select');
 modeSelect.setAttribute('aria-label','Embedding mode');
 for(const [value,label] of [['proxy','Scramjet proxy'],['ultraviolet','Ultraviolet proxy'],['direct','Direct embed']]){
  const option=document.createElement('option');option.value=value;option.textContent=label;modeSelect.append(option);
 }
 // The about:blank wrapper can't guarantee Scramjet's isolation requirements.
 if(window.self!==window.top)modeSelect.value='ultraviolet';
 const sourceLink=document.createElement('a');sourceLink.className='btn s';sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.textContent='Open original';
 const fullscreen=document.createElement('button');fullscreen.className='btn s';fullscreen.textContent='Fullscreen';
 const notice=document.createElement('p');notice.className='arcade-help';notice.setAttribute('role','status');
 let frame=document.createElement('iframe');frame.className='cel-dist-frame';frame.title=game.name;
 frame.referrerPolicy='no-referrer';
 frame.allow='fullscreen; gamepad; autoplay; clipboard-write; encrypted-media';
 frame.setAttribute('allowfullscreen','');
 const attribution=document.createElement('p');attribution.className='cel-dist-attribution';
 let proxyFrame=null,uvFrame=null,epoch=0,disposed=false;
 async function switchSource(){
  const item=game.sources[Number(sourceSelect.value)];
  if(!item)return;
  const run=++epoch;
  if(proxyFrame){disposeProxyFrame(proxyFrame);proxyFrame=null}
  if(uvFrame){uvFrame.dispose();uvFrame=null}
  const replacement=document.createElement('iframe');
  replacement.className='cel-dist-frame';replacement.title=game.name;
  replacement.referrerPolicy='no-referrer';
  replacement.allow='fullscreen; gamepad; autoplay; clipboard-write; encrypted-media';
  replacement.setAttribute('allowfullscreen','');
  frame.replaceWith(replacement);frame=replacement;
  sourceLink.removeAttribute('href');
  attribution.textContent='Source: '+item.name+(item.creator?' · Credit: '+item.creator:'')+' · Artwork and rights belong to their respective creators.';
  notice.textContent='Preparing game source…';
  let target;
  try{
   target=await resolveExternalGameUrl(game,item,Number(sourceSelect.value));
   if(disposed||run!==epoch)return;
  }catch(error){
   if(disposed||run!==epoch)return;
   notice.textContent='Unable to open this game: '+String(error.message||'Source not found')+'. Try another source.';
   return;
  }
  sourceLink.href=target;
  if(modeSelect.value==='direct'){
   notice.textContent='Direct embed enabled. Some websites block iframe embedding; use Scramjet or Open original if this stays blank.';
   frame.src=target;
   return;
  }
  if(modeSelect.value==='ultraviolet'){
   notice.textContent='Starting Ultraviolet…';
   try{
    const connection=await createUltravioletFrame(frame,target);
    if(disposed||run!==epoch){connection.dispose();return}
    uvFrame=connection;
    notice.textContent='Ultraviolet is loading. If this page stays blank, try Scramjet or Open original.';
   }catch(error){
    if(disposed||run!==epoch)return;
    notice.textContent='Ultraviolet error: '+String(error.message||'Connection failed')+'. Try Scramjet or Open original.';
   }
   return;
  }
  notice.textContent='Connecting through Scramjet…';
  try{
   const statusResponse=await fetch('/api/browser/status',{credentials:'same-origin'});
   if(!statusResponse.ok)throw Error('Proxy status unavailable (HTTP '+statusResponse.status+')');
   const status=await statusResponse.json();
   if(!status.authenticated)throw Error('Sign in to use Scramjet');
   if(!status.proxy)throw Error('Scramjet backend is unavailable');
   const controllerFrame=await createProxyFrame(frame);
   if(disposed||run!==epoch){disposeProxyFrame(controllerFrame);return}
   proxyFrame=controllerFrame;
   controllerFrame.go(target);
   notice.textContent='Scramjet is loading this page. If it stays blank, try Direct embed or Open original.';
  }catch(error){
   if(disposed||run!==epoch)return;
   notice.textContent='Scramjet failed: '+String(error.message||'Unavailable')+'. Switching to direct embed.';
   modeSelect.value='direct';
   frame.src=target;
  }
 }
 sourceSelect.onchange=switchSource;
 modeSelect.onchange=switchSource;
 fullscreen.onclick=()=>frame.requestFullscreen?.();
 bar.append(sourceSelect,modeSelect,sourceLink,fullscreen);
 stage.append(bar,frame,notice,attribution);
 switchSource();
 return()=>{disposed=true;epoch++;disposeProxyFrame(proxyFrame);proxyFrame=null;uvFrame?.dispose();uvFrame=null;frame.removeAttribute('src')};
}
