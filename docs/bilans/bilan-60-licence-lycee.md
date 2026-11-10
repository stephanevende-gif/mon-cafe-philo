---
title: "Bilan 60 : licence pour les lycées (étude)"
---

*Mon café philo, Éditions M-Éditer. Étude du 10 novembre 2026. Aucune ligne de code n'a été modifiée.*

## En bref

**Oui, c'est possible et c'est intéressant**, à condition de ne pas en faire un simple « compte au nom du CDI » partagé par tous les élèves. Le plus réaliste est d'avancer en deux temps :

1. **Tout de suite, presque sans développement : une licence « CDI et classe »**, rattachée à l'adresse du CDI, pour projeter la fiche du jour et animer un débat. Prix conseillé : **59 € TTC par an**.
2. **Ensuite, une vraie licence d'établissement** : l'adresse du CDI devient le compte « référent », qui distribue un code d'accès aux élèves et aux professeurs. Chaque élève a son propre carnet, sous pseudonyme, sans adresse e-mail. Prix conseillé : **de 149 € à 349 € TTC par an selon l'effectif**, soit environ 1 € par élève de terminale.

Le passage par le **GAR** (l'accès aux ressources par l'ENT du lycée) est la voie royale à terme, mais c'est une démarche lourde, à garder pour quand l'offre aura fait ses preuves dans quelques lycées.

## 1. Ce que l'application sait déjà faire

- Un accès est une **période** rattachée à un compte : essai de 10 jours, paiement de 20 € pour 355 jours, ou **attribution manuelle** par l'administrateur (`src/lib/access.ts`, type `attribution`).
- On peut donc, **dès aujourd'hui**, donner un an d'accès au compte créé avec l'adresse du CDI, depuis l'administration. Le paiement se ferait sur facture (mandat administratif), en dehors de l'application.
- L'assistance IA ne sert que du côté éditeur (préparation des fiches). **Aucun texte d'élève n'est envoyé à une IA**, ce qui est un vrai atout auprès d'un établissement.
- Les vidéos viennent de la chaîne des Éditions M-Éditer et ne se chargent qu'au clic, via youtube-nocookie.com.

Ce qui manque pour une licence d'établissement : la notion d'établissement, un compte référent, des codes d'accès, et des comptes élèves sans e-mail.

## 2. Trois formules possibles

| Formule | Comment ça marche | Développement | Pour qui |
|---|---|---|---|
| **A. Licence « CDI et classe »** | Un seul compte, à l'adresse du CDI. Fiche du jour projetée au CDI ou en cours, débat collectif. Le carnet est celui du CDI. | Aucun (attribution manuelle) ; une page « Offre lycées » et un modèle de facture | Pour tester l'intérêt, dès cette année |
| **B. Licence d'établissement** | L'adresse du CDI est le compte référent. Il reçoit un code (ex. `LYC-0123-4567`) à donner aux élèves et professeurs. Chaque élève crée un compte avec un pseudonyme et un mot de passe, sans e-mail ; son accès suit la licence. Le référent voit le nombre d'inscrits, peut réinitialiser un mot de passe, régénérer le code. | Environ 2 à 3 jours de travail : tables établissement et licence, page référent, inscription par code, tests | Le cœur de l'offre |
| **C. Accès par le GAR** | L'élève clique sur Mon café philo dans l'ENT du lycée et arrive connecté, sans créer de compte. L'établissement déclare son abonnement dans la console GAR. | Lourd : contrat d'adhésion avec le ministère, validation technique, conformité. Plusieurs mois. | À terme, pour se diffuser largement |

**À éviter** : reconnaître les élèves par le domaine de leur adresse e-mail. La plupart des lycéens n'ont pas d'adresse académique, et cela obligerait à collecter l'e-mail de mineurs.

## 3. Ce que paient les CDI aujourd'hui (points de comparaison)

- **Europresse**, la ressource de presse la plus répandue dans les CDI, coûte en 2026 de **924 € TTC** (lycée de moins de 200 élèves) à **2 183 € TTC** (plus de 1 200 élèves) par an et par établissement (bon de commande Europresse Enseignement 2026).
- **Universalis** et **Le Robert** ne publient pas leurs tarifs établissement : sur devis.
- **Philosophie magazine** propose aux lycéens un abonnement numérique individuel à 3 € par mois (tarif réduit cité par la presse, à vérifier).
- De nombreuses ressources sont **gratuites** pour les lycées, financées par l'État (Éduthèque, Lumni). Mon café philo doit donc justifier son prix par ce qu'il apporte de plus : une question par jour, un parcours guidé et un carnet.

**Ce qu'on peut en tirer** : une ressource de niche, qui ne concerne surtout que les terminales (et la spécialité HLP en première), doit rester **nettement sous Europresse**. Entre 150 et 350 € par an, la décision peut être prise par le professeur documentaliste et le professeur de philosophie sans gros arbitrage budgétaire.

## 4. Fourchette de prix proposée

