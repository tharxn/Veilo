import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/index.ts'),
      output: {
        format: 'iife',
        name: 'VeiloContent',
        inlineDynamicImports: true,
        entryFileNames: 'content.js',
      },
    },
  },
});
