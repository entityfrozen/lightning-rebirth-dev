import {readLocal,saveLocal} from './constants.js';

export const cloakPresets={
  celestial:{label:'Celestial',title:'Celestial',icon:'/assets/celestial-star.svg'},
  workspace:{label:'Workspace',title:'Workspace',icon:'/assets/celestial-star.svg'},
  notes:{label:'My Notes',title:'My Notes',icon:'/assets/celestial-star.svg'},
  blank:{label:'Untitled',title:'Untitled',icon:'/assets/celestial-star.svg'},
  custom:{label:'Custom',title:'',icon:''}
};
const original={title:'Celestial',icon:'/assets/celestial-star.svg'};

export function getCloakSettings(){
  const saved=readLocal('cloak-settings',{});
  return {
    preset:Object.hasOwn(cloakPresets,saved?.preset)?saved.preset:'celestial',
    title:typeof saved?.title==='string'?saved.title.slice(0,70):'',
    icon:typeof saved?.icon==='string'?saved.icon.slice(0,500):''
  };
}
export function cloakIdentity(prefs=getCloakSettings()){
  const preset=cloakPresets[prefs.preset]||cloakPresets.celestial;
  const title=(prefs.preset==='custom'?prefs.title:preset.title).trim().slice(0,70)||original.title;
  let icon=prefs.preset==='custom'?prefs.icon:preset.icon;
  try{
    const parsed=new URL(icon,window.location.href);
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)icon=original.icon;
    else icon=parsed.href;
  }catch{icon=original.icon;}
  return {title,icon};
}
export function applyCloak(prefs=getCloakSettings()){
  const identity=cloakIdentity(prefs);
  document.title=identity.title;
  let link=document.querySelector('link[data-celestial-cloak]');
  if(!link){link=document.createElement('link');link.rel='icon';link.dataset.celestialCloak='true';document.head.append(link);}
  link.href=identity.icon;
  if(window.parent!==window){
    try{window.parent.postMessage({type:'celestial:identity',...identity},window.location.origin);}catch{}
  }
  return identity;
}
export function saveCloak(prefs){
  const next={...getCloakSettings(),...prefs};
  if(!Object.hasOwn(cloakPresets,next.preset))next.preset='celestial';
  saveLocal('cloak-settings',next);
  applyCloak(next);
  return next;
}
/** The wrapper is a same-origin about:blank document. It does not hide network activity. */
export function openCloakedTab(){
  const popup=window.open('about:blank','_blank');
  if(!popup)return {ok:false,error:'Your browser blocked the new tab. Allow popups and try again.'};
  try{
    const doc=popup.document;
    doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>');doc.close();
    const identity=cloakIdentity();
    doc.title=identity.title;
    const link=doc.createElement('link');link.rel='icon';link.href=identity.icon;doc.head.append(link);
    const style=doc.createElement('style');
    style.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#07111b}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}';
    doc.head.append(style);
    const frame=doc.createElement('iframe');
    frame.title='Celestial workspace';
    frame.allow='fullscreen; clipboard-read; clipboard-write; picture-in-picture';
    frame.src=window.location.href;
    doc.body.append(frame);
    popup.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
      if(event.data?.type!=='celestial:identity')return;
      doc.title=String(event.data.title||identity.title).slice(0,70);
      try{const icon=new URL(event.data.icon,location.origin);if(['https:','http:'].includes(icon.protocol))link.href=icon.href;}catch{}
    });
    popup.focus();
    return {ok:true};
  }catch(error){
    try{popup.close();}catch{}
    return {ok:false,error:'Your browser does not allow this tab mode. Open Celestial normally.'};
  }
}
