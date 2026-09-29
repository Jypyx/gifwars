import { ARCHETYPES, CATALOG, MASTERS } from './catalog'
import {
  COLUMNS, INITIAL_HAND_SIZE, MASTER_KILLS, ROWS,
  type Archetype, type Card, type Cell, type Deployment, type GameEvent,
  type GameState, type MasterKind, type Placement, type ReplayFrame,
  type RoundResolution, type Side, type Unit
} from './types'

export const opposite = (side: Side): Side => side === 'player' ? 'ai' : 'player'
export const direction = (side: Side): -1 | 1 => side === 'player' ? -1 : 1
export const frontRow = (side: Side): number => side === 'player' ? 5 : 4
export const homeRow = (side: Side): number => side === 'player' ? 9 : 0
export const isHomeCell = (side: Side, row: number): boolean =>
  Number.isInteger(row) && (side === 'player' ? row >= 5 && row <= 9 : row >= 0 && row <= 4)

function roll(state: GameState): number {
  let x = state.rng | 0
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  state.rng = x >>> 0
  return state.rng / 0x100000000
}

function pick<T>(state: GameState, values: T[]): T { return values[Math.floor(roll(state) * values.length)]! }
function shuffle<T>(state: GameState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state) * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}
function cell(unit: Cell): Cell { return { row: unit.row, col: unit.col } }
function occupied(state: GameState, row: number, col: number): boolean {
  return state.units.some(unit => unit.row === row && unit.col === col)
}
export function createInitialGame(seed = Date.now()): GameState {
  const state: GameState = {
    matchId: Math.abs(Math.trunc(seed)), phase: 'master-selection', round: 1,
    rng: (seed >>> 0) || 0x1a2b3c4d, serial: 0,
    players: {
      player: { hp: 3, kills: 0, hand: [], discard: [], master: null, masterUsed: false },
      ai: { hp: 3, kills: 0, hand: [], discard: [], master: null, masterUsed: false }
    },
    units: [], pending: { player: null, ai: null }, selection: null,
    suddenDeath: false, winner: null, history: []
  }
  for (const side of ['player', 'ai'] as const) {
    state.players[side].hand = Array.from({ length: INITIAL_HAND_SIZE }, () => ({
      id: `${side}-card-${++state.serial}`, archetype: pick(state, ARCHETYPES)
    }))
  }
  return state
}

export function selectMaster(state: GameState, kind: MasterKind): GameState {
  if (state.phase !== 'master-selection' || !MASTERS.includes(kind)) throw new Error('Sélection de Master invalide.')
  const next = structuredClone(state)
  next.players.player.master = kind
  next.players.ai.master = pick(next, MASTERS)
  next.phase = 'placement'
  next.history.push(`Master choisi : ${CATALOG[kind].name}`)
  return next
}

export function canUseMaster(state: GameState, side: Side): boolean {
  const player = state.players[side]
  return player.master !== null && !player.masterUsed && player.kills >= MASTER_KILLS
}

/** Each camp is numbered from the middle outward: line 1 is the front, line 5 the goal. */
export function legalCells(state: GameState, side: Side, deployment: Deployment): Cell[] {
  const rows = deployment.type === 'master'
    ? [frontRow(side)]
    : side === 'player' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]
  return rows.flatMap(row => Array.from({ length: COLUMNS }, (_, col) => ({ row, col })))
    .filter(({ row, col }) => !occupied(state, row, col))
}

export function availableDeployments(state: GameState, side: Side): Deployment[] {
  const result: Deployment[] = state.players[side].hand.map(card => ({ type: 'card', cardId: card.id }))
  if (canUseMaster(state, side)) result.push({ type: 'master' })
  return result.filter(deployment => legalCells(state, side, deployment).length > 0)
}

function validatePlacement(state: GameState, side: Side, placement: Placement | null): void {
  if (placement === null) {
    if (availableDeployments(state, side).length) throw new Error('La pose d’un Gif est obligatoire.')
    return
  }
  const { deployment, row, col } = placement
  if (!Number.isInteger(col) || col < 0 || col >= COLUMNS || !isHomeCell(side, row)) {
    throw new Error('Case hors de votre camp.')
  }
  if (deployment.type === 'master') {
    if (!canUseMaster(state, side) || row !== frontRow(side)) throw new Error('Master indisponible ou hors ligne 1.')
  } else if (!state.players[side].hand.some(card => card.id === deployment.cardId)) {
    throw new Error('Carte absente de la main.')
  }
  if (occupied(state, row, col)) throw new Error('Case occupée.')
}

