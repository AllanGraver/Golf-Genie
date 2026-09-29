import { card, metric, pageHeader, sourceBadge } from "../components/ui.js";
import { canonicalClub } from "../core/importers.js";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const meters = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value))} m` : "–";
const equipmentTitle = (profileClub, fallback) => profileClub
  ? [profileClub.club, [profileClub.brand, profileClub.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ")
  : fallback;

function matchClubs(trackmanClubs, profileBag) {
  const profileById = new Map(profileBag.map(item => [item.clubId || canonicalClub(item.club).clubId, item]));
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
    profileOnly: profileBag.filter(item => !used.has(item.clubId || canonicalClub(item.club).clubId))
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
    <button class="button button--outline button--full" data-page="profile" type="button">Rediger Min Bag</button>
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

      @media(max-width:700px){
        .distance-ladder__row{grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px}
        .distance-ladder__identity{padding-right:8px}
        .distance-ladder__track{grid-column:1/-1}
        .distance-ladder__value{grid-column:2;grid-row:1;min-width:64px}
        .gap-row{grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px}
        .gap-row__identity{padding-right:6px}
        .gap-row__value{min-width:60px}
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
  const selectedIndex = Math.min(Math.max(0, Number(state.clubIndex || 0)), Math.max(0, match.clubs.length - 1));
  const selected = match.clubs[selectedIndex];

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
        <div class="section-heading">
          <h2 class="card-title">${escapeHtml(selected.name)}</h2>
          ${sourceBadge("TrackMan")}
        </div>
        <div class="metric-grid metric-grid--3">
          ${metric("Carry", meters(selected.carry))}
          ${metric("Total", meters(selected.total))}
          ${metric("Spredning", meters(selected.dispersion))}
        </div>
      `) : ""}
    </div>
  `;
}
