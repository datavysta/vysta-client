import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000
  },
  appType: 'mpa',
  assetsInclude: ['**/*.html'],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}); 