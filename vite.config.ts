import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(), tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src', filename: 'sw.ts', registerType: 'prompt',
      includeAssets: ['icons/*.png', 'favicon.svg'],
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,gif,svg,woff2}'] },
      manifest: {
        id: '/', name: 'Gif Wars — Pixel Arena', short_name: 'Gif Wars',
        description: 'Un duel tactique de Gifs animés. Trois couloirs, un Master, zéro pitié.',
        lang: 'fr', start_url: '/', scope: '/', display: 'standalone',
        orientation: 'portrait-primary', theme_color: '#101321', background_color: '#080b14',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: { output: { manualChunks: { pixi: ['pixi.js'] } } }
  }
})
