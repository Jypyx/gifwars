import type { GifCard, StatusEffectKind } from './gif'
import type { Synergy } from './synergy'

export type PlayerId = 'player1' | 'player2'

export type AiDifficulty = 'facile' | 'normal' | 'difficile'

/** Who decides a player's actions. */
export type Controller = { kind: 'human' } | { kind: 'ai'; difficulty: AiDifficulty }

export interface Player {
  id: PlayerId
  name: string
  team: GifCard[]
  /** Index in `team` of the GIF currently fighting. */
  activeIndex: number
}

/**
 * - `awaitingReplacement`: the active GIF of each player in `pendingReplacements` is K.O. and must
 *   be replaced (does not consume that player's next attack turn).
 */
export type GamePhase = 'idle' | 'battle' | 'awaitingReplacement' | 'finished'

/** One action per turn: attacking or switching (a switch consumes the turn). */
export type TurnAction =
  { kind: 'attack'; attackId: string } | { kind: 'switch'; targetIndex: number }

export type BattleEvent =
  | { kind: 'attack'; attackerId: string; targetId: string; attackId: string; damage: number }
  | { kind: 'miss'; attackerId: string; attackId: string; selfDamage: number }
  | { kind: 'statusApplied'; targetId: string; effect: StatusEffectKind }
  | { kind: 'statusTick'; targetId: string; effect: StatusEffectKind; damage: number }
  | { kind: 'statusExpired'; targetId: string; effect: StatusEffectKind }
  | { kind: 'turnSkipped'; gifId: string; reason: 'Lag' }
  | { kind: 'timeout'; gifId: string }
  | { kind: 'switch'; fromId: string; toId: string }
  | { kind: 'replacement'; gifId: string }
  | { kind: 'ko'; gifId: string }
  | { kind: 'synergyHeal'; synergyId: Synergy['id']; gifId: string; amount: number }
  | { kind: 'victory'; winnerId: PlayerId }

export interface BattleLogEntry {
  turn: number
  playerId: PlayerId
  event: BattleEvent
  /** Comic-style sound effect displayed on screen ("BAM !", "POW !"…). */
  onomatopoeia?: string
}

export interface GameState {
  phase: GamePhase
  players: Record<PlayerId, Player>
  currentPlayerId: PlayerId
  turnNumber: number
  /** Seconds left before the automatic action (physical attack or replacement). */
  turnTimeLeft: number
  /** Players who must send a replacement before the battle resumes. */
  pendingReplacements: PlayerId[]
  winnerId: PlayerId | null
  log: BattleLogEntry[]
}
