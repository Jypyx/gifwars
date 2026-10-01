import { describe, expect, it } from 'vitest'
import { GIFS_DATA } from '@/data/gifsData'
import { createGifInstance } from '@/utils/gifs'
import { detectSynergies } from '@/utils/synergy'

const pick = (...ids: string[]) =>
  ids.map((id) => {
    const gif = GIFS_DATA.find((g) => g.id === id)
    if (!gif) throw new Error(`Unknown GIF ${id}`)
    return createGifInstance(gif)
  })

describe('detectSynergies', () => {
  it('activates Merry + Pippin', () => {
    const ids = detectSynergies(pick('merry', 'pippin', 'jim', 'han', 'walter')).map((s) => s.id)
    expect(ids).toEqual(['second-breakfast'])
  })

  it('can activate several synergies sharing a GIF', () => {
    const ids = detectSynergies(pick('merry', 'pippin', 'gandalf', 'ron', 'han')).map((s) => s.id)
    expect(ids).toEqual(['second-breakfast', 'fool-of-a-took'])
  })

  it('ignores K.O. members', () => {
    const team = pick('merry', 'pippin', 'jim', 'han', 'walter')
    team[1]!.currentHp = 0
    expect(detectSynergies(team)).toEqual([])
  })
})

describe('createGifInstance', () => {
  it('returns an independent copy', () => {
    const source = GIFS_DATA.find((g) => g.id === 'gandalf')!
    const instance = createGifInstance(source)
    if (instance.rarity !== 'Légendaire' || source.rarity !== 'Légendaire') throw new Error()
    instance.currentHp = 1
    instance.attacks[3].currentUses = 0
    expect(source.currentHp).toBe(source.maxHp)
    expect(source.attacks[3].currentUses).toBe(1)
  })
})
