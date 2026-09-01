// =============================================================
// StagePasse — scripts partagés (pur JS, sans dépendance)
// Les données réelles viennent de Firebase (voir firebase-config.js,
// auth-service.js, app-data.js). Ce fichier ne contient plus que des
// utilitaires d'interface réutilisés par plusieurs pages.
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initRoleTabs();
  initAvailabilityLists();
});

/* ---------- Menu mobile (drawer, voir css/style.css) ---------- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () => {
    setOpen(!links.classList.contains("is-open"));
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (!links.classList.contains("is-open")) return;
    if (links.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });
}

/* ---------- Onglets de rôle (inscription) ---------- */
function initRoleTabs() {
  const tabs = document.querySelectorAll(".role-tab");
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-role");
      document.querySelectorAll("[data-role-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-role-panel") !== target;
      });
    });
  });
}

/* ---------- Disponibilités (élément signature) ----------
   Remplace l'ancienne grille horaire par un formulaire "ajouter un
   créneau" : l'étudiant choisit un jour + une heure de début/fin
   (entre 8h et 16h — les cours du soir ont lieu de 16h à 18h et
   restent donc indisponibles), puis retrouve ses créneaux dans une
   liste qu'il peut compléter ou vider créneau par créneau.
   Chaque conteneur garde son état courant dans `container._slots`
   (tableau d'objets { jour, debut, fin }) ; voir getDisponibilites
   / setDisponibilites plus bas pour la lecture/écriture Firestore. */
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HEURE_MIN = "08:00";
const HEURE_MAX = "16:00";

const EXEMPLE_DISPONIBILITES = [
  { jour: "Lundi", debut: "08:00", fin: "12:00" },
  { jour: "Mercredi", debut: "14:00", fin: "16:00" },
  { jour: "Vendredi", debut: "08:00", fin: "13:00" },
];

function initAvailabilityLists() {
  document.querySelectorAll("[data-availability-list]").forEach((el) => {
    if (!el.hasAttribute("data-built")) buildAvailabilityList(el);
  });
}

function formatHeure(heure) {
  return heure.replace(":", "h");
}

function trierCreneaux(slots) {
  return [...slots].sort((a, b) => {
    const diffJour = JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour);
    return diffJour !== 0 ? diffJour : a.debut.localeCompare(b.debut);
  });
}

function renderAvailabilityList(container) {
  const liste = container.querySelector(".dispo-list");
  const vide = container.querySelector(".dispo-empty");
  const slots = trierCreneaux(container._slots || []);

  liste.innerHTML = slots
    .map(
      (slot, index) => `
    <li class="dispo-item" data-index="${index}">
      <span>${slot.jour} · ${formatHeure(slot.debut)} – ${formatHeure(slot.fin)}</span>
      ${
        container.hasAttribute("data-readonly")
          ? ""
          : `<button type="button" class="dispo-remove" data-index="${index}" aria-label="Supprimer ce créneau">×</button>`
      }
    </li>`
    )
    .join("");

  vide.style.display = slots.length ? "none" : "block";
}

