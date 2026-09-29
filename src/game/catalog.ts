import type { Archetype, MasterKind, UnitKind } from './types'

export interface UnitDefinition {
  name: string; title: string; hp: number; attack: number; range: number
  color: string; glyph: string; description: string
}
export const ARCHETYPES: Archetype[] = ['tank', 'fighter', 'shooter', 'sniper', 'berserker']
export const MASTERS: MasterKind[] = ['strategist', 'protector', 'detonator', 'cryomancer', 'assassin']
export const CATALOG: Record<UnitKind, UnitDefinition> = {
  tank: { name: 'Tank', title: 'LE BOUCLIER', hp: 5, attack: 1, range: 1, color: '#a3e866', glyph: '▣', description: 'Encaisse et tient le couloir.' },
  fighter: { name: 'Combattant', title: 'LE DUELLISTE', hp: 3, attack: 2, range: 1, color: '#ffbd69', glyph: '⚔', description: 'Équilibré. Au cœur de la mêlée.' },
  shooter: { name: 'Tireur', title: 'LE BLASTER', hp: 2, attack: 2, range: 2, color: '#6edcfa', glyph: '⌖', description: 'Tire à deux cases dans son couloir.' },
  sniper: { name: 'Sniper', title: 'L’ŒIL', hp: 1, attack: 3, range: 3, color: '#bc9bff', glyph: '◎', description: 'Trois cases de portée. Fragile et fatal.' },
  berserker: { name: 'Berserker', title: 'LA FURIE', hp: 1, attack: 4, range: 1, color: '#ff7789', glyph: 'ϟ', description: 'Une frappe dévastatrice.' },
  strategist: { name: 'Stratège', title: 'SURCHARGE', hp: 3, attack: 2, range: 2, color: '#f8d779', glyph: '♛', description: '+1 ATK permanente aux alliés présents, lui inclus.' },
  protector: { name: 'Protecteur', title: 'BASTION', hp: 3, attack: 2, range: 2, color: '#a3e866', glyph: '◈', description: '+2 PV aux alliés présents, lui inclus.' },
  detonator: { name: 'Détonateur', title: 'SUPERNOVA', hp: 3, attack: 2, range: 2, color: '#ff9b69', glyph: '✹', description: 'Inflige 1 dégât à chaque ennemi.' },
  cryomancer: { name: 'Cryomancien', title: 'ZÉRO ABSOLU', hp: 3, attack: 2, range: 2, color: '#6edcfa', glyph: '❄', description: 'Gèle tous les ennemis pour cette manche.' },
  assassin: { name: 'Assassin', title: 'DERNIÈRE OMBRE', hp: 3, attack: 2, range: 2, color: '#bc9bff', glyph: '✦', description: 'Détruit l’ennemi le plus proche de votre base.' }
}
