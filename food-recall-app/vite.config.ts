import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  const hosted = demo || mode === 'pages'
  const base = hosted ? '/beanstalk/' : '/'

  return {
    base,
    // Hosted builds must never inherit an owner key from files or the shell.
    envDir: hosted ? false : undefined,
    envPrefix: hosted ? [] : 'VITE_',
    define: hosted ? { 'import.meta.env.VITE_DEMO': JSON.stringify(demo ? 'true' : 'false') } : undefined,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: demo ? 'Beanstalk Demo' : 'Beanstalk',
          short_name: 'Beanstalk',
          description: demo ? 'Interactive food recall explorer with fictional sample records' : 'Explore FDA food recall records',
          start_url: base,
          scope: base,
          theme_color: '#1d4535',
          background_color: '#fafafa',
          display: 'standalone',
          icons: [
            { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        },
        workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
      }),
    ],
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [],
    },
  }
})
