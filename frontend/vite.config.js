// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // proxy REST
      '/api': {
        target: 'http://localhost:5000', // porta del backend
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // proxy websocket realtime
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})



