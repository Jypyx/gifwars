<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RulesContent from '@/components/RulesContent.vue'
import GameModal from '@/components/ui/GameModal.vue'
import { AI_DIFFICULTIES, AI_PLAYER_NAME } from '@/config/ai'
import { GIFS_DATA } from '@/data/gifsData'
import { useGameStore } from '@/stores/game'
import type { AiDifficulty } from '@/types'

const store = useGameStore()
const router = useRouter()

/** A different GIF quote on every visit. */
const quote = GIFS_DATA[Math.floor(Math.random() * GIFS_DATA.length)]!

const playOpen = ref(false)
const rulesOpen = ref(false)

const DIFFICULTY_COLORS: Record<AiDifficulty, string> = {
  facile: '#66BB6A',
  normal: '#FFB300',
  difficile: '#E53935',
}
const difficulties = Object.keys(AI_DIFFICULTIES) as AiDifficulty[]

function start(difficulty: AiDifficulty) {
  playOpen.value = false
  store.startQuickMatch({
    playerNames: { player1: 'Toi', player2: AI_PLAYER_NAME },
    controllers: { player2: { kind: 'ai', difficulty } },
  })
  void router.push({ name: 'battle' })
}
</script>

<template>
  <main class="screen splash">
    <div class="sunburst" aria-hidden="true" />

    <header class="title-block">
      <h1 class="comic-title logo">GifWars</h1>
      <figure class="bubble">
        <blockquote>« {{ quote.catchphrase }} »</blockquote>
        <figcaption>— {{ quote.name }}</figcaption>
      </figure>
    </header>

    <div class="hero" aria-hidden="true">
      <img class="hero-gif" :src="quote.gifUrl" alt="" draggable="false" />
    </div>

    <nav class="actions">
      <button type="button" class="play" @click="playOpen = true">Jouer</button>
      <button type="button" class="comic-btn rules-btn" @click="rulesOpen = true">Règles</button>
    </nav>

    <GameModal :open="playOpen" @close="playOpen = false">
      <div class="difficulties">
        <button
          v-for="key in difficulties"
          :key="key"
          type="button"
          class="comic-btn difficulty"
          :style="{ '--btn-bg': DIFFICULTY_COLORS[key] }"
          @click="start(key)"
        >
          <span class="difficulty-label">{{ AI_DIFFICULTIES[key].label }}</span>
          <span class="difficulty-hint">{{ AI_DIFFICULTIES[key].description }}</span>
        </button>
      </div>
    </GameModal>

    <GameModal :open="rulesOpen" title="Les règles" @close="rulesOpen = false">
      <RulesContent />
      <template #footer>
        <button type="button" class="comic-btn" @click="rulesOpen = false">Fermer</button>
      </template>
    </GameModal>
  </main>
</template>

<style scoped>
.splash {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(8cqh + env(safe-area-inset-top)) 7cqw calc(6cqh + env(safe-area-inset-bottom));
  background: #ffd000;
}

/* Slowly spinning comic sunburst */
.sunburst {
  position: absolute;
  left: 50%;
  top: 38%;
  width: 260cqh;
  height: 260cqh;
  translate: -50% -50%;
  background: repeating-conic-gradient(#ffe81f 0deg 7.5deg, #ffd000 7.5deg 15deg);
  animation: spin 60s linear infinite;
}

.sunburst::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(rgb(229 57 53 / 0.25) 22%, transparent 24%) 0 0 / 1.6cqh 1.6cqh;
  mask-image: radial-gradient(circle, transparent 8%, #000 30%);
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}

.title-block {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 3cqh;
}

.logo {
  font-size: 22cqw;
  line-height: 0.9;
  text-shadow: 1.5cqw 1.5cqw 0 var(--ink);
  -webkit-text-stroke: 1cqw var(--ink);
  animation:
    logo-in 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
    float 3s ease-in-out 700ms infinite;
}

@keyframes logo-in {
  from {
    transform: scale(0.2) rotate(-25deg);
    opacity: 0;
  }
  to {
    transform: rotate(-4deg);
  }
}

@keyframes float {
  0%,
  100% {
    transform: rotate(-4deg) translateY(0);
  }
  50% {
    transform: rotate(-2deg) translateY(-1.2cqh);
  }
}

/* Speech bubble with the GIF quote */
.bubble {
  position: relative;
  max-width: 82cqw;
  padding: 0.7em 1em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 1.2em;
  box-shadow: 0.25em 0.25em 0 var(--ink);
  text-align: center;
  transform: rotate(1.5deg);
  animation: bubble-in 400ms 500ms ease-out both;
}

.bubble::before {
  content: '';
  position: absolute;
  bottom: -1em;
  right: 22%;
  border: 0.55em solid transparent;
  border-top-color: var(--ink);
  border-right-color: var(--ink);
}

/* The quoted GIF, framed like a comic panel */
.hero {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 3cqh 0;
}

.hero-gif {
  max-width: 70cqw;
  max-height: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1.2cqw solid var(--ink);
  outline: 1.5cqw solid #fff;
  box-shadow: 2.5cqw 2.5cqw 0 1.5cqw var(--ink);
  transform: rotate(-3deg);
  animation: hero-in 500ms 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: scale(0.5) rotate(8deg);
  }
}

blockquote {
  font-family: var(--font-display);
  font-size: 1.25em;
  letter-spacing: 0.03em;
  line-height: 1.15;
}

figcaption {
  margin-top: 0.3em;
  font-size: 0.85em;
  font-weight: 700;
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: scale(0.6) rotate(-6deg);
  }
}

.actions {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4cqh;
}

/* The big, irresistible PLAY button */
.play {
  width: 76cqw;
  padding: 0.25em 0;
  background: linear-gradient(180deg, #ff5252 0%, #e53935 55%, #c62828 100%);
  color: #fff;
  border: 1.2cqw solid var(--ink);
  border-radius: 999px;
  box-shadow:
    0 2.2cqw 0 var(--ink),
    inset 0 -1.2cqw 0 rgb(0 0 0 / 0.2),
    inset 0 1cqw 0 rgb(255 255 255 / 0.35);
  font-family: var(--font-display);
  font-size: 15cqw;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
  -webkit-text-stroke: 0.6cqw var(--ink);
  paint-order: stroke fill;
  cursor: pointer;
  animation: pulse 1.4s ease-in-out infinite;
}

.play:active {
  transform: translateY(1.5cqw);
  box-shadow:
    0 0.6cqw 0 var(--ink),
    inset 0 -1.2cqw 0 rgb(0 0 0 / 0.2);
  animation: none;
}

@keyframes pulse {
  0%,
  100% {
    scale: 1;
  }
  50% {
    scale: 1.06;
  }
}

.rules-btn {
  --btn-bg: #fff;
  min-width: 45cqw;
}

/* Difficulty modal */
.difficulties {
  display: grid;
  gap: 1em;
  padding-top: 0.3em;
}

.difficulty {
  flex-direction: column;
  gap: 0.1em;
  padding: 0.5em 0.8em;
  color: #fff;
}

.difficulty-label {
  font-size: 1.5em;
  -webkit-text-stroke: 0.3cqw var(--ink);
  paint-order: stroke fill;
}

.difficulty-hint {
  font-family: var(--font-body);
  font-size: 0.6em;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
}
</style>
