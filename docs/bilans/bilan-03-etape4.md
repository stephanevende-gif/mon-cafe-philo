# Mon café philo · Bilan n° 3 · Étape 4 (développement)

Date : 26 octobre 2026
Code : code/mon-cafe-philo-etape4.zip (archive) et code/mon-cafe-philo.bundle (historique git complet)
Statut : développé et testé localement, en attente de votre validation. Pas encore en ligne.

## Ce qui a été fait

### Application (Next.js, PostgreSQL)
- **Parcours Je pense / Donc ? / Je suis** fidèle aux maquettes validées, sur téléphone, tablette et ordinateur.
- **Comptes** : inscription sans carte, connexion, confirmation de l'adresse e-mail, mot de passe oublié, déconnexion.
- **Sécurité** : mots de passe argon2id, sessions sécurisées, limitation des tentatives, champ anti-robot, en-têtes de sécurité, suspension de compte.
- **Droits d'accès** : 30 jours gratuits dès l'inscription, prolongation de 335 jours à 20 € (payer pendant l'essai ne fait perdre aucun jour), date d'expiration affichée, pas de renouvellement automatique.
- **Carnet** : chaque réflexion est une nouvelle version, comparaison première/dernière version, tout reste privé.
- **Archives** : recherche par mot-clé, thème, intervenant et période.
- **Administration** : tableau de bord (chiffres agrégés, calendrier des 14 prochains jours), fiches, intervenants, vidéos, livres, utilisateurs (offrir un accès, suspendre, changer le rôle).
- **Règles éditoriales** : la mention d'authenticité exige un intervenant vérifié et une certification par un éditeur ; la synthèse est toujours présentée comme synthèse éditoriale ; fiche de secours identique pour tous si aucune fiche n'est programmée ; changement de sujet à minuit, heure de Paris.
- **RGPD** : export des données en un clic, suppression du compte, lecteur YouTube chargé seulement au clic, polices hébergées par l'application, un seul cookie indispensable.
- **PWA** : manifeste et icônes pour l'installation sur téléphone.
- Les quatre livres de référence et leurs couvertures sont préchargés.

### Vérifications
- 11 tests automatiques réussis (dates de Paris, droits d'accès, comptes, carnet, fiche de secours, adresses YouTube).
- Parcours complet testé dans un navigateur : inscription, écriture, Donc ?, Je suis, compte, export, archives, connexion refusée puis administrateur, création d'intervenant, de vidéo et de fiche certifiée. Aucune erreur.

## Ce qui reste à faire

### De votre côté
- [ ] Relier votre compte GitHub à Claude (https://claude.ai/connect-github) et installer l'application Claude sur `stephanevende-gif/mon-cafe-philo`, pour que j'y envoie le code
- [ ] Valider l'étape 4
- [ ] Compléter les mentions légales, CGU/CGV et la politique de confidentialité (passages entre crochets)
- [ ] Liens des fiches boutique des quatre livres
- [ ] Choisir l'hébergeur européen et le service d'envoi d'e-mails

### Étapes suivantes
- [ ] Étape 5 : automatisation YouTube (playlist, détection des Shorts, préparation des fiches, file éditoriale)
- [ ] Étape 6 : forum (charte, signalement, modération, contestation) et paiement Stripe 20 € / 335 jours avec reçu
- [ ] Étape 7 : notifications quotidiennes, mise en ligne, sauvegardes, tests sur appareils, documentation

### Limites actuelles, à ne pas confondre avec des fonctions en service
- Le paiement n'est pas branché : le bouton de prolongation annonce son ouverture prochaine.
- La discussion entre lecteurs n'est pas ouverte : un encart l'indique.
- Les vidéos, intervenants et synthèses sont saisis à la main pour l'instant.
