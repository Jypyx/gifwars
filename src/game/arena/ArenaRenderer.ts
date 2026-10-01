/**
 * PixiJS battle arena. It does not know the rules: it only replays `BattleLogEntry`s
 * coming from the store as comic-style animations.
 */
import { Application, Assets, Container, type Text, type Ticker } from 'pixi.js'
import 'pixi.js/gif'
import type { SoundName } from '@/audio/sfx'
import { STATUS_INFO } from '@/config/statusInfo'
import { SYNERGIES } from '@/data/synergies'
import type { AttackType, BattleLogEntry, GifCard, PlayerId } from '@/types'
import { createVsLabel, floatText, popBurst } from './effects'
import { Fighter } from './Fighter'
import { wait } from './tween'

export interface ArenaOptions {
  reducedMotion: boolean
  /** Finds a GIF of the current match and the side it belongs to. */
  findGif: (gifId: string) => { gif: GifCard; side: PlayerId } | undefined
  playerColors: Record<PlayerId, string>
  /** Called at the exact moment of each animation beat, to keep sounds in sync. */
  onCue?: (sound: SoundName) => void
}

const IMPACT_SOUNDS: Record<AttackType, SoundName> = {
  Physique: 'punch',
  Magique: 'zap',
  Spéciale: 'boom',
}

const SIDES: readonly PlayerId[] = ['player1', 'player2']

/**
 * Portrait layout, as fractions of the arena size. The top ~15% and bottom ~20% are left
 * to the HUD (status boxes, buttons, dialog box).
 */
const LAYOUT = {
  player1: { x: 0.3, y: 0.57 },
  player2: { x: 0.68, y: 0.31 },
  /** Matches `--burst-center-y`: the VS sits right on the backdrop's sunburst center. */
  center: { x: 0.5, y: 0.42 },
  fighterWidth: (width: number, height: number) => Math.min(width * 0.48, height * 0.3 * (4 / 3)),
}

export class ArenaRenderer {
  private readonly vs: Text = createVsLabel()
  private readonly fighterLayer = new Container()
  private readonly fx = new Container()
  private readonly fighters: Record<PlayerId, Fighter> = {
    player1: new Fighter(),
    player2: new Fighter(),
  }
  /** Synergy bursts already shown, so a synergy healing two members only pops once per turn. */
  private readonly shownSynergies = new Set<string>()
  private width = 0
  private height = 0
  private elapsed = 0
  private destroyed = false

  private constructor(
    private readonly app: Application,
    private readonly options: ArenaOptions,
  ) {
    this.fighterLayer.addChild(this.fighters.player1.root, this.fighters.player2.root)
    // Transparent stage: the sunburst behind the whole window shows through.
    app.stage.addChild(this.fighterLayer, this.vs, this.fx)
    if (!options.reducedMotion) app.ticker.add(this.bob)
  }

