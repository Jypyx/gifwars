import { Container, Graphics, Text, type Ticker } from 'pixi.js'
import { easeOutBack, easeOutCubic, lerp, tween, wait } from './tween'

export const INK = '#111111'
export const DISPLAY_FONT = 'Bangers, Impact, sans-serif'

export interface BurstOptions {
  fill?: string
  textColor?: string
  fontSize?: number
  /** Keep the burst on screen instead of fading it out. */
  persist?: boolean
}

/** Comic starburst ("BAM !") with jagged spikes around a bold outlined label. */
export function createBurst(text: string, options: BurstOptions = {}): Container {
  const { fill = '#FFE81F', textColor = '#E53935', fontSize = 40 } = options
  const burst = new Container()

  const label = new Text({
    text,
    style: {
      fontFamily: DISPLAY_FONT,
      fontSize,
      fill: textColor,
      letterSpacing: 2,
      stroke: { color: INK, width: Math.max(3, fontSize * 0.12), join: 'round' },
    },
  })
  label.anchor.set(0.5)

  const rx = label.width / 2 + fontSize * 0.55
  const ry = label.height / 2 + fontSize * 0.45
  const spikes = 14
  const points: number[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes
    const radius = i % 2 === 0 ? 1 + Math.random() * 0.18 : 0.7
    points.push(Math.cos(angle) * rx * radius, Math.sin(angle) * ry * radius)
  }
  const star = new Graphics()
    .poly(points)
    .fill(fill)
    .stroke({ width: Math.max(3, fontSize * 0.1), color: INK, join: 'miter' })

  burst.addChild(star, label)
  burst.rotation = (Math.random() - 0.5) * 0.4
  return burst
}

/** Pops a burst at (x, y): scale-in with overshoot, short hold, fade-out (unless persisted). */
export async function popBurst(
  layer: Container,
  ticker: Ticker,
  text: string,
  x: number,
  y: number,
  options: BurstOptions = {},
): Promise<void> {
  const burst = createBurst(text, options)
  burst.position.set(x, y)
  burst.scale.set(0.2)
  layer.addChild(burst)

  await tween(ticker, 260, (t) => burst.scale.set(lerp(0.2, 1, t)), easeOutBack)
  if (options.persist) return
  await wait(ticker, 380)
  await tween(ticker, 200, (t) => {
    burst.alpha = 1 - t
    burst.scale.set(1 + t * 0.15)
  })
  burst.destroy({ children: true })
}

/** Damage / heal number floating upwards. */
export async function floatText(
  layer: Container,
  ticker: Ticker,
  text: string,
  x: number,
  y: number,
  color: string,
  fontSize = 34,
): Promise<void> {
  const label = new Text({
    text,
    style: {
      fontFamily: DISPLAY_FONT,
      fontSize,
      fill: color,
      stroke: { color: INK, width: 5, join: 'round' },
    },
  })
  label.anchor.set(0.5)
  label.position.set(x, y)
  layer.addChild(label)

  await tween(
    ticker,
    800,
    (t) => {
      label.y = y - t * 50
      label.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    },
    easeOutCubic,
  )
  label.destroy()
}

/** Alternating-ray sunburst background with a "VS" in the middle. */
export function drawBackground(
  g: Graphics,
  width: number,
  height: number,
  center = { x: width / 2, y: height / 2 },
): void {
  g.clear()
  g.rect(0, 0, width, height).fill('#FFD000')

  const { x: cx, y: cy } = center
  const radius = Math.hypot(width, height)
  const rays = 28
  for (let i = 0; i < rays; i += 2) {
    const a1 = (i / rays) * Math.PI * 2
    const a2 = ((i + 1) / rays) * Math.PI * 2
    g.poly([
      cx,
      cy,
      cx + Math.cos(a1) * radius,
      cy + Math.sin(a1) * radius,
      cx + Math.cos(a2) * radius,
      cy + Math.sin(a2) * radius,
    ]).fill('#FFE81F')
  }

  // Halftone dots in the corners for a printed look.
  const step = 12
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      const d = Math.min(Math.hypot(x, y), Math.hypot(width - x, height - y)) / Math.hypot(cx, cy)
      const r = Math.max(0, 3.2 - d * 5)
      if (r > 0.4) g.circle(x, y, r).fill({ color: '#E53935', alpha: 0.35 })
    }
  }
}

export function createVsLabel(): Text {
  const vs = new Text({
    text: 'VS',
    style: {
      fontFamily: DISPLAY_FONT,
      fontSize: 56,
      fill: '#E53935',
      stroke: { color: INK, width: 8, join: 'round' },
      dropShadow: { color: INK, distance: 5, angle: Math.PI / 4, blur: 0, alpha: 1 },
    },
  })
  vs.anchor.set(0.5)
  vs.rotation = -0.12
  return vs
}
