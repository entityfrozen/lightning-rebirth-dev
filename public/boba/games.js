import {$,$$,esc,ico} from './common.js';

// Games intentionally distinguish playable local games from outbound catalogs.
// Third-party port pages are linked, never represented as local game assets.
const collections=[
 {id:'selenite',name:'Selenite',url:'https://selenite.cc/',description:'Browser game collection',credit:'Games and distribution by Selenite and their respective creators.'},
 {id:'wasm',name:'WASM.rip',url:'https://wasm.rip/',description:'WebAssembly game ports',credit:'Web ports by the WASM.rip team and original game creators.'},
 {id:'gn',name:'GN-Math',url:'https://gn-math.com/search',description:'Browser games and puzzles',credit:'Games and distribution by GN-Math and original creators.'}
];
const entries=[
 {id:'2048',name:'2048',source:'Celestial',genre:'Puzzle',kind:'local'},
 {id:'chess',name:'Chess',source:'Celestial',genre:'Board',kind:'coming'},
 {id:'rps',name:'Rock Paper Scissors',source:'Celestial',genre:'Casual',kind:'coming'},
 {id:'peak',name:'PEAK',source:'WASM.rip',genre:'Adventure',kind:'external',url:'https://github.com/wasmdotrip/Peak-Port'},
 {id:'among-us',name:'Among Us',source:'WASM.rip',genre:'Multiplayer',kind:'external',url:'https://github.com/wasmdotrip/AmongUsPort'},
 {id:'clustertruck',name:'Clustertruck',source:'WASM.rip',genre:'Action',kind:'external',url:'https://github.com/wasmdotrip/Clustertruck-Port'},
 {id:'drive-mad',name:'Drive Mad',source:'GN-Math',genre:'Racing',kind:'collection',url:'https://gn-math.com/search'},
 {id:'subway-surfers',name:'Subway Surfers',source:'GN-Math',genre:'Action',kind:'collection',url:'https://gn-math.com/search'},
 {id:'crossy-road',name:'Crossy Road',source:'GN-Math',genre:'Arcade',kind:'collection',url:'https://gn-math.com/search'},
 {id:'retro-bowl',name:'Retro Bowl',source:'GN-Math',genre:'Sports',kind:'collection',url:'https://gn-math.com/search'},
 {id:'tunnel-rush',name:'Tunnel Rush',source:'GN-Math',genre:'Arcade',kind:'collection',url:'https://gn-math.com/search'},
 {id:'selenite-library',name:'Selenite Games',source:'Selenite',genre:'Collection',kind:'collection',url:'https://selenite.cc/'}
];
const key='celestial.games.favorites';
function prefs(){try{return JSON.parse(localStorage.getItem(key))||[]}catch{return []}}
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
export function mountGames(root){
 let current='all',search='',stop=null;
 root.innerHTML='<div class="mw native-games"><div class="native-games-header"><div><h1>Games</h1><p>One library, three communities, and Celestial Originals.</p></div><label class="mw-q">'+ico('search')+'<input type="search" placeholder="Search games" aria-label="Search games"></label></div><div class="native-game-filters"><button class="btn s on" data-filter="all">All</button><button class="btn s" data-filter="Celestial">Originals</button><button class="btn s" data-filter="Selenite">Selenite</button><button class="btn s" data-filter="WASM.rip">WASM.rip</button><button class="btn s" data-filter="GN-Math">GN-Math</button><button class="btn s" data-filter="favorites">Favorites</button></div><div class="native-game-grid" data-games></div><section class="native-game-player gl g2" data-player hidden><div class="lr"><h3 data-playing></h3><button class="btn s" data-close-game>Back to games</button></div><div data-stage></div></section><div class="native-game-credits"><h3>Sources & credits</h3><div data-collections></div><p>Individual games retain their creators’ ownership. Some games require opening their source site; an external listing is not a locally hosted game.</p></div></div>';
 const grid=$('[data-games]',root),player=$('[data-player]',root),stage=$('[data-stage]',root);
 function paint(){const fav=prefs();$$('[data-filter]',root).forEach(b=>b.classList.toggle('on',b.dataset.filter===current));const list=entries.filter(x=>(current==='all'||current==='favorites'&&fav.includes(x.id)||x.source===current)&&(!search||(x.name+' '+x.genre+' '+x.source).toLowerCase().includes(search)));grid.innerHTML=list.map(g=>'<div class="native-game-card"><div class="native-game-art">'+ico(g.id==='2048'?'play':g.kind==='external'?'web':'star')+'</div><h3>'+esc(g.name)+'</h3><p>'+esc(g.genre)+' · '+esc(g.source)+'</p><div><button class="btn k s" data-open-game="'+esc(g.id)+'">'+(g.kind==='local'?'Play':g.kind==='coming'?'Planned':'Open source')+'</button><button class="native-game-fav" data-fav="'+esc(g.id)+'" aria-label="'+(fav.includes(g.id)?'Remove favorite':'Add favorite')+'">'+(fav.includes(g.id)?'★':'☆')+'</button></div></div>').join('')||'<p>No matching games.</p>'}
 $('[data-collections]',root).innerHTML=collections.map(x=>'<p><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.name)+'</a> — '+esc(x.credit)+'</p>').join('');
 root.onclick=e=>{const filter=e.target.closest('[data-filter]'),fav=e.target.closest('[data-fav]'),open=e.target.closest('[data-open-game]');if(filter){current=filter.dataset.filter;paint()}if(fav){const id=fav.dataset.fav,f=prefs();localStorage.setItem(key,JSON.stringify(f.includes(id)?f.filter(x=>x!==id):[...f,id]));paint()}if(open){const game=entries.find(x=>x.id===open.dataset.openGame);if(!game)return;if(game.kind==='coming'){alert(game.name+' matchmaking is being connected.');return}if(game.kind!=='local'){window.open(game.url,'_blank','noopener,noreferrer');return}stop?.();player.hidden=false;grid.hidden=true;$('[data-playing]',root).textContent=game.name;stop=make2048(stage)}}; $('[data-close-game]',root).onclick=()=>{stop?.();stop=null;player.hidden=true;grid.hidden=false;stage.replaceChildren()};
 $('[type=search]',root).oninput=e=>{search=e.target.value.trim().toLowerCase();paint()};paint();
}
