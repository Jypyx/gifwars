import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { GIFS_DATA } from '@/data/gifsData'
import { useGameStore } from '@/stores/game'
import SplashView from '@/views/SplashView.vue'

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: SplashView },
      { path: '/combat', name: 'battle', component: { render: () => null } },
    ],
  })
  await router.push('/')
  const wrapper = mount(SplashView, { global: { plugins: [pinia, router] } })
  return { wrapper, router, store: useGameStore() }
}

describe('SplashView', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    useGameStore().reset()
  })

  it('shows the title and a GIF quote', async () => {
    const { wrapper } = await setup()
    expect(wrapper.find('.logo').text()).toBe('GifWars')
    const quote = wrapper.find('blockquote').text()
    expect(GIFS_DATA.some((g) => quote.includes(g.catchphrase))).toBe(true)
  })

  it('opens the difficulty modal, closed by its backdrop', async () => {
    const { wrapper } = await setup()
    await wrapper.find('.play').trigger('click')
    expect(wrapper.findAll('.difficulty')).toHaveLength(3)
    // Only the three difficulties and the cross: no "close" button.
    expect(wrapper.findAll('.panel button')).toHaveLength(4)

    await wrapper.find('[data-testid="backdrop"]').trigger('click')
    expect(wrapper.find('.difficulty').exists()).toBe(false)
  })

  it('starts a match against the chosen difficulty', async () => {
    const { wrapper, router, store } = await setup()
    await wrapper.find('.play').trigger('click')
    await wrapper.findAll('.difficulty')[2]!.trigger('click')
    await flushPromises()

    expect(store.state.phase).toBe('battle')
    expect(store.controllers.player2).toEqual({ kind: 'ai', difficulty: 'difficile' })
    expect(router.currentRoute.value.name).toBe('battle')
  })

  it('shows the rules with a close button and a cross', async () => {
    const { wrapper } = await setup()
    await wrapper.find('.rules-btn').trigger('click')
    expect(wrapper.text()).toContain('Les statuts')
    await wrapper.find('.footer .comic-btn').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.find('.rules-btn').trigger('click')
    await wrapper.find('button[aria-label="Fermer"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
