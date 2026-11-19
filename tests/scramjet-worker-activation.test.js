import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Replace the dynamic transport import with a local stub for the worker-only unit test.
const bootstrap=readFileSync(new URL('../public/proxy-entry.js',import.meta.url),'utf8')
  .replace('import(paths.transports[kind])','Promise.resolve({default: class MockTransport {}})');

async function start({controlled=null,registered=true}={}){
 const active={
  scriptURL:'https://celestial.example/sw.js',
  postMessage(){},
 };
 const registration={active};
 const events=[];
 let selectedWorker;
 const window={
  isSecureContext:true,
  dispatchEvent(event){events.push(event.detail)}
 };
 class Controller{
  constructor(options){selectedWorker=options.serviceworker}
  wait(){return Promise.resolve()}
  createFrame(){return {}}
 }
 const scripts={
  '/v2/scram/scramjet.js':()=>{},
  '/v2/controller/controller.api.js':()=>{
   window.$scramjetController={Controller,config:{}};
  },
  '/v2/utils/scramjet-utils.js':()=>{
   window.$scramjetUtils={};
  },
  '/clients/libcurl-client.js':()=>{
   window.LibcurlTransport={LibcurlClient:class {constructor(options){this.options=options}}};
  }
 };
 const document={
  createElement(tag){
   assert.equal(tag,'script');
   return {async:false,src:'',onload:null,onerror:null};
  },
  head:{
   append(script){
    if(!scripts[script.src])throw Error('Unrecognized script');
    scripts[script.src]();
    queueMicrotask(()=>script.onload?.());
   }
  }
 };
 const navigator={
  serviceWorker:{
   controller:controlled,
   register:async script=>{
    assert.equal(script,'/sw.js');
    if(!registered)throw Error('Registration refused');
    return registration;
   },
   ready:Promise.resolve(registration)
  }
 };
 const location={protocol:'https:',host:'celestial.example'};
 class CustomEvent{
  constructor(name,init){this.type=name;this.detail=init.detail}
 }
 const context={window,navigator,document,location,CustomEvent,
  URL,setTimeout,clearTimeout,Promise,queueMicrotask};
 vm.runInNewContext(bootstrap,context,{filename:'proxy-entry.js'});
 const controller=await window.initBootstrap();
 return {active,controller,selectedWorker,events};
}

test('Scramjet starts in a framed page even if the worker has not claimed it',async()=>{
 const result=await start();
 assert.equal(result.selectedWorker,result.active);
 assert.equal(result.controller.createFrame instanceof Function,true);
 assert.ok(result.events.some(e=>e.stage==='worker-control'&&e.outcome==='info'));
});

test('An unrelated controlling service worker cannot hijack the Scramjet controller',async()=>{
 const unrelated={scriptURL:'https://celestial.example/legacy-sw.js'};
 const result=await start({controlled:unrelated});
 assert.equal(result.selectedWorker,result.active);
});

test('When the registered worker controls the tab, Scramjet uses it',async()=>{
 const current={scriptURL:'https://celestial.example/sw.js'};
 const result=await start({controlled:current});
 assert.equal(result.selectedWorker,current);
 assert.ok(result.events.some(e=>e.stage==='worker-control'&&e.outcome==='ok'));
});

test('A refused service-worker registration fails instead of leaving startup pending',async()=>{
 await assert.rejects(start({registered:false}),/Registration refused/);
});
