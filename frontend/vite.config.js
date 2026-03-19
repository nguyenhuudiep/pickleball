import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'root-index-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/') {
            req.url = '/index.html'
          }
          next()
        })
      },
    },
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
