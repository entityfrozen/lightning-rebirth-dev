import {esc,ico} from './common.js';
import {mountDistributorLibrary,openDistributorGame} from './catalog-ui.js';
import {extraGames,playChess,playConnectFour,playMines,playSnake} from './extra-games.js';

// Source stays readable in Git. Production is bundled/minified; selected
// interface strings are encoded in the shipped bundle as an extra deterrent.
const label=(...points)=>String.fromCharCode(...points);
const gameWord='Library';
const arcadeItems=[...extraGames,
 {id:'2048',title:'2048',subtitle:'Slide. Merge. Repeat.',kind:'puzzle',symbol:'2048'},
 {id:'ttt',title:'Tic Tac Toe',subtitle:'You versus the computer.',kind:'strategy',symbol:'✕ ○'},
 {id:'rps',title:'Rock Paper Scissors',subtitle:'Best of five.',kind:'casual',symbol:'✊ ✋'},
 {id:'umaversus',title:'UmaVersus',subtitle:'Play the original online fighting game.',kind:'multiplayer',symbol:'🏇'}
];
const rnd=n=>Math.floor(Math.random()*n);
function play2048(stage){
 let board,score,previous;
 const empty=()=>board.flatMap((row,y)=>row.flatMap((n,x)=>n?[]:[[y,x]]));
 const spawn=()=>{const spots=empty();if(!spots.length)return;const [y,x]=spots[rnd(spots.length)];board[y][x]=Math.random()<.9?2:4};
 const available=()=>empty().length||board.some((row,y)=>row.some((n,x)=>n===row[x+1]||n===board[y+1]?.[x]));
 const reset=()=>{board=Array.from({length:4},()=>Array(4).fill(0));score=0;previous=null;prior=Array(16).fill(0);spawn();spawn();draw()};
 const slide=list=>{const a=list.filter(Boolean),out=[];for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){out.push(a[i]*2);score+=a[i]*2;i++}else out.push(a[i])}return out.concat(Array(4-out.length).fill(0))};
 const move=dir=>{
  const before=JSON.stringify(board),old=board.map(r=>r.slice()),oldScore=score;
  if(dir==='left'||dir==='right')board=board.map(row=>{const result=slide(dir==='right'?[...row].reverse():row);return dir==='right'?result.reverse():result});
  else for(let x=0;x<4;x++){let col=board.map(r=>r[x]);if(dir==='down')col.reverse();let result=slide(col);if(dir==='down')result.reverse();for(let y=0;y<4;y++)board[y][x]=result[y]}
  if(JSON.stringify(board)!==before){previous={board:old,score:oldScore};spawn();draw()}
 };
 const bestKey='celestial.game.2048.best';
 stage.innerHTML='<div class="cel-2048"><div class="arcade-toolbar"><span>Score <b data-score>0</b></span><span>Best <b data-best>0</b></span><button class="btn s" data-undo>Undo</button><button class="btn k s" data-reset>New game</button></div><div class="cel-2048-board" role="group" aria-label="2048 board" data-board></div><p class="arcade-help" data-help>Use arrow keys, WASD, or swipe to join matching tiles.</p></div>';
 let prior=Array(16).fill(0),animation=0;
 const draw=()=>{const best=Math.max(score,Number(localStorage.getItem(bestKey)||0));if(Number(localStorage.getItem(bestKey)||0)<best){localStorage.setItem(bestKey,String(best));window.dispatchEvent(new Event('celestial:save-workspace'))}stage.querySelector('[data-score]').textContent=score;stage.querySelector('[data-best]').textContent=best;stage.querySelector('[data-undo]').disabled=!previous;stage.querySelector('[data-board]').innerHTML=board.flat().map((n,i)=>'<div class="cel-2048-tile'+(n&&(!prior[i]||prior[i]!==n)?' is-new':'')+'" data-value="'+n+'" style="--delay:'+((i%4)*18)+'ms">'+(n||'')+'</div>').join('');prior=board.flat().slice();stage.querySelector('[data-help]').textContent=board.flat().includes(2048)?'You reached 2048! Keep going.':available()?'Use arrow keys, WASD, or swipe to join matching tiles.':'No moves left. Start a new game.'};
 stage.querySelector('[data-reset]').onclick=reset;
 stage.querySelector('[data-undo]').onclick=()=>{if(!previous)return;board=previous.board;score=previous.score;previous=null;draw()};
 const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
 const onKey=e=>{if(!stage.isConnected||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const dir=keys[e.key];if(dir){e.preventDefault();move(dir)}};
 document.addEventListener('keydown',onKey);
 let touch=null;const touchStart=e=>{touch=[e.touches[0].clientX,e.touches[0].clientY]};
 const touchEnd=e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')};
 stage.addEventListener('touchstart',touchStart,{passive:true});stage.addEventListener('touchend',touchEnd,{passive:true});
 reset();return()=>document.removeEventListener('keydown',onKey);
}
function playTicTacToe(stage){
 let board=Array(9).fill(''),finished=false;
 stage.innerHTML='<div class="arcade-simple"><p class="arcade-help" data-status>You are X. Make the first move.</p><div class="cel-ttt-board" data-board></div><button class="btn k s" data-reset>New round</button></div>';
 const check=s=>[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(a=>a.every(i=>s[a[0]]&&s[i]===s[a[0]]))?true:false;
 const draw=()=>{stage.querySelector('[data-board]').innerHTML=board.map((v,i)=>'<button class="cel-ttt-cell" data-pos="'+i+'" '+(v||finished?'disabled':'')+' aria-label="Cell '+(i+1)+'">'+esc(v)+'</button>').join('')};
 const end=()=>{const winner=check(board);if(winner){finished=true;stage.querySelector('[data-status]').textContent=board.filter(v=>v==='X').length>board.filter(v=>v==='O').length?'You win!':'Computer wins!'}else if(board.every(Boolean)){finished=true;stage.querySelector('[data-status]').textContent="It's a draw."}return finished};
 const choose=()=>{const open=board.map((v,i)=>v?-1:i).filter(i=>i>=0);if(!open.length)return -1;for(const target of ['O','X'])for(const i of open){const trial=[...board];trial[i]=target;if(check(trial))return i}if(open.includes(4))return 4;return open[rnd(open.length)]};
 stage.querySelector('[data-board]').onclick=e=>{const button=e.target.closest('[data-pos]');if(!button||finished)return;const i=Number(button.dataset.pos);if(board[i])return;board[i]='X';if(!end()){const j=choose();if(j>=0)board[j]='O';end()}draw()};
 stage.querySelector('[data-reset]').onclick=()=>{board=Array(9).fill('');finished=false;stage.querySelector('[data-status]').textContent='You are X. Make the first move.';draw()};draw();return()=>{};
}
function playRps(stage){
 let you=0,bot=0,round=0;
 const choices=['rock','paper','scissors'];const signs=['✊','✋','✌️'];
 stage.innerHTML='<div class="arcade-simple cel-rps"><div class="cel-rps-score"><span>You <strong data-you>0</strong></span><span>Computer <strong data-bot>0</strong></span></div><p class="arcade-help" data-result>Pick your move. First to three wins.</p><div class="cel-rps-choices">'+choices.map((v,i)=>'<button data-pick="'+v+'">'+signs[i]+'<small>'+v+'</small></button>').join('')+'</div><button class="btn k s" data-reset>Restart</button></div>';
 const reset=()=>{you=0;bot=0;round=0;stage.querySelector('[data-you]').textContent=0;stage.querySelector('[data-bot]').textContent=0;stage.querySelector('[data-result]').textContent='Pick your move. First to three wins.';stage.querySelectorAll('[data-pick]').forEach(x=>x.disabled=false)};
 stage.querySelector('.cel-rps-choices').onclick=e=>{const b=e.target.closest('[data-pick]');if(!b)return;const move=choices.indexOf(b.dataset.pick),enemy=rnd(3);const result=move===enemy?0:(move-enemy+3)%3===1?1:-1;if(result===1)you++;if(result===-1)bot++;round++;stage.querySelector('[data-you]').textContent=you;stage.querySelector('[data-bot]').textContent=bot;stage.querySelector('[data-result]').textContent=(result===0?"Tie.":result===1?'You win the round.':'Computer wins the round.')+' Computer chose '+choices[enemy]+'.'+(you===3||bot===3?' '+(you===3?'Match won!':'Match lost.'): '');if(you===3||bot===3)stage.querySelectorAll('[data-pick]').forEach(x=>x.disabled=true)};
 stage.querySelector('[data-reset]').onclick=reset;reset();return()=>{};
}
export function mountArcade(root){
 let search='',active=null,dispose=null;
 root.innerHTML='<div class="arcade-shell"><header class="arcade-head"><div><span class="cel-home-kicker">BRIGHTPATH ORIGINALS</span><h1 data-heading></h1><p>A quick break, right where you are.</p></div><label class="arcade-search">'+ico('search')+'<input type="search" placeholder="Search the library" aria-label="Search the library"></label></header><section class="arcade-grid" data-grid></section><section class="arcade-stage" data-stage hidden><header><button class="btn s" type="button" data-back>← Library</button><h2 data-item-title></h2></header><div data-canvas></div></section></div>';
 root.querySelector('[data-heading]').textContent=gameWord;
 const grid=root.querySelector('[data-grid]'),stage=root.querySelector('[data-stage]'),area=root.querySelector('[data-play-area]');
 const distributor=mountDistributorLibrary(root,{launch:game=>{
  dispose?.();area.replaceChildren();grid.hidden=true;distributor.hide();
  stage.hidden=false;active=null;root.querySelector('[data-game-title]').textContent=game.name;
  dispose=openDistributorGame(area,game);
  stage.scrollIntoView({block:'start',behavior:'smooth'});
 }});
 const paint=()=>{const visible=arcadeItems.filter(g=>(g.title+' '+g.kind).toLowerCase().includes(search));grid.innerHTML=visible.map(g=>'<button class="arcade-card" type="button" data-index="'+arcadeItems.indexOf(g)+'"><span class="arcade-symbol">'+esc(g.symbol)+'</span><span class="arcade-category">'+esc(g.kind)+'</span><strong>'+esc(g.title)+'</strong><small>'+esc(g.subtitle)+'</small><span class="arcade-launch">Play now →</span></button>').join('')||'<p>No matching titles.</p>'};
 root.querySelector('input[type=search]').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();paint();distributor.setQuery(search)});
 grid.onclick=e=>{const b=e.target.closest('[data-arcade-index]');if(!b)return;const index=Number(b.dataset.index);const item=Number.isInteger(index)&&index>=0?arcadeItems[index]:null;if(!item)return;dispose?.();area.replaceChildren();grid.hidden=true;distributor.hide();stage.hidden=false;active=item;root.querySelector('[data-game-title]').textContent=item.title;dispose=item.id==='umaversus'?openDistributorGame(area,{name:'UmaVersus',sources:[{name:'UmaVersus.lol',url:'https://umaversus.lol/',cover:'',creator:'UmaVersus creators'}]}):({chess:playChess,connect4:playConnectFour,mines:playMines,snake:playSnake,'2048':play2048,ttt:playTicTacToe,rps:playRps}[item.id]||playRps)(area)};
 root.querySelector('[data-back]').onclick=()=>{dispose?.();dispose=null;active=null;area.replaceChildren();grid.hidden=false;distributor.show();stage.hidden=true;paint()};
 paint();
}
