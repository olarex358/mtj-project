import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MTJ Smart Savings',
        short_name: 'MTJ Savings',
        description: 'Save Today. Secure Tomorrow.',
        theme_color: '#0a6e3a',
        background_color: '#f5f7f6',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ]
});
