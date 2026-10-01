# GifWars

Jeu de combat 1v1 au tour par tour avec des équipes de GIFs de la Pop Culture, dans un univers Comic Book.

Stack : Vite · Vue 3 (Composition API, TypeScript) · Pinia · PixiJS (rendu des combats).

## Structure

```
src/
  types/        Types du jeu (GifCard, Attack, Synergy, état de partie…)
  config/       Règles et constantes d'équilibrage (timer, Quick Match, statuts)
  data/         Mocks : gifsData.ts (catalogue), synergies.ts, universes.ts (thèmes de cartes)
  utils/        Fonctions pures (instanciation d'un GIF, détection des synergies)
  stores/       Stores Pinia (useGameStore — étape suivante)
  views/        Écrans
```

## Commandes

```sh
pnpm install
pnpm dev          # serveur de dev
pnpm test:unit    # tests Vitest
pnpm type-check   # vue-tsc
pnpm lint         # oxlint + eslint
pnpm build        # type-check + build de prod
```
