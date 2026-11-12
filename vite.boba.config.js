import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {opaqueClientClasses} from './scripts/opaque-client.mjs';

// Ship standards-compliant, minified ES modules. Previous post-build
// JavaScript obfuscation rewrote call sites and broke runtime navigation.
// Do not reintroduce a post-bundle code transform without a browser smoke test.
export default defineConfig({
 publicDir:false,
 plugins:[opaqueClientClasses()],
 base:'/boba/dist/',
 build:{
  target:'es2022',
  minify:'esbuild',
  cssMinify:true,
  sourcemap:false,
  manifest:true,
  outDir:'public/boba/dist',
  emptyOutDir:true,
  rollupOptions:{
   input:{
    app:resolve('src/boba-client.js'),
    auth:resolve('src/boba-login.js')
   },
   output:{
    entryFileNames:'assets/[name]-[hash].js',
    chunkFileNames:'assets/[name]-[hash].js',
    assetFileNames:'assets/[name]-[hash][extname]'
   }
  }
 }
});
