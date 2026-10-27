# Bilan n°20 : portrait au graphite, style réaliste (27 octobre 2026)

## Ce qui a été fait
- Le dessin a été refait pour se rapprocher des portraits réalistes au crayon graphite envoyés en modèle, et s'éloigner de l'effet « dessin animé ». Il fonctionne comme un dessinateur :
  - **le trait** : de courts traits de crayon qui suivent la direction des formes (contour du visage, yeux, bouche, mèches) ;
  - **le modelé** : les ombres et les volumes sont rendus par des valeurs de gris plus claires et nuancées, avec des hachures fines dans les ombres ;
  - **les détails fins** (rides, mèches, plis) sont conservés ;
  - un léger grain de papier, et des bords qui se perdent dans le blanc.
- Comparaison sur une photo libre de droits : `captures/exemple-portrait-crayon-v3.png`, avec la version précédente à gauche et la nouvelle à droite.
- Tous les tests passent (32 sur 32). Code poussé sur la branche `claude/project-thread-1vzhmn`.

## Limite
C'est un traitement automatique de la photo : il s'approche du graphite réaliste mais n'égale pas la main d'un illustrateur. Depuis mon environnement, les photos des auteurs (YouTube, boutique M-Éditer) sont bloquées.

## Ce qui reste à faire
1. Stéphane : dire si ce rendu convient. Pour voir un vrai portrait d'auteur : envoyer une photo dans le fil, ou autoriser `i.ytimg.com` et `m-editer.izibookstore.com` dans les réglages réseau du projet.
2. Présentation d'André Stanguennec à fournir ; vérifier chaque auteur.
3. Validation de l'étape 5, puis regroupement des branches et fusion de la PR n°1.

## Reprise en cas de coupure
Archive `reprise-portrait-realiste.zip` : code complet + ce bilan + l'exemple.
