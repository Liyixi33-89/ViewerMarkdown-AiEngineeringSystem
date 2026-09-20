import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前台与后台分包：admin 相关（含 antd）只进 admin chunk
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-sanitize', 'react-syntax-highlighter'],
          admin: ['antd'],
        },
      },
    },
  },
});
