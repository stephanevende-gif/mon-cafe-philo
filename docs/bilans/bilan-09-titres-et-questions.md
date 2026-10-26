# Bilan n°9 : titres nettoyés et questions en alternative (26 octobre 2026)

## Ce qui a été fait
- **Titres nettoyés** : l'application retire désormais d'elle-même les hashtags (#philosophie, #IA…) et les emojis (📉…) des titres de vidéos qu'elle affiche (page « Donc », administration des vidéos et des fiches). Les titres restent intacts sur YouTube et dans la base. Contrôle fait sur les 122 titres concernés : plus aucun # ni emoji à l'affichage.
- **La question sert de titre** : c'est déjà le cas partout dans l'application (page du jour, archives, administration). La consigne de l'IA le précise désormais.
- **Question toujours en alternative** : la consigne de l'IA impose maintenant la forme « … ou … ? », avec deux positions défendables.
- L'IA reçoit aussi le titre nettoyé.
- Les 5 fiches d'essai ont été refaites avec la nouvelle règle : 5 sur 5, voir `propositions-ia-2026-10-26-v2.md`.
- Un test ajouté, tous les tests passent (20 sur 20).
- Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Ce qui reste à faire
1. Stéphane : relire les 5 nouvelles questions et dire si la forme en alternative convient.
2. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
3. Ensuite : lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-titres-questions.zip` : code complet de la branche + ce bilan + les propositions.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, puis `npx tsx scripts/draft-ai-once.ts 5`.
