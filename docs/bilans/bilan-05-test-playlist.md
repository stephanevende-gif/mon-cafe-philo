# Bilan n°5 — Test sur la vraie playlist M-Éditer

*Mon café philo · Éditions M-Éditer · 26 octobre 2026 · étape 5 toujours en attente de validation*

## Ce qui a été fait
- La clé YouTube est bien présente dans l'environnement (elle n'a jamais été affichée).
- Base de données de test préparée (migrations + données de départ), puis synchronisation lancée une fois sur la vraie playlist PL2d4vA4vfs79RPBnT3PFdOjyXaWPdquGv.
- Le passage s'est terminé sans erreur et a été enregistré dans le journal des exécutions.

## Résultats réels (aucune donnée inventée)
- **852 Shorts détectés**, publiés entre le 18 septembre 2022 et le 24 octobre 2026, tous de la même chaîne.
- **852 fiches créées**, toutes à l'état « à vérifier ». Aucune n'est publiée sans relecture.
- **830 fiches (97 %) reliées à leur conférence ou à un extrait de plus de 3 minutes**, soit 320 vidéos différentes. Au premier essai, avec la règle « plus de 15 minutes », seules 718 fiches (84 %) étaient reliées.
- **4 vidéos ignorées** car elles durent plus de 3 minutes (ce ne sont pas des Shorts) :
  « Coopérer avec les machines : une nouvelle culture à inventer », « L'expérience esthétique est une expérience de la liberté. », « L'ennemi révèle qui vous êtes vraiment », « Ricœur — De la disproportion à la médiation ».
- Aucune fiche n'a été programmée pour demain : le dernier Short date du 24 octobre, son jour J+1 (25 octobre) est déjà passé. Les 852 fiches attendent dans la file éditoriale.
- Exemple : le Short « Quand l'éthique devient violente » (24/10/2026) est relié à la conférence « Une éthique de la violence est-elle possible ? », André Stanguennec (19 min).
- La liste complète est dans `docs/tests/test-playlist-2026-10-26.csv` (s'ouvre avec Excel).

## Changement demandé par Stéphane (26 octobre 2026)
- Une vidéo citée dans la description est désormais acceptée dès qu'elle dure plus de 3 minutes (conférence complète ou extrait). Un autre Short n'est jamais rattaché comme conférence.
- Les écrans (fiche, administration, page « Donc ») indiquent « plus de 3 minutes ». Un test automatique a été ajouté (18 tests passent).

## Pourquoi 22 Shorts n'ont toujours pas de vidéo reliée
- 6 : la vidéo citée est elle-même un Short (moins de 3 minutes).
- 5 : le lien est mal écrit dans la description YouTube (par exemple « httpswww.youtube.comwatchv=… », sans « :// »).
- 5 : la vidéo citée est privée ou supprimée.
- 4 : la vidéo citée vient d'une autre chaîne.
- 2 : la description ne contient aucun lien vidéo.

## Questions pour Stéphane
1. ~~Durée minimale d'une conférence~~ : réglé, Stéphane a répondu oui (plus de 3 minutes).
2. **Ancien catalogue** : la première synchronisation met tout l'historique (852 Shorts) en file « à vérifier ». Faut-il le garder comme réserve de fiches à valider petit à petit, ou n'importer que les Shorts récents ?
3. Les 5 liens mal écrits peuvent être corrigés directement dans YouTube.

## Ce qui reste à faire
- Validation de l'étape 5 par Stéphane (et réponses aux questions ci-dessus).
- **Étape 6** : forum par question, modération, paiement Stripe (20 € pour 335 jours).
- **Étape 7** : notifications, déploiement (dont la tâche horaire), tests de bout en bout, documentation finale.
- Toujours en attente : hébergeur, prestataire e-mail, liens catalogue, textes légaux, confirmation de « Depuis 2003 ».

## Pour reprendre en cas de coupure
Ouvrir `docs/REPRISE.md`. Pour relancer ce test : `npm run db:migrate`, `npm run db:seed`, puis `npx tsx scripts/sync-once.ts` (avec `DATABASE_URL` et `YOUTUBE_API_KEY` définis).
