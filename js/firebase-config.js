// =============================================================
// Configuration Firebase — StagePasse
// -------------------------------------------------------------
// 1. Va sur https://console.firebase.google.com
// 2. Crée un projet (ou ouvre le tien)
// 3. Paramètres du projet > Général > "Vos applications" > Web (</>)
// 4. Copie l'objet firebaseConfig généré et colle-le ci-dessous
// 5. Active dans la console :
//    - Authentication > Sign-in method > Email/Password
//    - Firestore Database > Créer une base (mode production ou test)
// =============================================================
const firebaseConfig = {
apiKey: "AIzaSyAJwFR1hP66AyJj19sWkr9fuKdHaSid-rM",
authDomain: "com-jerseyelite-mouhamed-e6532.firebaseapp.com",
databaseURL: "https://com-jerseyelite-mouhamed-e6532-default-rtdb.europe-west1.firebasedatabase.app",
projectId: "com-jerseyelite-mouhamed-e6532",
storageBucket: "com-jerseyelite-mouhamed-e6532.firebasestorage.app",
messagingSenderId: "415389053987",
appId: "1:415389053987:web:8ed5bb286dd943d5a2ed96"
};

firebase.initializeApp(firebaseConfig);

// Instances partagées, utilisées par auth-service.js et app-data.js
const auth = firebase.auth();
const db = firebase.firestore();
