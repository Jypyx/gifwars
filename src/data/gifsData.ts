import type {
  GifCard,
  GifDefinition,
  MagicAttack,
  PhysicalAttack,
  SpecialAttack,
  StatusEffect,
} from '@/types'

/** Giphy renditions: `200` (200px high, light, default) or `giphy` (original, heavy). */
export function giphyUrl(id: string, rendition: '200' | 'giphy' = '200'): string {
  return `https://media.giphy.com/media/${id}/${rendition}.gif`
}

const physical = (
  id: string,
  name: string,
  damage: number,
  statusEffect: StatusEffect = null,
): PhysicalAttack => ({
  id,
  name,
  type: 'Physique',
  damage,
  maxUses: null,
  currentUses: null,
  statusEffect,
})

const magic = (
  id: string,
  name: string,
  damage: number,
  maxUses: number,
  statusEffect: StatusEffect = null,
): MagicAttack => ({
  id,
  name,
  type: 'Magique',
  damage,
  maxUses,
  currentUses: maxUses,
  statusEffect,
})

const special = (
  id: string,
  name: string,
  damage: number,
  statusEffect: StatusEffect = null,
): SpecialAttack => ({
  id,
  name,
  type: 'Spéciale',
  damage,
  maxUses: 1,
  currentUses: 1,
  statusEffect,
})

const defineGif = (def: GifDefinition): GifCard =>
  ({ ...def, currentHp: def.maxHp, status: null }) as GifCard

/**
 * Mock catalogue. 4 Commons, 4 Rares, 2 Epics, 2 Legendaries: enough for two
 * Quick Match teams without duplicates.
 */
