import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib';
import { parse, parseFragment, serialize } from 'parse5';

// Celestial's own HTTP document gateway. No Scramjet, Wisp, UV or BareMux.
// The sandboxed document has an opaque origin, never the application's origin.
const PREFIX='/browse/u/';
const grants=new Map();
const MAX_DOCUMENT=5*1024*1024;
const MAX_ASSET=14*1024*1024;
const MAX_BODY=1024*1024;
const MIME_HTML=/\btext\/html\b|\bapplication\/xhtml\+xml\b/i;
const MIME_CSS=/\btext\/css\b/i;
const attributes=new Set(['href','src','action','formaction','poster','data','background','cite','xlink:href','manifest']);
const passHeaders=['accept','accept-language','range','content-type','if-none-match','if-modified-since'];
const getAttr=(node,name)=>node.attrs?.find(attr=>attr.name===name)?.value;
const setAttr=(node,name,value)=>{
  if(!node.attrs)node.attrs=[];
  const attr=node.attrs.find(item=>item.name===name);
  if(attr)attr.value=value;
  else node.attrs.push({name,value});
};
const removeAttr=(node,name)=>{
  if(node.attrs)node.attrs=node.attrs.filter(a=>a.name!==name);
};

export function validPublicIp(address){
  const family=net.isIP(address);
  if(family===4){
    const p=address.split('.').map(Number);
    if(p.some(x=>x<0||x>255))return false;
    const [a,b,c]=p;
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||
      a===100&&b>=64&&b<=127||a===172&&b>=16&&b<=31||
      a===192&&(b===168||b===0||b===0&&c===2)||
      a===198&&(b===18||b===19||b===51&&c===100)||
      a===203&&b===0&&c===113);
  }
  if(family===6){
    const v=address.toLowerCase();
    return /^[23][0-9a-f]{0,3}:/.test(v) &&
      !v.startsWith('2001:db8:') && !v.startsWith('2001:0:') &&
      !v.startsWith('2001:10:');
  }
  return false;
}

export function targetURL(input,base){
  if(typeof input!=='string'||input.length>6000)throw Error('Invalid navigation URL');
  const result=new URL(input,base);
  if(!['http:','https:'].includes(result.protocol) || result.username || result.password ||
    (result.port && result.port!==(result.protocol==='https:'?'443':'80'))){
    throw Error('Only public HTTP and HTTPS destinations are allowed');
  }
  const host=result.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(!host||host==='localhost'||host.endsWith('.localhost')||
    /\.(local|internal|test|invalid|onion)\.?$/.test(host)||
    host.endsWith('.')||net.isIP(host)&&!validPublicIp(host)){
    throw Error('Private destinations are not allowed');
  }
  result.hash='';
  return result;
}

