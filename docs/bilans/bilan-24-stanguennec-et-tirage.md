# Bilan n°24 : présentation d'André Stanguennec et tirage des rediffusions (27 octobre 2026)

## Ce qui a été fait
- **Présentation d'André Stanguennec** : reprise de sa fiche auteur M-Éditer (bloc « A propos de l'auteur »), limitée aux deux premières phrases :
  « Ancien élève de l'historien de la philosophie Victor Goldschmidt et du philosophe Robert Lamblin, agrégé de philosophie et docteur d'Etat, André Stanguennec a enseigné à l'Université de Nantes de 1969 à 2007. Il est Professeur émérite de cette Université où il continue à pratiquer et diriger des recherches. »
- Désormais automatique : quand la description YouTube ne présente pas l'auteur, l'application reprend la présentation de sa fiche M-Éditer.
- **Tirage des fiches rediffusées** : deux fois sur trois une fiche ancienne, une fois sur trois une fiche récente.
  - « Récente » = Short publié sur YouTube depuis moins d'un an ; « ancienne » = plus d'un an.
  - Si l'un des deux groupes est vide, on prend dans l'autre. Les règles déjà en place restent : pas de répétition à moins de 60 jours, varier thèmes et auteurs sur la semaine.
- Correction au passage : une rediffusion reprend aussi le titre « Interrogeons-nous sur… » de la fiche d'origine.
- 2 nouveaux tests, tous les tests passent (35 sur 35). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Ce qui reste à faire
1. Stéphane : relire la présentation d'André Stanguennec (Administration › Intervenants) et valider chaque auteur.
2. Dire si la limite « moins d'un an » pour une fiche récente convient.
3. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
4. Lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-stanguennec-tirage.zip` : code complet + ce bilan.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, `npx tsx scripts/draft-ai-once.ts 5`, puis `NODE_USE_ENV_PROXY=1 npx tsx scripts/attach-authors.ts`.
