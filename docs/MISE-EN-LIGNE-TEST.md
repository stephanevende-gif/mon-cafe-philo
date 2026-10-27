# Mise en ligne de test

Version privée de l'application pour l'essayer en vrai, sur ordinateur et sur smartphone.
Elle est hébergée par Vercel, avec une base PostgreSQL Neon à Francfort. Les deux offres gratuites suffisent.

## Ce qui se passe à chaque déploiement

Commande `vercel-build` :

1. Les migrations sont appliquées à la base.
2. `scripts/prepare-test.ts` complète la base :
   - une base vide reçoit l'instantané `data/instantane-test.sql.gz`, c'est-à-dire les 863 fiches, les vidéos, l'auteur, les livres, les images des vidéos et les couvertures. Aucun compte lecteur n'y figure ;
   - le compte administrateur `ADMIN_EMAIL` / `ADMIN_PASSWORD` est créé s'il n'existe pas.
3. L'application est construite.

Une base qui contient déjà des fiches n'est jamais modifiée par l'instantané. La fiche validée sert de fiche de secours, ce qui garantit une question chaque jour.

Le planificateur de Vercel appelle `/api/taches` chaque jour à 4 h (UTC). Il synchronise la playlist et prépare les fiches d'aujourd'hui et de demain. L'offre gratuite ne permet qu'un appel par jour.

## Étapes

1. Créer un compte sur vercel.com avec « Continue with GitHub ».
2. Cliquer sur « Add New… », puis « Project ». Importer le dépôt `mon-cafe-philo` et cliquer sur « Deploy ». Ce premier déploiement n'a pas encore de base : c'est normal.
3. Dans le projet, ouvrir « Storage », puis « Create Database ». Choisir Neon (Postgres), dans la région Frankfurt, et relier la base au projet. `DATABASE_URL` est alors ajoutée toute seule.
4. Ouvrir « Settings », puis « Environment Variables », et ajouter :

   | Nom | Valeur |
   |---|---|
   | `APP_URL` | l'adresse du projet, par exemple `https://mon-cafe-philo.vercel.app` |
   | `ADMIN_EMAIL` | votre adresse e-mail |
   | `ADMIN_PASSWORD` | un mot de passe solide (10 caractères au moins) |
   | `ADMIN_NAME` | votre nom |
   | `TESTER_ACCESS_CODE` | le code à donner à vos testeurs, par exemple `cafe-philo-2026` (demandé à l'inscription) |
   | `CRON_SECRET` | une suite d'au moins 20 lettres et chiffres au hasard |
   | `YOUTUBE_API_KEY` | la clé YouTube Data API v3 |
   | `CAFE_PHILO_ANTHROPIC_KEY` | la clé Anthropic |

5. Ouvrir « Deployments ». Sur le dernier déploiement, choisir « … », puis « Redeploy ».
6. Ouvrir l'adresse du projet et se connecter avec `ADMIN_EMAIL`.

Les e-mails, comme la confirmation d'inscription ou le mot de passe oublié, ne partent pas encore, car aucun serveur SMTP n'est configuré. On peut quand même s'inscrire et se connecter.
