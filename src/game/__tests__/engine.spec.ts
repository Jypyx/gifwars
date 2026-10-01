import { describe, expect, it } from 'vitest'
import { STATUS_RULES, TEAM_SIZE, TURN_DURATION_SECONDS } from '@/config/gameRules'
import { GIFS_DATA } from '@/data/gifsData'
import {
  chooseReplacement,
  createIdleState,
  drawQuickMatchTeams,
  handleTimeout,
  performTurn,
  type Rng,
} from '@/game/engine'
import type { GameState, GifCard } from '@/types'
import { createGifInstance } from '@/utils/gifs'

/** Rolls that never trigger anything (no status applied, no Lag, no Boucle miss). */
const neverRng: Rng = () => 0.99
/** Rolls that always trigger every chance-based effect. */
const alwaysRng: Rng = () => 0

/** Small deterministic PRNG (LCG) for draw tests. */
const seededRng =
  (seed: number): Rng =>
  () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }

const instance = (id: string): GifCard => createGifInstance(GIFS_DATA.find((g) => g.id === id)!)

/** Teams chosen so that no synergy is active, unless a test adds one. */
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

const p1Active = (s: GameState) => s.players.player1.team[s.players.player1.activeIndex]!
const p2Active = (s: GameState) => s.players.player2.team[s.players.player2.activeIndex]!
const lastLog = (s: GameState) => s.log[s.log.length - 1]!
const usesOf = (gif: GifCard, attackId: string) =>
  gif.attacks.find((a) => a.id === attackId)!.currentUses

