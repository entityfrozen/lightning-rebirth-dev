import {$,$$,esc,ico,api} from './common.js';

// Local Originals run inside Celestial. Distributor links use the same
// Scramjet browser tab instead of pointing to a different Celestial page.
const distributors=[
 {name:'Selenite',url:'https://selenite.cc/',credit:'Selenite and the original game authors'},
 {name:'WASM.rip',url:'https://wasm.rip/',credit:'WASM.rip porters and the original creators'},
 {name:'GN-Math',url:'https://gn-math.github.io/',credit:'GN-Math and the original creators'}
];
const favoritesKey='celestial.apps.favorites';
const favorites=()=>{try{const v=JSON.parse(localStorage.getItem(favoritesKey)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const safe=(value,base)=>{try{const u=new URL(String(value||''),base);return u.protocol==='https:'?u.href:''}catch{return ''}};
const idFor=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const local=[{id:'2048',name:'2048',source:'Celestial',genre:'Puzzle',kind:'local',sources:[]}];
const matrix=n=>Array.from({length:n},()=>Array(n).fill(0));
function make2048(root){
 let tiles=matrix(4),score=0,won=false,history=null;
 const spawn=()=>{const empty=[];tiles.forEach((row,r)=>row.forEach((v,c)=>{if(!v)empty.push([r,c])}));if(!empty.length)return;const [r,c]=empty[Math.floor(Math.random()*empty.length)];tiles[r][c]=Math.random()<.9?2:4};
 const moveLeft=a=>{const n=a.filter(Boolean),out=[];let gained=0;for(let i=0;i<n.length;i++){if(n[i]===n[i+1]){const v=n[i]*2;out.push(v);gained+=v;i++}else out.push(n[i])}while(out.length<4)out.push(0);return {out,gained}};
 const draw=()=>{root.querySelector('[data-score]').textContent=score;const best=Math.max(score,Number(localStorage.getItem('celestial.games.2048.best')||0));localStorage.setItem('celestial.games.2048.best',String(best));root.querySelector('[data-best]').textContent=best;root.querySelector('[data-board]').innerHTML=tiles.flat().map(v=>'<div class="native-2048-cell" data-value="'+v+'">'+(v||'')+'</div>').join('');root.querySelector('[data-undo]').disabled=!history;root.querySelector('[data-win]').textContent=won?'2048 reached! Keep going.':(!tiles.flat().includes(0)&&!tiles.some((r,i)=>r.some((v,j)=>v===(r[j+1]||-1)||v===(tiles[i+1]?.[j]||-1)))?'Game over. Start a new round.':'')};
 function shift(dir){const old=tiles.map(r=>r.slice()),oldScore=score;
  if(dir==='left'||dir==='right'){tiles=tiles.map(row=>{const {out,gained}=moveLeft(dir==='right'?row.slice().reverse():row);score+=gained;return dir==='right'?out.reverse():out})}
  else for(let c=0;c<4;c++){const col=tiles.map(row=>row[c]);const {out,gained}=moveLeft(dir==='down'?col.reverse():col);score+=gained;const next=dir==='down'?out.reverse():out;for(let r=0;r<4;r++)tiles[r][c]=next[r]}
  if(tiles.some((row,i)=>row.some((v,j)=>v!==old[i][j]))){history={tiles:old,score:oldScore};spawn();won=won||tiles.flat().some(v=>v>=2048);draw()}
 }
 const restart=()=>{tiles=matrix(4);score=0;won=false;history=null;spawn();spawn();draw()};
 root.innerHTML='<div class="native-2048"><header><div><h2>2048</h2><p>Join the tiles to reach 2048.</p></div><div class="native-2048-stats"><span>Score <b data-score>0</b></span><span>Best <b data-best>0</b></span></div></header><div class="native-2048-board" data-board role="group" aria-label="2048 tile board"></div><p class="native-2048-win" data-win role="status"></p><div class="native-2048-controls"><button class="btn k s" data-restart>New game</button><button class="btn s" data-undo>Undo</button></div><p class="native-game-hint">Arrow keys, WASD, or swipe to move the tiles.</p></div>';
 root.querySelector('[data-restart]').onclick=restart;
 root.querySelector('[data-undo]').onclick=()=>{if(!history)return;tiles=history.tiles.map(r=>r.slice());score=history.score;history=null;draw()};
 const onKey=e=>{if(!root.isConnected||root.closest('.view')?.classList.contains('on')===false)return;const dir={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'}[e.key];if(dir&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();shift(dir)}};
 document.addEventListener('keydown',onKey);
 let start=null;root.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});root.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;shift(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')},{passive:true});restart();
 return()=>document.removeEventListener('keydown',onKey);
}

export function mountGames(root,openInBrowser){
 let filter='All',search='',stop=null,limit=72,loading=true,failed=[];
 const collection=new Map(local.map(game=>[idFor(game.name),game]));
 root.innerHTML='<div class="mw native-games"><div class="native-games-header"><div><h1>Apps</h1><p>Celestial Originals and credited games from our partners.</p></div><label class="mw-q">'+ico('search')+'<input type="search" placeholder="Search apps" aria-label="Search apps"></label></div><div class="native-game-filters"><button class="btn s" data-filter="All">All</button><button class="btn s" data-filter="Celestial">Originals</button><button class="btn s" data-filter="Selenite">Selenite</button><button class="btn s" data-filter="WASM.rip">WASM.rip</button><button class="btn s" data-filter="GN-Math">GN-Math</button><button class="btn s" data-filter="Favorites">Favorites</button></div><p class="native-library-status" data-status role="status"></p><div class="native-game-grid" data-games></div><button class="btn s" data-show-more hidden>Show more</button><section class="native-game-player gl g2" data-player hidden><div class="lr"><h3 data-playing></h3><button class="btn s" data-close-game>Back to apps</button></div><div data-stage></div></section><footer class="native-game-credits"><h3>Sources & credits</h3><div data-collections></div><p>Individual titles, artwork, and code remain the property of their original creators. Some third-party sites may restrict embedded play.</p></footer></div>';
 const grid=$('[data-games]',root),player=$('[data-player]',root),stage=$('[data-stage]',root),status=$('[data-status]',root),more=$('[data-show-more]',root);
 $('[data-collections]',root).innerHTML=distributors.map(s=>'<p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a> — '+esc(s.credit)+'</p>').join('');
 const normalize=(source,row)=>{
  if(!row||typeof row.name!=='string'||!idFor(row.name)||row.id===-1)return null;
  let url='',image='',credit=String(row.author||row.porter||'').slice(0,100);
  if(source==='Selenite'&&typeof row.directory==='string'){
   const base='https://selenite.cc/resources/semag/'+encodeURIComponent(row.directory)+'/';
   url=safe('index.html',base);image=safe(row.image,base);
  }
  if(source==='WASM.rip'){url=safe(row.gameUrl,'https://wasm.rip/');image=safe(row.imageUrl,'https://wasm.rip/')}
  if(source==='GN-Math'){
   const expand=v=>String(v||'').replaceAll('{COVER_URL}','https://raw.githubusercontent.com/gn-math/covers/main').replaceAll('{HTML_URL}','https://raw.githack.com/gn-math/html/main');
   url=safe(expand(row.url),'https://gn-math.github.io/');image=safe(expand(row.cover),'https://gn-math.github.io/');
  }
  return url?{url,image,source,credit}:null;
 };
 function paint(){
  const f=favorites(),all=[...collection.values()];
  const selected=all.filter(g=>(filter==='All'||filter==='Favorites'&&f.includes(g.id)||g.sources.some(s=>s.source===filter)||g.source===filter)&&(!search||(g.name+' '+g.sources.map(s=>s.source).join(' ')).toLowerCase().includes(search)));
  $$('.native-game-filters [data-filter]',root).forEach(b=>b.classList.toggle('on',b.dataset.filter===filter));
  const shown=selected.slice(0,limit);
  grid.innerHTML=shown.map(g=>{
    const source=g.sources.find(s=>s.source===filter)||g.sources.find(s=>s.image)||g.sources[0],art=source?.image;
    return '<article class="native-game-card"><div class="native-game-art">'+(art?'<img src="'+esc(art)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'<span class="native-game-letter">'+esc(g.name.slice(0,2).toUpperCase())+'</span>')+'</div><h3>'+esc(g.name)+'</h3><p>'+esc(g.kind==='local'?'Celestial Original':g.sources.map(s=>s.source).join(' · '))+'</p><div><button class="btn k s" data-open-game="'+esc(g.id)+'">'+(g.kind==='local'?'Play':'Launch')+'</button><button class="native-game-fav" data-fav="'+esc(g.id)+'" aria-label="'+(f.includes(g.id)?'Remove favorite':'Add favorite')+'">'+(f.includes(g.id)?'★':'☆')+'</button></div></article>';
  }).join('')||'<p>No matching apps.</p>';
  more.hidden=selected.length<=limit;
  status.textContent=(loading?'Loading partner catalogs… ':all.length.toLocaleString()+' apps')+(failed.length?' · Unavailable: '+failed.join(', '):'');
 }
 function ingest(name,rows){
  for(const row of rows){
   const source=normalize(name,row);if(!source)continue;
   const key=idFor(row.name);if(collection.has(key)&&collection.get(key).kind==='local')continue;
   const game=collection.get(key)||{id:key,name:String(row.name).slice(0,100),source:name,kind:'external',sources:[]};
   if(!game.sources.some(s=>s.url===source.url))game.sources.push(source);
   collection.set(key,game);
  }
 }
 root.addEventListener('click',e=>{
  const filterButton=e.target.closest('[data-filter]'),favButton=e.target.closest('[data-fav]'),launch=e.target.closest('[data-open-game]');
  if(filterButton){filter=filterButton.dataset.filter;limit=72;paint();return}
  if(favButton){const id=favButton.dataset.fav,items=favorites();localStorage.setItem(favoritesKey,JSON.stringify(items.includes(id)?items.filter(v=>v!==id):[...items,id]));paint();return}
  if(!launch)return;
  const game=[...collection.values()].find(g=>g.id===launch.dataset.openGame);if(!game)return;
  if(game.kind==='local'){
   stop?.();stop=make2048(stage);player.hidden=false;grid.hidden=true;more.hidden=true;$('[data-playing]',root).textContent=game.name;
  }else{
   const source=game.sources.find(s=>s.source===filter)||game.sources[0];
   if(!source?.url)return;
   if(typeof openInBrowser==='function')openInBrowser(source.url);
   else window.open(source.url,'_blank','noopener,noreferrer');
  }
 });
 $('[data-close-game]',root).onclick=()=>{stop?.();stop=null;player.hidden=true;grid.hidden=false;stage.replaceChildren();paint()};
 $('[data-show-more]',root).onclick=()=>{limit+=72;paint()};
 $('[type=search]',root).oninput=e=>{search=e.target.value.trim().toLowerCase();limit=72;paint()};
 paint();
 api('/api/games/catalog').then(data=>{
  for(const catalog of data.catalogs||[]){
   if(catalog.error)failed.push(catalog.name);
   if(Array.isArray(catalog.rows))ingest(catalog.name,catalog.rows);
  }
 }).catch(()=>{failed=distributors.map(x=>x.name)}).finally(()=>{loading=false;paint()});
}