  static async create(host: HTMLElement, options: ArenaOptions): Promise<ArenaRenderer> {
    const app = new Application()
    await app.init({
      width: host.clientWidth || 320,
      height: host.clientHeight || 200,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
    try {
      await document.fonts.load('40px Bangers')
    } catch {
      // Fallback fonts are fine.
    }
    host.appendChild(app.canvas)
    const renderer = new ArenaRenderer(app, options)
    renderer.resize(host.clientWidth || 320, host.clientHeight || 200)
    return renderer
  }

  private get ticker(): Ticker {
    return this.app.ticker
  }

  async setFighter(side: PlayerId, gif: GifCard): Promise<void> {
    await this.fighters[side].setGif(gif)
  }

  /** Loads the other team members in the background so switches are instant. */
  preload(gifs: readonly GifCard[]): void {
    void Assets.backgroundLoad(gifs.map((gif) => gif.gifUrl))
  }

  resize(width: number, height: number): void {
    if (this.destroyed || width === 0 || height === 0) return
    this.width = width
    this.height = height
    this.app.renderer.resize(width, height)
    const center = { x: width * LAYOUT.center.x, y: height * LAYOUT.center.y }
    this.vs.position.set(center.x, center.y)
    this.vs.scale.set(Math.max(0.5, Math.min(1, width / 500)))

    const fighterW = LAYOUT.fighterWidth(width, height)
    for (const side of SIDES) {
      const { x, y } = this.slot(side)
      this.fighters[side].root.position.set(x, y)
      this.fighters[side].root.rotation = side === 'player1' ? -0.03 : 0.03
      this.fighters[side].layout(fighterW, fighterW * 0.75)
    }
  }

  async play(entry: BattleLogEntry): Promise<void> {
    if (this.destroyed) return
    const { event } = entry
    const ticker = this.ticker
    const motion = !this.options.reducedMotion

    switch (event.kind) {
      case 'attack': {
        const attacker = this.sideOf(event.attackerId)
        const target = this.sideOf(event.targetId)
        if (!attacker || !target) return
        const from = this.slot(attacker)
        const to = this.slot(target)
        const type =
          this.options.findGif(event.attackerId)?.gif.attacks.find((a) => a.id === event.attackId)
            ?.type ?? 'Physique'
        this.cue('whoosh')
        if (motion)
          await this.fighters[attacker].lunge(
            ticker,
            (to.x - from.x) * 0.25,
            (to.y - from.y) * 0.25,
          )
        this.cue(IMPACT_SOUNDS[type])
        await Promise.all([
          motion ? this.fighters[target].hit(ticker) : Promise.resolve(),
          this.burstAt(target, entry.onomatopoeia ?? 'BAM !'),
          this.floatAt(target, `-${event.damage}`, '#E53935'),
        ])
        return
      }
      case 'miss': {
        const side = this.sideOf(event.attackerId)
        if (!side) return
        this.cue('boing')
        await Promise.all([
          motion ? this.fighters[side].wobble(ticker) : Promise.resolve(),
          this.burstAt(side, entry.onomatopoeia ?? 'OUPS !', { fill: '#B2DFDB' }),
          this.floatAt(side, `-${event.selfDamage}`, '#E53935'),
        ])
        return
      }
      case 'turnSkipped': {
        const side = this.sideOf(event.gifId)
        if (!side) return
        this.cue('glitch')
        await Promise.all([
          this.fighters[side].flicker(ticker),
          this.burstAt(side, entry.onomatopoeia ?? 'BUFFERING…', {
            fill: '#E1BEE7',
            textColor: STATUS_INFO.Lag.color,
          }),
        ])
        return
      }
      case 'statusApplied': {
        const side = this.sideOf(event.targetId)
        if (!side) return
        const info = STATUS_INFO[event.effect]
        this.cue('status')
        await this.burstAt(side, `${info.label.toUpperCase()} !`, {
          fill: '#FFFFFF',
          textColor: info.color,
          scale: 0.7,
          offsetY: -0.35,
        })
        return
      }
      case 'statusTick': {
        const side = this.sideOf(event.targetId)
        if (!side) return
        this.cue('drain')
        await Promise.all([
          motion ? this.fighters[side].hit(ticker, 5) : Promise.resolve(),
          this.floatAt(side, `-${event.damage}`, STATUS_INFO[event.effect].color),
        ])
        return
      }
      case 'timeout': {
        const side = this.sideOf(event.gifId)
        this.cue('buzzer')
        if (side)
          await this.burstAt(side, entry.onomatopoeia ?? 'TIC TAC !', {
            fill: '#FFFFFF',
            scale: 0.7,
          })
        return
      }
      case 'switch': {
        const side = this.sideOf(event.toId)
        const next = this.options.findGif(event.toId)
        if (!side || !next) return
        await this.swapFighter(side, next.gif, entry.onomatopoeia ?? 'SWITCH !')
        return
      }
      case 'replacement': {
        const side = this.sideOf(event.gifId)
        const next = this.options.findGif(event.gifId)
        if (!side || !next) return
        await this.swapFighter(side, next.gif, entry.onomatopoeia ?? 'À TOI !', false)
        return
      }
      case 'ko': {
        const side = this.sideOf(event.gifId)
        if (!side) return
        this.cue('ko')
        await Promise.all([
          this.fighters[side].knockOut(ticker, side === 'player1' ? -1 : 1),
          this.burstAt(side, entry.onomatopoeia ?? 'K.O. !', {
            fill: '#E53935',
            textColor: '#FFE81F',
            scale: 1.3,
          }),
        ])
        return
      }
      case 'synergyHeal': {
        const side = this.sideOf(event.gifId)
        if (!side) return
        const key = `${entry.turn}:${event.synergyId}`
        const synergy = SYNERGIES.find((s) => s.id === event.synergyId)
        const jobs = [this.floatAt(side, `+${event.amount}`, '#43A047')]
        if (synergy && !this.shownSynergies.has(key)) {
          this.shownSynergies.add(key)
          this.cue('heal')
          jobs.push(
            this.burstAt(side, synergy.onomatopoeia, {
              fill: '#C8E6C9',
              textColor: '#2E7D32',
              scale: 0.75,
              offsetY: 0.45,
            }),
          )
        }
        await Promise.all(jobs)
        return
      }
      case 'victory': {
        const size = Math.max(40, Math.min(96, this.width * 0.12))
        this.cue('victory')
        await popBurst(
          this.fx,
          ticker,
          entry.onomatopoeia ?? 'VICTOIRE !',
          this.width * LAYOUT.center.x,
          this.height * LAYOUT.center.y,
          {
            fill: '#FFE81F',
            textColor: this.options.playerColors[event.winnerId],
            fontSize: size,
            persist: true,
          },
        )
        return
      }
      case 'statusExpired':
        return
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.ticker.remove(this.bob)
    for (const side of SIDES) this.fighters[side].destroy()
    this.app.destroy({ removeView: true }, { children: true })
  }

  // --- Helpers ---------------------------------------------------------------

  private readonly bob = (ticker: Ticker) => {
    this.elapsed += ticker.deltaMS / 1000
    this.fighters.player1.setIdleOffset(Math.sin(this.elapsed * 2.2) * 3)
    this.fighters.player2.setIdleOffset(Math.sin(this.elapsed * 2.2 + Math.PI) * 3)
  }

  private cue(sound: SoundName): void {
    if (!this.destroyed) this.options.onCue?.(sound)
  }

  private sideOf(gifId: string): PlayerId | undefined {
    return this.options.findGif(gifId)?.side
  }

  /** Player bottom-left, AI top-right, like in Pokémon. */
  private slot(side: PlayerId) {
    return { x: this.width * LAYOUT[side].x, y: this.height * LAYOUT[side].y }
  }

  private baseFontSize(): number {
    return Math.max(22, Math.min(52, this.fighters.player1.size.width * 0.2))
  }

  private burstAt(
    side: PlayerId,
    text: string,
    options: { fill?: string; textColor?: string; scale?: number; offsetY?: number } = {},
  ): Promise<void> {
    const { x, y } = this.slot(side)
    const { height } = this.fighters[side].size
    return popBurst(this.fx, this.ticker, text, x, y + height * (options.offsetY ?? -0.1), {
      fill: options.fill,
      textColor: options.textColor,
      fontSize: this.baseFontSize() * (options.scale ?? 1),
    })
  }

  private floatAt(side: PlayerId, text: string, color: string): Promise<void> {
    const { x, y } = this.slot(side)
    const { width, height } = this.fighters[side].size
    const dx = side === 'player1' ? width * 0.35 : -width * 0.35
    return floatText(
      this.fx,
      this.ticker,
      text,
      x + dx,
      y - height * 0.35,
      color,
      this.baseFontSize() * 0.8,
    )
  }

  private async swapFighter(
    side: PlayerId,
    gif: GifCard,
    text: string,
    slideOut = true,
  ): Promise<void> {
    const fighter = this.fighters[side]
    const offscreen = side === 'player1' ? -this.width * 0.4 : this.width * 0.4
    const motion = !this.options.reducedMotion
    if (slideOut) this.cue('switch')
    if (slideOut && motion) await fighter.slideOut(this.ticker, offscreen)
    await fighter.setGif(gif)
    if (!motion) fighter.resetPose()
    this.cue('enter')
    await Promise.all([
      motion ? fighter.slideIn(this.ticker, offscreen) : Promise.resolve(),
      this.burstAt(side, text, {
        fill: '#FFFFFF',
        textColor: this.options.playerColors[side],
        scale: 0.8,
      }),
    ])
    await wait(this.ticker, 80)
  }
}
