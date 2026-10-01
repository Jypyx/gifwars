import type { UniverseId, UniverseTheme } from '@/types'

export const UNIVERSES: Record<UniverseId, UniverseTheme> = {
  lotr: {
    id: 'lotr',
    name: 'Le Seigneur des Anneaux',
    primary: '#2E7D32',
    secondary: '#F9A825',
    accent: '#FFD54F',
    pattern: 'zigzag',
  },
  'the-office': {
    id: 'the-office',
    name: 'The Office',
    primary: '#1565C0',
    secondary: '#ECEFF1',
    accent: '#FFEB3B',
    pattern: 'grid',
  },
  'harry-potter': {
    id: 'harry-potter',
    name: 'Harry Potter',
    primary: '#8E1B1B',
    secondary: '#F4C430',
    accent: '#FFB300',
    pattern: 'stars',
  },
  'breaking-bad': {
    id: 'breaking-bad',
    name: 'Breaking Bad',
    primary: '#1B5E20',
    secondary: '#FDD835',
    accent: '#00E5FF',
    pattern: 'halftone',
  },
  'star-wars': {
    id: 'star-wars',
    name: 'Star Wars',
    primary: '#111111',
    secondary: '#FFE81F',
    accent: '#E53935',
    pattern: 'stripes',
  },
}
