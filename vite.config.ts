/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false, // Uses public/manifest.json
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'aura3d-static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'aura3d-media-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
            },
          },
          {
            urlPattern: ({ request, url }) => request.destination === 'audio' || /\.(?:mp3|wav|ogg|m4a|aac|flac)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'aura3d-audio-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200, 206],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.cache/**', '**/server/data/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    // 3D WebGL vendor bundle is code-split via React.lazy and loaded on demand
    chunkSizeWarningLimit: 1200,
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => {
        // Filter out deferred 3D visualizers, charts, and heavy studio modules from initial HTML modulepreload
        return deps.filter(
          (dep) =>
            !dep.includes('chart') &&
            !dep.includes('Visualizer') &&
            !dep.includes('Admin')
        );
      },
    },
  },
});
