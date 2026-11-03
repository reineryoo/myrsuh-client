import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const publicFiles = [
  '/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png',
  '/images/logo-light.png', '/images/logo-dark.png', '/images/onboarding-schedule.jpg',
]

function offlineWorker(): Plugin {
  return {
    name: 'myrsuh-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const worker = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')
      const hash = createHash('sha256').update(worker)
      hash.update(readFileSync(new URL('./index.html', import.meta.url)))
      for (const path of publicFiles) {
        hash.update(readFileSync(new URL(`./public${path}`, import.meta.url)))
      }
      const files = Object.keys(bundle).sort()
      for (const file of files) {
        const output = bundle[file]
        hash.update(file).update(output.type === 'chunk' ? output.code : output.source)
      }
      const paths = [...new Set(['/index.html', ...files.map(file => `/${file}`), ...publicFiles])]
      const cache = `myrsuh-app-${hash.digest('hex').slice(0, 16)}`
      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: `const APP_CACHE = ${JSON.stringify(cache)};\nconst APP_FILES = ${JSON.stringify(paths)};\n${worker}`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineWorker()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8000' } },
})
