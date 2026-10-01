import type { Container, Ticker } from 'pixi.js'
import type { SoundName } from '@/audio/sfx'
import type { PlayerId } from '@/types'

/** What standalone arena animations (synergies…) may use from the renderer. */
export interface ArenaContext {
  ticker: Ticker
  /** Layer above the fighters. */
  fx: Container
  width: number
  height: number
  /** Reduced motion: keep effects short and still. */
  motion: boolean
  /** Centre of a side's fighter. */
  slot: (side: PlayerId) => { x: number; y: number }
  fighterSize: (side: PlayerId) => { width: number; height: number }
  cue: (sound: SoundName) => void
}
