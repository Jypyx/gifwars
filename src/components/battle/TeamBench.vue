<script setup lang="ts">
import GifCardView from '@/components/GifCard.vue'
import type { GifCard } from '@/types'
import { isKnockedOut } from '@/utils/gifs'

defineProps<{
  team: readonly GifCard[]
  activeIndex: number
  disabled?: boolean
  /** Whether the GIF at `index` can be sent into the fight. */
  canSelect: (index: number) => boolean
}>()

defineEmits<{ select: [index: number] }>()
</script>

<template>
  <ul class="bench">
    <li v-for="(gif, index) in team" :key="gif.id">
      <button
        type="button"
        class="slot"
        :class="{ current: index === activeIndex }"
        :disabled="disabled || !canSelect(index)"
        :aria-label="`Envoyer ${gif.name}`"
        @click="$emit('select', index)"
      >
        <GifCardView
          :gif="gif"
          variant="mini"
          :active="index === activeIndex && !isKnockedOut(gif)"
        />
        <span v-if="index === activeIndex && !isKnockedOut(gif)" class="tag">Au combat</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.bench {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 0.6rem;
}

.slot {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  background: none;
  border: 0;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

.slot:not(:disabled):hover :deep(.card) {
  transform: translateY(-3px) rotate(1deg);
}

.slot:disabled {
  cursor: not-allowed;
}

.slot:disabled:not(.current) {
  opacity: 0.6;
}

.tag {
  position: absolute;
  top: -0.5rem;
  right: -0.3rem;
  padding: 0 0.3rem;
  background: var(--pop-yellow);
  border: 2px solid var(--ink);
  font-family: var(--font-display);
  font-size: 0.8rem;
  transform: rotate(6deg);
}
</style>
