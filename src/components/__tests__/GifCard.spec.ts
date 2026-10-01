import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GifCard from '@/components/GifCard.vue'
import { GIFS_DATA } from '@/data/gifsData'
import { createGifInstance } from '@/utils/gifs'

const gandalf = () => createGifInstance(GIFS_DATA.find((g) => g.id === 'gandalf')!)

describe('GifCard', () => {
  it('shows identity, stats and every attack in full mode', () => {
    const wrapper = mount(GifCard, { props: { gif: gandalf() } })
    expect(wrapper.find('.name').text()).toBe('Gandalf')
    expect(wrapper.text()).toContain('Le Seigneur des Anneaux')
    expect(wrapper.text()).toContain('Légendaire')
    expect(wrapper.findAll('.attack')).toHaveLength(4)
    expect(wrapper.classes()).toContain('legendary')
    expect(wrapper.classes()).toContain('pattern-zigzag')
  })

  it('hides attacks in compact mode and shows the status', () => {
    const gif = gandalf()
    gif.status = { effect: 'Lag', turnsLeft: 2 }
    const wrapper = mount(GifCard, { props: { gif, variant: 'compact' } })
    expect(wrapper.find('.attacks').exists()).toBe(false)
    expect(wrapper.find('.status').text()).toContain('Lag')
  })

  it('stamps K.O. GIFs', () => {
    const gif = gandalf()
    gif.currentHp = 0
    const wrapper = mount(GifCard, { props: { gif, variant: 'mini' } })
    expect(wrapper.classes()).toContain('ko')
    expect(wrapper.find('.ko-stamp').exists()).toBe(true)
  })
})
