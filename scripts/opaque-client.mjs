import {createHash} from 'node:crypto';

// Keep source readable; rewrite only class tokens in the production bundle.
// CSS is authoritative, so selectors, styles and generated markup stay in sync.
const candidates=/\.((?:arcade|cel-dist|cel-chat|cel-simple|native|cel-2048|cel-ttt|cel-rps|cel-chess|cel-connect|cel-mines|cel-snake)-[a-zA-Z0-9_-]+)/g;
const token=name=>'_'+createHash('sha256').update(name).digest('hex').slice(0,10);
const isText=file=>file.type==='chunk'||(file.type==='asset'&&file.fileName.endsWith('.css'));

export function opaqueClientClasses(){
 return {
  name:'celestial-opaque-client-classes',
  apply:'build',
  enforce:'post',
  generateBundle(_options,bundle){
   const names=new Set();
   for(const file of Object.values(bundle)){
    if(file.type!=='asset'||!file.fileName.endsWith('.css'))continue;
    for(const match of String(file.source).matchAll(candidates))names.add(match[1]);
   }
   if(!names.size)throw Error('Opaque class rewrite could not find native styles.');
   const replacements=[...names].sort((a,b)=>b.length-a.length).map(name=>[
    new RegExp('(?<![a-zA-Z0-9_-])'+name+'(?![a-zA-Z0-9_-])','g'),token(name)
   ]);
   for(const file of Object.values(bundle)){
    if(!isText(file))continue;
    let text=file.type==='chunk'?file.code:String(file.source);
    for(const [pattern,value] of replacements)text=text.replace(pattern,value);
    if(file.type==='chunk')file.code=text;
    else file.source=text;
   }
  }
 };
}