function buildAvailabilityList(container) {
  const readOnly = container.hasAttribute("data-readonly");
  container._slots = readOnly ? EXEMPLE_DISPONIBILITES : [];

  const optionsJours = JOURS.map((j) => `<option value="${j}">${j}</option>`).join("");

  container.innerHTML = `
    <div class="dispo-widget">
      ${
        readOnly
          ? ""
          : `<div class="dispo-form">
              <div class="dispo-form-field">
                <label>Jour</label>
                <select class="dispo-jour">${optionsJours}</select>
              </div>
              <div class="dispo-form-field">
                <label>De</label>
                <input type="time" class="dispo-debut" value="${HEURE_MIN}" min="${HEURE_MIN}" max="${HEURE_MAX}" step="1800">
              </div>
              <div class="dispo-form-field">
                <label>À</label>
                <input type="time" class="dispo-fin" value="12:00" min="${HEURE_MIN}" max="${HEURE_MAX}" step="1800">
              </div>
              <button type="button" class="btn btn-secondary btn-sm dispo-add">+ Ajouter</button>
            </div>
            <p class="dispo-error" style="display:none; color:var(--danger); font-size:.8rem; margin:6px 0 0;"></p>`
      }
      <ul class="dispo-list"></ul>
      <p class="dispo-empty hint" style="margin:8px 0 0;">Aucun créneau ajouté pour le moment.</p>
    </div>
  `;
  container.setAttribute("data-built", "true");
  renderAvailabilityList(container);

  if (readOnly) return;

  const erreur = container.querySelector(".dispo-error");
  const afficherErreur = (message) => {
    erreur.textContent = message;
    erreur.style.display = "block";
  };

  container.querySelector(".dispo-add").addEventListener("click", () => {
    erreur.style.display = "none";
    const jour = container.querySelector(".dispo-jour").value;
    const debut = container.querySelector(".dispo-debut").value;
    const fin = container.querySelector(".dispo-fin").value;

    if (!debut || !fin) return afficherErreur("Choisissez une heure de début et de fin.");
    if (debut >= fin) return afficherErreur("L'heure de fin doit être après l'heure de début.");
    if (debut < HEURE_MIN || fin > HEURE_MAX) {
      return afficherErreur("Les créneaux doivent être compris entre 8h et 16h (les cours du soir ont lieu de 16h à 18h).");
    }
    const existeDeja = container._slots.some(
      (s) => s.jour === jour && s.debut === debut && s.fin === fin
    );
    if (existeDeja) return afficherErreur("Ce créneau est déjà dans votre liste.");

    container._slots.push({ jour, debut, fin });
    renderAvailabilityList(container);
  });

  container.querySelector(".dispo-list").addEventListener("click", (e) => {
    const bouton = e.target.closest(".dispo-remove");
    if (!bouton) return;
    const slots = trierCreneaux(container._slots);
    slots.splice(Number(bouton.dataset.index), 1);
    container._slots = slots;
    renderAvailabilityList(container);
  });
}

/** Lit la sélection courante : renvoie [{ jour, debut, fin }, ...] */
function getDisponibilites(container) {
  return trierCreneaux(container._slots || []);
}

/** Recharge une liste à partir de créneaux sauvegardés (ex: profil Firestore) */
function setDisponibilites(container, disponibilites) {
  container._slots = disponibilites || [];
  renderAvailabilityList(container);
}

/* ---------- Rendu générique d'une liste d'offres ----------
   Utilisé par offres.html et les tableaux de bord. `offres` doit être
   un tableau d'objets { id, titre, entrepriseNom, competences[], horaire,
   duree, matchScore? }. Si afficherActions est true, les boutons
   Postuler/Détail sont ajoutés avec data-offer-id pour être branchés
   par la page appelante. */
function renderOffers(list, offres, { afficherMatch = true } = {}) {
  if (!offres.length) {
    list.innerHTML = `<div class="empty-state"><h3>Aucune offre ne correspond</h3><p>Essayez d'élargir vos filtres, notamment sur les horaires.</p></div>`;
    return;
  }
  list.innerHTML = offres.map((o) => `
    <div class="offer-card">
      <div class="offer-top">
        <div>
          <h3 style="margin-bottom:2px">${o.titre}</h3>
          <p style="margin:0">${o.entrepriseNom || ""}</p>
        </div>
        ${afficherMatch && typeof o.matchScore === "number"
          ? `<span class="offer-match">${o.matchScore}% compatible</span>`
          : ""}
      </div>
      <div class="tag-row">
        ${(o.competences || []).slice(0, 3).map((c) => `<span class="tag">${c}</span>`).join("")}
        <span class="tag">${labelHoraire(o.horaire)}</span>
        <span class="tag">${o.duree || ""}</span>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" data-postuler="${o.id}">Postuler</button>
      </div>
    </div>
  `).join("");
}

function labelHoraire(h) {
  return { jour: "Journée uniquement", flexible: "Horaires flexibles" }[h] || h;
}
