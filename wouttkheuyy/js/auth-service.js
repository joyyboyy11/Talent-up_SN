// =============================================================
// StagePasse — Service d'authentification (Firebase Auth + Firestore)
// Nécessite firebase-config.js chargé avant ce fichier.
// =============================================================

/**
 * Crée un compte (Auth) puis son profil (Firestore, collection "utilisateurs").
 * @param {string} email
 * @param {string} password
 * @param {"etudiant"|"entreprise"} role
 * @param {object} profileData - champs propres au rôle (nom, domaine, competences, etc.)
 */
async function inscrireUtilisateur(email, password, role, profileData) {
  const credential = await auth.createUserWithEmailAndPassword(email, password);
  const uid = credential.user.uid;
  await db.collection("utilisateurs").doc(uid).set({
    email,
    role,
    dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
    ...profileData,
  });
  return { uid, role, ...profileData };
}

/**
 * Connecte un utilisateur puis récupère son profil (et donc son rôle réel,
 * indépendamment de ce que l'utilisateur pourrait choisir dans l'UI).
 */
async function connecterUtilisateur(email, password) {
  const credential = await auth.signInWithEmailAndPassword(email, password);
  const uid = credential.user.uid;
  const doc = await db.collection("utilisateurs").doc(uid).get();
  if (!doc.exists) {
    throw new Error("profil-introuvable");
  }
  return { uid, ...doc.data() };
}

function deconnecterUtilisateur(cheminConnexion) {
  auth.signOut().then(() => {
    window.location.href = cheminConnexion;
  });
}

/**
 * Protège une page : redirige vers la connexion si personne n'est connecté,
 * ou si le rôle du profil ne fait pas partie des rôles autorisés.
 * Appelle callback(profil) une fois la vérification réussie.
 *
 * @param {string[]} rolesAutorises - ex: ["etudiant"]
 * @param {string} cheminConnexion - chemin relatif vers connexion.html depuis la page courante
 * @param {(profil: object) => void} callback
 */
function protegerPage(rolesAutorises, cheminConnexion, callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = cheminConnexion;
      return;
    }
    try {
      const doc = await db.collection("utilisateurs").doc(user.uid).get();
      if (!doc.exists || !rolesAutorises.includes(doc.data().role)) {
        window.location.href = cheminConnexion;
        return;
      }
      callback({ uid: user.uid, ...doc.data() });
    } catch (err) {
      console.error("Erreur de vérification du profil :", err);
      window.location.href = cheminConnexion;
    }
  });
}

/** Traduit les codes d'erreur Firebase Auth en messages compréhensibles en français. */
function messageErreurAuth(err) {
  const codes = {
    "auth/email-already-in-use": "Un compte existe déjà avec cette adresse e-mail.",
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
    "auth/user-not-found": "Adresse e-mail ou mot de passe incorrect.",
    "auth/wrong-password": "Adresse e-mail ou mot de passe incorrect.",
    "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
    "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  };
  return codes[err.code] || "Une erreur est survenue. Réessayez.";
}
