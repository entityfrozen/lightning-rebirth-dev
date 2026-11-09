import React, { useEffect, useRef, useState } from 'react';
import { GlassHero } from './GlassHero.jsx';
import { SceneBoundary } from './SceneBoundary.jsx';
import { Icon } from './icons.jsx';
import { readLocal, saveLocal } from './constants.js';

const games=[
  {id:'comet',label:'Comet Drift',type:'ARCADE / SKILL',description:'Pilot through the debris field. Collect energy, dodge incoming rocks.',symbol:'✦'},
  {id:'pulse',label:'Pulse Reflex',type:'ARCADE / REACTION',description:'Wait for the signal, then react as fast as you can.',symbol:'◉'},
  {id:'memory',label:'Constellation',type:'ARCADE / MEMORY',description:'Find all the matching star pairs before the timer runs out.',symbol:'✧'}
];
const random=(a,b)=>a+Math.random()*(b-a);

function CometGame({onRecord}) {
  const ref=useRef(null);
  const state=useRef({x:90,y:210,rocks:[],orbs:[],frame:0,score:0,lives:3,over:false});
  const pointer=useRef({x:95,y:210,active:false});
  const [started,setStarted]=useState(false);
  const [score,setScore]=useState(0);
  const [lives,setLives]=useState(3);
  const [ended,setEnded]=useState(false);

  function start(){
    state.current={x:90,y:210,rocks:[],orbs:[],frame:0,score:0,lives:3,over:false};
    pointer.current={x:95,y:210,active:false};
    setScore(0);setLives(3);setEnded(false);setStarted(true);
  }
  useEffect(()=>{
    if(!started)return;
    const canvas=ref.current;
    const ctx=canvas?.getContext('2d');
    if(!ctx)return;
    let raf=0,last=0;
    const keys=new Set();
    const down=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);pointer.current.active=false;e.preventDefault();}};
    const up=e=>keys.delete(e.code);
    const move=e=>{const b=canvas.getBoundingClientRect();pointer.current={x:(e.clientX-b.left)/b.width*720,y:(e.clientY-b.top)/b.height*420,active:true};};
    window.addEventListener('keydown',down);
    window.addEventListener('keyup',up);
    canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerdown',move);
    const render=(now)=>{
      const dt=Math.min(2,(now-(last||now))/16.667);last=now;
      const g=state.current;
      ctx.fillStyle='#06101e';ctx.fillRect(0,0,720,420);
      for(let i=0;i<72;i++){
        const x=(i*131+g.frame*(.26+i%4*.23))%720;
        const y=(i*97+41)%420;
        ctx.globalAlpha=.18+(i%5)*.07;ctx.fillStyle='#bfdfff';ctx.fillRect(720-x,y,i%7===0?2:1,i%7===0?2:1);
      }
      ctx.globalAlpha=1;
      const speed=5*dt;
      if(keys.has('ArrowUp')||keys.has('KeyW'))g.y-=speed;
      if(keys.has('ArrowDown')||keys.has('KeyS'))g.y+=speed;
      if(keys.has('ArrowLeft')||keys.has('KeyA'))g.x-=speed;
      if(keys.has('ArrowRight')||keys.has('KeyD'))g.x+=speed;
      g.y=Math.max(25,Math.min(395,g.y));g.x=Math.max(22,Math.min(698,g.x));
      if(pointer.current.active){g.x+=(pointer.current.x-g.x)*Math.min(1,.19*dt);g.y+=(pointer.current.y-g.y)*Math.min(1,.19*dt);}
      g.frame+=dt;
      if(g.frame%32<dt)g.rocks.push({x:740,y:random(20,400),r:random(11,22),speed:random(3.2,5.5)});
      if(g.frame%53<dt)g.orbs.push({x:740,y:random(20,400),r:8,speed:3.7});
      ctx.save();ctx.translate(g.x,g.y);
      ctx.shadowColor='#8feaff';ctx.shadowBlur=24;
      ctx.fillStyle='#c6fbff';ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(-16,-13);ctx.lineTo(-8,0);ctx.lineTo(-16,13);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#6ddcff';ctx.fillRect(-22,-3,12,6);ctx.restore();
      g.rocks=g.rocks.filter(rock=>rock.x>-30);
      g.orbs=g.orbs.filter(orb=>orb.x>-25);
      for(const rock of g.rocks){
        rock.x-=rock.speed*dt;
        ctx.shadowColor='#dd8d76';ctx.shadowBlur=7;ctx.fillStyle='#9d6270';
        ctx.beginPath();ctx.arc(rock.x,rock.y,rock.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        if(Math.hypot(g.x-rock.x,g.y-rock.y)<rock.r+10){
          rock.x=-100;g.lives--;setLives(g.lives);
          if(g.lives<=0){g.over=true;setEnded(true);setStarted(false);onRecord(g.score);}
        }
      }
      for(const orb of g.orbs){
        orb.x-=orb.speed*dt;
        ctx.shadowBlur=18;ctx.shadowColor='#91eaff';ctx.fillStyle='#9ef6ff';
        ctx.beginPath();ctx.arc(orb.x,orb.y,orb.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        if(Math.hypot(g.x-orb.x,g.y-orb.y)<orb.r+13){orb.x=-100;g.score+=10;setScore(g.score);}
      }
      if(!g.over)raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',move);};
  },[started,onRecord]);
  return <div className="game-play glass">
    <div className="game-top"><div><span className="micro">01 / COMET DRIFT</span><h2>Navigate the stellar debris field</h2></div><div className="game-metrics"><span>ENERGY <b>{score}</b></span><span>SHIELDS <b>{'◆'.repeat(Math.max(0,lives))}</b></span></div></div>
    <div className="game-arena">
      <canvas ref={ref} width="720" height="420" aria-label="Comet Drift play field" />
      {!started&&<div className="arena-cover"><div className="arena-message"><span className="game-big-symbol">✧</span><h3>{ended?'Flight ended':'Ready for launch?'}</h3><p>{ended?'Your score: '+score:'Use WASD or arrow keys. Collect cyan orbs; avoid red asteroids.'}</p><button className="primary-btn" onClick={start}>{ended?'Fly again':'Launch game'} <Icon name="arrow" size={15}/></button></div></div>}
    </div>
    <div className="game-bottom"><span>W / A / S / D · ARROW KEYS · TOUCHPAD SUPPORT</span><button className="subtle-btn" onClick={start}>Restart ↗</button></div>
  </div>;
}
function PulseGame({onRecord}){
  const [phase,setPhase]=useState('ready');
  const [time,setTime]=useState(null);
  const startTime=useRef(0),timer=useRef(0);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const start=()=>{clearTimeout(timer.current);setTime(null);setPhase('wait');timer.current=setTimeout(()=>{startTime.current=performance.now();setPhase('go');},random(1000,3500));};
  const hit=()=>{if(phase==='wait'){clearTimeout(timer.current);setPhase('early');return;}if(phase==='go'){const ms=Math.round(performance.now()-startTime.current);setTime(ms);onRecord(ms);setPhase('done');}};
  return <div className="game-play glass">
    <div className="game-top"><div><span className="micro">02 / PULSE REFLEX</span><h2>Beat the speed of light</h2></div><div className="game-metrics"><span>REACTION <b>{time===null?'—':time+'ms'}</b></span></div></div>
    <button className={'reflex-field '+phase} onClick={phase==='ready'||phase==='early'||phase==='done'?start:hit}>
      <span className="pulse-ring">◎</span>
      <strong>{phase==='ready'?'Initiate signal':phase==='wait'?'WAIT FOR CYAN':phase==='go'?'TAP NOW':phase==='early'?'Too early!':time+' ms'}</strong>
      <small>{phase==='ready'?'Tap to begin':phase==='wait'?'Do not tap until the field lights up':phase==='go'?'NOW':phase==='early'?'Tap to retry':'Tap for another attempt'}</small>
    </button>
    <div className="game-bottom"><span>REFLEX TRAINING · RANDOM SIGNAL DELAY</span></div>
  </div>;
}
const symbols=['✦','☽','◇','✧','☼','✳'];
function MemoryGame({onRecord}){
  const [cards,setCards]=useState(()=>makeCards());
  const [open,setOpen]=useState([]);
  const [matched,setMatched]=useState([]);
  const [attempts,setAttempts]=useState(0);
  function makeCards(){return [...symbols,...symbols].map((symbol,i)=>({symbol,id:i})).sort(()=>Math.random()-.5);}
  const select=id=>{
    if(open.length>=2||open.includes(id)||matched.includes(id))return;
    const next=[...open,id];setOpen(next);
    if(next.length===2){
      setAttempts(n=>n+1);
      if(cards[next[0]].symbol===cards[next[1]].symbol){const all=[...matched,...next];setMatched(all);setOpen([]);if(all.length===cards.length)onRecord(attempts+1);}
      else setTimeout(()=>setOpen([]),850);
    }
  };
  const restart=()=>{setCards(makeCards());setOpen([]);setMatched([]);setAttempts(0);};
  return <div className="game-play glass">
    <div className="game-top"><div><span className="micro">03 / CONSTELLATION</span><h2>Remember the star patterns</h2></div><div className="game-metrics"><span>PAIRS <b>{matched.length/2}/6</b></span><span>TURNS <b>{attempts}</b></span></div></div>
    <div className="memory-field">{cards.map((card,index)=><button key={card.id} onClick={()=>select(index)} className={'memory-tile '+(matched.includes(index)?'matched':open.includes(index)?'open':'')} aria-label={matched.includes(index)||open.includes(index)?card.symbol:'Hidden card'}>{matched.includes(index)||open.includes(index)?card.symbol:'?'}</button>)}</div>
    <div className="game-bottom"><span>{matched.length===cards.length?'Constellation complete!':'Find 6 pairs to complete the constellation.'}</span><button className="subtle-btn" onClick={restart}>Shuffle ↗</button></div>
  </div>;
}
export function Arcade({reduced}){
  const [active,setActive]=useState('comet');
  const [records,setRecords]=useState(()=>readLocal('arcade-records',{}));
  const record=React.useCallback((value)=>{
    setRecords(prev=>{
      const old=prev[active], best=old===undefined||active==='pulse'||active==='memory' ? Math.min(old??Infinity,value) : Math.max(old,value);
      const next={...prev,[active]:best};saveLocal('arcade-records',next);return next;
    });
  },[active]);
  return <div className="screen arcade-screen">
    <section className="arcade-hero">
      <div className="arcade-hero-copy"><span className="eyebrow">CELESTIAL / ENTERTAINMENT SYSTEM</span><h1>Play outside<br/><em>the ordinary.</em></h1><p>Three mini-games. One universe. Your next high score is waiting.</p><span className="hero-tag">✧ DRAG THE GLASS TO EXPLORE THE LIGHT</span></div>
      <SceneBoundary fallback={<div className="glass-canvas-fallback">✧</div>}><GlassHero reduced={reduced}/></SceneBoundary>
    </section>
    <div className="section-heading"><div><span className="micro">YOUR ARCADE</span><h2>Choose your game</h2></div><span className="muted-small">03 PLAYABLE EXPERIENCES</span></div>
    <div className="arcade-grid">
      <div className="game-list">{games.map((g,i)=><button key={g.id} className={'game-pick glass '+(active===g.id?'selected':'')} onClick={()=>setActive(g.id)}>
        <span className="game-symbol">{g.symbol}</span><span className="game-pick-info"><small>{g.type}</small><strong>{g.label}</strong><span>{g.description}</span><i>BEST {records[g.id]??'—'}</i></span><b>{String(i+1).padStart(2,'0')}</b>
      </button>)}</div>
      {active==='comet'?<CometGame key="comet" onRecord={record}/>:active==='pulse'?<PulseGame key="pulse" onRecord={record}/>:<MemoryGame key="memory" onRecord={record}/>}
    </div>
  </div>;
}
