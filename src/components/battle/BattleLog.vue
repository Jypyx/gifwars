<script setup lang="ts">
import { computed } from 'vue'
import { createEventDescriber } from '@/game/describeEvent'
import type { BattleLogEntry, Player, PlayerId } from '@/types'

const props = withDefaults(
  defineProps<{
    log: readonly BattleLogEntry[]
    players: Record<PlayerId, Player>
    limit?: number
  }>(),
  { limit: 8 },
)

const describe = computed(() => createEventDescriber(props.players))

/** Newest first. */
const entries = computed(() =>
  props.log
    .map((entry, index) => ({ entry, index }))
    .slice(-props.limit)
    .reverse(),
)
</script>

<template>
  <ol class="log" aria-live="polite" aria-label="Journal du combat">
    <li v-for="{ entry, index } in entries" :key="index" class="line" :class="entry.playerId">
      <span class="turn">T{{ entry.turn }}</span>
      <span class="text">{{ describe(entry) }}</span>
    </li>
    <li v-if="entries.length === 0" class="line empty">Que le combat commence !</li>
  </ol>
</template>

<style scoped>
.log {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.line {
  display: flex;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  background: var(--pop-yellow);
  border: 2px solid var(--ink);
  border-left-width: 8px;
  font-size: 0.85rem;
  line-height: 1.25;
}

.line:first-child {
  font-weight: 700;
}

.line.player1 {
  border-left-color: var(--player1);
}

.line.player2 {
  border-left-color: var(--player2);
}

.line.empty {
  font-style: italic;
}

.turn {
  flex-shrink: 0;
  font-family: var(--font-display);
  letter-spacing: 0.03em;
}
</style>
