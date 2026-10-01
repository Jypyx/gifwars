import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEAM_SIZE, TURN_DURATION_SECONDS } from '@/config/gameRules'
import { useGameStore } from '@/stores/game'

describe('useGameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const start = () => {
    const store = useGameStore()
    store.startQuickMatch({ rng: () => 0.99, firstPlayer: 'player1' })
    return store
  }

  it('starts a Quick Match with two full teams', () => {
    const store = start()
    expect(store.state.phase).toBe('battle')
    expect(store.state.players.player1.team).toHaveLength(TEAM_SIZE)
    expect(store.state.players.player2.team).toHaveLength(TEAM_SIZE)
    expect(store.currentPlayer.id).toBe('player1')
    expect(store.activeGifs.player1).toBeDefined()
  })

  it('counts down and auto-attacks when the timer runs out', () => {
    const store = start()
    vi.advanceTimersByTime(5000)
    expect(store.state.turnTimeLeft).toBe(TURN_DURATION_SECONDS - 5)

    vi.advanceTimersByTime((TURN_DURATION_SECONDS - 5) * 1000)
    expect(store.state.log.map((e) => e.event.kind)).toEqual(['timeout', 'attack'])
    expect(store.currentPlayer.id).toBe('player2')
    expect(store.state.turnTimeLeft).toBe(TURN_DURATION_SECONDS)
  })

  it('applies player actions and exposes validation', () => {
    const store = start()
    const physical = store.activeGifs.player1!.attacks[0]
    expect(store.actionError({ kind: 'attack', attackId: physical.id })).toBeNull()
    expect(store.isSwitchAllowed(store.state.players.player1.activeIndex)).toBe(false)

    store.attack(physical.id)
    expect(store.currentPlayer.id).toBe('player2')
    store.switchTo(1)
    expect(store.state.players.player2.activeIndex).toBe(1)
  })

  it('stops the timer on reset', () => {
    const store = start()
    expect(vi.getTimerCount()).toBe(1)
    store.reset()
    expect(vi.getTimerCount()).toBe(0)
    expect(store.state.phase).toBe('idle')
  })
})
