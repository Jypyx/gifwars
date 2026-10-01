<script setup lang="ts">
import { computed } from 'vue'
import { ATTACK_TYPE_COLORS, STATUS_INFO } from '@/config/statusInfo'
import { UNIVERSES } from '@/data/universes'
import type { GifCard, Rarity } from '@/types'
import { isKnockedOut } from '@/utils/gifs'
import HpBar from './HpBar.vue'

const props = withDefaults(
  defineProps<{
    gif: GifCard
    /** `full`: catalogue card · `compact`: battle stats · `mini`: bench thumbnail. */
    variant?: 'full' | 'compact' | 'mini'
    active?: boolean
  }>(),
  { variant: 'full', active: false },
)

const RARITY_STARS: Record<Rarity, number> = { Commun: 1, Rare: 2, Épique: 3, Légendaire: 4 }
const RARITY_CLASS: Record<Rarity, string> = {
  Commun: 'common',
  Rare: 'rare',
  Épique: 'epic',
  Légendaire: 'legendary',
}

const theme = computed(() => UNIVERSES[props.gif.universe])
const knockedOut = computed(() => isKnockedOut(props.gif))
const status = computed(() => (props.gif.status ? STATUS_INFO[props.gif.status.effect] : null))

const usesLabel = (maxUses: number | null, currentUses: number | null) =>
  maxUses === null ? '∞' : `${currentUses}/${maxUses}`
</script>

<template>
  <article
    class="card"
    :class="[
      variant,
      RARITY_CLASS[gif.rarity],
      `pattern-${theme.pattern}`,
      { active, ko: knockedOut },
    ]"
    :style="{
      '--card-primary': theme.primary,
      '--card-secondary': theme.secondary,
      '--card-accent': theme.accent,
    }"
    :aria-label="`${gif.name}, ${gif.rarity}, ${gif.currentHp} PV sur ${gif.maxHp}`"
  >
    <header class="banner">
      <h3 class="name">{{ gif.name }}</h3>
      <span v-if="variant !== 'mini'" class="max-hp">{{ gif.maxHp }} PV</span>
    </header>

    <div class="window">
      <img :src="gif.gifUrl" :alt="gif.name" loading="lazy" draggable="false" />
      <span
        v-if="status"
        class="status"
        :style="{ background: status.color }"
        :title="status.description"
      >
        {{ status.label }}
        <small v-if="gif.status">{{ gif.status.turnsLeft }}</small>
      </span>
      <span v-if="knockedOut" class="ko-stamp">K.O.</span>
    </div>

    <div v-if="variant !== 'mini'" class="strip">
      <span class="universe">{{ theme.name }}</span>
      <span class="rarity" :title="gif.rarity">
        {{ gif.rarity }} {{ '★'.repeat(RARITY_STARS[gif.rarity]) }}
      </span>
    </div>

    <HpBar class="hp" :current="gif.currentHp" :max="gif.maxHp" />

    <template v-if="variant === 'full'">
      <ul class="attacks">
        <li v-for="attack in gif.attacks" :key="attack.id" class="attack">
          <span
            class="type-dot"
            :style="{ background: ATTACK_TYPE_COLORS[attack.type] }"
            :title="attack.type"
          />
          <span class="attack-name">{{ attack.name }}</span>
          <span
            v-if="attack.statusEffect"
            class="attack-status"
            :style="{ color: STATUS_INFO[attack.statusEffect].color }"
          >
            {{ STATUS_INFO[attack.statusEffect].label }}
          </span>
          <span class="attack-uses" :title="'Utilisations'">{{
            usesLabel(attack.maxUses, attack.currentUses)
          }}</span>
          <strong class="attack-damage">{{ attack.damage }}</strong>
        </li>
      </ul>
      <p class="catchphrase">« {{ gif.catchphrase }} »</p>
    </template>
  </article>
</template>

<style scoped>
.card {
  --frame-glow: transparent;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  background-color: var(--card-primary);
  border: var(--ink-width) solid var(--ink);
  border-radius: 12px;
  box-shadow:
    0 0 0 3px var(--frame-glow),
    var(--ink-shadow);
  color: var(--ink);
  isolation: isolate;
  transition:
    transform 150ms ease,
    filter 300ms ease;
}

/* Universe background patterns, drawn over the primary colour. */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  opacity: 0.35;
}

.pattern-halftone::before {
  background: radial-gradient(var(--card-accent) 22%, transparent 24%) 0 0 / 10px 10px;
}

.pattern-stripes::before {
  background: repeating-linear-gradient(-45deg, var(--card-secondary) 0 6px, transparent 6px 16px);
}

