import {esc} from './common.js';
import {createProxyFrame,disposeProxyFrame} from './proxy.js';

const DISTRIBUTORS=[
  ['All','All games'],
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
      <div><span class="cel-home-kicker">GAME LIBRARY</span><h2>Discover more.</h2>
      <p>Games from Selenite, WASM.rip and GN-Math, in one library.</p></div>
      <span class="cel-dist-count" data-count>Loading library…</span>
    </header>
    <div class="cel-dist-filters" data-filters role="group" aria-label="Game distributors"></div>
    <p class="cel-dist-status" data-status role="status">Loading distributor games…</p>
    <div class="cel-dist-grid" data-grid></div>
    <button class="btn s cel-dist-more" type="button" data-more hidden>Show more games</button>
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
  let games=[],filter='All',query='',limit=PAGE_SIZE,unavailable=[];
  filters.innerHTML=DISTRIBUTORS.map(([id,label])=>'<button type="button" data-filter="'+esc(id)+'">'+esc(label)+'</button>').join('');
  function paint(){
    const needle=query.toLocaleLowerCase();
    const results=games.filter(game=>(filter==='All'||game.sources.some(s=>s.name===filter))&&
      (!needle||game.name.toLocaleLowerCase().includes(needle)||
      game.sources.some(source=>source.name.toLowerCase().includes(needle))));
    count.textContent=results.length.toLocaleString()+' games';
    status.textContent=unavailable.length?'Some catalogs are unavailable: '+unavailable.join(', ')+'.':'';
    grid.innerHTML=results.slice(0,limit).map(game=>{
      const art=game.sources.find(s=>s.name===filter&&s.cover)||game.sources.find(s=>s.cover)||game.sources[0];
      return '<button class="cel-dist-card" type="button" data-game="'+esc(game.id)+'" aria-label="Play '+esc(game.name)+'">'+
        '<span class="cel-dist-art"><span class="cel-dist-fallback">'+esc(game.name)+'</span>'+
        (art.cover?'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+esc(art.cover)+'" alt="">':'')+
        '</span><span class="cel-dist-name">'+esc(game.name)+'</span>'+
        '<small>'+esc(game.sources.map(s=>s.name).join(' · '))+'</small></button>';
    }).join('')||(games.length?'<p class="cel-dist-empty">No games match this search.</p>':'');
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
    const button=event.target.closest('[data-game]');if(!button)return;
    const game=games.find(item=>item.id===button.dataset.game);
    if(game)launch(game);
  };
  async function reload(){
    status.textContent='Loading Selenite, WASM.rip and GN-Math…';
    try{
      const response=await fetch('/api/games/catalog',{credentials:'same-origin'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.games))throw Error('Invalid library data');
      games=data.games;unavailable=Array.isArray(data.unavailable)?data.unavailable:[];
      paint();
    }catch{
      status.innerHTML='Game library unavailable. <button type="button" class="btn s" data-retry>Retry</button>';
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

export function openDistributorGame(stage,game){
 stage.replaceChildren();
 const bar=document.createElement('div');bar.className='cel-dist-player-toolbar';
 const sourceSelect=document.createElement('select');sourceSelect.setAttribute('aria-label','Choose source');
 for(const [index,source] of game.sources.entries()){
  const option=document.createElement('option');option.value=String(index);option.textContent=source.name;sourceSelect.append(option);
 }
 const modeSelect=document.createElement('select');
 modeSelect.setAttribute('aria-label','Embedding mode');
 for(const [value,label] of [['direct','Direct embed'],['proxy','Scramjet proxy']]){
  const option=document.createElement('option');option.value=value;option.textContent=label;modeSelect.append(option);
 }
 const sourceLink=document.createElement('a');sourceLink.className='btn s';sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.textContent='Open original';
 const fullscreen=document.createElement('button');fullscreen.className='btn s';fullscreen.textContent='Fullscreen';
 const notice=document.createElement('p');notice.className='arcade-help';notice.setAttribute('role','status');
 const frame=document.createElement('iframe');frame.className='cel-dist-frame';frame.title=game.name;
 frame.referrerPolicy='no-referrer';
 frame.allow='fullscreen; gamepad; autoplay; clipboard-write; encrypted-media';
 frame.setAttribute('allowfullscreen','');
 const attribution=document.createElement('p');attribution.className='cel-dist-attribution';
 let proxyFrame=null,epoch=0,disposed=false;
 async function switchSource(){
  const item=game.sources[Number(sourceSelect.value)];
  if(!item)return;
  const run=++epoch;
  if(proxyFrame){disposeProxyFrame(proxyFrame);proxyFrame=null}
  frame.removeAttribute('src');
  sourceLink.href=item.url;
  attribution.textContent='Source: '+item.name+(item.creator?' · Credit: '+item.creator:'')+' · Artwork and rights belong to their respective creators.';
  if(modeSelect.value==='direct'){
   notice.textContent='Direct embed enabled. Some websites block iframe embedding; use Scramjet or Open original if this stays blank.';
   frame.src=item.url;
   return;
  }
  notice.textContent='Connecting through Scramjet…';
  try{
   const controllerFrame=await createProxyFrame(frame);
   if(disposed||run!==epoch){disposeProxyFrame(controllerFrame);return}
   proxyFrame=controllerFrame;
   controllerFrame.go(item.url);
   notice.textContent='Scramjet is connecting. If this page does not load, switch to Direct embed or Open original.';
  }catch(error){
   if(disposed||run!==epoch)return;
   notice.textContent='Scramjet failed: '+String(error.message||'Unavailable')+'. Switching to direct embed.';
   modeSelect.value='direct';
   frame.src=item.url;
  }
 }
 sourceSelect.onchange=switchSource;
 modeSelect.onchange=switchSource;
 fullscreen.onclick=()=>frame.requestFullscreen?.();
 bar.append(sourceSelect,modeSelect,sourceLink,fullscreen);
 stage.append(bar,frame,notice,attribution);
 switchSource();
 return()=>{disposed=true;epoch++;disposeProxyFrame(proxyFrame);proxyFrame=null;frame.removeAttribute('src')};
}
