<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAudioStore } from '@/stores/audio'

const audio = useAudioStore()

/** Browsers only allow audio after a user gesture: unlock on the first interaction. */
const unlock = () => audio.unlock()

/** Short UI click for every enabled button or toggle, in one place. */
function onClick(event: MouseEvent) {
  const target = event.target as Element | null
  // Labels forward their click to their input: only the input counts, to avoid double clicks.
  const control = target?.closest('button') ?? (target?.matches('.choice input') ? target : null)
  if (control && !(control as HTMLButtonElement | HTMLInputElement).disabled) audio.play('click')
}

onMounted(() => {
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  document.addEventListener('click', onClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', unlock)
  window.removeEventListener('keydown', unlock)
  document.removeEventListener('click', onClick)
})
</script>

<template>
  <RouterView />
</template>