function ageOrder(a: Unit, b: Unit, round: number): number {
  if (a.bornRound !== b.bornRound) return a.bornRound - b.bornRound
  if (a.owner !== b.owner) {
    const first: Side = round % 2 === 1 ? 'player' : 'ai'
    return a.owner === first ? -1 : 1
  }
  return a.order - b.order
}

/** All targeting is forward, in the same column, without a lateral move. */
function targetsAtStart(state: GameState, actor: Unit): string[] {
  const dir = direction(actor.owner)
  return state.units
    .filter(other => other.owner !== actor.owner && other.col === actor.col)
    .filter(other => {
      const distance = (other.row - actor.row) * dir
      return distance >= 1 && distance <= actor.range
    })
    .sort((a, b) => Math.abs(a.row - actor.row) - Math.abs(b.row - actor.row))
    .map(unit => unit.id)
}

function chooseAiPlacement(state: GameState): Placement | null {
  const options = availableDeployments(state, 'ai')
  if (!options.length) return null
  const deployment = pick(state, options)
  const at = pick(state, legalCells(state, 'ai', deployment))
  return { ...at, deployment }
}

function deploy(state: GameState, side: Side, placement: Placement): Unit {
  let kind: Archetype | MasterKind
  let master = false
  if (placement.deployment.type === 'master') {
    kind = state.players[side].master!
    state.players[side].masterUsed = true
    master = true
  } else {
    const index = state.players[side].hand.findIndex(card => card.id === (placement.deployment as { cardId: string }).cardId)
    const [card] = state.players[side].hand.splice(index, 1)
    state.players[side].discard.push(card!)
    kind = card!.archetype
  }
  const spec = CATALOG[kind]
  const unit: Unit = {
    id: `${side}-unit-${++state.serial}`, owner: side, kind, master,
    row: placement.row, col: placement.col, hp: spec.hp, maxHp: spec.hp,
    attack: spec.attack, range: spec.range, bornRound: state.round,
    order: state.serial, frozenRound: null, faceDown: true
  }
  state.units.push(unit)
  state.pending[side] = unit.id
  return unit
}

