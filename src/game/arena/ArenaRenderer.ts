/**
 * PixiJS battle arena. It does not know the rules: it only replays `BattleLogEntry`s
 * coming from the store as comic-style animations.
 */
import { Application, Assets, Container, Graphics, type Text, type Ticker } from 'pixi.js'
import 'pixi.js/gif'
import type { SoundName } from '@/audio/sfx'
import { STATUS_INFO } from '@/config/statusInfo'
import { SYNERGIES } from '@/data/synergies'
import type { Attack, BattleLogEntry, GifCard, PlayerId } from '@/types'
import type { ArenaContext } from './context'
import {
  createFocusLines,
  createVsLabel,
  flash,
  floatText,
  impactRing,
  popBurst,
  projectile,
  shake,
  sweepBanner,
} from './effects'
import { Fighter } from './Fighter'
import { confetti, emitParticles } from './particles'
import { SYNERGY_ANIMATIONS } from './synergyAnimations'
import { tween, wait } from './tween'

export interface ArenaOptions {
  reducedMotion: boolean
  /** Finds a GIF of the current match and the side it belongs to. */
  findGif: (gifId: string) => { gif: GifCard; side: PlayerId } | undefined
  playerColors: Record<PlayerId, string>
  /** Side of the human player: confetti only rain for their victory. */
  humanSide?: PlayerId
  /** Called at the exact moment of each animation beat, to keep sounds in sync. */
  onCue?: (sound: SoundName) => void
  /** Called when an entry's HP change visually lands (impact, tick, heal). */
  onImpact?: (entry: BattleLogEntry) => void
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

const MAGIC_COLOR = '#42A5F5'
const SPECIAL_COLOR = '#FFD600'

export class ArenaRenderer {
  /** Everything that shakes with the camera. */
  private readonly scene = new Container()
  /** Darkens the arena during special attacks (below the fighters). */
  private readonly dim = new Graphics()
  /** Effects drawn below the fighters (focus lines). */
  private readonly under = new Container()
  private readonly fighterLayer = new Container()
  private readonly vs: Text = createVsLabel()
  private readonly fx = new Container()
  /** Above the camera: flashes, banners. */
  private readonly overlay = new Container()
  private readonly fighters: Record<PlayerId, Fighter> = {
    player1: new Fighter(),
    player2: new Fighter(),
  }
  /** Synergy scenes already shown, so a synergy healing two members only plays once per turn. */
  private readonly shownSynergies = new Set<string>()
  private width = 0
  private height = 0
  private elapsed = 0
  private destroyed = false

