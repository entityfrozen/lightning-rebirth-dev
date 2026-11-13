/**
 * Scramjet rewrites links to same-origin URLs containing the destination.
 * Google also stores the original URL in scramjet-attr-href. Keep those
 * links functional while avoiding query text in their rendered attributes.
 *
 * This is a DOM-presentation layer, NOT search privacy from sites, DevTools
 * Network, browser history, requests, or accessible running JavaScript.
 */
const SEARCH_PARAM=/(?:[?&]|%3f|%26)(?:q|query|search|text|wd)(?:=|%3d)/i;
const native=typeof Element==='undefined'?null:{
 get:Element.prototype.getAttribute,
 set:Element.prototype.setAttribute,
 remove:Element.prototype.removeAttribute
};
const get=(el,key)=>native?native.get.call(el,key):el.getAttribute(key);
const set=(el,key,value)=>native?native.set.call(el,key,value):el.setAttribute(key,value);
const remove=(el,key)=>native?native.remove.call(el,key):el.removeAttribute(key);

export function hasSearchQuery(value){
 return typeof value==='string'&&SEARCH_PARAM.test(value);
}

export function maskSearchAnchor(anchor,base,targets){
 const href=get(anchor,'href')||'';
 const original=get(anchor,'scramjet-attr-href')||'';
 if(!hasSearchQuery(href)&&!hasSearchQuery(original))return false;
 if(hasSearchQuery(href)){
  let target;
  try{target=new URL(href,base)}catch{return false}
  if(target.protocol!=='https:'&&target.protocol!=='http:')return false;
  targets.set(anchor,target.href);
  set(anchor,'href','#');
 }
 // Don't remove navigation information unless a safe replacement is saved.
 if(targets.has(anchor)&&hasSearchQuery(original))
  remove(anchor,'scramjet-attr-href');
 return targets.has(anchor);
}

export function maskFrameSearchLinks(doc,follow){
 if(!doc?.documentElement||typeof MutationObserver==='undefined')return()=>{};
 const targets=new WeakMap();
 const pending=new Set();
 const win=doc.defaultView||window;
 let frame=0,closed=false;
 const apply=()=>{
  frame=0;
  if(closed)return;
  for(const anchor of pending)if(anchor.isConnected)
   maskSearchAnchor(anchor,doc.baseURI,targets);
  pending.clear();
 };
 const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(apply)};
 const queue=node=>{
  if(node?.nodeType!==1)return;
  if(node.matches?.('a[href],a[scramjet-attr-href]'))pending.add(node);
  for(const anchor of node.querySelectorAll?.('a[href],a[scramjet-attr-href]')||[])
   pending.add(anchor);
  schedule();
 };
 const observer=new MutationObserver(records=>{
  for(const change of records){
   if(change.type==='attributes')queue(change.target);
   else for(const node of change.addedNodes)queue(node);
  }
 });
 observer.observe(doc.documentElement,{
  subtree:true,childList:true,attributes:true,
  attributeFilter:['href','scramjet-attr-href']
 });
 queue(doc.documentElement);
 function onClick(event){
  const anchor=event.target?.closest?.('a');
  const url=anchor&&targets.get(anchor);
  if(!url||event.defaultPrevented)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  follow(url,{
   newTab:Boolean(event.ctrlKey||event.metaKey||event.shiftKey||
    event.button===1||anchor.target==='_blank')
  });
 }
 doc.addEventListener('click',onClick,true);
 doc.addEventListener('auxclick',onClick,true);
 return()=>{
  closed=true;
  if(frame)win.cancelAnimationFrame(frame);
  observer.disconnect();
  doc.removeEventListener('click',onClick,true);
  doc.removeEventListener('auxclick',onClick,true);
  pending.clear();
 };
}
