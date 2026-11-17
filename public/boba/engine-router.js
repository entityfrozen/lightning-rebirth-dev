/**
 * Site-aware engine selection for the Boba browser.
 *
 * Smart mode prefers Reflux on ordinary sites and Scramjet on complex Google
 * applications. A successful retry teaches this tab session which engine to
 * try first for that hostname next time. Nothing about visited sites is saved.
 */
const SCRAMJET_HOSTS=[
  'google.com','google.co.uk','recaptcha.net',
  'youtube.com','youtube-nocookie.com','youtu.be',
  'discord.com','discord.gg','spotify.com','open.spotify.com'
];
const LEARNING_TTL=15*60*1000;
const MAX_LEARNED_HOSTS=64;

function hostname(input){
  try{
    const url=new URL(input);
    if(url.protocol!=='http:'&&url.protocol!=='https:')return '';
    return url.hostname.toLowerCase().replace(/\.$/,'');
  }catch{return ''}
}

export function smartPrefersScramjet(url){
  const host=hostname(url);
  return !!host&&SCRAMJET_HOSTS.some(suffix=>host===suffix||host.endsWith('.'+suffix));
}

export function normalizeEngineChoice(value){
  if(value==='scramjet')return 'scramjet';
  if(value==='ultraviolet'||value==='reflux')return 'ultraviolet';
  return 'smart';
}

export function makeBrowserEngineRouter({now=()=>Date.now(),ttl=LEARNING_TTL}={}){
  const learned=new Map();
  const select=(url,choice='smart')=>{
    const preferred=normalizeEngineChoice(choice);
    if(preferred!=='smart')return preferred;
    const host=hostname(url);
    const entry=learned.get(host);
    if(entry&&entry.expires>now())return entry.mode;
    if(entry)learned.delete(host);
    return smartPrefersScramjet(url)?'scramjet':'ultraviolet';
  };
  const remember=(url,mode)=>{
    const host=hostname(url);
    if(!host||!['ultraviolet','scramjet'].includes(mode))return;
    const expected=smartPrefersScramjet(url)?'scramjet':'ultraviolet';
    if(mode===expected){learned.delete(host);return}
    if(learned.size>=MAX_LEARNED_HOSTS)learned.delete(learned.keys().next().value);
    learned.set(host,{mode,expires:now()+ttl});
  };
  return {select,remember};
}
