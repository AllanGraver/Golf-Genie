import { loadState, saveState, resetState } from "./core/storage.js";
import { parseCsv, importTrackman } from "./core/importers.js";
import { recognizeGarminImages } from "./core/garmin-ocr.js";
import { homePage } from "./pages/home.js";
import { roundsPage } from "./pages/rounds.js";
import {
  trainingPage,
  bindTrainingDrillCards
} from "./pages/training.js";
import { bagPage } from "./pages/bag.js";

import { profilePage } from "./pages/profile.js";

const NAV = [
  ["home", "⌂", "Mit Spil"],
  ["rounds", "⚑", "Baner"],
  ["training", "◎", "Coach"],
  ["bag", "♧", "Bag IQ"],
  ["profile", "👤", "Profil"]
];

let state = loadState();
state.editRoundId ??= null;
let selectedGarminImages = [];
let previewUrls = [];
let pendingGarminRound = null;

const byId = (id) => document.getElementById(id);
const pages = {
  home: homePage,
  rounds: roundsPage,
  training: trainingPage,
  bag: bagPage,
  profile: profilePage
};
if (!pages[state.page]) state.page = "home";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optionalNumberFromElement(element) {
  if (!element) return null;
  const raw = String(element.value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const optionalNumber = (id) => optionalNumberFromElement(byId(id));

function createRoundId(round) {
  return [
    round.course || "unknown-course",
    round.date || "unknown-date",
    round.score ?? "unknown-score"
  ]
    .join("-")
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRoundId(round, index) {
  return String(round.id || createRoundId({ ...round, score: round.score ?? index }));
}

function findRoundIndex(roundId) {
  return (state.rounds || []).findIndex(
    (round, index) => getRoundId(round, index) === String(roundId)
  );
}

function normalizeCourseName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("da-DK");
}

function setStatus(type, text) {
  state.status = { type, text };
}

function renderHeader() {
  const header = byId("appHeader");
  if (!header) return;
  header.innerHTML = `
    <button class="brand" data-page="home" type="button" aria-label="Gå til forsiden">
      <span class="brand__logo">⚑</span>
      <span>
        <span class="brand__name">GOLF<span>Genie</span></span>
        <span class="brand__tagline">EDITABLE HUB</span>
      </span>
    </button>
    <span class="badge">LOKAL</span>
  `;
}

function renderNav() {
  const markup = (base, active, iconClass) => NAV.map(([page, icon, label]) => `
    <button
      class="${base} ${state.page === page ? active : ""}"
      data-page="${page}"
      type="button"
      aria-current="${state.page === page ? "page" : "false"}"
    >
      ${iconClass ? `<span class="${iconClass}">${icon}</span>` : icon}
      ${label}
    </button>
  `).join("");

  const bottom = byId("bottomNav");
  const side = byId("sideNav");
  if (bottom) bottom.innerHTML = markup("nav-button", "nav-button--active", "nav-button__icon");
  if (side) side.innerHTML = markup("side-button", "side-button--active", "");
}

function bindNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.onclick = () => {
      if (!button.dataset.page) return;
      state.page = button.dataset.page;
      state.editRoundId = null;
      saveState(state);
      render();
    };
  });
}

function bindClubSelection() {
  document.querySelectorAll("[data-club]").forEach((button) => {
    button.onclick = () => {
      const index = Number(button.dataset.club);
      if (!Number.isInteger(index)) return;
      state.clubIndex = index;
      saveState(state);
      render();
    };
  });

  byId("previousClub")?.addEventListener("click", () => {
    state.clubIndex = Math.max(0, Number(state.clubIndex || 0) - 1);
    saveState(state);
    render();
  });

  byId("nextClub")?.addEventListener("click", () => {
    const last = Math.max(0, (state.clubs?.length || 0) - 1);
    state.clubIndex = Math.min(last, Number(state.clubIndex || 0) + 1);
    saveState(state);
    render();
  });
}

function bindImportButtons() {
  byId("trackmanButton")?.addEventListener("click", () => byId("trackmanFile")?.click());
}

function clearPreviews() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
}

function bindResetButton() {
  const button = byId("resetButton");
  if (!button) return;
  button.onclick = () => {
    if (!window.confirm("Vil du nulstille alle lokalt gemte data?")) return;
    clearPreviews();
    selectedGarminImages = [];
    pendingGarminRound = null;
    state = resetState();
    state.editRoundId = null;
    setStatus("success", "Lokale data er nulstillet.");
    saveState(state);
    render();
  };
}

function bindProfileForm() {
  const button = byId("save-profile");
  if (!button) return;
  button.onclick = () => {
    const handicap = optionalNumber("hcp");
    const targetHandicap = optionalNumber("target");
    const age = optionalNumber("age");

    if (handicap === null || handicap < -10 || handicap > 54) {
      window.alert("Indtast et gyldigt handicap mellem -10 og 54.");
      return;
    }
    if (targetHandicap === null || targetHandicap < -10 || targetHandicap > 54) {
      window.alert("Indtast et gyldigt målhandicap mellem -10 og 54.");
      return;
    }
    if (age === null || !Number.isInteger(age) || age < 1 || age > 120) {
      window.alert("Indtast en gyldig alder mellem 1 og 120.");
      return;
    }

    state.profile = {
      handicap,
      targetHandicap,
      homeCourse: byId("course")?.value.trim() || "",
      handedness: byId("handedness")?.value || "Right",
      age
    };
    setStatus("success", "Profilen er gemt.");
    saveState(state);
    render();
  };
}

