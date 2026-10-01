<script setup lang="ts">
import GameIcon, { type IconName } from './GameIcon.vue'

withDefaults(
  defineProps<{
    icon: IconName
    /** Accessible name, also shown as tooltip. */
    label: string
    size?: 'sm' | 'md' | 'lg'
    color?: string
    pressed?: boolean
    disabled?: boolean
  }>(),
  { size: 'md', color: '#fff', pressed: undefined, disabled: false },
)

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :class="size"
    :style="{ '--btn-color': color }"
    :aria-label="label"
    :aria-pressed="pressed"
    :title="label"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <GameIcon :name="icon" />
  </button>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  padding: 0;
  background: var(--btn-color);
  color: var(--ink);
  border: var(--ink-width) solid var(--ink);
  border-radius: 50%;
  box-shadow: 0.12em 0.12em 0 var(--ink);
  font-size: calc(var(--size) * 0.55);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 80ms ease,
    box-shadow 80ms ease,
    filter 200ms ease;
}

.sm {
  --size: max(40px, 10cqw);
}

.md {
  --size: max(48px, 13cqw);
}

.lg {
  --size: max(56px, 17cqw);
}

.icon-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0.04em 0.04em 0 var(--ink);
}

.icon-btn:disabled {
  cursor: not-allowed;
  filter: grayscale(0.9) brightness(0.9);
  opacity: 0.6;
}
</style>
