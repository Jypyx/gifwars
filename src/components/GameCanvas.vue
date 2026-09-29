<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { GifSource, GifSprite } from 'pixi.js/gif'
import { CATALOG } from '../game/catalog'
import type { Cell, GameEvent, Unit, UnitKind } from '../game/types'
import { useGameStore } from '../stores/gameStore'
import { destroyDisplayChildren, destroyDisplayTree } from '../rendering/dispose'
import { assetUrl } from '../services/urls'

const emit = defineEmits<{
  cell: [row: number, col: number]
  hover: [unit: Unit, x: number, y: number]
  leave: []
}>()
const holder = ref<HTMLElement | null>(null)
const store = useGameStore()
const app = new Application()
const board = new Container()
const tileLayer = new Container()
const highlightLayer = new Graphics()
const unitLayer = new Container()
const fxLayer = new Container()
const scanline = new Graphics()
const sprites = new Map<string, Container>()
const spriteData = new Map<string, string>()
const gifSources = new Map<UnitKind, GifSource>()
const tweens = new Map<string, { from: Cell; to: Cell; elapsed: number; duration: number }>()
const fades = new Map<string, number>()
const particles: { graphic: Graphics; vx: number; vy: number; life: number }[] = []
const W = 360, X = 27, Y = 25, CW = 102
let H = 600, CH = 55
let mounted = false
let tickTime = 0
let shake = 0
let flash = 0
let resizeObserver: ResizeObserver | null = null

const color = (hex: string): number => Number.parseInt(hex.slice(1), 16)
const pos = (at: Cell) => ({ x: X + at.col * CW + CW / 2, y: Y + at.row * CH + CH / 2 })

function hoverCell(event: PointerEvent): void {
  if (!holder.value || event.pointerType === 'touch') return
  const bounds = holder.value.getBoundingClientRect()
  const x = (event.clientX - bounds.left) * W / bounds.width
  const y = (event.clientY - bounds.top) * H / bounds.height
  const col = Math.floor((x - X) / CW)
  const row = Math.floor((y - Y) / CH)
  const unit = store.game.units.find(candidate => candidate.row === row && candidate.col === col)
  if (unit && !unit.faceDown && col >= 0 && col < 3 && row >= 0 && row < 10) {
    emit('hover', unit, event.clientX, event.clientY)
  } else emit('leave')
}

function label(text: string, size: number, fill: number, weight: 'bold' | 'normal' = 'bold'): Text {
  return new Text({ text, style: { fontFamily: 'monospace', fontSize: size, fill, fontWeight: weight, letterSpacing: 1 } })
}

function drawArena(): void {
  for (const child of board.removeChildren()) {
    if (![tileLayer, highlightLayer, unitLayer, fxLayer, scanline].includes(child as Container)) destroyDisplayTree(child)
  }
  destroyDisplayChildren(tileLayer)
  const background = new Graphics()
  background.rect(0, 0, W, H).fill(0x0d1423)
  background.rect(0, 0, W, H / 2).fill({ color: 0x2d152a, alpha: .22 })
  background.rect(0, H / 2, W, H / 2).fill({ color: 0x0c4452, alpha: .22 })
  for (let i = 0; i < 44; i++) {
    const px = (i * 137 + 43) % W, py = (i * 227 + 19) % H
    background.rect(px, py, i % 4 === 0 ? 2 : 1, 1).fill({ color: i % 2 ? 0x68cfe2 : 0xffa278, alpha: .25 })
  }
  board.addChild(background)
  const lanes = ['GAUCHE', 'CENTRE', 'DROITE']
  lanes.forEach((lane, col) => {
    const title = label(lane, 8, 0x748298)
    title.anchor.set(.5)
    title.position.set(X + col * CW + CW / 2, 12)
    board.addChild(title)
  })
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 3; col++) {
      const upper = row < 5
      const tile = new Graphics()
      const tx = X + col * CW + 2, ty = Y + row * CH + 2
      tile.rect(tx, ty, CW - 4, CH - 4).fill({ color: upper ? 0x46263a : 0x17404c, alpha: row % 2 ? .54 : .38 })
      tile.rect(tx, ty, CW - 4, CH - 4).stroke({ color: upper ? 0xb75b67 : 0x38b3bd, width: 1, alpha: .27 })
      tile.rect(tx + 3, ty + 3, 11, 1).fill({ color: upper ? 0xff6e80 : 0x50def0, alpha: .35 })
      tile.rect(tx + CW - 18, ty + CH - 7, 11, 1).fill({ color: upper ? 0xff6e80 : 0x50def0, alpha: .3 })
      tile.eventMode = 'static'
      tile.cursor = 'pointer'
      tile.on('pointertap', () => emit('cell', row, col))
      tileLayer.addChild(tile)
    }
    const number = label(String(row < 5 ? 5 - row : row - 4).padStart(2, '0'), 8, row < 5 ? 0x995660 : 0x4b9a9d)
    number.anchor.set(.5)
    number.position.set(12, Y + row * CH + CH / 2)
    board.addChild(number)
  }
  const divider = new Graphics()
  divider.rect(13, Y + 5 * CH - 1, 336, 2).fill(0xf1cf76)
  divider.rect(22, Y + 5 * CH - 5, 316, 1).fill({ color: 0xf1cf76, alpha: .45 })
  board.addChild(tileLayer, divider, highlightLayer, unitLayer, fxLayer, scanline)
  app.stage.addChild(board)
}

