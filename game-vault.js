/**
 * Authenticated encryption for Celestial's external-game metadata cache.
 * The encryption key stays server-side; never export it to the browser.
 * This does not conceal code after a third-party game is loaded in an iframe.
 */
import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createEncryptedGameAssetCache} from './game-asset-vault.js';

const HEADER=Buffer.from('CGV1');
const AAD=Buffer.from('celestial:external-game-catalog:v1');
const IV_LENGTH=12;
const TAG_LENGTH=16;
const LIMIT=12*1024*1024;
function checkKey(key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw Error('Game vault requires a 256-bit encryption key');
}
export function sealGameCatalog(data,key){
 checkKey(key);
 const content=Buffer.from(JSON.stringify(data),'utf8');
 if(content.length>LIMIT)throw Error('Game catalog exceeds encrypted cache size limit');
 const iv=randomBytes(IV_LENGTH);
 const cipher=createCipheriv('aes-256-gcm',key,iv,{authTagLength:TAG_LENGTH});
 cipher.setAAD(AAD);
 const encrypted=Buffer.concat([cipher.update(content),cipher.final()]);
 return Buffer.concat([HEADER,iv,cipher.getAuthTag(),encrypted]);
}
export function openGameCatalog(envelope,key){
 checkKey(key);
 const input=Buffer.from(envelope);
 if(input.length<HEADER.length+IV_LENGTH+TAG_LENGTH+1||
    !input.subarray(0,HEADER.length).equals(HEADER)||
    input.length>LIMIT+HEADER.length+IV_LENGTH+TAG_LENGTH)
  throw Error('Invalid encrypted game catalog envelope');
 const iv=input.subarray(4,16);
 const tag=input.subarray(16,32);
 const cipherText=input.subarray(32);
 const decipher=createDecipheriv('aes-256-gcm',key,iv,{authTagLength:TAG_LENGTH});
 decipher.setAAD(AAD);
 decipher.setAuthTag(tag);
 const clear=Buffer.concat([decipher.update(cipherText),decipher.final()]);
 const value=JSON.parse(clear.toString('utf8'));
 if(!value||!Number.isFinite(value.expiresAt)||!Array.isArray(value.catalog?.games))
  throw Error('Invalid decrypted catalog structure');
 return value;
}
async function loadKey(directory,keyHex){
 if(keyHex!=null&&keyHex!==''){
  if(!/^[0-9a-f]{64}$/i.test(keyHex))throw Error('CELESTIAL_GAME_VAULT_KEY must be 64 hex characters');
  return Buffer.from(keyHex,'hex');
 }
 // Local development fallback. In production use a Railway secret, so an
 // exported storage volume does not contain the key needed to decrypt data.
 const keyFile=path.join(directory,'key.hex');
 try{
  const stored=(await readFile(keyFile,'utf8')).trim();
  if(!/^[0-9a-f]{64}$/i.test(stored))throw Error('Malformed on-disk game vault key');
  return Buffer.from(stored,'hex');
 }catch(error){
  if(error.code!=='ENOENT')throw error;
 }
 const proposed=randomBytes(32);
 try{
  await writeFile(keyFile,proposed.toString('hex'),{flag:'wx',mode:0o600});
  return proposed;
 }catch(error){
  if(error.code!=='EEXIST')throw error;
  const stored=(await readFile(keyFile,'utf8')).trim();
  if(!/^[0-9a-f]{64}$/i.test(stored))throw Error('Malformed on-disk game vault key');
  return Buffer.from(stored,'hex');
 }
}
export async function createGameVault({directory,keyHex=process.env.CELESTIAL_GAME_VAULT_KEY}={}){
 if(typeof directory!=='string'||!directory)throw Error('Game vault directory is required');
 await mkdir(directory,{recursive:true,mode:0o700});
 const key=await loadKey(directory,keyHex);
 const location=path.join(directory,'catalog.enc');
 const assetCache=await createEncryptedGameAssetCache({directory:path.join(directory,'assets'),key});
 let last=null,publicView=null,lookup=new Map();
 function index(catalog){
  if(last===catalog)return;
  last=catalog;
  lookup=new Map();
  for(const game of catalog.games){
   const id='g_'+createHmac('sha256',key).update('catalog-game:v1:').update(game.id).digest('base64url').slice(0,24);
   lookup.set(id,game);
  }
  publicView={
   ...catalog,
   games:catalog.games.map(game=>({
    id:'g_'+createHmac('sha256',key).update('catalog-game:v1:').update(game.id).digest('base64url').slice(0,24),
    name:game.name,
    sources:game.sources.map(source=>({
     name:source.name,cover:source.cover,creator:source.creator
    }))
   }))
  };
 }
 return {
  async load(){return openGameCatalog(await readFile(location),key)},
  async save(value){
   const envelope=sealGameCatalog(value,key);
   const temp=location+'.'+randomBytes(8).toString('hex')+'.tmp';
   try{
    await writeFile(temp,envelope,{flag:'wx',mode:0o600});
    await rename(temp,location);
   }catch(error){await unlink(temp).catch(()=>{});throw error}
  },
  publicCatalog(catalog){index(catalog);return publicView},
  launchUrl(catalog,gameId,sourceIndex){
   if(typeof gameId!=='string'||!/^g_[a-zA-Z0-9_-]{24}$/.test(gameId)||
      !Number.isInteger(sourceIndex)||sourceIndex<0)return null;
   index(catalog);
   const url=lookup.get(gameId)?.sources[sourceIndex]?.url;
   return typeof url==='string'&&url.startsWith('https://')?url:null;
  },
  async captureLaunch(catalog,gameId,sourceIndex){
   const url=this.launchUrl(catalog,gameId,sourceIndex);
   const name=lookup.get(gameId)?.sources[sourceIndex]?.name;
   if(!url||!name)throw Error('Game source not found');
   return assetCache.capture({handle:gameId,index:sourceIndex,sourceName:name,url});
  },
  async assetStatus(catalog,gameId,sourceIndex){
   if(!this.launchUrl(catalog,gameId,sourceIndex))return null;
   return assetCache.status(gameId,sourceIndex);
  }
 };
}
