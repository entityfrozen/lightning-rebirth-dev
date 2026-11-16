import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('V3 replaces only the frontend entry and preserves the existing backend',()=>{
  const entry=read('../src/boba-client.js');
  const app=read('../public/boba/v3/app.js');
  assert.match(entry,/bootV3\(\)/);
  assert.doesNotMatch(entry,/import ['"]\.\.\/public\/boba\/native\.js/);
  for(const feature of ['browser','chat','ai','settings','account','admin']){
    assert.match(app,new RegExp("['\"]"+feature+"['\"]|"+feature+":async"));
  }
  assert.match(app,/startAccountSync\(user\)/);
  assert.match(app,/location\.replace\('\/login'\)/);
});

test('V3 is an independently navigable shell without the retired Games section',()=>{
  const shell=read('../public/boba/v3/shell.js');
  const home=read('../public/boba/v3/home.js');
  assert.match(shell,/id="dock"/);
  assert.match(shell,/id="views"/);
  assert.match(shell,/data-v3-command-layer/);
  assert.doesNotMatch(shell,/id:'games'/);
  for(const action of ['browser','chat','ai','settings'])assert.ok(home.includes('data-v3-go="'+action+'"'));
  assert.match(home,/data-v3-search/);
});

test('V3 ambient rendering is optional and respects reduced motion and visibility',()=>{
  const orbit=read('../public/boba/v3/orbit.js');
  const css=read('../public/boba/v3/style.css');
  assert.match(orbit,/getContext\('webgl'/);
  assert.match(orbit,/prefers-reduced-motion: reduce/);
  assert.match(orbit,/IntersectionObserver/);
  assert.match(orbit,/visibilitychange/);
  assert.match(orbit,/webglcontextlost/);
  assert.match(orbit,/Math\.min\(devicePixelRatio\|\|1,1\.5\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media\(max-width:780px\)/);
});

test('V3 loads tool modules on demand and keeps account-specific administration gated',()=>{
  const app=read('../public/boba/v3/app.js');
  const shell=read('../public/boba/v3/shell.js');
  assert.match(app,/import\('\.\.\/browser\.js'\)/);
  assert.match(app,/import\('\.\.\/chat\.js'\)/);
  assert.match(app,/import\('\.\.\/native-views\.js'\)/);
  assert.match(app,/mounted=new Map\(\)/);
  assert.match(shell,/user\.role==='admin'/);
  assert.match(app,/const id=section\(request\)\?request:'home'/);
});