function paintUnit(sprite: Container, unit: Unit): void {
  destroyDisplayChildren(sprite)
  const tint = color(CATALOG[unit.kind].color)
  const plate = new Graphics()
  plate.rect(-42, -23, 84, 46).fill(unit.owner === 'player' ? 0x0d2833 : 0x321b30)
  plate.rect(-42, -23, 84, 46).stroke({ color: unit.master ? 0xf9d677 : tint, width: unit.master ? 2 : 1.5, alpha: .92 })
  plate.rect(-39, -20, 77, 2).fill({ color: tint, alpha: .68 })
  if (unit.faceDown) {
    plate.rect(-35, -15, 70, 31).fill({ color: unit.owner === 'player' ? 0x226574 : 0x87465d, alpha: .85 })
    for (let i = 0; i < 5; i++) plate.rect(-30 + i * 14, -13, 2, 27).fill({ color: 0xffffff, alpha: .15 })
    const question = label('?', 22, 0xffffff)
    question.anchor.set(.5)
    sprite.addChild(plate, question)
    return
  }
  const shadow = new Graphics()
  shadow.ellipse(-16, 13, 18, 5).fill({ color: 0x000000, alpha: .4 })
  const body = new Graphics()
  // A tiny animated pixel actor, drawn natively so all five archetypes work offline.
  body.rect(-30, -6, 28, 19).fill(tint)
  body.rect(-27, -11, 22, 7).fill(tint)
  body.rect(-24, -15, 16, 5).fill(unit.kind === 'tank' ? 0x70953c : tint)
  body.rect(-24, -5, 5, 5).fill(0x101424)
  body.rect(-11, -5, 5, 5).fill(0x101424)
  body.rect(-25, 12, 7, 6).fill(tint)
  body.rect(-12, 12, 7, 6).fill(tint)
  if (unit.kind === 'tank' || unit.kind === 'protector') {
    body.rect(-37, -8, 8, 19).fill(0x839eb0)
    body.rect(-35, -5, 4, 13).fill(0xa4dbe5)
  } else if (unit.kind === 'shooter' || unit.kind === 'sniper' || unit.kind === 'detonator') {
    body.rect(-3, -2, 14, 6).fill(0xabb9c2)
    body.rect(9, -3, 4, 8).fill(tint)
  } else {
    body.rect(-2, -11, 4, 19).fill(0xffe3b4)
    body.rect(-6, -12, 12, 4).fill(tint)
  }
  if (unit.master) {
    body.rect(-23, -22, 4, 8).fill(0xf9d677)
    body.rect(-17, -24, 4, 10).fill(0xf9d677)
    body.rect(-11, -22, 4, 8).fill(0xf9d677)
  }
  const name = label(unit.master ? 'MASTER' : CATALOG[unit.kind].name.toUpperCase().slice(0, 8), 7, tint)
  name.position.set(8, -14)
  const hp = label(`♥${Math.max(0, unit.hp)}/${unit.maxHp}`, 8, unit.hp <= 1 ? 0xff8585 : 0xece4d6)
  hp.position.set(8, -1)
  const atk = label(`⚔${unit.attack}  ◎${unit.range}`, 8, 0xbfc5d0)
  atk.position.set(8, 10)
  const source = gifSources.get(unit.kind)
  if (source) {
    body.destroy()
    const animation = new GifSprite({ source, autoPlay: true, loop: true })
    animation.position.set(-35, -18)
    animation.width = 33
    animation.height = 33
    sprite.addChild(plate, shadow, animation, name, hp, atk)
  } else sprite.addChild(plate, shadow, body, name, hp, atk)
  if (unit.frozenRound === store.game.round) {
    const ice = new Graphics()
    ice.rect(-39, -20, 78, 40).fill({ color: 0x93ebff, alpha: .25 })
    ice.rect(-39, -20, 78, 40).stroke({ color: 0xa5f1ff, alpha: .85, width: 1 })
    sprite.addChild(ice)
  }
}

