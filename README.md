# Gif Wars — MVP navigateur

Jeu tactique solo contre un bot, en portrait, construit avec Vue 3, Pinia, PixiJS v8, Tailwind CSS et `vite-plugin-pwa`. Les dix personnages sont fournis en GIFs animés originaux, générés localement. Le rendu Pixi fonctionne hors ligne après installation.

## Démarrer

```bash
npm install
npm run assets
npm run dev
```

`npm run build` produit la PWA dans `dist/`; `npm run preview` la sert localement. `npm test` exécute les tests du moteur. Node 22.12+ est nécessaire. Les PNG/GIFs générés sont aussi conservés dans `public/`, donc `npm run assets` sert surtout à les régénérer.

## Structure

```text
public/icons, public/gifs   Icônes PWA et personnages animés
scripts/                    Générateurs d'assets pixel
src/game/types.ts           Contrats de l'état et des événements
src/game/catalog.ts         Stats et capacités
src/game/engine.ts          Règles pures et résolution
src/stores/gameStore.ts     Store Pinia et file de replay
src/components/             Canvas Pixi, HUD, main, sélection du Master
src/services/               Audio Web Audio et notifications
src/sw.ts                   Service worker offline + Push
src/App.vue                 Boucle de présentation des manches
tests/game.test.ts          Scénarios de règles
```

## Arbitrages explicites du GDD

- Le joueur reste en bas. Chaque camp a cinq lignes numérotées **du front vers l'arrière** : la ligne 1 est au milieu du plateau (rangées 5 et 4), la ligne 5 est la ligne de but (rangées 9 et 0). Un Gif marque après avoir franchi la ligne 5 adverse et sort du plateau.
- Une cible doit être devant l'unité, dans la **même colonne**, à distance inférieure ou égale à la portée. Les alliés ne bloquent pas le tir, uniquement le mouvement.
- Les intentions d'attaque sont figées au début de la résolution, après la révélation et les compétences des Masters. Si la cible meurt avant son tour d'attaque, l'unité perd son action. Un Gif détruisant sa cible avance immédiatement d'une case si elle est libre.
- Une unité agit par ancienneté. Pour deux poses de la même manche, l'initiative alterne entre joueur et bot à chaque manche. Un déplacement vers une case occupée est bloqué, y compris lors d'une rencontre CàC.
- Les deux compétences de Masters se calculent sur le même plateau révélé avant application. Le Stratège et le Protecteur affectent les alliés présents, Master compris, et leurs bonus restent sur ces unités. Un Master est utilisable une fois par partie.
- Une carte jouée rejoint la défausse immédiatement ; quand les sept cartes ont toutes été posées, la défausse est remélangée dans la main. Les unités déjà déployées restent en jeu. Un camp totalement occupé autorise un tour forcé sans pose pour éviter le blocage.
- Si les deux bases tombent à 0 PV durant la même résolution, elles reviennent à 1 PV et la mort subite commence. Le premier dégât de base suivant termine aussitôt la partie.

## Notifications

L'interface demande l'autorisation uniquement après appui sur l'icône de notification. Le début de partie, le rappel de pose à 90 secondes et le résultat utilisent `ServiceWorkerRegistration.showNotification`. Le service worker sait aussi recevoir des notifications Push et ouvrir l'arène au clic.

Pour des invitations ou des rappels **après fermeture du navigateur**, il faut un serveur de parties/Web Push externe : renseigner la clé VAPID publique et l'URL de sauvegarde d'abonnement décrites dans `.env.example`, puis envoyer les messages depuis le serveur avec la clé privée. Le mode MVP contre le bot n'a pas de système d'invitations multijoueur. Les notifications locales ne sont garanties que lorsque la page est ouverte ; les timers peuvent être suspendus en arrière-plan par le navigateur.

## Vérification

Le moteur est déterministe à graine égale. Il est testé sans DOM pour l'ancienneté, les cinq Masters, les collisions, le recyclage, la mort subite et les placements obligatoires. Les GIFs ont été décodés et vérifiés sur deux frames chacun. La cible de rendu est 60 FPS (`Pixi.ticker.maxFPS = 60`), avec une grille 3×10, dix sprites GIFs mis en cache et des effets graphiques courts. Une mesure sur appareil mobile réel reste nécessaire pour confirmer le framerate.
