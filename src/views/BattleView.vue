<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SoundName } from '@/audio/sfx'
import AttackPanel from '@/components/battle/AttackPanel.vue'
import BattleArena from '@/components/battle/BattleArena.vue'
import BattleLog from '@/components/battle/BattleLog.vue'
import TeamBench from '@/components/battle/TeamBench.vue'
import TurnTimer from '@/components/battle/TurnTimer.vue'
import GifCardView from '@/components/GifCard.vue'
import SoundControls from '@/components/SoundControls.vue'
import { TURN_DURATION_SECONDS } from '@/config/gameRules'
import { useAudioStore } from '@/stores/audio'
import { useGameStore } from '@/stores/game'
import type { PlayerId } from '@/types'
import { isKnockedOut } from '@/utils/gifs'

const store = useGameStore()
const audio = useAudioStore()
const router = useRouter()

const SIDES = ['player1', 'player2'] as const
const tab = ref<'attack' | 'switch'>('attack')

const state = computed(() => store.state)
const busy = computed(() => store.presentationBusy)
const controlsDisabled = computed(() => busy.value || !store.isHumanTurn)
/** Only humans get the replacement dialog: the AI picks its own. */
const replacingPlayerId = computed<PlayerId | null>(() => store.humanReplacementFor)
const aiThinking = computed(
  () => state.value.phase === 'battle' && store.isAi(state.value.currentPlayerId),
)
/** Against the AI, the human's point of view decides between victory and defeat. */
const humanLost = computed(() => store.isVsAi && !!store.winner && store.isAi(store.winner.id))
const currentActive = computed(() => store.activeGifs[state.value.currentPlayerId])

// Each player starts their turn on the attack tab.
watch(
  () => state.value.currentPlayerId,
  () => (tab.value = 'attack'),
)

// Countdown ticks in the last seconds, only when a human is the one who has to act.
watch(
  () => state.value.turnTimeLeft,
  (timeLeft) => {
    const humanMustAct = store.isHumanTurn || store.humanReplacementFor !== null
    if (timeLeft > 0 && timeLeft <= 5 && humanMustAct && !busy.value) audio.play('tick')
  },
)

/** Sounds come from the arena, in sync with its animations. */
function onCue(sound: SoundName) {
  if (sound === 'victory') {
    audio.stopMusic()
    audio.play(humanLost.value ? 'defeat' : 'victory')
  } else {
    audio.play(sound)
  }
}

onMounted(() => {
  if (state.value.phase === 'idle') void router.replace({ name: 'home' })
  else audio.startMusic()
})

onBeforeUnmount(() => {
  audio.stopMusic()
  store.reset()
})

/** Guards against stale clicks: the store throws on actions that are no longer valid. */
function act(action: () => void) {
  try {
    action()
  } catch (error) {
    console.warn('[battle]', error)
  }
}

function rematch() {
  const { player1, player2 } = state.value.players
  store.startQuickMatch({
    playerNames: { player1: player1.name, player2: player2.name },
    controllers: { ...store.controllers },
  })
  audio.startMusic()
}

function quit() {
  void router.push({ name: 'home' })
}
</script>

