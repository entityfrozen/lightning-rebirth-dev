// Reimu's shrine-themed effects live outside the theme palette.
// The whole effect is optional: Lite effects and reduced-motion both turn it off.
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const enabled=()=>document.documentElement.dataset.palette==='touhou'&&document.documentElement.dataset.fx!=='lite'&&!reducedMotion();
let mounted=false;
let lastPointer=0;
let activeTimeout=0;
let shrine;

function makePaper({x,y,angle=0,index=0}){
 const paper=document.createElement('span');
 paper.className='reimu-paper';
 paper.style.setProperty('--x',x+'px');
 paper.style.setProperty('--y',y+'px');
 paper.style.setProperty('--a',angle+'deg');
 paper.style.setProperty('--i',index);
 paper.setAttribute('aria-hidden','true');
 paper.textContent=index%3===0?'✦':'';
 return paper;
}
function burst(x,y,{grand=false}={}){
 if(!enabled())return;
 const layer=document.createElement('div');
 layer.className='reimu-burst'+(grand?' grand':'');
 layer.style.left=x+'px';layer.style.top=y+'px';
 layer.setAttribute('aria-hidden','true');
 const count=grand?20:7;
 for(let n=0;n<count;n++){
  const angle=(n/count)*Math.PI*2;
  const distance=(grand?125:48)+(n%4)*12;
  layer.append(makePaper({x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,angle:n*41,index:n}));
 }
 document.body.append(layer);
 layer.addEventListener('animationend',event=>{
  if(event.target===layer)layer.remove();
 },{once:true});
 setTimeout(()=>layer.remove(),1300);
}

function pointerReaction(event){
 if(!enabled()||event.button!==0||event.target.closest('input,textarea,select,[contenteditable],.reimu-spell-button'))return;
 const now=performance.now();
 if(now-lastPointer<520)return;
 lastPointer=now;
 burst(event.clientX,event.clientY);
}

export function refreshReimuEffects({celebrate=false}={}){
 if(!mounted)return;
 const active=document.documentElement.dataset.palette==='touhou';
 shrine.hidden=!active;
 shrine.setAttribute('aria-hidden','true');
 if(celebrate&&enabled()){
  clearTimeout(activeTimeout);
  shrine.classList.remove('entering');
  void shrine.offsetWidth;
  shrine.classList.add('entering');
  burst(window.innerWidth*.5,window.innerHeight*.43,{grand:true});
  activeTimeout=setTimeout(()=>shrine.classList.remove('entering'),1600);
 }
}

export function mountReimuEffects(){
 if(mounted)return;
 mounted=true;
 shrine=document.createElement('div');
 shrine.className='reimu-shrine-overlay';
 shrine.setAttribute('aria-hidden','true');
 shrine.innerHTML='<div class="reimu-shrine-gate"><i></i><i></i><i></i><i></i></div><div class="reimu-shrine-name">博麗神社 <span>HAKUREI SHRINE</span></div>';
 document.body.append(shrine);
 document.addEventListener('pointerdown',pointerReaction,{passive:true});
 window.addEventListener('celestial:reimu-activated',()=>refreshReimuEffects({celebrate:true}));
 window.addEventListener('celestial:reimu-refresh',()=>refreshReimuEffects());
 refreshReimuEffects();
}
