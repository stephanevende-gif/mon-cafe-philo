# Bilan n°21 : choix du style de portrait (27 octobre 2026)

## Ce qui a été fait
- Stéphane a choisi le rendu « crayon au trait affirmé », celui de gauche dans `captures/exemple-portrait-crayon-v3.png` (même rendu que `exemple-portrait-crayon-v2.png`, à droite). L'application revient à ce rendu. On pourra l'affiner plus tard.
- Le rendu « graphite réaliste » essayé ensuite reste dans l'historique du code (commit « Portrait : graphite réaliste »). Il peut être repris si besoin.
- Tous les tests passent (32 sur 32). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Où en est la fiche
Titre « Interrogeons-nous sur… » · Thèmes (3 notions) · Question en alternative · Approche de la question par (auteur) · Portrait au crayon, présentation de l'auteur et « En savoir plus sur l'auteur » · « Écouter l'auteur sur cette question » (vidéo courte) · « Aller plus loin avec l'auteur » (vidéo longue).

## Ce qui reste à faire
1. Dessiner les portraits des auteurs : il faut soit envoyer une photo dans le fil, soit autoriser `i.ytimg.com` et `m-editer.izibookstore.com` dans les réglages réseau du projet. Ensuite, lancer `npx tsx scripts/attach-authors.ts`.
2. Présentation d'André Stanguennec à fournir ; vérifier chaque auteur dans l'administration.
3. Valider l'étape 5, puis regrouper les branches et fusionner la PR n°1.
4. Lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-choix-portrait.zip` : code complet + ce bilan.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, `npx tsx scripts/draft-ai-once.ts 5`, puis `npx tsx scripts/attach-authors.ts`.
