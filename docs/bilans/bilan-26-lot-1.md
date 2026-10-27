# Bilan n°26 : premier lot de fiches rédigées par l'IA (27 octobre 2026)

## Ce qui a été fait
- L'IA a rédigé 10 nouvelles fiches « à vérifier » (les plus récentes après les 5 de l'essai), sans erreur. Il en reste 837 à rédiger.
- Elles sont à relire dans `fiches-ia-lot-1.pdf`, présentées dans l'ordre de la fiche, avec la photo et la présentation de chaque auteur.
- Trois nouveaux auteurs sont reconnus, chacun avec la photo et le lien de sa fiche M-Éditer :
  - Armelle Grenouilloux : présentation reprise de sa fiche M-Éditer ;
  - Jean-Marie Frey : présentation reprise de la description YouTube ;
  - Sylvain Portier : présentation reprise de sa fiche M-Éditer.
- Améliorations :
  - une fiche M-Éditer est maintenant trouvée même quand aucune vidéo ne la cite, grâce à la liste des auteurs de la boutique ;
  - les présentations M-Éditer sont nettoyées de la mise en forme Word et de la bibliographie.
- 1 nouveau test, tous les tests passent (36 sur 36).

## À signaler
- La fiche M-Éditer de Sylvain Portier contient deux mots collés : « Césairede » et « titulaired'un ». Il faut les corriger sur la boutique ou dans Administration › Intervenants.

## Où voir le résultat
- L'application n'est pas encore en ligne : sa mise en ligne est l'étape 7, encore à faire. En attendant, les fiches sont visibles dans le PDF du lot.
- Pour tester l'application elle-même, il faut la mettre en ligne (hébergement de l'application et de sa base de données). C'est à décider.

## Ce qui reste à faire
1. Stéphane : relire le lot n°1.
2. Lots suivants, par 10 ou 20.
3. Étape 7 : mise en ligne.

## Reprise en cas de coupure
Archive `reprise-lot-1.zip` : code complet + ce bilan + le PDF du lot.
Commande pour un nouveau lot : `NODE_USE_ENV_PROXY=1 npx tsx scripts/draft-ai-once.ts 10`, puis `npx tsx scripts/attach-authors.ts`.
