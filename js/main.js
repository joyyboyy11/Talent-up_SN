// =============================================================
// StagePasse — scripts partagés (pur JS, sans dépendance)
// Les données réelles viennent de Firebase (voir firebase-config.js,
// auth-service.js, app-data.js). Ce fichier ne contient plus que des
// utilitaires d'interface réutilisés par plusieurs pages.
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initRoleTabs();
  initAvailabilityGrids();
});

/* ---------- Menu mobile ---------- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.style.display === "flex";
    links.style.display = open ? "none" : "flex";
    links.style.flexDirection = "column";
    links.style.position = "absolute";
    links.style.top = "72px";
    links.style.left = "0";
    links.style.right = "0";
    links.style.background = "#fff";
    links.style.padding = "16px 24px";
    links.style.borderBottom = "1px solid var(--line)";
    toggle.setAttribute("aria-expanded", String(!open));
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

/* ---------- Grille de disponibilité (élément signature) ----------
   Chaque cellule représente un créneau de 2h en journée, du lundi
   au samedi. Les créneaux du soir sont grisés et non cliquables
   car réservés aux cours. Cliquer bascule "disponible / non".
   Chaque cellule porte data-jour / data-heure pour pouvoir lire ou
   pré-remplir la sélection depuis Firestore (voir getDisponibilites
   / setDisponibilites plus bas). */
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const CRENEAUX = ["8h", "10h", "12h", "14h", "16h", "18h"];

function initAvailabilityGrids() {
  document.querySelectorAll("[data-availability-grid]").forEach((el) => {
    if (!el.hasAttribute("data-built")) buildGrid(el);
  });
}

function buildGrid(container) {
  const readOnly = container.hasAttribute("data-readonly");
  const grid = document.createElement("div");
  grid.className = "avail-grid";

  grid.appendChild(document.createElement("div")); // coin vide
  JOURS.forEach((j) => {
    const d = document.createElement("div");
    d.className = "cell-day";
    d.textContent = j;
    grid.appendChild(d);
  });

  CRENEAUX.forEach((heure, row) => {
    const label = document.createElement("div");
    label.className = "cell-label";
    label.textContent = heure;
    grid.appendChild(label);

    JOURS.forEach((jour) => {
      const cell = document.createElement("button");
      cell.type = "button";
      const isEvening = row === CRENEAUX.length - 1; // créneau 18h = cours du soir
      cell.className = "avail-cell" + (isEvening ? " evening" : "");
      cell.dataset.jour = jour;
      cell.dataset.heure = heure;
      cell.setAttribute("aria-label", `${jour} ${heure}`);
      if (isEvening) {
        cell.disabled = true;
        cell.title = "Cours du soir";
      } else if (!readOnly) {
        cell.addEventListener("click", () => cell.classList.toggle("on"));
      } else {
        // aperçu en lecture seule (page d'accueil) : exemple pré-rempli
        if (Math.random() > 0.55) cell.classList.add("on");
      }
      grid.appendChild(cell);
    });
  });

  container.innerHTML = "";
  container.setAttribute("data-built", "true");
  container.appendChild(grid);

  const legend = document.createElement("div");
  legend.className = "avail-legend";
  legend.innerHTML = `
    <span><span class="legend-swatch" style="background:var(--amber)"></span>Disponible</span>
    <span><span class="legend-swatch" style="background:var(--line)"></span>Libre non sélectionné</span>
    <span><span class="legend-swatch" style="background:var(--ink-soft);opacity:.5"></span>Cours du soir</span>
  `;
  container.appendChild(legend);
}

/** Lit la sélection courante d'une grille : renvoie ["Lun-8h", "Mar-10h", ...] */
function getDisponibilites(container) {
  return Array.from(container.querySelectorAll(".avail-cell.on")).map(
    (cell) => `${cell.dataset.jour}-${cell.dataset.heure}`
  );
}

/** Pré-coche une grille à partir d'une liste ["Lun-8h", ...] (ex: profil chargé depuis Firestore) */
function setDisponibilites(container, disponibilites) {
  const set = new Set(disponibilites || []);
  container.querySelectorAll(".avail-cell:not(.evening)").forEach((cell) => {
    const key = `${cell.dataset.jour}-${cell.dataset.heure}`;
    cell.classList.toggle("on", set.has(key));
  });
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
