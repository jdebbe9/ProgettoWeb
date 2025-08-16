import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Niente proxy: usiamo VITE_API_BASE_URL dalle .env
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})

