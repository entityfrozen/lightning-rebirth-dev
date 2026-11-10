import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completeAi,TEXT_MODEL} from '../ai-provider.js';

test('a 403 on the configured NVIDIA model tries the hosted text fallback',async()=>{
  const attempted=[];
  const fetcher=async (_url,request)=>{
    const {model}=JSON.parse(request.body);
    attempted.push(model);
    if(model==='openai/gpt-oss-20b'){
      return new Response(JSON.stringify({error:{message:'Model access denied'}}),{
        status:403,headers:{'Content-Type':'application/json'}
      });
    }
    return new Response(JSON.stringify({choices:[{message:{content:'Fallback works'}}]}),{
      status:200,headers:{'Content-Type':'application/json'}
    });
  };
  const result=await completeAi({
    apiKey:'test-only',
    model:'openai/gpt-oss-20b',
    backupModel:'meta/muse-glimmer-30b',
    messages:[{role:'user',content:'Hi'}],
    stream:false,
    fetcher
  });
  assert.equal(result.reply,'Fallback works');
  assert.deepEqual(attempted,['openai/gpt-oss-20b',TEXT_MODEL]);
});

test('a genuinely invalid NVIDIA key still fails without retrying credentials',async()=>{
  let requests=0;
  await assert.rejects(()=>completeAi({
    apiKey:'invalid-test-key',
    model:'test/invalid-key',
    backupModel:'test/other-model',
    messages:[{role:'user',content:'Hi'}],
    stream:false,
    fetcher:async()=>{
      requests++;
      return new Response(JSON.stringify({error:{message:'Unauthorized'}}),{
        status:401,headers:{'Content-Type':'application/json'}
      });
    }
  }),/NVIDIA rejected/);
  assert.equal(requests,1);
});

test('launcher framing is enabled while Scramjet still gets isolation headers',()=>{
  const server=readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const browser=readFileSync(new URL('../src/Browser.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(server,/X-Frame-Options.*SAMEORIGIN/);
  assert.doesNotMatch(server,/frame-ancestors 'self'/);
  assert.match(server,/Cross-Origin-Opener-Policy.*same-origin/);
  assert.match(server,/Cross-Origin-Embedder-Policy.*credentialless/);
  assert.match(server,/lightning_embed_session/);
  assert.match(server,/SameSite=None; Partitioned/);
  assert.match(browser,/Open full Celestial browser/);
});
