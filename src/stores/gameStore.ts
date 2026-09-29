import { defineStore } from 'pinia'
import { computed, ref, shallowRef, toRaw } from 'vue'
import { availableDeployments, canUseMaster, cardFor, createInitialGame, legalCells, resolveRound, selectMaster } from '../game/engine'
import { CATALOG } from '../game/catalog'
import type { ActionResult, Cell, Deployment, GameEvent, GameState, MasterKind, Placement, ReplayFrame } from '../game/types'

export const useGameStore = defineStore('game', () => {
  const game = ref<GameState>(createInitialGame())
  const replay = shallowRef<ReplayFrame[]>([])
  const currentEvent = shallowRef<GameEvent | null>(null)
  const eventVersion = ref(0)
  const busy = computed(() => replay.value.length > 0)
  const selectedCard = computed(() => game.value.selection?.type === 'card'
    ? cardFor(game.value, 'player', game.value.selection.cardId) : undefined)
  const selectedName = computed(() => game.value.selection?.type === 'master'
    ? CATALOG[game.value.players.player.master!].name
    : selectedCard.value ? CATALOG[selectedCard.value.archetype].name : null)
  const validCells = computed(() => game.value.selection
    ? legalCells(game.value, 'player', game.value.selection) : [] as Cell[])
  const masterReady = computed(() => canUseMaster(game.value, 'player'))
  const hasAnyMove = computed(() => availableDeployments(game.value, 'player').length > 0)

  function newGame(seed = Date.now()): void {
    game.value = createInitialGame(seed)
    replay.value = []
    currentEvent.value = null
  }
  function chooseMaster(kind: MasterKind): ActionResult {
    // The pure engine clones its input; structuredClone cannot clone Vue proxies.
    try { game.value = selectMaster(toRaw(game.value), kind); return { ok: true } }
    catch (error) { return { ok: false, reason: (error as Error).message } }
  }
  function select(deployment: Deployment | null): ActionResult {
    if (game.value.phase !== 'placement' || busy.value) return { ok: false, reason: 'Attends la fin de la manche.' }
    if (deployment?.type === 'card' && !cardFor(game.value, 'player', deployment.cardId)) return { ok: false, reason: 'Carte absente de la main.' }
    if (deployment?.type === 'master' && !canUseMaster(game.value, 'player')) return { ok: false, reason: 'Master encore verrouillé.' }
    game.value.selection = deployment
    return { ok: true }
  }
  function commit(row: number, col: number): ActionResult {
    if (game.value.phase !== 'placement' || busy.value) return { ok: false, reason: 'Attends la fin de la manche.' }
    const selection = game.value.selection
    if (!selection && hasAnyMove.value) return { ok: false, reason: 'Choisis un Gif dans ta main.' }
    if (selection && !validCells.value.some(cell => cell.row === row && cell.col === col)) {
      return { ok: false, reason: 'Case indisponible. Choisis une case illuminée.' }
    }
    const placement: Placement | null = selection ? { deployment: selection, row, col } : null
    try {
      const result = resolveRound(toRaw(game.value), placement)
      replay.value = result.frames
      // Mutate these fields without spreading reactive nested objects into state.
      game.value.phase = 'revealing'
      game.value.selection = null
      currentEvent.value = null
      return { ok: true }
    } catch (error) { return { ok: false, reason: (error as Error).message } }
  }
  function advanceReplay(): boolean {
    const [frame, ...rest] = replay.value
    if (!frame) return false
    replay.value = rest
    game.value = frame.state
    currentEvent.value = frame.event
    eventVersion.value++
    return rest.length > 0
  }
  function finishReplay(): void { while (advanceReplay()) { /* jump to latest state */ } }
  return {
    game, replay, currentEvent, eventVersion, busy, selectedCard, selectedName,
    validCells, masterReady, hasAnyMove,
    newGame, chooseMaster, select, commit, advanceReplay, finishReplay
  }
})
