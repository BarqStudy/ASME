import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  base: '/ASME/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
