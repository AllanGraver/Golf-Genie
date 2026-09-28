import { card, metric, pageHeader, sourceBadge } from "../components/ui.js";
import {
  calculateCoachAnalysis,
  getGolfGenieScore,
  getCoachFocusAreas,
  getPrimaryRecommendation
} from "./training.js";

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function format(value, suffix = "") {
  const n = Number(value);
  return Number.isFinite(n) ? `${String(Math.round(n * 10) / 10).replace(".", ",")}${suffix}` : "–";
}
function scoreClass(value) {
  if (value >= 80) return "strong";
  if (value >= 65) return "steady";
  return "focus";
}
function renderScoreProfile(scores) {
  const rows = [
    ["Driving", scores.driving], ["Approach", scores.approach], ["Putting", scores.putting],
    ["Scoring", scores.scoring], ["Længdekontrol", scores.distance], ["Bag IQ", scores.bag]
  ];
  return `<div class="genie-score-grid">${rows.map(([label,value])=>`
    <div class="genie-score-row genie-score-row--${scoreClass(value)}">
      <div><strong>${escapeHtml(label)}</strong><span>${value}/100</span></div>
      <div class="genie-score-track"><span style="width:${value}%"></span></div>
    </div>`).join("")}</div>`;
}
function renderTopFocus(items) {
  return `<div class="home-focus-list">${items.map((item,index)=>`
    <button class="home-focus-item" data-page="${item.key === "bag" ? "bag" : "training"}" type="button">
      <span class="home-focus-item__rank">${index+1}</span>
      <span class="home-focus-item__content"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.value)}</small><span>${escapeHtml(item.reason)}</span></span>
      <span class="home-focus-item__score">${item.score}/100</span>
    </button>`).join("")}</div>`;
}
function renderGarminPngImport() {
  return card(`
    <div class="section-heading"><div>${sourceBadge("Garmin PNG")}<h2 class="card-title">Importér Garmin-runde</h2></div></div>
    <p class="text-muted">Vælg scorekort og statistikbillede fra samme runde. Kontrollér oplysningerne før import.</p>
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
    </div>`, false, "home-import-card");
}
export function homePage(state) {
  const profile=state.profile||{handicap:12.7,targetHandicap:10};
  const rounds=Array.isArray(state.rounds)?state.rounds:[];
  const clubs=Array.isArray(state.clubs)?state.clubs:[];
  const analysis=calculateCoachAnalysis(rounds,clubs);
  const score=getGolfGenieScore(analysis.scores);
  const focus=getCoachFocusAreas(analysis);
  const recommendation=getPrimaryRecommendation(analysis);
  const hasData=rounds.length>0||clubs.length>0;
  const latest=analysis.latest[0]||null;
  const totalShots=clubs.reduce((sum,club)=>sum+(Number(club.shots)||0),0);
  const courses=new Set(rounds.map(round=>round.course||"Ukendt bane")).size;
  return `<div class="page home-cockpit">
    ${pageHeader("GOLF GENIE","Mit Spil","Din score, højeste prioritet og nyeste datagrundlag.")}
    ${state.status?`<div class="status status--${escapeHtml(state.status.type)}" role="status">${escapeHtml(state.status.text)}</div>`:""}
    ${card(`
      <div class="genie-score-hero">
        <div class="genie-score-ring genie-score-ring--${scoreClass(score)}" style="--score:${score}"><span>${score}</span><small>/100</small></div>
        <div><p class="eyebrow">GOLF GENIE SCORE</p><h2 class="card-title">Din samlede spilprofil</h2><p class="text-muted">Baseret på ${rounds.length} runder og ${clubs.length} køller.</p></div>
        <div class="home-handicap-target"><span>HCP</span><strong>${format(profile.handicap)}</strong><small>Mål ${format(profile.targetHandicap)}</small></div>
      </div>${renderScoreProfile(analysis.scores)}
    `,true)}
    ${card(hasData?`
      <div class="coach-20-heading"><div><p class="eyebrow">UGENS HØJESTE PRIORITET</p><h2 class="card-title">${escapeHtml(recommendation.title)}</h2></div><span class="training-score-badge">${recommendation.score}/100</span></div>
      <p>${escapeHtml(recommendation.reason)}</p>
      <div class="coach-20-grid">
        ${metric("Aktuel indikator",recommendation.value)}${metric("Mål",recommendation.target)}${metric("Anbefalet øvelse",recommendation.drill)}${metric("Træningsmængde",recommendation.sessions)}
      </div>
      <p class="coach-disclaimer">Målet er et praktisk træningsmål beregnet ud fra dine aktuelle data, ikke en garanti for slag- eller handicapforbedring.</p>
      <button class="button button--accent button--full" data-page="training" type="button">Åbn Coach og se øvelsen</button>
    `:`<h2 class="card-title">Importér dine første data</h2><p>Start med Garmin PNG eller TrackMan CSV. Derefter beregner Golf Genie din score og prioritet.</p>`)}
    ${card(`<p class="eyebrow">PRIORITERING</p><h2 class="card-title">Top 3 fokusområder</h2>${hasData?renderTopFocus(focus):'<div class="status status--info">Mangler datagrundlag.</div>'}`)}
    ${card(`<p class="eyebrow">DATA STATUS</p><h2 class="card-title">Seneste datagrundlag</h2><div class="data-status-grid"><div class="data-status-card">${sourceBadge("Garmin PNG")}<strong>${rounds.length} runder</strong><span>${latest?`Senest: ${escapeHtml(latest.date||"Ukendt dato")} · ${escapeHtml(latest.course||"Ukendt bane")}`:"Ingen Garmin-runder"}</span></div><div class="data-status-card">${sourceBadge("TrackMan")}<strong>${clubs.length} køller</strong><span>${totalShots?`${totalShots} registrerede slag`:"Ingen TrackMan-data"}</span></div></div><div class="metric-grid metric-grid--3">${metric("Baner",courses)}${metric("Putts",format(analysis.putts))}${metric("Køller",clubs.length)}</div>`)}
    ${card(`<p class="eyebrow">TRACKMAN</p><h2 class="card-title">Importér TrackMan-data</h2><p class="text-muted">Upload en TrackMan CSV for at opdatere Bag IQ og Coach.</p><button id="trackmanButton" class="button button--upload button--full" type="button">Importér TrackMan CSV</button>`)}
    ${renderGarminPngImport()}
    ${card(`<h2 class="card-title">Lokale data</h2><p class="text-muted">Profil, runder og kølledata gemmes lokalt på denne enhed.</p><button id="resetButton" class="button button--outline button--full" type="button">Nulstil lokale data</button>`)}
  </div>`;
}
