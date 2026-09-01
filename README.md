# WouttKheuyy

Plateforme web (HTML / CSS / JS vanilla + Firebase) mettant en relation des
étudiants inscrits en cours du soir avec des entreprises proposant des
stages compatibles avec leurs horaires. Trois espaces : **étudiant**,
**entreprise**, **admin / RH**.

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
index.html              Accueil
offres.html              Liste publique des offres validées
offre-detail.html        Détail d'une offre (description, compétences, postuler)
inscription.html         Création de compte (étudiant / entreprise)
connexion.html            Connexion (rôle détecté automatiquement)
etudiant/                 Tableau de bord, profil, candidatures
entreprise/                Tableau de bord, publication d'offre
admin/                     Validation des offres, statistiques
js/firebase-config.js     Config du projet Firebase
js/auth-service.js        Inscription / connexion / protection des pages
js/app-data.js             Accès Firestore (offres, candidatures, score de match)
js/main.js                 Utilitaires d'interface (menu, disponibilités, cartes d'offre)
firestore.rules            Règles de sécurité Firestore
```

## Le score de compatibilité

Chaque offre affiche, pour un étudiant connecté, un score sur 100 combinant :

- **60 %** — compétences en commun entre l'offre et le profil étudiant
- **40 %** — compatibilité horaire (une offre « flexible » est toujours
  compatible ; une offre « journée » demande au moins 3 créneaux de
  disponibilité en journée)

Voir `calculerScoreMatch` dans `js/app-data.js`.
