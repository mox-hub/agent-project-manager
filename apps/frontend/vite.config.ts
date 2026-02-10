import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/_api': {
        target: 'http://localhost:4300',
        changeOrigin: true,
      },
    },
  },
})
