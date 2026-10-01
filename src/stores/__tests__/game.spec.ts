import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_THINK_MS } from '@/config/ai'
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

  it('pauses the timer while animations play', () => {
    const store = start()
    store.setPresentationBusy(true)
    vi.advanceTimersByTime(5000)
    expect(store.state.turnTimeLeft).toBe(TURN_DURATION_SECONDS)
    store.setPresentationBusy(false)
    vi.advanceTimersByTime(2000)
    expect(store.state.turnTimeLeft).toBe(TURN_DURATION_SECONDS - 2)
  })

  it('freezes the timer and the AI while paused', () => {
    const store = useGameStore()
    store.startQuickMatch({
      rng: () => 0.99,
      firstPlayer: 'player2',
      controllers: { player2: { kind: 'ai', difficulty: 'normal' } },
    })
    store.setPaused(true)
    vi.advanceTimersByTime(30_000)
    expect(store.state.turnTimeLeft).toBe(TURN_DURATION_SECONDS)
    expect(store.state.log).toHaveLength(0)

    store.setPaused(false)
    vi.advanceTimersByTime(AI_THINK_MS)
    expect(store.state.log.length).toBeGreaterThan(0)
  })

  describe('against the AI', () => {
    const startVsAi = (firstPlayer: 'player1' | 'player2') => {
      const store = useGameStore()
      store.startQuickMatch({
        rng: () => 0.99,
        firstPlayer,
        controllers: { player2: { kind: 'ai', difficulty: 'difficile' } },
      })
      return store
    }

    it('plays its turn after thinking', () => {
      const store = startVsAi('player2')
      expect(store.isHumanTurn).toBe(false)
      expect(() => store.attack(store.activeGifs.player2!.attacks[0].id)).toThrow(/ordinateur/)

      vi.advanceTimersByTime(AI_THINK_MS - 1)
      expect(store.state.log).toHaveLength(0)
      vi.advanceTimersByTime(1)
      expect(store.state.log.length).toBeGreaterThan(0)
      expect(store.currentPlayer.id).toBe('player1')
      expect(store.isHumanTurn).toBe(true)
    })

    it('waits for animations before acting', () => {
      const store = startVsAi('player2')
      store.setPresentationBusy(true)
      vi.advanceTimersByTime(AI_THINK_MS * 5)
      expect(store.state.log).toHaveLength(0)

      store.setPresentationBusy(false)
      vi.advanceTimersByTime(AI_THINK_MS)
      expect(store.currentPlayer.id).toBe('player1')
    })

    it('sends its own replacement after a K.O.', () => {
      const store = startVsAi('player1')
      const ai = store.state.players.player2
      ai.team[ai.activeIndex]!.currentHp = 1
      store.attack(store.activeGifs.player1!.attacks[0].id)

      expect(store.state.phase).toBe('awaitingReplacement')
      expect(store.humanReplacementFor).toBeNull()
      vi.advanceTimersByTime(AI_THINK_MS)
      expect(store.state.phase).toBe('battle')
      expect(store.activeGifs.player2!.currentHp).toBeGreaterThan(0)
    })

    it('keeps the controllers for a rematch and clears them on reset', () => {
      const store = startVsAi('player1')
      expect(store.isVsAi).toBe(true)
      store.reset()
      expect(store.isVsAi).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
