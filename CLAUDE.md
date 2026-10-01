# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

GifWars : jeu de combat 1v1 au tour par tour, en navigateur, dans un style Comic Book / Pop Art. On affronte une IA (« GifBot ») avec une équipe de 5 GIFs de la pop culture. Stack : Vite, Vue 3 (Composition API, TypeScript), Pinia et PixiJS 8 pour l'arène. Le pixel art est proscrit par le game design. L'utilisateur communique en français.

## Commandes

Le gestionnaire de paquets est **pnpm**.

```sh
pnpm dev                     # serveur de dev (http://localhost:5173)
pnpm test:unit --run         # tous les tests Vitest (sans --run : mode watch)
pnpm test:unit --run src/game/__tests__/ai.spec.ts    # un seul fichier
pnpm test:unit --run -t "retreats"                    # tests dont le nom correspond
pnpm type-check              # vue-tsc --build
pnpm lint                    # oxlint puis eslint (avec --fix)
pnpm format                  # prettier sur src/
pnpm build                   # type-check + build de prod
```

Avant de considérer une tâche terminée : `pnpm format`, puis type-check, tests, lint et build doivent tous passer. Prettier reformate les fichiers : relire un fichier après `pnpm format` avant de l'éditer par remplacement exact.

## Conventions

- **Code, identifiants et commentaires en anglais. Valeurs métier et textes d'interface en français**, tels que dans le game design : `'Commun' | 'Rare' | 'Épique' | 'Légendaire'`, `'Physique' | 'Magique' | 'Spéciale'`, `'Lag' | 'BadBuzz' | 'Boucle'`.
- Messages de commit en anglais, au format conventional commits (`feat:`, `fix:`…).
- Le travail se fait sur la branche `feat/foundations`. `main` ne contient que le commit initial.
- oxlint refuse les `expect` conditionnels et les `toThrow()` sans message attendu.
- `noUncheckedIndexedAccess` est activé : un accès à un tableau renvoie `T | undefined`.
- Dans les tests, la config TypeScript a `lib: []`, donc pas de `Array.prototype.at`.

## Architecture

### Flux de données

```
UI (views/components) ──actions──▶ useGameStore (Pinia) ──▶ game/engine.ts (fonctions pures)
        ▲                                │                         │
        │                                └── timer, IA, pause      └── écrit state.log (BattleLogEntry[])
        └── BattleArena (PixiJS) rejoue state.log en animations ──cues──▶ audio
```

- **`src/game/engine.ts`** : toutes les règles, sous forme de fonctions pures qui modifient un `GameState`. L'aléatoire est injecté (`Rng = () => number`). Les tests utilisent `() => 0.99` (rien ne se déclenche), `() => 0` (tout se déclenche) ou un LCG à graine. Points d'entrée : `createQuickMatchState`, `performTurn`, `chooseReplacement`, `handleTimeout`, `getActionError`.
- **`src/game/ai.ts`** : IA heuristique, pure elle aussi. `scoreActions` note chaque action légale. Les trois difficultés sont définies dans `src/config/ai.ts` (`mistakeChance`, `canSwitch`). Des simulations IA contre IA dans `ai.spec.ts` vérifient la légalité des coups et que Difficile bat Facile.
- **`src/stores/game.ts`** : enveloppe le moteur.
  - Il gère une seule horloge d'1 s pour toute la partie et un `controllers` par joueur (`human` ou `ai`). L'IA agit après `AI_THINK_MS`.
  - Le timer et l'IA s'arrêtent tant que `presentationBusy` (animations en cours, signalé par la vue) ou `paused` (inventaire, confirmation de sortie) est vrai.
  - Après chaque mutation, il appelle `afterChange()`, qui resynchronise le timer et planifie l'IA.
  - `submitAction` et `chooseReplacement` refusent d'agir pour un joueur IA.
  - `matchId` s'incrémente à chaque partie, ce qui fait remonter l'arène via `:key`.
- **Les types** (`src/types/`) : `GifCard` est une union discriminée sur `rarity`, et les attaques sont des tuples (`AttackSetByRarity`). `attacks[0]` est donc toujours l'attaque physique, celle que déclenche le timeout. `GifDefinition` utilise `DistributiveOmit` pour préserver l'union.
- **Les données** (`src/data/`) : 12 GIFs (4 Communs, 4 Rares, 2 Épiques, 2 Légendaires), juste assez pour deux équipes Quick Match sans doublon. `gifsData.spec.ts` vérifie cette contrainte. `id` est l'identifiant du catalogue : il sert aussi d'identifiant en combat (les équipes sont disjointes) et pour les synergies.
- **`src/config/gameRules.ts`** : toutes les constantes d'équilibrage (timer, slots Quick Match, statuts).

