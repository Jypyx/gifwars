import type { GifCard } from '@/types'

/** Deep copy of a catalogue GIF with full HP, refilled attacks and no status, ready for a fight. */
export function createGifInstance(card: GifCard): GifCard {
  const instance = structuredClone(card)
  instance.currentHp = instance.maxHp
  instance.status = null
  for (const attack of instance.attacks) attack.currentUses = attack.maxUses
  return instance
}

export const isKnockedOut = (gif: GifCard): boolean => gif.currentHp <= 0
