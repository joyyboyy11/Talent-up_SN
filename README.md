# Talent'Up SN

Plateforme web (HTML / CSS / JS vanilla + Firebase) de recrutement et
d'employabilité pour les jeunes diplômés sénégalais (Bac+2 à Bac+5) : offres
d'emploi, CVthèque, présélection RH, et module Formation & Coaching. Quatre
espaces : **candidat**, **entreprise**, **admin / RH**, et une page de tarifs
pour les entreprises.

## Configuration Firebase

Avant de lancer le projet, vérifiez `js/firebase-config.js` et activez, dans
la [console Firebase](https://console.firebase.google.com) du projet
correspondant :

- **Authentication > Sign-in method > Email/Password**
- **Firestore Database** (mode production ou test)
- Collez le contenu de `firestore.rules` dans **Firestore Database > Règles**

## Créer un compte administrateur (équipe RH)

Il n'existe volontairement aucune page publique d'inscription pour le rôle
`admin` (ce rôle donne accès à la validation des offres et aux statistiques
globales, il ne doit pas être auto-attribuable). Pour créer un compte admin :

1. Créez d'abord un compte normal via `inscription.html` (par exemple en
   tant qu'« Entreprise », peu importe le rôle choisi à l'écran — vous allez
   le corriger à l'étape suivante).
2. Ouvrez la [console Firebase](https://console.firebase.google.com) du
   projet > **Firestore Database** > collection `utilisateurs`.
3. Repérez le document correspondant à l'UID de ce compte (visible aussi
   dans **Authentication > Users**).
4. Modifiez le champ `role` : remplacez sa valeur par `admin`.
5. Reconnectez-vous sur `connexion.html` : le compte est automatiquement
   redirigé vers `admin/dashboard.html`.

> Les règles de sécurité (`firestore.rules`) empêchent un utilisateur de
> modifier son propre champ `role` depuis l'application — ce changement
> n'est possible que manuellement dans la console, ou par un autre compte
> admin.

## Structure du projet

```
index.html                 Accueil
offres.html                Liste publique des offres d'emploi validées
offre-detail.html          Détail d'une offre (description, compétences, postuler)
inscription.html           Création de compte (candidat / entreprise)
connexion.html             Connexion (rôle détecté automatiquement)
mentions-legales.html      Mentions légales & confidentialité
etudiant/                  Tableau de bord, profil, candidatures, Formation & Coaching
entreprise/                Tableau de bord, publication d'offre, tarifs d'abonnement
admin/                     Validation des offres, statistiques
js/firebase-config.js      Config du projet Firebase
js/auth-service.js         Inscription / connexion / protection des pages
js/app-data.js             Accès Firestore (offres, candidatures, score de présélection)
js/main.js                 Utilitaires d'interface (menu, rendu des cartes d'offre)
firestore.rules            Règles de sécurité Firestore
```

Note : les rôles internes conservent le nom technique `etudiant` (au lieu de
`candidat`) dans le code et dans Firestore, pour rester compatibles avec les
données existantes. Toute l'interface visible affiche « Candidat ».

## Le score de présélection

Chaque offre affiche, pour un candidat connecté, un score indicatif sur 100
combinant, selon la pondération retenue dans le Business Plan :

- **70 %** la correspondance entre les compétences requises par l'offre et
  les compétences déclarées par le candidat ;
- **30 %** l'adéquation globale du profil (domaine d'études et niveau de
  diplôme par rapport au niveau requis par l'offre).

Ce score est un outil d'aide à la décision : il ne remplace pas la revue
manuelle effectuée par l'équipe RH avant validation d'une candidature.

## Module Formation & Coaching

La page `etudiant/formation.html` présente les contenus d'autoformation (CV,
lettre de motivation, entretien) et permet à un candidat connecté d'envoyer
une demande de coaching individuel ou collectif (collection Firestore
`demandesCoaching`, à traiter manuellement par l'équipe RH pour l'instant).

## Tarifs entreprises

La page `entreprise/tarifs.html` présente la grille tarifaire indicative du
Business Plan : Starter (15 000 FCFA/mois), Business (35 000 FCFA/mois,
offre de référence) et Premium (75 000 FCFA/mois). La souscription effective
à un abonnement (paiement, changement de formule) n'est pas encore implémentée
dans le prototype ; le champ `abonnement` du profil entreprise sert de base
pour un futur développement.