function bindCourseNotes() {
  document.querySelectorAll(".save-course-note").forEach((button) => {
    button.onclick = () => {
      const course = button.dataset.course;
      const field = button.closest(".card")?.querySelector(".course-note");
      if (!course || !field) return;
      state.courseNotes ??= {};
      const note = field.value.trim();
      if (note) state.courseNotes[course] = note;
      else delete state.courseNotes[course];
      saveState(state);
      render();
    };
  });
}

function readIndexed(form, selector, datasetKey) {
  return Array.from(form.querySelectorAll(selector))
    .sort((a, b) => Number(a.dataset[datasetKey]) - Number(b.dataset[datasetKey]))
    .map(optionalNumberFromElement);
}

function compact(values) {
  return values.some((value) => value !== null) ? values : [];
}

function formRound(form) {
  const field = (name) => form.querySelector(`[data-round-field="${name}"]`);
  return {
    course: field("course")?.value.trim() || "",
    tees: field("tees")?.value.trim() || "",
    date: field("date")?.value || "",
    score: optionalNumberFromElement(field("score")),
    relativeToPar: optionalNumberFromElement(field("relativeToPar")),
    points: optionalNumberFromElement(field("points")),
    frontNine: optionalNumberFromElement(field("frontNine")),
    backNine: optionalNumberFromElement(field("backNine")),
    firMade: optionalNumberFromElement(field("firMade")),
    firPossible: optionalNumberFromElement(field("firPossible")),
    girMade: optionalNumberFromElement(field("girMade")),
    girPossible: optionalNumberFromElement(field("girPossible")),
    putts: optionalNumberFromElement(field("putts")),
    holes: compact(readIndexed(form, "[data-round-hole]", "roundHole")),
    holePars: compact(readIndexed(form, "[data-round-hole-par]", "roundHolePar")),
    holeHandicapStrokes: compact(readIndexed(form, "[data-round-hole-handicap]", "roundHoleHandicap"))
  };
}

function percentage(made, possible, fallback = null) {
  return Number.isFinite(made) && Number.isFinite(possible) && possible > 0
    ? Number(((made / possible) * 100).toFixed(1))
    : fallback;
}

function complete(values) {
  return Array.isArray(values) && values.length === 18 && values.every(Number.isFinite);
}

function enrichRound(round) {
  const result = { ...round };
  result.fir = percentage(result.firMade, result.firPossible, result.fir ?? null);
  result.gir = percentage(result.girMade, result.girPossible, result.gir ?? null);

  if (complete(result.holes)) {
    result.frontNine = result.holes.slice(0, 9).reduce((a, b) => a + b, 0);
    result.backNine = result.holes.slice(9).reduce((a, b) => a + b, 0);
    result.score = result.frontNine + result.backNine;
  }

  if (complete(result.holes) && complete(result.holePars)) {
    const categories = {
      eaglesOrBetter: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeyPlus: 0,
      completedHoles: 18
    };
    result.relativeToPar = result.score - result.holePars.reduce((a, b) => a + b, 0);
    result.holes.forEach((score, index) => {
      const difference = score - result.holePars[index];
      if (difference <= -2) categories.eaglesOrBetter += 1;
      else if (difference === -1) categories.birdies += 1;
      else if (difference === 0) categories.pars += 1;
      else if (difference === 1) categories.bogeys += 1;
      else categories.doubleBogeyPlus += 1;
    });
    Object.assign(result, categories);
  }
  return result;
}

function bindRoundEditing() {
  document.querySelectorAll(".edit-round").forEach((button) => {
    button.onclick = () => {
      state.editRoundId = button.dataset.roundId || null;
      render();
    };
  });

  document.querySelectorAll(".cancel-round-edit").forEach((button) => {
    button.onclick = () => {
      state.editRoundId = null;
      render();
    };
  });

  document.querySelectorAll(".delete-round").forEach((button) => {
    button.onclick = () => {
      const index = findRoundIndex(button.dataset.roundId);
      if (index < 0) return;
      if (!window.confirm("Vil du slette denne runde?")) return;
      state.rounds.splice(index, 1);
      state.editRoundId = null;
      saveState(state);
      render();
    };
  });

  document.querySelectorAll(".save-round-edit").forEach((button) => {
    button.onclick = () => {
      const index = findRoundIndex(button.dataset.roundId);
      const form = button.closest("[data-round-edit-form]");
      if (index < 0 || !form) return;
      const updated = enrichRound({ ...state.rounds[index], ...formRound(form) });
      if (!updated.course || !updated.date || !Number.isFinite(updated.score)) {
        window.alert("Bane, dato og score skal udfyldes.");
        return;
      }
      state.rounds[index] = {
        ...updated,
        id: state.rounds[index].id || createRoundId(updated),
        updatedAt: new Date().toISOString()
      };
      state.editRoundId = null;
      state.rounds.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      saveState(state);
      render();
    };
  });
}

