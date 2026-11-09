import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {readLocal,saveLocal} from './constants.js';

const catalog=[
 {id:'world',name:'WorldPvP',genre:'STRATEGY · MULTIPLAYER',desc:'A world map where every territory matters.',mark:'◉',tone:'world'},
 {id:'chess',name:'Chess',genre:'STRATEGY · LIVE',desc:'Real legal moves, bot opponents and duels.',mark:'♞',tone:'chess'},
 {id:'rps',name:'Rock Paper Scissors',genre:'PARTY · LIVE',desc:'Fast matches, ranked duels and tournaments.',mark:'✊',tone:'rps'},
 {id:'2048',name:'2048',genre:'PUZZLE · SOLO',desc:'Merge tiles, plan ahead, reach 2048.',mark:'▦',tone:'puzzle'},
 {id:'mines',name:'Minesweeper',genre:'PUZZLE · SOLO',desc:'Decode the field without stepping on a mine.',mark:'✳',tone:'mines'},
 {id:'uma',name:'Uma Versus',genre:'FIGHTING · WEB',desc:'Fighting game hosted by its creator.',mark:'⚔',tone:'uma'}
];
const pieces={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const initial2048=()=>{
  const cells=Array(16).fill(0);
  const put=()=>{const available=cells.map((v,i)=>v?-1:i).filter(n=>n>=0);if(available.length)cells[available[Math.floor(Math.random()*available.length)]]=Math.random()<.9?2:4;};
  put();put();return {cells,score:0,won:false,over:false};
};
function step2048(game,dir){
  const next={...game,cells:[...game.cells]},old=game.cells.join(',');
  for(let line=0;line<4;line++){
    const coords=Array.from({length:4},(_,i)=>{
      if(dir==='left')return line*4+i;
      if(dir==='right')return line*4+3-i;
      if(dir==='up')return i*4+line;
      return (3-i)*4+line;
    });
    const raw=coords.map(i=>next.cells[i]).filter(Boolean),merged=[];
    for(let i=0;i<raw.length;i++){
      if(i+1<raw.length&&raw[i]===raw[i+1]){const value=raw[i]*2;merged.push(value);next.score+=value;i++;}else merged.push(raw[i]);
    }
    coords.forEach((id,j)=>next.cells[id]=merged[j]||0);
  }
  if(next.cells.join(',')===old)return game;
  const spots=next.cells.map((v,i)=>v?-1:i).filter(i=>i>=0);
  if(spots.length)next.cells[spots[Math.floor(Math.random()*spots.length)]]=Math.random()<.9?2:4;
  next.won=next.cells.includes(2048);
  next.over=!next.cells.includes(0)&&!next.cells.some((v,i)=>i%4<3&&v===next.cells[i+1]||i<12&&v===next.cells[i+4]);
  return next;
}
function Puzzle2048(){
  const [game,setGame]=useState(initial2048);
  useEffect(()=>{
    const handler=e=>{
      const directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
      const dir=directions[e.key];
      if(!dir)return;
      const target=e.target;
      if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
      e.preventDefault();setGame(g=>step2048(g,dir));
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[]);
  return <div className="forest-game-stage"><div className="forest-game-heading"><h2>2048</h2><span>SCORE {game.score}</span></div>
    <p>Use your arrow keys to combine identical tiles.</p>
    <div className="forest-2048-board">{game.cells.map((value,i)=><div key={i} data-value={value||0} className="forest-2048-tile">{value||''}</div>)}</div>
    <div className="forest-game-controls"><button onClick={()=>setGame(initial2048())}>New game ↗</button>
      {['left','up','down','right'].map(dir=><button key={dir} onClick={()=>setGame(g=>step2048(g,dir))} aria-label={'Move '+dir}>{({left:'←',up:'↑',down:'↓',right:'→'})[dir]}</button>)}
    </div>{game.won&&<strong>2048 reached. Keep going!</strong>}{game.over&&<strong>No more moves. Try again.</strong>}
  </div>;
}
function neighbors(i){const x=i%8,y=Math.floor(i/8),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<8&&yy>=0&&yy<8)out.push(yy*8+xx);}return out;}
const initialMines=()=>({cells:Array.from({length:64},()=>({mine:false,count:0,open:false,flag:false})),started:false,over:false,won:false});
function Minesweeper(){
 const [game,setGame]=useState(initialMines);
 const open=(id,flag=false)=>setGame(current=>{
   if(current.over)return current;
   const cells=current.cells.map(c=>({...c}));
   if(flag){if(!cells[id].open)cells[id].flag=!cells[id].flag;return {...current,cells};}
   if(cells[id].open||cells[id].flag)return current;
   if(!current.started){
     const pool=cells.map((_,i)=>i).filter(i=>i!==id&&!neighbors(id).includes(i));
     for(let i=0;i<10;i++){const random=Math.floor(Math.random()*pool.length);cells[pool.splice(random,1)[0]].mine=true;}
     for(let i=0;i<64;i++)cells[i].count=neighbors(i).filter(n=>cells[n].mine).length;
   }
   const stack=[id];
   while(stack.length){
     const i=stack.pop(),cell=cells[i];
     if(cell.open||cell.flag)continue;cell.open=true;
     if(cell.mine){cells.forEach(c=>{if(c.mine)c.open=true});return {cells,started:true,over:true,won:false};}
     if(cell.count===0)stack.push(...neighbors(i).filter(n=>!cells[n].open));
   }
   const won=cells.filter(c=>!c.mine&&c.open).length===54;
   return {cells,started:true,over:won,won};
 });
 return <div className="forest-game-stage"><div className="forest-game-heading"><h2>Minesweeper</h2><span>MINES · 10</span></div><p>Tap a tile to reveal it. Right click to plant a flag.</p>
  <div className="forest-mines-board">{game.cells.map((cell,i)=><button key={i} onClick={()=>open(i)} onContextMenu={e=>{e.preventDefault();open(i,true)}} className={'forest-mine '+(cell.open?'revealed':'')+(cell.mine&&cell.open?' danger':'')}>
    {cell.open?cell.mine?'✹':cell.count||'':cell.flag?'⚑':''}</button>)}</div>
  <div className="forest-game-controls"><button onClick={()=>setGame(initialMines())}>Restart ↗</button><span>{game.over?game.won?'You cleared the field!':'Boom. Try again.':'First click is always safe.'}</span></div>
 </div>;
}
function Chess({live,user}){
 const game=live.chess,[selected,setSelected]=useState(null),[queued,setQueued]=useState(false);
 useEffect(()=>setSelected(null),[game?.fen]);
 useEffect(()=>{if(game)setQueued(false);},[game?.id]);
 const rows=useMemo(()=>{
  if(!game?.fen)return [];
  return game.fen.split(' ')[0].split('/').map(row=>[...row].flatMap(ch=>/\d/.test(ch)?Array(Number(ch)).fill(''):ch));
 },[game?.fen]);
 const legal=game&&!game.over&&game.turn===game.color?(game.legal||[]):[];
 const targets=new Set(legal.filter(m=>m.from===selected).map(m=>m.to));
 const from=new Set(legal.map(m=>m.from));
 const order=game?.color==='b'?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
 const select=square=>{
  if(!game||game.over||game.turn!==game.color)return;
  if(selected&&targets.has(square)){
   live.send({type:'chessMove',id:game.id,from:selected,to:square,promotion:'q'});setSelected(null);
  }else setSelected(from.has(square)?square:null);
 };
 if(!game)return <div className="forest-game-stage"><div className="forest-game-symbol">♞</div><h2>Chess</h2><p>Challenge someone online or face Celestial's chess bot.</p>
   <div className="forest-game-controls"><button disabled={!user||!live.connected||queued} onClick={()=>{live.send({type:'queue',game:'chess'});setQueued(true)}}>{queued?'Finding an opponent…':'Find a player'}</button><button disabled={!user||!live.connected} onClick={()=>live.send({type:'chessBot',difficulty:'normal'})}>Play versus bot</button>{queued&&<button onClick={()=>{live.send({type:'chessCancelQueue'});setQueued(false)}}>Cancel</button>}</div></div>;
 return <div className="forest-game-stage"><div className="forest-game-heading"><h2>Chess</h2><span>{game.over?game.result:game.turn===game.color?'YOUR TURN':'OPPONENT TURN'}</span></div>
   <div className="forest-chess-layout"><div className="forest-chess-board">{order.flatMap(y=>order.map(x=>{
     const square='abcdefgh'[x]+(8-y),piece=rows[y]?.[x]||'';
     return <button key={square} title={square} aria-label={square+' '+(piece||'empty')} onClick={()=>select(square)}
       className={'forest-chess-square '+((x+y)%2?'dark':'light')+(selected===square?' selected':'')+(targets.has(square)?' target':'')}>
       {pieces[piece]||''}</button>;
   }))}</div><aside><span className="eyebrow">LIVE MATCH</span><h3>{game.color==='w'?'White pieces':'Black pieces'}</h3><p>{game.over?game.result:game.turn===game.color?'Choose a piece and make your move.':'Waiting for your opponent.'}</p><small>LAST MOVE: {game.last||'Opening'}</small><button onClick={()=>live.send({type:'chessSync',id:game.id})}>Refresh board ↻</button>
   {!game.over&&<button onClick={()=>{if(confirm('Resign this game?'))live.send({type:'chessResign',id:game.id});}}>Resign</button>}
   {game.over&&<button onClick={()=>{live.setChess(null);live.send({type:'chessBot',difficulty:'normal'})}}>New game</button>}</aside></div>
 </div>;
}
const symbols={rock:'✊',paper:'✋',scissors:'✌️'};
function RPS({live,user}){
 const g=live.rps,[queued,setQueued]=useState(false),[pick,setPick]=useState(null);
 useEffect(()=>{if(g){setQueued(false);if(g.round)setPick(null);}},[g?.id,g?.round]);
 const result=g?.result,other=g?.ids?.find(id=>id!==live.selfId);
 const theirs=result?.choices?.[other],mine=result?.choices?.[live.selfId];
 return <div className="forest-game-stage forest-rps">
   <div className="forest-game-heading"><h2>Rock Paper Scissors</h2><span>{g?'ROUND '+g.round:'MULTIPLAYER / SOLO'}</span></div>
   {!g?<><div className="forest-game-symbol">✊ ✋ ✌️</div><p>Go against a real player or take on the bot. Hidden choices, real matches.</p>
     <div className="forest-game-controls"><button disabled={!user||!live.connected||queued} onClick={()=>{live.send({type:'queue',game:'rps'});setQueued(true)}}>{queued?'Finding player…':'Matchmake'}</button><button disabled={!user||!live.connected} onClick={()=>live.send({type:'rpsBot'})}>Play bot</button>{queued&&<button onClick={()=>{live.send({type:'rpsCancelQueue'});setQueued(false)}}>Cancel</button>}<button disabled={!user||!live.connected} onClick={()=>live.send({type:'tournamentJoin'})}>Join tournament</button></div></>:
    <><div className="forest-rps-scores"><div><span>YOU</span><strong>{symbols[mine]||symbols[pick]||'?'}</strong><small>{g.score?.[live.selfId]||0} wins</small></div><b>VS</b><div><span>OPPONENT</span><strong>{symbols[theirs]||'?'}</strong><small>{g.score?.[other]||0} wins</small></div></div>
      <h3>{g.over?'MATCH COMPLETE':result?result.tie?'TIE':result.winner===live.selfId?'ROUND WON':'ROUND LOST':g.waiting?'WAITING FOR OPPONENT':'CHOOSE YOUR MOVE'}</h3>
      <div className="forest-rps-choices">{Object.entries(symbols).map(([choice,symbol])=><button key={choice} onClick={()=>{if(live.send({type:'rpsChoice',id:g.id,choice}))setPick(choice)}} disabled={g.over||g.waiting}>{symbol}<small>{choice}</small></button>)}</div>
      <div className="forest-game-controls">{g.over&&<button onClick={()=>{live.setRps(null);live.send({type:'rpsBot'})}}>New match</button>}<button onClick={()=>{live.send({type:'rpsLeave',id:g.id});live.setRps(null)}}>Leave match</button></div>
    </>}
 </div>;
}
function World({live,user}){
 const world=live.world,canvas=useRef(null),[tile,setTile]=useState(null),[queued,setQueued]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(live.latest?.type==='worldInfo')setMessage(live.latest.text||'');},[live.latest?.serial]);
 useEffect(()=>{
  if(!world?.cells||!canvas.current)return;
  const ctx=canvas.current.getContext('2d');if(!ctx)return;
  const image=ctx.createImageData(world.width,world.height);
  const colors=new Map(world.players?.map(p=>[p.id,p.color])||[]);
  const rgb=new Map();
  for(const [id,color] of colors){const match=color.match(/^#([0-9a-f]{6})$/i);
    if(match){const h=match[1];rgb.set(id,[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]);}
  }
  for(let i=0;i<world.cells.length;i++){
    const owner=world.cells[i],shade=owner===-1?[5,20,23]:owner?rgb.get(owner)||[114,178,138]:[34,77,53];
    image.data.set([...shade,255],i*4);
  }
  ctx.putImageData(image,0,0);
 },[world]);
 const chosen=tile!==null&&world?{x:tile%world.width,y:Math.floor(tile/world.width)}:null;
 const me=world?.players?.find(p=>p.id===live.selfId);
 const act=(action,kind)=>{if(!chosen)return;live.send({type:'worldAction',action,kind,x:chosen.x,y:chosen.y,ratio:.35});};
 if(!world)return <div className="forest-game-stage"><div className="forest-game-symbol">◉</div><h2>WorldPvP</h2><p>Conquer territory in real time. The live Celestial world engine manages all nations, battles and resources.</p><div className="forest-game-controls">
    <button disabled={!user||!live.connected} onClick={()=>{live.send({type:'worldQueue'});setQueued(true)}}>{queued?'Queued for a world…':'Join live world'}</button>
    <button disabled={!user||!live.connected} onClick={()=>{live.send({type:'worldPractice'});setQueued(true)}}>Practice with bots</button>
    {queued&&<button onClick={()=>{live.send({type:'worldCancel'});setQueued(false)}}>Cancel</button>}</div></div>;
 return <div className="forest-game-stage forest-world"><div className="forest-game-heading"><h2>WorldPvP</h2><span>{world.phase?.toUpperCase()} · {world.players?.length||0} NATIONS</span></div>
   <div className="forest-world-layout"><canvas ref={canvas} width={world.width} height={world.height} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/rect.width*world.width),y=Math.floor((e.clientY-rect.top)/rect.height*world.height);setTile(x+y*world.width)}} aria-label="WorldPvP territory map"/>
   <aside><span className="eyebrow">{me?'YOUR NATION':'WORLD SPECTATOR'}</span><h3>{me?.name||'Planet Earth'}</h3><p>{me?'Select territory to command your troops.':'Join a match to take command.'}</p>
   {me&&<><div className="forest-world-stats">TROOPS {me.troops} · GOLD {me.gold} · LAND {me.land}</div><div className="forest-game-controls"><button disabled={!chosen} onClick={()=>act('attack')}>Attack</button><button disabled={!chosen} onClick={()=>act('build','city')}>Build city</button><button disabled={!chosen} onClick={()=>act('build','factory')}>Factory</button></div></>}
   {chosen&&<small>REGION {chosen.x}, {chosen.y}</small>}{message&&<p className="forest-world-notice">{message}</p>}<button onClick={()=>{live.send({type:'worldLeave'});live.setWorld(null);setQueued(false)}}>Leave world</button></aside></div>
 </div>;
}
function Uma(){
 return <div className="forest-game-stage forest-uma"><div className="forest-game-heading"><h2>Uma Versus</h2><span>THIRD-PARTY FIGHTER</span></div><iframe src="https://umaversus.lol/" title="Uma Versus fighting game" allow="fullscreen; gamepad" referrerPolicy="no-referrer"/><p>Made by its original creator. If the embed is unavailable, <a href="https://umaversus.lol/" target="_blank" rel="noopener noreferrer">open the game directly ↗</a></p></div>;
}
export function Arcade({user,onAuth,live,gameId=null,embedded=false}){
 const [selected,setSelected]=useState(gameId);
 useEffect(()=>{if(gameId)setSelected(gameId);},[gameId]);
 if(embedded&&selected)return <div className="celestial-embedded-game">
   {selected==='world'?<World live={live} user={user}/>:
     selected==='chess'?<Chess live={live} user={user}/>:
     selected==='rps'?<RPS live={live} user={user}/>:
     selected==='2048'?<Puzzle2048/>:
     selected==='mines'?<Minesweeper/>:<Uma/>}
 </div>;
 return <section className="forest-app forest-arcade">
   <div className="forest-app-head"><span className="eyebrow">PLAY SPACE / CELESTIAL</span><h1>Enter the <em>arcade.</em></h1><p>Strategy, puzzles, duels, and worlds to conquer. Pick your game.</p></div>
   {!selected?<div className="forest-game-gallery">{catalog.map((game,i)=><button key={game.id} className={'forest-game-card forest-game-'+game.tone} onClick={()=>setSelected(game.id)}>
     <span className="forest-card-number">0{i+1} / {game.genre}</span><span className="forest-card-symbol">{game.mark}</span><strong>{game.name}</strong><small>{game.desc}</small><span className="forest-card-play">PLAY <b>↗</b></span></button>)}</div>:
    <div className="forest-active-game"><button className="forest-return" onClick={()=>setSelected(null)}>← ALL GAMES</button>
      {!user&&['chess','rps','world'].includes(selected)&&<p className="forest-game-login">Real-time multiplayer needs an account. <button onClick={()=>onAuth('login')}>Sign in ↗</button></p>}
      {selected==='world'?<World live={live} user={user}/>:selected==='chess'?<Chess live={live} user={user}/>:selected==='rps'?<RPS live={live} user={user}/>:selected==='2048'?<Puzzle2048/>:selected==='mines'?<Minesweeper/>:<Uma/>}
    </div>}
 </section>;
}
