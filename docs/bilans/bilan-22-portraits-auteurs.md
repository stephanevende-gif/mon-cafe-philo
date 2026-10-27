# Bilan n°22 : premiers vrais portraits d'auteurs (27 octobre 2026)

## Ce qui a été fait
- Stéphane a autorisé `i.ytimg.com` et `m-editer.izibookstore.com` dans les réglages réseau : l'accès aux photos fonctionne.
- L'application trouve maintenant la photo de l'auteur sur sa fiche de la boutique M-Éditer (l'image marquée « photo d'auteur » de la page, et non le logo).
- Portraits au crayon des 3 auteurs des fiches d'essai : `captures/portraits-auteurs.png`.
  - André Stanguennec et Jean-Luc Nativelle : à partir de la photo de leur fiche auteur M-Éditer.
  - David Christoffel : pas de fiche M-Éditer. Le portrait part d'une image de l'un de ses Shorts, recadrée sur le visage. C'est le moins réussi (regard baissé, texte en arrière-plan) : à remplacer par une vraie photo si possible.
- Quand il n'y a pas de photo sur la fiche auteur, l'application prend désormais l'image d'un Short recadrée sur le visage, plutôt que la vignette de la vidéo longue, qui porte souvent un titre en surimpression.
- Captures de la fiche avec le portrait dans l'application : `captures/fiche-portrait-donc-mobile.png` et `captures/fiche-portrait-donc-ordi.png`.
- 1 nouveau test, tous les tests passent (33 sur 33). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Ce qui reste à faire
1. Stéphane : regarder les 3 portraits. Pour David Christoffel, donner une meilleure photo si possible (Administration › Intervenants › « Image de départ du portrait »).
2. Présentation d'André Stanguennec à fournir ; vérifier chaque auteur.
3. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
4. Lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-portraits-auteurs.zip` : code complet + ce bilan + les captures.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, `npx tsx scripts/draft-ai-once.ts 5`, puis `npx tsx scripts/attach-authors.ts`.
