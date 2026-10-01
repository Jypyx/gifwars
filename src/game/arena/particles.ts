import { Container, Graphics, type Ticker } from 'pixi.js'

type Range = readonly [min: number, max: number]

export interface ParticleOptions {
  x: number
  y: number
  count: number
  colors: readonly string[]
  /** Initial speed in px/s. */
  speed: Range
  /** Emission angle in radians (0 = right, -π/2 = up). Defaults to every direction. */
  angle?: Range
  /** Downward acceleration in px/s². */
  gravity?: number
  /** Lifetime in ms. */
  life: Range
  size: Range
  shape?: 'circle' | 'star' | 'rect' | 'spark'
  /** Spawn area around (x, y), for rain / confetti. */
  spread?: { x: number; y: number }
  /** Shrink while fading out. */
  shrink?: boolean
}

const between = ([min, max]: Range) => min + Math.random() * (max - min)
const pickColor = (colors: readonly string[]) => colors[Math.floor(Math.random() * colors.length)]!

function drawParticle(shape: NonNullable<ParticleOptions['shape']>, size: number, color: string) {
  const g = new Graphics()
  switch (shape) {
    case 'circle':
      return g.circle(0, 0, size).fill(color)
    case 'star':
      return g
        .star(0, 0, 5, size, size * 0.45)
        .fill(color)
        .stroke({ width: 1.5, color: '#111' })
    case 'rect':
      return g.rect(-size, -size * 0.5, size * 2, size).fill(color)
    case 'spark':
      // Elongated shard pointing along its velocity (rotated by the emitter).
      return g.poly([-size * 2, 0, 0, -size * 0.45, size * 2, 0, 0, size * 0.45]).fill(color)
  }
}

/** Fire-and-forget particle burst. Resolves once every particle has faded out. */
export function emitParticles(layer: Container, ticker: Ticker, options: ParticleOptions) {
  const { shape = 'circle', gravity = 0, angle = [0, Math.PI * 2], spread, shrink = true } = options
  const group = new Container()
  layer.addChild(group)

  const particles = Array.from({ length: options.count }, () => {
    const direction = between(angle)
    const speed = between(options.speed)
    const sprite = drawParticle(shape, between(options.size), pickColor(options.colors))
    sprite.position.set(
      options.x + (spread ? (Math.random() - 0.5) * spread.x : 0),
      options.y + (spread ? (Math.random() - 0.5) * spread.y : 0),
    )
    sprite.rotation = shape === 'spark' ? direction : Math.random() * Math.PI * 2
    group.addChild(sprite)
    return {
      sprite,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      spin: shape === 'rect' || shape === 'star' ? (Math.random() - 0.5) * 12 : 0,
      life: between(options.life),
      age: 0,
    }
  })

  return new Promise<void>((resolve) => {
    const step = (t: Ticker) => {
      const dt = t.deltaMS / 1000
      let alive = 0
      for (const p of particles) {
        if (p.age >= p.life) continue
        p.age += t.deltaMS
        p.vy += gravity * dt
        p.sprite.x += p.vx * dt
        p.sprite.y += p.vy * dt
        p.sprite.rotation += p.spin * dt
        const progress = Math.min(1, p.age / p.life)
        p.sprite.alpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4
        if (shrink) p.sprite.scale.set(1 - progress * 0.6)
        if (p.age < p.life) alive++
        else p.sprite.visible = false
      }
      if (alive === 0) {
        ticker.remove(step)
        group.destroy({ children: true })
        resolve()
      }
    }
    ticker.add(step)
  })
}

const CONFETTI = ['#E53935', '#1E88E5', '#43A047', '#FFE81F', '#AB47BC', '#FFFFFF']

/** Confetti raining over the whole arena (victory). */
export function confetti(layer: Container, ticker: Ticker, width: number) {
  return emitParticles(layer, ticker, {
    x: width / 2,
    y: -20,
    spread: { x: width, y: 40 },
    count: 70,
    colors: CONFETTI,
    speed: [60, 220],
    angle: [Math.PI * 0.3, Math.PI * 0.7],
    gravity: 260,
    life: [1800, 3200],
    size: [4, 8],
    shape: 'rect',
    shrink: false,
  })
}
