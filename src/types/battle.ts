import type { GifCard, StatusEffectKind } from './gif'
import type { Synergy } from './synergy'

export type PlayerId = 'player1' | 'player2'

export interface Player {
  id: PlayerId
  name: string
  team: GifCard[]
  /** Index in `team` of the GIF currently fighting. */
  activeIndex: number
}

/**
 * - `awaitingReplacement`: the active GIF of `pendingReplacementFor` is K.O. and must be replaced
 *   (does not consume that player's next attack turn).
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
  | { kind: 'turnSkipped'; gifId: string; reason: 'Lag' | 'timeout' }
  | { kind: 'switch'; fromId: string; toId: string }
  | { kind: 'ko'; gifId: string }
  | { kind: 'synergyHeal'; synergyId: Synergy['id']; gifId: string; amount: number }

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
  /** Seconds left before the automatic physical attack. */
  turnTimeLeft: number
  pendingReplacementFor: PlayerId | null
  winnerId: PlayerId | null
  log: BattleLogEntry[]
}
