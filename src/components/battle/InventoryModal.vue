<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import GifCardView from '@/components/GifCard.vue'
import GameModal from '@/components/ui/GameModal.vue'
import type { GifCard } from '@/types'
import { isKnockedOut } from '@/utils/gifs'

const props = defineProps<{
  open: boolean
  team: readonly GifCard[]
  activeIndex: number
}>()

defineEmits<{ close: [] }>()

const track = useTemplateRef<HTMLElement>('track')
const current = ref(props.activeIndex)

/** Swipe carousel: one card per slide, the dots follow the scroll position. */
function onScroll() {
  const el = track.value
  if (el && el.clientWidth > 0) current.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(index: number, behavior: ScrollBehavior = 'smooth') {
  track.value?.scrollTo?.({ left: index * track.value.clientWidth, behavior })
  current.value = index
}

// Open on the GIF currently fighting.
watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    goTo(props.activeIndex, 'instant')
  },
)
</script>

<template>
  <GameModal
    :open="open"
    title="Ton équipe"
    fullscreen
    :show-cross="false"
    :close-on-backdrop="false"
    @close="$emit('close')"
  >
    <div class="inventory">
      <p class="counter" aria-live="polite">{{ current + 1 }} / {{ team.length }}</p>
      <ul ref="track" class="track" @scroll.passive="onScroll">
        <li v-for="(gif, index) in team" :key="gif.id" class="slide">
          <span v-if="index === activeIndex && !isKnockedOut(gif)" class="tag">Au combat</span>
          <GifCardView class="card" :gif="gif" :active="index === activeIndex" />
        </li>
      </ul>
      <nav class="dots" aria-label="GIFs de l’équipe">
        <button
          v-for="(gif, index) in team"
          :key="gif.id"
          type="button"
          class="dot"
          :class="{ current: index === current, ko: isKnockedOut(gif) }"
          :aria-label="gif.name"
          :aria-current="index === current"
          @click="goTo(index)"
        />
      </nav>
    </div>
    <template #footer>
      <button type="button" class="comic-btn" @click="$emit('close')">Fermer</button>
    </template>
  </GameModal>
</template>

<style scoped>
.counter {
  align-self: center;
  padding: 0 0.6em;
  background: var(--pop-yellow);
  border: 2px solid var(--ink);
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.inventory {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  height: 100%;
}

.track {
  flex: 1;
  min-height: 0;
  display: flex;
  margin: 0 -1em;
  padding: 0;
  list-style: none;
  overflow: auto hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  position: relative;
  flex: 0 0 100%;
  display: grid;
  place-items: center;
  padding: 0.6em 1.4em;
  scroll-snap-align: center;
}

.card {
  width: 100%;
  max-height: 100%;
  font-size: 0.95em;
}

.tag {
  position: absolute;
  top: 0;
  right: 1em;
  z-index: 2;
  padding: 0 0.4em;
  background: var(--pop-yellow);
  border: 2px solid var(--ink);
  font-family: var(--font-display);
  transform: rotate(6deg);
}

.dots {
  display: flex;
  justify-content: center;
  gap: 0.6em;
}

.dot {
  width: max(24px, 5cqw);
  height: max(24px, 5cqw);
  padding: 0;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 50%;
  cursor: pointer;
}

.dot.ko {
  background: #bdbdbd;
}

.dot.current {
  background: var(--pop-yellow);
  transform: scale(1.2);
}
</style>
