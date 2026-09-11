import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Beanstalk — Food Recall Tracker',
        short_name: 'Beanstalk',
        description: 'Track FDA food recalls and get alerts',
        theme_color: '#fafafa',
        background_color: '#fafafa',
        display: 'standalone',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/food': {
        target: 'https://api.fda.gov',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/food/, '/food'),
        configure: proxy => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = new URL(req.url || '', 'https://api.fda.gov')
            const apiKey = process.env.OPENFDA_API_KEY || process.env.VITE_OPENFDA_KEY
            if (apiKey && !url.searchParams.has('api_key')) {
              const separator = url.search ? '&' : '?'
              proxyReq.path += `${separator}api_key=${apiKey}`
            }
          })
        },
      },
      '/api/fsis': {
        target: 'https://www.fsis.usda.gov',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/fsis/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
