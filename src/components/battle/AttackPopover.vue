<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { ATTACK_TYPE_COLORS, STATUS_INFO } from '@/config/statusInfo'
import type { GifCard } from '@/types'

const props = defineProps<{
  open: boolean
  gif: GifCard
  /** Why an attack cannot be used right now, `null` when it can. */
  errorFor: (attackId: string) => string | null
}>()

const emit = defineEmits<{ select: [attackId: string]; close: [] }>()

const onKeydown = (event: KeyboardEvent) => event.key === 'Escape' && emit('close')
watch(
  () => props.open,
  (open) =>
    open
      ? window.addEventListener('keydown', onKeydown)
      : window.removeEventListener('keydown', onKeydown),
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <template v-if="open">
    <!-- Invisible layer: tapping anywhere else closes the popover. -->
    <div class="catcher" @click="$emit('close')" />
    <div class="popover" role="menu" aria-label="Attaques">
      <button
        v-for="attack in gif.attacks"
        :key="attack.id"
        type="button"
        role="menuitem"
        class="attack"
        :class="{ special: attack.type === 'Spéciale' }"
        :style="{ '--type-color': ATTACK_TYPE_COLORS[attack.type] }"
        :disabled="errorFor(attack.id) !== null"
        :title="errorFor(attack.id) ?? `${attack.type} · ${attack.damage} dégâts`"
        @click="$emit('select', attack.id)"
      >
        <span class="name">{{ attack.name }}</span>
        <span class="meta">
          <span class="damage">{{ attack.damage }}</span>
          <span
            v-if="attack.statusEffect"
            class="status"
            :style="{ background: STATUS_INFO[attack.statusEffect].color }"
            >{{ STATUS_INFO[attack.statusEffect].label }}</span
          >
          <span class="uses">{{
            attack.maxUses === null ? '∞' : `${attack.currentUses}/${attack.maxUses}`
          }}</span>
        </span>
      </button>
    </div>
  </template>
</template>

<style scoped>
.catcher {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.6em);
  z-index: 21;
  display: grid;
  gap: 0.45em;
  width: min(78cqw, 22em);
  padding: 0.5em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 0.6em;
  box-shadow: 0.25em 0.25em 0 var(--ink);
  transform-origin: bottom right;
  animation: pop 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Little tail pointing at the attack button */
.popover::after {
  content: '';
  position: absolute;
  right: 2.2em;
  bottom: -0.75em;
  width: 1.2em;
  height: 1.2em;
  background: #fff;
  border-right: var(--ink-width) solid var(--ink);
  border-bottom: var(--ink-width) solid var(--ink);
  transform: rotate(45deg);
}

.attack {
  display: grid;
  gap: 0.1em;
  min-height: max(48px, 12cqw);
  padding: 0.35em 0.6em;
  background: var(--type-color);
  color: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 0.4em;
  box-shadow: 0.12em 0.12em 0 var(--ink);
  text-align: left;
  cursor: pointer;
}

.attack:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.attack:disabled {
  cursor: not-allowed;
  filter: grayscale(1);
  opacity: 0.5;
}

.name {
  font-family: var(--font-display);
  font-size: 1.15em;
  letter-spacing: 0.04em;
  line-height: 1.05;
  -webkit-text-stroke: 0.25cqw var(--ink);
  paint-order: stroke fill;
}

.special:not(:disabled) {
  color: var(--ink);
  animation: glow 1.1s ease-in-out infinite alternate;
}

.special .name {
  -webkit-text-stroke: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.75em;
  font-weight: 700;
}

.damage {
  margin-right: auto;
}

.damage::after {
  content: ' dégâts';
}

.status {
  padding: 0 0.3em;
  border: 1.5px solid var(--ink);
}

.uses {
  padding: 0 0.4em;
  background: rgb(0 0 0 / 0.3);
  border-radius: 999px;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes glow {
  to {
    box-shadow:
      0.12em 0.12em 0 var(--ink),
      0 0 1em 0.2em #ffd600;
  }
}
</style>
