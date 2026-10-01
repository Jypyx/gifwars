<script setup lang="ts">
// Temporary catalogue preview, replaced by the real menu / GifCard.vue in the next steps.
import { GIFS_DATA } from '@/data/gifsData'
import { UNIVERSES } from '@/data/universes'
</script>

<template>
  <main class="home">
    <h1 class="title">GifWars</h1>
    <ul class="catalogue">
      <li
        v-for="gif in GIFS_DATA"
        :key="gif.id"
        class="panel"
        :style="{ '--frame': UNIVERSES[gif.universe].primary }"
      >
        <img :src="gif.gifUrl" :alt="gif.name" loading="lazy" />
        <strong>{{ gif.name }}</strong>
        <span>{{ gif.rarity }} · {{ UNIVERSES[gif.universe].name }} · {{ gif.maxHp }} PV</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.home {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 12vw, 6rem);
  letter-spacing: 0.05em;
  text-align: center;
  color: var(--pop-yellow);
  -webkit-text-stroke: var(--ink-width) var(--ink);
  text-shadow: 6px 6px 0 var(--ink);
  transform: rotate(-3deg);
  margin-bottom: 1.5rem;
}

.catalogue {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  outline: 6px solid var(--frame);
  outline-offset: -9px;
  box-shadow: 5px 5px 0 var(--ink);
}

.panel img {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
  border: 2px solid var(--ink);
}

.panel strong {
  font-family: var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 0.03em;
}

.panel span {
  font-size: 0.8rem;
}
</style>
