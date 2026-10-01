import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  canSwitchTo,
  chooseReplacement as engineChooseReplacement,
  createIdleState,
  createQuickMatchState,
  getActionError,
  handleTimeout,
  opponentOf,
  performTurn,
  type QuickMatchOptions,
  type Rng,
} from '@/game/engine'
import type { GameState, GifCard, PlayerId, Synergy, TurnAction } from '@/types'
import { detectSynergies } from '@/utils/synergy'

const TICK_MS = 1000

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(createIdleState())
  /** Incremented on every new match, lets views remount per-match components (e.g. the arena). */
  const matchId = ref(0)
  let rng: Rng = Math.random
  let timerId: ReturnType<typeof setInterval> | null = null

  // --- Getters -------------------------------------------------------------

  const isPlaying = computed(
    () => state.value.phase === 'battle' || state.value.phase === 'awaitingReplacement',
  )
  const currentPlayer = computed(() => state.value.players[state.value.currentPlayerId])
  const opponent = computed(() => state.value.players[opponentOf(state.value.currentPlayerId)])

  const activeGifs = computed<Record<PlayerId, GifCard | undefined>>(() => {
    const { player1, player2 } = state.value.players
    return {
      player1: player1.team[player1.activeIndex],
      player2: player2.team[player2.activeIndex],
    }
  })

  const activeSynergies = computed<Record<PlayerId, Synergy[]>>(() => ({
    player1: detectSynergies(state.value.players.player1.team),
    player2: detectSynergies(state.value.players.player2.team),
  }))

  const winner = computed(() =>
    state.value.winnerId ? state.value.players[state.value.winnerId] : null,
  )

  const actionError = (action: TurnAction) => getActionError(state.value, action)
  const isSwitchAllowed = (teamIndex: number) => canSwitchTo(state.value, teamIndex)

  // --- Timer ---------------------------------------------------------------

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId)
    timerId = null
  }

  function tick() {
    if (!isPlaying.value) return stopTimer()
    state.value.turnTimeLeft = Math.max(0, state.value.turnTimeLeft - 1)
    if (state.value.turnTimeLeft === 0) {
      handleTimeout(state.value, rng)
      syncTimer()
    }
  }

  function syncTimer() {
    if (!isPlaying.value) stopTimer()
    else if (timerId === null) timerId = setInterval(tick, TICK_MS)
  }

  // --- Actions -------------------------------------------------------------

  function startQuickMatch(options: QuickMatchOptions & { rng?: Rng } = {}) {
    stopTimer()
    rng = options.rng ?? Math.random
    state.value = createQuickMatchState(rng, options)
    matchId.value += 1
    syncTimer()
  }

  function submitAction(action: TurnAction) {
    performTurn(state.value, action, rng)
    syncTimer()
  }

  const attack = (attackId: string) => submitAction({ kind: 'attack', attackId })
  const switchTo = (targetIndex: number) => submitAction({ kind: 'switch', targetIndex })

  /** Sends a replacement after a K.O. (does not consume a turn). */
  function chooseReplacement(playerId: PlayerId, teamIndex: number) {
    engineChooseReplacement(state.value, playerId, teamIndex)
    syncTimer()
  }

  function reset() {
    stopTimer()
    state.value = createIdleState()
  }

  return {
    state,
    matchId,
    isPlaying,
    currentPlayer,
    opponent,
    activeGifs,
    activeSynergies,
    winner,
    actionError,
    isSwitchAllowed,
    startQuickMatch,
    submitAction,
    attack,
    switchTo,
    chooseReplacement,
    reset,
  }
})