export function resolveRound(original: GameState, playerPlacement: Placement | null): RoundResolution {
  if (original.phase !== 'placement') throw new Error('La partie n’est pas en phase de placement.')
  validatePlacement(original, 'player', playerPlacement)
  const state = structuredClone(original)
  const aiPlacement = chooseAiPlacement(state)
  validatePlacement(state, 'ai', aiPlacement)
  const frames: ReplayFrame[] = []
  function emit(event: GameEvent): void { frames.push({ event, state: structuredClone(state) }) }
  function alive(id: string): Unit | undefined { return state.units.find(unit => unit.id === id) }
  function destroy(unit: Unit, killer: Side | null): void {
    const at = cell(unit)
    state.units = state.units.filter(candidate => candidate.id !== unit.id)
    if (killer) state.players[killer].kills++
    emit({ type: 'death', unitId: unit.id, owner: unit.owner, at })
  }
  function advance(unit: Unit): void {
    const from = cell(unit)
    const nextRow = unit.row + direction(unit.owner)
    if (nextRow < 0 || nextRow >= ROWS) {
      const target = opposite(unit.owner)
      state.players[target].hp = Math.max(0, state.players[target].hp - 1)
      state.units = state.units.filter(candidate => candidate.id !== unit.id)
      emit({ type: 'score', unitId: unit.id, owner: unit.owner, target, at: from })
      if (state.suddenDeath && state.players[target].hp === 0) {
        state.winner = unit.owner
        state.phase = 'finished'
        state.history.push(state.winner === 'player' ? 'Victoire en mort subite !' : 'Défaite en mort subite !')
        emit({ type: 'finish', winner: unit.owner })
      }
      return
    }
    if (occupied(state, nextRow, unit.col)) {
      emit({ type: 'blocked', unitId: unit.id })
      return
    }
    unit.row = nextRow
    emit({ type: 'move', unitId: unit.id, from, to: cell(unit) })
  }

  state.phase = 'revealing'
  const newUnits: Unit[] = []
  for (const [side, placement] of [['player', playerPlacement], ['ai', aiPlacement]] as const) {
    if (placement) {
      const unit = deploy(state, side, placement)
      newUnits.push(unit)
      emit({ type: 'place', unitId: unit.id, owner: side, at: cell(unit) })
    } else emit({ type: 'pass', owner: side })
  }
  for (const unit of newUnits) unit.faceDown = false
  state.pending = { player: null, ai: null }
  emit({ type: 'reveal', unitIds: newUnits.map(unit => unit.id) })

  // Both Masters see the same post-reveal board; calculate their global effects
  // before applying any of them. Both abilities fire even if their owners die.
  const masters = newUnits.filter(unit => unit.master)
  const abilityBoard = [...state.units]
  const buffAtk = new Map<string, number>()
  const buffHp = new Map<string, number>()
  const damage = new Map<string, { amount: number; owner: Side }>()
  const assassinated = new Map<string, Side>()
  const frozen = new Set<string>()
  for (const master of masters) {
    const allies = abilityBoard.filter(unit => unit.owner === master.owner)
    const enemies = abilityBoard.filter(unit => unit.owner !== master.owner)
    if (master.kind === 'strategist') for (const unit of allies) buffAtk.set(unit.id, (buffAtk.get(unit.id) ?? 0) + 1)
    if (master.kind === 'protector') for (const unit of allies) buffHp.set(unit.id, (buffHp.get(unit.id) ?? 0) + 2)
    if (master.kind === 'detonator') for (const unit of enemies) {
      const current = damage.get(unit.id)
      damage.set(unit.id, { amount: (current?.amount ?? 0) + 1, owner: master.owner })
    }
    if (master.kind === 'cryomancer') for (const unit of enemies) frozen.add(unit.id)
    if (master.kind === 'assassin' && enemies.length) {
      const target = enemies.sort((a, b) =>
        master.owner === 'player'
          ? b.row - a.row || ageOrder(a, b, state.round)
          : a.row - b.row || ageOrder(a, b, state.round))[0]!
      assassinated.set(target.id, master.owner)
    }
    emit({ type: 'master', unitId: master.id, kind: master.kind as MasterKind, owner: master.owner })
  }
  for (const unit of abilityBoard) {
    const atk = buffAtk.get(unit.id) ?? 0
    const hp = buffHp.get(unit.id) ?? 0
    if (atk) { unit.attack += atk; emit({ type: 'buff', unitId: unit.id, stat: 'attack', amount: atk }) }
    if (hp) { unit.hp += hp; unit.maxHp += hp; emit({ type: 'buff', unitId: unit.id, stat: 'hp', amount: hp }) }
    if (frozen.has(unit.id)) { unit.frozenRound = state.round; emit({ type: 'freeze', unitId: unit.id }) }
    const blast = damage.get(unit.id)
    if (blast) {
      unit.hp -= blast.amount
      emit({ type: 'damage', unitId: unit.id, amount: blast.amount, at: cell(unit) })
    }
    if (assassinated.has(unit.id)) unit.hp = 0
    if (unit.hp <= 0) destroy(unit, assassinated.get(unit.id) ?? blast?.owner ?? null)
  }

  state.phase = 'resolving'
  const actors = [...state.units].sort((a, b) => ageOrder(a, b, state.round))
  const initialTargets = new Map(actors.map(unit => [unit.id, targetsAtStart(state, unit)]))
  for (const actor of actors) {
    if (state.winner !== null) break
    if (!alive(actor.id) || actor.frozenRound === state.round) continue
    const targets = initialTargets.get(actor.id)!
    if (targets.length) {
      const target = targets.map(id => alive(id)).find((unit): unit is Unit => unit !== undefined)
      if (!target) continue
      const from = cell(actor), to = cell(target)
      target.hp -= actor.attack
      emit({ type: 'attack', unitId: actor.id, targetId: target.id, damage: actor.attack, from, to })
      if (target.hp <= 0) {
        destroy(target, actor.owner)
        advance(actor)
      }
    } else advance(actor)
  }

  const playerDead = state.players.player.hp <= 0
  const aiDead = state.players.ai.hp <= 0
  if (state.winner !== null) {
    // The first scoring blow during sudden death ended the resolution immediately.
  } else if (playerDead && aiDead && !state.suddenDeath) {
    state.players.player.hp = 1
    state.players.ai.hp = 1
    state.suddenDeath = true
    emit({ type: 'sudden-death' })
  } else if (playerDead || aiDead) {
    state.winner = playerDead ? 'ai' : 'player'
    state.phase = 'finished'
    state.history.push(state.winner === 'player' ? 'Victoire !' : 'Défaite !')
    emit({ type: 'finish', winner: state.winner })
  }
  if (state.winner === null) {
    for (const side of ['player', 'ai'] as const) {
      const player = state.players[side]
      if (!player.hand.length && player.discard.length) {
        player.hand = shuffle(state, player.discard)
        player.discard = []
        emit({ type: 'recycle', owner: side, count: player.hand.length })
      }
    }
    state.round++
    state.phase = 'placement'
    state.selection = null
    emit({ type: 'ready', round: state.round })
  }
  return { state, frames }
}

export function cardFor(state: GameState, side: Side, id: string): Card | undefined {
  return state.players[side].hand.find(card => card.id === id)
}
