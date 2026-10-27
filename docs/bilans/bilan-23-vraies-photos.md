# Bilan n°23 : vraies photos des auteurs, plus de dessin (27 octobre 2026)

## Ce qui a été fait
- Le dessin est abandonné. L'application affiche maintenant la vraie photo de l'auteur, en couleur ou en noir et blanc selon l'original, sans retouche.
- Ordre de choix de la photo :
  1. la photo de la fiche auteur sur la boutique M-Éditer, quand elle existe ;
  2. sinon, une image de l'auteur qui regarde l'objectif, prise ailleurs (choisie par l'équipe dans Administration › Intervenants › « Photo de l'auteur ») ;
  3. en dernier recours seulement, l'image d'un de ses Shorts, recadrée sur le visage.
- La photo est recadrée, réduite (jamais agrandie, pour rester nette) et gardée dans l'application : elle s'affiche même si le site d'origine change.
- Les 3 auteurs des fiches d'essai : `captures/portraits-photos.png`.
  - André Stanguennec et Jean-Luc Nativelle : photo de leur fiche auteur M-Éditer.
  - David Christoffel (pas de fiche M-Éditer) : photo de face, où il regarde le spectateur, reprise de la carte de présentation qui figure sur l'image de sa vidéo longue.
- Écran « Donc ? » avec la photo : `captures/fiche-photo-donc-ordi.png` et `captures/fiche-photo-donc-mobile.png`.
- Dans l'administration, les mentions « dessin » sont remplacées par « photo » ; la case « Reprendre le portrait à partir de cette photo » permet de refaire le recadrage.
- Tous les tests passent (33 sur 33). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Ce qui reste à faire
1. Stéphane : regarder les 3 photos. Pour remplacer une photo : Administration › Intervenants › « Photo de l'auteur » (coller le lien https de l'image).
2. Présentation d'André Stanguennec à fournir ; vérifier chaque auteur.
3. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.
4. Lancer l'IA sur les autres fiches « à vérifier », par lots.

## Reprise en cas de coupure
Archive `reprise-vraies-photos.zip` : code complet + ce bilan + les captures.
Commandes : `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npx tsx scripts/sync-once.ts`, `npx tsx scripts/draft-ai-once.ts 5`, puis `NODE_USE_ENV_PROXY=1 npx tsx scripts/attach-authors.ts`.
