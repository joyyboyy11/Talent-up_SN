// =============================================================
// Talent'Up SN — Accès aux données Firestore
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

/* ---------- CVthèque ---------- */

async function chargerCvtheque() {
  const snap = await db.collection("utilisateurs").where("role", "==", "candidat").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------- Score de présélection ----------
   Pondération indicative (ajustable selon les retours des recruteurs) :
   70% correspondance des compétences requises (offre.competences ∩
   profil.competences), 30% adéquation globale du profil (niveau
   d'étude par rapport au niveau requis, CV déposé, expérience).
   La décision finale reste sous contrôle humain via la revue
   manuelle de l'équipe RH (validation des offres, statut des
   candidatures). */

function calculerScoreMatch(offre, profilCandidat) {
  const competencesOffre = (offre.competences || []).map((c) => c.toLowerCase().trim());
  const competencesCandidat = (profilCandidat.competences || []).map((c) => c.toLowerCase().trim());

  let scoreCompetences = 0;
  if (competencesOffre.length) {
    const communes = competencesOffre.filter((c) =>
      competencesCandidat.some((e) => e.includes(c) || c.includes(e))
    );
    scoreCompetences = communes.length / competencesOffre.length;
  } else {
    scoreCompetences = 0.5; // pas d'exigence précisée par l'offre
  }

  const NIVEAUX = ["licence1", "licence2", "licence3", "master1", "master2"];
  let scoreNiveau = 0.5;
  if (offre.niveauRequis) {
    const idxRequis = NIVEAUX.indexOf(offre.niveauRequis);
    const idxCandidat = NIVEAUX.indexOf(profilCandidat.niveauEtude);
    scoreNiveau = idxCandidat >= idxRequis && idxCandidat !== -1 ? 1 : 0.3;
  }
  const scoreCv = profilCandidat.cvUrl || profilCandidat.cv ? 1 : 0.4;
  const scoreProfil = scoreNiveau * 0.6 + scoreCv * 0.4;

  const score = scoreCompetences * 0.7 + scoreProfil * 0.3;
  return Math.round(score * 100);
}

/* ---------- Candidatures ---------- */

async function aDejaPostule(candidatId, offreId) {
  const snap = await db.collection("candidatures")
    .where("candidatId", "==", candidatId)
    .where("offreId", "==", offreId)
    .limit(1)
    .get();
  return !snap.empty;
}

async function postulerOffre(offre, profilCandidat, candidatId) {
  if (await aDejaPostule(candidatId, offre.id)) {
    throw new Error("candidature-existante");
  }
  const score = calculerScoreMatch(offre, profilCandidat);
  return db.collection("candidatures").add({
    offreId: offre.id,
    offreTitre: offre.titre,
    entrepriseId: offre.entrepriseId,
    entrepriseNom: offre.entrepriseNom,
    candidatId,
    candidatNom: profilCandidat.nom,
    matchScore: score,
    statut: "envoyee",
    dateEnvoi: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function chargerCandidaturesCandidat(candidatId) {
  const snap = await db.collection("candidatures").where("candidatId", "==", candidatId).get();
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
    nbCandidats: utilisateurs.filter((u) => u.role === "candidat").length,
    nbEntreprises: utilisateurs.filter((u) => u.role === "entreprise").length,
    nbOffresEnAttente: offres.filter((o) => o.statut === "en_attente").length,
    nbOffresValidees: offres.filter((o) => o.statut === "validee").length,
    nbOffresRefusees: offres.filter((o) => o.statut === "refusee").length,
    candidatures,
    nbCandidatures: candidatures.length,
    nbEmploisObtenus: candidatures.filter((c) => c.statut === "acceptee").length,
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
    acceptee: "Recruté(e)",
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
