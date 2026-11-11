import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';

// Independent of the legacy React rollback build; Celestial's primary UI
// ships as hashed, minified ES modules and extracted stylesheets.
// Obfuscate only the compiled first-party UI. Proxy internals stay untouched.
function protectClientBundle(){
 return {
  name:'celestial-ui-obfuscation',
  apply:'build',
  generateBundle(_output,bundle){
   for(const chunk of Object.values(bundle)){
    if(chunk.type!=='chunk'||chunk.name!=='app')continue;
    chunk.code=JavaScriptObfuscator.obfuscate(chunk.code,{
     target:'browser',compact:true,renameGlobals:false,renameProperties:false,
     ignoreImports:true,stringArray:true,stringArrayEncoding:['base64'],
     stringArrayThreshold:0.6,stringArrayCallsTransform:false,
     controlFlowFlattening:false,deadCodeInjection:false,selfDefending:false,
     debugProtection:false,disableConsoleOutput:false,sourceMap:false,seed:7011
    }).getObfuscatedCode();
   }
  }
 };
}
export default defineConfig({
  plugins:[protectClientBundle()],
  publicDir: false,
  base: '/boba/dist/',
  build: {
    target: 'es2022',
    minify: true,
    cssMinify: true,
    sourcemap: false,
    manifest: true,
    outDir: 'public/boba/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve('src/boba-client.js'),
        auth: resolve('src/boba-login.js')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
