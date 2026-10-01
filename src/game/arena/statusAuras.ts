/**
 * Persistent visual effects attached to a fighter while a status lasts.
 * Every aura is drawn around a frame of size `width` × `height` centred on (0, 0).
 */
import { Container, Graphics, Text, type Ticker } from 'pixi.js'
import { STATUS_INFO } from '@/config/statusInfo'
import type { StatusEffectKind } from '@/types'
import { INK } from './effects'

export class StatusAura extends Container {
  private elapsed = 0
  private readonly update: (ticker: Ticker) => void

  constructor(
    readonly effect: StatusEffectKind,
    private readonly ticker: Ticker,
    width: number,
    height: number,
    animate: boolean,
  ) {
    super()
    const color = STATUS_INFO[effect].color
    const animateFrame =
      effect === 'Lag'
        ? this.buildLag(width, height, color)
        : effect === 'BadBuzz'
          ? this.buildBadBuzz(width, height, color)
          : this.buildBoucle(width, height, color)
    this.update = (t) => {
      this.elapsed += t.deltaMS / 1000
      animateFrame(this.elapsed)
    }
    if (animate) ticker.add(this.update)
    else animateFrame(0)
  }

  override destroy(): void {
    this.ticker.remove(this.update)
    super.destroy({ children: true })
  }

  /** Lag / Buffering: loading spinner in the corner + periodic glitch slices over the GIF. */
  private buildLag(w: number, h: number, color: string) {
    const r = Math.max(10, w * 0.09)
    const spinner = new Container()
    spinner.position.set(w / 2 - r * 0.6, -h / 2 + r * 0.6)
    const disc = new Graphics().circle(0, 0, r).fill('#FFFFFF').stroke({ width: 3, color: INK })
    const arc = new Graphics()
      .arc(0, 0, r * 0.62, 0, Math.PI * 1.4)
      .stroke({ width: r * 0.28, color, cap: 'round' })
    spinner.addChild(disc, arc)

    const glitch = new Graphics()
    this.addChild(glitch, spinner)

    return (time: number) => {
      arc.rotation = time * 7
      // Short glitch every ~1.3 s.
      const phase = time % 1.3
      glitch.clear()
      if (phase < 0.14) {
        for (let i = 0; i < 4; i++) {
          const y = -h / 2 + Math.random() * h
          const sliceH = h * (0.03 + Math.random() * 0.07)
          const offset = (Math.random() - 0.5) * w * 0.12
          glitch
            .rect(-w / 2 + offset, y, w, sliceH)
            .fill({ color: i % 2 ? '#00E5FF' : '#FF00C8', alpha: 0.45 })
        }
      }
    }
  }

  /** Bad Buzz: little storm cloud raining over the GIF, with thumbs down. */
  private buildBadBuzz(w: number, h: number, color: string) {
    const cloud = new Container()
    cloud.position.set(w * 0.18, -h / 2 - h * 0.12)
    const puff = w * 0.09
    const body = new Graphics()
    for (const [x, y, r] of [
      [-1.3, 0.3, 0.9],
      [-0.4, -0.3, 1.2],
      [0.7, -0.1, 1.05],
      [1.5, 0.35, 0.8],
    ] as const) {
      body.circle(x * puff, y * puff, r * puff)
    }
    body.fill('#78909C').stroke({ width: 3, color: INK })
    const bolt = new Graphics()
      .poly([
        0,
        0,
        puff * 0.5,
        0,
        0.1 * puff,
        puff * 0.8,
        puff * 0.6,
        puff * 0.8,
        -0.2 * puff,
        puff * 2,
      ])
      .fill('#FFE81F')
      .stroke({ width: 2, color: INK })
    bolt.position.set(-puff * 0.2, puff * 0.6)
    const rain = new Graphics()
    const thumb = new Text({ text: '👎', style: { fontSize: puff * 1.6 } })
    thumb.anchor.set(0.5)
    thumb.position.set(-w * 0.42, -h * 0.5)
    cloud.addChild(rain, body, bolt)
    this.addChild(cloud, thumb)

    return (time: number) => {
      cloud.y = -h / 2 - h * 0.12 + Math.sin(time * 2) * 3
      bolt.visible = time % 2.2 < 0.12
      thumb.y = -h * 0.5 + Math.sin(time * 3) * 4
      thumb.rotation = Math.sin(time * 2.5) * 0.25
      rain.clear()
      for (let i = 0; i < 6; i++) {
        const x = (-1.5 + i * 0.6) * puff
        const y = puff * 0.9 + ((time * 160 + i * 23) % (h * 0.35))
        rain.moveTo(x, y).lineTo(x - 3, y + puff * 0.5)
      }
      rain.stroke({ width: 2.5, color, alpha: 0.9 })
    }
  }

  /** Boucle: spinning spiral and dots orbiting the GIF, like a looping animation. */
  private buildBoucle(w: number, h: number, color: string) {
    const r = Math.max(12, w * 0.12)
    const spiral = new Graphics()
    const turns = 2.5
    for (let i = 0; i <= 60; i++) {
      const t = i / 60
      const angle = t * turns * Math.PI * 2
      const radius = r * t
      if (i === 0) spiral.moveTo(0, 0)
      else spiral.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    }
    spiral.stroke({ width: Math.max(2.5, r * 0.16), color, cap: 'round' })
    const badge = new Container()
    badge.position.set(-w / 2 + r * 0.4, -h / 2 + r * 0.4)
    badge.addChild(
      new Graphics()
        .circle(0, 0, r * 1.15)
        .fill('#FFFFFF')
        .stroke({ width: 3, color: INK }),
      spiral,
    )
    const orbit = new Graphics()
    this.addChild(orbit, badge)

    return (time: number) => {
      spiral.rotation = -time * 5
      orbit.clear()
      for (let i = 0; i < 3; i++) {
        const angle = time * 2.4 + (i * Math.PI * 2) / 3
        orbit
          .circle(Math.cos(angle) * w * 0.56, Math.sin(angle) * h * 0.58, Math.max(4, w * 0.025))
          .fill(color)
          .stroke({ width: 2, color: INK })
      }
    }
  }
}