### Règles interprétées, déjà validées par l'utilisateur

- Le Lag est testé au moment d'attaquer. Le tour est perdu mais l'utilisation n'est pas consommée, et le Switch reste possible.
- La durée d'un statut se compte en tours de son porteur. Seul le GIF actif fait avancer son statut ; sur le banc, le statut est gelé. Les statuts ne se cumulent pas.
- Le Bad Buzz et les soins de synergie s'appliquent à la fin du tour du joueur concerné. Une synergie soigne ses membres vivants de +1 PV, même sur le banc.
- Le remplacement après un K.O. ne consomme pas de tour. Les deux joueurs peuvent devoir remplacer en même temps (`pendingReplacements: PlayerId[]`).

### Arène PixiJS (`src/game/arena/`)

- `ArenaRenderer` ne connaît pas les règles : il rejoue chaque `BattleLogEntry` via `play(entry)`. `BattleArena.vue` met les entrées en file et émet `busy` (pause du jeu), `cue` (son) et `playing` (texte de la boîte de dialogue).
- Disposition portrait (`LAYOUT`) : le joueur en bas à gauche, l'IA en haut à droite. Le centre (`LAYOUT.center.y = 0.42`) doit rester égal à `--burst-center-y` dans `main.css`.
- Le stage est transparent : le sunburst est une couche CSS (`.world-burst` dans `App.vue`) qui couvre toute la fenêtre.
- Fichiers : `effects.ts` (étoiles d'onomatopées, chiffres, secousse, flash, onde de choc, lignes de vitesse, bandeau, projectile), `particles.ts`, `statusAuras.ts` (effet persistant d'un statut sur le combattant), `synergyAnimations.ts` (une scène par `Synergy.animationKey`, vérifié par un test), `Fighter.ts` (un GIF encadré et ses gestes).
- La mise en scène dépend du type d'attaque : `playPhysical`, `playMagic` (charge puis projectile) et `playSpecial` (assombrissement, lignes de vitesse, nom de l'attaque, flash). Les deux couches `scene` (secouée) et `overlay` (flash, bandeau) se superposent.
- Au montage, `playIntro()` (entrée des combattants puis « FIGHT ! ») passe par la même file que les animations : `busy` est donc vrai pendant l'intro, ce qui met le timer et l'IA en pause.
- **PV affichés ≠ PV réels pendant une animation** : le moteur applique les dégâts au clic. L'arène émet `impact` au moment visuel du coup ; `BattleView` tient alors des PV « présentés » (`shownHp`), mis à jour depuis les événements (`attack`, `miss`, `statusTick`, `synergyHeal`) et resynchronisés sur l'état réel quand `busy` repasse à faux. Toute nouvelle source de variation de PV doit passer par un événement du journal.
- L'annonce « À TOI ! » ne s'affiche qu'après l'intro (`arenaReady`), une seule fois par tour (`bannerTurn`), et disparaît dès que le joueur agit.
- Piège : `container.destroy({ children: true })` passe un argument truthy à `GifSprite.destroy(destroyData)` et détruit la `GifSource` partagée dans le cache `Assets`. `Fighter.destroy()` détache donc le GIF avant.
- Les animations de l'arène ne sont pas testables dans jsdom : les tests de vue remplacent `BattleArena.vue` par un stub via `vi.mock`.

### Audio (`src/audio/`)

- Tout est synthétisé en Web Audio, sans aucun fichier : les recettes sont dans `sfx.ts`, la boucle musicale dans `music.ts` (programmée légèrement en avance).
- `AudioEngine` crée l'`AudioContext` à la demande et le débloque au premier geste de l'utilisateur (listeners dans `App.vue`). Il ne fait rien quand Web Audio est absent, comme dans jsdom.
- Les recettes prennent un `BaseAudioContext`, ce qui permet de les rendre hors ligne avec `OfflineAudioContext`. `sfx.spec.ts` utilise un faux contexte qui refuse, comme la vraie API, les rampes exponentielles vers 0.
- Les sons sont déclenchés par l'arène (`onCue`), au moment exact de chaque animation, et jamais par le store. Les réglages sont mémorisés dans `localStorage` (`gifwars:audio`).

