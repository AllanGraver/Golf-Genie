import { card, metric, pageHeader, sourceBadge } from "../components/ui.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function average(values) {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function format(value, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${String(Math.round(number * 10) / 10).replace(".", ",")}${suffix}`
    : "–";
}

function percentage(made, possible, fallback) {
  const hit = Number(made);
  const total = Number(possible);
  if (Number.isFinite(hit) && Number.isFinite(total) && total > 0) return (hit / total) * 100;
  const fallbackNumber = Number(fallback);
  return Number.isFinite(fallbackNumber) ? fallbackNumber : null;
}

function recentRounds(rounds, limit = 10) {
  return [...rounds]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, limit);
}

function analyse(rounds, clubs) {
  const recent = recentRounds(rounds);
  const fir = average(recent.map((round) => percentage(round.firMade, round.firPossible, round.fir)));
  const gir = average(recent.map((round) => percentage(round.girMade, round.girPossible, round.gir)));
  const putts = average(recent.map((round) => round.putts));
  const doubles = average(recent.map((round) => round.doubleBogeyPlus));
  const score = average(recent.map((round) => round.score));
  const dispersion = average(clubs.map((club) => club.dispersion));
  const ordered = [...clubs]
    .filter((club) => Number.isFinite(Number(club.carry)))
    .sort((a, b) => Number(b.carry) - Number(a.carry));
  const gaps = ordered.slice(0, -1).map((club, index) => Number(club.carry) - Number(ordered[index + 1].carry));
  const badGaps = gaps.filter((gap) => gap < 7 || gap > 20).length;

  const scores = {
    approach: Math.round(gir == null ? 60 : clamp(gir * 1.7)),
    driving: Math.round(fir == null ? 60 : clamp(fir * 1.5)),
    putting: Math.round(putts == null ? 60 : clamp(100 - Math.max(0, putts - 28) * 6)),
    scoring: Math.round(doubles == null ? 60 : clamp(100 - doubles * 12)),
    distance: Math.round(dispersion == null ? 60 : clamp(110 - dispersion * 2.3)),
    bag: Math.round(gaps.length ? clamp(100 - badGaps * 14) : 60)
  };

  const focus = [
    { title: "Approach-spil", value: `GIR ${format(gir, "%")}`, reason: "Forbedr startretning og carry-kontrol mod green.", score: scores.approach, page: "training" },
    { title: "Driver-kontrol", value: `FIR ${format(fir, "%")}`, reason: "Arbejd med centertræf, tempo og en tydelig fairway-korridor.", score: scores.driving, page: "training" },
    { title: "Putting", value: `${format(putts)} putts`, reason: "Træn startlinje og hastighed fra 2 til 5 meter.", score: scores.putting, page: "training" },
    { title: "Skadesbegrænsning", value: `${format(doubles)} double+`, reason: "Reducer store fejl med konservative mål og et sikkert næste slag.", score: scores.scoring, page: "training" },
    { title: "Længdekontrol", value: `${format(dispersion, " m")} spredning`, reason: "Træn flere længder med samme kølle og et stabilt tempo.", score: scores.distance, page: "training" },
    { title: "Bag-gapping", value: `${badGaps} problematiske gaps`, reason: "Kalibrér mellem-slag omkring de største carry-gaps.", score: scores.bag, page: "bag" }
  ].sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    recent,
    latest: recent[0] || null,
    fir,
    gir,
    putts,
    averageScore: score,
    focus,
    genieScore: Math.round(average(Object.values(scores)) || 0),
    totalShots: clubs.reduce((sum, club) => sum + (Number(club.shots) || 0), 0),
    courses: new Set(rounds.map((round) => round.course || "Ukendt bane")).size
  };
}

function renderFocus(items, hasData) {
  if (!hasData) return `<div class="status status--info">Importér Garmin PNG eller TrackMan CSV for at få personlige fokusområder.</div>`;
  return `<div class="home-focus-list">${items.map((item, index) => `
    <button class="home-focus-item" data-page="${item.page}" type="button">
      <span class="home-focus-item__rank">${index + 1}</span>
      <span class="home-focus-item__content">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.value)}</small>
        <span>${escapeHtml(item.reason)}</span>
      </span>
      <span class="home-focus-item__score">${item.score}/100</span>
    </button>`).join("")}</div>`;
}

