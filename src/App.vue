<script setup lang="ts">
import { onBeforeUnmount, watch, ref } from 'vue'
import { useGameStore } from './stores/gameStore'
import GameCanvas from './components/GameCanvas.vue'
import GameHud from './components/GameHud.vue'
import PlayerHand from './components/PlayerHand.vue'
import MasterPicker from './components/MasterPicker.vue'
import { playCue } from './services/audio'
import { notify, outcomeNotice } from './services/notifications'
import type { GameEvent, MasterKind } from './game/types'

const store = useGameStore()
const message = ref('')
let reminderTimer: ReturnType<typeof setTimeout> | null = null
let playbackToken = 0

function delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)) }
function eventDelay(event: GameEvent | null): number {
  if (!event) return 100
  return ({ place: 330, reveal: 430, master: 440, buff: 180, freeze: 240,
    attack: 360, damage: 220, death: 260, move: 290, blocked: 110,
    score: 480, 'sudden-death': 650, finish: 500, recycle: 140,
    pass: 100, ready: 90 } satisfies Record<GameEvent['type'], number>)[event.type]
}

async function playRound(): Promise<void> {
  const token = ++playbackToken
  await delay(180)
  while (token === playbackToken && store.replay.length) {
    store.advanceReplay()
    await delay(eventDelay(store.currentEvent))
  }
}

function place(row: number, col: number): void {
  const result = store.commit(row, col)
  if (!result.ok) { message.value = result.reason; playCue('hit'); return }
  message.value = ''
  void playRound()
}
function chooseMaster(kind: MasterKind): void {
  const result = store.chooseMaster(kind)
  if (!result.ok) { message.value = result.reason; return }
  message.value = ''
  playCue('master')
  void notify('start')
}
function restart(): void { playbackToken++; store.newGame(); message.value = '' }

watch(() => [store.game.phase, store.game.round, store.busy] as const, () => {
  if (reminderTimer) clearTimeout(reminderTimer)
  if (store.game.phase === 'placement' && !store.busy) {
    reminderTimer = setTimeout(() => {
      if (store.game.phase === 'placement' && !store.busy) void notify('reminder')
    }, 90_000)
  }
}, { immediate: true })

watch(() => store.eventVersion, () => {
  const event = store.currentEvent
  if (!event) return
  if (event.type === 'place') playCue('place')
  if (event.type === 'reveal') playCue('reveal')
  if (event.type === 'move') playCue('move')
  if (event.type === 'attack') playCue('attack')
  if (event.type === 'damage') playCue('hit')
  if (event.type === 'death') playCue('death')
  if (event.type === 'master') playCue('master')
  if (event.type === 'freeze') playCue('freeze')
  if (event.type === 'score') playCue('score')
  if (event.type === 'finish') {
    playCue(event.winner === 'player' ? 'win' : 'lose')
    void notify(outcomeNotice(event.winner))
  }
})
onBeforeUnmount(() => { playbackToken++; if (reminderTimer) clearTimeout(reminderTimer) })
</script>

<template>
  <div class="arena-backdrop"><div class="ambient-grid" /><div class="ambient-halo" /></div>
  <main class="game-shell">
    <GameHud />
    <div class="arena-section">
      <div class="arena-label left">● ENEMY TERRITORY</div>
      <div class="arena-label right">PLAYER TERRITORY ●</div>
      <GameCanvas @cell="place" />
      <div class="board-corner top-left" /><div class="board-corner top-right" /><div class="board-corner bottom-left" /><div class="board-corner bottom-right" />
      <div v-if="message" class="game-toast" role="alert">{{ message }}</div>
    </div>
    <div class="bottom-panel">
      <div class="command-row">
        <div class="command-copy"><b>{{ store.game.phase === 'finished' ? 'MATCH TERMINÉ' : store.game.suddenDeath ? 'MORT SUBITE' : store.busy ? 'RÉSOLUTION AUTO' : 'PHASE DE POSE' }}</b><small>{{ store.game.phase === 'finished' ? 'UNE REVANCHE ?' : store.busy ? 'REGARDE LA BATAILLE' : store.hasAnyMove ? '1 GIF PAR MANCHE' : 'CAMP SATURÉ' }}</small></div>
        <button v-if="store.game.phase === 'placement' && !store.hasAnyMove && !store.busy" class="arcade-button small" @click="place(0, 0)">CONTINUER ›</button>
        <span v-else class="phase-chevrons">⌁⌁⌁</span>
      </div>
      <PlayerHand />
    </div>
    <MasterPicker v-if="store.game.phase === 'master-selection'" :error="message" @choose="chooseMaster" />
    <div v-if="store.game.phase === 'finished'" class="result-overlay absolute inset-0 flex items-center justify-center">
      <div class="result-panel" :class="store.game.winner === 'player' ? 'victory' : 'defeat'">
        <div class="result-icon">{{ store.game.winner === 'player' ? '★' : '☠' }}</div>
        <p>FIN DE TRANSMISSION</p>
        <h1>{{ store.game.winner === 'player' ? 'VICTOIRE' : 'DÉFAITE' }}</h1>
        <span>MANCHE {{ store.game.round }} · {{ store.game.players.player.kills }} ÉLIMINATIONS</span>
        <button class="arcade-button" @click="restart">↻ &nbsp; REJOUER</button>
      </div>
    </div>
  </main>
</template>
