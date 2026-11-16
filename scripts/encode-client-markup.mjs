import {parseAst} from 'rollup/parseAst';

// This protects authored presentation literals from casual source browsing;
// it is not encryption. API paths, DOM selectors, storage keys and credentials
// must remain normal code or live on the server.
const clientModules=/\/public\/boba\/[a-z][a-z0-9-]*\.js$/;
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

// Rewrite only syntactically parsed literals. Never mutate raw JavaScript
// text with regex: previous post-build rewrites broke routing and listeners.
export function encodeMarkupSource(source,parse=parseAst){
 const ast=parse(source);
 const edits=[];
 const visited=new Set();
 function visit(node){
  if(!node||typeof node!=='object'||visited.has(node))return;
  visited.add(node);
  if(node.type==='TaggedTemplateExpression'){
   // Tagged templates need TemplateStringsArray.raw and identity semantics.
   // Changing their syntax could alter application behavior.
   visit(node.tag);
   for(const expression of node.quasi?.expressions||[])visit(expression);
   return;
  }
  if(node.type==='Literal'&&shouldEncode(node.value)){
   edits.push({start:node.start,end:node.end,code:codePoints(node.value)});
   return;
  }
  if(node.type==='TemplateLiteral'){
   const chunks=node.quasis?.map(quasi=>quasi.value?.cooked);
   const staticText=chunks?.join('')||'';
   if(chunks?.every(chunk=>typeof chunk==='string')&&shouldEncode(staticText)){
    const pieces=[];
    for(let i=0;i<chunks.length;i++){
     if(i) {
      const expr=node.expressions[i-1];
      // Template interpolation always converts its value to text.
      pieces.push('String(('+source.slice(expr.start,expr.end)+'))');
     }
     if(chunks[i])pieces.push(codePoints(chunks[i]));
    }
    edits.push({start:node.start,end:node.end,code:pieces.join('+')||"''"});
    return;
   }
   // Non-markup templates retain their syntax and evaluation order.
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
  name:'celestial-encode-presentation-literals',
  apply:'build',
  enforce:'pre',
  transform(source,id){
   if(!clientModules.test(id.split('?')[0].replaceAll('\\','/')))return null;
   const result=encodeMarkupSource(source);
   // Some modules have no UI markup and should not fail the build.
   return result?{code:result.code,map:null}:null;
  }
 };
}
