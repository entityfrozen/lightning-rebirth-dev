import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSearchQuery,maskSearchAnchor} from '../public/boba/search-link-mask.js';

const proxy='https://bolt-v5-preview-production.up.railway.app';
const rewritten=proxy+'/~/sj/1921vj84/ssg7npna/https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dfort%26udm%3D50';
function anchor(attrs){
 const values=new Map(Object.entries(attrs));
 return {
  getAttribute(name){return values.get(name)||null},
  setAttribute(name,value){values.set(name,value)},
  removeAttribute(name){values.delete(name)},
  snapshot(){return Object.fromEntries(values)}
 };
}

test('identifies raw and rewritten searches without masking regular links',()=>{
 assert.equal(hasSearchQuery(rewritten),true);
 assert.equal(hasSearchQuery('/search?q=fort&udm=50'),true);
 assert.equal(hasSearchQuery('https://www.google.com/search?udm=50&query=fort'),true);
 assert.equal(hasSearchQuery('/browse?q=fort'),true);
 assert.equal(hasSearchQuery('/info?id=12345'),false);
 assert.equal(hasSearchQuery('/search?qwerty=fort'),false);
});

test('removes search term from DOM attributes without losing navigation target',()=>{
 const element=anchor({
  href:rewritten,'scramjet-attr-href':'/search?q=fort&udm=50',
  'data-ved':'tracking-marker'
 });
 const targets=new WeakMap();
 assert.equal(maskSearchAnchor(element,proxy+'/',targets),true);
 assert.deepEqual(element.snapshot(),{href:'#','data-ved':'tracking-marker'});
 assert.equal(targets.get(element),rewritten);
 assert.equal(maskSearchAnchor(element,proxy+'/',targets),false,'repeat pass has no changes');
});

test('does not strip a link if its navigation target cannot be recovered',()=>{
 const element=anchor({href:'#','scramjet-attr-href':'/search?q=fort'});
 const targets=new WeakMap();
 assert.equal(maskSearchAnchor(element,proxy+'/',targets),false);
 assert.equal(element.getAttribute('scramjet-attr-href'),'/search?q=fort');
});
