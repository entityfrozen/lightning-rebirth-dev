import {readLocal,saveLocal} from './constants.js';

export const defaultBrowserPreferences={
  searchEngine:'google',
  transport:'libcurl',
  restoreTabs:true,
  saveHistory:true,
  compactTabs:false,
  openLinksInTabs:true
};
export const browserTransports={
  libcurl:{label:'libcurl · compatible',detail:'Recommended for the widest range of sites.'},
  epoxy:{label:'Epoxy · lightweight',detail:'Faster startup on some devices; try it if a site fails.'}
};
export const searchEngines={
  google:{label:'Google',url:'https://www.google.com/search?q='},
  duckduckgo:{label:'DuckDuckGo',url:'https://duckduckgo.com/?q='},
  bing:{label:'Bing',url:'https://www.bing.com/search?q='},
  brave:{label:'Brave Search',url:'https://search.brave.com/search?q='}
};
export function browserPreferences(){
  const saved=readLocal('browser-preferences',{});
  const next={...defaultBrowserPreferences,...(saved&&typeof saved==='object'?saved:{})};
  if(!Object.hasOwn(browserTransports,next.transport))next.transport='libcurl';
  if(!Object.hasOwn(searchEngines,next.searchEngine))next.searchEngine='google';
  return next;
}
export function setBrowserPreferences(patch){
  const next={...browserPreferences(),...patch};
  if(!Object.hasOwn(searchEngines,next.searchEngine))next.searchEngine='google';
  if(!Object.hasOwn(browserTransports,next.transport))next.transport='libcurl';
  saveLocal('browser-preferences',next);
  window.dispatchEvent(new CustomEvent('celestial:browser-preferences',{detail:next}));
  return next;
}
export function browserAddress(raw,engine=browserPreferences().searchEngine){
  const address=String(raw||'').trim();
  if(!address)return null;
  if(/^[a-z][\w+.-]*:/i.test(address)){
    try{const uri=new URL(address);return ['http:','https:'].includes(uri.protocol)?uri.href:null;}
    catch{return null;}
  }
  if(/[\s]/.test(address)||!address.includes('.')||address.startsWith('?')){
    return (searchEngines[engine]||searchEngines.google).url+encodeURIComponent(address.replace(/^\?/,''));
  }
  try{return new URL('https://'+address).href;}catch{return null;}
}
