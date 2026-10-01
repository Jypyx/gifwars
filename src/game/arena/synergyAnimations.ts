/**
 * One little scene per synergy (GDD: "animation spéciale"), keyed by `Synergy.animationKey`.
 * Played over the healed team's fighter, once per turn.
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { PlayerId } from '@/types'
import type { ArenaContext } from './context'
import { INK } from './effects'
import { emitParticles } from './particles'
import { easeInCubic, easeOutBack, easeOutCubic, lerp, tween, wait } from './tween'

export type SynergyAnimation = (ctx: ArenaContext, side: PlayerId) => Promise<void>

function emoji(text: string, size: number): Text {
  const sprite = new Text({ text, style: { fontSize: size } })
  sprite.anchor.set(0.5)
  return sprite
}

/** Fades a sprite out, then destroys it. */
async function vanish(ctx: ArenaContext, sprite: Container, durationMs = 220) {
  await tween(ctx.ticker, durationMs, (t) => (sprite.alpha = 1 - t))
  sprite.destroy({ children: true })
}

/** Merry + Pippin: two beer mugs fly in and clink above the fighter. */
const secondBreakfast: SynergyAnimation = async (ctx, side) => {
  const { x, y } = ctx.slot(side)
  const { width, height } = ctx.fighterSize(side)
  const size = width * 0.32
  const top = y - height * 0.62
  const left = emoji('🍺', size)
  const right = emoji('🍺', size)
  right.scale.x = -1
  ctx.fx.addChild(left, right)

  await tween(
    ctx.ticker,
    380,
    (t) => {
      left.position.set(lerp(x - width, x - size * 0.42, t), top + Math.sin(t * Math.PI) * -20)
      right.position.set(lerp(x + width, x + size * 0.42, t), top + Math.sin(t * Math.PI) * -20)
      left.rotation = lerp(-0.8, 0.35, t)
      right.rotation = lerp(0.8, -0.35, t)
    },
    easeInCubic,
  )
  ctx.cue('heal')
  await Promise.all([
    emitParticles(ctx.fx, ctx.ticker, {
      x,
      y: top - size * 0.3,
      count: 16,
      colors: ['#FFE082', '#FFFFFF', '#FFCA28'],
      speed: [80, 220],
      angle: [-Math.PI, 0],
      gravity: 300,
      life: [350, 650],
      size: [3, 6],
    }),
    tween(ctx.ticker, 300, (t) => {
      left.rotation = 0.35 - Math.sin(t * Math.PI) * 0.25
      right.rotation = -0.35 + Math.sin(t * Math.PI) * 0.25
    }),
  ])
  await Promise.all([vanish(ctx, left), vanish(ctx, right)])
}

/** Gandalf + Pippin: "Fool of a Took!" — the staff comes down on Pippin's head, stars spin. */
const foolOfATook: SynergyAnimation = async (ctx, side) => {
  const { x, y } = ctx.slot(side)
  const { width, height } = ctx.fighterSize(side)
  const length = height * 0.95
  const staff = new Graphics()
    .roundRect(-width * 0.025, -length, width * 0.05, length, 4)
    .fill('#8D6E63')
    .stroke({ width: 3, color: INK })
    .circle(0, -length, width * 0.06)
    .fill('#ECEFF1')
    .stroke({ width: 3, color: INK })
  const pivot = { x: x + width * 0.55, y: y - height * 0.15 }
  staff.position.set(pivot.x, pivot.y)
  staff.rotation = 1.4
  ctx.fx.addChild(staff)

  await tween(ctx.ticker, 300, (t) => (staff.rotation = lerp(1.4, -1.05, t)), easeInCubic)
  ctx.cue('punch')
  const stars = new Container()
  stars.position.set(x, y - height * 0.55)
  for (let i = 0; i < 3; i++) stars.addChild(emoji('⭐', width * 0.12))
  ctx.fx.addChild(stars)
  await Promise.all([
    tween(ctx.ticker, 160, (t) => (staff.rotation = lerp(-1.05, -0.85, t))),
    tween(ctx.ticker, 900, (t) => {
      stars.children.forEach((star, i) => {
        const angle = t * Math.PI * 4 + (i * Math.PI * 2) / 3
        star.position.set(Math.cos(angle) * width * 0.25, Math.sin(angle) * height * 0.08)
      })
    }),
  ])
  await Promise.all([vanish(ctx, staff), vanish(ctx, stars)])
}

