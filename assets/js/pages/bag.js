import { card, metric, pageHeader, sourceBadge } from "../components/ui.js";
import { canonicalClub } from "../core/importers.js";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const meters = value => Number.isFinite(Number(value))
  ? `${Math.round(Number(value))} m`
  : "–";

const equipmentTitle = (profileClub, fallback) => profileClub
  ? [
      profileClub.club,
      [profileClub.brand, profileClub.model].filter(Boolean).join(" ")
    ].filter(Boolean).join(" · ")
  : fallback;

function matchClubs(trackmanClubs, profileBag) {
  const profileById = new Map(
    profileBag.map(item => [
      item.clubId || canonicalClub(item.club).clubId,
      item
    ])
  );
  const used = new Set();
  const clubs = trackmanClubs.map((club, originalIndex) => {
    const canonical = canonicalClub(club.clubId || club.name);
    const profileClub = profileById.get(canonical.clubId) || null;
    if (profileClub) used.add(canonical.clubId);
    return {
      ...club,
      clubId: canonical.clubId,
      canonicalName: canonical.name,
      profileClub,
      originalIndex,
      name: equipmentTitle(profileClub, canonical.name),
      trackmanName: (club.rawNames || [club.name]).join(", ")
    };
  });
  return {
    clubs,
    matched: clubs.filter(club => club.profileClub),
    trackmanOnly: clubs.filter(club => !club.profileClub),
    profileOnly: profileBag.filter(item =>
      !used.has(item.clubId || canonicalClub(item.club).clubId)
    )
  };
}

function matchStatus(match) {
  return card(`
    <h2 class="card-title">Matchstatus</h2>
    <div class="metric-grid metric-grid--3">
      ${metric("Matchet", match.matched.length)}
      ${metric("Kun TrackMan", match.trackmanOnly.length)}
      ${metric("Uden TrackMan", match.profileOnly.length)}
    </div>
    <button class="button button--outline button--full" data-page="profile" type="button">
      Rediger Min Bag
    </button>
  `);
}

