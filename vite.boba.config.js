import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Independent of the legacy React rollback build; Celestial's primary UI
// ships as hashed, minified ES modules and extracted stylesheets.
export default defineConfig({
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
