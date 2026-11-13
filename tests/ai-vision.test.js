import test from 'node:test';
import assert from 'node:assert/strict';
import {completeAi,VISION_BACKUP,TEXT_MODEL} from '../ai-provider.js';

const picture='data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const answer={choices:[{message:{content:'This is a picture of a test diagram.'}}]};

test('image messages use a vision model and retain the image payload',async()=>{
 let request;
 const result=await completeAi({
  apiKey:'test',model:TEXT_MODEL,
  messages:[
   {role:'system',content:'Describe pictures'},
   {role:'user',content:[{type:'text',text:'Describe this image in detail'},{type:'image_url',image_url:{url:picture}}]}
  ],
  stream:false,effort:'smart',budgets:[1000],
  maxTokens:5100,
  fetcher:async(_url,options)=>{
   request=JSON.parse(options.body);
   return {ok:true,json:async()=>answer};
  }
 });
 assert.equal(request.model,VISION_BACKUP);
 assert.equal(request.max_tokens,5100);
 assert.equal(request.messages[1].content[1].image_url.url,picture);
 assert.equal(result.reply,answer.choices[0].message.content);
});

test('vision fallback never sends an image to the text-only model',async()=>{
 const attempted=[];
 const result=await completeAi({
  apiKey:'test',model:TEXT_MODEL,
  messages:[{role:'user',content:[{type:'text',text:'Analyze'},{type:'image_url',image_url:{url:picture}}]}],
  stream:false,budgets:[1000,1000],
  fetcher:async(_url,options)=>{
   const request=JSON.parse(options.body);attempted.push(request.model);
   if(attempted.length===1)return {ok:false,status:503,json:async()=>({error:{message:'Temporary failure'}})};
   return {ok:true,json:async()=>answer};
  }
 });
 assert.equal(attempted.length,2);
 assert.ok(!attempted.includes(TEXT_MODEL));
 assert.equal(result.reply,answer.choices[0].message.content);
});
