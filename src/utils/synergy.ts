import { SYNERGIES } from '@/data/synergies'
import type { GifCard, Synergy } from '@/types'
import { isKnockedOut } from './gifs'

/** Synergies whose linked GIFs are all present and alive in `team`. */
export function detectSynergies(
  team: readonly GifCard[],
  synergies: readonly Synergy[] = SYNERGIES,
): Synergy[] {
  const aliveIds = new Set(team.filter((gif) => !isKnockedOut(gif)).map((gif) => gif.id))
  return synergies.filter((synergy) => synergy.gifIds.every((id) => aliveIds.has(id)))
}
