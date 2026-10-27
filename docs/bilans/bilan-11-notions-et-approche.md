# Bilan n°11 : trois notions du programme et « Approche de la question par… » (27 octobre 2026)

## Ce qui a été fait
- **Thème = trois notions du programme officiel de philosophie de terminale** (voie générale, arrêté du 19 juillet 2019) : l'art, le bonheur, la conscience, le devoir, l'État, l'inconscient, la justice, le langage, la liberté, la nature, la raison, la religion, la science, la technique, le temps, le travail, la vérité.
  - L'IA choisit les trois notions les plus utiles pour travailler la question, uniquement dans cette liste.
  - Dans l'administration, le thème se choisit en cochant trois notions au plus.
  - Dans les archives, le filtre par thème propose ces notions et retrouve toutes les fiches qui en contiennent une.
- **« Proposition de réponse de l'auteur » devient « Approche de la question par (nom de l'auteur) »**. Le nom affiché est celui de l'intervenant enregistré dans l'administration. Tant qu'il n'est pas enregistré, la page indique « par l'auteur ».
- L'IA relève le nom de l'auteur quand la description YouTube le donne. Elle le note dans les remarques de la fiche, avec la mention « à vérifier ».
- Les 5 fiches d'essai ont été refaites (5 sur 5) : voir `fiches-proposees-ia-v4.pdf`.
- 3 nouveaux tests, tous les tests passent (23 sur 23). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Rappel de l'ordre de la fiche
Titre « Aujourd'hui, on s'interroge sur… » · Thèmes (3 notions) · Question en alternative · Approche de la question par… · Écouter l'auteur (vidéo courte) · Aller plus loin avec l'auteur (vidéo longue).

## Ce qui reste à faire
1. Stéphane : relire les 5 fiches de la version 4.
2. Montrer de vraies captures d'écran de l'application avec ces fiches.
3. Enregistrer et vérifier les auteurs (nom, qualification) dans l'administration.
4. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
5. Ensuite : lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-notions-approche.zip` : code complet + ce bilan + les fiches en PDF.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, puis `npx tsx scripts/draft-ai-once.ts 5`.
