import { describe, expect, it } from 'vitest'
import { GIFS_DATA } from '@/data/gifsData'
import { createEventDescriber } from '@/game/describeEvent'
import { createIdleState } from '@/game/engine'
import type { BattleEvent } from '@/types'
import { createGifInstance } from '@/utils/gifs'

const state = createIdleState()
state.players.player1.name = 'Alice'
state.players.player1.team = ['gandalf', 'merry'].map((id) =>
  createGifInstance(GIFS_DATA.find((g) => g.id === id)!),
)
state.players.player2.team = ['vader', 'pippin'].map((id) =>
  createGifInstance(GIFS_DATA.find((g) => g.id === id)!),
)
const describeEntry = createEventDescriber(state.players)
const text = (event: BattleEvent) => describeEntry({ turn: 1, playerId: 'player1', event })

describe('createEventDescriber', () => {
  it('uses GIF and attack names', () => {
    expect(
      text({
        kind: 'attack',
        attackerId: 'gandalf',
        targetId: 'vader',
        attackId: 'gandalf-shall-not-pass',
        damage: 50,
      }),
    ).toBe('Gandalf utilise Vous ne passerez pas ! : 50 dégâts à Dark Vador !')
  })

  it('describes statuses, synergies and victory', () => {
    expect(text({ kind: 'statusApplied', targetId: 'vader', effect: 'BadBuzz' })).toBe(
      'Dark Vador subit Bad Buzz !',
    )
    expect(
      text({ kind: 'synergyHeal', synergyId: 'second-breakfast', gifId: 'merry', amount: 1 }),
    ).toBe('Second petit-déjeuner : Merry récupère 1 PV.')
    expect(text({ kind: 'victory', winnerId: 'player1' })).toBe('Alice remporte la partie !')
  })
})
