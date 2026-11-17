import test from 'node:test';
import assert from 'node:assert/strict';
import {
  smartPrefersScramjet,normalizeEngineChoice,makeBrowserEngineRouter
} from '../public/boba/engine-router.js';

test('Smart keeps normal websites on Reflux and difficult applications on Scramjet',()=>{
 const router=makeBrowserEngineRouter();
 assert.equal(router.select('https://example.com/'),'ultraviolet');
 assert.equal(router.select('https://www.google.com/search?q=hello'),'scramjet');
 assert.equal(router.select('https://music.youtube.com/'),'scramjet');
 assert.equal(router.select('https://www.youtube.com/watch?v=jNQXAC9IVRw'),'scramjet');
 assert.equal(router.select('https://discord.com/app'),'scramjet');
 assert.equal(router.select('https://open.spotify.com/'),'scramjet');
});

test('Smart handles suffixes safely and never treats a lookalike host as a Google site',()=>{
 const router=makeBrowserEngineRouter();
 for(const url of [
  'https://google.com.evil.org/',
  'https://youtube.com.attacker.net/',
  'https://notyoutube.com/watch',
  'https://discord.com.evil.example/',
  'javascript:alert(1)',
  '/relative',
  'about:blank'
 ])assert.equal(router.select(url),'ultraviolet',url);
 assert.equal(smartPrefersScramjet('https://accounts.google.com/'),true);
 assert.equal(smartPrefersScramjet('https://music.youtube.com/'),true);
});

test('Manual engine choice takes precedence over Smart routing and learned sites',()=>{
 const router=makeBrowserEngineRouter();
 const google='https://google.com/';
 const plain='https://example.com/';
 assert.equal(router.select(google,'ultraviolet'),'ultraviolet');
 assert.equal(router.select(plain,'scramjet'),'scramjet');
 router.remember(plain,'scramjet');
 assert.equal(router.select(plain,'smart'),'scramjet');
 assert.equal(router.select(plain,'reflux'),'ultraviolet');
 assert.equal(router.select(google,'scramjet'),'scramjet');
 assert.equal(normalizeEngineChoice('reflux'),'ultraviolet');
 assert.equal(normalizeEngineChoice('anything-else'),'smart');
});

test('Successful fallback is learned for the hostname only, with an expiry',()=>{
 let now=1000;
 const router=makeBrowserEngineRouter({now:()=>now,ttl:3000});
 const fallback='https://news.example.com/one';
 const other='https://api.example.com/one';
 assert.equal(router.select(fallback),'ultraviolet');
 router.remember(fallback,'scramjet');
 assert.equal(router.select('https://news.example.com/two'),'scramjet');
 assert.equal(router.select(other),'ultraviolet');
 now=4001;
 assert.equal(router.select(fallback),'ultraviolet');
});

test('Learning never retains unbounded visited hosts or unsafe schemes',()=>{
 const router=makeBrowserEngineRouter();
 router.remember('file:///etc/passwd','scramjet');
 assert.equal(router.select('file:///etc/passwd'),'ultraviolet');
 for(let i=0;i<100;i++)router.remember('https://site'+i+'.example/','scramjet');
 assert.equal(router.select('https://site99.example/'),'scramjet');
 assert.equal(router.select('https://site0.example/'),'ultraviolet');
});
