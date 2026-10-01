import { describe, expect, it } from 'vitest'
import { ATTACK_LAYOUT_BY_RARITY, QUICK_MATCH_RARITY_SLOTS, TEAM_SIZE } from '@/config/gameRules'
import { GIFS_DATA } from '@/data/gifsData'
import { SYNERGIES } from '@/data/synergies'
import { UNIVERSES } from '@/data/universes'

describe('GIFS_DATA', () => {
  it('contains at least 10 GIFs with unique ids', () => {
    expect(GIFS_DATA.length).toBeGreaterThanOrEqual(10)
    expect(new Set(GIFS_DATA.map((g) => g.id)).size).toBe(GIFS_DATA.length)
  })

  it('has globally unique attack ids', () => {
    const ids = GIFS_DATA.flatMap((g) => g.attacks.map((a) => a.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(GIFS_DATA.map((g) => [g.id, g] as const))('%s follows the GDD rules', (_, gif) => {
    expect(gif.attacks.map((a) => a.type)).toEqual(ATTACK_LAYOUT_BY_RARITY[gif.rarity])
    expect(gif.currentHp).toBe(gif.maxHp)
    expect(gif.status).toBeNull()
    expect(UNIVERSES[gif.universe]).toBeDefined()
    expect(gif.gifUrl).toMatch(/^https:\/\/media\.giphy\.com\/media\/\w+\/200\.gif$/)

    for (const attack of gif.attacks) {
      expect(attack.damage).toBeGreaterThan(0)
      expect(attack.currentUses).toBe(attack.maxUses)
    }
    // Physical attacks, and only them, are unlimited; specials are single-use.
    expect(gif.attacks.map((a) => a.maxUses === null)).toEqual(
      gif.attacks.map((a) => a.type === 'Physique'),
    )
    expect(gif.attacks.filter((a) => a.type === 'Spéciale').every((a) => a.maxUses === 1)).toBe(
      true,
    )
  })

  it('can supply two Quick Match teams without duplicates', () => {
    expect(QUICK_MATCH_RARITY_SLOTS).toHaveLength(TEAM_SIZE)
    const pool = [...GIFS_DATA]
    for (let player = 0; player < 2; player++) {
      for (const slot of QUICK_MATCH_RARITY_SLOTS) {
        const index = pool.findIndex((g) => slot.includes(g.rarity))
        expect(index, `no GIF left for slot ${slot.join('/')}`).toBeGreaterThanOrEqual(0)
        pool.splice(index, 1)
      }
    }
  })
})

describe('SYNERGIES', () => {
  it('only references existing GIFs', () => {
    const ids = new Set(GIFS_DATA.map((g) => g.id))
    for (const synergy of SYNERGIES) {
      expect(synergy.gifIds.length).toBeGreaterThanOrEqual(2)
      for (const id of synergy.gifIds) expect(ids.has(id), `${synergy.id} → ${id}`).toBe(true)
    }
  })
})
