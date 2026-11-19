import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = process.env.API_PORT ?? '3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    // Forward API calls to the Express server so cookies stay same-origin.
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
})
