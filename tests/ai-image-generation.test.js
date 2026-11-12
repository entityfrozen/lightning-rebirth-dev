import test from 'node:test';
import assert from 'node:assert/strict';
import {generateImage} from '../image-provider.js';

const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,0,0,0,0,0]);
const result={artifacts:[{base64:png.toString('base64')}]};

test('FLUX.1-dev is preferred for highest-quality image generation',async()=>{
 let request,url;
 const data=await generateImage({apiKey:'test',prompt:'Moonlit shrine',fetcher:async(endpoint,options)=>{
  url=endpoint;request=JSON.parse(options.body);
  return {ok:true,json:async()=>result};
 }});
 assert.equal(url,'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev');
 assert.equal(request.steps,48);
 assert.equal(request.prompt,'Moonlit shrine');
 assert.equal(data.mime,'image/png');
 assert.equal(data.model,'FLUX.1-dev');
 assert.deepEqual(data.bytes,png);
});

test('FLUX.1-schnell fallback is used when dev endpoint is unavailable',async()=>{
 const urls=[];
 const data=await generateImage({apiKey:'test',prompt:'a red ribbon in the sky',fetcher:async(endpoint)=>{
  urls.push(endpoint);
  return endpoint.endsWith('flux.1-dev')?{ok:false,status:503}:{ok:true,json:async()=>result};
 }});
 assert.equal(urls.length,2);
 assert.match(urls[1],/flux.1-schnell$/);
 assert.equal(data.model,'FLUX.1-schnell');
});

test('image generation rejects invalid prompts and provider output',async()=>{
 await assert.rejects(generateImage({apiKey:'test',prompt:' '}),/image description/);
 await assert.rejects(generateImage({apiKey:'test',prompt:'hi',fetcher:async()=>({ok:true,json:async()=>({artifacts:[{base64:'abc'}]})})}),/unavailable/);
});
