<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import GifCardView from '@/components/GifCard.vue'
import SoundControls from '@/components/SoundControls.vue'
import { AI_DIFFICULTIES, AI_PLAYER_NAME } from '@/config/ai'
import { TEAM_SIZE, TURN_DURATION_SECONDS } from '@/config/gameRules'
import { STATUS_INFO } from '@/config/statusInfo'
import { GIFS_DATA } from '@/data/gifsData'
import { SYNERGIES } from '@/data/synergies'
import { useGameStore } from '@/stores/game'
import type { AiDifficulty } from '@/types'

const store = useGameStore()
const router = useRouter()

const names = reactive({ player1: '', player2: '' })
const mode = ref<'ai' | 'local'>('ai')
const difficulty = ref<AiDifficulty>('normal')
const difficulties = Object.entries(AI_DIFFICULTIES) as [
  AiDifficulty,
  (typeof AI_DIFFICULTIES)[AiDifficulty],
][]

function startQuickMatch() {
  const vsAi = mode.value === 'ai'
  store.startQuickMatch({
    playerNames: {
      player1: names.player1.trim() || 'Joueur 1',
      player2: vsAi ? AI_PLAYER_NAME : names.player2.trim() || 'Joueur 2',
    },
    controllers: vsAi ? { player2: { kind: 'ai', difficulty: difficulty.value } } : {},
  })
  void router.push({ name: 'battle' })
}

const gifName = (id: string) => GIFS_DATA.find((g) => g.id === id)?.name ?? id
</script>

<template>
  <main class="home">
    <header class="hero">
      <SoundControls class="sound" />
      <h1 class="comic-title logo">GifWars</h1>
      <p class="comic-caption tagline">Le choc des GIFs de la Pop Culture</p>
    </header>

    <section class="comic-panel start" aria-labelledby="start-title">
      <h2 id="start-title" class="section-title">Quick Match</h2>
      <p>
        {{ TEAM_SIZE }} GIFs tirés au sort par joueur : 2 Communs, 2 Rares, 1 Épique ou Légendaire.
      </p>
      <form class="setup" @submit.prevent="startQuickMatch">
        <fieldset class="choices">
          <legend class="choices-legend">Mode</legend>
          <label class="choice">
            <input v-model="mode" type="radio" name="mode" value="ai" />
            <span>Contre l’ordi</span>
          </label>
          <label class="choice">
            <input v-model="mode" type="radio" name="mode" value="local" />
            <span>À deux (même écran)</span>
          </label>
        </fieldset>

        <fieldset v-if="mode === 'ai'" class="choices">
          <legend class="choices-legend">Difficulté</legend>
          <label
            v-for="[key, info] in difficulties"
            :key="key"
            class="choice"
            :title="info.description"
          >
            <input v-model="difficulty" type="radio" name="difficulty" :value="key" />
            <span>{{ info.label }}</span>
          </label>
          <p class="choice-hint">{{ AI_DIFFICULTIES[difficulty].description }}</p>
        </fieldset>

        <div class="players">
          <label class="field player1">
            <span>Joueur 1</span>
            <input
              v-model="names.player1"
              maxlength="16"
              placeholder="Joueur 1"
              autocomplete="off"
            />
          </label>
          <span class="vs" aria-hidden="true">VS</span>
          <div v-if="mode === 'ai'" class="field player2">
            <span>Adversaire</span>
            <strong class="bot"
              >{{ AI_PLAYER_NAME }} · {{ AI_DIFFICULTIES[difficulty].label }}</strong
            >
          </div>
          <label v-else class="field player2">
            <span>Joueur 2</span>
            <input
              v-model="names.player2"
              maxlength="16"
              placeholder="Joueur 2"
              autocomplete="off"
            />
          </label>
          <button type="submit" class="comic-btn go">Combattre !</button>
        </div>
      </form>
    </section>

    <section class="comic-panel rules" aria-labelledby="rules-title">
      <h2 id="rules-title" class="section-title">Les règles</h2>
      <ul>
        <li>
          Chaque tour : <strong>Attaquer</strong> ou faire un <strong>Switch</strong> (le Switch
          consomme le tour).
        </li>
        <li>
          {{ TURN_DURATION_SECONDS }} secondes par tour, sinon l’attaque physique part toute seule.
        </li>
        <li>Un GIF K.O. doit être remplacé, sans perdre ton tour.</li>
        <li v-for="(info, key) in STATUS_INFO" :key="key">
          <strong :style="{ color: info.color }">{{ info.label }}</strong> : {{ info.description }}
        </li>
        <li>Mets K.O. les {{ TEAM_SIZE }} GIFs adverses pour gagner !</li>
      </ul>
    </section>

    <section class="catalogue-section" aria-labelledby="catalogue-title">
      <h2 id="catalogue-title" class="section-title banner-title">Le catalogue</h2>
      <ul class="catalogue">
        <li v-for="gif in GIFS_DATA" :key="gif.id">
          <GifCardView :gif="gif" />
        </li>
      </ul>
    </section>

    <section class="comic-panel synergies" aria-labelledby="synergies-title">
      <h2 id="synergies-title" class="section-title">Synergies</h2>
      <ul>
        <li v-for="synergy in SYNERGIES" :key="synergy.id">
          <strong>{{ synergy.name }}</strong>
          <span class="members">{{ synergy.gifIds.map(gifName).join(' + ') }}</span>
          <span>{{ synergy.description }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem var(--gutter) 3rem;
}

