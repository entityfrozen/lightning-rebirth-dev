import React,{useEffect,useRef,useState} from 'react';
import {Arcade} from './Arcade.jsx';
import {readLocal,saveLocal} from './constants.js';
import {
  Globe24Filled,Chat24Filled,Cloud24Filled,MusicNote224Filled,
  Note24Filled,Calculator24Filled,Timer24Filled,ArrowUpRight20Filled,
  ArrowLeft20Filled,Add20Filled,Delete20Filled,
  Chess20Filled,Games20Filled,Grid20Filled,Target20Filled
} from '@fluentui/react-icons';

const launchers=[
  {id:'browser',label:'Browser',category:'ESSENTIAL',description:'Your tabs, history and bookmarked places.',icon:Globe24Filled,gradient:'teal'},
  {id:'chat',label:'Chat',category:'ESSENTIAL',description:'The communities and conversations you kept.',icon:Chat24Filled,gradient:'blue'},
  {id:'ai',label:'Celestial AI',category:'ESSENTIAL',description:'A space for ideas, drafts and questions.',icon:Cloud24Filled,gradient:'purple'},
  {id:'notes',label:'Notes',category:'TOOLS',description:'Quick notes that stay on this device.',icon:Note24Filled,gradient:'amber'},
  {id:'calculator',label:'Calculator',category:'TOOLS',description:'A little math without leaving Celestial.',icon:Calculator24Filled,gradient:'mint'},
  {id:'focus',label:'Focus Timer',category:'TOOLS',description:'A quiet countdown for getting things done.',icon:Timer24Filled,gradient:'rose'},
  {id:'music',label:'Music',category:'TOOLS',description:'Open your music in the browser.',icon:MusicNote224Filled,gradient:'pink'},

  {id:'chess',label:'Chess',category:'PLAY',description:'Play a bot or challenge someone live.',icon:Chess20Filled,gradient:'blue',game:true},
  {id:'2048',label:'2048',category:'PLAY',description:'Slide and merge. One more try?',icon:Grid20Filled,gradient:'amber',game:true},
  {id:'mines',label:'Minesweeper',category:'PLAY',description:'Find the safe tiles. Avoid the mines.',icon:Target20Filled,gradient:'mint',game:true},
  {id:'rps',label:'Rock Paper Scissors',category:'PLAY',description:'Play quick rounds with the community.',icon:Games20Filled,gradient:'rose',game:true},
  {id:'world',label:'WorldPvP',category:'PLAY',description:'Claim territory and compete for the map.',icon:Globe24Filled,gradient:'teal',game:true},
  {id:'uma',label:'Uma Versus',category:'PLAY',description:'A fighting game from its original creator.',icon:Games20Filled,gradient:'purple',game:true}
];
const noteKey='apps-notes-v1';
const pretty=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');

