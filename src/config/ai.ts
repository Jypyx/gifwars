import type { AiDifficulty } from '@/types'

export const AI_PLAYER_NAME = 'GifBot'

/** Pause before the AI acts, so its moves can be followed on screen. */
export const AI_THINK_MS = 1000

export const AI_DIFFICULTIES: Record<
  AiDifficulty,
  {
    label: string
    description: string
    /** Probability of playing a random attack instead of the best-scored action. */
    mistakeChance: number
    canSwitch: boolean
  }
> = {
  facile: {
    label: 'Facile',
    description: 'Attaque au petit bonheur.',
    mistakeChance: 1,
    canSwitch: false,
  },
  normal: {
    label: 'Normal',
    description: 'Joue bien, avec quelques erreurs.',
    mistakeChance: 0.3,
    canSwitch: true,
  },
  difficile: {
    label: 'Difficile',
    description: 'Calcule chaque coup et sait battre en retraite.',
    mistakeChance: 0,
    canSwitch: true,
  },
}