.hero {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.sound {
  justify-self: end;
}

.logo {
  font-size: clamp(3.5rem, 16vw, 7rem);
  line-height: 1;
  transform: rotate(-3deg);
}

.tagline {
  font-size: clamp(0.9rem, 3.5vw, 1.2rem);
  transform: rotate(1.5deg);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: normal;
  letter-spacing: 0.05em;
}

.start,
.rules,
.synergies {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
}

.start {
  border-top: 10px solid var(--pop-red);
}

.setup {
  display: grid;
  gap: 1rem;
}

.choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  border: 0;
}

.choices-legend {
  float: left;
  width: 100%;
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 0.04em;
}

.choice {
  position: relative;
  cursor: pointer;
}

.choice input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.choice span {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.3rem 0.9rem;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 0.04em;
}

.choice input:checked + span {
  background: var(--pop-yellow);
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--ink);
}

.choice input:focus-visible + span {
  outline: 3px solid var(--pop-blue);
  outline-offset: 3px;
}

.choice-hint {
  flex-basis: 100%;
  font-size: 0.85rem;
  font-style: italic;
}

.bot {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0.4rem 0.6rem;
  background: #e3f2fd;
  border: var(--ink-width) solid var(--ink);
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: normal;
}

.players {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  align-items: end;
}

.field {
  display: grid;
  gap: 0.25rem;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

.field.player1 span {
  color: var(--player1);
}

.field.player2 span {
  color: var(--player2);
}

.field input {
  min-height: 48px;
  padding: 0.4rem 0.6rem;
  border: var(--ink-width) solid var(--ink);
  font: inherit;
  font-family: var(--font-body);
  font-size: 1rem;
  letter-spacing: 0;
}

.vs {
  justify-self: center;
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--pop-red);
  -webkit-text-stroke: 1.5px var(--ink);
}

.go {
  font-size: 1.6rem;
}

.rules ul,
.synergies ul {
  display: grid;
  gap: 0.4rem;
  padding-left: 1.2rem;
}

.banner-title {
  justify-self: start;
  padding: 0.1rem 0.75rem;
  background: var(--pop-yellow);
  border: var(--ink-width) solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
  transform: rotate(-1.5deg);
}

.catalogue-section {
  display: grid;
  gap: 1rem;
}

.catalogue {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.synergies li {
  display: grid;
}

.members {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--pop-blue);
}

@media (min-width: 720px) {
  .sound {
    position: absolute;
    top: 0;
    right: 0;
  }

  .players {
    grid-template-columns: 1fr auto 1fr auto;
  }

  .vs {
    align-self: center;
    padding-top: 1.2rem;
  }
}
</style>
