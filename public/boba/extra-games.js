import {Chess} from 'chess.js';
import {esc} from './common.js';

const pick=items=>items[Math.floor(Math.random()*items.length)];
const button=(text,action)=>'<button class="btn s" type="button" data-action="'+action+'">'+text+'</button>';

export const extraGames=[
 {id:'chess',title:'Chess',subtitle:'Legal moves, checkmates, and a computer rival.',kind:'strategy',symbol:'♞'},
 {id:'connect4',title:'Connect Four',subtitle:'Four in a row wins. Watch the diagonals.',kind:'strategy',symbol:'🔴'},
 {id:'mines',title:'Minesweeper',subtitle:'Reveal safe cells. Mark every mine.',kind:'puzzle',symbol:'✳'},
 {id:'snake',title:'Snake',subtitle:'Chase fruit, grow longer, beat your best.',kind:'arcade',symbol:'🐍'}
];

export function playChess(stage){
 const game=new Chess(),glyph={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟',K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙'};
 let selected=null,thinking=false,last=null,level=1,active=true;
 stage.innerHTML='<div class="cel-extra-game cel-chess"><header><strong data-state>White to move</strong><label>Computer <select data-level aria-label="Computer difficulty"><option value="0">Casual</option><option value="1" selected>Standard</option><option value="2">Challenging</option></select></label></header><div data-chess-board class="cel-chess-board" role="grid" aria-label="Chess board"></div><div class="cel-chess-actions">'+button('New game','reset')+button('Take back','undo')+'</div><p class="cel-game-help">You play White. Select a piece and then its destination.</p></div>';
 const board=stage.querySelector('[data-chess-board]'),state=stage.querySelector('[data-state]');
 function scoreMove(m){let score={p:1,n:3,b:3,r:5,q:9,k:0}[m.captured]||0;if(m.promotion)score+=8;if(m.san.includes('#'))score+=100;if(m.san.includes('+'))score+=2;return score+Math.random()*(level===2?.3:level===1?4:12)}
 function draw(){
  state.textContent=game.isCheckmate()?'Checkmate — '+(game.turn()==='w'?'Computer':'You')+' win!':game.isDraw()?'Draw.':game.isCheck()?'Check! '+(game.turn()==='w'?'Your':'Computer')+' move':thinking?'Computer thinking…':game.turn()==='w'?'Your move':'Computer to move';
  const targets=selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[];
  board.innerHTML=game.board().flat().map((p,i)=>{
   const square='abcdefgh'[i%8]+(8-Math.floor(i/8));
   const glyphText=p?glyph[p.color==='w'?p.type.toUpperCase():p.type]:'';
   const color=(Math.floor(i/8)+i%8)%2?' dark':' light';
   return '<button class="cel-chess-cell'+color+(square===selected?' chosen':'')+(targets.includes(square)?' target':'')+(last?.includes(square)?' moved':'')+'" data-square="'+square+'" aria-label="'+square+' '+(p?(p.color==='w'?'white ':'black ')+p.type:'empty')+'">'+glyphText+'</button>';
  }).join('');
 }
 function computer(){
  if(!active||game.isGameOver()||game.turn()!=='b')return;
  thinking=true;draw();
  setTimeout(()=>{
   if(!active||game.isGameOver()||game.turn()!=='b')return;
   const moves=game.moves({verbose:true}).sort((a,b)=>scoreMove(b)-scoreMove(a));
   const choice=level===0?pick(moves):level===1?pick(moves.slice(0,Math.min(6,moves.length))):moves[0];
   if(choice){game.move(choice);last=[choice.from,choice.to]}thinking=false;draw();
  },level===2?540:270);
 }
 board.onclick=e=>{
  const sq=e.target.closest('[data-square]')?.dataset.square;
  if(!sq||thinking||game.turn()!=='w'||game.isGameOver())return;
  const piece=game.get(sq);
  if(piece?.color==='w'){selected=sq;draw();return;}
  if(!selected)return;
  const move=game.moves({square:selected,verbose:true}).find(m=>m.to===sq&&(m.promotion==='q'||!m.promotion));
  if(move){game.move({from:selected,to:sq,promotion:'q'});last=[selected,sq];selected=null;draw();computer()}
  else {selected=null;draw()}
 };
 stage.querySelector('[data-level]').onchange=e=>{level=Number(e.target.value)};
 stage.querySelector('[data-action=reset]').onclick=()=>{game.reset();thinking=false;selected=null;last=null;draw()};
 stage.querySelector('[data-action=undo]').onclick=()=>{game.undo();game.undo();thinking=false;selected=null;last=null;draw()};
 draw();return()=>{active=false};
}

