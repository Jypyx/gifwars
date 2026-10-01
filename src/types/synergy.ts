export type SynergyEffect = { kind: 'HealPerTurn'; amount: number }

/**
 * Humorous bonus activated when every linked GIF is alive in the same team
 * (e.g. Merry + Pippin).
 */
export interface Synergy {
  id: string
  name: string
  description: string
  /** Catalogue ids of the GIFs that must all be present and alive. */
  gifIds: readonly string[]
  effect: SynergyEffect
  /** Key of the special animation played by the battle renderer. */
  animationKey: string
  onomatopoeia: string
}
