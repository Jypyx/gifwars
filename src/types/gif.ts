/**
 * Core card & attack types for GifWars.
 * Gameplay values stay in French (as in the GDD) since they are displayed as-is in the UI.
 */

export type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'

export type AttackType = 'Physique' | 'Magique' | 'Spéciale'

export type StatusEffect = 'Lag' | 'BadBuzz' | 'Boucle' | null

/** A status that can actually be applied (i.e. `StatusEffect` without `null`). */
export type StatusEffectKind = NonNullable<StatusEffect>

export type UniverseId = 'lotr' | 'the-office' | 'harry-potter' | 'breaking-bad' | 'star-wars'

export interface Attack {
  id: string
  name: string
  type: AttackType
  damage: number
  /** Uses allowed per fight. `null` means unlimited. */
  maxUses: number | null
  /** Remaining uses in the current fight. `null` means unlimited. */
  currentUses: number | null
  /** Status inflicted on the target on hit (subject to `STATUS_APPLY_CHANCE`). */
  statusEffect: StatusEffect
}

/** Basic attack: always available, also triggered automatically when the turn timer runs out. */
export interface PhysicalAttack extends Attack {
  type: 'Physique'
  maxUses: null
  currentUses: null
}

export interface MagicAttack extends Attack {
  type: 'Magique'
  maxUses: number
  currentUses: number
}

/** Legendary-only finisher, usable once per fight. */
export interface SpecialAttack extends Attack {
  type: 'Spéciale'
  maxUses: 1
  currentUses: 0 | 1
}

/**
 * Attack panel imposed by rarity (GDD). Tuples guarantee at compile time that
 * `attacks[0]` is always the physical attack.
 */
export interface AttackSetByRarity {
  Commun: [PhysicalAttack]
  Rare: [PhysicalAttack, MagicAttack]
  Épique: [PhysicalAttack, MagicAttack, MagicAttack]
  Légendaire: [PhysicalAttack, MagicAttack, MagicAttack, SpecialAttack]
}

/** A status currently affecting a GIF in battle. */
export interface ActiveStatus {
  effect: StatusEffectKind
  turnsLeft: number
}

interface GifCardBase {
  /** Catalogue id, also used by synergies to identify linked GIFs. */
  id: string
  name: string
  universe: UniverseId
  gifUrl: string
  /** Flavour text displayed on the card. */
  catchphrase: string
  maxHp: number
  currentHp: number
  status: ActiveStatus | null
}

/** Discriminated union on `rarity`: each rarity carries its own attack tuple. */
export type GifCard = {
  [R in Rarity]: GifCardBase & { rarity: R; attacks: AttackSetByRarity[R] }
}[Rarity]

/** `Omit` that preserves union members (plain `Omit` would collapse the rarity discriminant). */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** Static catalogue entry: a `GifCard` without its battle-time state. */
export type GifDefinition = DistributiveOmit<GifCard, 'currentHp' | 'status'>

export interface UniverseTheme {
  id: UniverseId
  name: string
  /** Main frame colour of the card. */
  primary: string
  /** Header / name banner colour. */
  secondary: string
  /** Highlights (HP bar, rarity badge…). */
  accent: string
  /** Background pattern drawn inside the card frame. */
  pattern: 'halftone' | 'stripes' | 'stars' | 'grid' | 'zigzag'
}
