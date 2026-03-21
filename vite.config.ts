import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      // three@0.183 (pulled in by globe.gl) has ./webgpu and ./tsl exports
      // that Rollup can't resolve from the top-level three@0.165. Exclude them.
      external: (id: string) => /^three\/(webgpu|tsl)$/.test(id),
    },
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'satellite.js'],
    exclude: ['three/webgpu'],
  },
});
