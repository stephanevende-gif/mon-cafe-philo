# Bilan n°12 : titre « Interrogeons-nous sur… » (27 octobre 2026)

## Ce qui a été fait
- Le titre de chaque fiche commence désormais par « Interrogeons-nous sur… » au lieu de « Aujourd'hui, on s'interroge sur… ». Le changement est fait dans la consigne de l'IA, dans l'administration et dans les tests.
- Les 5 fiches d'essai ont été mises à jour en remplaçant seulement le début du titre. La suite du titre et le reste de la fiche n'ont pas changé : voir `fiches-proposees-ia-v5.pdf`.
- Tous les tests passent (23 sur 23). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Rappel de l'ordre de la fiche
Titre « Interrogeons-nous sur… » · Thèmes (3 notions du programme de terminale) · Question en alternative · Approche de la question par (auteur) · Écouter l'auteur (vidéo courte) · Aller plus loin avec l'auteur (vidéo longue).

## Ce qui reste à faire
1. Stéphane : relire les 5 fiches de la version 5.
2. Montrer de vraies captures d'écran de l'application avec ces fiches.
3. Enregistrer et vérifier les auteurs (nom, qualification) dans l'administration.
4. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
5. Ensuite : lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-interrogeons-nous.zip` : code complet + ce bilan + les fiches en PDF.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, puis `npx tsx scripts/draft-ai-once.ts 5`.