<template>
  <main v-if="state.phase !== 'idle'" class="battle" :class="`turn-${state.currentPlayerId}`">
    <section class="comic-panel turn-panel">
      <div class="turn-heading">
        <span class="comic-caption">Tour {{ state.turnNumber }}</span>
        <h1 class="turn-title">
          Au tour de <span class="turn-name">{{ store.currentPlayer.name }}</span>
        </h1>
        <SoundControls class="sound" />
        <button type="button" class="quit" @click="quit">Quitter</button>
      </div>
      <TurnTimer :time-left="state.turnTimeLeft" :total="TURN_DURATION_SECONDS" />
    </section>

    <section class="comic-panel arena-panel">
      <BattleArena
        :key="store.matchId"
        :players="state.players"
        :log="state.log"
        @busy="store.setPresentationBusy($event)"
        @cue="onCue"
      />
    </section>

    <section
      v-for="side in SIDES"
      :key="side"
      class="comic-panel fighter-panel"
      :class="[side, { current: state.currentPlayerId === side }]"
    >
      <header class="fighter-header">
        <h2 class="player-name">{{ state.players[side].name }}</h2>
        <ol class="pips" :aria-label="`Équipe de ${state.players[side].name}`">
          <li
            v-for="gif in state.players[side].team"
            :key="gif.id"
            class="pip"
            :class="{ ko: isKnockedOut(gif) }"
            :title="`${gif.name} — ${gif.currentHp} PV`"
          />
        </ol>
      </header>
      <GifCardView v-if="store.activeGifs[side]" :gif="store.activeGifs[side]!" variant="compact" />
      <ul v-if="store.activeSynergies[side].length" class="synergies">
        <li
          v-for="synergy in store.activeSynergies[side]"
          :key="synergy.id"
          :title="synergy.description"
        >
          ♥ {{ synergy.name }}
        </li>
      </ul>
    </section>

    <section class="comic-panel controls-panel" aria-label="Actions">
      <p v-if="aiThinking" class="thinking" role="status">
        <span class="comic-caption">{{ store.currentPlayer.name }} réfléchit</span>
        <span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      </p>
      <div v-else class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="tab === 'attack'"
          @click="tab = 'attack'"
        >
          Attaquer
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="tab === 'switch'"
          @click="tab = 'switch'"
        >
          Switch
        </button>
      </div>

      <AttackPanel
        v-if="!aiThinking && tab === 'attack' && currentActive"
        :gif="currentActive"
        :disabled="controlsDisabled"
        :error-for="(attackId) => store.actionError({ kind: 'attack', attackId })"
        @attack="(id) => act(() => store.attack(id))"
      />
      <template v-else-if="!aiThinking && tab === 'switch'">
        <p class="hint">Changer de GIF consomme ton tour.</p>
        <TeamBench
          :team="store.currentPlayer.team"
          :active-index="store.currentPlayer.activeIndex"
          :disabled="controlsDisabled"
          :can-select="store.isSwitchAllowed"
          @select="(index) => act(() => store.switchTo(index))"
        />
      </template>
    </section>

    <section class="comic-panel log-panel">
      <h2 class="comic-caption log-title">Pendant ce temps…</h2>
      <BattleLog :log="state.log" :players="state.players" />
    </section>

    <!-- Forced replacement after a K.O. (shown once the K.O. animation is over). -->
    <div v-if="replacingPlayerId && !busy" class="overlay">
      <div class="comic-panel dialog" :class="replacingPlayerId" role="dialog" aria-modal="true">
        <span class="comic-caption">K.O. !</span>
        <h2 class="dialog-title">
          {{ state.players[replacingPlayerId].name }}, envoie un remplaçant !
        </h2>
        <p class="hint">Le remplacement ne consomme pas ton tour.</p>
        <TeamBench
          :team="state.players[replacingPlayerId].team"
          :active-index="state.players[replacingPlayerId].activeIndex"
          :can-select="(index) => !isKnockedOut(state.players[replacingPlayerId!].team[index]!)"
          @select="(index) => act(() => store.chooseReplacement(replacingPlayerId!, index))"
        />
        <TurnTimer :time-left="state.turnTimeLeft" :total="TURN_DURATION_SECONDS" />
      </div>
    </div>

    <div v-if="state.phase === 'finished' && store.winner && !busy" class="overlay">
      <div
        class="comic-panel dialog victory"
        :class="store.winner.id"
        role="dialog"
        aria-modal="true"
      >
        <p class="comic-title victory-title">{{ humanLost ? 'Défaite…' : 'Victoire !' }}</p>
        <h2 class="dialog-title">{{ store.winner.name }} remporte la partie</h2>
        <div class="dialog-actions">
          <button type="button" class="comic-btn" @click="rematch">Revanche</button>
          <button type="button" class="comic-btn secondary" @click="quit">Menu</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.battle {
  --turn-color: var(--player1);
  display: grid;
  gap: calc(var(--gutter) * 1.25);
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    'turn turn'
    'arena arena'
    'p1 p2'
    'controls controls'
    'log log';
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--gutter) var(--gutter) calc(var(--gutter) * 2);
}

.turn-player2 {
  --turn-color: var(--player2);
}

/* --- Turn banner --- */
.turn-panel {
  grid-area: turn;
  display: grid;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 8px solid var(--turn-color);
}