export const encodeURL=value=>Buffer.from(targetURL(value).href).toString('base64url');
export function decodeURL(token){
  if(!/^[a-zA-Z0-9_-]{8,8192}$/.test(token||''))throw Error('Invalid URL token');
  const text=Buffer.from(token,'base64url').toString('utf8');
  return targetURL(text);
}
export function gatewayURL(input,base,key){
  const url=targetURL(input,base);
  return PREFIX+Buffer.from(url.href).toString('base64url')+'?key='+encodeURIComponent(key);
}
export function createGrant(owner){
  if(!owner)throw Error('Authentication required');
  const now=Date.now();
  if(grants.size>500){
    for(const [key,value] of grants)if(value.expires<now)grants.delete(key);
  }
  const key=randomBytes(24).toString('base64url');
  grants.set(key,{owner,expires:now+60*60*1000,requests:0});
  return key;
}
function useGrant(key){
  const entry=grants.get(key);
  if(!entry||entry.expires<Date.now()){
    grants.delete(key);return false;
  }
  if(++entry.requests>6000)return false;
  return true;
}
function safeAsset(value,base,key){
  const raw=String(value||'').trim();
  if(!raw||raw.startsWith('#')||/^(?:data|blob|javascript|mailto|tel):/i.test(raw))return value;
  try{return gatewayURL(raw,base,key)}
  catch{return '#';}
}
export function rewriteCSS(source,base,key){
  return String(source).replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,
    (_match,quote,value)=>'url('+quote+safeAsset(value,base,key)+quote+')')
    .replace(/@import\s+(["'])(.*?)\1/gi,
      (_match,quote,value)=>'@import '+quote+safeAsset(value,base,key)+quote);
}
function walk(node,base,key){
  if(node.tagName==='meta'&&/content-security-policy/i.test(getAttr(node,'http-equiv')||'')){
    removeAttr(node,'http-equiv');removeAttr(node,'content');
  }
  if(node.attrs){
    for(const attr of node.attrs){
      if(attributes.has(attr.name))attr.value=safeAsset(attr.value,base,key);
      else if(attr.name==='srcset'||attr.name==='imagesrcset'){
        attr.value=attr.value.split(',').map(part=>{
          const match=part.trim().match(/^(\S+)([\s\S]*)$/);
          return match?safeAsset(match[1],base,key)+match[2]:part;
        }).join(', ');
      }else if(attr.name==='style')attr.value=rewriteCSS(attr.value,base,key);
    }
    // Integrity hashes were calculated for the original URL/body.
    removeAttr(node,'integrity');
    removeAttr(node,'crossorigin');
  }
  if(node.tagName==='style'){
    for(const child of node.childNodes||[])if(child.nodeName==='#text'){
      child.value=rewriteCSS(child.value,base,key);
    }
  }
  if(node.tagName==='meta'&&/refresh/i.test(getAttr(node,'http-equiv')||'')){
    const value=getAttr(node,'content')||'';
    setAttr(node,'content',value.replace(/url\s*=\s*(['"]?)([^'";]+)\1/i,
      (_,q,url)=>'url='+q+safeAsset(url,base,key)+q));
  }
  for(const child of node.childNodes||[])walk(child,base,key);
  if(node.content)walk(node.content,base,key);
}
export function rewriteHTML(html,base,key){
  const doc=parse(String(html));
  walk(doc,base,key);
  const htmlNode=doc.childNodes.find(node=>node.tagName==='html');
  const head=htmlNode?.childNodes?.find(node=>node.tagName==='head');
  if(head){
    const script='<script src="/browse/client.js?key='+encodeURIComponent(key)+
      '&base='+encodeURIComponent(Buffer.from(base).toString('base64url'))+'"></script>';
    const nodes=parseFragment(script).childNodes;
    head.childNodes.unshift(...nodes);
    for(const node of nodes)node.parentNode=head;
  }
  return serialize(doc);
}
function guardedLookup(hostname,options,callback){
  dns.lookup(hostname,{all:true},(error,addresses)=>{
    if(error||!addresses?.length)return callback(Error('DNS lookup failed'));
    if(addresses.some(row=>!validPublicIp(row.address)))return callback(Error('Private DNS answer blocked'));
    // Node's connection auto-selection asks custom lookup functions for
    // an array (options.all=true); returning a single string there causes
    // "Invalid IP address: undefined" on Node 20+.
    if(options?.all)callback(null,addresses);
    else callback(null,addresses[0].address,addresses[0].family);
  });
}
async function readLimited(stream,limit){
  const parts=[];let size=0;
  for await(const chunk of stream){
    size+=chunk.length;
    if(size>limit)throw Error('Remote response exceeds size limit');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}
async function upstream(url,req,body,depth=0){
  if(depth>6)throw Error('Too many redirects');
  const headers={'accept-encoding':'identity'};
  for(const name of passHeaders){
    if(req.headers[name]&&typeof req.headers[name]==='string')headers[name]=req.headers[name];
  }
  headers['user-agent']=String(req.headers['user-agent']||'CelestialBrowser/1.0').slice(0,400);
  const response=await new Promise((resolve,reject)=>{
    const library=url.protocol==='https:'?https:http;
    const remote=library.request(url,{
      method:req.method,headers,lookup:guardedLookup,timeout:14000,
      agent:false,maxHeaderSize:24576
    },resolve);
    remote.on('error',reject);
    remote.on('timeout',()=>remote.destroy(Error('Remote connection timed out')));
    if(body?.length)remote.end(body);
    else remote.end();
  });
  const code=response.statusCode||502;
  if(code>=300&&code<400&&response.headers.location){
    response.resume();
    const next=targetURL(response.headers.location,url);
    if([301,302,303].includes(code)&&req.method==='POST'){
      return upstream(next,{method:'GET',headers:req.headers},null,depth+1);
    }
    return upstream(next,req,body,depth+1);
  }
  const type=String(response.headers['content-type']||'application/octet-stream');
  const data=await readLimited(response,MAX_ASSET);
  const encoding=String(response.headers['content-encoding']||'identity');
  let decoded=data;
  if(encoding==='gzip')decoded=gunzipSync(data,{maxOutputLength:MAX_ASSET});
  else if(encoding==='deflate')decoded=inflateSync(data,{maxOutputLength:MAX_ASSET});
  else if(encoding==='br')decoded=brotliDecompressSync(data,{maxOutputLength:MAX_ASSET});
  if(decoded.length>MAX_ASSET)throw Error('Remote response too large');
  return {code,type,data:decoded,base:url.href};
}
function responseHeaders(type){
  return {
    'Content-Type':type,
    'Cache-Control':'private, no-store',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'content-type, accept',
    'Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS'
  };
}
function outputError(res,code,message){
  const safe=String(message||'Unknown connection failure').replace(/[<>&"'`]/g,'');
  const html='<!doctype html><html><head><title>Browser connection failed</title></head>'+
    '<body style="font-family:system-ui;padding:36px;background:#10151d;color:#f4f7ff">'+
    '<h2>Could not open this page</h2><p>'+safe+'</p><script>'+
    'parent.postMessage({type:"celestial:browse",state:"error",message:document.body.textContent},"*")'+
    '</script></body></html>';
  res.writeHead(code,responseHeaders('text/html; charset=utf-8'));res.end(html);
}
export async function handleBrowse(req,res,pathname,search){
  if(pathname==='/browse/client.js'){
    if(!useGrant(search.get('key')))return outputError(res,401,'Browser session expired');
    res.writeHead(200,responseHeaders('text/javascript; charset=utf-8'));
    return res.end(clientRuntime(search.get('key'),search.get('base')));
  }
  if(!pathname.startsWith(PREFIX))return false;
  if(req.method==='OPTIONS'){
    res.writeHead(204,responseHeaders('text/plain'));res.end();return true;
  }
  if(!useGrant(search.get('key'))){
    outputError(res,401,'Browser session expired. Open a new tab.');return true;
  }
  if(!['GET','HEAD','POST'].includes(req.method)){
    outputError(res,405,'Method not allowed');return true;
  }
  try{
    const url=decodeURL(pathname.slice(PREFIX.length));
    let body=null;
    if(req.method==='POST')body=await readLimited(req,MAX_BODY);
    const reply=await upstream(url,req,body);
    let data=reply.data;
    if(MIME_HTML.test(reply.type)){
      if(data.length>MAX_DOCUMENT)throw Error('HTML document too large');
      data=Buffer.from(rewriteHTML(data.toString('utf8'),reply.base,search.get('key')));
    }else if(MIME_CSS.test(reply.type)){
      data=Buffer.from(rewriteCSS(data.toString('utf8'),reply.base,search.get('key')));
    }
    res.writeHead(reply.code,responseHeaders(reply.type));
    res.end(req.method==='HEAD'?undefined:data);
  }catch(error){
    outputError(res,502,error?.message||'Remote site unavailable');
  }
  return true;
}
// Generated from this module, isolated from the Boba application.
function clientRuntime(key,base64){
  const payload=JSON.stringify({key,base64});
  return '(function(){' +
    'const options='+payload+';' +
    'const base=atob(options.base64.replace(/-/g,"+").replace(/_/g,"/"));' +
    'const encode=s=>btoa(unescape(encodeURIComponent(s))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");' +
    'const wrap=s=>{try{if(typeof s!=="string"||/^(data:|blob:|javascript:|#)/i.test(s))return s;const u=new URL(s,base);return /^https?:$/.test(u.protocol)?"/browse/u/"+encode(u.href)+"?key="+encodeURIComponent(options.key):s}catch{return s}};' +
    'const originalFetch=window.fetch.bind(window);window.fetch=function(input,init){if(typeof input==="string")return originalFetch(wrap(input),Object.assign({},init,{credentials:"omit"}));return originalFetch(input,init)};' +
    'const originalOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){return originalOpen.call(this,method,wrap(url),...rest)};' +
    'const send=(state)=>{try{parent.postMessage({type:"celestial:browse",state,title:document.title},"*")}catch{}};' +
    'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>send("ready"),{once:true});else send("ready");' +
    'setTimeout(()=>{if(document.body?.children.length)send("ready")},1800);' +
  '})();';
}
