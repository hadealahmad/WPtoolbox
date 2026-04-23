import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'assets/*'],
      manifest: {
        name: 'WPToolbox',
        short_name: 'WPToolbox',
        description: 'Premium WordPress utilities hub',
        theme_color: '#09090b',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
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
