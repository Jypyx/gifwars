import { describe, expect, it } from 'vitest'
import { SYNERGIES } from '@/data/synergies'
import { SYNERGY_ANIMATIONS } from '@/game/arena/synergyAnimations'

describe('SYNERGY_ANIMATIONS', () => {
  it('has a dedicated scene for every synergy', () => {
    const missing = SYNERGIES.filter(
      (s) => typeof SYNERGY_ANIMATIONS[s.animationKey] !== 'function',
    )
    expect(missing.map((s) => s.id)).toEqual([])
  })
})
