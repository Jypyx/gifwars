<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { CATALOG } from '../game/catalog'
import { playCue } from '../services/audio'
import { assetUrl } from '../services/urls'
import type { Archetype } from '../game/types'

const emit = defineEmits<{
  hover: [cardId: string, kind: Archetype, x: number, y: number]
  leave: []
}>()

const store = useGameStore()
function choose(id: string): void {
  if (store.busy || store.game.phase !== 'placement') return
  store.select({ type: 'card', cardId: id })
  playCue('select')
}
function focusCard(event: FocusEvent, cardId: string, kind: Archetype): void {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  emit('hover', cardId, kind, bounds.left + bounds.width / 2, bounds.top)
}
</script>

<template>
  <div class="hand-head"><span>TA MAIN <b>{{ store.game.players.player.hand.length }}</b></span><span class="hand-hint">{{ store.game.phase === 'placement' ? store.selectedName ? 'TOUCHE UNE CASE ÉCLAIRÉE ↑' : 'CHOISIS UN GIF ↓' : 'RÉSOLUTION EN COURS…' }}</span></div>
  <div class="hand-scroll flex overflow-x-auto overflow-y-hidden">
    <button v-for="card in store.game.players.player.hand" :key="card.id" class="hand-card"
      :class="[{ active: store.game.selection?.type === 'card' && store.game.selection.cardId === card.id }, card.archetype]"
      :style="{ '--unit-color': CATALOG[card.archetype].color }"
      :aria-disabled="store.busy || store.game.phase !== 'placement'" @click="choose(card.id)"
      @pointerenter="emit('hover', card.id, card.archetype, $event.clientX, $event.clientY)"
      @pointermove="emit('hover', card.id, card.archetype, $event.clientX, $event.clientY)"
      @pointerleave="emit('leave')" @focus="focusCard($event, card.id, card.archetype)" @blur="emit('leave')">
      <span class="card-corner">GIF <em>✦</em></span>
      <span class="card-portrait"><img class="gif-portrait" :src="assetUrl(`gifs/${card.archetype}.gif`)" alt="" draggable="false" /><span class="card-glyph">{{ CATALOG[card.archetype].glyph }}</span></span>
      <strong>{{ CATALOG[card.archetype].name }}</strong>
      <span class="card-stats"><span>♥ {{ CATALOG[card.archetype].hp }}</span><span>⚔ {{ CATALOG[card.archetype].attack }}</span><span>◎ {{ CATALOG[card.archetype].range }}</span></span>
    </button>
  </div>
</template>
