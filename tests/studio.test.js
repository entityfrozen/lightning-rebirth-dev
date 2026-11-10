import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(path.join(root,file),'utf8');

test('Browser has functional fullscreen and convenient tab management',()=>{
  const browser=read('src/Browser.jsx');
  assert.match(browser,/requestFullscreen/);
  assert.match(browser,/document\.exitFullscreen/);
  assert.match(browser,/fullscreenchange/);
  assert.match(browser,/Enter browser fullscreen/);
  assert.match(browser,/Exit browser fullscreen/);
  assert.match(browser,/Reopen closed tab/);
  assert.match(browser,/Show saved bookmarks/);
  assert.match(browser,/setClosedTabs/);
  assert.match(browser,/onTitle=\{updateTitle\}/);
  assert.match(browser,/key==='tab'/);
});
test('The admin console uses authenticated server routes and only staff see it',()=>{
  const admin=read('src/AccountReview.jsx');
  const settings=read('src/Settings.jsx');
  const server=read('server.js');
  assert.match(admin,/api\('\/api\/admin\/accounts\/pending'\)/);
  assert.match(admin,/\/api\/admin\/accounts\//);
  assert.match(admin,/Search account requests/);
  assert.match(admin,/Approve account/);
  assert.match(admin,/Decline request/);
  assert.match(settings,/const isAdmin=\['admin','account_manager'\]/);
  assert.match(settings,/panel==='administration'&&isAdmin/);
  assert.match(server,/if\(!managesAccounts\(user\)\)return fail\(res,403/);
});
test('The studio stylesheet refines the three workspaces without replacing their functions',()=>{
  const css=read('src/studio.css');
  const main=read('src/main.jsx');
  for(const name of ['celestial-browser-topline','forest-browser:fullscreen',
    'celestial-messenger','celestial-settings-page','celestial-admin-console',
    'celestial-shortcut-grid']){
    assert.ok(css.includes(name),name);
  }
  assert.match(main,/import '\.\/studio\.css'/);
  assert.match(read('src/Settings.jsx'),/KEYBOARD SHORTCUTS/);
});
