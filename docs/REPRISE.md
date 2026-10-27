# Reprendre le travail sur Mon café philo

Ce fichier permet à toute personne (ou à une nouvelle session de Claude) de reprendre le projet après une coupure.

## Où en est-on
- Étapes 1 à 4 : validées par Stéphane (Éditions M-Éditer) le 26 octobre 2026.
- Étape 5 (automatisation YouTube) : livrée le 26 octobre 2026, en attente de validation. Voir `docs/bilans/bilan-04-etape5.md`.
- 26 octobre 2026 : test réussi sur la vraie playlist (852 Shorts, 830 reliés à une conférence ou un extrait de plus de 3 minutes). Voir `docs/bilans/bilan-05-test-playlist.md`.
- Prochaine étape après validation : étape 6 (forum, modération, paiement Stripe).
- Tarif validé : 20 € TTC pour 355 jours, après 10 jours gratuits. Aucun renouvellement automatique.

## Règles de travail demandées par Stéphane
1. Avancer par étapes et attendre sa validation explicite avant l'étape suivante.
2. Après chaque livraison, joindre un bilan (fait / reste à faire) dans une archive zip téléchargeable contenant aussi le code, pour pouvoir reprendre en cas de coupure.
3. Ne jamais inventer d'intervenant, de livre, de citation ni de lien vidéo.

## Principe philosophique de l'application
On ne philosophe pas vraiment tant que l'on ne pose pas un problème, qu'on ne l'instruit pas et qu'on ne s'y confronte pas pour le surmonter, avec et pour les autres. Les solutions évidentes et les réponses sans analyse sont sources d'erreur, et même de faute.
C'est pourquoi la page « Je suis » pose, avant la version 3, le problème à surmonter propre à chaque question et demande au lecteur sa solution (voir `src/components/JeSuis.tsx` et `src/lib/ai.ts`).

## Où trouver les choses
- Code : dépôt GitHub `stephanevende-gif/mon-cafe-philo`, branche `main`.
- Maquettes validées : `docs/maquettes/` (phase 1 et étape 3).
- Bilans : `docs/bilans/`.
- Démarrage local : voir `README.md`.
