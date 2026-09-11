import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
    // 3D WebGL vendor bundle (Three.js + R3F + Drei + three-stdlib) is ~900 KB minified (240 KB gzip).
    // It is code-split via React.lazy and only fetched when 3D scene is mounted.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('/node_modules/three/') || normalized.includes('\\node_modules\\three\\')) {
              return 'three-core';
            }
            if (normalized.includes('@react-three/drei') || normalized.includes('three-stdlib')) {
              return 'three-drei';
            }
            if (normalized.includes('@react-three/fiber')) {
              return 'r3f-core';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'chart-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('socket.io-client')) {
              return 'socket-vendor';
            }
          }
        },
      },
    },
  },
});
