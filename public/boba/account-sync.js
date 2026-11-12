// Account-owned preferences and personal workspace data.
// The browser keeps a local cache for responsiveness; the server is the
// durable source after the first successful account sync.
const keys=[
 'celestial.boba.theme','boba.accent','boba.fx','boba.dock.ai',
 'boba.tab.preset','boba.tab.title','boba.tab.icon',
 'celestial.ai.effort','boba.notes','boba.native.links',
 'celestial.game.2048.best'
];
let userId='',timer=0,active=false,pending=Promise.resolve(),dirty=false;
const ownerKey='celestial.workspace.localOwner';
const localKeys=()=>[...keys,...(userId?['boba.ask.'+userId]:[])];
const snapshot=()=>{
 const values=Object.fromEntries(localKeys().flatMap(key=>{
   const value=localStorage.getItem(key);
   return value===null?[]:[[key,value]];
 }));
 const chatKey='boba.ask.'+userId;
 // Keep the device's full chat history untouched. If it exceeds the
 // account transfer limit, prioritize recent threads in the cloud copy.
 if(values[chatKey]?.length>210000){
   try{
     const chats=JSON.parse(values[chatKey]);
     if(Array.isArray(chats)){
       const newest=[...chats].sort((a,b)=>(b.updated||0)-(a.updated||0));
       const copied=[];
       for(const chat of newest){
         const item={...chat,messages:Array.isArray(chat.messages)?chat.messages.slice(-48):[]};
         copied.push(item);
         if(JSON.stringify(copied).length>205000){
           copied.pop();
           if(!copied.length)copied.push({...item,messages:item.messages.slice(-12)});
           break;
         }
       }
       values[chatKey]=JSON.stringify(copied);
     }
   }catch{delete values[chatKey]}
 }
 return {values};
};
function hydrate(values){
 for(const key of localKeys()){
  if(Object.hasOwn(values,key))localStorage.setItem(key,values[key]);
  else localStorage.removeItem(key);
 }
}
async function upload(){
 if(!active||!userId)return;
 const payload=snapshot();
 pending=pending.catch(()=>{}).then(async()=>{
  const result=await fetch('/api/account/workspace',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  if(!result.ok)throw Error('Could not save account settings');
 });
 try{await pending}catch(error){
  dirty=true;
  console.warn('Workspace sync postponed:',error.message);
  window.dispatchEvent(new CustomEvent('celestial:workspace-sync',{detail:{ok:false}}));
  return;
 }
 window.dispatchEvent(new CustomEvent('celestial:workspace-sync',{detail:{ok:true}}));
}
export function queueAccountSave(){
 if(!active)return;
 dirty=true;
 clearTimeout(timer);
 timer=setTimeout(()=>{if(!dirty)return;dirty=false;void upload()},900);
}
export async function startAccountSync(user){
 userId=String(user?.id||'');
 if(!userId)return false;
 active=false;
 const result=await fetch('/api/account/workspace',{credentials:'same-origin'});
 if(!result.ok)throw Error('Could not load your account settings');
 const data=await result.json();
 const owner=localStorage.getItem(ownerKey);
 if(data.workspace?.values){
   hydrate(data.workspace.values);
 }else{
   // Adopt existing browser settings only once; do not import another
   // account's cached preferences when users share a device.
   if(owner&&owner!==userId)hydrate({});
 }
 localStorage.setItem(ownerKey,userId);
 active=true;
 if(!data.workspace)queueAccountSave();
 window.addEventListener('online',()=>{if(active)queueAccountSave()});
 window.addEventListener('celestial:save-workspace',queueAccountSave);
 return true;
}
