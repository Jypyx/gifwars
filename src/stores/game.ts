import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AI_THINK_MS } from '@/config/ai'
import { chooseAiAction, chooseAiReplacement } from '@/game/ai'
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
import type { Controller, GameState, GifCard, PlayerId, Synergy, TurnAction } from '@/types'
import { detectSynergies } from '@/utils/synergy'

const TICK_MS = 1000
const HUMAN: Controller = { kind: 'human' }

export interface StartOptions extends QuickMatchOptions {
  rng?: Rng
  /** Defaults to two humans sharing the screen. */
  controllers?: Partial<Record<PlayerId, Controller>>
}

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(createIdleState())
  /** Incremented on every new match, lets views remount per-match components (e.g. the arena). */
  const matchId = ref(0)
  const controllers = ref<Record<PlayerId, Controller>>({ player1: HUMAN, player2: HUMAN })
  /**
   * Set by the view while battle animations play: the turn timer is paused and the AI waits,
   * so nobody loses time watching an animation.
   */
  const presentationBusy = ref(false)
  let rng: Rng = Math.random
  let timerId: ReturnType<typeof setInterval> | null = null
  let aiTimerId: ReturnType<typeof setTimeout> | null = null

  // --- Getters -------------------------------------------------------------

  const isPlaying = computed(
    () => state.value.phase === 'battle' || state.value.phase === 'awaitingReplacement',
  )
  const currentPlayer = computed(() => state.value.players[state.value.currentPlayerId])
  const opponent = computed(() => state.value.players[opponentOf(state.value.currentPlayerId)])

  const isAi = (playerId: PlayerId) => controllers.value[playerId].kind === 'ai'
  const isVsAi = computed(() => isAi('player1') || isAi('player2'))
  /** The current player is a human who can act right now. */
  const isHumanTurn = computed(
    () => state.value.phase === 'battle' && !isAi(state.value.currentPlayerId),
  )
  /** First human player who must send a replacement, if any. */
  const humanReplacementFor = computed<PlayerId | null>(() =>
    state.value.phase === 'awaitingReplacement'
      ? (state.value.pendingReplacements.find((id) => !isAi(id)) ?? null)
      : null,
  )

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

  // --- Turn timer ----------------------------------------------------------

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId)
    timerId = null
  }

  function tick() {
    if (!isPlaying.value) return stopTimer()
    if (presentationBusy.value) return
    state.value.turnTimeLeft = Math.max(0, state.value.turnTimeLeft - 1)
    if (state.value.turnTimeLeft === 0) {
      handleTimeout(state.value, rng)
      afterChange()
    }
  }

  // --- AI ------------------------------------------------------------------

  function cancelAi() {
    if (aiTimerId !== null) clearTimeout(aiTimerId)
    aiTimerId = null
  }

  /** AI player expected to act now (turn or replacement), if any. */
  function pendingAiActor(): PlayerId | null {
    const { phase, currentPlayerId, pendingReplacements } = state.value
    if (phase === 'awaitingReplacement') return pendingReplacements.find(isAi) ?? null
    if (phase === 'battle' && isAi(currentPlayerId)) return currentPlayerId
    return null
  }

  function runAi(playerId: PlayerId) {
    const controller = controllers.value[playerId]
    if (controller.kind !== 'ai') return
    const { phase, currentPlayerId, pendingReplacements } = state.value

    if (phase === 'awaitingReplacement' && pendingReplacements.includes(playerId)) {
      const index = chooseAiReplacement(state.value, playerId, controller.difficulty, rng)
      engineChooseReplacement(state.value, playerId, index)
    } else if (phase === 'battle' && currentPlayerId === playerId) {
      performTurn(
        state.value,
        chooseAiAction(state.value, playerId, controller.difficulty, rng),
        rng,
      )
    }
    afterChange()
  }

  function scheduleAi() {
    cancelAi()
    if (!isPlaying.value || presentationBusy.value) return
    const actor = pendingAiActor()
    if (!actor) return
    aiTimerId = setTimeout(() => {
      aiTimerId = null
      runAi(actor)
    }, AI_THINK_MS)
  }

  /** Keeps the turn timer and the AI in sync with the state after every change. */
  function afterChange() {
    if (!isPlaying.value) stopTimer()
    else if (timerId === null) timerId = setInterval(tick, TICK_MS)
    scheduleAi()
  }

  // --- Actions -------------------------------------------------------------

  function startQuickMatch(options: StartOptions = {}) {
    stopTimer()
    cancelAi()
    rng = options.rng ?? Math.random
    controllers.value = {
      player1: options.controllers?.player1 ?? HUMAN,
      player2: options.controllers?.player2 ?? HUMAN,
    }
    presentationBusy.value = false
    state.value = createQuickMatchState(rng, options)
    matchId.value += 1
    afterChange()
  }

  /** Plays the current human player's action. */
  function submitAction(action: TurnAction) {
    if (isAi(state.value.currentPlayerId)) throw new Error('C’est au tour de l’ordinateur.')
    performTurn(state.value, action, rng)
    afterChange()
  }

  const attack = (attackId: string) => submitAction({ kind: 'attack', attackId })
  const switchTo = (targetIndex: number) => submitAction({ kind: 'switch', targetIndex })

  /** Sends a replacement after a K.O. (does not consume a turn). */
  function chooseReplacement(playerId: PlayerId, teamIndex: number) {
    if (isAi(playerId)) throw new Error('L’ordinateur choisit lui-même son remplaçant.')
    engineChooseReplacement(state.value, playerId, teamIndex)
    afterChange()
  }

  function setPresentationBusy(busy: boolean) {
    if (presentationBusy.value === busy) return
    presentationBusy.value = busy
    if (isPlaying.value) afterChange()
  }

  function reset() {
    stopTimer()
    cancelAi()
    presentationBusy.value = false
    controllers.value = { player1: HUMAN, player2: HUMAN }
    state.value = createIdleState()
  }

  return {
    state,
    matchId,
    controllers,
    presentationBusy,
    isPlaying,
    isVsAi,
    isHumanTurn,
    humanReplacementFor,
    currentPlayer,
    opponent,
    activeGifs,
    activeSynergies,
    winner,
    isAi,
    actionError,
    isSwitchAllowed,
    startQuickMatch,
    submitAction,
    attack,
    switchTo,
    chooseReplacement,
    setPresentationBusy,
    reset,
  }
})
