<script setup lang="ts">
import { MASTERS, CATALOG } from '../game/catalog'
import type { MasterKind } from '../game/types'
import { playCue } from '../services/audio'

defineProps<{ error?: string }>()
defineEmits<{ choose: [kind: MasterKind] }>()
</script>

<template>
  <div class="master-overlay absolute inset-0 flex items-center justify-center">
    <div class="master-panel">
      <div class="overlay-kicker"><span class="blink-square" /> SÉLECTION DU COMMANDANT · 01/05</div>
      <div class="overlay-title"><span>CHOISIS TON</span><strong>MASTER GIF<span>✦</span></strong></div>
      <p class="overlay-intro">Détruis <b>3 Gifs adverses</b> pour le débloquer. Son pouvoir global s’active dès son arrivée sur la ligne 1.</p>
      <div class="master-list flex flex-col">
        <button v-for="kind in MASTERS" :key="kind" class="master-option" :style="{ '--master-color': CATALOG[kind].color }"
          @click="playCue('select'); $emit('choose', kind)">
          <span class="option-glyph">{{ CATALOG[kind].glyph }}</span>
          <span class="option-text"><strong>{{ CATALOG[kind].name }}</strong><small>{{ CATALOG[kind].description }}</small></span>
          <span class="option-arrow">›</span>
        </button>
      </div>
      <p v-if="error" role="alert" class="mt-3 border border-rose-400 bg-rose-950 p-2 text-xs text-rose-100">{{ error }}</p>
      <div class="master-foot"><span>3 PV</span><span>2 ATK</span><span>PORTÉE 2</span><span>1 INVOCATION</span></div>
    </div>
  </div>
</template>
