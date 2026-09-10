import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// devApi() mirrors Vercel /api/* behavior locally so dev === prod.
// Strict allowlist lives in api/_allow.js; unknown routes get error+retry JSON.
function devApi() {
  return {
    name: 'ninety-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/', (req, res) => {
        if (req.url?.startsWith('/health')) {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: true, env: 'dev', game: 'NINETY' }))
          return
        }
        res.statusCode = 404
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND', retryable: true }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
})
