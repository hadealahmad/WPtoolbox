import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Helper to get all HTML files for multi-page build
const pages = readdirSync(__dirname)
  .filter(file => file.endsWith('.html'))
  .reduce((acc, file) => {
    const name = file.replace('.html', '');
    acc[name] = resolve(__dirname, file);
    return acc;
  }, {});

export default defineConfig({
  root: './',
  base: './', // Ensures assets are linked relatively for easy deployment
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'js/data/*',
          dest: 'js/data'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: pages
    },
  },
  server: {
    port: 3000,
  }
});
