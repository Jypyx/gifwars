import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const base = process.argv[2] ?? '/gifwars/'
assert(base.startsWith('/') && base.endsWith('/'), 'The expected base must start and end with /.')
const site = new URL(base, 'https://example.invalid')
function assertAsset(path) {
  const url = new URL(path, site)
  assert.equal(url.origin, site.origin)
  assert(url.pathname.startsWith(base), `Asset escapes the deployment base: ${path}`)
  assert(existsSync(join('dist', url.pathname.slice(base.length))), `Missing asset: ${path}`)
}

const html = readFileSync('dist/index.html', 'utf8')
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) assertAsset(match[1])
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
assert.equal(manifest.id, base)
assert.equal(manifest.start_url, base)
assert.equal(manifest.scope, base)
for (const icon of manifest.icons) assertAsset(icon.src)
for (const gif of readdirSync('public/gifs')) assertAsset(`${base}gifs/${gif}`)
assertAsset(`${base}sw.js`)
const bundles = readdirSync('dist/assets').filter(file => file.endsWith('.js'))
  .map(file => readFileSync(join('dist/assets', file), 'utf8')).join('\n')
assert(bundles.includes(`${base}sw.js`), 'The service worker registration uses an incorrect base.')
console.log(`Build verified for ${base}: HTML assets, manifest, icons, GIFs and service worker.`)
