/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// The backend's CORS allow-list rejects localhost origins, so local dev can proxy /api through
// Vite: set VITE_API_BASE_URL empty and DEV_PROXY_TARGET=<backend URL> in .env.local (not exposed to the browser).
export default defineConfig(({ mode }) => {
  const vars = loadEnv(mode, process.cwd(), '')
  const proxyTarget = vars.DEV_PROXY_TARGET
  // Fail the production build rather than ship a bundle that calls a relative /api path.
  if (mode === 'production' && !/^https:\/\/[^/]+/.test(vars.VITE_API_BASE_URL ?? '')) {
    throw new Error('VITE_API_BASE_URL must be an https URL for production builds.')
  }
  return {
    server: proxyTarget
      ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true } } }
      : undefined,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
    },
  }
})
