import type { Ticker } from 'pixi.js'

export type Easing = (t: number) => number

export const linear: Easing = (t) => t
export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3
export const easeInCubic: Easing = (t) => t ** 3
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** Calls `update` with an eased progress in [0, 1] on every frame for `durationMs`. */
export function tween(
  ticker: Ticker,
  durationMs: number,
  update: (progress: number) => void,
  ease: Easing = easeOutCubic,
): Promise<void> {
  return new Promise((resolve) => {
    if (durationMs <= 0) {
      update(1)
      return resolve()
    }
    let elapsed = 0
    const step = (t: Ticker) => {
      elapsed += t.deltaMS
      const progress = Math.min(1, elapsed / durationMs)
      update(ease(progress))
      if (progress >= 1) {
        ticker.remove(step)
        resolve()
      }
    }
    ticker.add(step)
  })
}

export const wait = (ticker: Ticker, ms: number) => tween(ticker, ms, () => {}, linear)

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t