| Formule | Effectif du lycée | Prix conseillé (TTC, par an) |
|---|---|---|
| A. CDI et classe (un compte) | tous | **59 €** |
| B. Établissement | moins de 500 élèves | **149 €** |
| B. Établissement | 500 à 1 000 élèves | **249 €** |
| B. Établissement | plus de 1 000 élèves | **349 €** |
| Lancement | 3 à 5 lycées pilotes | **première année offerte**, contre un retour d'expérience |

Repères :

- Un lycée de 1 000 élèves a environ 300 terminales : 249 € revient à moins de 1 € par élève, contre 20 € en individuel. L'écart est normal, la plupart des élèves n'iraient pas jusqu'à l'achat individuel.
- La licence suit l'**année scolaire** (1er septembre au 31 août) plutôt que 355 jours, pour coller au fonctionnement des établissements.
- Paiement sur **facture** (bon de commande, mandat administratif, numéro UAI du lycée) : les lycées publics paient rarement par carte. Le prix peut être affiché HT et TTC selon le régime de TVA des Éditions M-Éditer.

Ces prix sont une proposition de départ, à confirmer en parlant à deux ou trois professeurs documentalistes.

## 5. Contraintes à respecter

### Données personnelles des élèves (RGPD)

- Dans une licence d'établissement, c'est le **lycée qui est responsable** des données de ses élèves ; les Éditions M-Éditer deviennent **sous-traitant**. Il faut un **contrat de sous-traitance** (article 28 du RGPD), court et type, signé avec chaque lycée.
- **Minimiser** : pseudonyme et mot de passe, pas d'e-mail, pas de nom de famille, pas de date de naissance. Le carnet reste privé, y compris vis-à-vis du professeur, sauf si l'élève choisit de le partager.
- **Pas de publicité, pas de revente**, pas de traceur : c'est déjà le cas.
- **Durée de conservation** : suppression des comptes élèves à la fin de la licence, avec un export du carnet proposé avant. La politique de confidentialité a encore deux trous à combler : la durée de conservation et l'adresse de contact.
- **Hébergement** : Vercel (région Francfort) et Neon (Francfort) gardent les données en Europe, mais ce sont des sociétés américaines. Pour une offre aux établissements, et surtout pour le GAR, un hébergeur européen (Scaleway, OVHcloud, Clever Cloud) serait plus rassurant. L'application est déjà conçue pour pouvoir changer d'hébergeur.
- **YouTube** : au clic, la vidéo passe par Google. Certains réseaux d'établissement bloquent YouTube : à tester dans un lycée pilote.

### Droits sur les contenus

- **Vidéos** : elles sont sur la chaîne des Éditions M-Éditer. Vérifier que l'accord avec chaque intervenant couvre bien un usage **payant auprès d'établissements scolaires** (et la projection en classe). Si l'accord ne parle que de la chaîne YouTube, un avenant d'une ligne suffit.
- **Textes cités** : l'application ne reprend que de **courtes citations** avec leur source, ce qui reste permis quel que soit le client. Ne pas ajouter d'extraits longs dans l'offre lycées sans accord des éditeurs.
- **Couvertures** : celles du catalogue M-Éditer sont autorisées. Les autres ne sont pas affichées.
- **Dictionnaire** : simple lien vers le CNRTL, sans reprise de contenu.

## 6. Ce qui a été fait

- Lecture du code de l'application : gestion des accès, données conservées, usage de l'IA, hébergement.
- Recherche des tarifs pratiqués par les ressources des CDI et du fonctionnement du GAR.
- Rédaction de cette étude : trois formules, une fourchette de prix, les contraintes.

## 7. Ce qui reste à faire (si vous donnez votre accord)

1. **Choisir** : formule A seule pour commencer, ou A puis B.
2. **Vérifier** les accords avec les intervenants des vidéos (usage auprès des établissements).
3. **Formule A** : une page « Offre lycées » sur le site et un modèle de devis et de facture. Environ une demi-journée.
4. **Formule B** : établissements, licences, codes, comptes élèves sans e-mail, page référent, tests. Environ 2 à 3 jours.
5. **Documents** : contrat de sous-traitance type et politique de confidentialité complétée (durée, contact, page dédiée aux élèves).
6. **Plus tard** : hébergeur européen, puis adhésion au GAR.

## Sources

- Bon de commande Europresse Enseignement 2026 : https://www.europresse.com/app/uploads/2025/12/BDC_EUROPRESSE_pour_Enseignement-2026.pdf
- Contrat d'adhésion au GAR, version 2026 : https://gar.education.fr/wp-content/uploads/2026/06/Contrat-GAR_v2026.pdf
- Présentation générale du GAR : https://gar.education.fr/wp-content/uploads/2026/06/GAR-PresentationGenerale_20260611.pdf
- GAR et ressources numériques (académie de Nancy-Metz) : https://sites.ac-nancy-metz.fr/documentation/numerique-et-documentation/gar-et-ressources-numeriques/
- Tarifs Philosophie magazine (CB News) : https://www.cbnews.fr/node/54157
