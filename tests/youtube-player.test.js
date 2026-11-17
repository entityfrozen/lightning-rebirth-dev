import test from 'node:test';
import assert from 'node:assert/strict';
import {isYouTubeSite,parseYouTubeVideoUrl,youtubeEmbedUrl,interceptYouTubeWatchLinks}
  from '../public/boba/youtube-player.js';

test('YouTube watch, shorts, live and share links keep a validated video ID',()=>{
 const videos=[
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://music.youtube.com/watch?v=jNQXAC9IVRw',
  'https://m.youtube.com/shorts/jNQXAC9IVRw',
  'https://youtube.com/live/jNQXAC9IVRw',
  'https://youtu.be/jNQXAC9IVRw',
  'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw'
 ];
 for(const url of videos){
  assert.equal(parseYouTubeVideoUrl(url)?.id,'jNQXAC9IVRw',url);
  assert.equal(isYouTubeSite(url),true,url);
 }
});

test('rejects foreign hosts, untrusted protocols, invalid IDs and non-video pages',()=>{
 for(const url of [
  'https://youtube.com.evil.example/watch?v=jNQXAC9IVRw',
  'https://notyoutube.com/watch?v=jNQXAC9IVRw',
  'https://youtu.be.evil.example/jNQXAC9IVRw',
  'javascript:alert(1)',
  'https://www.youtube.com/watch?v=oops',
  'https://www.youtube.com/',
  'https://music.youtube.com/playlist?list=PLabc',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw%3Cscript%3E',
  'https://www.youtube.com/shorts/jNQXAC9IVRw/extra'
 ])assert.equal(parseYouTubeVideoUrl(url),null,url);
});

test('timestamp is kept without trusting arbitrary query parameters',()=>{
 const info=parseYouTubeVideoUrl('https://youtu.be/jNQXAC9IVRw?t=1h2m3s&foo=secret');
 assert.equal(info?.startSeconds,3723);
 assert.equal(info?.watchUrl,'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3723');
 const embed=youtubeEmbedUrl(info,'https://celestial.example:3080');
 const parsed=new URL(embed);
 assert.equal(parsed.hostname,'www.youtube-nocookie.com');
 assert.equal(parsed.pathname,'/embed/jNQXAC9IVRw');
 assert.equal(parsed.searchParams.get('origin'),'https://celestial.example:3080');
 assert.equal(parsed.searchParams.get('start'),'3723');
 assert.equal(parsed.searchParams.get('foo'),null);
 assert.equal(parseYouTubeVideoUrl('https://youtu.be/jNQXAC9IVRw?t=999999999')?.startSeconds,86400);
});

test('click interception routes YouTube videos to the lightweight player once',()=>{
 const listeners=new Map(),navigations=[];
 const doc={URL:'https://celestial.example/~/sj/encrypted',addEventListener(name,fn){listeners.set(name,fn)},
  removeEventListener(name){listeners.delete(name)}};
 const stop=interceptYouTubeWatchLinks(doc,
   value=>value===doc.URL?'https://www.youtube.com/results?search_query=music':'',
   (url,options)=>navigations.push({url,options}));
 const anchor={getAttribute:key=>key==='scramjet-attr-href'?'/watch?v=jNQXAC9IVRw':null,
  hasAttribute:()=>false,target:''};
 const event={button:0,target:{closest:()=>anchor},defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true},
  stopImmediatePropagation(){this.stopped=true}};
 listeners.get('click')(event);
 assert.equal(event.defaultPrevented,true);
 assert.equal(event.stopped,true);
 assert.deepEqual(navigations,[{
  url:'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  options:{newTab:false}
 }]);
 stop();
 assert.equal(listeners.size,0);
});

test('non-video links are not hijacked by the watch-link handler',()=>{
 const listeners=new Map();let intercepted=false;
 const doc={URL:'https://celestial.example/~/sj/doc',addEventListener:(n,fn)=>listeners.set(n,fn),
  removeEventListener:n=>listeners.delete(n)};
 interceptYouTubeWatchLinks(doc,()=>'',()=>{intercepted=true});
 const anchor={getAttribute:key=>key==='href'?'https://example.com/watch?v=jNQXAC9IVRw':null,
  hasAttribute:()=>false};
 let prevented=false;
 listeners.get('click')({button:0,target:{closest:()=>anchor},defaultPrevented:false,
  preventDefault(){prevented=true},stopImmediatePropagation(){}});
 assert.equal(intercepted,false);
 assert.equal(prevented,false);
});
