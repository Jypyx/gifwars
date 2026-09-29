# Consignes pour les agents

## Projet

Gif Wars est un jeu tactique solo en français, livré comme PWA. Le projet utilise Vue 3, TypeScript, Pinia, PixiJS 8, Tailwind CSS et Vite. Node.js 22.12 ou plus est requis.

## Repères dans le dépôt

- `src/game/types.ts` définit l'état, les événements et les types du jeu.
- `src/game/catalog.ts` contient les personnages, leurs statistiques et leurs capacités.
- `src/game/engine.ts` contient les règles et la résolution déterministe des manches. Garder les décisions de combat dans ce module, sans dépendance au DOM ou au rendu.
- `src/stores/gameStore.ts` relie le moteur à l'interface et déroule les événements de replay.
- `src/components/` et `src/App.vue` gèrent l'interface ; `src/components/GameCanvas.vue` assure le rendu Pixi.
- `src/services/` contient l'audio, les notifications et les URL d'assets ; `src/sw.ts` contient le service worker.
- `tests/` couvre les règles, le store, le rendu et les URL. `scripts/` contient les générateurs d'assets et la vérification du build.

## Commandes

- `npm ci` installe les dépendances depuis le lockfile.
- `npm run dev` démarre le serveur local.
- `npm test` lance les tests Vitest.
- `npm run build` vérifie les types et compile la PWA.
- `npm run build:pages` compile avec la base GitHub Pages par défaut (`/gifwars/`).
- `npm run verify:build -- /gifwars/` vérifie les chemins du build Pages.
- `npm run assets` régénère les icônes et GIFs présents dans `public/` ; ne l'exécuter que si ces assets doivent changer.

## Conventions de modification

- Respecter les règles de jeu et les arbitrages documentés dans `README.md`. Ajouter ou adapter un test dans `tests/` lorsqu'une règle ou un comportement du store change.
- Préserver la séparation entre moteur pur, état Pinia et présentation. Le rendu consomme les événements du moteur ; il ne décide pas de l'issue des combats.
- Conserver les chemins d'assets compatibles avec la base Vite et le service worker. Vérifier le build Pages si des URL, le manifeste ou la configuration PWA changent.
- Garder les textes visibles par le joueur en français et suivre le style TypeScript existant.
- Ne pas versionner les secrets ni les fichiers `.env` locaux ; `.env.example` sert de modèle public.

`CLAUDE.md` est un lien symbolique vers ce fichier. Modifier uniquement `AGENTS.md` pour maintenir ces consignes.
