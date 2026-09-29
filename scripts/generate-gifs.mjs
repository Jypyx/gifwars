import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = join(process.cwd(), 'public', 'gifs')
mkdirSync(out, { recursive: true })
const colors = {
  tank: '#a3e866', fighter: '#ffbd69', shooter: '#6edcfa', sniper: '#bc9bff', berserker: '#ff7789',
  strategist: '#f8d779', protector: '#a3e866', detonator: '#ff9b69', cryomancer: '#6edcfa', assassin: '#bc9bff'
}
const ranged = new Set(['shooter', 'sniper', 'detonator', 'cryomancer'])
const guarded = new Set(['tank', 'protector'])

function rgb(hex) { return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16)) }
function mix(a, b, t) { return a.map((value, i) => Math.round(value * (1 - t) + b[i] * t)) }
function makeFrame(kind, frame) {
  const pixels = new Uint8Array(32 * 32)
  const dy = frame === 1 ? -1 : 0
  function rect(x, y, w, h, index) {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < 32 && py >= 0 && py < 32) pixels[py * 32 + px] = index
    }
  }
  // Distinct silhouettes for tanks, melee, ranged Gifs and crowned Masters.
  rect(8, 12 + dy, 18, 14, 2)
  rect(7, 10 + dy, 18, 14, 1)
  rect(10, 7 + dy, 12, 5, 1)
  rect(8, 23 + dy, 6, 5, 2); rect(19, 23 + dy, 6, 5, 2)
  rect(11, 14 + dy, 4, frame === 1 ? 1 : 4, 4)
  rect(19, 14 + dy, 4, frame === 1 ? 1 : 4, 4)
  rect(14, 21 + dy, 6, 2, 3)
  rect(8, 10 + dy, 17, 2, 3)
  if (guarded.has(kind)) {
    rect(2, 13 + dy, 6, 13, 5); rect(3, 14 + dy, 3, 10, 3)
  } else if (ranged.has(kind)) {
    rect(23, 19 + dy, 7, 5, 5)
    rect(27, 18 + dy, 3, 2, 3)
    if (frame === 1) rect(30, 18 + dy, 2, 3, 6)
  } else {
    rect(25, 6 + dy, 2, 17, 5); rect(22, 9 + dy, 8, 2, 3)
  }
  if (kind === 'sniper' || kind === 'assassin') rect(9, 6 + dy, 15, 2, 5)
  if (kind === 'berserker') { rect(5, 6 + dy, 7, 3, 6); rect(22, 5 + dy, 6, 4, 6) }
  if (kind === 'cryomancer') { rect(4, 4 + dy, 3, 7, 6); rect(27, 4 + dy, 3, 7, 6) }
  if (['strategist', 'protector', 'detonator', 'cryomancer', 'assassin'].includes(kind)) {
    rect(9, 4 + dy, 4, 5, 6); rect(16, 2 + dy, 4, 7, 6); rect(23, 4 + dy, 4, 5, 6)
    rect(9, 8 + dy, 18, 2, 6)
  }
  return pixels
}

function literalLzw(pixels) {
  const codes = []
  for (const pixel of pixels) codes.push(16, pixel)
  codes.push(17)
  const packed = []
  let bits = 0, count = 0
  for (const code of codes) {
    bits |= code << count
    count += 5
    while (count >= 8) { packed.push(bits & 255); bits >>>= 8; count -= 8 }
  }
  if (count) packed.push(bits & 255)
  const blocks = []
  for (let i = 0; i < packed.length; i += 255) blocks.push(Math.min(255, packed.length - i), ...packed.slice(i, i + 255))
  blocks.push(0)
  return blocks
}

function gif(kind) {
  const base = rgb(colors[kind]), black = [23, 31, 44], white = [244, 245, 239]
  const colors16 = [
    [0, 0, 0], base, mix(base, black, .3), mix(base, white, .4), black,
    [169, 192, 202], [255, 239, 150], [255, 111, 137],
    ...Array.from({ length: 8 }, () => [0, 0, 0])
  ]
  const bytes = [...Buffer.from('GIF89a'), 32, 0, 32, 0, 0xf3, 0, 0]
  bytes.push(...colors16.flat())
  // Infinite loop application extension.
  bytes.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0)
  for (let i = 0; i < 2; i++) {
    bytes.push(0x21, 0xf9, 4, 0x09, 14, 0, 0, 0)
    bytes.push(0x2c, 0, 0, 0, 0, 32, 0, 32, 0, 0)
    bytes.push(4, ...literalLzw(makeFrame(kind, i)))
  }
  bytes.push(0x3b)
  return Buffer.from(bytes)
}
for (const kind of Object.keys(colors)) writeFileSync(join(out, `${kind}.gif`), gif(kind))
