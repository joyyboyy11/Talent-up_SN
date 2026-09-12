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

/* ---------- Score de présélection (expérimental) ----------
   Pondération indicative reprise du Business Plan :
   70% correspondance des compétences requises (offre.competences ∩
   profil.competences) et 30% adéquation globale du profil (domaine
   d'études et niveau de diplôme par rapport à l'offre). Ce score est
   un outil d'aide à la décision : la décision finale reste sous
   contrôle humain via une revue manuelle de l'équipe RH. */

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

  const NIVEAUX = ["bac2", "licence", "master1", "master2", "ingenieur"];
  let scoreAdequation = 0.5; // valeur par défaut si l'un des deux champs manque
  const memedomaine = offre.domaine && profilCandidat.domaine && offre.domaine === profilCandidat.domaine;
  let scoreNiveau = 0.5;
  if (offre.niveauRequis && profilCandidat.niveauEtude) {
    const indexOffre = NIVEAUX.indexOf(offre.niveauRequis);
    const indexCandidat = NIVEAUX.indexOf(profilCandidat.niveauEtude);
    if (indexOffre !== -1 && indexCandidat !== -1) {
      scoreNiveau = indexCandidat >= indexOffre ? 1 : 0.4;
    }
  }
  scoreAdequation = memedomaine ? Math.min(1, scoreNiveau + 0.3) : scoreNiveau * 0.7;

  const score = scoreCompetences * 0.7 + scoreAdequation * 0.3;
  return Math.round(score * 100);
}

/* ---------- Candidatures ---------- */

async function aDejaPostule(etudiantId, offreId) {
  const snap = await db.collection("candidatures")
    .where("etudiantId", "==", etudiantId)
    .where("offreId", "==", offreId)
    .limit(1)
    .get();
  return !snap.empty;
}

async function postulerOffre(offre, profilEtudiant, etudiantId) {
  if (await aDejaPostule(etudiantId, offre.id)) {
    throw new Error("candidature-existante");
  }
  const score = calculerScoreMatch(offre, profilEtudiant);
  return db.collection("candidatures").add({
    offreId: offre.id,
    offreTitre: offre.titre,
    entrepriseId: offre.entrepriseId,
    entrepriseNom: offre.entrepriseNom,
    etudiantId,
    etudiantNom: profilEtudiant.nom,
    // Instantané du profil au moment de la candidature : permet à
    // l'entreprise et à l'équipe RH de voir les infos utiles du candidat
    // sans avoir besoin d'un accès direct à son profil complet.
    etudiantUniversite: profilEtudiant.universite || "",
    etudiantNiveauEtude: profilEtudiant.niveauEtude || "",
    etudiantDomaine: profilEtudiant.domaine || "",
    etudiantCompetences: profilEtudiant.competences || [],
    etudiantCvLien: profilEtudiant.cvLien || "",
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

/* ---------- Abonnements entreprise (demande puis confirmation RH) ---------- */

/** L'entreprise demande une formule : elle ne peut pas s'attribuer elle-même
    l'abonnement, seule l'équipe RH confirme après réception du paiement. */
async function demanderAbonnement(entrepriseUid, plan) {
  await db.collection("utilisateurs").doc(entrepriseUid).update({
    abonnementDemande: plan,
    abonnementStatut: "en_attente",
  });
}

async function chargerDemandesAbonnement() {
  const snap = await db.collection("utilisateurs").where("role", "==", "entreprise").get();
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((e) => e.abonnementStatut === "en_attente");
}

/** Confirmation RH : c'est ce qui active réellement l'abonnement, après
    vérification manuelle du paiement effectué par l'entreprise. */
async function confirmerAbonnement(entrepriseUid, plan) {
  await db.collection("utilisateurs").doc(entrepriseUid).update({
    abonnement: plan,
    abonnementStatut: "confirme",
  });
}

async function refuserDemandeAbonnement(entrepriseUid) {
  await db.collection("utilisateurs").doc(entrepriseUid).update({
    abonnementStatut: "refuse",
  });
}

/* ---------- CVthèque (accès entreprise aux profils candidats) ---------- */

async function chargerCvtheque() {
  const snap = await db.collection("utilisateurs").where("role", "==", "etudiant").get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/* ---------- Présélection admin/RH (toutes les candidatures) ---------- */

async function chargerToutesCandidatures() {
  const snap = await db.collection("candidatures").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------- Demandes de coaching (module Formation & Coaching) ---------- */

async function chargerDemandesCoaching() {
  const snap = await db.collection("demandesCoaching").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function mettreAJourStatutDemandeCoaching(demandeId, statut) {
  await db.collection("demandesCoaching").doc(demandeId).update({ statut });
}

function libelleStatutCoaching(statut) {
  return {
    nouvelle: "Nouvelle",
    contactee: "Candidat contacté",
    planifiee: "Séance planifiée",
    terminee: "Terminée",
  }[statut] || statut;
}

function classeBadgeStatutCoaching(statut) {
  return {
    nouvelle: "badge-warning",
    contactee: "badge-neutral",
    planifiee: "badge-neutral",
    terminee: "badge-success",
  }[statut] || "badge-neutral";
}

/* ---------- Statistiques admin ---------- */

async function chargerStatistiquesAdmin() {
  const [utilisateursSnap, offresSnap, candidaturesSnap, coachingSnap] = await Promise.all([
    db.collection("utilisateurs").get(),
    db.collection("offres").get(),
    db.collection("candidatures").get(),
    db.collection("demandesCoaching").get(),
  ]);

  const utilisateurs = utilisateursSnap.docs.map((d) => d.data());
  const offres = offresSnap.docs.map((d) => d.data());
  const candidatures = candidaturesSnap.docs.map((d) => d.data());
  const demandesCoaching = coachingSnap.docs.map((d) => d.data());

  return {
    nbEtudiants: utilisateurs.filter((u) => u.role === "etudiant").length,
    nbEntreprises: utilisateurs.filter((u) => u.role === "entreprise").length,
    nbOffresTotal: offres.length,
    nbOffresEnAttente: offres.filter((o) => o.statut === "en_attente").length,
    nbOffresValidees: offres.filter((o) => o.statut === "validee").length,
    nbOffresRefusees: offres.filter((o) => o.statut === "refusee").length,
    candidatures,
    nbCandidatures: candidatures.length,
    nbEntretiens: candidatures.filter((c) => c.statut === "entretien").length,
    nbRecrutements: candidatures.filter((c) => c.statut === "acceptee").length,
    nbDemandesCoaching: demandesCoaching.length,
    nbDemandesCoachingNouvelles: demandesCoaching.filter((d) => (d.statut || "nouvelle") === "nouvelle").length,
    nbDemandesAbonnementEnAttente: utilisateurs.filter((u) => u.role === "entreprise" && u.abonnementStatut === "en_attente").length,
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
