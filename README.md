# Mon café philo

Une application des Éditions M-Éditer. *Chaque jour, une question. Chaque jour, l'exercice de penser.*

Parcours : **Je pense. Donc ? Je suis.**

## État du projet

| Étape | Contenu | État |
|---|---|---|
| 1–3 | Charte graphique, maquettes smartphone, ordinateur et tablette | Validées |
| 4 | Comptes, carnet, archives, administration, droits d'accès | Validée |
| 5 | Automatisation YouTube (playlist, Shorts, fiches) | Développée, à valider |
| 6 | Forum, modération, paiement Stripe (20 € / 335 jours) | À faire |
| 7 | Tests, sécurité, déploiement | À faire |

## Technique

- Next.js 15 (App Router), TypeScript, application web installable (PWA).
- PostgreSQL standard avec Drizzle ORM : hébergeable chez n'importe quel prestataire européen.
- Mots de passe chiffrés en argon2id, sessions par cookie `httpOnly`, limitation des tentatives, en-têtes de sécurité (CSP).
- Polices Forum et Source Sans 3 servies par l'application (aucun appel à Google Fonts).
- Lecteur YouTube chargé seulement au clic, via `youtube-nocookie.com`.

## Démarrer en local

```bash
cp .env.example .env          # puis renseigner DATABASE_URL
npm install
npm run db:migrate            # crée les tables
npm run db:seed               # ajoute les quatre livres de référence
npm run admin:create -- vous@exemple.fr "Votre nom" "mot de passe d'au moins 10 caractères"
npm run dev                   # http://localhost:3000
```

`npm run db:seed -- --demo` ajoute en plus une fiche de démonstration pour le jour même.

Tests : `npm test` (une base `cafephilo_test` est nécessaire, voir `tests/helpers.ts`).

## Automatisation YouTube

- `POST /api/taches`, avec l'en-tête `Authorization: Bearer <CRON_SECRET>`, est à appeler **chaque heure** par le planificateur de l'hébergeur (cron).
- Chaque appel lit la playlist (`YOUTUBE_API_KEY`, `YOUTUBE_PLAYLIST_ID`), crée une fiche « à vérifier » pour chaque nouveau Short (moins de 3 minutes), cherche la conférence liée dans la description (même chaîne, plus de 3 minutes : conférence complète ou extrait), puis garantit une fiche validée pour aujourd'hui et demain.
- Le Short le plus récent publié un jour J est proposé pour J+1 ; les autres vont dans la file éditoriale.
- Une fiche jamais validée n'est jamais publiée : à défaut, une fiche déjà publiée est rediffusée (pas de répétition sur 60 jours, thèmes et intervenants variés sur 7 jours), sinon la fiche de secours.
- `ANTHROPIC_API_KEY` (facultatif) active les propositions de thème, question et synthèse par Claude, signalées « IA » et toujours soumises à relecture.
- Suivi et déclenchement manuel : `/admin/synchronisation`.

## Règles éditoriales inscrites dans le code

- La mention « Intervention humaine authentique — sélection éditoriale M-Éditer » n'apparaît que si la fiche a été certifiée par un éditeur **et** que l'intervenant du Short a été vérifié (identité, qualification, source).
- La synthèse en deux phrases est toujours présentée comme une synthèse éditoriale, jamais comme une citation.
- Une fiche ne peut être validée sans synthèse. Un Short dure moins de 3 minutes, une conférence plus de 15.
- Le sujet change à minuit, heure de Paris. Sans fiche validée pour le jour, une fiche de secours validée est servie, la même pour tous.
- Le carnet conserve chaque version ; aucune note, aucun score.
- L'accès : 30 jours gratuits sans carte, puis 335 jours pour 20 €, sans renouvellement automatique. Payer pendant l'essai ne fait perdre aucun jour.

## Organisation du code

- `src/db/schema.ts` : tables (comptes, sessions, accès, intervenants, vidéos, livres, fiches, carnet).
- `src/lib/` : logique métier (accès, comptes, carnet, fiches, dates de Paris, `automation.ts` pour YouTube, `ai.ts` pour l'assistance IA).
- `src/components/` : écrans Je pense, Donc ?, Je suis.
- `src/app/admin/` : administration éditoriale.
- `drizzle/` : migrations SQL.