  private constructor(
    private readonly app: Application,
    private readonly options: ArenaOptions,
  ) {
    this.dim.alpha = 0
    // Hidden until the intro flies them in (avoids a flash while the GIFs load).
    for (const side of SIDES) this.fighters[side].hide()
    this.fighterLayer.addChild(this.fighters.player1.root, this.fighters.player2.root)
    this.scene.addChild(this.dim, this.under, this.fighterLayer, this.vs, this.fx)
    // Transparent stage: the sunburst behind the whole window shows through.
    app.stage.addChild(this.scene, this.overlay)
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

  private get motion(): boolean {
    return !this.options.reducedMotion
  }

  async setFighter(side: PlayerId, gif: GifCard): Promise<void> {
    await this.fighters[side].setGif(gif)
    this.fighters[side].setStatus(gif.status?.effect ?? null, this.ticker, this.motion)
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
    const center = this.center()
    this.vs.position.set(center.x, center.y)
    this.vs.scale.set(Math.max(0.5, Math.min(1, width / 500)))
    this.dim
      .clear()
      .rect(-50, -50, width + 100, height + 100)
      .fill('#0D0D26')

    const fighterW = LAYOUT.fighterWidth(width, height)
    for (const side of SIDES) {
      const { x, y } = this.slot(side)
      this.fighters[side].root.position.set(x, y)
      this.fighters[side].root.rotation = side === 'player1' ? -0.03 : 0.03
      this.fighters[side].layout(fighterW, fighterW * 0.75)
    }
  }

  /** Match intro: both fighters fly in, then a big "FIGHT !". */
  async playIntro(): Promise<void> {
    if (this.destroyed) return
    await wait(this.ticker, 150)
    this.cue('enter')
    await this.fighters.player2.enter(this.ticker, this.width * 0.6, -this.height * 0.2)
    this.cue('enter')
    await this.fighters.player1.enter(this.ticker, -this.width * 0.6, this.height * 0.2)
    const { x, y } = this.center()
    this.cue('fight')
    await Promise.all([
      popBurst(this.overlay, this.ticker, 'FIGHT !', x, y, {
        fill: '#E53935',
        textColor: '#FFE81F',
        fontSize: Math.max(48, Math.min(110, this.width * 0.16)),
      }),
      this.motion ? shake(this.ticker, this.scene, 10, 350) : Promise.resolve(),
      emitParticles(this.fx, this.ticker, {
        x,
        y,
        count: this.motion ? 24 : 8,
        colors: ['#FFE81F', '#FFFFFF', '#E53935'],
        speed: [200, 520],
        life: [300, 600],
        size: [4, 9],
        shape: 'star',
      }),
    ])
  }

  async play(entry: BattleLogEntry): Promise<void> {
    if (this.destroyed) return
    const { event } = entry
    const ticker = this.ticker

    switch (event.kind) {
      case 'attack': {
        const attacker = this.sideOf(event.attackerId)
        const target = this.sideOf(event.targetId)
        const attack = this.findAttack(event.attackerId, event.attackId)
        if (!attacker || !target) return
        if (attack?.type === 'Spéciale') await this.playSpecial(entry, attacker, target, attack)
        else if (attack?.type === 'Magique') await this.playMagic(entry, attacker, target, attack)
        else await this.playPhysical(entry, attacker, target)
        return
      }
      case 'miss': {
        const side = this.sideOf(event.attackerId)
        if (!side) return
        this.cue('boing')
        this.impact(entry)
        await Promise.all([
          this.motion ? this.fighters[side].wobble(ticker) : Promise.resolve(),
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
        if (this.fighters[side].gifId === event.targetId) {
          this.fighters[side].setStatus(event.effect, ticker, this.motion)
        }
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
        this.impact(entry)
        await Promise.all([
          this.motion ? this.fighters[side].hit(ticker, 5) : Promise.resolve(),
          this.floatAt(side, `-${event.damage}`, STATUS_INFO[event.effect].color),
        ])
        return
      }
      case 'statusExpired': {
        const side = this.sideOf(event.targetId)
        if (!side || this.fighters[side].gifId !== event.targetId) return
        this.fighters[side].setStatus(null, ticker)
        const { x, y } = this.slot(side)
        await emitParticles(this.fx, ticker, {
          x,
          y: y - this.fighters[side].size.height * 0.4,
          count: 10,
          colors: ['#FFFFFF', STATUS_INFO[event.effect].color],
          speed: [60, 160],
          life: [250, 450],
          size: [4, 8],
        })
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
        this.fighters[side].setStatus(null, ticker)
        await Promise.all([
          this.fighters[side].knockOut(ticker, side === 'player1' ? -1 : 1),
          this.motion ? shake(ticker, this.scene, 8, 300) : Promise.resolve(),
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
        this.impact(entry)
        const key = `${entry.turn}:${event.synergyId}`
        const synergy = SYNERGIES.find((s) => s.id === event.synergyId)
        const jobs = [this.floatAt(side, `+${event.amount}`, '#43A047')]
        if (synergy && !this.shownSynergies.has(key)) {
          this.shownSynergies.add(key)
          const scene = SYNERGY_ANIMATIONS[synergy.animationKey]
          if (scene && this.motion) jobs.push(scene(this.context(), side))
          else this.cue('heal')
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
        const { x, y } = this.center()
        this.cue('victory')
        const jobs: Promise<unknown>[] = [
          popBurst(this.overlay, ticker, entry.onomatopoeia ?? 'VICTOIRE !', x, y, {
            fill: '#FFE81F',
            textColor: this.options.playerColors[event.winnerId],
            fontSize: size,
            persist: true,
          }),
        ]
        if (this.motion && event.winnerId === (this.options.humanSide ?? event.winnerId)) {
          jobs.push(confetti(this.overlay, ticker, this.width))
        }
        await Promise.all(jobs)
        return
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.app.ticker.remove(this.bob)
    for (const side of SIDES) this.fighters[side].destroy()
    this.app.destroy({ removeView: true }, { children: true })
  }

  // --- Attacks ---------------------------------------------------------------

  /** Physical: lunge, shockwave, shards and a small camera shake. */
  private async playPhysical(entry: BattleLogEntry, attacker: PlayerId, target: PlayerId) {
    if (entry.event.kind !== 'attack') return
    const ticker = this.ticker
    this.cue('whoosh')
    if (this.motion) await this.lungeTowards(attacker, target, 0.25)
    this.cue('punch')
    this.impact(entry)
    const { x, y } = this.slot(target)
    const { width } = this.fighters[target].size
    await Promise.all([
      this.motion ? this.fighters[target].hit(ticker) : Promise.resolve(),
      this.motion ? shake(ticker, this.scene, 7, 220) : Promise.resolve(),
      impactRing(ticker, this.fx, x, y, width * 0.45, '#FFFFFF'),
      emitParticles(this.fx, ticker, {
        x,
        y,
        count: this.motion ? 14 : 6,
        colors: ['#FFFFFF', '#FFE81F'],
        speed: [220, 480],
        life: [220, 420],
        size: [4, 8],
        shape: 'spark',
      }),
      this.burstAt(target, entry.onomatopoeia ?? 'BAM !'),
      this.floatAt(target, `-${entry.event.damage}`, '#E53935'),
    ])
  }

  /** Magic: the attacker charges, then a glowing orb arcs to the target and bursts. */
  private async playMagic(
    entry: BattleLogEntry,
    attacker: PlayerId,
    target: PlayerId,
    attack: Attack,
  ) {
    if (entry.event.kind !== 'attack') return
    const ticker = this.ticker
    const color = attack.statusEffect ? STATUS_INFO[attack.statusEffect].color : MAGIC_COLOR
    const from = this.slot(attacker)
    const to = this.slot(target)
    const { width } = this.fighters[target].size

    this.cue('charge')
    await this.fighters[attacker].charge(ticker, color)
    this.cue('whoosh')
    await projectile(
      ticker,
      this.fx,
      from,
      to,
      color,
      Math.max(12, width * 0.11),
      this.motion ? 460 : 200,
    )
    this.cue('zap')
    this.impact(entry)
    await Promise.all([
      this.motion ? this.fighters[target].hit(ticker, 10) : Promise.resolve(),
      this.motion ? shake(ticker, this.scene, 5, 200) : Promise.resolve(),
      impactRing(ticker, this.fx, to.x, to.y, width * 0.55, color),
      emitParticles(this.fx, ticker, {
        x: to.x,
        y: to.y,
        count: this.motion ? 26 : 8,
        colors: [color, '#FFFFFF'],
        speed: [120, 380],
        life: [300, 600],
        size: [3, 7],
      }),
      this.burstAt(target, entry.onomatopoeia ?? 'ZAP !', { fill: '#FFFFFF', textColor: color }),
      this.floatAt(target, `-${entry.event.damage}`, '#E53935'),
    ])
  }

  /**
   * Special: mini-cinematic. The arena darkens, manga focus lines close in on the attacker,
   * the attack name sweeps across, then a flash, a big shake and a huge hit.
   */
  private async playSpecial(
    entry: BattleLogEntry,
    attacker: PlayerId,
    target: PlayerId,
    attack: Attack,
  ) {
    if (entry.event.kind !== 'attack') return
    const ticker = this.ticker
    const from = this.slot(attacker)
    const to = this.slot(target)
    const attackerSize = this.fighters[attacker].size
    const { width } = this.fighters[target].size

    this.cue('charge')
    const lines = createFocusLines(
      this.width,
      this.height,
      from.x,
      from.y,
      attackerSize.width * 0.7,
    )
    lines.alpha = 0
    this.under.addChild(lines)
    const fadeInLines = (t: Ticker) => (lines.alpha = Math.min(1, lines.alpha + t.deltaMS / 200))
    ticker.add(fadeInLines)
    await Promise.all([
      tween(ticker, 220, (t) => (this.dim.alpha = 0.62 * t)),
      sweepBanner(ticker, this.overlay, attack.name.toUpperCase(), this.width, this.height * 0.47, {
        fill: SPECIAL_COLOR,
        fontSize: Math.max(26, Math.min(56, this.width * 0.085)),
      }),
      this.motion ? this.fighters[attacker].pulse(ticker, 1.12, 900) : Promise.resolve(),
      this.fighters[attacker].charge(ticker, SPECIAL_COLOR, 900),
    ])
    ticker.remove(fadeInLines)

    this.cue('whoosh')
    if (this.motion) await this.lungeTowards(attacker, target, 0.4)
    this.cue('boom')
    this.impact(entry)
    lines.destroy()
    await Promise.all([
      flash(ticker, this.overlay, this.width, this.height, '#FFFFFF', 0.9, 320),
      this.motion ? shake(ticker, this.scene, 18, 520) : Promise.resolve(),
      this.motion ? this.fighters[target].hit(ticker, 22) : Promise.resolve(),
      impactRing(ticker, this.fx, to.x, to.y, width * 0.9, SPECIAL_COLOR),
      emitParticles(this.fx, ticker, {
        x: to.x,
        y: to.y,
        count: this.motion ? 34 : 10,
        colors: [SPECIAL_COLOR, '#FFFFFF', '#E53935'],
        speed: [200, 600],
        life: [400, 800],
        size: [5, 11],
        shape: 'star',
      }),
      this.burstAt(target, entry.onomatopoeia ?? 'KA-BOOM !', { scale: 1.5, fill: SPECIAL_COLOR }),
      this.floatAt(target, `-${entry.event.damage}`, SPECIAL_COLOR, 1.6),
      tween(ticker, 400, (t) => (this.dim.alpha = 0.62 * (1 - t))),
    ])
    this.dim.alpha = 0
  }

  private lungeTowards(attacker: PlayerId, target: PlayerId, amount: number) {
    const from = this.slot(attacker)
    const to = this.slot(target)
    return this.fighters[attacker].lunge(
      this.ticker,
      (to.x - from.x) * amount,
      (to.y - from.y) * amount,
    )
  }

  // --- Helpers ---------------------------------------------------------------

  private readonly bob = (ticker: Ticker) => {
    this.elapsed += ticker.deltaMS / 1000
    this.fighters.player1.setIdleOffset(Math.sin(this.elapsed * 2.2) * 3)
    this.fighters.player2.setIdleOffset(Math.sin(this.elapsed * 2.2 + Math.PI) * 3)
  }

  private context(): ArenaContext {
    return {
      ticker: this.ticker,
      fx: this.fx,
      width: this.width,
      height: this.height,
      motion: this.motion,
      slot: (side) => this.slot(side),
      fighterSize: (side) => this.fighters[side].size,
      cue: (sound) => this.cue(sound),
    }
  }

  private cue(sound: SoundName): void {
    if (!this.destroyed) this.options.onCue?.(sound)
  }

  private impact(entry: BattleLogEntry): void {
    if (!this.destroyed) this.options.onImpact?.(entry)
  }

  private sideOf(gifId: string): PlayerId | undefined {
    return this.options.findGif(gifId)?.side
  }

  private findAttack(gifId: string, attackId: string): Attack | undefined {
    return this.options.findGif(gifId)?.gif.attacks.find((a) => a.id === attackId)
  }

  private center() {
    return { x: this.width * LAYOUT.center.x, y: this.height * LAYOUT.center.y }
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

  private floatAt(side: PlayerId, text: string, color: string, scale = 1): Promise<void> {
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
      this.baseFontSize() * 0.9 * scale,
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
    if (slideOut) this.cue('switch')
    if (slideOut && this.motion) await fighter.slideOut(this.ticker, offscreen)
    await fighter.setGif(gif)
    fighter.setStatus(gif.status?.effect ?? null, this.ticker, this.motion)
    if (!this.motion) fighter.resetPose()
    this.cue('enter')
    await Promise.all([
      this.motion ? fighter.slideIn(this.ticker, offscreen) : Promise.resolve(),
      this.burstAt(side, text, {
        fill: '#FFFFFF',
        textColor: this.options.playerColors[side],
        scale: 0.8,
      }),
    ])
    await wait(this.ticker, 80)
  }
}
