import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const configuredBase = process.env.GIFWARS_BASE_PATH ?? (mode === 'github-pages' ? '/gifwars/' : '/')
  const basePath = configuredBase.replace(/^\/+|\/+$/g, '')
  const base = basePath ? `/${basePath}/` : '/'
  return {
    base,
    plugins: [
      vue(), tailwindcss(),
      VitePWA({
        base, scope: base,
        strategies: 'injectManifest',
        srcDir: 'src', filename: 'sw.ts', registerType: 'prompt',
        includeAssets: ['icons/*.png', 'favicon.svg'],
        injectManifest: { globPatterns: ['**/*.{js,css,html,png,gif,svg,woff2}'] },
        manifest: {
          id: base, name: 'Gif Wars — Pixel Arena', short_name: 'Gif Wars',
          description: 'Un duel tactique de Gifs animés. Trois couloirs, un Master, zéro pitié.',
          lang: 'fr', start_url: base, scope: base, display: 'standalone',
          orientation: 'portrait-primary', theme_color: '#101321', background_color: '#080b14',
          categories: ['games', 'entertainment'],
          icons: [
            { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],
    build: {
      rollupOptions: { output: { manualChunks: { pixi: ['pixi.js'] } } }
    }
  }
})
