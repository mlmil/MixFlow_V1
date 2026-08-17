import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