function burst(at: Cell, hex: number, count = 12): void {
  const { x, y } = pos(at)
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + Math.random() * .3
    const speed = 1.3 + Math.random() * 2.4
    const graphic = new Graphics().rect(-2, -2, 4, 4).fill(hex)
    graphic.position.set(x, y)
    fxLayer.addChild(graphic)
    particles.push({ graphic, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 })
  }
}

function renderHighlights(): void {
  highlightLayer.clear()
  if (store.game.phase !== 'placement' || store.busy) return
  for (const { row, col } of store.validCells) {
    const x = X + col * CW + 3, y = Y + row * CH + 3
    highlightLayer.rect(x, y, CW - 6, CH - 6).fill({ color: 0x51e8e5, alpha: .13 })
    highlightLayer.rect(x, y, CW - 6, CH - 6).stroke({ color: 0x60faea, alpha: .78, width: 2 })
    highlightLayer.rect(x + 6, y + 6, 8, 2).fill(0xb1fff8)
  }
}

function renderUnits(event: GameEvent | null): void {
  const current = new Set(store.game.units.map(unit => unit.id))
  for (const unit of store.game.units) {
    let sprite = sprites.get(unit.id)
    if (!sprite) {
      sprite = new Container()
      const p = pos(unit)
      sprite.position.set(p.x, p.y)
      sprite.scale.set(Math.min(1, CH / 55))
      unitLayer.addChild(sprite)
      sprites.set(unit.id, sprite)
    }
    const data = `${unit.hp}/${unit.maxHp}/${unit.attack}/${unit.faceDown}/${unit.frozenRound}/${gifSources.has(unit.kind)}`
    if (spriteData.get(unit.id) !== data) { paintUnit(sprite, unit); spriteData.set(unit.id, data) }
    if (event?.type === 'move' && event.unitId === unit.id) {
      tweens.set(unit.id, { from: event.from, to: event.to, elapsed: 0, duration: 245 })
    } else if (!tweens.has(unit.id)) {
      const p = pos(unit)
      sprite.position.set(p.x, p.y)
    }
  }
  for (const [id, sprite] of sprites) {
    if (current.has(id)) continue
    if (event?.type === 'death' && event.unitId === id) fades.set(id, 1)
    else if (event?.type === 'score' && event.unitId === id) fades.set(id, .65)
    else if (!fades.has(id)) { destroyDisplayTree(sprite); sprites.delete(id); spriteData.delete(id) }
  }
  if (!event) return
  if (event.type === 'attack') { burst(event.to, 0xffe095, 7); shake = Math.max(shake, 5); flash = .24 }
  if (event.type === 'damage') { burst(event.at, 0xff8468, 10); shake = Math.max(shake, 4) }
  if (event.type === 'death') { burst(event.at, event.owner === 'player' ? 0x66e2f3 : 0xff708b, 16); shake = Math.max(shake, 7) }
  if (event.type === 'score') { burst(event.at, 0xffd66b, 23); shake = 11; flash = .6 }
  if (event.type === 'master') { const unit = store.game.units.find(u => u.id === event.unitId); if (unit) burst(unit, 0xffd66b, 20) }
  if (event.type === 'freeze') { const unit = store.game.units.find(u => u.id === event.unitId); if (unit) burst(unit, 0x9aeaff, 8) }
}

