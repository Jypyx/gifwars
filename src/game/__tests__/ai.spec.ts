import { describe, expect, it } from 'vitest'
import { GIFS_DATA } from '@/data/gifsData'
import { chooseAiAction, chooseAiReplacement } from '@/game/ai'
import {
  activeGifOf,
  chooseReplacement,
  createIdleState,
  createQuickMatchState,
  getActionError,
  performTurn,
  type Rng,
} from '@/game/engine'
import type { AiDifficulty, GameState, GifCard, PlayerId } from '@/types'
import { createGifInstance } from '@/utils/gifs'

const seededRng =
  (seed: number): Rng =>
  () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
const neverRng: Rng = () => 0.99

const instance = (id: string): GifCard => createGifInstance(GIFS_DATA.find((g) => g.id === id)!)

function makeState(
  team1 = ['gandalf', 'merry', 'jim', 'han', 'walter'],
  team2 = ['vader', 'pippin', 'ron', 'jesse', 'dwight'],
): GameState {
  const state = createIdleState()
  state.players.player1.team = team1.map(instance)
  state.players.player2.team = team2.map(instance)
  state.phase = 'battle'
  state.currentPlayerId = 'player1'
  state.turnNumber = 1
  return state
}

const p1Active = (s: GameState) => activeGifOf(s.players.player1)
const p2Active = (s: GameState) => activeGifOf(s.players.player2)

describe('chooseAiAction', () => {
  it('finishes a weakened target with the cheapest attack', () => {
    const state = makeState()
    p2Active(state).currentHp = 10
    expect(chooseAiAction(state, 'player1', 'difficile', neverRng)).toEqual({
      kind: 'attack',
      attackId: 'gandalf-staff',
    })
  })

  it('opens with the special attack on a healthy target', () => {
    expect(chooseAiAction(makeState(), 'player1', 'difficile', neverRng)).toEqual({
      kind: 'attack',
      attackId: 'gandalf-shall-not-pass',
    })
  })

  it('never picks an exhausted attack', () => {
    const state = makeState()
    const special = p1Active(state).attacks.find((a) => a.type === 'Spéciale')!
    special.currentUses = 0
    const action = chooseAiAction(state, 'player1', 'difficile', neverRng)
    expect(action).not.toEqual({ kind: 'attack', attackId: special.id })
    expect(getActionError(state, action)).toBeNull()
  })

  /** Gandalf without his special, slowed by Lag and facing a lethal threat. */
  const crippledGandalf = () => {
    const state = makeState()
    const gandalf = p1Active(state)
    gandalf.currentHp = 40
    gandalf.status = { effect: 'Lag', turnsLeft: 2 }
    gandalf.attacks.find((a) => a.type === 'Spéciale')!.currentUses = 0
    return state
  }

  it('retreats a crippled, doomed GIF on hard difficulty', () => {
    const state = crippledGandalf()
    expect(chooseAiAction(state, 'player1', 'difficile', neverRng).kind).toBe('switch')
    expect(chooseAiAction(state, 'player1', 'facile', neverRng).kind).toBe('attack')
  })

  it('lets an almost empty GIF fire its best shot instead of retreating', () => {
    const state = makeState()
    p1Active(state).currentHp = 5
    p1Active(state).status = { effect: 'Boucle', turnsLeft: 2 }
    expect(chooseAiAction(state, 'player1', 'difficile', neverRng)).toEqual({
      kind: 'attack',
      attackId: 'gandalf-shall-not-pass',
    })
  })

  it('prefers a K.O. over retreating', () => {
    const state = crippledGandalf()
    p2Active(state).currentHp = 10
    expect(chooseAiAction(state, 'player1', 'difficile', neverRng).kind).toBe('attack')
  })
})

describe('chooseAiReplacement', () => {
  it('sends a GIF able to finish the opposing one', () => {
    const state = makeState()
    p1Active(state).currentHp = 0
    p2Active(state).currentHp = 14
    const index = chooseAiReplacement(state, 'player1', 'difficile', neverRng)
    const chosen = state.players.player1.team[index]!
    expect(chosen.currentHp).toBeGreaterThan(0)
    expect(Math.max(...chosen.attacks.map((a) => a.damage))).toBeGreaterThanOrEqual(14)
  })

  it.each(['facile', 'normal', 'difficile'] as const)(
    'only picks alive GIFs (%s)',
    (difficulty) => {
      const state = makeState()
      state.players.player1.team.forEach((g, i) => (g.currentHp = i === 3 ? 20 : 0))
      expect(chooseAiReplacement(state, 'player1', difficulty, seededRng(7))).toBe(3)
    },
  )
})

/** Plays a whole AI vs AI match. Throws if the AI ever picks an illegal action. */
function simulate(seed: number, difficulties: Record<PlayerId, AiDifficulty>): PlayerId {
  const rng = seededRng(seed)
  const state = createQuickMatchState(rng)
  for (let step = 0; step < 1000 && state.phase !== 'finished'; step++) {
    if (state.phase === 'awaitingReplacement') {
      for (const id of state.pendingReplacements) {
        chooseReplacement(state, id, chooseAiReplacement(state, id, difficulties[id], rng))
      }
    } else {
      const id = state.currentPlayerId
      performTurn(state, chooseAiAction(state, id, difficulties[id], rng), rng)
    }
  }
  if (!state.winnerId) throw new Error(`Seed ${seed}: the match did not end`)
  return state.winnerId
}

describe('AI vs AI', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(['facile', 'normal', 'difficile'] as const)(
    'always plays legal moves until the end (%s)',
    (difficulty) => {
      for (const seed of seeds.slice(0, 20)) {
        expect(() => simulate(seed, { player1: difficulty, player2: difficulty })).not.toThrow()
      }
    },
  )

  it('hard beats easy most of the time', () => {
    // Alternate sides so first-player and draw luck even out.
    const wins = seeds.filter((seed) =>
      seed % 2 === 0
        ? simulate(seed, { player1: 'difficile', player2: 'facile' }) === 'player1'
        : simulate(seed, { player1: 'facile', player2: 'difficile' }) === 'player2',
    ).length
    expect(wins / seeds.length).toBeGreaterThan(0.65)
  })
})
