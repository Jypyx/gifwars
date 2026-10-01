<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SoundName } from '@/audio/sfx'
import AttackPopover from '@/components/battle/AttackPopover.vue'
import BattleArena from '@/components/battle/BattleArena.vue'
import EndScreen from '@/components/battle/EndScreen.vue'
import FighterStatus from '@/components/battle/FighterStatus.vue'
import InventoryModal from '@/components/battle/InventoryModal.vue'
import SwitchModal from '@/components/battle/SwitchModal.vue'
import GameModal from '@/components/ui/GameModal.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { TURN_DURATION_SECONDS } from '@/config/gameRules'
import { createEventDescriber } from '@/game/describeEvent'
import { useAudioStore } from '@/stores/audio'
import { useGameStore } from '@/stores/game'
import type { BattleLogEntry } from '@/types'
import { isKnockedOut } from '@/utils/gifs'

const store = useGameStore()
const audio = useAudioStore()
const router = useRouter()

/** The human always plays the bottom side (player 1), the AI the top side. */
const HUMAN = 'player1'
const ENEMY = 'player2'

const state = computed(() => store.state)
const busy = computed(() => store.presentationBusy)
const human = computed(() => state.value.players[HUMAN])
const humanGif = computed(() => store.activeGifs[HUMAN])

const attackOpen = ref(false)
const switchOpen = ref(false)
const inventoryOpen = ref(false)
const quitOpen = ref(false)

const canAct = computed(() => store.isHumanTurn && !busy.value)
const canSwitch = computed(
  () => canAct.value && human.value.team.some((_, index) => store.isSwitchAllowed(index)),
)
const forcedReplacement = computed(() => store.humanReplacementFor === HUMAN && !busy.value)
const finished = computed(() => state.value.phase === 'finished' && !!store.winner && !busy.value)
const victory = computed(() => state.value.winnerId === HUMAN)

// Menus covering the battle pause it (timer and AI).
watch([quitOpen, inventoryOpen], ([quit, inventory]) => store.setPaused(quit || inventory))

// Close action menus as soon as the human can no longer act.
watch(canAct, (can) => {
  if (!can) {
    attackOpen.value = false
    switchOpen.value = false
  }
})

// --- Dialog box -------------------------------------------------------------

const playingEntry = ref<BattleLogEntry | null>(null)
const describe = computed(() => createEventDescriber(state.value.players))
const caption = computed(() => {
  if (busy.value && playingEntry.value) return describe.value(playingEntry.value)
  if (state.value.phase === 'finished') return ''
  if (store.humanReplacementFor) return 'K.O. ! Choisis ton remplaçant.'
  if (state.value.phase === 'battle' && store.isAi(state.value.currentPlayerId)) {
    return `${state.value.players[ENEMY].name} réfléchit…`
  }
  if (humanGif.value) return `Que doit faire ${humanGif.value.name} ?`
  return ''
})
const showTimer = computed(() => store.isHumanTurn || store.humanReplacementFor !== null)

// --- Sound ------------------------------------------------------------------

watch(
  () => state.value.turnTimeLeft,
  (timeLeft) => {
    if (timeLeft > 0 && timeLeft <= 5 && showTimer.value && !busy.value) audio.play('tick')
  },
)

/** Sounds come from the arena, in sync with its animations. */
function onCue(sound: SoundName) {
  if (sound === 'victory') {
    audio.stopMusic()
    audio.play(victory.value ? 'victory' : 'defeat')
  } else {
    audio.play(sound)
  }
}

// --- Actions ----------------------------------------------------------------

/** Guards against stale clicks: the store throws on actions that are no longer valid. */
function act(action: () => void) {
  try {
    action()
  } catch (error) {
    console.warn('[battle]', error)
  }
}

function chooseAttack(attackId: string) {
  attackOpen.value = false
  act(() => store.attack(attackId))
}

function chooseGif(index: number) {
  if (forcedReplacement.value) act(() => store.chooseReplacement(HUMAN, index))
  else {
    switchOpen.value = false
    act(() => store.switchTo(index))
  }
}

function retry() {
  const { player1, player2 } = state.value.players
  store.startQuickMatch({
    playerNames: { player1: player1.name, player2: player2.name },
    controllers: { ...store.controllers },
  })
  audio.startMusic()
}

function quit() {
  quitOpen.value = false
  void router.push({ name: 'home' })
}

onMounted(() => {
  if (state.value.phase === 'idle') void router.replace({ name: 'home' })
  else audio.startMusic()
})

onBeforeUnmount(() => {
  audio.stopMusic()
  store.reset()
})
</script>

