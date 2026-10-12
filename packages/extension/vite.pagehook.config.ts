import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        pageHook: resolve(__dirname, 'src/intercept/pageHook.ts'),
      },
      output: {
        format: 'iife',
        name: 'VeiloPageHook',
        entryFileNames: '[name].js',
      },
    },
  },
});
