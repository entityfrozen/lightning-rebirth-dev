/**
 * Draw catalog headings onto high-DPI canvases.
 *
 * Text rendering is visual presentation, not content protection. Keep the
 * parent button's accessible name; canvas pixels aren't announced by readers.
 */
export function wrapCanvasTitle(value,measure,maxWidth){
 const words=String(value||'').trim().split(/\s+/u).filter(Boolean);
 const lines=[];
 let line='';
 const limit=Math.max(1,maxWidth);
 for(const word of words){
  if(line&&measure(line+' '+word)<=limit){line+=' '+word;continue}
  if(line){lines.push(line);line=''}
  if(measure(word)<=limit){line=word;continue}
  // Very long or unspaced names must fit even on narrow mobile cards.
  const chars=typeof Intl.Segmenter==='function'
   ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word),part=>part.segment)
   : Array.from(word);
  for(const char of chars){
   if(line&&measure(line+char)>limit){lines.push(line);line=''}
   line+=char;
  }
 }
 if(line)lines.push(line);
 return lines.length?lines:[''];
}

export function drawCanvasTitle(canvas,title){
 if(!canvas||!canvas.isConnected)return false;
 const width=canvas.getBoundingClientRect().width;
 if(width<15)return false; // Hidden view; repaint after it becomes visible.
 const ctx=canvas.getContext?.('2d');
 if(!ctx){
  const fallback=document.createElement('span');
  fallback.className=canvas.className;
  fallback.textContent=title;
  canvas.replaceWith(fallback);
  return false;
 }
 const style=getComputedStyle(canvas);
 const fontSize=Number.parseFloat(style.fontSize)||13;
 const lineHeight=Number.parseFloat(style.lineHeight)||fontSize*1.35;
 const font=style.fontWeight+' '+fontSize+'px '+style.fontFamily;
 ctx.font=font;
 const lines=wrapCanvasTitle(title,value=>ctx.measureText(value).width,width-2);
 const height=Math.max(Math.ceil(fontSize+4),Math.ceil(lines.length*lineHeight+3));
 const scale=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 const pixelsWide=Math.max(1,Math.round(width*scale));
 const pixelsHigh=Math.max(1,Math.round(height*scale));
 // Never reset a canvas unnecessarily; resetting clears its drawing context.
 if(canvas.width!==pixelsWide)canvas.width=pixelsWide;
 if(canvas.height!==pixelsHigh)canvas.height=pixelsHigh;
 canvas.style.height=height+'px';
 ctx.setTransform(scale,0,0,scale,0,0);
 ctx.clearRect(0,0,width,height);
 ctx.font=font;
 ctx.fillStyle=style.color;
 ctx.textAlign='left';
 ctx.textBaseline='top';
 for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],0,1+i*lineHeight,width-2);
 return true;
}

export function watchCanvasTitles(grid,detailsAtIndex){
 let task=0,previousWidth=0,disposed=false;
 function paint(){
  task=0;
  if(disposed||!grid.isConnected)return;
  for(const button of grid.querySelectorAll('button[data-entry-index]')){
   const index=Number(button.dataset.entryIndex);
   if(!Number.isInteger(index))continue;
   const details=detailsAtIndex(index);
   if(!details)continue;
   const titleCanvas=button.querySelector('canvas[data-paint="0"]');
   const sourceCanvas=button.querySelector('canvas[data-paint="1"]');
   if(titleCanvas&&typeof details.title==='string')
    drawCanvasTitle(titleCanvas,details.title);
   if(sourceCanvas&&typeof details.source==='string')
    drawCanvasTitle(sourceCanvas,details.source);
  }
 }
 function schedule(){
  if(disposed||task)return;
  task=requestAnimationFrame(paint);
 }
 const onResize=()=>{
  const width=grid.getBoundingClientRect().width;
  if(Math.abs(previousWidth-width)>0.5){previousWidth=width;schedule()}
 };
 const observer=new ResizeObserver(onResize);
 observer.observe(grid);
 const themeObserver=new MutationObserver(schedule);
 themeObserver.observe(document.documentElement,{
  attributes:true,attributeFilter:['data-theme','data-palette','data-fx','class','style']
 });
 window.addEventListener('resize',schedule,{passive:true});
 document.fonts?.ready.then(schedule).catch(()=>{});
 document.fonts?.addEventListener?.('loadingdone',schedule);
 return {
  redraw:schedule,
  dispose(){
   disposed=true;
   if(task)cancelAnimationFrame(task);
   observer.disconnect();
   themeObserver.disconnect();
   window.removeEventListener('resize',schedule);
   document.fonts?.removeEventListener?.('loadingdone',schedule);
  }
 };
}
