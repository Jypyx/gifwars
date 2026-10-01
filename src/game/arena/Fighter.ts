import { Assets, ColorMatrixFilter, Container, Graphics, Text, type Ticker } from 'pixi.js'
import { GifSprite, type GifSource } from 'pixi.js/gif'
import { UNIVERSES } from '@/data/universes'
import type { GifCard } from '@/types'
import { DISPLAY_FONT, INK } from './effects'
import { easeInCubic, easeOutBack, easeOutCubic, lerp, tween } from './tween'

/** A GIF framed like a comic panel, with its own hit / K.O. / switch animations. */
export class Fighter {
  /** Positioned at the fighter's slot by the renderer. */
  readonly root = new Container()
  /** Idle bobbing, kept separate from action animations. */
  private readonly idle = new Container()
  /** Target of action animations (lunge, shake, K.O.…). */
  private readonly body = new Container()
  private readonly frame = new Graphics()
  private readonly window = new Container()
  private readonly windowMask = new Graphics()
  private readonly flash = new Graphics()
  private readonly plate = new Graphics()
  private readonly plateText = new Text({
    text: '',
    style: { fontFamily: DISPLAY_FONT, fontSize: 20, fill: INK, letterSpacing: 1 },
  })
  private readonly desaturate = new ColorMatrixFilter()
  private content: Container | null = null
  private gif: GifCard | null = null
  private loadToken = 0
  private width = 200
  private height = 150

  constructor() {
    this.desaturate.desaturate()
    this.window.mask = this.windowMask
    this.window.addChild(this.windowMask)
    this.plateText.anchor.set(0.5)
    this.flash.alpha = 0
    this.body.addChild(this.frame, this.window, this.flash, this.plate, this.plateText)
    this.idle.addChild(this.body)
    this.root.addChild(this.idle)
  }

  get size() {
    return { width: this.width, height: this.height }
  }

  layout(width: number, height: number): void {
    this.width = width
    this.height = height
    this.redraw()
    this.fitContent()
  }

  setIdleOffset(y: number): void {
    this.idle.y = y
  }

  /**
   * Swaps the displayed GIF without touching the pose (call `slideIn` or `resetPose` to show it).
   * Resolves once the new GIF (or its fallback) is in place.
   */
  async setGif(gif: GifCard): Promise<void> {
    const token = ++this.loadToken
    this.gif = gif
    this.redraw()

    let next: Container
    try {
      const source = await Assets.load<GifSource>(gif.gifUrl)
      const sprite = new GifSprite({ source, autoPlay: true, loop: true })
      sprite.anchor.set(0.5)
      next = sprite
    } catch {
      const fallback = new Text({
        text: gif.name,
        style: { fontFamily: DISPLAY_FONT, fontSize: 28, fill: '#FFFFFF', align: 'center' },
      })
      fallback.anchor.set(0.5)
      next = fallback
    }

    if (token !== this.loadToken) {
      next.destroy()
      return
    }
    this.content?.destroy()
    this.content = next
    this.window.addChildAt(next, 0)
    this.fitContent()
  }

  // --- Animations ------------------------------------------------------------

  async lunge(ticker: Ticker, dx: number, dy: number): Promise<void> {
    await tween(ticker, 140, (t) => this.body.position.set(dx * t, dy * t), easeInCubic)
    await tween(ticker, 220, (t) => this.body.position.set(dx * (1 - t), dy * (1 - t)))
  }

  async hit(ticker: Ticker, intensity = 12): Promise<void> {
    this.flash.alpha = 0.85
    await tween(ticker, 300, (t) => {
      this.flash.alpha = 0.85 * (1 - t)
      this.body.x = Math.sin(t * 40) * intensity * (1 - t)
    })
    this.body.x = 0
  }

  async wobble(ticker: Ticker): Promise<void> {
    await tween(ticker, 600, (t) => (this.body.rotation = Math.sin(t * 25) * 0.12 * (1 - t)))
    this.body.rotation = 0
  }

  async flicker(ticker: Ticker): Promise<void> {
    await tween(ticker, 700, (t) => (this.body.alpha = Math.floor(t * 10) % 2 === 0 ? 0.35 : 1))
    this.body.alpha = 1
  }

  async knockOut(ticker: Ticker, direction: 1 | -1): Promise<void> {
    this.body.filters = [this.desaturate]
    await tween(
      ticker,
      500,
      (t) => {
        this.body.rotation = direction * 0.35 * t
        this.body.y = 24 * t
        this.body.alpha = lerp(1, 0.45, t)
      },
      easeOutBack,
    )
  }

  async slideOut(ticker: Ticker, dx: number): Promise<void> {
    await tween(
      ticker,
      260,
      (t) => {
        this.body.x = dx * t
        this.body.alpha = 1 - t
      },
      easeInCubic,
    )
  }

  async slideIn(ticker: Ticker, dx: number): Promise<void> {
    this.resetPose()
    this.body.alpha = 0
    await tween(
      ticker,
      320,
      (t) => {
        this.body.x = dx * (1 - t)
        this.body.alpha = t
      },
      easeOutCubic,
    )
  }

  destroy(): void {
    this.loadToken++
    // Detach the GIF first: `destroy({ children: true })` would reach `GifSprite.destroy(destroyData)`
    // with a truthy argument and destroy the GifSource shared through the `Assets` cache.
    this.content?.destroy()
    this.content = null
    this.root.destroy({ children: true })
  }

  resetPose(): void {
    this.body.filters = []
    this.body.position.set(0, 0)
    this.body.rotation = 0
    this.body.alpha = 1
  }

  // --- Internals -------------------------------------------------------------

  private redraw(): void {
    const { width: w, height: h } = this
    const theme = this.gif ? UNIVERSES[this.gif.universe] : null
    const border = Math.max(4, w * 0.025)
    const inset = border + 4

    this.frame
      .clear()
      .rect(-w / 2 + 7, -h / 2 + 7, w, h)
      .fill(INK)
      .rect(-w / 2, -h / 2, w, h)
      .fill(theme?.primary ?? '#FFFFFF')
      .stroke({ width: border, color: INK })

    const innerW = w - inset * 2
    const innerH = h - inset * 2
    this.windowMask
      .clear()
      .rect(-innerW / 2, -innerH / 2, innerW, innerH)
      .fill('#FFFFFF')
    this.flash
      .clear()
      .rect(-w / 2, -h / 2, w, h)
      .fill('#FFFFFF')

    const fontSize = Math.max(14, Math.min(26, w * 0.1))
    this.plateText.style.fontSize = fontSize
    this.plateText.text = this.gif?.name ?? ''
    const plateW = Math.min(w * 0.9, this.plateText.width + fontSize)
    const plateH = fontSize * 1.35
    const plateY = h / 2 - plateH * 0.3
    this.plate
      .clear()
      .rect(-plateW / 2, plateY - plateH / 2, plateW, plateH)
      .fill(theme?.secondary ?? '#FFE81F')
      .stroke({ width: 3, color: INK })
    this.plate.visible = this.plateText.text !== ''
    this.plateText.position.set(0, plateY)
  }

  /** Scales the GIF to cover the frame window. */
  private fitContent(): void {
    if (!this.content) return
    const inset = Math.max(4, this.width * 0.025) + 4
    const innerW = this.width - inset * 2
    const innerH = this.height - inset * 2
    this.content.scale.set(1)
    const scale =
      this.content instanceof GifSprite
        ? Math.max(innerW / this.content.width, innerH / this.content.height)
        : Math.min(1, (innerW * 0.9) / this.content.width)
    this.content.scale.set(scale)
  }
}
