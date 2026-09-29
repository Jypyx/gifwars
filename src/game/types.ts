export const ROWS = 10
export const COLUMNS = 3
export const INITIAL_HAND_SIZE = 7
export const MASTER_KILLS = 3

export type Side = 'player' | 'ai'
export type Archetype = 'tank' | 'fighter' | 'shooter' | 'sniper' | 'berserker'
export type MasterKind = 'strategist' | 'protector' | 'detonator' | 'cryomancer' | 'assassin'
export type UnitKind = Archetype | MasterKind
export type Phase = 'master-selection' | 'placement' | 'revealing' | 'resolving' | 'finished'

export interface Cell { row: number; col: number }
export interface Card { id: string; archetype: Archetype }
export interface Unit extends Cell {
  id: string
  owner: Side
  kind: UnitKind
  master: boolean
  hp: number
  maxHp: number
  attack: number
  range: number
  bornRound: number
  order: number
  frozenRound: number | null
  faceDown: boolean
}
export interface PlayerState {
  hp: number
  kills: number
  hand: Card[]
  discard: Card[]
  master: MasterKind | null
  masterUsed: boolean
}
export type Deployment = { type: 'card'; cardId: string } | { type: 'master' }
export type Selection = Deployment | null
export interface Placement extends Cell { deployment: Deployment }
export interface GameState {
  matchId: number
  phase: Phase
  round: number
  rng: number
  serial: number
  players: Record<Side, PlayerState>
  units: Unit[]
  pending: Record<Side, string | null>
  selection: Selection
  suddenDeath: boolean
  winner: Side | null
  history: string[]
}

export type GameEvent =
  | { type: 'place'; unitId: string; owner: Side; at: Cell }
  | { type: 'reveal'; unitIds: string[] }
  | { type: 'master'; unitId: string; kind: MasterKind; owner: Side }
  | { type: 'buff'; unitId: string; stat: 'attack' | 'hp'; amount: number }
  | { type: 'freeze'; unitId: string }
  | { type: 'attack'; unitId: string; targetId: string; damage: number; from: Cell; to: Cell }
  | { type: 'damage'; unitId: string; amount: number; at: Cell }
  | { type: 'death'; unitId: string; owner: Side; at: Cell }
  | { type: 'move'; unitId: string; from: Cell; to: Cell }
  | { type: 'blocked'; unitId: string }
  | { type: 'score'; unitId: string; owner: Side; target: Side; at: Cell }
  | { type: 'sudden-death' }
  | { type: 'finish'; winner: Side }
  | { type: 'recycle'; owner: Side; count: number }
  | { type: 'pass'; owner: Side }
  | { type: 'ready'; round: number }

/** Immutable playback frames: the renderer never decides combat outcomes. */
export interface ReplayFrame { event: GameEvent; state: GameState }
export interface RoundResolution { state: GameState; frames: ReplayFrame[] }
export type ActionResult = { ok: true } | { ok: false; reason: string }
