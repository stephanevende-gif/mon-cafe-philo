# Bilan n°10 : nouvel ordre de la fiche (26 octobre 2026)

## Ce qui a été fait
- **Titre de la fiche** : ce n'est plus une question. Il prend la forme « Aujourd'hui, on s'interroge sur… » (le rôle de…, la place de…). Nouveau champ « Titre » dans la base et dans l'administration ; l'IA le propose.
- **Ordre affiché** : Titre, puis Thème, puis Question.
- **Question** : toujours sous forme d'alternative (« … ou … ? »).
- **« Synthèse » remplacée** par « Proposition de réponse de l'auteur » : l'IA rédige en deux phrases la réponse que l'auteur apporte à la question. Une petite mention précise qu'il s'agit d'une reformulation, pas d'une citation.
- **Vidéos** : « Short » devient « Écouter l'auteur », « Conférence » devient « Aller plus loin avec l'auteur » (vidéo longue). Le mot « Short » n'apparaît plus.
- Titres de vidéos affichés sans # ni emojis (bilan n°9).
- Les 5 fiches d'essai ont été refaites (5 sur 5) : voir `fiches-proposees-ia-v3.pdf`.
- Tous les tests passent (20 sur 20). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Ce qui reste à faire
1. Stéphane : relire les 5 fiches de la version 3 et dire si elles conviennent.
2. Vérifier le nom de chaque auteur (il vient de la description YouTube).
3. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
4. Ensuite : lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-ordre-fiche.zip` : code complet + ce bilan + les fiches en PDF.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, puis `npx tsx scripts/draft-ai-once.ts 5`.
