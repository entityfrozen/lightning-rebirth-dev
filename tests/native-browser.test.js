import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  validPublicIp,targetURL,encodeURL,decodeURL,gatewayURL,
  rewriteCSS,rewriteHTML,createGrant
} from '../browser-gateway.js';

test('gateway refuses internal addresses, unsafe URL schemes, and credentials',()=>{
  for(const ip of ['127.0.0.1','10.0.0.2','192.168.1.1','172.16.2.3',
    '169.254.169.254','100.100.100.200','0.0.0.0','::1','fc00::a']){
    assert.equal(validPublicIp(ip),false,ip);
  }
  for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111']){
    assert.equal(validPublicIp(ip),true,ip);
  }
  for(const url of ['file:///etc/passwd','http://localhost/','http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'https://example.com:8080/','http://user:password@example.com',
    'ftp://example.com','http://a.local/','https://[::1]/']){
    assert.throws(()=>targetURL(url),undefined,url);
  }
  assert.equal(targetURL('https://example.com/a').href,'https://example.com/a');
});

test('gateway URLs preserve path, query, and relative source origin',()=>{
  const base='https://example.com/blog/index.html';
  const key='test-session';
  const transformed=gatewayURL('../images/cat.png?size=2',base,key);
  assert.match(transformed,/^\/browse\/u\/[-_a-zA-Z0-9]+\?key=test-session$/);
  const token=transformed.split('/').at(-1).split('?')[0];
  assert.equal(decodeURL(token).href,'https://example.com/images/cat.png?size=2');
  assert.equal(decodeURL(encodeURL('https://example.com/a')).href,'https://example.com/a');
});

test('HTML rewrites links, form targets, scripts, styles and removes old CSP directives',()=>{
  const key='browser-key';
  const base='https://example.com/folder/page.html';
  const html='<!doctype html><html><head>'+
    '<meta http-equiv="Content-Security-Policy" content="default-src none">'+
    '<link rel="stylesheet" href="/theme.css" integrity="sha256-test">'+
    '<style>i{background:url("../img/a.png")}</style>'+
    '</head><body>'+
    '<form action="../submit" method="post"><input name="q"></form>'+
    '<a href="/next?sort=1">Next</a><img src="./photo.png" srcset="./a.png 1x, ./b.png 2x">'+
    '<script src="/app.js" crossorigin="anonymous"></script></body></html>';
  const result=rewriteHTML(html,base,key);
  for(const url of [
    'https://example.com/theme.css',
    'https://example.com/submit',
    'https://example.com/next?sort=1',
    'https://example.com/folder/photo.png',
    'https://example.com/folder/a.png',
    'https://example.com/folder/b.png',
    'https://example.com/img/a.png',
    'https://example.com/app.js'
  ]){
    const token=Buffer.from(url).toString('base64url');
    assert.ok(result.includes('/browse/u/'+token),url);
  }
  assert.match(result,/\/browse\/client\.js\?key=browser-key/);
  assert.doesNotMatch(result,/sha256-test|crossorigin="anonymous"|default-src none/);
});

test('CSS rewriting retains local fragments and proxifies external resources',()=>{
  const result=rewriteCSS('@import "/base.css"; .a{background:url(../icons/cat.svg)} .b{filter:url(#blurry)}',
    'https://example.com/css/a.css','test');
  assert.match(result,/\/browse\/u\//);
  assert.match(result,/url\(#blurry\)/);
});

test('browser grants are random bearer capabilities, not Celestial cookies',()=>{
  const first=createGrant('user-a');
  const second=createGrant('user-a');
  assert.notEqual(first,second);
  assert.match(first,/^[A-Za-z0-9_-]{32}$/);
  assert.throws(()=>createGrant(''));
});

test('sandboxed UI never provides app-origin permissions to remote pages',async()=>{
  const {readFile} = await import('node:fs/promises');
  const src=await readFile(new URL('../public/boba/browser.js',import.meta.url),'utf8');
  assert.match(src,/sandbox="allow-scripts allow-forms allow-popups allow-downloads"/);
  assert.doesNotMatch(src,/allow-same-origin/);
  assert.match(src,/event\.source!==/);
});
