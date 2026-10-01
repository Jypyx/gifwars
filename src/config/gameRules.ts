import type { AttackType, Rarity, StatusEffectKind } from '@/types'

export const TEAM_SIZE = 5

/** GDD: strict timer between 15 and 20 seconds. */
export const TURN_DURATION_SECONDS = 20

/**
 * Quick Match draw structure: one slot per team member, listing the rarities allowed in it.
 * 2 Commons, 2 Rares, 1 Epic or Legendary.
 */
export const QUICK_MATCH_RARITY_SLOTS: readonly (readonly Rarity[])[] = [
  ['Commun'],
  ['Commun'],
  ['Rare'],
  ['Rare'],
  ['Épique', 'Légendaire'],
]

/** Runtime mirror of `AttackSetByRarity`, used to validate data. */
export const ATTACK_LAYOUT_BY_RARITY: Record<Rarity, readonly AttackType[]> = {
  Commun: ['Physique'],
  Rare: ['Physique', 'Magique'],
  Épique: ['Physique', 'Magique', 'Magique'],
  Légendaire: ['Physique', 'Magique', 'Magique', 'Spéciale'],
}

/** Probability that an attack carrying a status actually applies it on hit. */
export const STATUS_APPLY_CHANCE = 0.35

export const STATUS_RULES = {
  /** Lag / Buffering: chance the GIF fails to load and its turn is skipped. */
  Lag: { durationTurns: 2, skipTurnChance: 0.5 },
  /** Bad Buzz: loses a fixed share of max HP at the end of each turn. */
  BadBuzz: { durationTurns: 3, hpLossPercent: 0.08 },
  /** Boucle: chance to miss and take part of the attack's damage itself. */
  Boucle: { durationTurns: 2, missChance: 0.33, selfDamageRatio: 0.5 },
} as const satisfies Record<StatusEffectKind, { durationTurns: number; [rule: string]: number }>
