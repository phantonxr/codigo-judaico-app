import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Exposes package.json version as import.meta.env.VITE_APP_VERSION at build time.
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  build: {
    // 'hidden' uploads source maps to Sentry but does not serve them publicly.
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Only run during CI / production builds to avoid slowing local dev.
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
