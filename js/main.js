// =============================================================
// Talent'Up SN — scripts partagés (pur JS, sans dépendance)
// Les données réelles viennent de Firebase (voir firebase-config.js,
// auth-service.js, app-data.js). Ce fichier ne contient plus que des
// utilitaires d'interface réutilisés par plusieurs pages.
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initRoleTabs();
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

/* ---------- Rendu générique d'une liste d'offres ----------
   Utilisé par offres.html et les tableaux de bord. `offres` doit être
   un tableau d'objets { id, titre, entrepriseNom, competences[],
   typeContrat, niveauRequis, matchScore? }. Si afficherActions est
   true, les boutons Postuler/Détail sont ajoutés avec data-offer-id
   pour être branchés par la page appelante. */
function renderOffers(list, offres, { afficherMatch = true, offresPostuleesIds = new Set(), detailLinkPrefix = "" } = {}) {
  if (!offres.length) {
    list.innerHTML = `<div class="empty-state"><h3>Aucune offre ne correspond</h3><p>Essayez d'élargir vos filtres.</p></div>`;
    return;
  }
  list.innerHTML = offres.map((o) => {
    const expiree = offreExpiree(o);
    return `
    <div class="offer-card">
      <div class="offer-top">
        <div>
          <h3 style="margin-bottom:2px"><a href="${detailLinkPrefix}offre-detail.html?id=${o.id}" style="color:inherit; text-decoration:none;">${o.titre}</a></h3>
          <p style="margin:0">${o.entrepriseNom || ""}</p>
        </div>
        ${afficherMatch && typeof o.matchScore === "number"
          ? `<span class="offer-match">${o.matchScore}% compatible</span>`
          : ""}
      </div>
      <div class="tag-row">
        ${(o.competences || []).slice(0, 3).map((c) => `<span class="tag">${c}</span>`).join("")}
        <span class="tag">${labelContrat(o.typeContrat)}</span>
        ${o.niveauRequis ? `<span class="tag">${labelNiveau(o.niveauRequis)}</span>` : ""}
        ${expiree ? `<span class="tag" style="background:var(--danger-bg); color:var(--danger); border-color:var(--danger-bg);">Candidatures closes</span>`
          : o.dateLimite ? `<span class="tag">Avant le ${new Date(o.dateLimite + "T00:00:00").toLocaleDateString("fr-FR")}</span>` : ""}
      </div>
      <div class="tag-row">
        <a href="${detailLinkPrefix}offre-detail.html?id=${o.id}" class="btn btn-ghost btn-sm">Détails</a>
        ${expiree
          ? `<button class="btn btn-ghost btn-sm" disabled>Candidatures closes</button>`
          : offresPostuleesIds.has(o.id)
            ? `<button class="btn btn-ghost btn-sm" disabled>✓ Déjà postulé</button>`
            : `<button class="btn btn-primary btn-sm" data-postuler="${o.id}">Postuler</button>`}
      </div>
    </div>
  `;
  }).join("");
}

function labelContrat(t) {
  return { stage: "Stage", cdd: "CDD", cdi: "CDI" }[t] || "Stage / CDD / CDI";
}

function labelNiveau(n) {
  return {
    bac2: "Bac+2", licence: "Licence (Bac+3)",
    master1: "Master 1 (Bac+4)", master2: "Master 2 (Bac+5)",
    ingenieur: "Ingénieur / Grande école",
  }[n] || "Tous niveaux";
}

/** Une offre sans dateLimite reste ouverte indéfiniment. */
function offreExpiree(o) {
  if (!o.dateLimite) return false;
  const limite = new Date(o.dateLimite + "T23:59:59");
  return limite.getTime() < Date.now();
}