export const GIFS_DATA: readonly GifCard[] = [
  // --- Le Seigneur des Anneaux ---
  defineGif({
    id: 'merry',
    name: 'Merry',
    universe: 'lotr',
    rarity: 'Commun',
    gifUrl: giphyUrl('YZjHGZdwdBMfS'),
    catchphrase: 'Ça, mon ami, c’est une pinte.',
    maxHp: 65,
    attacks: [physical('merry-pint', 'Coup de chope', 14)],
  }),
  defineGif({
    id: 'pippin',
    name: 'Pippin',
    universe: 'lotr',
    rarity: 'Commun',
    gifUrl: giphyUrl('4A3JQJ3BMvJUk'),
    catchphrase: 'Et le second petit-déjeuner ?',
    maxHp: 62,
    attacks: [physical('pippin-bucket', 'Seau dans le puits', 15)],
  }),
  defineGif({
    id: 'gandalf',
    name: 'Gandalf',
    universe: 'lotr',
    rarity: 'Légendaire',
    gifUrl: giphyUrl('jqDU6oXajm0RsoxhdB'),
    catchphrase: 'Un magicien n’est jamais en retard.',
    maxHp: 130,
    attacks: [
      physical('gandalf-staff', 'Coup de bâton', 16),
      magic('gandalf-fireworks', 'Feux d’artifice de la Comté', 22, 3, 'Lag'),
      magic('gandalf-anor', 'Flamme d’Anor', 27, 2, 'BadBuzz'),
      special('gandalf-shall-not-pass', 'Vous ne passerez pas !', 50, 'Lag'),
    ],
  }),

  // --- The Office ---
  defineGif({
    id: 'jim',
    name: 'Jim Halpert',
    universe: 'the-office',
    rarity: 'Commun',
    gifUrl: giphyUrl('LTVRtnzWUINBC'),
    catchphrase: '*Regarde la caméra*',
    maxHp: 66,
    attacks: [physical('jim-jello', 'Agrafeuse en gelée', 13)],
  }),
  defineGif({
    id: 'dwight',
    name: 'Dwight Schrute',
    universe: 'the-office',
    rarity: 'Rare',
    gifUrl: giphyUrl('knFgw9Y1dPXEu48XAw'),
    catchphrase: 'Fausse. Question.',
    maxHp: 85,
    attacks: [
      physical('dwight-beet', 'Lancer de betterave', 15),
      magic('dwight-fire-drill', 'Exercice d’évacuation', 24, 3, 'Boucle'),
    ],
  }),
  defineGif({
    id: 'michael',
    name: 'Michael Scott',
    universe: 'the-office',
    rarity: 'Épique',
    gifUrl: giphyUrl('vZXpOtHPCqLyT5vqfF'),
    catchphrase: 'Je ne suis pas superstitieux, mais je suis un peu stitieux.',
    maxHp: 105,
    attacks: [
      physical('michael-finger-guns', 'Pistolets à doigts', 14),
      magic('michael-twss', 'C’est ce qu’elle a dit', 24, 3, 'BadBuzz'),
      magic('michael-bankruptcy', 'JE DÉCLARE FAILLITE !', 28, 2, 'Lag'),
    ],
  }),

  // --- Harry Potter ---
  defineGif({
    id: 'ron',
    name: 'Ron Weasley',
    universe: 'harry-potter',
    rarity: 'Commun',
    gifUrl: giphyUrl('YOT5J1vwwSoCCAEOE0'),
    catchphrase: 'Pourquoi des araignées ? Pourquoi pas des papillons ?',
    maxHp: 60,
    attacks: [physical('ron-broken-wand', 'Baguette scotchée', 14)],
  }),
  defineGif({
    id: 'hermione',
    name: 'Hermione Granger',
    universe: 'harry-potter',
    rarity: 'Rare',
    gifUrl: giphyUrl('fCTsoUuqV4Z3m1ICxr'),
    catchphrase: 'C’est Levi-O-sa, pas Levio-SA !',
    maxHp: 82,
    attacks: [
      physical('hermione-slap', 'Gifle à Drago', 16),
      magic('hermione-leviosa', 'Wingardium Leviosa', 25, 3, 'Lag'),
    ],
  }),

  // --- Breaking Bad ---
  defineGif({
    id: 'jesse',
    name: 'Jesse Pinkman',
    universe: 'breaking-bad',
    rarity: 'Rare',
    gifUrl: giphyUrl('unFLKoAV3TkXe'),
    catchphrase: 'Yo, Mr. White !',
    maxHp: 84,
    attacks: [
      physical('jesse-slap', 'Mandale yo', 15),
      magic('jesse-science', 'Yeah, Science !', 24, 3, 'BadBuzz'),
    ],
  }),
  defineGif({
    id: 'walter',
    name: 'Walter White',
    universe: 'breaking-bad',
    rarity: 'Épique',
    gifUrl: giphyUrl('NUBp5KcV0PJBe'),
    catchphrase: 'Say my name.',
    maxHp: 108,
    attacks: [
      physical('walter-pizza', 'Pizza sur le toit', 15),
      magic('walter-blue-crystal', 'Cristal bleu', 24, 3, 'BadBuzz'),
      magic('walter-fulminate', 'Fulminate de mercure', 29, 2, 'Boucle'),
    ],
  }),

  // --- Star Wars ---
  defineGif({
    id: 'han',
    name: 'Han Solo',
    universe: 'star-wars',
    rarity: 'Rare',
    gifUrl: giphyUrl('3oeSB0xLHrumK34lbO'),
    catchphrase: 'Je sais.',
    maxHp: 86,
    attacks: [
      physical('han-shot-first', 'Tirer le premier', 17),
      magic('han-kessel-run', 'Raid de Kessel en 12 parsecs', 23, 3, 'Lag'),
    ],
  }),
  defineGif({
    id: 'vader',
    name: 'Dark Vador',
    universe: 'star-wars',
    rarity: 'Légendaire',
    gifUrl: giphyUrl('l1KuhBCqxOoJyr0m4'),
    catchphrase: 'Je trouve votre manque de foi… consternant.',
    maxHp: 135,
    attacks: [
      physical('vader-saber', 'Coup de sabre laser', 17),
      magic('vader-choke', 'Étranglement de Force', 27, 3, 'BadBuzz'),
      magic('vader-breathing', 'Kshhh… Pfff…', 22, 3, 'Lag'),
      special('vader-father', 'Je suis ton père', 52, 'Boucle'),
    ],
  }),
]
