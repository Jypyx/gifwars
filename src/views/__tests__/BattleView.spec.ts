import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { audioEngine } from '@/audio/AudioEngine'
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
    playerNames: { player1: 'Toi', player2: 'GifBot' },
    controllers: { player2: { kind: 'ai', difficulty: 'normal' } },
  })
  await router.push('/combat')
  const wrapper = mount(BattleView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { store, wrapper, router }
}

const button = (wrapper: Awaited<ReturnType<typeof setup>>['wrapper'], label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe('BattleView', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows both status boxes and prompts the human', async () => {
    const { store, wrapper } = await setup()
    expect(wrapper.find('.enemy-status .name').text()).toBe(store.activeGifs.player2!.name)
    expect(wrapper.find('.player-status .name').text()).toBe(store.activeGifs.player1!.name)
    expect(wrapper.find('.caption').text()).toBe(
      `Que doit faire ${store.activeGifs.player1!.name} ?`,
    )
  })

  it('attacks from the popover and hands the turn to the AI', async () => {
    const { store, wrapper } = await setup()
    await button(wrapper, 'Attaquer').trigger('click')
    const attacks = wrapper.findAll('.popover .attack')
    expect(attacks).toHaveLength(store.activeGifs.player1!.attacks.length)

    await attacks[0]!.trigger('click')
    expect(wrapper.find('.popover').exists()).toBe(false)
    expect(store.state.log.some((e) => e.event.kind === 'attack')).toBe(true)
    expect(store.currentPlayer.id).toBe('player2')
    expect(button(wrapper, 'Attaquer').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.caption').text()).toBe('GifBot réfléchit…')
  })

  it('closes the popover when tapping elsewhere', async () => {
    const { wrapper } = await setup()
    await button(wrapper, 'Attaquer').trigger('click')
    await wrapper.find('.catcher').trigger('click')
    expect(wrapper.find('.popover').exists()).toBe(false)
  })

  it('switches through the switch modal', async () => {
    const { store, wrapper } = await setup()
    await button(wrapper, 'Switch').trigger('click')
    const slots = wrapper.findAll('[role="dialog"] .slot')
    expect(slots[0]!.attributes('disabled')).toBeDefined()

    await slots[1]!.trigger('click')
    expect(store.state.players.player1.activeIndex).toBe(1)
    expect(store.currentPlayer.id).toBe('player2')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('forces a replacement dialog after a K.O., without a close cross', async () => {
    const { store, wrapper } = await setup()
    const human = store.state.players.player1
    human.team[human.activeIndex]!.currentHp = 0
    store.state.phase = 'awaitingReplacement'
    store.state.pendingReplacements = ['player1']
    await flushPromises()

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.text()).toContain('Envoie un remplaçant')
    expect(dialog.find('button[aria-label="Fermer"]').exists()).toBe(false)
    await dialog.findAll('.slot')[1]!.trigger('click')
    expect(store.state.phase).toBe('battle')
  })

  it('pauses the game while the inventory is open', async () => {
    const { store, wrapper } = await setup()
    await button(wrapper, 'Inventaire').trigger('click')
    expect(store.paused).toBe(true)
    expect(wrapper.findAll('.slide')).toHaveLength(5)

    await wrapper.find('.footer .comic-btn').trigger('click')
    expect(store.paused).toBe(false)
  })

  it('asks for confirmation before quitting', async () => {
    const { store, wrapper, router } = await setup()
    await button(wrapper, 'Quitter').trigger('click')
    expect(store.paused).toBe(true)
    expect(wrapper.text()).toContain('Quitter la partie ?')

    await wrapper.find('.footer .danger').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('shows a defeat screen and retries with the same difficulty', async () => {
    const { store, wrapper } = await setup()
    store.state.phase = 'finished'
    store.state.winnerId = 'player2'
    await flushPromises()
    expect(wrapper.find('.verdict').text()).toBe('Défaite…')

    await wrapper.find('.end-screen .retry').trigger('click')
    expect(store.state.phase).toBe('battle')
    expect(store.controllers.player2).toEqual({ kind: 'ai', difficulty: 'normal' })
  })

  describe('sound', () => {
    it('plays arena cues and turns the victory cue into a sad trombone on defeat', async () => {
      const play = vi.spyOn(audioEngine, 'play')
      const { store, wrapper } = await setup()
      const arena = wrapper.findComponent({ name: 'BattleArena' })
      arena.vm.$emit('cue', 'punch')
      expect(play).toHaveBeenCalledWith('punch')

      store.state.phase = 'finished'
      store.state.winnerId = 'player2'
      arena.vm.$emit('cue', 'victory')
      expect(play).toHaveBeenCalledWith('defeat')
    })

    it('ticks during the last seconds of the human turn', async () => {
      const play = vi.spyOn(audioEngine, 'play')
      const { store } = await setup()
      store.state.turnTimeLeft = 5
      await flushPromises()
      expect(play).toHaveBeenCalledWith('tick')
    })

    it('toggles music from the HUD', async () => {
      const { wrapper } = await setup()
      await button(wrapper, 'Couper la musique').trigger('click')
      expect(button(wrapper, 'Activer la musique').exists()).toBe(true)
    })
  })
})
