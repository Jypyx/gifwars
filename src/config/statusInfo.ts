import type { AttackType, StatusEffectKind } from '@/types'

export const STATUS_INFO: Record<
  StatusEffectKind,
  { label: string; color: string; description: string }
> = {
  Lag: {
    label: 'Lag',
    color: '#8E24AA',
    description: 'Buffering… risque de perdre son tour en attaquant.',
  },
  BadBuzz: {
    label: 'Bad Buzz',
    color: '#E65100',
    description: 'Perd des PV à la fin de chacun de ses tours.',
  },
  Boucle: {
    label: 'Boucle',
    color: '#00897B',
    description: 'Peut rater son attaque et se blesser lui-même.',
  },
}

export const ATTACK_TYPE_COLORS: Record<AttackType, string> = {
  Physique: '#E53935',
  Magique: '#1E88E5',
  Spéciale: '#FFB300',
}
