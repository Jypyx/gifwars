<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ current: number; max: number }>()

const ratio = computed(() => (props.max > 0 ? Math.max(0, props.current) / props.max : 0))
const level = computed(() => (ratio.value > 0.5 ? 'high' : ratio.value > 0.2 ? 'mid' : 'low'))
</script>

<template>
  <div
    class="hp"
    role="meter"
    :aria-valuenow="current"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-label="`Points de vie : ${current} sur ${max}`"
  >
    <span class="hp-label">PV</span>
    <div class="hp-track">
      <div class="hp-fill" :class="level" :style="{ width: `${ratio * 100}%` }" />
    </div>
    <span class="hp-value">{{ current }}/{{ max }}</span>
  </div>
</template>

<style scoped>
.hp {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-display);
  letter-spacing: 0.03em;
}

.hp-label {
  font-size: 0.85em;
}

.hp-track {
  flex: 1;
  height: 0.75rem;
  background: #fff;
  border: 2px solid var(--ink);
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-right: 2px solid var(--ink);
  transition: width 400ms ease-out;
}

.hp-fill.high {
  background: var(--pop-green);
}

.hp-fill.mid {
  background: var(--pop-yellow);
}

.hp-fill.low {
  background: var(--pop-red);
}

.hp-value {
  min-width: 4.5ch;
  text-align: right;
  font-size: 0.85em;
}
</style>
