# Bilan n°17 : portrait au crayon (27 octobre 2026)

## Ce qui a été fait
- Le premier rendu (hachures noir et blanc) ne convenait pas. Le portrait est maintenant un **dessin au crayon rehaussé à l'encre**, sur le modèle envoyé par Stéphane :
  - gris doux du graphite ;
  - traits plus noirs sur les contours (yeux, chevelure, visage) ;
  - hachures légères de crayon dans les ombres ;
  - bords « non finis » qui se perdent dans le blanc du papier, de façon irrégulière.
- Exemple sur une photo libre de droits (NASA) : `captures/exemple-portrait-crayon.png`, avec la photo d'origine à gauche et le dessin à droite.
- Le reste ne change pas : le dessin est fait automatiquement à partir de l'image de la vidéo de l'auteur, et on peut le refaire depuis Administration › Intervenants.
- Tous les tests passent (30 sur 30). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Limite
C'est un traitement automatique de la photo, pas un dessin fait à la main : il imite le crayon, mais n'aura jamais la liberté de trait d'un illustrateur. Depuis mon environnement, les images YouTube sont bloquées : les portraits des 3 auteurs seront dessinés sur le serveur (`npx tsx scripts/attach-authors.ts`).

## Ce qui reste à faire
1. Stéphane : dire si ce rendu au crayon convient.
2. Dessiner les 3 portraits sur le serveur et les ajuster si besoin.
3. Présentation d'André Stanguennec à fournir ; vérifier chaque auteur.
4. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.

## Reprise en cas de coupure
Archive `reprise-portrait-crayon.zip` : code complet + ce bilan + l'exemple.
