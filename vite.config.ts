import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // three@0.183 (pulled in by globe.gl) has ./webgpu and ./tsl exports
      // that don't exist in three@0.165. Stub them out with empty modules.
      'three/webgpu': path.resolve(__dirname, 'src/stubs/three-webgpu.js'),
      'three/tsl': path.resolve(__dirname, 'src/stubs/three-tsl.js'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'satellite.js'],
  },
});
