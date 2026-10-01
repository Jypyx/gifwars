<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ timeLeft: number; total: number }>()

const urgent = computed(() => props.timeLeft <= 5)
</script>

<template>
  <div
    class="timer"
    :class="{ urgent }"
    role="timer"
    :aria-label="`${timeLeft} secondes restantes`"
  >
    <div class="track">
      <div class="fill" :style="{ width: `${(timeLeft / total) * 100}%` }" />
    </div>
    <span class="seconds">{{ timeLeft }}s</span>
  </div>
</template>

<style scoped>
.timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
}

.track {
  flex: 1;
  height: 0.9rem;
  background: #fff;
  border: 2px solid var(--ink);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--pop-green);
  border-right: 2px solid var(--ink);
  transition:
    width 1s linear,
    background-color 300ms;
}

.seconds {
  min-width: 3ch;
  font-size: 1.4rem;
  text-align: right;
}

.urgent .fill {
  background: var(--pop-red);
}

.urgent .seconds {
  color: var(--pop-red);
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  to {
    transform: scale(1.25);
  }
}
</style>