### UI : cadre de jeu 9:16

- `.game-frame` (`main.css`) mesure `min(100vw, 100dvh*9/16)` de large et `100dvh` de haut : 9:16 sur desktop, pleine hauteur sur les téléphones plus allongés. La page ne défile jamais.
- Les tailles utilisent les unités de conteneur (`cqw`/`cqh`). **Piège** : ces unités ne se réfèrent au cadre que dans ses *descendants*. La taille de police de base est donc posée sur `.screen`, pas sur `.game-frame` ; sur le cadre lui-même, `cqw` retomberait sur la largeur de la fenêtre.
- `overflow: clip` (et non `hidden`) sur le cadre et les écrans empêche le focus de faire défiler le jeu.
- Les modales (`components/ui/GameModal.vue`) sont en `absolute` dans l'écran, mais leur fond est en `position: fixed`, pour assombrir toute la fenêtre.
  - Leur grille a des pistes explicites `minmax(0, 1fr)`. Sans elles, un contenu large, comme le carrousel de l'inventaire, élargit la modale.
- Parcours : `SplashView` (route `home`) → modale de difficulté → `BattleView` (route `battle`, `/combat`, chargée à la demande pour garder PixiJS hors de l'accueil).
- Le mode à deux humains n'est plus exposé dans l'UI, mais le moteur et le store le supportent toujours (`controllers`).

## Vérifier dans un vrai navigateur

Les tests unitaires ne couvrent ni PixiJS ni la mise en page. Pour tout changement visuel, lancer `pnpm dev` et piloter Chrome en headless avec `playwright-core`, installé dans le scratchpad et pas dans le projet :
- utiliser `executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'` avec `--enable-unsafe-swiftshader --use-angle=swiftshader` ;
- tester au moins 390×844, 360×640 et 1440×900, et regarder les captures d'écran.

Pièges rencontrés :
- La pastille des Vue DevTools (dev uniquement) intercepte les clics sur le HUD du bas. La masquer avec `#__vue-devtools-container__ { display: none !important }`.
- Les boutons animés en continu (« Jouer », l'attaque spéciale) sont jugés « instables » par Playwright : utiliser `click({ force: true })`.
- Pour capturer une animation, forcer la situation via le store (par exemple `s.state.log.push({ … event: { kind: 'synergyHeal', … } })` rejoue un événement dans l'arène, ou `startQuickMatch({ rng: () => 0.99 })` suivi de `activeIndex = 4` pour avoir un Épique ou un Légendaire), puis faire des captures à intervalles fixes.
- `await import('/src/stores/game.ts')` dans la page donne accès au store de l'application. Mais après une modification à chaud (HMR), Vite sert le module avec `?t=…`, et l'import obtient une autre instance : redémarrer le serveur avant ce type de vérification.

## Déploiement

- Publication sur https://jypyx.github.io/gifwars/ par `.github/workflows/deploy-pages.yml`. Le workflow déploie à chaque push sur `main`, vérifie seulement sur les pull requests, et peut être lancé à la main.
- L'environnement `github-pages` n'accepte que les branches `main` et `claude-code` : pour publier, il faut fusionner dans `main`.
- Le site est servi sous `/gifwars/`. `vite.config.ts` lit le chemin de base dans `GIFWARS_BASE_PATH` (`/` par défaut). La CI copie aussi `index.html` en `404.html` pour les liens profonds, car Pages n'a pas de repli vers l'application. Aucun chemin absolu ne doit être écrit en dur : passer par `import.meta.env.BASE_URL`, comme le fait le routeur.
- Pour tester un build avec ce chemin en local, lancer le build depuis PowerShell. Git Bash convertit `/gifwars/` en chemin Windows, et `MSYS_NO_PATHCONV=1` casse le lanceur de pnpm.

## GIFs

Les GIFs sont de vraies URLs Giphy (`giphyUrl(id)`, variante légère `200.gif`). Pour en ajouter ou en changer un, vérifier visuellement qu'il montre bien le bon personnage, et pas seulement que l'URL répond 200. Un ancien GIF « Gandalf » montrait en réalité une publicité.
