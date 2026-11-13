import {parseAst} from 'rollup/parseAst';

// Only authored UI literals are encoded. This is obfuscation, not encryption.
// Keep DOM selectors, class names, endpoints and third-party page data intact.
const clientModules=/\/public\/boba\/(?:browser|games|catalog-ui|extra-games|auth-shell)\.js$/;
const htmlTag=/<\s*\/?\s*[a-z][a-z0-9-]*(?=[\s/>])/i;
const captions=new Set([
 'Arcade','Games','Chat','Search the arcade','No matching titles.',
 'ARCADE LIBRARY','Arcade sources','Search or enter a link',
 'New tab','New game','Play now →'
]);
const chunkSize=128;
const shouldEncode=value=>
 typeof value==='string' &&
 ((value.length>=16&&htmlTag.test(value))||captions.has(value));

export function codePoints(value){
 const pieces=[];
 for(let offset=0;offset<value.length;offset+=chunkSize){
  const chars=[];
  const until=Math.min(value.length,offset+chunkSize);
  for(let i=offset;i<until;i++)chars.push(value.charCodeAt(i));
  pieces.push('String.fromCharCode('+chars.join(',')+')');
 }
 return pieces.join('+')||"''";
}

// Syntax-aware rewriting avoids the dangerous global text substitution that
// previously broke CSS bindings, navigation and event handlers.
export function encodeMarkupSource(source,parse=parseAst){
 const ast=parse(source);
 const edits=[];
 const visited=new Set();
 function visit(node){
  if(!node||typeof node!=='object'||visited.has(node))return;
  visited.add(node);
  if(node.type==='Literal'&&shouldEncode(node.value)){
   edits.push({start:node.start,end:node.end,code:codePoints(node.value)});
   return;
  }
  // Only templates without interpolations; never reorder dynamic expressions.
  if(node.type==='TemplateLiteral'&&node.expressions?.length===0){
   const value=node.quasis?.[0]?.value?.cooked;
   if(shouldEncode(value)){
    edits.push({start:node.start,end:node.end,code:codePoints(value)});
    return;
   }
  }
  for(const [key,value] of Object.entries(node)){
   if(key==='start'||key==='end'||key==='loc'||key==='raw'||key==='parent')continue;
   if(Array.isArray(value))for(const item of value)visit(item);
   else if(value&&typeof value==='object')visit(value);
  }
 }
 visit(ast);
 if(!edits.length)return null;
 edits.sort((a,b)=>b.start-a.start);
 let output=source;
 for(const edit of edits)output=output.slice(0,edit.start)+edit.code+output.slice(edit.end);
 return {code:output,map:null,count:edits.length};
}
export function encodeClientMarkup(){
 return {
  name:'celestial-encode-browser-arcade-markup',
  apply:'build',
  enforce:'pre',
  transform(source,id){
   if(!clientModules.test(id.split('?')[0].replaceAll('\\','/')))return null;
   const result=encodeMarkupSource(source);
   if(!result||result.count===0)throw Error('No markup was encoded in '+id);
   return {code:result.code,map:null};
  }
 };
}
