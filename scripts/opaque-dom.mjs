import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

// Original class names remain in authoring code, not in the shipped bundle.
// This is presentation obfuscation, not a security boundary.
const selected=/\.(arcade-[A-Za-z0-9_-]+|cel-[A-Za-z0-9_-]+|celestial-[A-Za-z0-9_-]+)/g;
const filePattern=/\/public\/boba\/(?:[^/]+\.js|(?:native|original)\.css)$/;
const escaped=s=>s.replace(/[|\\{}()[\]^$+*?.]/g,'\\$&');

export function buildOpaqueClassMap(style){
 const tokens=[...new Set([...style.matchAll(selected)].map(match=>match[1]))];
 const map=new Map(tokens.map(token=>[
  token,'_bp'+createHash('sha256').update('brightpath:dom:v1:'+token).digest('hex').slice(0,10)
 ]));
 if(new Set(map.values()).size!==map.size)throw Error('Class token collision');
 return map;
}

export function replaceOpaqueClasses(source,map){
 const names=[...map.keys()].sort((a,b)=>b.length-a.length);
 if(!names.length)return source;
 const token=new RegExp('(?<![A-Za-z0-9_-])(?:'+names.map(escaped).join('|')+')(?![A-Za-z0-9_-])','g');
 return source.replace(token,match=>map.get(match));
}

export function opaqueDomClasses({stylesheet}={}){
 const css=stylesheet??readFileSync(resolve('public/boba/native.css'),'utf8');
 // Include intentionally unstyled classes, too, so inspecting a launched
 // game cannot reveal the original section names.
 const mapping=buildOpaqueClassMap(css+'.cel-rps{}.celestial-generated-image{}');
 return {
  name:'brightpath-opaque-dom-classes',
  apply:'build',enforce:'pre',
  transform(code,id){
   const path=id.split('?')[0].replaceAll('\\','/');
   if(!filePattern.test(path))return null;
   const output=replaceOpaqueClasses(code,mapping);
   return output===code?null:{code:output,map:null};
  }
 };
}
