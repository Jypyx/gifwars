<script setup lang="ts">
import { computed } from 'vue'
import HpBar from '@/components/HpBar.vue'
import { STATUS_INFO } from '@/config/statusInfo'
import type { GifCard, Player, Rarity, Synergy } from '@/types'
import { isKnockedOut } from '@/utils/gifs'

const props = defineProps<{
  player: Player
  gif: GifCard | undefined
  side: 'enemy' | 'player'
  synergies: readonly Synergy[]
  /** Highlights the box while it is this side's turn. */
  current: boolean
}>()

const STARS: Record<Rarity, number> = { Commun: 1, Rare: 2, Épique: 3, Légendaire: 4 }
const status = computed(() => (props.gif?.status ? STATUS_INFO[props.gif.status.effect] : null))
</script>

<template>
  <section
    v-if="gif"
    class="status-box"
    :class="[side, { current }]"
    :aria-label="`${side === 'enemy' ? 'Adversaire' : 'Ton GIF'} : ${gif.name}, ${gif.currentHp} PV sur ${gif.maxHp}`"
  >
    <header class="top">
      <h2 class="name">{{ gif.name }}</h2>
      <span class="stars" :title="gif.rarity">{{ '★'.repeat(STARS[gif.rarity]) }}</span>
    </header>
    <HpBar class="hp" :current="gif.currentHp" :max="gif.maxHp" />
    <div class="meta">
      <ol
        class="pips"
        :aria-label="`${player.team.filter((g) => !isKnockedOut(g)).length} GIFs restants`"
      >
        <li
          v-for="(member, index) in player.team"
          :key="member.id"
          class="pip"
          :class="{ ko: isKnockedOut(member), active: index === player.activeIndex }"
        />
      </ol>
      <span
        v-if="status && gif.status"
        class="chip"
        :style="{ background: status.color }"
        :title="status.description"
      >
        {{ status.label }} {{ gif.status.turnsLeft }}
      </span>
      <span
        v-for="synergy in synergies"
        :key="synergy.id"
        class="chip synergy"
        :title="`${synergy.name} : ${synergy.description}`"
        >♥</span
      >
    </div>
  </section>
</template>

<style scoped>
.status-box {
  --accent: var(--player2);
  display: grid;
  gap: 0.25em;
  padding: 0.35em 0.6em 0.45em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 0.5em 0.5em 0.5em 1.4em;
  box-shadow: 0.2em 0.2em 0 var(--ink);
  border-left: 0.45em solid var(--accent);
  transition:
    box-shadow 200ms ease,
    transform 200ms ease;
}

.player {
  --accent: var(--player1);
  border-radius: 0.5em 0.5em 1.4em 0.5em;
  border-left-width: var(--ink-width);
  border-right: 0.45em solid var(--accent);
}

.current {
  transform: translateY(-0.12em);
  box-shadow:
    0.2em 0.2em 0 var(--ink),
    0 0 0 0.25em color-mix(in srgb, var(--accent) 45%, transparent);
}

.top {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-display);
  font-size: 1.2em;
  font-weight: normal;
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.stars {
  flex-shrink: 0;
  color: #f9a825;
  font-size: 0.8em;
  -webkit-text-stroke: 0.5px var(--ink);
}

.hp {
  font-size: 0.85em;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.3em;
  min-height: 1.2em;
}

.pips {
  display: flex;
  gap: 0.18em;
  margin-right: auto;
  padding: 0;
  list-style: none;
}

.pip {
  width: 0.62em;
  height: 0.62em;
  background: var(--pop-green);
  border: 2px solid var(--ink);
  border-radius: 50%;
}

.pip.active {
  box-shadow: 0 0 0 2px var(--pop-yellow);
}

.pip.ko {
  background: #bdbdbd;
}

.chip {
  padding: 0 0.35em;
  border: 2px solid var(--ink);
  color: #fff;
  font-family: var(--font-display);
  font-size: 0.75em;
  letter-spacing: 0.04em;
}

.synergy {
  background: #66bb6a;
}
</style>