export function playConnectFour(stage){
 let cells=Array(42).fill(0),turn=1,finished=false,animating=false,round=0,active=true;
 stage.innerHTML='<div class="cel-extra-game"><h3>Connect Four</h3><p data-state class="cel-game-help">You are red. Drop a disc into a column.</p><div class="cel-connect-board" data-board role="group" aria-label="Connect Four game board"></div>'+button('New round','reset')+'</div>';
 const board=stage.querySelector('[data-board]'),state=stage.querySelector('[data-state]');
 const winner=b=>{for(let r=0;r<6;r++)for(let c=0;c<7;c++){const v=b[r*7+c];if(!v)continue;for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){let ok=true;for(let k=1;k<4;k++){const y=r+dr*k,x=c+dc*k;if(y<0||y>5||x<0||x>6||b[y*7+x]!==v){ok=false;break}}if(ok)return v}}return 0};
 const drop=(col,player)=>{
  for(let row=5;row>=0;row--){
   const index=row*7+col;
   if(!cells[index]){cells[index]=player;return index}
  }
  return -1;
 };
 const canAnimate=()=>typeof document!=='undefined'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.fx!=='lite';
 function draw(){
  board.innerHTML=cells.map((n,i)=>'<button data-col="'+i%7+'" data-cell="'+i+'" aria-label="Column '+(i%7+1)+' row '+(Math.floor(i/7)+1)+'" class="cel-connect-cell"><span data-disc="'+n+'"></span></button>').join('');
  const w=winner(cells);
  finished=!!w||cells.every(Boolean);
  if(w)state.textContent=w===1?'You win!':'Computer wins.';
  else if(finished)state.textContent='Draw. Nobody connected four.';
  else state.textContent=turn===1?'Your move — red.':'Computer thinking…';
 }
 async function animateDisc(index){
  if(!canAnimate())return;
  const piece=board.querySelector('[data-cell="'+index+'"] span');
  if(!piece||typeof piece.animate!=='function')return;
  const row=Math.floor(index/7);
  const distance=Math.max(0,piece.getBoundingClientRect().top-board.getBoundingClientRect().top+piece.offsetHeight);
  if(!distance)return;
  const duration=235+row*43;
  const animation=piece.animate([
   {transform:'translateY(-'+distance+'px)',offset:0},
   {transform:'translateY(0)',offset:.82},
   {transform:'translateY(-7px)',offset:.92},
   {transform:'translateY(0)',offset:1}
  ],{duration,easing:'cubic-bezier(.2,.75,.3,1)'});
  await animation.finished.catch(()=>{});
 }
 function chooseBotColumn(){
  const available=[0,1,2,3,4,5,6].filter(col=>!cells[col]);
  if(!available.length)return -1;
  let chosen=pick(available);
  for(const player of [2,1]){
   let found=false;
   for(const col of available){
    const copy=cells.slice();
    for(let row=5;row>=0;row--)if(!copy[row*7+col]){copy[row*7+col]=player;break}
    if(winner(copy)===player){chosen=col;found=true;break}
   }
   if(found)break;
  }
  return chosen;
 }
 board.onclick=async event=>{
  if(finished||animating||turn!==1)return;
  const target=event.target.closest('[data-col]');
  if(!target)return;
  const col=Number(target.dataset.col);
  if(!Number.isInteger(col)||col<0||col>6)return;
  const index=drop(col,1);
  if(index<0)return;
  const currentRound=round;
  animating=true;
  turn=2;draw();
  await animateDisc(index);
  if(!active||round!==currentRound)return;
  if(!finished){
   const botCol=chooseBotColumn();
   if(botCol!==-1){
    const botIndex=drop(botCol,2);
    draw();
    await animateDisc(botIndex);
    if(!active||round!==currentRound)return;
   }
  }
  turn=1;animating=false;draw();
 };
 stage.querySelector('[data-action=reset]').onclick=()=>{
  round++;cells=Array(42).fill(0);turn=1;finished=false;animating=false;draw();
 };
 draw();
 return()=>{active=false;round++};
}
export function playMines(stage){
 let cells=[],flags=0,done=false,started=false;
 stage.innerHTML='<div class="cel-extra-game"><h3>Minesweeper</h3><p class="cel-game-help" data-state>First move is safe. Right-click or long-press to flag.</p><div class="cel-mines-grid" data-board></div>'+button('Restart','reset')+'</div>';
 const board=stage.querySelector('[data-board]'),state=stage.querySelector('[data-state]');
 const around=i=>{const x=i%9,y=Math.floor(i/9),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<9&&yy>=0&&yy<9)out.push(yy*9+xx)}return out};
 const reset=()=>{cells=Array.from({length:81},()=>({mine:false,n:0,open:false,flag:false}));flags=0;done=false;started=false;draw()};
 function draw(){board.innerHTML=cells.map((c,i)=>'<button class="cel-mine-cell'+(c.open?' revealed':'')+'" data-cell="'+i+'" data-number="'+c.n+'">'+(c.open?c.mine?'✹':c.n||'':c.flag?'⚑':'')+'</button>').join('');if(!done)state.textContent='Mines: '+(12-flags)+' left · Right-click to flag'}
 function open(i,flag=false){if(done||cells[i].open)return;if(flag){cells[i].flag=!cells[i].flag;flags+=cells[i].flag?1:-1;draw();return}if(cells[i].flag)return;
  if(!started){const pool=cells.map((_,j)=>j).filter(j=>j!==i&&!around(i).includes(j));for(let n=0;n<12;n++){const j=Math.floor(Math.random()*pool.length);cells[pool.splice(j,1)[0]].mine=true}for(let j=0;j<81;j++)cells[j].n=around(j).filter(k=>cells[k].mine).length;started=true}
  const stack=[i];while(stack.length){const j=stack.pop();if(cells[j].open||cells[j].flag)continue;cells[j].open=true;if(cells[j].mine){done=true;cells.forEach(c=>{if(c.mine)c.open=true});state.textContent='Boom! Try again.';break}if(!cells[j].n)stack.push(...around(j).filter(k=>!cells[k].open))}
  if(!done&&cells.filter(c=>c.open&&!c.mine).length===69){done=true;state.textContent='All clear! You win.'}draw();
 }
 board.onclick=e=>{const target=e.target.closest('[data-cell]');if(target)open(Number(target.dataset.cell))};
 board.oncontextmenu=e=>{const target=e.target.closest('[data-cell]');if(target){e.preventDefault();open(Number(target.dataset.cell),true)}};
 stage.querySelector('[data-action=reset]').onclick=reset;reset();return()=>{};
}
export function playSnake(stage){
 const N=16;let snake,food,dir,next,points,timer=null,ended=false;
 stage.innerHTML='<div class="cel-extra-game"><h3>Snake</h3><p class="cel-game-help" data-state>Use arrow keys or WASD to move.</p><div class="cel-snake-grid" data-board></div><div class="cel-snake-controls">'+[['↑','up'],['←','left'],['↓','down'],['→','right']].map(([t,d])=>'<button class="btn s" data-dir="'+d+'">'+t+'</button>').join('')+'</div>'+button('New game','reset')+'</div>';
 const board=stage.querySelector('[data-board]'),state=stage.querySelector('[data-state]');
 const spawn=()=>{const free=Array.from({length:N*N},(_,i)=>i).filter(i=>!snake.includes(i));return free.length?pick(free):-1};
 const draw=()=>{const body=new Set(snake);board.innerHTML=Array.from({length:N*N},(_,i)=>'<i class="'+(snake[0]===i?'head':body.has(i)?'body':food===i?'food':'')+'"></i>').join('');state.textContent=ended?'Game over · Score '+points:'Score '+points+' · Use arrow keys or WASD'};
 const move=()=>{if(ended)return;dir=next;const head=snake[0],x=head%N,y=Math.floor(head/N);const nx=x+dir[0],ny=y+dir[1];if(nx<0||nx>=N||ny<0||ny>=N){ended=true;clearInterval(timer);draw();return}const id=ny*N+nx,eat=id===food;if(snake.slice(0,eat?undefined:-1).includes(id)){ended=true;clearInterval(timer);draw();return}snake.unshift(id);if(eat){points++;food=spawn()}else snake.pop();draw()};
 const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
 const change=d=>{const v=dirs[d];if(v&&!(v[0]===-dir[0]&&v[1]===-dir[1]))next=v};
 const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 const key=e=>{if(!stage.isConnected||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(keys[e.key]){e.preventDefault();change(keys[e.key])}};
 stage.querySelector('.cel-snake-controls').onclick=e=>{const b=e.target.closest('[data-dir]');if(b)change(b.dataset.dir)};
 const reset=()=>{clearInterval(timer);snake=[135,136,137];dir=[-1,0];next=dir;points=0;food=spawn();ended=false;draw();timer=setInterval(move,135)};
 stage.querySelector('[data-action=reset]').onclick=reset;document.addEventListener('keydown',key);reset();return()=>{clearInterval(timer);document.removeEventListener('keydown',key)};
}
