import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {browserAddress,searchEngines} from '../src/Preferences.js';
import {cloakPresets} from '../src/Cloak.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(path.join(root,file),'utf8');

test('search engine preferences resolve domains and searches correctly',()=>{
  assert.equal(browserAddress('example.com','google'),'https://example.com/');
  assert.equal(browserAddress('https://example.com/path','bing'),'https://example.com/path');
  assert.equal(browserAddress('what is a constellation','duckduckgo'),
    'https://duckduckgo.com/?q=what%20is%20a%20constellation');
  assert.equal(browserAddress('what is a constellation','brave'),
    'https://search.brave.com/search?q=what%20is%20a%20constellation');
  assert.equal(browserAddress('javascript:alert(1)','google'),null);
  assert.equal(browserAddress('file:///etc/passwd','google'),null);
  assert.equal(browserAddress('','google'),null);
  assert.ok(Object.keys(searchEngines).length>=3);
});

test('Game and app routes are removed while core navigation remains',()=>{
 const shell=read('src/main.jsx');
 assert.ok(!shell.includes("id:'apps',label:'Apps'"));
 assert.ok(!shell.includes("view==='apps'?<Apps"));
 assert.ok(shell.includes("view==='settings'?<Settings"));
 assert.ok(shell.includes("view==='chat'?<Chat"));
 assert.ok(shell.includes("homeMode={view==='home'}"));
});

test('Settings restores appearance, browser, cloaking and account controls',()=>{
  const settings=read('src/Settings.jsx');
  for(const name of ['Appearance','Browser','Privacy & cloaking','Account & data',
      'Search engine','Restore tabs','Save browsing history','Reduce motion',
      'Open in about:blank','Export settings','Import settings','Sign out of Celestial']){
    assert.ok(settings.includes(name),name);
  }
  assert.ok(cloakPresets.celestial);
  assert.ok(cloakPresets.custom);
  assert.match(read('src/Cloak.js'),/window\.open\('about:blank'/);
});

test('Browser uses a real proxy controller and handles failures visibly',()=>{
  const browser=read('src/Browser.jsx');
  const proxy=read('src/BoltProxy.js');
  assert.match(browser,/await createProxyFrame/);
  assert.match(browser,/connection\.go\(tab\.url\)/);
  assert.match(browser,/api\('\/api\/browser\/status'\)/);
  assert.match(browser,/Try again/);
  assert.match(browser,/Open directly/);
  assert.doesNotMatch(browser,/\.go\(tab\.url\)\.catch\(/);
  assert.doesNotMatch(browser,/el\.src=tab\.url/);
  assert.match(proxy,/await controller\.wait\(\)/);
});

test('Browser and community Chat stay mounted together',()=>{
 const main=read('src/main.jsx');
 const messenger=read('src/Messenger.jsx');
 assert.ok(main.includes('celestial-activity-layout'));
 assert.ok(main.includes('WorkspaceChat user={user} live={live}'));
 assert.ok(!main.includes("view==='apps'?<Apps"));
 assert.ok(main.includes("['home','browser'].includes(view)"));
 assert.ok(messenger.includes("type:'v2Message'"));
});

test('Chat displays offline members and source-authenticated platform role badges',()=>{
  const chat=read('src/Chat.jsx');
  const messenger=read('src/Messenger.jsx');
  const server=read('server.js');
  const community=read('community-v2.js');
  assert.match(messenger,/roster=useMemo/);
  assert.match(messenger,/onlineIds\.has\(person\.id\)/);
  assert.match(messenger,/messenger-role/);
  assert.match(messenger,/ROLE_BADGES=\{/);
  assert.match(messenger,/admin:\{name:'ADMIN',tone:'admin'\}/);
  assert.match(read('src/messenger.css'),/\.messenger-role\.admin/);
  assert.match(server,/getRole:userId=>db\.users\.find/);
  assert.match(community,/platformRole:getRole\(userId\)/);
});
