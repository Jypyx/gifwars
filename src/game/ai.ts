/**
 * Computer opponent: scores every legal action with simple heuristics and picks one
 * according to the difficulty. Pure functions, like the engine.
 */
import { AI_DIFFICULTIES } from '@/config/ai'
import { STATUS_APPLY_CHANCE, STATUS_RULES } from '@/config/gameRules'
import type {
  AiDifficulty,
  Attack,
  GameState,
  GifCard,
  PlayerId,
  StatusEffectKind,
  TurnAction,
} from '@/types'
import { isKnockedOut } from '@/utils/gifs'
import { activeGifOf, getActionError, opponentOf, type Rng } from './engine'

/** Bonus for knocking the opposing GIF out, on top of the damage dealt. */
const KO_BONUS = 40
/** Value of keeping limited uses for later. */
const USE_COST: Record<Attack['type'], number> = { Physique: 0, Magique: 3, Spéciale: 12 }
/** A switch gives the opponent a free hit. */
const SWITCH_TEMPO_COST = 20
/** Saving a doomed GIF is only worth it if it has HP left (K.O. replacements are free anyway). */
const SAVE_BONUS = 25
const SAVE_FULL_VALUE_HP = 30

export interface ScoredAction {
  action: TurnAction
  score: number
}

const usableAttacks = (gif: GifCard): Attack[] => gif.attacks.filter((a) => a.currentUses !== 0)

/** Highest damage `gif` can deal on its next turn. */
const bestDamage = (gif: GifCard): number => Math.max(0, ...usableAttacks(gif).map((a) => a.damage))

/** Probability that `gif` actually lands its attack, given its status. */
function hitChance(gif: GifCard): number {
  if (gif.status?.effect === 'Lag') return 1 - STATUS_RULES.Lag.skipTurnChance
  if (gif.status?.effect === 'Boucle') return 1 - STATUS_RULES.Boucle.missChance
  return 1
}

/** Expected HP swing caused by inflicting `effect` on `target` for its whole duration. */
function statusValue(effect: StatusEffectKind, target: GifCard): number {
  switch (effect) {
    case 'BadBuzz':
      return (
        Math.round(target.maxHp * STATUS_RULES.BadBuzz.hpLossPercent) *
        STATUS_RULES.BadBuzz.durationTurns
      )
    case 'Lag':
      return STATUS_RULES.Lag.skipTurnChance * STATUS_RULES.Lag.durationTurns * bestDamage(target)
    case 'Boucle': {
      const selfHit = bestDamage(target) * (1 + STATUS_RULES.Boucle.selfDamageRatio)
      return STATUS_RULES.Boucle.missChance * STATUS_RULES.Boucle.durationTurns * selfHit
    }
  }
}

function scoreAttack(attacker: GifCard, target: GifCard, attack: Attack): number {
  const chance = hitChance(attacker)
  let score = chance * Math.min(attack.damage, target.currentHp)
  if (attack.damage >= target.currentHp) score += chance * KO_BONUS
  else if (attack.statusEffect && !target.status) {
    score += chance * STATUS_APPLY_CHANCE * statusValue(attack.statusEffect, target)
  }
  return score - USE_COST[attack.type]
}

function scoreSwitch(current: GifCard, candidate: GifCard, opponent: GifCard): number {
  const threat = bestDamage(opponent)
  let score = -SWITCH_TEMPO_COST
  // Save a GIF that would be knocked out, if the newcomer can take the hit.
  if (threat >= current.currentHp && threat < candidate.currentHp) {
    score += SAVE_BONUS * Math.min(1, current.currentHp / SAVE_FULL_VALUE_HP)
  }
  // Leaving the fight freezes the status of the benched GIF.
  if (current.status) score += current.status.effect === 'BadBuzz' ? 8 : 12
  score += (candidate.currentHp / candidate.maxHp - current.currentHp / current.maxHp) * 10
  return score
}

/** Every legal action for `playerId`, best first. */
export function scoreActions(
  state: GameState,
  playerId: PlayerId,
  allowSwitch = true,
): ScoredAction[] {
  const player = state.players[playerId]
  const attacker = activeGifOf(player)
  const target = activeGifOf(state.players[opponentOf(playerId)])

  const scored: ScoredAction[] = usableAttacks(attacker).map((attack) => ({
    action: { kind: 'attack', attackId: attack.id },
    score: scoreAttack(attacker, target, attack),
  }))
  if (allowSwitch) {
    player.team.forEach((candidate, targetIndex) => {
      if (targetIndex === player.activeIndex || isKnockedOut(candidate)) return
      scored.push({
        action: { kind: 'switch', targetIndex },
        score: scoreSwitch(attacker, candidate, target),
      })
    })
  }
  return scored
    .filter(({ action }) => getActionError(state, action) === null)
    .sort((a, b) => b.score - a.score)
}

/** Picks the action of the current player, who must be `playerId`. */
export function chooseAiAction(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  rng: Rng,
): TurnAction {
  const settings = AI_DIFFICULTIES[difficulty]
  const scored = scoreActions(state, playerId, settings.canSwitch)
  if (rng() < settings.mistakeChance) {
    const attacks = scored.filter(({ action }) => action.kind === 'attack')
    const random = attacks[Math.floor(rng() * attacks.length)]
    if (random) return random.action
  }
  const best = scored[0]
  if (!best) throw new Error(`${playerId} has no legal action`)
  return best.action
}

/** Picks which GIF to send after a K.O. */
export function chooseAiReplacement(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  rng: Rng,
): number {
  const team = state.players[playerId].team
  const alive = team.map((gif, index) => ({ gif, index })).filter(({ gif }) => !isKnockedOut(gif))
  if (alive.length === 0) throw new Error(`${playerId} has no GIF left`)

  if (difficulty === 'facile') return alive[Math.floor(rng() * alive.length)]!.index

  const opponent = activeGifOf(state.players[opponentOf(playerId)])
  const threat = bestDamage(opponent)
  const score = (gif: GifCard) =>
    (bestDamage(gif) >= opponent.currentHp ? 30 : 0) +
    (threat < gif.currentHp ? 15 : 0) +
    (gif.currentHp / gif.maxHp) * 10 +
    bestDamage(gif) * 0.3
  return alive.reduce((best, entry) => (score(entry.gif) > score(best.gif) ? entry : best)).index
}
