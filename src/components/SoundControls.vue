<script setup lang="ts">
import { useAudioStore } from '@/stores/audio'

const audio = useAudioStore()
</script>

<template>
  <div v-if="audio.supported" class="sound-controls" role="group" aria-label="Son">
    <button
      type="button"
      class="toggle"
      :aria-pressed="audio.sfxEnabled"
      :title="audio.sfxEnabled ? 'Couper les effets' : 'Activer les effets'"
      @click="audio.toggleSfx()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <template v-if="audio.sfxEnabled">
          <path class="stroke" d="M16 9a4 4 0 0 1 0 6" />
          <path class="stroke" d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
        </template>
        <path v-else class="stroke" d="M16 9l5 6M21 9l-5 6" />
      </svg>
      <span class="sr-only">Effets sonores</span>
    </button>
    <button
      type="button"
      class="toggle"
      :aria-pressed="audio.musicEnabled"
      :title="audio.musicEnabled ? 'Couper la musique' : 'Activer la musique'"
      @click="audio.toggleMusic()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 17.5a2.5 2.5 0 1 1-2-2.45V5l11-2v12.5a2.5 2.5 0 1 1-2-2.45V7.4L9 8.7z" />
        <path v-if="!audio.musicEnabled" class="stroke slash" d="M3 3l18 18" />
      </svg>
      <span class="sr-only">Musique</span>
    </button>
  </div>
</template>

<style scoped>
.sound-controls {
  display: flex;
  gap: 0.4rem;
}

.toggle {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--pop-yellow);
  border: var(--ink-width) solid var(--ink);
  border-radius: 50%;
  box-shadow: 3px 3px 0 var(--ink);
  cursor: pointer;
  touch-action: manipulation;
}

.toggle[aria-pressed='false'] {
  background: #fff;
}

.toggle:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--ink);
}

svg {
  width: 24px;
  height: 24px;
  fill: var(--ink);
}

.stroke {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.2;
  stroke-linecap: round;
}

.slash {
  stroke: var(--pop-red);
  stroke-width: 3;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
