import { describe, expect, it } from 'vitest'
import { CATALOG, MASTERS } from '../src/game/catalog'
import { canUseMaster, createInitialGame, legalCells, resolveRound, selectMaster } from '../src/game/engine'
import type { Archetype, GameState, MasterKind, Placement, Side, Unit } from '../src/game/types'

function setup(): GameState { return selectMaster(createInitialGame(1234), 'strategist') }
function place(state: GameState, row = 9, col = 2): Placement {
  return { row, col, deployment: { type: 'card', cardId: state.players.player.hand[0]!.id } }
}
function unit(state: GameState, side: Side, kind: Archetype | MasterKind, row: number, col: number, bornRound = 0): Unit {
  const spec = CATALOG[kind]
  const entity: Unit = {
    id: `fixture-${side}-${kind}-${row}-${col}`, owner: side, kind,
    master: MASTERS.includes(kind as MasterKind), row, col,
    hp: spec.hp, maxHp: spec.hp, attack: spec.attack, range: spec.range,
    bornRound, order: state.units.length, frozenRound: null, faceDown: false
  }
  state.units.push(entity)
  return entity
}

describe('Gif Wars v1.2 engine', () => {
  it('deals seven random cards per side and waits for a Master choice', () => {
    const state = createInitialGame(23)
    expect(state.phase).toBe('master-selection')
    expect(state.players.player.hand).toHaveLength(7)
    expect(state.players.ai.hand).toHaveLength(7)
    expect(selectMaster(state, 'assassin').players.player.master).toBe('assassin')
  })

  it('implements the exact five standard stats', () => {
    expect(['tank', 'fighter', 'shooter', 'sniper', 'berserker'].map(kind => {
      const spec = CATALOG[kind as Archetype]
      return [spec.hp, spec.attack, spec.range]
    })).toEqual([[5, 1, 1], [3, 2, 1], [2, 2, 2], [1, 3, 3], [1, 4, 1]])
  })

  it('enforces mandatory hidden placement and reveals one bot Gif simultaneously', () => {
    const state = setup()
    expect(() => resolveRound(state, null)).toThrow('obligatoire')
    expect(() => resolveRound(state, { ...place(state), row: 4 })).toThrow('hors de votre camp')
    const outcome = resolveRound(state, place(state))
    expect(outcome.frames.filter(frame => frame.event.type === 'place')).toHaveLength(2)
    expect(outcome.frames.find(frame => frame.event.type === 'place')!.state.units[0]!.faceDown).toBe(true)
    expect(outcome.frames.find(frame => frame.event.type === 'reveal')!.state.units.every(unit => !unit.faceDown)).toBe(true)
    expect(outcome.state.round).toBe(2)
  })

  it('attacks an enemy in range at the start instead of moving', () => {
    const state = setup()
    const fighter = unit(state, 'player', 'fighter', 5, 0)
    const tank = unit(state, 'ai', 'tank', 4, 0)
    const result = resolveRound(state, place(state))
    expect(result.state.units.find(candidate => candidate.id === fighter.id)?.row).toBe(5)
    expect(result.state.units.find(candidate => candidate.id === tank.id)?.hp).toBe(3)
  })

  it('advances immediately after a kill and credits it to the owner', () => {
    const state = setup()
    const attacker = unit(state, 'player', 'berserker', 5, 0)
    const victim = unit(state, 'ai', 'shooter', 4, 0)
    const result = resolveRound(state, place(state))
    expect(result.state.units.find(candidate => candidate.id === attacker.id)?.row).toBe(4)
    expect(result.state.units.some(candidate => candidate.id === victim.id)).toBe(false)
    expect(result.state.players.player.kills).toBe(1)
  })

  it('stops opposed melee units adjacent on their meeting turn', () => {
    const state = setup()
    const player = unit(state, 'player', 'tank', 6, 0)
    const ai = unit(state, 'ai', 'tank', 3, 0)
    const result = resolveRound(state, place(state))
    expect(result.state.units.find(u => u.id === player.id)?.row).toBe(5)
    expect(result.state.units.find(u => u.id === ai.id)?.row).toBe(4)
    expect(result.frames.some(frame => frame.event.type === 'attack' &&
      (frame.event.unitId === player.id || frame.event.unitId === ai.id))).toBe(false)
  })

  it('does not let a unit overtake a stationary ally', () => {
    const state = setup()
    const front = unit(state, 'player', 'fighter', 5, 0)
    const rear = unit(state, 'player', 'tank', 6, 0)
    unit(state, 'ai', 'tank', 4, 0)
    const result = resolveRound(state, place(state))
    expect(result.state.units.find(u => u.id === front.id)?.row).toBe(5)
    expect(result.state.units.find(u => u.id === rear.id)?.row).toBe(6)
    expect(result.frames.some(frame => frame.event.type === 'blocked' && frame.event.unitId === rear.id)).toBe(true)
  })

  it('unlocks and places the Master on line one only', () => {
    const state = setup()
    state.players.player.kills = 3
    expect(canUseMaster(state, 'player')).toBe(true)
    expect(legalCells(state, 'player', { type: 'master' }).every(at => at.row === 5)).toBe(true)
    const result = resolveRound(state, { row: 5, col: 1, deployment: { type: 'master' } })
    expect(result.state.players.player.masterUsed).toBe(true)
    expect(result.state.units.find(u => u.master && u.owner === 'player')?.attack).toBe(3)
  })

  it('freezes enemies for one round and prevents both action and movement', () => {
    const state = selectMaster(createInitialGame(9), 'cryomancer')
    state.players.player.kills = 3
    const enemy = unit(state, 'ai', 'tank', 4, 0)
    const result = resolveRound(state, { row: 5, col: 0, deployment: { type: 'master' } })
    expect(result.state.units.find(u => u.id === enemy.id)?.row).toBe(4)
    expect(result.frames.some(frame => frame.event.type === 'freeze' && frame.event.unitId === enemy.id)).toBe(true)
    expect(result.frames.some(frame => frame.event.type === 'attack' && frame.event.unitId === enemy.id)).toBe(false)
  })

  it('adds two current and maximum HP to every ally when Protector appears', () => {
    const state = selectMaster(createInitialGame(31), 'protector')
    state.players.player.kills = 3
    const ally = unit(state, 'player', 'tank', 6, 0)
    const result = resolveRound(state, { row: 5, col: 1, deployment: { type: 'master' } })
    expect(result.state.units.find(u => u.id === ally.id)?.maxHp).toBe(7)
    expect(result.state.units.find(u => u.master && u.owner === 'player')?.maxHp).toBe(5)
  })

  it('applies Detonator damage globally and counts victims', () => {
    const state = selectMaster(createInitialGame(37), 'detonator')
    state.players.player.kills = 3
    const victim = unit(state, 'ai', 'berserker', 3, 2)
    const result = resolveRound(state, { row: 5, col: 0, deployment: { type: 'master' } })
    expect(result.state.units.some(u => u.id === victim.id)).toBe(false)
    expect(result.state.players.player.kills).toBeGreaterThanOrEqual(4)
  })

  it('assassinates the enemy most advanced toward its base', () => {
    const state = selectMaster(createInitialGame(41), 'assassin')
    state.players.player.kills = 3
    const rear = unit(state, 'ai', 'tank', 2, 0)
    const advanced = unit(state, 'ai', 'tank', 7, 1)
    const result = resolveRound(state, { row: 5, col: 2, deployment: { type: 'master' } })
    expect(result.state.units.some(u => u.id === advanced.id)).toBe(false)
    expect(result.state.units.some(u => u.id === rear.id)).toBe(true)
  })

  it('resolves simultaneous Master effects from the same revealed board', () => {
    const state = selectMaster(createInitialGame(43), 'detonator')
    state.players.player.kills = 3
    state.players.ai.hand = []
    state.players.ai.master = 'protector'
    state.players.ai.kills = 3
    const fragile = unit(state, 'ai', 'berserker', 3, 1)
    const result = resolveRound(state, { row: 5, col: 0, deployment: { type: 'master' } })
    expect(result.frames.filter(frame => frame.event.type === 'master')).toHaveLength(2)
    expect(result.state.units.find(u => u.id === fragile.id)?.maxHp).toBe(3)
    expect(result.state.units.some(u => u.id === fragile.id)).toBe(true)
  })

  it('lets a Sniper hit at three cells without moving', () => {
    const state = setup()
    const sniper = unit(state, 'player', 'sniper', 7, 0)
    const target = unit(state, 'ai', 'tank', 4, 0)
    const result = resolveRound(state, place(state))
    expect(result.state.units.find(u => u.id === sniper.id)?.row).toBe(7)
    expect(result.state.units.find(u => u.id === target.id)?.hp).toBe(2)
  })

  it('orders actors by age before their side', () => {
    const state = setup()
    const older = unit(state, 'ai', 'berserker', 4, 0, 0)
    const younger = unit(state, 'player', 'berserker', 5, 0, 1)
    const result = resolveRound(state, place(state))
    expect(result.state.units.some(u => u.id === younger.id)).toBe(false)
    expect(result.state.units.find(u => u.id === older.id)?.row).toBe(5)
  })

  it('permits a forced pass when every home cell is occupied', () => {
    const state = setup()
    for (let row = 5; row <= 9; row++) for (let col = 0; col < 3; col++) unit(state, 'player', 'tank', row, col)
    const result = resolveRound(state, null)
    expect(result.frames.some(frame => frame.event.type === 'pass' && frame.event.owner === 'player')).toBe(true)
  })

  it('recycles the discard when the hand is empty', () => {
    const state = setup()
    state.players.player.hand = state.players.player.hand.slice(0, 1)
    const result = resolveRound(state, place(state))
    expect(result.state.players.player.hand).toHaveLength(1)
    expect(result.state.players.player.discard).toHaveLength(0)
    expect(result.frames.some(frame => frame.event.type === 'recycle' && frame.event.owner === 'player')).toBe(true)
  })

  it('resets simultaneous 0 PV to sudden death, then first score wins', () => {
    const state = setup()
    state.players.player.hp = 1
    state.players.ai.hp = 1
    unit(state, 'player', 'tank', 0, 0)
    unit(state, 'ai', 'tank', 9, 1)
    const result = resolveRound(state, place(state, 8, 2))
    expect(result.state.suddenDeath).toBe(true)
    expect(result.state.players.player.hp).toBe(1)
    expect(result.state.players.ai.hp).toBe(1)
    expect(result.state.winner).toBe(null)

    const sudden = structuredClone(result.state)
    const scorer = unit(sudden, 'player', 'tank', 0, 2)
    const answer = resolveRound(sudden, place(sudden, 8, 1))
    expect(answer.state.winner).toBe('player')
    expect(answer.state.phase).toBe('finished')
    expect(answer.frames.some(frame => frame.event.type === 'score' && frame.event.unitId === scorer.id)).toBe(true)
  })
})