function tick(deltaMS: number): void {
  const delta = Math.min(deltaMS, 40)
  tickTime += delta
  scanline.clear().rect(0, (tickTime * .027) % H, W, 2).fill({ color: 0xaadcef, alpha: .06 })
  if (shake > .05) {
    board.position.set((Math.random() - .5) * shake, (Math.random() - .5) * shake)
    shake *= .82
  } else board.position.set(0)
  flash *= .85
  board.alpha = 1 - flash * .18
  for (const [id, tween] of tweens) {
    const sprite = sprites.get(id)
    if (!sprite) { tweens.delete(id); continue }
    tween.elapsed += delta
    const t = Math.min(1, tween.elapsed / tween.duration)
    const eased = 1 - (1 - t) ** 3
    const a = pos(tween.from), b = pos(tween.to)
    sprite.position.set(a.x + (b.x - a.x) * eased, a.y + (b.y - a.y) * eased - Math.sin(t * Math.PI) * 8)
    if (t >= 1) tweens.delete(id)
  }
  for (const [id, opacity] of fades) {
    const sprite = sprites.get(id)
    if (!sprite) { fades.delete(id); continue }
    sprite.alpha = opacity
    sprite.scale.set(Math.min(1, CH / 55) * (1 + (1 - opacity) * .3))
    if (opacity <= 0) {
      destroyDisplayTree(sprite); sprites.delete(id); spriteData.delete(id); fades.delete(id)
    } else fades.set(id, opacity - delta / 245)
  }
  for (const item of [...particles]) {
    item.graphic.x += item.vx * delta / 16
    item.graphic.y += item.vy * delta / 16
    item.vy += .045 * delta / 16
    item.life -= delta / 360
    item.graphic.alpha = Math.max(0, item.life)
    if (item.life <= 0) {
      item.graphic.destroy()
      particles.splice(particles.indexOf(item), 1)
    }
  }
  // The actors have a small independent idle motion even while the store is static.
  for (const [id, sprite] of sprites) if (!tweens.has(id) && !fades.has(id)) {
    sprite.y = pos(store.game.units.find(unit => unit.id === id) ?? { row: 0, col: 0 }).y + Math.sin(tickTime * .006 + id.length) * 1.4
  }
}

onMounted(async () => {
  if (!holder.value) return
  H = Math.max(300, Math.round(W * holder.value.clientHeight / holder.value.clientWidth))
  CH = (H - 50) / 10
  await app.init({ width: W, height: H, preference: 'webgl', antialias: false,
    background: 0x0d1423, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true })
  if (!holder.value) { app.destroy(true); return }
  mounted = true
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.display = 'block'
  holder.value.appendChild(app.canvas)
  drawArena()
  renderUnits(null)
  renderHighlights()
  app.ticker.maxFPS = 60
  app.ticker.add(ticker => tick(ticker.deltaMS))
  void Promise.all((Object.keys(CATALOG) as UnitKind[]).map(async kind => {
    try {
      const response = await fetch(assetUrl(`gifs/${kind}.gif`))
      if (!response.ok) return
      const source = GifSource.from(await response.arrayBuffer(), { scaleMode: 'nearest' })
      if (!mounted) { source.destroy(); return }
      gifSources.set(kind, source)
    } catch { /* Procedural Pixi actor stays available if an asset is missing. */ }
  })).then(() => { if (mounted) renderUnits(null) })
  resizeObserver = new ResizeObserver(() => {
    if (!holder.value || !mounted || holder.value.clientWidth === 0) return
    const nextH = Math.max(300, Math.round(W * holder.value.clientHeight / holder.value.clientWidth))
    if (Math.abs(nextH - H) < 2) return
    H = nextH
    CH = (H - 50) / 10
    app.renderer.resize(W, H)
    drawArena()
    for (const [id, sprite] of sprites) {
      sprite.scale.set(Math.min(1, CH / 55))
      const unit = store.game.units.find(candidate => candidate.id === id)
      if (unit) { const p = pos(unit); sprite.position.set(p.x, p.y) }
    }
    renderHighlights()
  })
  resizeObserver.observe(holder.value)
})
watch(() => store.eventVersion, () => { if (mounted) { renderUnits(store.currentEvent); renderHighlights() } }, { flush: 'post' })
watch(() => store.game.selection, () => { if (mounted) renderHighlights() }, { flush: 'post' })
watch(() => store.game.phase, () => { if (mounted) renderHighlights() }, { flush: 'post' })
watch(() => store.game.matchId, () => {
  if (!mounted) return
  for (const sprite of sprites.values()) destroyDisplayTree(sprite)
  sprites.clear(); spriteData.clear(); tweens.clear(); fades.clear()
  renderUnits(null)
}, { flush: 'post' })
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (mounted) {
    destroyDisplayChildren(app.stage)
    app.destroy(true)
  }
  mounted = false
  for (const source of gifSources.values()) source.destroy()
  gifSources.clear()
})
</script>

<template><div ref="holder" class="canvas-holder" role="img" aria-label="Plateau de Gif Wars : trois colonnes, cinq lignes par camp" @pointermove="hoverCell" @pointerleave="emit('leave')" /></template>
