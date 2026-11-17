/**
 * Keep YouTube's heavy watch page out of the proxy rewriter when a user opens
 * a video. Its official embedded player handles media directly in the browser;
 * Celestial never extracts streams or intercepts Google's access checks.
 */
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOST=host=>host==='youtube.com'||host.endsWith('.youtube.com')||
  host==='youtube-nocookie.com'||host.endsWith('.youtube-nocookie.com');
const YOUTU_BE=host=>host==='youtu.be'||host.endsWith('.youtu.be');

export function isYouTubeSite(value){
 try{
  const url=new URL(value);
  return ['http:','https:'].includes(url.protocol)&&
    (YOUTUBE_HOST(url.hostname.toLowerCase())||YOUTU_BE(url.hostname.toLowerCase()));
 }catch{return false}
}

function parseStartTime(value){
 const raw=String(value||'').trim();
 if(/^\d+$/.test(raw))return Math.min(Number(raw),86400);
 const match=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw);
 if(!match||!raw)return 0;
 return Math.min(Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0),86400);
}

export function parseYouTubeVideoUrl(value){
 try{
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol))return null;
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!YOUTUBE_HOST(host)&&!YOUTU_BE(host))return null;
  const pieces=url.pathname.split('/').filter(Boolean);
  let videoId='';
  if(YOUTU_BE(host))videoId=pieces.length===1?pieces[0]:'';
  else if(url.pathname==='/watch')videoId=url.searchParams.get('v')||'';
  else if(['shorts','live','embed'].includes(pieces[0])&&pieces.length===2)videoId=pieces[1];
  if(!VIDEO_ID.test(videoId))return null;
  const seconds=parseStartTime(url.searchParams.get('start')||
    url.searchParams.get('t')||url.searchParams.get('time_continue'));
  const watchUrl=new URL('https://www.youtube.com/watch');
  watchUrl.searchParams.set('v',videoId);
  if(seconds)watchUrl.searchParams.set('t',String(seconds));
  return {id:videoId,startSeconds:seconds,watchUrl:watchUrl.href};
 }catch{return null}
}

export function youtubeEmbedUrl(video,origin){
 if(!video||!VIDEO_ID.test(video.id))throw Error('Invalid YouTube video');
 const url=new URL('https://www.youtube-nocookie.com/embed/'+video.id);
 url.searchParams.set('playsinline','1');
 url.searchParams.set('rel','0');
 if(origin)url.searchParams.set('origin',new URL(origin).origin);
 if(video.startSeconds)url.searchParams.set('start',String(video.startSeconds));
 return url.href;
}

export function createYouTubePlayer(video,{back,fullPage}){
 const panel=document.createElement('section');
 panel.className='native-youtube-panel';
 panel.dataset.youtubePlayer='true';
 panel.innerHTML='<div class="native-youtube-toolbar">'+
  '<span class="native-youtube-identity"><strong>YouTube</strong><small>Lightweight video player</small></span>'+
  '<span class="native-youtube-actions">'+
  '<button type="button" data-video-back>Back to browsing</button>'+
  '<button type="button" data-video-full>Full site</button>'+
  '<a data-video-external target="_blank" rel="noopener">Open on YouTube</a>'+
  '</span></div><div class="native-youtube-stage"></div>';
 const frame=document.createElement('iframe');
 frame.title='YouTube video player';
 frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope';
 frame.allowFullscreen=true;
 // YouTube requires the embedding page's Referer. Do not suppress it.
 frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.src=youtubeEmbedUrl(video,location.origin);
 panel.querySelector('.native-youtube-stage').append(frame);
 panel.querySelector('[data-video-back]').onclick=back;
 panel.querySelector('[data-video-full]').onclick=fullPage;
 panel.querySelector('[data-video-external]').href=video.watchUrl;
 return {panel,frame};
}

export function interceptYouTubeWatchLinks(doc,decode,onNavigate){
 if(!doc?.addEventListener)return()=>{};
 function follow(event){
  if(event.defaultPrevented||event.button>1)return;
  const target=event.target;
  const anchor=target?.closest?.('a[href],a[scramjet-attr-href]');
  if(!anchor||anchor.hasAttribute('download'))return;
  const original=anchor.getAttribute('scramjet-attr-href');
  const href=anchor.getAttribute('href');
  const realPage=decode(doc.URL)||'https://www.youtube.com/';
  let video=null;
  for(const candidate of [original,href]){
   if(!candidate)continue;
   try{
    const expanded=decode(candidate)||new URL(candidate,realPage).href;
    video=parseYouTubeVideoUrl(expanded);
    if(video)break;
   }catch{}
  }
  if(!video)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  onNavigate(video.watchUrl,{
   newTab:event.ctrlKey||event.metaKey||event.shiftKey||event.button===1||
     anchor.target==='_blank'
  });
 }
 doc.addEventListener('click',follow,true);
 doc.addEventListener('auxclick',follow,true);
 return()=>{
  doc.removeEventListener('click',follow,true);
  doc.removeEventListener('auxclick',follow,true);
 };
}
