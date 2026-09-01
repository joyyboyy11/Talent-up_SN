// =============================================================
// StagePasse — Accès aux données Firestore
// Nécessite firebase-config.js chargé avant ce fichier.
// =============================================================

/* ---------- Offres ---------- */

async function creerOffre(entrepriseId, entrepriseNom, donnees) {
  return db.collection("offres").add({
    ...donnees,
    entrepriseId,
    entrepriseNom,
    statut: "en_attente",
    dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function chargerOffresEntreprise(entrepriseId) {
  const snap = await db.collection("offres").where("entrepriseId", "==", entrepriseId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function chargerOffresValidees() {
  const snap = await db.collection("offres").where("statut", "==", "validee").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function chargerOffresEnAttente() {
  const snap = await db.collection("offres").where("statut", "==", "en_attente").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function validerOffre(offreId) {
  await db.collection("offres").doc(offreId).update({ statut: "validee" });
}

async function refuserOffre(offreId) {
  await db.collection("offres").doc(offreId).update({ statut: "refusee" });
}

/* ---------- Score de compatibilité ----------
   60% compétences en commun (offre.competences ∩ profil.competences)
   40% compatibilité horaire (offre "flexible" = compatible d'office ;
   offre "jour" = compatible si l'étudiant a coché au moins 3 créneaux
   de journée dans ses disponibilités). */

function calculerScoreMatch(offre, profilEtudiant) {
  const competencesOffre = (offre.competences || []).map((c) => c.toLowerCase().trim());
  const competencesEtudiant = (profilEtudiant.competences || []).map((c) => c.toLowerCase().trim());

  let scoreCompetences = 0;
  if (competencesOffre.length) {
    const communes = competencesOffre.filter((c) =>
      competencesEtudiant.some((e) => e.includes(c) || c.includes(e))
    );
    scoreCompetences = communes.length / competencesOffre.length;
  } else {
    scoreCompetences = 0.5; // pas d'exigence précisée par l'offre
  }

  const nbCreneauxDisponibles = (profilEtudiant.disponibilites || []).length;
  let scoreHoraire;
  if (offre.horaire === "flexible") {
    scoreHoraire = 1;
  } else {
    scoreHoraire = nbCreneauxDisponibles >= 3 ? 1 : nbCreneauxDisponibles / 3;
  }

  const score = scoreCompetences * 0.6 + scoreHoraire * 0.4;
  return Math.round(score * 100);
}

/* ---------- Candidatures ---------- */

async function postulerOffre(offre, profilEtudiant, etudiantId) {
  const score = calculerScoreMatch(offre, profilEtudiant);
  return db.collection("candidatures").add({
    offreId: offre.id,
    offreTitre: offre.titre,
    entrepriseId: offre.entrepriseId,
    entrepriseNom: offre.entrepriseNom,
    etudiantId,
    etudiantNom: profilEtudiant.nom,
    matchScore: score,
    statut: "envoyee",
    dateEnvoi: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function chargerCandidaturesEtudiant(etudiantId) {
  const snap = await db.collection("candidatures").where("etudiantId", "==", etudiantId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function chargerCandidaturesEntreprise(entrepriseId) {
  const snap = await db.collection("candidatures").where("entrepriseId", "==", entrepriseId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function mettreAJourStatutCandidature(candidatureId, statut) {
  await db.collection("candidatures").doc(candidatureId).update({ statut });
}

/* ---------- Statistiques admin ---------- */

async function chargerStatistiquesAdmin() {
  const [utilisateursSnap, offresSnap, candidaturesSnap] = await Promise.all([
    db.collection("utilisateurs").get(),
    db.collection("offres").get(),
    db.collection("candidatures").get(),
  ]);

  const utilisateurs = utilisateursSnap.docs.map((d) => d.data());
  const offres = offresSnap.docs.map((d) => d.data());
  const candidatures = candidaturesSnap.docs.map((d) => d.data());

  return {
    nbEtudiants: utilisateurs.filter((u) => u.role === "etudiant").length,
    nbEntreprises: utilisateurs.filter((u) => u.role === "entreprise").length,
    nbOffresEnAttente: offres.filter((o) => o.statut === "en_attente").length,
    nbOffresValidees: offres.filter((o) => o.statut === "validee").length,
    nbOffresRefusees: offres.filter((o) => o.statut === "refusee").length,
    candidatures,
    nbCandidatures: candidatures.length,
    nbStagesObtenus: candidatures.filter((c) => c.statut === "acceptee").length,
  };
}

/* ---------- Formatage ---------- */

function formaterDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("fr-FR");
}

function libelleStatutCandidature(statut) {
  return {
    envoyee: "Envoyée",
    vue: "Vue",
    entretien: "Entretien",
    acceptee: "Acceptée",
    refusee: "Refusée",
  }[statut] || statut;
}

function classeBadgeStatut(statut) {
  return {
    envoyee: "badge-neutral",
    vue: "badge-neutral",
    entretien: "badge-warning",
    acceptee: "badge-success",
    refusee: "badge-danger",
  }[statut] || "badge-neutral";
}
