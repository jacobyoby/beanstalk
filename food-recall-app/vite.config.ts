import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  const hosted = demo || mode === 'pages'
  const base = hosted ? '/beanstalk/' : '/'

  return {
    base,
    envDir: hosted ? false : undefined,
    envPrefix: hosted ? [] : 'VITE_',
    define: hosted ? { 'import.meta.env.VITE_DEMO': JSON.stringify(demo ? 'true' : 'false') } : undefined,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: demo ? 'beanstalk demo' : 'beanstalk',
          short_name: 'beanstalk',
          description: demo ? 'Interactive food recall explorer with fictional sample records' : 'Explore FDA food recall records',
          start_url: base,
          scope: base,
          theme_color: '#1d4535',
          background_color: '#f8f6ee',
          display: 'standalone',
          icons: [
            { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
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
              const apiKey = process.env.OPENFDA_API_KEY
              if (apiKey && !url.searchParams.has('api_key')) {
                const separator = url.search ? '&' : '?'
                proxyReq.path += `${separator}api_key=${apiKey}`
              }
            })
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [],
    },
  }
})
