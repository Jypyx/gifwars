# GifWars

Jeu de combat 1v1 au tour par tour avec des équipes de GIFs de la Pop Culture, dans un univers Comic Book.

Stack : Vite · Vue 3 (Composition API, TypeScript) · Pinia · PixiJS (rendu des combats).

## Structure

```
src/
  types/        Types du jeu (GifCard, Attack, Synergy, état de partie…)
  config/       Règles et constantes d'équilibrage (timer, Quick Match, statuts)
  data/         Mocks : gifsData.ts (catalogue), synergies.ts, universes.ts (thèmes de cartes)
  audio/        Sons et musique synthétisés en Web Audio (aucun fichier audio)
  game/         Moteur de combat et IA (fonctions pures, aléatoire injectable)
    arena/      Arène PixiJS : rejoue le journal du store en animations BD
  utils/        Fonctions pures (instanciation d'un GIF, détection des synergies)
  stores/       Stores Pinia (useGameStore : partie, tours, timer)
  components/   GifCard.vue (carte façon Pokémon), HUD et modales de combat
    ui/         Briques d'interface : icônes, boutons icônes, modale
  views/        Écran d'introduction (SplashView) et écran de combat (BattleView)
```

Interface de jeu mobile first au format 9:16 (plein écran en hauteur sur téléphone), sans scroll.
On affronte GifBot, l'ordinateur, en 3 niveaux de difficulté. Le moteur gère aussi deux humains
sur le même écran, mode non exposé dans l'interface pour l'instant.

## Commandes

```sh
pnpm install
pnpm dev          # serveur de dev
pnpm test:unit    # tests Vitest
pnpm type-check   # vue-tsc
pnpm lint         # oxlint + eslint
pnpm build        # type-check + build de prod
```
