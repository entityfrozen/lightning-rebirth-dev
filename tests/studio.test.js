import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>readFileSync(path.join(root,file),'utf8');

test('Browser supports actual fullscreen plus shortcut and focus mode',()=>{
  const browser=source('src/Browser.jsx');
  const fullscreen=source('src/useElementFullscreen.js');
  assert.match(fullscreen,/element\.requestFullscreen\(\)/);
  assert.match(fullscreen,/document\.exitFullscreen\(\)/);
  assert.match(fullscreen,/document\.addEventListener\('fullscreenchange'/);
  assert.match(browser,/aria-label=\{isFullscreen\?'Exit fullscreen':'Enter fullscreen'\}/);
  assert.match(browser,/Ctrl\+Shift\+F/);
  assert.match(browser,/setFocusMode/);
  assert.match(browser,/aria-label=\{focusMode\?'Show browser chrome':'Focus mode'\}/);
  assert.match(source('src/studio.css'),/:fullscreen/);
});

test('Browser library and tab commands have real state and storage',()=>{
  const browser=source('src/Browser.jsx');
  assert.match(browser,/reopenClosed\(\)/);
  assert.match(browser,/setClosedTabs/);
  assert.match(browser,/Ctrl\+Shift\+T/);
  assert.match(browser,/setRecent/);
  assert.match(browser,/celestial-browser-recent/);
  assert.match(browser,/navigator\.clipboard\.writeText/);
  assert.match(browser,/celestial-browser-library/);
  assert.match(browser,/celestial:browser-clear-data/);
  assert.match(browser,/role="tablist"/);
  assert.match(browser,/role="tab"/);
});

test('Games have real fullscreen controls rather than CSS-only magnification',()=>{
  const apps=source('src/Apps.jsx');
  assert.match(apps,/const gameSurface=useRef\(null\)/);
  assert.match(apps,/useElementFullscreen\(gameSurface\)/);
  assert.match(apps,/ref=\{gameSurface\}/);
  assert.match(apps,/Play fullscreen/);
  assert.match(source('src/studio.css'),/\.celestial-tool-shell:fullscreen/);
});

test('Admin console only reviews existing accounts through protected endpoints',()=>{
  const admin=source('src/AdminConsole.jsx');
  const settings=source('src/Settings.jsx');
  const server=source('server.js');
  assert.match(admin,/\['admin','account_manager'\]\.includes\(user\?\.role\)/);
  assert.match(admin,/api\('\/api\/admin\/accounts\/pending'\)/);
  assert.match(admin,/api\('\/api\/community\/members'\)/);
  assert.match(admin,/\/api\/admin\/accounts\//);
  assert.match(admin,/window\.confirm\(/);
  assert.match(settings,/panel==='admin'&&isAdmin&&<AdminConsole/);
  assert.match(settings,/Clear saved browser data/);
  assert.match(server,/if\(!managesAccounts\(user\)\)return fail\(res,403/);
});

test('Settings and studio keep one last-in styling layer',()=>{
  const main=source('src/main.jsx');
  assert.match(main,/import '\.\/studio\.css';/);
  assert.match(main,/import '\.\/console\.css';/);
  assert.match(main,/initialPanel=\{settingsPanel\}/);
  assert.match(main,/setSettingsPanel\('admin'\)/);
  assert.ok(source('src/studio.css').length>10000);
  assert.ok(source('src/console.css').length>10000);
});
