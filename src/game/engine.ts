/**
 * Turn-based battle engine: pure functions mutating a `GameState`.
 * Randomness is injected (`Rng`) so fights can be replayed deterministically in tests.
 */
import {
  QUICK_MATCH_RARITY_SLOTS,
  STATUS_APPLY_CHANCE,
  STATUS_RULES,
  TURN_DURATION_SECONDS,
} from '@/config/gameRules'
import { ATTACK_ONOMATOPOEIAS, EVENT_ONOMATOPOEIAS } from '@/config/onomatopoeias'
import { GIFS_DATA } from '@/data/gifsData'
import type { Attack, BattleEvent, GameState, GifCard, Player, PlayerId, TurnAction } from '@/types'
import { createGifInstance, isKnockedOut } from '@/utils/gifs'
import { detectSynergies } from '@/utils/synergy'

/** Returns a float in [0, 1), like `Math.random`. */
export type Rng = () => number

export const PLAYER_IDS: readonly PlayerId[] = ['player1', 'player2']

export const opponentOf = (id: PlayerId): PlayerId => (id === 'player1' ? 'player2' : 'player1')

export function activeGifOf(player: Player): GifCard {
  const gif = player.team[player.activeIndex]
  if (!gif) throw new Error(`${player.id} has no active GIF`)
  return gif
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]!

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const emptyPlayer = (id: PlayerId, name: string): Player => ({ id, name, team: [], activeIndex: 0 })

export function createIdleState(): GameState {
  return {
    phase: 'idle',
    players: {
      player1: emptyPlayer('player1', 'Joueur 1'),
      player2: emptyPlayer('player2', 'Joueur 2'),
    },
    currentPlayerId: 'player1',
    turnNumber: 0,
    turnTimeLeft: TURN_DURATION_SECONDS,
    pendingReplacements: [],
    winnerId: null,
    log: [],
  }
}

/**
 * Draws one team per player following `QUICK_MATCH_RARITY_SLOTS`, without any GIF appearing
 * twice across both teams. Team order is shuffled so the lead GIF is not always a Common.
 */
export function drawQuickMatchTeams(
  catalogue: readonly GifCard[],
  rng: Rng,
  teamCount = PLAYER_IDS.length,
): GifCard[][] {
  const pool = [...catalogue]
  return Array.from({ length: teamCount }, () => {
    const team = QUICK_MATCH_RARITY_SLOTS.map((slot) => {
      const candidates = pool.filter((gif) => slot.includes(gif.rarity))
      if (candidates.length === 0) {
        throw new Error(`Catalogue too small: no GIF left for slot ${slot.join('/')}`)
      }
      const chosen = pick(candidates, rng)
      pool.splice(pool.indexOf(chosen), 1)
      return createGifInstance(chosen)
    })
    return shuffle(team, rng)
  })
}

export interface QuickMatchOptions {
  playerNames?: Partial<Record<PlayerId, string>>
  firstPlayer?: PlayerId
  catalogue?: readonly GifCard[]
}

