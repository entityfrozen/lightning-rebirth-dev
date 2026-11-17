import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 recordScramjet,getScramjetDiagnostics,clearScramjetDiagnostics,exportScramjetDiagnostics
} from '../public/boba/scramjet-diagnostics.js';

test('Scramjet reports safe, bounded stage diagnostics with no third-party URLs',()=>{
 clearScramjetDiagnostics();
 const target='https://secret.example.net/watch?token=password123';
 const error=new Error('Could not load '+target+'; secret_cookie=123');
 for(let i=0;i<110;i++)recordScramjet('controller-init',i===109?'error':'info',{error,durationMs:10});
 const report=getScramjetDiagnostics();
 assert.equal(report.events.length,80);
 assert.equal(report.events[0].stage,'controller-init');
 assert.equal(report.events[79].outcome,'error');
 const json=exportScramjetDiagnostics();
 assert.doesNotMatch(json,/secret\.example|password123|secret_cookie|watch\?/);
 assert.match(json,/controller-init/);
 clearScramjetDiagnostics();
 assert.equal(getScramjetDiagnostics().events.length,0);
});

test('Scramjet diagnostic event names and reasons are allowlisted',()=>{
 clearScramjetDiagnostics();
 recordScramjet('https://hidden.example','error',{error:new Error('token leaked')});
 recordScramjet('worker-register','start');
 recordScramjet('worker-register','ok',{durationMs:22.4});
 recordScramjet('worker-control','error',{error:new Error('Service worker did not control the frame')});
 recordScramjet('navigate','info',{reason:'https://some.secret.site/'});
 const entries=getScramjetDiagnostics().events;
 assert.equal(entries.length,4);
 assert.equal(entries[1].durationMs,22);
 assert.equal(entries[2].reason,'worker');
 assert.equal(entries[3].reason,undefined);
});

test('Celestial prefers its CSP-compatible same-origin loader and has bounded timeouts',()=>{
 const source=readFileSync(new URL('../public/boba/proxy.js',import.meta.url),'utf8');
 assert.ok(source.indexOf("load('/proxy-entry.js')")<source.indexOf("load('/bootstrap-init.js')"));
 assert.match(source,/timed\(Promise\.resolve\(\)\.then\(\(\)=>window\.initBootstrap\(\)\)/);
 assert.match(source,/recordScramjet\('controller-ready','ok'/);
 const bootstrap=readFileSync(new URL('../public/proxy-entry.js',import.meta.url),'utf8');
 assert.match(bootstrap,/celestial:scramjet-stage/);
 assert.match(bootstrap,/stage\('worker-register','start'\)/);
 assert.match(bootstrap,/stage\('worker-control','ok'\)/);
 assert.match(bootstrap,/stage\('controller-ready','ok'\)/);
});

test('Scramjet diagnostics are accessible through Settings without server upload',()=>{
 const settings=readFileSync(new URL('../public/boba/settings.js',import.meta.url),'utf8');
 assert.match(settings,/data-scramjet-log/);
 assert.match(settings,/data-scramjet-copy/);
 assert.match(settings,/data-scramjet-clear/);
 assert.doesNotMatch(settings,/fetch\([^\n]*scramjet.*diagnostics/);
});
