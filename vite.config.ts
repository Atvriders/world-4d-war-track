import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Stubs MUST come before the three alias to intercept sub-path imports
      { find: 'three/webgpu', replacement: path.resolve(__dirname, 'src/stubs/three-webgpu.js') },
      { find: 'three/tsl', replacement: path.resolve(__dirname, 'src/stubs/three-tsl.js') },
      // Force ALL three imports to the SAME copy — prevents "Multiple instances"
      { find: 'three', replacement: path.resolve(__dirname, 'node_modules/three') },
    ],
    dedupe: ['three'],
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
