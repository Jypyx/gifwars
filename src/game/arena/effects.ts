import { Container, Graphics, Text, type Ticker } from 'pixi.js'
import { easeInCubic, easeOutBack, easeOutCubic, lerp, linear, tween, wait } from './tween'

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

/** Damage / heal number: pops in with an overshoot, then floats upwards. */
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
      stroke: { color: INK, width: Math.max(4, fontSize * 0.14), join: 'round' },
      dropShadow: { color: INK, distance: fontSize * 0.08, angle: Math.PI / 4, blur: 0, alpha: 1 },
    },
  })
  label.anchor.set(0.5)
  label.position.set(x, y)
  label.rotation = (Math.random() - 0.5) * 0.35
  label.scale.set(0.3)
  layer.addChild(label)

  await tween(ticker, 180, (t) => label.scale.set(lerp(0.3, 1.25, t)), easeOutBack)
  await tween(
    ticker,
    750,
    (t) => {
      label.scale.set(lerp(1.25, 1, Math.min(1, t * 3)))
      label.y = y - t * fontSize * 1.6
      label.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    },
    easeOutCubic,
  )
  label.destroy()
}

/** Shakes `target` (the whole scene) with a decaying random offset. */
export async function shake(
  ticker: Ticker,
  target: Container,
  intensity: number,
  durationMs: number,
): Promise<void> {
  await tween(
    ticker,
    durationMs,
    (t) => {
      const force = intensity * (1 - t)
      target.position.set((Math.random() - 0.5) * 2 * force, (Math.random() - 0.5) * 2 * force)
    },
    linear,
  )
  target.position.set(0, 0)
}

/** Full-screen flash (special attacks). */
export async function flash(
  ticker: Ticker,
  layer: Container,
  width: number,
  height: number,
  color = '#FFFFFF',
  peak = 0.85,
  durationMs = 280,
): Promise<void> {
  const overlay = new Graphics().rect(0, 0, width, height).fill(color)
  overlay.alpha = peak
  layer.addChild(overlay)
  await tween(ticker, durationMs, (t) => (overlay.alpha = peak * (1 - t)), easeInCubic)
  overlay.destroy()
}

/** Expanding shockwave ring on impact. */
export async function impactRing(
  ticker: Ticker,
  layer: Container,
  x: number,
  y: number,
  radius: number,
  color: string,
): Promise<void> {
  const ring = new Graphics()
  ring.position.set(x, y)
  layer.addChild(ring)
  await tween(ticker, 320, (t) => {
    ring
      .clear()
      .circle(0, 0, radius * (0.2 + t))
      .stroke({ width: Math.max(1, 10 * (1 - t)), color, alpha: 1 - t })
  })
  ring.destroy()
}

/** Manga "focus lines": thin black rays converging on (cx, cy), leaving a clear centre. */
export function createFocusLines(
  width: number,
  height: number,
  cx: number,
  cy: number,
  hole: number,
): Graphics {
  const g = new Graphics()
  const outer = Math.hypot(width, height)
  const rays = 64
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.05
    const spread = 0.008 + Math.random() * 0.018
    const inner = hole * (1 + Math.random() * 0.6)
    g.poly([
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      cx + Math.cos(angle - spread) * outer,
      cy + Math.sin(angle - spread) * outer,
      cx + Math.cos(angle + spread) * outer,
      cy + Math.sin(angle + spread) * outer,
    ]).fill({ color: INK, alpha: 0.85 })
  }
  return g
}

/**
 * Comic caption strip sweeping across the screen (special attack name): slides in,
 * holds, slides out.
 */
export async function sweepBanner(
  ticker: Ticker,
  layer: Container,
  text: string,
  width: number,
  y: number,
  options: { fill?: string; textColor?: string; fontSize?: number; holdMs?: number } = {},
): Promise<void> {
  const { fill = '#FFE81F', textColor = INK, fontSize = 36, holdMs = 550 } = options
  const banner = new Container()
  const label = new Text({
    text,
    style: {
      fontFamily: DISPLAY_FONT,
      fontSize,
      fill: textColor,
      letterSpacing: 2,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width * 0.85,
    },
  })
  label.anchor.set(0.5)
  const stripH = label.height + fontSize * 0.7
  const strip = new Graphics()
    .rect(-width * 0.6, -stripH / 2, width * 1.2, stripH)
    .fill(fill)
    .stroke({ width: 5, color: INK })
  banner.addChild(strip, label)
  banner.rotation = -0.06
  banner.position.set(-width, y)
  layer.addChild(banner)

  await tween(ticker, 260, (t) => (banner.x = lerp(-width, width / 2, t)), easeOutBack)
  await wait(ticker, holdMs)
  await tween(ticker, 220, (t) => (banner.x = lerp(width / 2, width * 2, t)), easeInCubic)
  banner.destroy({ children: true })
}

/**
 * Glowing orb travelling along an arc from `from` to `to`, leaving a trail.
 * Resolves on arrival.
 */
export function projectile(
  ticker: Ticker,
  layer: Container,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  radius: number,
  durationMs = 420,
): Promise<void> {
  const orb = new Graphics()
    .circle(0, 0, radius * 1.8)
    .fill({ color, alpha: 0.25 })
    .circle(0, 0, radius * 1.2)
    .fill({ color, alpha: 0.5 })
    .circle(0, 0, radius)
    .fill(color)
    .circle(0, 0, radius * 0.45)
    .fill('#FFFFFF')
  layer.addChild(orb)
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - radius * 6 }
  const trail: Graphics[] = []

  return tween(
    ticker,
    durationMs,
    (t) => {
      const u = 1 - t
      orb.position.set(
        u * u * from.x + 2 * u * t * control.x + t * t * to.x,
        u * u * from.y + 2 * u * t * control.y + t * t * to.y,
      )
      orb.scale.set(1 + Math.sin(t * Math.PI * 6) * 0.12)
      const dot = new Graphics().circle(0, 0, radius * 0.7).fill({ color, alpha: 0.6 })
      dot.position.copyFrom(orb.position)
      layer.addChildAt(dot, 0)
      trail.push(dot)
      for (const d of trail) {
        d.alpha *= 0.9
        d.scale.set(Math.max(0.1, d.scale.x * 0.95))
        if (d.alpha < 0.05) d.visible = false
      }
    },
    easeInCubic,
  ).then(() => {
    orb.destroy()
    for (const d of trail) d.destroy()
  })
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
