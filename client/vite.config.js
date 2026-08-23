import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the client runs on its own Vite server (5173) and proxies API +
// websocket traffic to the backend (4000). In production, the backend
// serves the built output directly, so no proxy is involved at all.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true }
    }
  }
});
