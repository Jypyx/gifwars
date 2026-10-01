import type { AttackType } from '@/types'

export const ATTACK_ONOMATOPOEIAS: Record<AttackType, readonly string[]> = {
  Physique: ['BAM !', 'POW !', 'PAF !', 'BONK !', 'WHAM !'],
  Magique: ['ZAP !', 'FWOOSH !', 'KRZZT !', 'ZING !'],
  Spéciale: ['KA-BOOM !', 'KRAKOOM !'],
}

export const EVENT_ONOMATOPOEIAS = {
  lag: 'BUFFERING…',
  miss: 'OUPS !',
  switch: 'SWITCH !',
  replacement: 'À TOI !',
  ko: 'K.O. !',
  timeout: 'TIC TAC !',
  victory: 'VICTOIRE !',
} as const