function Notes(){
  const [notes,setNotes]=useState(()=>readLocal(noteKey,[{id:'welcome',title:'Quick note',body:'Anything worth keeping goes here.'}]));
  const [selected,setSelected]=useState(null);
  const active=notes.find(n=>n.id===selected)||notes[0];
  useEffect(()=>saveLocal(noteKey,notes),[notes]);
  const update=patch=>setNotes(all=>all.map(n=>n.id===active?.id?{...n,...patch}:n));
  const add=()=>{const next={id:crypto.randomUUID(),title:'Untitled',body:''};setNotes(all=>[next,...all].slice(0,70));setSelected(next.id);};
  const remove=()=>{const remaining=notes.filter(n=>n.id!==active.id);setNotes(remaining);setSelected(remaining[0]?.id||null);};
  return <div className="celestial-tool-notes">
    <aside>
      <button className="celestial-tool-create" onClick={add}><Add20Filled/> New note</button>
      {notes.map(n=><button key={n.id} className={active?.id===n.id?'selected':''} onClick={()=>setSelected(n.id)}>{n.title||'Untitled'}</button>)}
    </aside>
    <div className="celestial-tool-note-editor">
      {active?<><div className="celestial-note-bar">
        <input aria-label="Note title" value={active.title} onChange={e=>update({title:e.target.value.slice(0,80)})}/>
        <button title="Delete note" aria-label="Delete note" onClick={remove}><Delete20Filled/></button>
      </div><textarea aria-label="Note text" value={active.body}
        onChange={e=>update({body:e.target.value.slice(0,20000)})}
        placeholder="Write something…" spellCheck/></>:<p>Your notebook is empty. Create a note to begin.</p>}
    </div>
  </div>;
}
function Calculator(){
  const [first,setFirst]=useState('0');
  const [second,setSecond]=useState('0');
  const [operation,setOperation]=useState('+');
  const left=Number(first),right=Number(second);
  const result=operation==='+'?left+right:operation==='−'?left-right:operation==='×'?left*right:right===0?null:left/right;
  return <div className="celestial-tool-calculator">
    <p>Just the numbers you need.</p>
    <div className="celestial-calculator-fields"><input aria-label="First number" inputMode="decimal" type="number" value={first} onChange={e=>setFirst(e.target.value)}/>
      <select aria-label="Operation" value={operation} onChange={e=>setOperation(e.target.value)}>
        {['+','−','×','÷'].map(op=><option key={op}>{op}</option>)}
      </select>
      <input aria-label="Second number" inputMode="decimal" type="number" value={second} onChange={e=>setSecond(e.target.value)}/>
    </div>
    <div className="celestial-calculator-answer"><span>RESULT</span><strong>{!Number.isFinite(result)||result===null?'Undefined':Number(result.toPrecision(11)).toLocaleString()}</strong></div>
  </div>;
}
function Focus(){
  const [minutes,setMinutes]=useState(25);
  const [remaining,setRemaining]=useState(25*60);
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    if(!running)return;
    const interval=setInterval(()=>setRemaining(n=>{
      if(n<=1){setRunning(false);return 0;}
      return n-1;
    }),1000);
    return()=>clearInterval(interval);
  },[running]);
  const choose=minutes=>{setRunning(false);setMinutes(minutes);setRemaining(minutes*60);};
  return <div className="celestial-tool-focus">
    <div className="celestial-focus-clock">{pretty(remaining)}</div>
    <p>{remaining===0?'Session complete.':running?'One thing at a time.':'Your time, your pace.'}</p>
    <div className="celestial-focus-presets">{[5,15,25,45].map(n=><button key={n} className={minutes===n?'selected':''} onClick={()=>choose(n)}>{n} min</button>)}</div>
    <div className="celestial-focus-actions"><button onClick={()=>setRunning(value=>!value)} disabled={remaining===0}>{running?'Pause':'Start'}</button>
      <button onClick={()=>choose(minutes)}>Reset</button></div>
  </div>;
}
export function Apps({onNavigate,onMusic,user,live,onAuth}){
  const [query,setQuery]=useState('');
  const [opened,setOpened]=useState(null);
  const shell=useRef(null);
  const [fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{
    const handler=()=>setFullscreen(document.fullscreenElement===shell.current);
    document.addEventListener('fullscreenchange',handler);
    return()=>document.removeEventListener('fullscreenchange',handler);
  },[]);
  const toggleFullscreen=async()=>{
    try{
      if(document.fullscreenElement===shell.current)await document.exitFullscreen();
      else await shell.current?.requestFullscreen?.();
    }catch{}
  };
  const selected=launchers.find(app=>app.id===opened);
  const filtered=launchers.filter(app=>(app.label+' '+app.description).toLowerCase().includes(query.toLowerCase()));
  const open=id=>{
    if(['browser','chat','ai'].includes(id))return onNavigate(id);
    if(id==='music')return onMusic();
    setOpened(id);
  };
  return <section className="celestial-apps-page">
    <div className="celestial-apps-inner">
      {selected?<><button className="celestial-apps-return" onClick={()=>setOpened(null)}><ArrowLeft20Filled/> All apps</button>
        <header className="celestial-apps-heading"><span className="celestial-section-kicker">CELESTIAL / APPS</span><h1>{selected.label}</h1><p>{selected.description}</p></header>
        <div className="celestial-tool-shell" ref={shell}>
          <button type="button" className="celestial-app-game-fullscreen"
            aria-label={fullscreen?'Exit game fullscreen':'Fullscreen game'}
            title={fullscreen?'Exit fullscreen (Esc)':'Fullscreen'}
            onClick={toggleFullscreen}>{fullscreen?'▣ Exit fullscreen':'⛶ Fullscreen'}</button>
          {selected.game?<Arcade embedded gameId={selected.id} live={live} user={user} onAuth={onAuth}/>:selected.id==='notes'?<Notes/>:selected.id==='calculator'?<Calculator/>:<Focus/>}
        </div>
      </>:<>
        <header className="celestial-apps-heading"><span className="celestial-section-kicker">YOUR SPACE / YOUR TOOLS</span><h1>Everything, <em>in one place.</em></h1>
          <p>Only what you use. No clutter, no fake launch buttons.</p></header>
        <div className="celestial-apps-search"><span>⌕</span><input aria-label="Find an app" placeholder="Find an app…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>APPS</kbd></div>
        {['ESSENTIAL','PLAY','TOOLS'].map(group=>{
          const items=filtered.filter(app=>app.category===group);
          return items.length?<div className="celestial-apps-group" key={group}>
            <h2>{group==='ESSENTIAL'?'Your essentials':group==='PLAY'?'Games you can actually play':'Useful little things'}</h2>
            <div className="celestial-apps-grid">{items.map(app=>{
              const Glyph=app.icon;
              return <button key={app.id} className="celestial-app-tile" onClick={()=>open(app.id)}>
                <span className={'celestial-app-tile-symbol '+app.gradient}><Glyph/></span>
                <span className="celestial-app-tile-content"><strong>{app.label}</strong><small>{app.description}</small></span>
                <ArrowUpRight20Filled className="celestial-app-tile-arrow"/>
              </button>;
            })}</div>
          </div>:null;
        })}
        {!filtered.length&&<div className="celestial-apps-empty">No apps matched “{query}”.</div>}
      </>}
    </div>
  </section>;
}