<template>
  <main class="screen battle">
    <template v-if="state.phase !== 'idle'">
      <BattleArena
        :key="store.matchId"
        class="arena"
        :players="state.players"
        :log="state.log"
        @busy="store.setPresentationBusy($event)"
        @cue="onCue"
        @playing="playingEntry = $event"
      />

      <div class="hud">
        <header class="hud-top">
          <FighterStatus
            class="enemy-status"
            side="enemy"
            :player="state.players[ENEMY]"
            :gif="store.activeGifs[ENEMY]"
            :synergies="store.activeSynergies[ENEMY]"
            :current="state.currentPlayerId === ENEMY && state.phase === 'battle'"
          />
          <div class="system-buttons">
            <IconButton
              :icon="audio.sfxEnabled ? 'sound-on' : 'sound-off'"
              :label="audio.sfxEnabled ? 'Couper le son' : 'Activer le son'"
              :pressed="audio.sfxEnabled"
              size="sm"
              @click="audio.toggleSfx()"
            />
            <IconButton
              :icon="audio.musicEnabled ? 'music-on' : 'music-off'"
              :label="audio.musicEnabled ? 'Couper la musique' : 'Activer la musique'"
              :pressed="audio.musicEnabled"
              size="sm"
              @click="audio.toggleMusic()"
            />
            <IconButton icon="close" label="Quitter" size="sm" @click="quitOpen = true" />
          </div>
        </header>

        <FighterStatus
          class="player-status"
          side="player"
          :player="human"
          :gif="humanGif"
          :synergies="store.activeSynergies[HUMAN]"
          :current="store.isHumanTurn"
        />

        <footer class="hud-bottom">
          <div class="dialog-box" aria-live="polite">
            <Transition name="caption" mode="out-in">
              <p :key="caption" class="caption">{{ caption }}</p>
            </Transition>
            <div
              v-if="showTimer"
              class="timer"
              :class="{ urgent: state.turnTimeLeft <= 5 }"
              role="timer"
              :aria-label="`${state.turnTimeLeft} secondes restantes`"
            >
              <div
                class="timer-fill"
                :style="{ width: `${(state.turnTimeLeft / TURN_DURATION_SECONDS) * 100}%` }"
              />
            </div>
          </div>

          <div class="actions">
            <IconButton
              class="action-bag"
              icon="bag"
              label="Inventaire"
              color="#FFCA28"
              @click="inventoryOpen = true"
            />
            <IconButton
              class="action-switch"
              icon="swap"
              label="Switch"
              color="#42A5F5"
              :disabled="!canSwitch"
              @click="switchOpen = true"
            />
            <IconButton
              class="action-attack"
              icon="swords"
              label="Attaquer"
              color="#EF5350"
              size="lg"
              :pressed="attackOpen"
              :disabled="!canAct"
              @click="attackOpen = !attackOpen"
            />
            <AttackPopover
              v-if="humanGif"
              :open="attackOpen"
              :gif="humanGif"
              :error-for="(attackId) => store.actionError({ kind: 'attack', attackId })"
              @select="chooseAttack"
              @close="attackOpen = false"
            />
          </div>
        </footer>
      </div>

      <SwitchModal
        :open="switchOpen || forcedReplacement"
        :forced="forcedReplacement"
        :team="human.team"
        :active-index="human.activeIndex"
        :can-select="
          (index) =>
            forcedReplacement ? !isKnockedOut(human.team[index]!) : store.isSwitchAllowed(index)
        "
        @select="chooseGif"
        @close="switchOpen = false"
      />

      <InventoryModal
        :open="inventoryOpen"
        :team="human.team"
        :active-index="human.activeIndex"
        @close="inventoryOpen = false"
      />

      <GameModal :open="quitOpen" title="Quitter la partie ?" @close="quitOpen = false">
        <p>La partie en cours sera perdue.</p>
        <template #footer>
          <button
            type="button"
            class="comic-btn secondary"
            data-autofocus
            @click="quitOpen = false"
          >
            Continuer
          </button>
          <button type="button" class="comic-btn danger" @click="quit">Quitter</button>
        </template>
      </GameModal>

      <EndScreen :open="finished" :victory="victory" @retry="retry" @quit="quit" />
    </template>
  </main>
</template>

<style scoped>
.arena {
  position: absolute;
  inset: 0;
}

/* HUD laid over the arena; only its controls catch taps. */
.hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: calc(3cqw + env(safe-area-inset-top)) 3cqw calc(3cqw + env(safe-area-inset-bottom));
  pointer-events: none;
}

.hud-top,
.hud-bottom {
  display: flex;
  gap: 2.5cqw;
}

.hud-top {
  align-items: flex-start;
}

.hud-bottom {
  align-items: stretch;
}

.enemy-status,
.player-status,
.system-buttons,
.dialog-box,
.actions {
  pointer-events: auto;
}

.enemy-status {
  width: 56cqw;
}

.system-buttons {
  display: flex;
  gap: 1.5cqw;
  margin-left: auto;
}

.player-status {
  width: 52cqw;
  margin: auto 0 3cqw auto;
}

/* Pokémon-like text box */
.dialog-box {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.4em;
  padding: 0.7em 0.8em;
  background: #fff;
  border: var(--ink-width) solid var(--ink);
  border-radius: 0.5em;
  box-shadow:
    inset 0 0 0 0.2em #fff,
    inset 0 0 0 0.35em var(--player2),
    0.2em 0.2em 0 var(--ink);
}

.caption {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.95em;
  font-weight: 700;
  line-height: 1.25;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.caption-enter-active,
.caption-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.caption-enter-from {
  opacity: 0;
  transform: translateY(0.4em);
}

.caption-leave-to {
  opacity: 0;
}

.timer {
  height: 0.55em;
  background: #eee;
  border: 2px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: var(--pop-green);
  transition:
    width 1s linear,
    background-color 300ms;
}

.timer.urgent .timer-fill {
  background: var(--pop-red);
}

/* Action pad, bottom-right: inventory on top, switch on the left, big attack in the corner. */
.actions {
  position: relative;
  display: grid;
  grid-template-areas:
    '. bag'
    'switch attack';
  align-items: end;
  justify-items: center;
  gap: 1.5cqw;
}

.action-bag {
  grid-area: bag;
}

.action-switch {
  grid-area: switch;
}

.action-attack {
  grid-area: attack;
}

.secondary {
  --btn-bg: #fff;
}

.danger {
  --btn-bg: var(--pop-red);
  color: #fff;
}
</style>
