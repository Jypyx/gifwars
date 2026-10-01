import { STATUS_INFO } from '@/config/statusInfo'
import { SYNERGIES } from '@/data/synergies'
import type { BattleLogEntry, GifCard, Player, PlayerId } from '@/types'

/** Builds a function turning battle log entries into French captions for the given players. */
export function createEventDescriber(players: Record<PlayerId, Player>) {
  const gifs = new Map<string, GifCard>(
    [...players.player1.team, ...players.player2.team].map((gif) => [gif.id, gif]),
  )
  const gifName = (id: string) => gifs.get(id)?.name ?? id
  const attackName = (gifId: string, attackId: string) =>
    gifs.get(gifId)?.attacks.find((a) => a.id === attackId)?.name ?? attackId

  return ({ event }: BattleLogEntry): string => {
    switch (event.kind) {
      case 'attack':
        return `${gifName(event.attackerId)} utilise ${attackName(event.attackerId, event.attackId)} : ${event.damage} dégâts à ${gifName(event.targetId)} !`
      case 'miss':
        return `${gifName(event.attackerId)} tourne en boucle et rate ${attackName(event.attackerId, event.attackId)}… et perd ${event.selfDamage} PV !`
      case 'statusApplied':
        return `${gifName(event.targetId)} subit ${STATUS_INFO[event.effect].label} !`
      case 'statusTick':
        return `${gifName(event.targetId)} perd ${event.damage} PV à cause du ${STATUS_INFO[event.effect].label}.`
      case 'statusExpired':
        return `${gifName(event.targetId)} n’est plus affecté par ${STATUS_INFO[event.effect].label}.`
      case 'turnSkipped':
        return `${gifName(event.gifId)} bufferise… tour perdu !`
      case 'timeout':
        return `Temps écoulé ! ${gifName(event.gifId)} attaque automatiquement.`
      case 'switch':
        return `${gifName(event.fromId)} laisse sa place à ${gifName(event.toId)}.`
      case 'replacement':
        return `${gifName(event.gifId)} entre en scène !`
      case 'ko':
        return `${gifName(event.gifId)} est K.O. !`
      case 'synergyHeal': {
        const synergy = SYNERGIES.find((s) => s.id === event.synergyId)
        return `${synergy?.name ?? 'Synergie'} : ${gifName(event.gifId)} récupère ${event.amount} PV.`
      }
      case 'victory':
        return `${players[event.winnerId].name} remporte la partie !`
    }
  }
}