export function createQuickMatchState(rng: Rng, options: QuickMatchOptions = {}): GameState {
  const [team1, team2] = drawQuickMatchTeams(options.catalogue ?? GIFS_DATA, rng)
  const state = createIdleState()
  state.players.player1 = {
    ...state.players.player1,
    name: options.playerNames?.player1 ?? 'Joueur 1',
    team: team1!,
  }
  state.players.player2 = {
    ...state.players.player2,
    name: options.playerNames?.player2 ?? 'Joueur 2',
    team: team2!,
  }
  state.phase = 'battle'
  state.currentPlayerId = options.firstPlayer ?? (rng() < 0.5 ? 'player1' : 'player2')
  state.turnNumber = 1
  return state
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Returns why `action` is not allowed for the current player, or `null` if it is valid. */
export function getActionError(state: GameState, action: TurnAction): string | null {
  if (state.phase !== 'battle') return 'Aucun tour en cours.'
  const player = state.players[state.currentPlayerId]

  if (action.kind === 'attack') {
    const attack = activeGifOf(player).attacks.find((a) => a.id === action.attackId)
    if (!attack) return 'Attaque inconnue.'
    if (attack.currentUses === 0) return `${attack.name} n’a plus d’utilisations.`
    return null
  }

  const target = player.team[action.targetIndex]
  if (!target) return 'GIF inconnu.'
  if (action.targetIndex === player.activeIndex) return `${target.name} est déjà au combat.`
  if (isKnockedOut(target)) return `${target.name} est K.O.`
  return null
}

export const canSwitchTo = (state: GameState, targetIndex: number): boolean =>
  getActionError(state, { kind: 'switch', targetIndex }) === null

// ---------------------------------------------------------------------------
// Turn resolution
// ---------------------------------------------------------------------------

function log(state: GameState, playerId: PlayerId, event: BattleEvent, onomatopoeia?: string) {
  state.log.push({ turn: state.turnNumber, playerId, event, onomatopoeia })
}

/** Removes up to `amount` HP and returns the damage actually dealt. */
function applyDamage(gif: GifCard, amount: number): number {
  const dealt = Math.min(gif.currentHp, Math.max(0, amount))
  gif.currentHp -= dealt
  return dealt
}

function logIfKnockedOut(state: GameState, ownerId: PlayerId, gif: GifCard) {
  if (!isKnockedOut(gif)) return
  gif.status = null
  log(state, ownerId, { kind: 'ko', gifId: gif.id }, EVENT_ONOMATOPOEIAS.ko)
}

function resolveAttack(state: GameState, playerId: PlayerId, attackId: string, rng: Rng) {
  const attacker = activeGifOf(state.players[playerId])
  const attack: Attack = attacker.attacks.find((a) => a.id === attackId)!

  // Lag: the GIF fails to load, the turn is lost but the attack is not consumed.
  if (attacker.status?.effect === 'Lag' && rng() < STATUS_RULES.Lag.skipTurnChance) {
    log(
      state,
      playerId,
      { kind: 'turnSkipped', gifId: attacker.id, reason: 'Lag' },
      EVENT_ONOMATOPOEIAS.lag,
    )
    return
  }

  if (attack.currentUses !== null) attack.currentUses -= 1

  // Boucle: the GIF loops, misses and hurts itself.
  if (attacker.status?.effect === 'Boucle' && rng() < STATUS_RULES.Boucle.missChance) {
    const selfDamage = applyDamage(
      attacker,
      Math.round(attack.damage * STATUS_RULES.Boucle.selfDamageRatio),
    )
    log(
      state,
      playerId,
      { kind: 'miss', attackerId: attacker.id, attackId: attack.id, selfDamage },
      EVENT_ONOMATOPOEIAS.miss,
    )
    logIfKnockedOut(state, playerId, attacker)
    return
  }

  const targetOwnerId = opponentOf(playerId)
  const target = activeGifOf(state.players[targetOwnerId])
  const damage = applyDamage(target, attack.damage)
  log(
    state,
    playerId,
    { kind: 'attack', attackerId: attacker.id, targetId: target.id, attackId: attack.id, damage },
    pick(ATTACK_ONOMATOPOEIAS[attack.type], rng),
  )

  if (isKnockedOut(target)) {
    logIfKnockedOut(state, targetOwnerId, target)
    return
  }

  // Statuses don't stack: a GIF already affected keeps its current status.
  if (attack.statusEffect && !target.status && rng() < STATUS_APPLY_CHANCE) {
    const effect = attack.statusEffect
    target.status = { effect, turnsLeft: STATUS_RULES[effect].durationTurns }
    log(state, playerId, { kind: 'statusApplied', targetId: target.id, effect })
  }
}

/**
 * End of `playerId`'s turn: its active GIF's status ticks (Bad Buzz damage, duration countdown)
 * and its active synergies heal their members.
 */
function applyEndOfTurnEffects(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId]
  const gif = activeGifOf(player)

  if (gif.status && !isKnockedOut(gif)) {
    const { effect } = gif.status
    if (effect === 'BadBuzz') {
      const damage = applyDamage(
        gif,
        Math.max(1, Math.round(gif.maxHp * STATUS_RULES.BadBuzz.hpLossPercent)),
      )
      log(state, playerId, { kind: 'statusTick', targetId: gif.id, effect, damage })
      logIfKnockedOut(state, playerId, gif)
    }
    if (gif.status) {
      gif.status.turnsLeft -= 1
      if (gif.status.turnsLeft <= 0) {
        gif.status = null
        log(state, playerId, { kind: 'statusExpired', targetId: gif.id, effect })
      }
    }
  }

  for (const synergy of detectSynergies(player.team)) {
    if (synergy.effect.kind !== 'HealPerTurn') continue
    for (const member of player.team.filter((g) => synergy.gifIds.includes(g.id))) {
      const amount = Math.min(synergy.effect.amount, member.maxHp - member.currentHp)
      if (amount <= 0) continue
      member.currentHp += amount
      log(state, playerId, { kind: 'synergyHeal', synergyId: synergy.id, gifId: member.id, amount })
    }
  }
}

