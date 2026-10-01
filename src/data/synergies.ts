import type { Synergy } from '@/types'

export const SYNERGIES: readonly Synergy[] = [
  {
    id: 'second-breakfast',
    name: 'Second petit-déjeuner',
    description: 'Merry et Pippin partagent leurs provisions : +1 PV par tour.',
    gifIds: ['merry', 'pippin'],
    effect: { kind: 'HealPerTurn', amount: 1 },
    animationKey: 'second-breakfast',
    onomatopoeia: 'MIAM !',
  },
  {
    id: 'fool-of-a-took',
    name: 'Crétin de Touque !',
    description: 'Gandalf garde un œil sur Pippin (et son bâton sur sa tête) : +1 PV par tour.',
    gifIds: ['gandalf', 'pippin'],
    effect: { kind: 'HealPerTurn', amount: 1 },
    animationKey: 'fool-of-a-took',
    onomatopoeia: 'TOC !',
  },
  {
    id: 'prank-war',
    name: 'Guerre des farces',
    description: 'Les farces de Jim gardent Dwight sur le qui-vive : +1 PV par tour.',
    gifIds: ['jim', 'dwight'],
    effect: { kind: 'HealPerTurn', amount: 1 },
    animationKey: 'prank-war',
    onomatopoeia: 'PRANK !',
  },
  {
    id: 'leviosa',
    name: 'C’est Levi-O-sa',
    description: 'Hermione corrige Ron, encore : +1 PV par tour.',
    gifIds: ['ron', 'hermione'],
    effect: { kind: 'HealPerTurn', amount: 1 },
    animationKey: 'leviosa',
    onomatopoeia: 'SWISH !',
  },
  {
    id: 'mobile-lab',
    name: 'Labo ambulant',
    description: 'Walter et Jesse reprennent la cuisine dans le camping-car : +1 PV par tour.',
    gifIds: ['walter', 'jesse'],
    effect: { kind: 'HealPerTurn', amount: 1 },
    animationKey: 'mobile-lab',
    onomatopoeia: 'FSSHH !',
  },
]