/** Jim + Dwight: the legendary stapler in Jell-O drops on the fighter and wobbles. */
const prankWar: SynergyAnimation = async (ctx, side) => {
  const { x, y } = ctx.slot(side)
  const { width, height } = ctx.fighterSize(side)
  const w = width * 0.42
  const h = w * 0.75
  const jelly = new Container()
  const cube = new Graphics()
    .roundRect(-w / 2, -h, w, h, w * 0.15)
    .fill({ color: '#C6FF00', alpha: 0.7 })
    .stroke({ width: 3, color: INK })
    .roundRect(-w * 0.38, -h * 0.92, w * 0.18, h * 0.28, 4)
    .fill({ color: '#FFFFFF', alpha: 0.6 })
  const stapler = new Graphics()
    .roundRect(-w * 0.28, -h * 0.55, w * 0.56, h * 0.16, 4)
    .fill('#90A4AE')
    .stroke({ width: 2, color: INK })
    .roundRect(-w * 0.3, -h * 0.4, w * 0.6, h * 0.12, 3)
    .fill('#546E7A')
    .stroke({ width: 2, color: INK })
  jelly.addChild(stapler, cube)
  const landY = y - height * 0.5
  jelly.position.set(x, -h)
  ctx.fx.addChild(jelly)

  await tween(ctx.ticker, 380, (t) => (jelly.y = lerp(-h, landY, t)), easeInCubic)
  ctx.cue('boing')
  await tween(ctx.ticker, 700, (t) => {
    const squash = Math.sin(t * Math.PI * 5) * 0.22 * (1 - t)
    jelly.scale.set(1 + squash, 1 - squash)
  })
  await wait(ctx.ticker, 150)
  await vanish(ctx, jelly)
}

/** Ron + Hermione: "Wingardium Leviosa" — a feather swishes up, leaving sparkles. */
const leviosa: SynergyAnimation = async (ctx, side) => {
  const { x, y } = ctx.slot(side)
  const { width, height } = ctx.fighterSize(side)
  const feather = emoji('🪶', width * 0.24)
  ctx.fx.addChild(feather)
  ctx.cue('heal')
  let lastSparkle = 0
  await tween(
    ctx.ticker,
    1100,
    (t) => {
      feather.position.set(
        x + Math.sin(t * Math.PI * 3) * width * 0.3,
        y + height * 0.3 - t * height * 1.1,
      )
      feather.rotation = Math.sin(t * Math.PI * 3) * 0.5
      if (t - lastSparkle > 0.08) {
        lastSparkle = t
        void emitParticles(ctx.fx, ctx.ticker, {
          x: feather.x,
          y: feather.y,
          count: 3,
          colors: ['#FFD54F', '#FFFFFF', '#B39DDB'],
          speed: [20, 70],
          life: [300, 600],
          size: [3, 6],
          shape: 'star',
        })
      }
    },
    easeOutCubic,
  )
  await vanish(ctx, feather)
}

/** Walter + Jesse: blue smoke from the mobile lab, and crystals popping out. */
const mobileLab: SynergyAnimation = async (ctx, side) => {
  const { x, y } = ctx.slot(side)
  const { width, height } = ctx.fighterSize(side)
  ctx.cue('switch')
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const puff = new Graphics().circle(0, 0, width * 0.1).fill({ color: '#4FC3F7', alpha: 0.75 })
    puff.position.set(x + (i - 3) * width * 0.12, y + height * 0.3)
    ctx.fx.addChild(puff)
    return puff
  })
  const crystals = Array.from({ length: 3 }, (_, i) => {
    const crystal = emoji('💎', width * 0.14)
    crystal.position.set(x + (i - 1) * width * 0.25, y)
    crystal.scale.set(0)
    ctx.fx.addChild(crystal)
    return crystal
  })
  await tween(ctx.ticker, 900, (t) => {
    puffs.forEach((puff, i) => {
      puff.y = y + height * 0.3 - t * height * (0.7 + (i % 3) * 0.15)
      puff.scale.set(1 + t * 1.8)
      puff.alpha = 0.75 * (1 - t)
    })
    crystals.forEach((crystal, i) => {
      const local = Math.min(1, Math.max(0, t * 2 - i * 0.25))
      crystal.scale.set(easeOutBack(local))
      crystal.y = y - height * 0.35 - local * height * 0.15
    })
  })
  for (const puff of puffs) puff.destroy()
  await Promise.all(crystals.map((crystal) => vanish(ctx, crystal)))
}

export const SYNERGY_ANIMATIONS: Record<string, SynergyAnimation> = {
  'second-breakfast': secondBreakfast,
  'fool-of-a-took': foolOfATook,
  'prank-war': prankWar,
  leviosa,
  'mobile-lab': mobileLab,
}
