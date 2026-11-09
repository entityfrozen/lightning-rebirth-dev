import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/bundle/',
  build: {
    target: 'es2022',
    outDir: 'public/bundle',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve('src/main.jsx'),
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: asset => asset.name?.endsWith('.css') ? 'style.css' : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