.turn-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.turn-title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 4.5vw, 2rem);
  font-weight: normal;
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.turn-name {
  color: var(--turn-color);
}

.quit {
  padding: 0.3rem 0.6rem;
  background: #fff;
  border: 2px solid var(--ink);
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  cursor: pointer;
}

/* --- Arena --- */
.arena-panel {
  grid-area: arena;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-width: 4px;
}

/* --- Fighter panels --- */
.fighter-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  transition: transform 200ms ease;
}

.fighter-panel.player1 {
  grid-area: p1;
  border-top: 6px solid var(--player1);
}

.fighter-panel.player2 {
  grid-area: p2;
  border-top: 6px solid var(--player2);
}

.fighter-panel.current {
  transform: translateY(-3px);
  box-shadow: 7px 7px 0 var(--ink);
}

.fighter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.player-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: normal;
  letter-spacing: 0.04em;
}

.pips {
  display: flex;
  gap: 3px;
  list-style: none;
  padding: 0;
}

.pip {
  width: 10px;
  height: 10px;
  background: var(--pop-green);
  border: 2px solid var(--ink);
  border-radius: 50%;
}

.pip.ko {
  background: #bbb;
}

.synergies {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.synergies li {
  padding: 0 0.4rem;
  background: #c8e6c9;
  border: 2px solid var(--ink);
  font-size: 0.75rem;
  font-weight: 700;
}

/* --- Controls --- */
.controls-panel {
  grid-area: controls;
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border-left: 8px solid var(--turn-color);
}

.tabs {
  display: flex;
  gap: 0.5rem;
}

.tab {
  flex: 1;
  min-height: 44px;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}

.tab[aria-selected='true'] {
  background: var(--turn-color);
  color: #fff;
  -webkit-text-stroke: 1px var(--ink);
  paint-order: stroke fill;
}

.hint {
  font-size: 0.85rem;
  font-style: italic;
}

.thinking {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 48px;
}

.thinking .comic-caption {
  font-size: 1.2rem;
}

.dots span {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  animation: bounce 0.9s ease-in-out infinite;
}

.dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bounce {
  50% {
    transform: translateY(-8px);
  }
}

/* --- Log --- */
.log-panel {
  grid-area: log;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: 0.75rem;
}

.log-title {
  justify-self: start;
  font-size: 1rem;
  font-weight: normal;
  transform: rotate(-1.5deg);
}

/* --- Overlays --- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  background: rgb(0 0 0 / 0.55);
  animation: fade-in 200ms ease-out;
}

.dialog {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 640px);
  max-height: calc(100dvh - 2 * var(--gutter));
  overflow-y: auto;
  padding: 1rem;
  border-top: 10px solid var(--player1);
  animation: pop-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog.player2 {
  border-top-color: var(--player2);
}

.dialog .comic-caption {
  justify-self: start;
  background: var(--pop-red);
  color: #fff;
}

.dialog-title {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 5vw, 2rem);
  font-weight: normal;
  letter-spacing: 0.04em;
}

.victory {
  justify-items: center;
  text-align: center;
}

.victory-title {
  font-size: clamp(3rem, 14vw, 5.5rem);
  transform: rotate(-4deg);
}

.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.comic-btn.secondary {
  --btn-bg: #fff;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes pop-in {
  from {
    transform: scale(0.6) rotate(-4deg);
  }
}

/* The arena already shows the GIFs: keep fighter cards short on phones. */
@media (max-width: 639px) {
  .turn-heading {
    flex-wrap: wrap;
  }

  .turn-title {
    order: 1;
    flex-basis: 100%;
  }

  .sound {
    margin-left: auto;
  }

  .fighter-panel :deep(.window),
  .fighter-panel :deep(.strip) {
    display: none;
  }

  .fighter-panel :deep(.name) {
    font-size: 1rem;
  }
}

@media (min-width: 1024px) {
  .battle {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(220px, 280px);
    grid-template-areas:
      'turn turn turn'
      'p1 arena p2'
      'controls controls log';
    align-items: start;
  }

  .fighter-panel.player1 {
    transform: rotate(-0.8deg);
  }

  .fighter-panel.player2 {
    transform: rotate(0.8deg);
  }

  .fighter-panel.current {
    transform: translateY(-4px);
  }
}
</style>