function distanceLadder(clubs) {
  const maxCarry = Math.max(...clubs.map(club => Number(club.carry)), 1);
  return `
    <div class="distance-ladder">
      ${clubs.map(club => {
        const clubName = club.profileClub?.club || club.canonicalName;
        const equipment = club.profileClub
          ? [club.profileClub.brand, club.profileClub.model].filter(Boolean).join(" ")
          : "";
        return `
          <button class="distance-ladder__row" data-club="${club.originalIndex}" type="button">
            <span class="distance-ladder__identity">
              <strong>${escapeHtml(clubName)}</strong>
              ${equipment ? `<small>${escapeHtml(equipment)}</small>` : ""}
            </span>
            <span class="distance-ladder__track">
              <span class="distance-ladder__bar" style="width:${Math.max(10, Number(club.carry) / maxCarry * 100)}%"></span>
            </span>
            <strong class="distance-ladder__value">${meters(club.carry)}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function clubNavigator(clubs, selectedIndex) {
  return `
    <div class="club-navigator" aria-label="Vælg kølle">
      <div class="club-navigator__controls">
        <button id="previousClub" class="button button--outline club-navigator__arrow" type="button" ${selectedIndex === 0 ? "disabled" : ""} aria-label="Forrige kølle">‹</button>
        <div class="club-navigator__position">
          <strong>${selectedIndex + 1} af ${clubs.length}</strong>
          <span>Swipe eller vælg en kølle</span>
        </div>
        <button id="nextClub" class="button button--outline club-navigator__arrow" type="button" ${selectedIndex === clubs.length - 1 ? "disabled" : ""} aria-label="Næste kølle">›</button>
      </div>
      <div class="club-navigator__tabs" data-club-tabs>
        ${clubs.map((club, index) => `
          <button class="club-nav-tab ${index === selectedIndex ? "club-nav-tab--active" : ""}" data-club="${club.originalIndex}" type="button" aria-current="${index === selectedIndex ? "true" : "false"}">
            <strong>${escapeHtml(club.profileClub?.club || club.canonicalName)}</strong>
            <span>${meters(club.carry)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function bindSwipeNavigation() {
  const detail = document.querySelector("[data-club-detail]");
  if (!detail || detail.dataset.swipeBound === "true") return;
  detail.dataset.swipeBound = "true";
  let startX = null;
  let startY = null;

  detail.addEventListener("touchstart", event => {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  detail.addEventListener("touchend", event => {
    if (startX === null || startY === null) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) document.getElementById("nextClub")?.click();
    else document.getElementById("previousClub")?.click();
  }, { passive: true });

  const activeTab = document.querySelector(".club-nav-tab--active");
  activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function bagStyles() {
  return `
    <style>
      .distance-ladder{display:grid;gap:10px}
      .distance-ladder__row{display:grid;grid-template-columns:minmax(260px,1.8fr) minmax(180px,2.5fr) 90px;align-items:center;gap:24px;width:100%;padding:15px 17px;border:1px solid var(--color-border);border-radius:14px;background:#fff;text-align:left}
      .distance-ladder__identity{display:grid;gap:6px;min-width:0;padding-right:12px}
      .distance-ladder__identity strong{font-size:15px;line-height:1.3}
      .distance-ladder__identity small{color:var(--color-muted);font-size:12px;line-height:1.4;white-space:normal}
      .distance-ladder__track{display:block;height:8px;border-radius:999px;background:#e8eef0;overflow:hidden}
      .distance-ladder__bar{display:block;height:100%;border-radius:inherit;background:var(--color-primary-700)}
      .distance-ladder__value{min-width:90px;text-align:right;font-size:16px}
      .gap-list{display:grid;gap:10px}
      .gap-row{display:grid;grid-template-columns:minmax(0,1fr) 90px;align-items:center;gap:24px;padding:15px 17px;border:1px solid var(--color-border);border-radius:14px;background:#fff}
      .gap-row__identity{display:grid;gap:7px;min-width:0;padding-right:12px}
      .gap-row__identity strong{line-height:1.4}
      .gap-row__identity .text-muted{display:block;line-height:1.4}
      .gap-row__value{min-width:90px;text-align:right;font-size:16px}
      .club-detail-card{touch-action:pan-y}
      .club-detail__equipment{display:grid;gap:4px;margin:-2px 0 18px;color:var(--color-muted)}
      .club-detail__equipment strong{color:var(--color-text);font-size:15px}
      .club-navigator{display:grid;gap:13px;margin-top:18px;padding-top:17px;border-top:1px solid var(--color-border)}
      .club-navigator__controls{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:12px}
      .club-navigator__arrow{width:48px;height:44px;padding:0;font-size:26px}
      .club-navigator__position{display:grid;place-items:center;gap:2px;text-align:center}
      .club-navigator__position span{color:var(--color-muted);font-size:11px}
      .club-navigator__tabs{display:flex;gap:9px;overflow-x:auto;padding:3px 2px 10px;scroll-snap-type:x mandatory;scrollbar-width:thin;overscroll-behavior-x:contain}
      .club-nav-tab{flex:0 0 auto;min-width:96px;padding:10px 12px;border:1px solid var(--color-border);border-radius:13px;background:#fff;color:var(--color-text);text-align:left;scroll-snap-align:center}
      .club-nav-tab strong,.club-nav-tab span{display:block}
      .club-nav-tab span{margin-top:4px;color:var(--color-muted);font-size:11px}
      .club-nav-tab--active{border-color:var(--color-primary-700);background:#ecfdf5;box-shadow:0 0 0 2px rgba(4,120,87,.08)}

      @media(max-width:700px){
        .distance-ladder__row{grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px}
        .distance-ladder__identity{padding-right:8px}
        .distance-ladder__track{grid-column:1/-1}
        .distance-ladder__value{grid-column:2;grid-row:1;min-width:64px}
        .gap-row{grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px}
        .gap-row__identity{padding-right:6px}
        .gap-row__value{min-width:60px}
        .club-navigator__controls{grid-template-columns:44px 1fr 44px;gap:8px}
        .club-navigator__arrow{width:44px;height:42px}
        .club-nav-tab{min-width:88px}
      }
    </style>
  `;
}

export function bagPage(state) {
  const trackmanClubs = Array.isArray(state.clubs) ? state.clubs : [];
  const profileBag = Array.isArray(state.profile?.bag) ? state.profile.bag : [];
  const match = matchClubs(trackmanClubs, profileBag);
  const clubs = [...match.clubs].sort((a, b) => Number(b.carry) - Number(a.carry));
  const gaps = clubs.slice(0, -1).map((from, index) => ({
    from,
    to: clubs[index + 1],
    gap: Number(from.carry) - Number(clubs[index + 1].carry)
  }));

  const selectedOriginalIndex = Math.min(
    Math.max(0, Number(state.clubIndex || 0)),
    Math.max(0, match.clubs.length - 1)
  );
  const selected = match.clubs[selectedOriginalIndex];
  const selectedSortedIndex = Math.max(0, clubs.findIndex(club => club.originalIndex === selectedOriginalIndex));

  queueMicrotask(bindSwipeNavigation);

  return `
    ${bagStyles()}
    <div class="page bag-cockpit">
      ${pageHeader("TRACKMAN BAG INTELLIGENCE", "Bag IQ", "Danske køllenavne matchet via faste kølle-ID'er.")}
      ${matchStatus(match)}
      ${clubs.length ? card(`
        <p class="eyebrow">AFSTANDSDÆKNING</p>
        <h2 class="card-title">Distance Ladder</h2>
        ${distanceLadder(clubs)}
      `) : ""}
      ${gaps.length ? card(`
        <p class="eyebrow">GAP-ANALYSE</p>
        <h2 class="card-title">Afstand mellem køller</h2>
        <div class="gap-list">
          ${gaps.map(item => `
            <div class="gap-row">
              <div class="gap-row__identity">
                <strong>${escapeHtml(item.from.name)} → ${escapeHtml(item.to.name)}</strong>
                <span class="text-muted">${meters(item.from.carry)} → ${meters(item.to.carry)}</span>
              </div>
              <strong class="gap-row__value">${meters(item.gap)}</strong>
            </div>
          `).join("")}
        </div>
      `) : ""}
      ${selected ? card(`
        <div class="club-detail-card" data-club-detail>
          <div class="section-heading">
            <div>
              <p class="eyebrow">KØLLEDETALJER</p>
              <h2 class="card-title">${escapeHtml(selected.profileClub?.club || selected.canonicalName)}</h2>
            </div>
            ${sourceBadge("TrackMan")}
          </div>
          ${selected.profileClub ? `
            <div class="club-detail__equipment">
              <strong>${escapeHtml([selected.profileClub.brand, selected.profileClub.model].filter(Boolean).join(" ") || "Udstyr ikke angivet")}</strong>
              <span>${selected.profileClub.loft != null ? `${selected.profileClub.loft}°` : "Loft ikke angivet"}${selected.profileClub.year ? ` · ${escapeHtml(selected.profileClub.year)}` : ""}</span>
            </div>
          ` : ""}
          <div class="metric-grid metric-grid--3">
            ${metric("Carry", meters(selected.carry))}
            ${metric("Total", meters(selected.total))}
            ${metric("Spredning", meters(selected.dispersion))}
          </div>
          <div class="metric-grid metric-grid--3">
            ${metric("Slag", selected.shots || 0)}
            ${metric("Benchmark", meters(selected.benchmark))}
            ${metric("TrackMan-navn", escapeHtml(selected.trackmanName))}
          </div>
          ${clubNavigator(clubs, selectedSortedIndex)}
        </div>
      `, false, "club-detail-shell") : ""}
    </div>
  `;
}