function renderGarminPngImport() {
  return card(`
    <div class="section-heading">
      <div>${sourceBadge("Garmin PNG")}<h2 class="card-title">Importér Garmin-runde</h2></div>
    </div>
    <p class="text-muted">Vælg scorekort og statistikbillede fra samme runde. Kontrollér de aflæste oplysninger før import.</p>
    <input id="garminImageFile" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" multiple>
    <button id="garminImageButton" class="button button--upload button--full" type="button">Vælg Garmin-billeder</button>
    <div id="garminImagePreview" class="image-preview-grid" aria-live="polite"></div>
    <button id="readGarminImages" class="button button--accent button--full" type="button" disabled>Læs valgte billeder</button>
    <div id="garminOcrProgress" class="status status--info" role="status" hidden></div>
    <div id="garminReview" class="garmin-review" hidden>
      <h3 class="card-title">Kontrollér den aflæste runde</h3>
      <label for="ocrCourse">Bane</label><input id="ocrCourse" type="text" autocomplete="off">
      <label for="ocrTees">Teested</label><input id="ocrTees" type="text" autocomplete="off">
      <label for="ocrDate">Dato</label><input id="ocrDate" type="date">
      <label for="ocrScore">Score</label><input id="ocrScore" type="number" min="1" max="250">
      <label for="ocrRelativeToPar">Slag i forhold til par</label><input id="ocrRelativeToPar" type="number" min="-30" max="100">
      <div class="metric-grid metric-grid--3">
        <div><label for="ocrFir">FIR %</label><input id="ocrFir" type="number" step="0.1" min="0" max="100"></div>
        <div><label for="ocrGir">GIR %</label><input id="ocrGir" type="number" step="0.1" min="0" max="100"></div>
        <div><label for="ocrPutts">Putts</label><input id="ocrPutts" type="number" min="0" max="100"></div>
      </div>
      <label for="ocrRawText">Aflæst tekst</label><textarea id="ocrRawText" rows="8" readonly></textarea>
      <button id="importGarminOcrRound" class="button button--accent button--full" type="button">Importér runden</button>
    </div>
  `, false, "home-import-card");
}

export function homePage(state) {
  const profile = state.profile || { handicap: 12.7, targetHandicap: 10 };
  const rounds = Array.isArray(state.rounds) ? state.rounds : [];
  const clubs = Array.isArray(state.clubs) ? state.clubs : [];
  const analysis = analyse(rounds, clubs);
  const hasData = rounds.length > 0 || clubs.length > 0;
  const recommendation = analysis.focus[0];

  return `<div class="page home-cockpit">
    ${pageHeader("GOLF GENIE", "Mit Spil", "Din status, vigtigste anbefaling og nyeste datagrundlag.")}
    ${state.status ? `<div class="status status--${escapeHtml(state.status.type)}" role="status">${escapeHtml(state.status.text)}</div>` : ""}

    ${card(`
      <div class="home-score-header">
        <div><p class="eyebrow">GOLF GENIE STATUS</p><div class="kpi">${analysis.genieScore}/100</div><p class="text-muted">Baseret på ${rounds.length} runder og ${clubs.length} køller.</p></div>
        <div class="home-handicap-target"><span>Handicap</span><strong>${format(profile.handicap)}</strong><small>Mål ${format(profile.targetHandicap)}</small></div>
      </div>
      <div class="metric-grid metric-grid--3">${metric("Gns. score", format(analysis.averageScore))}${metric("FIR", format(analysis.fir, "%"))}${metric("GIR", format(analysis.gir, "%"))}</div>
    `, true)}

    ${card(`
      <p class="eyebrow">COACH ANBEFALING</p>
      <h2 class="card-title">${hasData ? escapeHtml(recommendation.title) : "Importér dine første data"}</h2>
      <p>${hasData ? escapeHtml(recommendation.reason) : "Start med Garmin PNG eller TrackMan CSV. Golf Genie prioriterer derefter din træning."}</p>
      ${hasData ? `<p class="text-muted">Aktuel indikator: ${escapeHtml(recommendation.value)}</p>` : ""}
      <button class="button button--accent button--full" data-page="training" type="button">Gå til Coach</button>
    `)}

    ${card(`<p class="eyebrow">PRIORITERING</p><h2 class="card-title">Top 3 fokusområder</h2>${renderFocus(analysis.focus, hasData)}`)}

    ${card(`
      <p class="eyebrow">DATA STATUS</p><h2 class="card-title">Seneste datagrundlag</h2>
      <div class="data-status-grid">
        <div class="data-status-card">${sourceBadge("Garmin PNG")}<strong>${rounds.length} runder</strong><span>${analysis.latest ? `Senest: ${escapeHtml(analysis.latest.date || "Ukendt dato")} · ${escapeHtml(analysis.latest.course || "Ukendt bane")}` : "Ingen Garmin-runder importeret"}</span></div>
        <div class="data-status-card">${sourceBadge("TrackMan")}<strong>${clubs.length} køller</strong><span>${analysis.totalShots ? `${analysis.totalShots} registrerede slag` : "Ingen TrackMan-data importeret"}</span></div>
      </div>
      <div class="metric-grid metric-grid--3">${metric("Baner", analysis.courses)}${metric("Putts", format(analysis.putts))}${metric("Køller", clubs.length)}</div>
    `)}

    ${card(`
      <p class="eyebrow">TRACKMAN</p><h2 class="card-title">Importér TrackMan-data</h2>
      <p class="text-muted">Upload en TrackMan CSV for at opdatere Bag IQ og Coach.</p>
      <button id="trackmanButton" class="button button--upload button--full" type="button">Importér TrackMan CSV</button>
    `)}

    ${renderGarminPngImport()}

    ${card(`<h2 class="card-title">Lokale data</h2><p class="text-muted">Profil, runder og kølledata gemmes lokalt på denne enhed.</p><button id="resetButton" class="button button--outline button--full" type="button">Nulstil lokale data</button>`)}
  </div>`;
}
