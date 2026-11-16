import test from 'node:test';
import assert from 'node:assert/strict';
import {navigateWithNeutralFrameSrc} from '../public/boba/frame-navigation.js';

test('Scramjet navigation keeps destination in the frame window, not the src attribute',()=>{
 const destinations=[];
 const original={isConnected:true,src:'',ownerDocument:{
  createElement(tag){
   assert.equal(tag,'iframe');
   return {src:''};
  }
 },contentWindow:{location:{replace(url){destinations.push(url)}}}};
 const controllerFrame={
  element:original,
  go(url){this.element.src='https://brightpath.test/~/sj/session/'+encodeURIComponent(url)}
 };
 navigateWithNeutralFrameSrc(controllerFrame,'https://www.google.com/search?q=fort');
 assert.equal(original.src,'');
 assert.equal(controllerFrame.element,original);
 assert.deepEqual(destinations,[
  'https://brightpath.test/~/sj/session/https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dfort'
 ]);
});

test('failed navigation restores original proxy Frame element',()=>{
 const el={isConnected:true,ownerDocument:{createElement:()=>({src:''})},
  contentWindow:{location:{replace(){throw Error('Never')}}}};
 const frame={element:el,go(){throw Error('Missing proxy codec')}};
 assert.throws(()=>navigateWithNeutralFrameSrc(frame,'https://example.com'),/Missing proxy codec/);
 assert.equal(frame.element,el);
 assert.throws(()=>navigateWithNeutralFrameSrc({element:{isConnected:false}},'https://example.com'),/not ready/);
});
