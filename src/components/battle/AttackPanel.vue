<script setup lang="ts">
import { ATTACK_TYPE_COLORS, STATUS_INFO } from '@/config/statusInfo'
import type { GifCard } from '@/types'

defineProps<{
  gif: GifCard
  disabled: boolean
  /** Why an attack cannot be used right now, `null` when it can. */
  errorFor: (attackId: string) => string | null
}>()

defineEmits<{ attack: [attackId: string] }>()
</script>

<template>
  <div class="attacks">
    <button
      v-for="attack in gif.attacks"
      :key="attack.id"
      type="button"
      class="comic-btn attack"
      :class="{ special: attack.type === 'Spéciale' }"
      :style="{ '--btn-bg': ATTACK_TYPE_COLORS[attack.type] }"
      :disabled="disabled || errorFor(attack.id) !== null"
      :title="errorFor(attack.id) ?? `${attack.type} · ${attack.damage} dégâts`"
      @click="$emit('attack', attack.id)"
    >
      <span class="name">{{ attack.name }}</span>
      <span class="meta">
        <span class="damage">{{ attack.damage }} dégâts</span>
        <span
          v-if="attack.statusEffect"
          class="status"
          :style="{ background: STATUS_INFO[attack.statusEffect].color }"
        >
          {{ STATUS_INFO[attack.statusEffect].label }}
        </span>
        <span class="uses">{{
          attack.maxUses === null ? '∞' : `${attack.currentUses}/${attack.maxUses}`
        }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.attacks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
}

.attack {
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
  padding: 0.4rem 0.6rem;
  color: #fff;
  text-align: left;
  text-transform: none;
}

.name {
  font-size: 1.15rem;
  line-height: 1.1;
  -webkit-text-stroke: 1px var(--ink);
  paint-order: stroke fill;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
}

.damage {
  flex: 1;
}

.status {
  padding: 0 0.3rem;
  border: 1.5px solid var(--ink);
}

.uses {
  padding: 0 0.35rem;
  background: rgb(0 0 0 / 0.35);
  border-radius: 999px;
}

.special:not(:disabled) {
  color: var(--ink);
  animation: glow 1.2s ease-in-out infinite alternate;
}

.special .name {
  -webkit-text-stroke: 0;
}

@keyframes glow {
  to {
    box-shadow:
      4px 4px 0 var(--ink),
      0 0 18px 4px #ffd600;
  }
}
</style>
