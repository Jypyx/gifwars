import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import BattleView from '@/views/BattleView.vue'

// PixiJS needs a real canvas / WebGL: the arena is replaced by an empty stub.
vi.mock('@/components/battle/BattleArena.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'BattleArena',
      render: () => h('div', { class: 'arena-stub' }),
    }),
  }
})

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { render: () => null } },
      { path: '/combat', name: 'battle', component: BattleView },
    ],
  })
  const store = useGameStore()
  store.startQuickMatch({
    rng: () => 0.99,
    firstPlayer: 'player1',
    playerNames: { player1: 'Alice', player2: 'Bob' },
  })
  await router.push('/combat')
  const wrapper = mount(BattleView, { global: { plugins: [pinia, router] } })
  return { store, wrapper }
}

describe('BattleView', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows whose turn it is', async () => {
    const { wrapper } = await setup()
    expect(wrapper.find('.turn-title').text()).toContain('Alice')
    expect(wrapper.findAll('.fighter-panel')).toHaveLength(2)
  })

  it('attacks with the clicked move and hands the turn over', async () => {
    const { store, wrapper } = await setup()
    await wrapper.find('.attacks .attack').trigger('click')
    await flushPromises()

    expect(store.state.log.some((e) => e.event.kind === 'attack')).toBe(true)
    expect(wrapper.find('.turn-title').text()).toContain('Bob')
  })

  it('switches through the Switch tab', async () => {
    const { store, wrapper } = await setup()
    const tabs = wrapper.findAll('.tab')
    await tabs[1]!.trigger('click')
    const slots = wrapper.findAll('.bench .slot')
    expect(slots[0]!.attributes('disabled')).toBeDefined()

    await slots[1]!.trigger('click')
    expect(store.state.players.player1.activeIndex).toBe(1)
    expect(store.state.currentPlayerId).toBe('player2')
  })

  it('asks for a replacement after a K.O.', async () => {
    const { store, wrapper } = await setup()
    const p2 = store.state.players.player2
    p2.team[p2.activeIndex]!.currentHp = 1
    await wrapper.find('.attacks .attack').trigger('click')
    await flushPromises()

    expect(wrapper.find('.dialog').text()).toContain('Bob, envoie un remplaçant')
    await wrapper.findAll('.dialog .slot')[1]!.trigger('click')
    expect(store.state.phase).toBe('battle')
    expect(wrapper.find('.dialog').exists()).toBe(false)
  })
})
