import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import history from 'connect-history-api-fallback';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // Alias pour '@/'
    },
  },
  assetsInclude: ['**/*.png', '**/*.PNG'], // Supporte les deux casses
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    },
    // Pour Vite 4+, utiliser configurePreviewServer pour le fallback SPA
    configurePreviewServer(server) {
      server.middlewares.use(history());
    },
    // Pour le dev, utiliser configureServer
    configureServer(server) {
      server.middlewares.use(history());
    },
  },
});
