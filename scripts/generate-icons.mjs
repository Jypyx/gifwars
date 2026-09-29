import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join } from 'node:path'

const output = join(process.cwd(), 'public', 'icons')
mkdirSync(output, { recursive: true })

const palette = {
  dark: [12, 21, 36, 255], frame: [91, 218, 217, 255],
  inner: [24, 45, 65, 255], gold: [247, 214, 117, 255],
  shadow: [154, 92, 86, 255], pink: [255, 126, 149, 255],
  eye: [19, 33, 49, 255], shine: [255, 242, 180, 255]
}

let crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1
  return c >>> 0
})
function chunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const bytes = Buffer.concat([Buffer.from(type), data])
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ crc >>> 8
  const end = Buffer.alloc(4); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, bytes, end])
}
function icon(size, maskable = false) {
  const pixels = Buffer.alloc(size * size * 4)
  function rect(x, y, w, h, shade) {
    const rgba = palette[shade]
    for (let py = Math.max(0, Math.floor(y * size)); py < Math.min(size, Math.ceil((y + h) * size)); py++) {
      for (let px = Math.max(0, Math.floor(x * size)); px < Math.min(size, Math.ceil((x + w) * size)); px++) {
        const i = (py * size + px) * 4
        pixels[i] = rgba[0]; pixels[i + 1] = rgba[1]; pixels[i + 2] = rgba[2]; pixels[i + 3] = rgba[3]
      }
    }
  }
  rect(0, 0, 1, 1, 'dark')
  const padding = maskable ? .17 : .08
  rect(padding, padding, 1 - 2 * padding, 1 - 2 * padding, 'frame')
  rect(padding + .025, padding + .025, .95 - 2 * padding, .95 - 2 * padding, 'inner')
  rect(.28, .4, .44, .31, 'shadow')
  rect(.26, .37, .44, .30, 'gold')
  rect(.3, .3, .07, .1, 'gold'); rect(.43, .27, .08, .13, 'gold'); rect(.6, .3, .07, .1, 'gold')
  rect(.3, .37, .37, .04, 'shine')
  rect(.34, .49, .07, .08, 'eye'); rect(.56, .49, .07, .08, 'eye')
  rect(.41, .62, .16, .035, 'pink')
  rect(.19, .74, .62, .045, 'frame')
  rect(.22, .82, .06, .04, 'pink'); rect(.72, .82, .06, .04, 'pink')
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4)
  header[8] = 8; header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ])
}
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false], ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]
]) writeFileSync(join(output, name), icon(size, maskable))
