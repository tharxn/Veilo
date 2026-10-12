import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        offscreen: resolve(__dirname, 'src/offscreen/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
        },
        {
          src: 'offscreen.html',
          dest: '.',
        },
        {
          src: 'src/popup/popup.html',
          dest: '.',
        },
        {
          src: '../../node_modules/tesseract.js/dist/worker.min.js',
          dest: 'ocr',
        },
        {
          src: '../../node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
          dest: 'ocr/core',
        },
        {
          src: '../../node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
          dest: 'ocr/lang',
        },
        {
          src: 'src/ui/assets/InterVariable.woff2',
          dest: 'fonts',
        },
        {
          src: 'src/ui/assets/Inter-OFL.txt',
          dest: 'fonts',
        },
        {
          src: 'src/icons/*.png',
          dest: 'icons',
        },
      ],
    }),
  ],
});
