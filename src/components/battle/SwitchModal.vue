<script setup lang="ts">
import GameModal from '@/components/ui/GameModal.vue'
import type { GifCard } from '@/types'
import TeamBench from './TeamBench.vue'

defineProps<{
  open: boolean
  team: readonly GifCard[]
  activeIndex: number
  /** Forced replacement after a K.O.: cannot be dismissed. */
  forced: boolean
  canSelect: (index: number) => boolean
}>()

defineEmits<{ select: [index: number]; close: [] }>()
</script>

<template>
  <GameModal
    :open="open"
    :title="forced ? 'K.O. ! Envoie un remplaçant' : 'Changer de GIF'"
    :closable="!forced"
    @close="$emit('close')"
  >
    <p class="hint">
      {{ forced ? 'Le remplacement ne consomme pas ton tour.' : 'Le switch consomme ton tour.' }}
    </p>
    <TeamBench
      class="bench"
      :team="team"
      :active-index="activeIndex"
      :can-select="canSelect"
      @select="$emit('select', $event)"
    />
  </GameModal>
</template>

<style scoped>
.hint {
  margin-bottom: 0.8em;
  font-size: 0.9em;
  font-style: italic;
}

.bench {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  font-size: 0.8em;
}
</style>