const isTeamWiped = (player: Player): boolean => player.team.every(isKnockedOut)

/** Ends the game if a team is fully K.O. Returns `true` when the game is over. */
function checkVictory(state: GameState): boolean {
  const loser = PLAYER_IDS.find((id) => isTeamWiped(state.players[id]))
  if (!loser) return false
  const winnerId = opponentOf(loser)
  state.phase = 'finished'
  state.winnerId = winnerId
  state.pendingReplacements = []
  log(state, winnerId, { kind: 'victory', winnerId }, EVENT_ONOMATOPOEIAS.victory)
  return true
}

/** Resolves the current player's action, end-of-turn effects, then hands the turn over. */
export function performTurn(state: GameState, action: TurnAction, rng: Rng): void {
  const error = getActionError(state, action)
  if (error) throw new Error(error)

  const playerId = state.currentPlayerId
  const player = state.players[playerId]

  if (action.kind === 'switch') {
    const fromId = activeGifOf(player).id
    player.activeIndex = action.targetIndex
    log(
      state,
      playerId,
      { kind: 'switch', fromId, toId: activeGifOf(player).id },
      EVENT_ONOMATOPOEIAS.switch,
    )
  } else {
    resolveAttack(state, playerId, action.attackId, rng)
  }

  if (checkVictory(state)) return
  applyEndOfTurnEffects(state, playerId)
  if (checkVictory(state)) return

  state.currentPlayerId = opponentOf(playerId)
  state.turnNumber += 1
  state.turnTimeLeft = TURN_DURATION_SECONDS

  // A K.O. forces a replacement, which does not consume the next player's turn.
  const pending = PLAYER_IDS.filter((id) => isKnockedOut(activeGifOf(state.players[id])))
  if (pending.length > 0) {
    state.phase = 'awaitingReplacement'
    state.pendingReplacements = pending
  }
}

export function chooseReplacement(state: GameState, playerId: PlayerId, teamIndex: number): void {
  if (state.phase !== 'awaitingReplacement' || !state.pendingReplacements.includes(playerId)) {
    throw new Error('Aucun remplacement attendu pour ce joueur.')
  }
  const player = state.players[playerId]
  const replacement = player.team[teamIndex]
  if (!replacement || isKnockedOut(replacement)) throw new Error('Remplaçant invalide.')

  player.activeIndex = teamIndex
  log(
    state,
    playerId,
    { kind: 'replacement', gifId: replacement.id },
    EVENT_ONOMATOPOEIAS.replacement,
  )

  state.pendingReplacements = state.pendingReplacements.filter((id) => id !== playerId)
  if (state.pendingReplacements.length === 0) {
    state.phase = 'battle'
    state.turnTimeLeft = TURN_DURATION_SECONDS
  }
}

/**
 * Timer ran out: the current player's basic physical attack is launched,
 * or pending replacements are filled with the first available GIF.
 */
export function handleTimeout(state: GameState, rng: Rng): void {
  if (state.phase === 'battle') {
    const playerId = state.currentPlayerId
    const gif = activeGifOf(state.players[playerId])
    log(state, playerId, { kind: 'timeout', gifId: gif.id }, EVENT_ONOMATOPOEIAS.timeout)
    performTurn(state, { kind: 'attack', attackId: gif.attacks[0].id }, rng)
  } else if (state.phase === 'awaitingReplacement') {
    for (const playerId of state.pendingReplacements) {
      const index = state.players[playerId].team.findIndex((gif) => !isKnockedOut(gif))
      chooseReplacement(state, playerId, index)
    }
  }
}