.pattern-stars::before {
  background:
    radial-gradient(var(--card-secondary) 12%, transparent 14%) 0 0 / 18px 18px,
    radial-gradient(var(--card-accent) 10%, transparent 12%) 9px 9px / 18px 18px;
}

.pattern-grid::before {
  background:
    linear-gradient(var(--card-secondary) 1px, transparent 1px) 0 0 / 14px 14px,
    linear-gradient(90deg, var(--card-secondary) 1px, transparent 1px) 0 0 / 14px 14px;
}

.pattern-zigzag::before {
  background:
    linear-gradient(135deg, var(--card-secondary) 25%, transparent 25%) -8px 0 / 16px 16px,
    linear-gradient(225deg, var(--card-secondary) 25%, transparent 25%) -8px 0 / 16px 16px;
}

/* Rarity frames */
.rare {
  --frame-glow: #42a5f5;
}

.epic {
  --frame-glow: #ab47bc;
}

.legendary {
  --frame-glow: #ffd600;
}

.legendary::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgb(255 255 255 / 0.45) 45%,
    rgb(255 214 0 / 0.35) 50%,
    transparent 65%
  );
  background-size: 250% 100%;
  mix-blend-mode: overlay;
  pointer-events: none;
  animation: holo 4s linear infinite;
}

@keyframes holo {
  from {
    background-position: 150% 0;
  }
  to {
    background-position: -100% 0;
  }
}

.active {
  transform: translateY(-4px) rotate(-1deg);
}

.ko {
  filter: grayscale(1) contrast(0.9);
}

/* Header banner */
.banner {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.15rem 0.5rem;
  background: var(--card-secondary);
  border: 2px solid var(--ink);
  border-radius: 6px;
}

.name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: normal;
  letter-spacing: 0.04em;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.max-hp {
  flex-shrink: 0;
  font-family: var(--font-display);
  color: var(--pop-red);
}

/* GIF window */
.window {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #000;
  border: 2px solid var(--ink);
  overflow: hidden;
}

.window img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.status {
  position: absolute;
  top: 0.3rem;
  left: 0.3rem;
  padding: 0.05rem 0.4rem;
  border: 2px solid var(--ink);
  color: #fff;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  transform: rotate(-4deg);
}

.ko-stamp {
  position: absolute;
  inset: 50% auto auto 50%;
  padding: 0 0.5rem;
  border: 4px solid var(--pop-red);
  color: var(--pop-red);
  background: rgb(255 255 255 / 0.85);
  font-family: var(--font-display);
  font-size: 2rem;
  transform: translate(-50%, -50%) rotate(-14deg);
}

.strip {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.1rem 0.4rem;
  background: rgb(255 255 255 / 0.9);
  border: 2px solid var(--ink);
  font-size: 0.75rem;
  font-weight: 700;
}

.universe {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rarity {
  flex-shrink: 0;
  color: var(--frame-glow, var(--ink));
  -webkit-text-stroke: 0.3px var(--ink);
}

.common .rarity {
  color: #555;
}

.hp {
  padding: 0.2rem 0.4rem;
  background: rgb(255 255 255 / 0.9);
  border: 2px solid var(--ink);
}

/* Attacks */
.attacks {
  list-style: none;
  padding: 0.25rem 0.4rem;
  background: rgb(255 255 255 / 0.92);
  border: 2px solid var(--ink);
  display: grid;
  gap: 0.2rem;
}

.attack {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.type-dot {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  border: 2px solid var(--ink);
  border-radius: 50%;
}

.attack-name {
  flex: 1;
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.attack-status {
  font-family: var(--font-display);
  letter-spacing: 0.03em;
}

.attack-uses {
  color: #555;
}

.attack-damage {
  min-width: 2ch;
  text-align: right;
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.catchphrase {
  padding: 0.2rem 0.4rem;
  background: rgb(255 255 255 / 0.85);
  border: 2px solid var(--ink);
  font-size: 0.75rem;
  font-style: italic;
}

/* Variants */
.compact .window {
  aspect-ratio: 16 / 9;
}

.mini {
  gap: 0.25rem;
  padding: 0.3rem;
  border-radius: 8px;
}

.mini .name {
  font-size: 0.95rem;
}

.mini .banner {
  padding: 0 0.3rem;
}

.mini .hp {
  font-size: 0.7rem;
  padding: 0.1rem 0.25rem;
}

.mini .hp :deep(.hp-value) {
  display: none;
}

.mini .ko-stamp {
  font-size: 1.1rem;
  border-width: 3px;
}
</style>
