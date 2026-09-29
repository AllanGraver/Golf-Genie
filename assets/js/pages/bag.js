import { card, metric, pageHeader, sourceBadge } from "../components/ui.js";
import { canonicalClub } from "../core/importers.js";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const finite = value => Number.isFinite(Number(value));
const meters = value => finite(value) ? `${Math.round(Number(value))} m` : "–";
const signedMeters = value => finite(value)
  ? `${Number(value) > 0 ? "+" : ""}${Math.round(Number(value))} m`
  : "–";
const degrees = value => finite(value) ? `${Number(value).toFixed(1).replace(".", ",")}°` : "–";
const rpm = value => finite(value) ? `${Math.round(Number(value))} rpm` : "–";
const decimal = (value, digits = 2) => finite(value)
  ? Number(value).toFixed(digits).replace(".", ",")
  : "–";

function matchClubs(trackmanClubs, profileBag) {
  const profileById = new Map(profileBag.map(item => [
    item.clubId || canonicalClub(item.club).clubId,
    item
  ]));
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
      name: profileClub
        ? [profileClub.club, [profileClub.brand, profileClub.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ")
        : canonical.name
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
    <button class="button button--outline button--full" data-page="profile" type="button">Rediger Min Bag</button>
  `);
}

function distanceLadder(clubs) {
  const maxCarry = Math.max(...clubs.map(club => Number(club.carry)), 1);
  return `<div class="distance-ladder">${clubs.map(club => {
    const name = club.profileClub?.club || club.canonicalName;
    const equipment = club.profileClub
      ? [club.profileClub.brand, club.profileClub.model].filter(Boolean).join(" ")
      : "";
    return `<button class="distance-ladder__row" data-club="${club.originalIndex}" type="button">
      <span class="distance-ladder__identity"><strong>${escapeHtml(name)}</strong>${equipment ? `<small>${escapeHtml(equipment)}</small>` : ""}</span>
      <span class="distance-ladder__track"><span class="distance-ladder__bar" style="width:${Math.max(10, Number(club.carry) / maxCarry * 100)}%"></span></span>
      <strong class="distance-ladder__value">${meters(club.carry)}</strong>
    </button>`;
  }).join("")}</div>`;
}

function clubNavigator(clubs, selectedIndex) {
  return `<div class="club-navigator">
    <div class="club-navigator__controls">
      <button id="previousClub" class="button button--outline club-navigator__arrow" type="button" ${selectedIndex === 0 ? "disabled" : ""}>‹</button>
      <div class="club-navigator__position"><strong>${selectedIndex + 1} af ${clubs.length}</strong><span>Swipe eller vælg en kølle</span></div>
      <button id="nextClub" class="button button--outline club-navigator__arrow" type="button" ${selectedIndex === clubs.length - 1 ? "disabled" : ""}>›</button>
    </div>
    <div class="club-navigator__tabs">${clubs.map((club, index) => `
      <button class="club-nav-tab ${index === selectedIndex ? "club-nav-tab--active" : ""}" data-club="${club.originalIndex}" type="button">
        <strong>${escapeHtml(club.profileClub?.club || club.canonicalName)}</strong><span>${meters(club.carry)}</span>
      </button>`).join("")}</div>
  </div>`;
}

function dataQuality(club) {
  if (club.dataQuality === "strong") return { label: "Stærkt datagrundlag", tone: "good", text: `${club.shots} slag giver et solidt aktuelt billede.` };
  if (club.dataQuality === "usable") return { label: "Brugbart datagrundlag", tone: "watch", text: `${club.shots} slag kan bruges, men flere slag vil gøre vurderingen stærkere.` };
  return { label: "Begrænset datagrundlag", tone: "alert", text: `Kun ${club.shots || 0} slag. Brug anbefalingerne med forsigtighed.` };
}

function trendInfo(club) {
  const previous = club.previous;
  if (!previous || !finite(previous.carry)) return null;
  const carryDelta = Number(club.carry) - Number(previous.carry);
  const dispersionDelta = finite(previous.dispersion)
    ? Number(club.dispersion) - Number(previous.dispersion)
    : null;
  const improved = (Math.abs(carryDelta) <= 3 || carryDelta > 0) &&
    (!finite(dispersionDelta) || dispersionDelta <= 0);
  const worsened = carryDelta < -3 || (finite(dispersionDelta) && dispersionDelta > 3);
  return {
    tone: worsened ? "alert" : improved ? "good" : "watch",
    label: worsened ? "Udvikling kræver opmærksomhed" : improved ? "Positiv udvikling" : "Stabil udvikling",
    carryDelta,
    dispersionDelta
  };
}

function nextGapFor(clubs, selectedIndex) {
  const selected = clubs[selectedIndex];
  const next = clubs[selectedIndex + 1];
  if (!selected || !next) return null;
  return {
    value: Number(selected.carry) - Number(next.carry),
    nextName: next.profileClub?.club || next.canonicalName
  };
}

function buildInsight(club, clubs, selectedIndex) {
  const quality = dataQuality(club);
  const trend = trendInfo(club);
  const gap = nextGapFor(clubs, selectedIndex);
  const isDriver = club.clubId === "driver";
  const isIron = club.clubId.startsWith("iron-");
  const isWedge = club.clubId.startsWith("wedge-");
  const dispersion = Number(club.dispersion);
  const carry = Number(club.carry);

  const notices = [];
  notices.push({
    tone: quality.tone,
    title: quality.label,
    text: quality.text
  });

  if (finite(carry) && finite(dispersion)) {
    notices.push({
      tone: dispersion <= 12 ? "good" : dispersion <= 20 ? "watch" : "alert",
      title: dispersion <= 12 ? "Forudsigelig målzone" : dispersion <= 20 ? "Indbyg sikkerhedsmargin" : "Stor lateral fejlmargin",
      text: `Planlæg med cirka ${Math.round(carry)} m carry og en lateral sikkerhedszone på omtrent ±${Math.round(dispersion)} m.`
    });
  }

  if (gap) {
    notices.push({
      tone: gap.value >= 8 && gap.value <= 17 ? "good" : "watch",
      title: gap.value >= 8 && gap.value <= 17 ? "Brugbart carry-gap" : "Vær opmærksom på carry-gap",
      text: `Der er ${Math.round(gap.value)} m ned til ${escapeHtml(gap.nextName)}. Træn et kontrolleret mellem-slag, hvis dette gap ofte opstår på banen.`
    });
  }

  if (finite(club.spinRate)) {
    notices.push({
      tone: "neutral",
      title: "Spin og landing",
      text: isWedge || isIron
        ? `Aktuel median er ${Math.round(club.spinRate)} rpm. Brug tallet sammen med landingsvinkel og carry til at vurdere, hvor hurtigt bolden forventes at stoppe.`
        : `Aktuel median er ${Math.round(club.spinRate)} rpm. Vurder spin sammen med launch og carry frem for som et enkeltstående facit.`
    });
  }

  if (finite(club.attackAngle)) {
    const appropriate = isDriver ? club.attackAngle > 0 : isIron || isWedge ? club.attackAngle < 0 : true;
    notices.push({
      tone: appropriate ? "good" : "watch",
      title: "Angrebsvinkel",
      text: isDriver
        ? `${degrees(club.attackAngle)}. En positiv værdi betyder, at køllen bevæger sig opad ved træffet.`
        : `${degrees(club.attackAngle)}. For jern og wedges viser en negativ værdi et nedadgående træf.`
    });
  }

  if (finite(club.smashFactor)) {
    notices.push({
      tone: isDriver && club.smashFactor >= 1.46 ? "good" : "neutral",
      title: "Træfeffektivitet",
      text: `Smash factor er ${decimal(club.smashFactor)}. Følg især udviklingen mod din egen tidligere måling og vurder den sammen med carry og spredning.`
    });
  }

  if (trend) {
    const dispersionText = finite(trend.dispersionDelta)
      ? ` og spredningen ${trend.dispersionDelta <= 0 ? "er reduceret med" : "er øget med"} ${Math.abs(Math.round(trend.dispersionDelta))} m`
      : "";
    notices.unshift({
      tone: trend.tone,
      title: trend.label,
      text: `Carry har flyttet sig ${signedMeters(trend.carryDelta)} siden forrige import${dispersionText}.`
    });
  }

  return notices;
}

function renderInsights(club, clubs, selectedIndex) {
  return `<div class="bag-insights">
    <div class="section-heading"><div><p class="eyebrow">BAG IQ VEJLEDNING</p><h3 class="card-title">Sådan kan data bruges på banen</h3></div></div>
    ${buildInsight(club, clubs, selectedIndex).map(item => `
      <div class="bag-insight bag-insight--${item.tone}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${item.text}</p>
      </div>`).join("")}
    <p class="bag-insight__note">Vejledningen er datadrevet og opdateres ved hver ny TrackMan-import. Den er et course-management-værktøj, ikke en erstatning for professionel fitting eller trænerfeedback.</p>
  </div>`;
}

function bindSwipeNavigation() {
  const detail = document.querySelector("[data-club-detail]");
  if (!detail || detail.dataset.swipeBound === "true") return;
  detail.dataset.swipeBound = "true";
  let startX = null;
  let startY = null;
  detail.addEventListener("touchstart", event => {
    startX = event.changedTouches[0].clientX;
    startY = event.changedTouches[0].clientY;
  }, { passive: true });
  detail.addEventListener("touchend", event => {
    if (startX === null || startY === null) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    const deltaY = event.changedTouches[0].clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    document.getElementById(deltaX < 0 ? "nextClub" : "previousClub")?.click();
  }, { passive: true });
  document.querySelector(".club-nav-tab--active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function styles() {
  return `<style>
    .distance-ladder{display:grid;gap:10px}.distance-ladder__row{display:grid;grid-template-columns:minmax(260px,1.8fr) minmax(180px,2.5fr) 90px;align-items:center;gap:24px;width:100%;padding:15px 17px;border:1px solid var(--color-border);border-radius:14px;background:#fff;text-align:left}.distance-ladder__identity{display:grid;gap:6px;min-width:0;padding-right:12px}.distance-ladder__identity small{color:var(--color-muted);font-size:12px}.distance-ladder__track{height:8px;border-radius:999px;background:#e8eef0;overflow:hidden}.distance-ladder__bar{display:block;height:100%;background:var(--color-primary-700)}.distance-ladder__value{min-width:90px;text-align:right}.gap-list{display:grid;gap:10px}.gap-row{display:grid;grid-template-columns:1fr 90px;gap:24px;align-items:center;padding:15px 17px;border:1px solid var(--color-border);border-radius:14px}.gap-row__identity{display:grid;gap:7px}.gap-row__identity .text-muted{display:block}.gap-row__value{text-align:right}.club-detail__equipment{display:grid;gap:4px;margin:0 0 18px}.club-detail__equipment span{color:var(--color-muted)}.club-navigator{display:grid;gap:13px;margin-top:18px;padding-top:17px;border-top:1px solid var(--color-border)}.club-navigator__controls{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:12px}.club-navigator__arrow{height:44px;padding:0;font-size:26px}.club-navigator__position{display:grid;place-items:center;gap:2px}.club-navigator__position span{color:var(--color-muted);font-size:11px}.club-navigator__tabs{display:flex;gap:9px;overflow-x:auto;padding:3px 2px 10px;scroll-snap-type:x mandatory}.club-nav-tab{flex:0 0 auto;min-width:96px;padding:10px 12px;border:1px solid var(--color-border);border-radius:13px;background:#fff;text-align:left;scroll-snap-align:center}.club-nav-tab strong,.club-nav-tab span{display:block}.club-nav-tab span{margin-top:4px;color:var(--color-muted);font-size:11px}.club-nav-tab--active{border-color:var(--color-primary-700);background:#ecfdf5}.bag-insights{display:grid;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid var(--color-border)}.bag-insight{padding:13px 15px;border-left:4px solid #94a3b8;border-radius:12px;background:#f8fafc}.bag-insight strong{display:block;margin-bottom:5px}.bag-insight p{margin:0;color:var(--color-muted);line-height:1.5}.bag-insight--good{border-color:#16a34a;background:#f0fdf4}.bag-insight--watch{border-color:#f59e0b;background:#fffbeb}.bag-insight--alert{border-color:#e11d48;background:#fff1f2}.bag-insight--neutral{border-color:#0ea5e9;background:#f0f9ff}.bag-insight__note{margin:2px 0 0;color:var(--color-muted);font-size:11px;line-height:1.5}
    @media(max-width:700px){.distance-ladder__row{grid-template-columns:1fr auto;gap:10px;padding:12px}.distance-ladder__track{grid-column:1/-1}.distance-ladder__value{grid-column:2;grid-row:1;min-width:64px}.gap-row{grid-template-columns:1fr auto;gap:12px;padding:12px}.club-navigator__controls{grid-template-columns:44px 1fr 44px}.club-nav-tab{min-width:88px}}
  </style>`;
}

export function bagPage(state) {
  const trackmanClubs = Array.isArray(state.clubs) ? state.clubs : [];
  const profileBag = Array.isArray(state.profile?.bag) ? state.profile.bag : [];
  const match = matchClubs(trackmanClubs, profileBag);
  const clubs = [...match.clubs].sort((a, b) => Number(b.carry) - Number(a.carry));
  const gaps = clubs.slice(0, -1).map((from, index) => ({ from, to: clubs[index + 1], gap: Number(from.carry) - Number(clubs[index + 1].carry) }));
  const selectedOriginalIndex = Math.min(Math.max(0, Number(state.clubIndex || 0)), Math.max(0, match.clubs.length - 1));
  const selected = match.clubs[selectedOriginalIndex];
  const selectedSortedIndex = Math.max(0, clubs.findIndex(club => club.originalIndex === selectedOriginalIndex));
  queueMicrotask(bindSwipeNavigation);

  return `${styles()}<div class="page bag-cockpit">
    ${pageHeader("TRACKMAN BAG INTELLIGENCE", "Bag IQ", "Course management, længdekontrol og udvikling på samme side.")}
    ${matchStatus(match)}
    ${clubs.length ? card(`<p class="eyebrow">AFSTANDSDÆKNING</p><h2 class="card-title">Distance Ladder</h2>${distanceLadder(clubs)}`) : ""}
    ${gaps.length ? card(`<p class="eyebrow">GAP-ANALYSE</p><h2 class="card-title">Afstand mellem køller</h2><div class="gap-list">${gaps.map(item => `<div class="gap-row"><div class="gap-row__identity"><strong>${escapeHtml(item.from.name)} → ${escapeHtml(item.to.name)}</strong><span class="text-muted">${meters(item.from.carry)} → ${meters(item.to.carry)}</span></div><strong class="gap-row__value">${meters(item.gap)}</strong></div>`).join("")}</div>`) : ""}
    ${selected ? card(`<div data-club-detail>
      <div class="section-heading"><div><p class="eyebrow">KØLLEDETALJER</p><h2 class="card-title">${escapeHtml(selected.profileClub?.club || selected.canonicalName)}</h2></div>${sourceBadge("TrackMan")}</div>
      ${selected.profileClub ? `<div class="club-detail__equipment"><strong>${escapeHtml([selected.profileClub.brand, selected.profileClub.model].filter(Boolean).join(" ") || "Udstyr ikke angivet")}</strong><span>${selected.profileClub.loft != null ? `${selected.profileClub.loft}°` : "Loft ikke angivet"}${selected.profileClub.year ? ` · ${escapeHtml(selected.profileClub.year)}` : ""}</span></div>` : ""}
      <div class="metric-grid metric-grid--3">${metric("Carry", meters(selected.carry))}${metric("Total", meters(selected.total))}${metric("Spredning", meters(selected.dispersion))}</div>
      <div class="metric-grid metric-grid--3">${metric("Slag", selected.shots || 0)}${metric("Spin", rpm(selected.spinRate))}${metric("Smash", decimal(selected.smashFactor))}</div>
      <div class="metric-grid metric-grid--3">${metric("Angrebsvinkel", degrees(selected.attackAngle))}${metric("Launch", degrees(selected.launchAngle))}${metric("Landingsvinkel", degrees(selected.landingAngle))}</div>
      ${renderInsights(selected, clubs, selectedSortedIndex)}
      ${clubNavigator(clubs, selectedSortedIndex)}
    </div>`, false, "club-detail-shell") : ""}
  </div>`;
}