function renderPreviews() {
  const container = byId("garminImagePreview");
  const readButton = byId("readGarminImages");
  if (!container || !readButton) return;
  clearPreviews();
  container.innerHTML = selectedGarminImages.map((file) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    return `<figure class="image-preview"><img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)}"><figcaption>${escapeHtml(file.name)}</figcaption></figure>`;
  }).join("");
  readButton.disabled = selectedGarminImages.length === 0;
}

function populateReview(round) {
  pendingGarminRound = round;
  const values = {
    ocrCourse: round.course || "",
    ocrTees: round.tees || "",
    ocrDate: round.date || "",
    ocrScore: round.score ?? "",
    ocrRelativeToPar: round.relativeToPar ?? "",
    ocrFir: round.fir ?? "",
    ocrGir: round.gir ?? "",
    ocrPutts: round.putts ?? "",
    ocrRawText: round.rawText || ""
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = byId(id);
    if (element) element.value = value;
  });
  const review = byId("garminReview");
  if (review) review.hidden = false;
}

function bindGarminImageImport() {
  const button = byId("garminImageButton");
  const input = byId("garminImageFile");
  const read = byId("readGarminImages");
  const progress = byId("garminOcrProgress");
  if (!button || !input || !read) return;

  button.onclick = () => input.click();
  input.onchange = (event) => {
    selectedGarminImages = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    renderPreviews();
  };
  read.onclick = async () => {
    if (!selectedGarminImages.length) return;
    read.disabled = true;
    if (progress) {
      progress.hidden = false;
      progress.textContent = "Forbereder billedlæsning...";
    }
    try {
      const round = await recognizeGarminImages(selectedGarminImages, (message) => {
        if (progress) progress.textContent = `${message.status || "Læser"} ${Math.round((message.progress || 0) * 100)}%`;
      });
      populateReview(round);
      if (progress) progress.textContent = "Billederne er læst. Kontrollér oplysningerne.";
    } catch (error) {
      if (progress) progress.textContent = error instanceof Error ? error.message : "OCR-fejl";
    } finally {
      read.disabled = false;
    }
  };
}

function duplicateIndex(rounds, candidate) {
  return rounds.findIndex((round) =>
    round.id === candidate.id ||
    (normalizeCourseName(round.course) === normalizeCourseName(candidate.course) &&
      round.date === candidate.date && Number(round.score) === candidate.score)
  );
}

function bindOcrSave() {
  const button = byId("importGarminOcrRound");
  if (!button) return;
  button.onclick = () => {
    const base = {
      course: byId("ocrCourse")?.value.trim() || "",
      tees: byId("ocrTees")?.value.trim() || "",
      date: byId("ocrDate")?.value || "",
      score: optionalNumber("ocrScore"),
      relativeToPar: optionalNumber("ocrRelativeToPar"),
      fir: optionalNumber("ocrFir"),
      gir: optionalNumber("ocrGir"),
      putts: optionalNumber("ocrPutts")
    };
    if (!base.course || !base.date || !Number.isFinite(base.score)) {
      window.alert("Bane, dato og score skal udfyldes.");
      return;
    }
    const round = enrichRound({
      ...pendingGarminRound,
      ...base,
      id: "",
      source: "Garmin PNG",
      importedAt: new Date().toISOString()
    });
    round.id = createRoundId(round);
    state.rounds ??= [];
    const index = duplicateIndex(state.rounds, round);
    if (index >= 0) {
      if (!window.confirm("Runden findes allerede. Vil du erstatte den?")) return;
      state.rounds[index] = round;
    } else state.rounds.push(round);
    state.page = "rounds";
    saveState(state);
    render();
  };
}

function bind() {
  bindNavigation();
  bindClubSelection();
  bindImportButtons();
  bindResetButton();
  bindProfileForm();
  bindCourseNotes();
  bindRoundEditing();
  bindTrainingDrillCards();
  bindGarminImageImport();
  bindOcrSave();
}

function render() {
  renderHeader();
  renderNav();
  const app = byId("app");
  if (!app) return;
  try {
    app.innerHTML = (pages[state.page] || homePage)(state);
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="page"><div class="status status--error">Appen kunne ikke vise siden. Kontrollér konsollen.</div></div>`;
  }
  bind();
}

const trackmanFile = byId("trackmanFile");
if (trackmanFile) {
  trackmanFile.onchange = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      state.clubs = importTrackman(parseCsv(await file.text()), state.clubs || []);
      state.clubIndex = 0;
      setStatus("success", `${state.clubs.length} køller importeret.`);
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : "TrackMan-import mislykkedes.");
    }
    event.target.value = "";
    saveState(state);
    render();
  };
}

render();
