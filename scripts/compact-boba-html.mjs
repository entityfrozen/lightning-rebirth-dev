// The page head stays standards-compliant. Character references hide a small
// amount of authored copy from View Source, not from the rendered DOM.
export const entityEncode=value=>[...value].map(char=>'&#'+char.codePointAt(0)+';').join('');
export function compactPageHTML(html){
 return html
  .replace(/<title>([^<>]*)<\/title>/g,(_,copy)=>'<title>'+entityEncode(copy)+'</title>')
  .replace(/(<meta\b[^>]*\b(?:name="description"|property="og:(?:title|description)")[^>]*\bcontent=")([^"]*)(")/g,
    (_,before,value,after)=>before+entityEncode(value)+after)
  .replace(/>\s+</g,'><')
  .trim()+'\n';
}
