import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MASTERS } from '../src/game/catalog'
import { useGameStore } from '../src/stores/gameStore'

beforeEach(() => { setActivePinia(createPinia()) })

describe('game store integration', () => {
  it.each(MASTERS)('leaves Master selection after choosing %s through Pinia', kind => {
    const store = useGameStore()
    store.newGame(1234)

    expect(store.chooseMaster(kind)).toEqual({ ok: true })
    expect(store.game.phase).toBe('placement')
    expect(store.game.players.player.master).toBe(kind)
    expect(store.game.players.player.hand).toHaveLength(7)
  })

  it('deploys and resolves successive rounds through reactive state', () => {
    const store = useGameStore()
    store.newGame(1234)
    expect(store.chooseMaster('strategist')).toEqual({ ok: true })

    for (let round = 1; round <= 3; round++) {
      const card = store.game.players.player.hand[0]!
      expect(store.select({ type: 'card', cardId: card.id })).toEqual({ ok: true })
      const at = store.validCells.at(-1)!
      expect(store.commit(at.row, at.col)).toEqual({ ok: true })
      expect(store.busy).toBe(true)
      expect(store.game.phase).toBe('revealing')
      expect(store.commit(at.row, at.col).ok).toBe(false)

      const reveal = store.replay.find(frame => frame.event.type === 'reveal')!
      const snapshot = structuredClone(reveal.state)
      store.finishReplay()

      expect(store.busy).toBe(false)
      expect(store.game.phase).toBe('placement')
      expect(store.game.round).toBe(round + 1)
      expect(store.game.players.player.hand).toHaveLength(7 - round)
      expect(reveal.state).toEqual(snapshot)
    }
  })
})
