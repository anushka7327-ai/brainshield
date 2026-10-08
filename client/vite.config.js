import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The UI runs on 5173 and forwards /api calls to the Node server on 8000,
// so the browser never needs to know the server address.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:8000', changeOrigin: true }
    }
  }
})
