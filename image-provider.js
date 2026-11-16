// Hosted NVIDIA NIM image generation. Prefer the higher-fidelity FLUX.1-dev;
// fall back to FLUX.1-schnell only if the provider cannot serve the first.
const HOST='https://ai.api.nvidia.com/v1/genai/black-forest-labs/';
const MODELS=[
 {name:'FLUX.1-dev',slug:'flux.1-dev',steps:48,cfg_scale:5},
 {name:'FLUX.1-schnell',slug:'flux.1-schnell',steps:4,cfg_scale:0}
];

export async function generateImage({apiKey,prompt,fetcher=fetch,signal}){
 const text=String(prompt||'').trim();
 if(!text||text.length>1600)throw Error('Please enter an image description under 1,600 characters.');
 let lastError;
 for(const model of MODELS){
  try{
   const response=await fetcher(HOST+model.slug,{
    method:'POST',
    headers:{Authorization:'Bearer '+apiKey,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({prompt:text,mode:'base',width:1024,height:1024,samples:1,seed:0,steps:model.steps,cfg_scale:model.cfg_scale}),
    signal
   });
   if(!response.ok){
    const error=new Error('NVIDIA image model '+model.name+' returned '+response.status);
    error.status=response.status;
    throw error;
   }
   const data=await response.json();
   const artifact=data?.artifacts?.[0];
   const encoded=artifact?.base64||data?.data?.[0]?.b64_json;
   if(typeof encoded!=='string'||encoded.length<100)throw Error('Image model returned no usable image.');
   if(encoded.length>14_000_000)throw Error('Generated image was too large.');
   const image=Buffer.from(encoded,'base64');
   const png=image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
   const jpeg=image.length>3&&image[0]===255&&image[1]===216&&image[2]===255;
   const webp=image.subarray(0,4).toString()==='RIFF'&&image.subarray(8,12).toString()==='WEBP';
   if(!png&&!jpeg&&!webp)throw Error('The image model returned an invalid image.');
   return {bytes:image,mime:png?'image/png':jpeg?'image/jpeg':'image/webp',extension:png?'png':jpeg?'jpg':'webp',model:model.name};
  }catch(error){
   if(signal?.aborted)throw error;
   lastError=error;
   if(error.status===401)break;
  }
 }
 const error=new Error(lastError?.status===401?'Image generation API key was rejected.':'Image generation is unavailable for the configured NVIDIA key. An administrator may need access to an image NIM endpoint.');
 error.status=lastError?.status||502;
 throw error;
}
