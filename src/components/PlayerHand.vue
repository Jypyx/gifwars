<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { CATALOG } from '../game/catalog'
import { playCue } from '../services/audio'

const store = useGameStore()
function choose(id: string): void {
  if (store.busy) return
  store.select({ type: 'card', cardId: id })
  playCue('select')
}
</script>

<template>
  <div class="hand-head"><span>TA MAIN <b>{{ store.game.players.player.hand.length }}</b></span><span class="hand-hint">{{ store.game.phase === 'placement' ? store.selectedName ? 'TOUCHE UNE CASE ÉCLAIRÉE ↑' : 'CHOISIS UN GIF ↓' : 'RÉSOLUTION EN COURS…' }}</span></div>
  <div class="hand-scroll flex overflow-x-auto overflow-y-hidden">
    <button v-for="card in store.game.players.player.hand" :key="card.id" class="hand-card"
      :class="[{ active: store.game.selection?.type === 'card' && store.game.selection.cardId === card.id }, card.archetype]"
      :style="{ '--unit-color': CATALOG[card.archetype].color }"
      :disabled="store.busy || store.game.phase !== 'placement'" @click="choose(card.id)">
      <span class="card-corner">GIF <em>✦</em></span>
      <span class="card-portrait"><img class="gif-portrait" :src="`/gifs/${card.archetype}.gif`" alt="" draggable="false" /><span class="card-glyph">{{ CATALOG[card.archetype].glyph }}</span></span>
      <strong>{{ CATALOG[card.archetype].name }}</strong>
      <span class="card-stats"><span>♥ {{ CATALOG[card.archetype].hp }}</span><span>⚔ {{ CATALOG[card.archetype].attack }}</span><span>◎ {{ CATALOG[card.archetype].range }}</span></span>
    </button>
  </div>
</template>
