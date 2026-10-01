<script setup lang="ts">
export type IconName =
  'sound-on' | 'sound-off' | 'music-on' | 'music-off' | 'close' | 'swords' | 'swap' | 'bag'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <template v-if="name === 'sound-on' || name === 'sound-off'">
      <path class="fill" d="M3 9h4l5-4v14l-5-4H3z" />
      <template v-if="name === 'sound-on'">
        <path d="M15.5 9a4 4 0 0 1 0 6" />
        <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
      </template>
      <path v-else d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </template>

    <template v-else-if="name === 'music-on' || name === 'music-off'">
      <path
        class="fill"
        d="M9 17.5a2.5 2.5 0 1 1-2-2.45V5l11-2v12.5a2.5 2.5 0 1 1-2-2.45V7.4L9 8.7z"
      />
      <path v-if="name === 'music-off'" class="slash" d="M3 3l18 18" />
    </template>

    <path v-else-if="name === 'close'" class="bold" d="M6 6l12 12M18 6L6 18" />

    <!-- Two crossed swords -->
    <template v-else-if="name === 'swords'">
      <path d="M4 4l10.5 10.5M4 4h3.5M4 4v3.5" />
      <path d="M12.5 16.5l4-4M17.5 17.5l3 3" />
      <path d="M20 4L9.5 14.5M20 4h-3.5M20 4v3.5" />
      <path d="M11.5 16.5l-4-4M6.5 17.5l-3 3" />
    </template>

    <!-- Two arrows looping into each other -->
    <template v-else-if="name === 'swap'">
      <path d="M4.5 11a7.5 7.5 0 0 1 13-4.5L19.5 8.5" />
      <path d="M19.5 3.5v5h-5" />
      <path d="M19.5 13a7.5 7.5 0 0 1-13 4.5L4.5 15.5" />
      <path d="M4.5 20.5v-5h5" />
    </template>

    <!-- Drawstring pouch -->
    <template v-else-if="name === 'bag'">
      <path
        class="fill"
        d="M9 7.5h6c3 2 5.5 5 5.5 8.5a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16c0-3.5 2.5-6.5 5.5-8.5z"
      />
      <path d="M8.5 7.5L7 3.5c2 .8 3.5.8 5 0 1.5.8 3 .8 5 0l-1.5 4" />
      <path class="tie" d="M8 7.5h8" />
      <path class="mark" d="M12 12.5v5M10 14.5h4" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fill {
  fill: currentColor;
  stroke: none;
}

.bold {
  stroke-width: 3;
}

.slash {
  stroke: var(--pop-red);
  stroke-width: 3;
}

.tie {
  stroke-width: 2.6;
}

.mark {
  stroke: var(--pop-yellow);
  stroke-width: 1.8;
}
</style>
