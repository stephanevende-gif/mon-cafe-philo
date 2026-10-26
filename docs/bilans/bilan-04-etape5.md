# Bilan n°4 — Étape 5 : automatisation YouTube

*Mon café philo · Éditions M-Éditer · 26 octobre 2026 · en attente de validation*

## Ce qui a été fait

**Lecture de la playlist**
- Lecture de la playlist des Shorts (PL2d4vA4vfs79RPBnT3PFdOjyXaWPdquGv) par l'API officielle YouTube Data v3 : identifiant, titre, description, date, durée et chaîne de chaque vidéo.
- Une vidéo déjà connue n'est jamais recréée. Une vidéo de plus de 3 minutes est ignorée et signalée dans le journal.

**Préparation des fiches**
- Chaque nouveau Short devient une fiche à l'état « à vérifier », avec la source (lien YouTube, date) et une note éditoriale.
- La conférence complète est recherchée dans les liens de la description : elle n'est rattachée que si elle vient de la même chaîne et dure plus de 15 minutes.
- Programmation : le Short le plus récent publié un jour J est proposé pour J+1 ; les autres attendent dans la file éditoriale.

**Ce qui est publié**
- Une fiche n'est publiée que validée par un éditeur. À l'heure de publication, si la fiche du jour n'est pas validée, elle repart dans la file et une ancienne fiche validée est rediffusée.
- La rediffusion évite toute répétition sur 60 jours et varie le thème et l'intervenant par rapport aux 7 derniers jours. Sans fiche disponible, la fiche de secours prend le relais.
- Les rediffusions n'apparaissent pas en double dans les archives.

**Assistance IA (facultative)**
- Si une clé Anthropic est fournie, Claude propose un thème, une question et une synthèse à partir du titre et de la description.
- Il a pour consigne de ne rien inventer : pas de citation, de titre, de diplôme ni de référence, et une synthèse vide quand la description ne suffit pas.
- Les fiches proposées ainsi portent la mention « IA » et un avertissement de relecture. Elles ne sont jamais validées automatiquement.

**Tâche programmée et suivi**
- Adresse sécurisée `/api/taches`, protégée par un secret, à appeler chaque heure.
- Nouvelle page Administration › Synchronisation : état de la configuration (les clés ne sont jamais affichées), bouton « Synchroniser maintenant », file éditoriale et journal des exécutions, y compris les échecs.

**Tests et code**
- 17 tests automatiques passent, dont 6 nouveaux sur l'automatisation avec une fausse playlist (aucune donnée réelle inventée).
- Le code est envoyé sur GitHub, branche `main`.

## Choix à confirmer par Stéphane
1. **Aucune publication automatique sans relecture.** Un nouveau Short non validé à temps est remplacé par une rediffusion. Si vous préférez publier automatiquement les Shorts d'intervenants déjà vérifiés, c'est un réglage simple.
2. **J+1** : le Short publié aujourd'hui devient la question de demain.
3. **Rediffusion** : pas avant 60 jours.

## Ce qu'il me faut de votre part
- **Une clé YouTube Data API v3** (gratuite, depuis Google Cloud Console). Elle se renseigne dans la configuration de l'hébergeur ; ne la collez pas dans la conversation. Sans elle, seule la programmation fonctionne.
- Facultatif : une clé Anthropic si vous voulez l'assistance IA.
- Toujours en attente : choix de l'hébergeur et du prestataire e-mail, liens catalogue des livres, textes légaux, confirmation de « Depuis 2003 ».

## Limites connues
- La playlist réelle n'a pas pu être lue ici, faute de clé : la logique est vérifiée par les tests avec une fausse playlist.
- La tâche horaire dépend du planificateur de l'hébergeur (cron) ; elle sera branchée au déploiement (étape 7).
- L'intervenant d'un Short détecté reste à renseigner à la main : il n'est jamais deviné.

## Ce qui reste à faire
- **Étape 6** : forum par question, modération, paiement Stripe (20 € pour 335 jours).
- **Étape 7** : notifications, déploiement, tests de bout en bout, documentation finale.

## Pour reprendre en cas de coupure
Ouvrir `docs/REPRISE.md` dans l'archive `reprise-etape5.zip` ou sur GitHub (`stephanevende-gif/mon-cafe-philo`).