describe('drawQuickMatchTeams', () => {
  it.each([1, 2, 3, 42, 1337])('draws two disjoint balanced teams (seed %i)', (seed) => {
    const teams = drawQuickMatchTeams(GIFS_DATA, seededRng(seed))
    expect(teams).toHaveLength(2)
    for (const team of teams) {
      expect(team).toHaveLength(TEAM_SIZE)
      const count = (...rarities: string[]) =>
        team.filter((g) => rarities.includes(g.rarity)).length
      expect(count('Commun')).toBe(2)
      expect(count('Rare')).toBe(2)
      expect(count('Épique', 'Légendaire')).toBe(1)
    }
    const ids = teams.flat().map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('throws when the catalogue cannot fill every slot', () => {
    const commons = GIFS_DATA.filter((g) => g.rarity === 'Commun')
    expect(() => drawQuickMatchTeams(commons, neverRng)).toThrow(/Catalogue too small/)
  })
})

describe('performTurn — attacks', () => {
  it('deals damage, hands the turn over and resets the timer', () => {
    const state = makeState()
    state.turnTimeLeft = 3
    performTurn(state, { kind: 'attack', attackId: 'gandalf-staff' }, neverRng)

    expect(p2Active(state).currentHp).toBe(135 - 16)
    expect(state.currentPlayerId).toBe('player2')
    expect(state.turnNumber).toBe(2)
    expect(state.turnTimeLeft).toBe(TURN_DURATION_SECONDS)
    expect(lastLog(state).event).toMatchObject({ kind: 'attack', damage: 16 })
    expect(lastLog(state).onomatopoeia).toBeTruthy()
  })

  it('consumes limited uses and rejects exhausted attacks', () => {
    const state = makeState()
    performTurn(state, { kind: 'attack', attackId: 'gandalf-shall-not-pass' }, neverRng)
    expect(usesOf(p1Active(state), 'gandalf-shall-not-pass')).toBe(0)

    performTurn(state, { kind: 'attack', attackId: 'vader-saber' }, neverRng)
    expect(() =>
      performTurn(state, { kind: 'attack', attackId: 'gandalf-shall-not-pass' }, neverRng),
    ).toThrow(/plus d’utilisations/)
    expect(state.currentPlayerId).toBe('player1')
  })

  it('rejects attacks that the active GIF does not own', () => {
    expect(() =>
      performTurn(makeState(), { kind: 'attack', attackId: 'vader-saber' }, neverRng),
    ).toThrow(/inconnue/)
  })
})

describe('performTurn — switch', () => {
  it('changes the active GIF and consumes the turn', () => {
    const state = makeState()
    performTurn(state, { kind: 'switch', targetIndex: 2 }, neverRng)
    expect(p1Active(state).id).toBe('jim')
    expect(state.currentPlayerId).toBe('player2')
    expect(p2Active(state).currentHp).toBe(p2Active(state).maxHp)
  })

  it('refuses switching to the active or a K.O. GIF', () => {
    const state = makeState()
    state.players.player1.team[1]!.currentHp = 0
    expect(() => performTurn(state, { kind: 'switch', targetIndex: 0 }, neverRng)).toThrow(
      /déjà au combat/,
    )
    expect(() => performTurn(state, { kind: 'switch', targetIndex: 1 }, neverRng)).toThrow(/K.O./)
    expect(() => performTurn(state, { kind: 'switch', targetIndex: 9 }, neverRng)).toThrow(
      /inconnu/,
    )
  })
})

describe('status effects', () => {
  it('applies the attack status on a successful roll', () => {
    const state = makeState()
    performTurn(state, { kind: 'attack', attackId: 'gandalf-fireworks' }, alwaysRng)
    expect(p2Active(state).status).toEqual({
      effect: 'Lag',
      turnsLeft: STATUS_RULES.Lag.durationTurns,
    })
  })

  it('does not stack statuses', () => {
    const state = makeState()
    p2Active(state).status = { effect: 'BadBuzz', turnsLeft: 3 }
    performTurn(state, { kind: 'attack', attackId: 'gandalf-fireworks' }, alwaysRng)
    expect(p2Active(state).status?.effect).toBe('BadBuzz')
  })

  it('Lag can skip the turn without consuming the attack', () => {
    const state = makeState()
    state.currentPlayerId = 'player2'
    p2Active(state).status = { effect: 'Lag', turnsLeft: 2 }
    performTurn(state, { kind: 'attack', attackId: 'vader-choke' }, alwaysRng)

    expect(state.log.some((e) => e.event.kind === 'turnSkipped')).toBe(true)
    expect(p1Active(state).currentHp).toBe(p1Active(state).maxHp)
    expect(usesOf(p2Active(state), 'vader-choke')).toBe(3)
    expect(p2Active(state).status?.turnsLeft).toBe(1)
    expect(state.currentPlayerId).toBe('player1')
  })

  it('Boucle can make the attacker miss and hurt itself', () => {
    const state = makeState()
    state.currentPlayerId = 'player2'
    p2Active(state).status = { effect: 'Boucle', turnsLeft: 2 }
    performTurn(state, { kind: 'attack', attackId: 'vader-saber' }, alwaysRng)

    const selfDamage = Math.round(17 * STATUS_RULES.Boucle.selfDamageRatio)
    expect(p2Active(state).currentHp).toBe(135 - selfDamage)
    expect(p1Active(state).currentHp).toBe(p1Active(state).maxHp)
  })

  it('Bad Buzz drains HP at the end of the owner’s turn, then expires', () => {
    const state = makeState()
    state.currentPlayerId = 'player2'
    p2Active(state).status = { effect: 'BadBuzz', turnsLeft: 1 }
    performTurn(state, { kind: 'attack', attackId: 'vader-saber' }, neverRng)

    expect(p2Active(state).currentHp).toBe(135 - Math.round(135 * 0.08))
    expect(p2Active(state).status).toBeNull()
    expect(lastLog(state).event.kind).toBe('statusExpired')
  })
})

describe('K.O., replacement and victory', () => {
  it('forces a replacement that does not consume the next turn', () => {
    const state = makeState()
    p2Active(state).currentHp = 1
    performTurn(state, { kind: 'attack', attackId: 'gandalf-staff' }, neverRng)

    expect(state.phase).toBe('awaitingReplacement')
    expect(state.pendingReplacements).toEqual(['player2'])
    expect(state.currentPlayerId).toBe('player2')
    expect(() => performTurn(state, { kind: 'attack', attackId: 'vader-saber' }, neverRng)).toThrow(
      /Aucun tour/,
    )

    expect(() => chooseReplacement(state, 'player2', 0)).toThrow(/invalide/)
    chooseReplacement(state, 'player2', 1)
    expect(state.phase).toBe('battle')
    expect(p2Active(state).id).toBe('pippin')
    expect(state.currentPlayerId).toBe('player2')
  })

  it('can require both players to replace at once', () => {
    const state = makeState()
    p2Active(state).currentHp = 1
    p1Active(state).currentHp = 1
    p1Active(state).status = { effect: 'BadBuzz', turnsLeft: 3 }
    performTurn(state, { kind: 'attack', attackId: 'gandalf-staff' }, neverRng)
    expect(state.pendingReplacements).toEqual(['player1', 'player2'])
  })

  it('ends the game when every opposing GIF is K.O.', () => {
    const state = makeState()
    state.players.player2.team.forEach((g) => (g.currentHp = 0))
    p2Active(state).currentHp = 1
    performTurn(state, { kind: 'attack', attackId: 'gandalf-staff' }, neverRng)

    expect(state.phase).toBe('finished')
    expect(state.winnerId).toBe('player1')
    expect(lastLog(state).event).toEqual({ kind: 'victory', winnerId: 'player1' })
  })
})

describe('handleTimeout', () => {
  it('launches the basic physical attack', () => {
    const state = makeState()
    handleTimeout(state, neverRng)
    expect(state.log.map((e) => e.event.kind)).toEqual(['timeout', 'attack'])
    expect(p2Active(state).currentHp).toBe(135 - 16)
    expect(state.currentPlayerId).toBe('player2')
  })

  it('sends the first available GIF when a replacement is pending', () => {
    const state = makeState()
    state.players.player2.team[1]!.currentHp = 0
    p2Active(state).currentHp = 1
    performTurn(state, { kind: 'attack', attackId: 'gandalf-staff' }, neverRng)
    handleTimeout(state, neverRng)
    expect(state.phase).toBe('battle')
    expect(p2Active(state).id).toBe('ron')
  })
})

describe('synergies', () => {
  it('heal damaged members at the end of their team’s turn', () => {
    const state = makeState(['merry', 'pippin', 'jim', 'han', 'walter'])
    state.players.player1.team[1]!.currentHp = 50
    performTurn(state, { kind: 'attack', attackId: 'merry-pint' }, neverRng)
    expect(state.players.player1.team[1]!.currentHp).toBe(51)
    expect(p1Active(state).currentHp).toBe(p1Active(state).maxHp)
  })
})
