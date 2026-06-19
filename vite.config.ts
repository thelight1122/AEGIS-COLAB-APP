import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GATEWAY_PORT = process.env.GATEWAY_PORT ?? '9090'
const GATEWAY_TARGET = `http://localhost:${GATEWAY_PORT}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: GATEWAY_TARGET,
        changeOrigin: true,
      }
    }
  }
})
