import {
  loadState,
  saveState,
  resetState
} from "./core/storage.js";

import {
  parseCsv,
  importTrackman,
  importGarmin
} from "./core/importers.js";

import {
  recognizeGarminImages
} from "./core/garmin-ocr.js";

import { homePage } from "./pages/home.js";
import { roundsPage } from "./pages/rounds.js";
import { trainingPage } from "./pages/training.js";
import { bagPage } from "./pages/bag.js";
import { dataPage } from "./pages/data.js";
import { profilePage } from "./pages/profile.js";

const NAV = [
  ["home", "⌂", "Home"],
  ["rounds", "⚑", "Runder"],
  ["training", "◎", "Træning"],
  ["bag", "♧", "Bag"],
  ["data", "▦", "Data"],
  ["profile", "👤", "Profil"]
];

let state = loadState();
state.editRoundId ??= null;

let selectedGarminImages = [];
let garminImagePreviewUrls = [];
let pendingGarminRound = null;

const byId = (id) => document.getElementById(id);

const pages = {
  home: homePage,
  rounds: roundsPage,
  training: trainingPage,
  bag: bagPage,
  data: dataPage,
  profile: profilePage
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optionalNumberFromElement(element) {
  if (!element) {
    return null;
  }

  const value = String(element.value ?? "")
    .trim()
    .replace(",", ".");

  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalNumber(id) {
  return optionalNumberFromElement(byId(id));
}

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
  return String(round.id || createRoundId({
    ...round,
    score: round.score ?? index
  }));
}

function findRoundIndex(roundId) {
  return (state.rounds || []).findIndex(
    (round, index) => getRoundId(round, index) === String(roundId)
  );
}

function normalizeCourseName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("da-DK");
}

function clearGarminImagePreviews() {
  garminImagePreviewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });

  garminImagePreviewUrls = [];
}

function setStatus(type, text) {
  state.status = { type, text };
}

function renderHeader() {
  const header = byId("appHeader");

  if (!header) {
    return;
  }

  header.innerHTML = `
    <button
      class="brand"
      data-page="home"
      type="button"
      aria-label="Gå til forsiden"
    >
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
  const bottomNav = byId("bottomNav");
  const sideNav = byId("sideNav");

  const buttons = (className, activeClass, withIconSpan) =>
    NAV.map(([page, icon, label]) => `
      <button
        class="${className} ${state.page === page ? activeClass : ""}"
        data-page="${page}"
        type="button"
        aria-current="${state.page === page ? "page" : "false"}"
      >
        ${withIconSpan ? `<span class="nav-button__icon">${icon}</span>` : icon}
        ${label}
      </button>
    `).join("");

  if (bottomNav) {
    bottomNav.innerHTML = buttons(
      "nav-button",
      "nav-button--active",
      true
    );
  }

  if (sideNav) {
    sideNav.innerHTML = buttons(
      "side-button",
      "side-button--active",
      false
    );
  }
}

function bindNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.onclick = () => {
      const nextPage = button.dataset.page;

      if (!nextPage) {
        return;
      }

      state.page = nextPage;
      state.editRoundId = null;
      saveState(state);
      render();
    };
  });
}

function bindClubSelection() {
  document.querySelectorAll("[data-club]").forEach((button) => {
    button.onclick = () => {
      const clubIndex = Number(button.dataset.club);

      if (!Number.isInteger(clubIndex)) {
        return;
      }

      state.clubIndex = clubIndex;
      saveState(state);
      render();
    };
  });

  const previousClubButton = byId("previousClub");
  const nextClubButton = byId("nextClub");

  if (previousClubButton) {
    previousClubButton.onclick = () => {
      state.clubIndex = Math.max(0, Number(state.clubIndex || 0) - 1);
      saveState(state);
      render();
    };
  }

  if (nextClubButton) {
    nextClubButton.onclick = () => {
      const lastClubIndex = Math.max(0, (state.clubs?.length || 0) - 1);
      state.clubIndex = Math.min(lastClubIndex, Number(state.clubIndex || 0) + 1);
      saveState(state);
      render();
    };
  }
}

function bindImportButtons() {
  byId("trackmanButton")?.addEventListener("click", () => {
    byId("trackmanFile")?.click();
  });

  byId("garminButton")?.addEventListener("click", () => {
    byId("garminFile")?.click();
  });
}

function bindResetButton() {
  const resetButton = byId("resetButton");

  if (!resetButton) {
    return;
  }

  resetButton.onclick = () => {
    const shouldReset = window.confirm(
      "Vil du nulstille alle lokalt gemte data? Importerede runder og banenoter bliver slettet."
    );

    if (!shouldReset) {
      return;
    }

    clearGarminImagePreviews();
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
  const saveProfileButton = byId("save-profile");

  if (!saveProfileButton) {
    return;
  }

  saveProfileButton.onclick = () => {
    const handicap = optionalNumber("hcp");
    const targetHandicap = optionalNumber("target");
    const homeCourse = byId("course")?.value.trim() || "";
    const handedness = byId("handedness")?.value || "Right";
    const age = optionalNumber("age");

    if (handicap === null || handicap < -10 || handicap > 54) {
      window.alert("Indtast et gyldigt handicap mellem -10 og 54.");
      byId("hcp")?.focus();
      return;
    }

    if (
      targetHandicap === null ||
      targetHandicap < -10 ||
      targetHandicap > 54
    ) {
      window.alert("Indtast et gyldigt målhandicap mellem -10 og 54.");
      byId("target")?.focus();
      return;
    }

    if (age === null || !Number.isInteger(age) || age < 1 || age > 120) {
      window.alert("Indtast en gyldig alder mellem 1 og 120.");
      byId("age")?.focus();
      return;
    }

    state.profile = {
      handicap,
      targetHandicap,
      homeCourse,
      handedness,
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
      const cardElement = button.closest(".card");
      const noteField = cardElement?.querySelector(".course-note");

      if (!course || !noteField) {
        return;
      }

      state.courseNotes ??= {};
      const note = noteField.value.trim();

      if (note) {
        state.courseNotes[course] = note;
      } else {
        delete state.courseNotes[course];
      }

      setStatus("success", `Banenoten til ${course} er gemt.`);
      saveState(state);
      render();
    };
  });
}

function readIndexedNumbers(form, selector, datasetKey) {
  return Array.from(form.querySelectorAll(selector))
    .sort(
      (a, b) =>
        Number(a.dataset[datasetKey]) -
        Number(b.dataset[datasetKey])
    )
    .map(optionalNumberFromElement);
}

function compactRoundArray(values) {
  return values.some((value) => value !== null)
    ? values
    : [];
}

function parseRoundEditForm(form) {
  const value = (fieldName) =>
    form.querySelector(`[data-round-field="${fieldName}"]`);

  const holes = readIndexedNumbers(
    form,
    "[data-round-hole]",
    "roundHole"
  );

  const holePars = readIndexedNumbers(
    form,
    "[data-round-hole-par]",
    "roundHolePar"
  );

  const holeHandicapStrokes = readIndexedNumbers(
    form,
    "[data-round-hole-handicap]",
    "roundHoleHandicap"
  );

  return {
    course: value("course")?.value.trim() || "",
    tees: value("tees")?.value.trim() || "",
    date: value("date")?.value || "",
    score: optionalNumberFromElement(value("score")),
    relativeToPar: optionalNumberFromElement(value("relativeToPar")),
    points: optionalNumberFromElement(value("points")),
    frontNine: optionalNumberFromElement(value("frontNine")),
    backNine: optionalNumberFromElement(value("backNine")),
    firMade: optionalNumberFromElement(value("firMade")),
    firPossible: optionalNumberFromElement(value("firPossible")),
    girMade: optionalNumberFromElement(value("girMade")),
    girPossible: optionalNumberFromElement(value("girPossible")),
    putts: optionalNumberFromElement(value("putts")),
    holes: compactRoundArray(holes),
    holePars: compactRoundArray(holePars),
    holeHandicapStrokes: compactRoundArray(holeHandicapStrokes)
  };
}

function calculatePercentage(made, possible, fallback = null) {
  if (
    Number.isFinite(made) &&
    Number.isFinite(possible) &&
    possible > 0
  ) {
    return Number(((made / possible) * 100).toFixed(1));
  }

  return fallback;
}

function completeNumericArray(values, expectedLength = 18) {
  return (
    Array.isArray(values) &&
    values.length === expectedLength &&
    values.every(Number.isFinite)
  );
}

function sumNumbers(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function calculateScoringCategories(holes, holePars) {
  const result = {
    eaglesOrBetter: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeyPlus: 0,
    completedHoles: 0
  };

  for (let index = 0; index < 18; index += 1) {
    const score = Number(holes?.[index]);
    const par = Number(holePars?.[index]);

    if (!Number.isFinite(score) || !Number.isFinite(par)) {
      continue;
    }

    result.completedHoles += 1;
    const difference = score - par;

    if (difference <= -2) {
      result.eaglesOrBetter += 1;
    } else if (difference === -1) {
      result.birdies += 1;
    } else if (difference === 0) {
      result.pars += 1;
    } else if (difference === 1) {
      result.bogeys += 1;
    } else {
      result.doubleBogeyPlus += 1;
    }
  }

  return result;
}

function enrichRoundCalculations(round) {
  const enriched = { ...round };

  enriched.fir = calculatePercentage(
    enriched.firMade,
    enriched.firPossible,
    enriched.fir ?? null
  );

  enriched.gir = calculatePercentage(
    enriched.girMade,
    enriched.girPossible,
    enriched.gir ?? null
  );

  const completeScores = completeNumericArray(enriched.holes);
  const completePars = completeNumericArray(enriched.holePars);

  if (completeScores) {
    enriched.frontNine = sumNumbers(enriched.holes.slice(0, 9));
    enriched.backNine = sumNumbers(enriched.holes.slice(9, 18));
    enriched.score = enriched.frontNine + enriched.backNine;
  }

  if (completeScores && completePars) {
    const totalPar = sumNumbers(enriched.holePars);
    enriched.relativeToPar = enriched.score - totalPar;

    const scoring = calculateScoringCategories(
      enriched.holes,
      enriched.holePars
    );

    Object.assign(enriched, scoring);
  }

  return enriched;
}

function validateEditedRound(round) {
  const errors = [];
  const warnings = [];

  if (!round.course) {
    errors.push("Banens navn skal udfyldes.");
  }

  if (!round.date) {
    errors.push("Datoen skal udfyldes.");
  }

  if (round.score === null || round.score < 1 || round.score > 250) {
    errors.push("Samlet score skal være mellem 1 og 250.");
  }

  if (
    round.firMade !== null &&
    round.firPossible !== null &&
    round.firMade > round.firPossible
  ) {
    errors.push("Ramte fairways kan ikke overstige mulige fairways.");
  }

  if (
    round.girMade !== null &&
    round.girPossible !== null &&
    round.girMade > round.girPossible
  ) {
    errors.push("Ramte greens kan ikke overstige mulige greens.");
  }

  if (round.putts !== null && (round.putts < 0 || round.putts > 100)) {
    errors.push("Putts skal være mellem 0 og 100.");
  }

  const completedScores = (round.holes || []).filter(Number.isFinite);
  const completedPars = (round.holePars || []).filter(Number.isFinite);
  const completedHandicap = (round.holeHandicapStrokes || [])
    .filter(Number.isFinite);

  if (completedScores.length > 0 && completedScores.length !== 18) {
    warnings.push("Hulscorerne er kun delvist udfyldt.");
  }

  if (completedPars.length > 0 && completedPars.length !== 18) {
    warnings.push("Par-værdierne er kun delvist udfyldt.");
  }

  if (completedHandicap.length > 0 && completedHandicap.length !== 18) {
    warnings.push("Handicapslagene er kun delvist udfyldt.");
  }

  if (
    round.frontNine !== null &&
    round.backNine !== null &&
    round.score !== null &&
    round.frontNine + round.backNine !== round.score
  ) {
    warnings.push(
      `Front 9 + Back 9 er ${round.frontNine + round.backNine}, men samlet score er ${round.score}.`
    );
  }

  return { errors, warnings };
}

function showRoundValidation(form, messages, type = "error") {
  const validation = form.querySelector("[data-round-validation]");

  if (!validation) {
    return;
  }

  if (!messages.length) {
    validation.hidden = true;
    validation.innerHTML = "";
    return;
  }

  validation.hidden = false;
  validation.className = `round-edit__validation status status--${type}`;
  validation.innerHTML = `
    <ul>
      ${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}
    </ul>
  `;
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
      const roundId = button.dataset.roundId;
      const roundIndex = findRoundIndex(roundId);

      if (roundIndex < 0) {
        return;
      }

      const round = state.rounds[roundIndex];
      const shouldDelete = window.confirm(
        `Vil du slette runden på ${round.course || "den valgte bane"} fra ${round.date || "ukendt dato"}?`
      );

      if (!shouldDelete) {
        return;
      }

      state.rounds.splice(roundIndex, 1);
      state.editRoundId = null;
      setStatus("success", "Runden er slettet.");
      saveState(state);
      render();
    };
  });

  document.querySelectorAll(".save-round-edit").forEach((button) => {
    button.onclick = () => {
      const roundId = button.dataset.roundId;
      const roundIndex = findRoundIndex(roundId);
      const form = document.querySelector(
        `[data-round-edit-form="${CSS.escape(String(roundId || ""))}"]`
      );

      if (roundIndex < 0 || !form) {
        return;
      }

      const originalRound = state.rounds[roundIndex];
      const editedValues = parseRoundEditForm(form);

      const calculatedValues = enrichRoundCalculations({
        ...originalRound,
        ...editedValues
      });

      const validation = validateEditedRound(calculatedValues);

      if (validation.errors.length) {
        showRoundValidation(form, validation.errors, "error");
        return;
      }

      if (validation.warnings.length) {
        const shouldSave = window.confirm(
          `${validation.warnings.join("\n\n")}\n\nVil du gemme alligevel?`
        );

        if (!shouldSave) {
          showRoundValidation(form, validation.warnings, "info");
          return;
        }
      }

      const updatedRound = {
        ...calculatedValues,
        id: originalRound.id || createRoundId(calculatedValues),
        updatedAt: new Date().toISOString()
      };

      state.rounds[roundIndex] = updatedRound;
      state.rounds.sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      );
      state.editRoundId = null;
      setStatus("success", `Runden på ${updatedRound.course} er opdateret.`);
      saveState(state);
      render();
    };
  });
}

function bindTrainingDrills() {
  document.querySelectorAll(".drill").forEach((button) => {
    button.onclick = () => {
      button.classList.toggle("button--accent");
    };
  });
}

function renderGarminImagePreviews() {
  const preview = byId("garminImagePreview");
  const readButton = byId("readGarminImages");

  if (!preview || !readButton) {
    return;
  }

  clearGarminImagePreviews();

  if (!selectedGarminImages.length) {
    preview.innerHTML = "";
    readButton.disabled = true;
    return;
  }

  preview.innerHTML = selectedGarminImages
    .map((file) => {
      const url = URL.createObjectURL(file);
      garminImagePreviewUrls.push(url);

      return `
        <figure class="image-preview">
          <img
            src="${escapeHtml(url)}"
            alt="Forhåndsvisning af ${escapeHtml(file.name)}"
          >
          <figcaption>${escapeHtml(file.name)}</figcaption>
        </figure>
      `;
    })
    .join("");

  readButton.disabled = false;
}

function populateGarminReview(round) {
  pendingGarminRound = round;

  const assignments = {
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

  Object.entries(assignments).forEach(([id, value]) => {
    const element = byId(id);

    if (element) {
      element.value = value;
    }
  });

  const review = byId("garminReview");

  if (review) {
    review.hidden = false;
    review.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateOcrProgress(progressElement, message) {
  if (!progressElement) {
    return;
  }

  const fileNumber = message.fileIndex || 1;
  const fileCount = message.fileCount || selectedGarminImages.length;
  const percentage = Number.isFinite(message.progress)
    ? Math.round(message.progress * 100)
    : null;
  const status = message.status || "Læser billede";

  progressElement.textContent = percentage === null
    ? `${status} (${fileNumber} af ${fileCount})`
    : `${status}: ${percentage}% (${fileNumber} af ${fileCount})`;
}

function bindGarminImageImport() {
  const imageButton = byId("garminImageButton");
  const fileInput = byId("garminImageFile");
  const readButton = byId("readGarminImages");
  const progress = byId("garminOcrProgress");

  if (!imageButton || !fileInput || !readButton) {
    return;
  }

  imageButton.onclick = () => fileInput.click();

  fileInput.onchange = (event) => {
    selectedGarminImages = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith("image/")
    );

    pendingGarminRound = null;
    renderGarminImagePreviews();

    if (progress) {
      progress.hidden = true;
      progress.textContent = "";
    }

    const review = byId("garminReview");

    if (review) {
      review.hidden = true;
    }
  };

  readButton.onclick = async () => {
    if (!selectedGarminImages.length) {
      return;
    }

    readButton.disabled = true;

    if (progress) {
      progress.hidden = false;
      progress.className = "status status--info";
      progress.textContent = "Forbereder billedlæsning...";
    }

    try {
      const round = await recognizeGarminImages(
        selectedGarminImages,
        (message) => updateOcrProgress(progress, message)
      );

      populateGarminReview(round);

      if (progress) {
        progress.className = "status status--success";
        progress.textContent =
          "Billederne er læst. Kontrollér oplysningerne før import.";
      }
    } catch (error) {
      pendingGarminRound = null;

      if (progress) {
        progress.className = "status status--error";
        progress.textContent = error instanceof Error
          ? error.message
          : "Billederne kunne ikke læses.";
      }
    } finally {
      readButton.disabled = false;
    }
  };
}

function validateOcrRound({ course, date, score, relativeToPar, fir, gir, putts }) {
  if (!course) {
    window.alert("Indtast eller kontrollér banens navn.");
    byId("ocrCourse")?.focus();
    return false;
  }

  if (!date) {
    window.alert("Indtast eller kontrollér datoen.");
    byId("ocrDate")?.focus();
    return false;
  }

  if (score === null || score < 1 || score > 250) {
    window.alert("Indtast en gyldig score.");
    byId("ocrScore")?.focus();
    return false;
  }

  if (relativeToPar !== null && (relativeToPar < -30 || relativeToPar > 100)) {
    window.alert("Resultatet i forhold til par ser ikke gyldigt ud.");
    byId("ocrRelativeToPar")?.focus();
    return false;
  }

  if (fir !== null && (fir < 0 || fir > 100)) {
    window.alert("FIR skal være mellem 0 og 100 procent.");
    byId("ocrFir")?.focus();
    return false;
  }

  if (gir !== null && (gir < 0 || gir > 100)) {
    window.alert("GIR skal være mellem 0 og 100 procent.");
    byId("ocrGir")?.focus();
    return false;
  }

  if (putts !== null && (putts < 0 || putts > 100)) {
    window.alert("Antallet af putts ser ikke gyldigt ud.");
    byId("ocrPutts")?.focus();
    return false;
  }

  return true;
}

function createOcrRound(input) {
  const round = {
    id: "",
    ...input,
    firMade: pendingGarminRound?.firMade ?? null,
    firPossible: pendingGarminRound?.firPossible ?? null,
    girMade: pendingGarminRound?.girMade ?? null,
    girPossible: pendingGarminRound?.girPossible ?? null,
    frontNine: pendingGarminRound?.frontNine ?? null,
    backNine: pendingGarminRound?.backNine ?? null,
    holes: Array.isArray(pendingGarminRound?.holes)
      ? [...pendingGarminRound.holes]
      : [],
    holePars: Array.isArray(pendingGarminRound?.holePars)
      ? [...pendingGarminRound.holePars]
      : [],
    holeHandicapStrokes: Array.isArray(
      pendingGarminRound?.holeHandicapStrokes
    )
      ? [...pendingGarminRound.holeHandicapStrokes]
      : [],
    eaglesOrBetter: pendingGarminRound?.eaglesOrBetter ?? null,
    birdies: pendingGarminRound?.birdies ?? null,
    pars: pendingGarminRound?.pars ?? null,
    bogeys: pendingGarminRound?.bogeys ?? null,
    doubleBogeyPlus: pendingGarminRound?.doubleBogeyPlus ?? null,
    completedHoles: pendingGarminRound?.completedHoles ?? 0,
    ocrImages: Array.isArray(pendingGarminRound?.images)
      ? [...pendingGarminRound.images]
      : [],
    source: "Garmin PNG",
    importedAt: new Date().toISOString()
  };

  const enriched = enrichRoundCalculations(round);
  enriched.id = createRoundId(enriched);
  return enriched;
}

function findDuplicateRoundIndex(rounds, candidate) {
  return rounds.findIndex((round) =>
    round.id === candidate.id ||
    (
      normalizeCourseName(round.course) === normalizeCourseName(candidate.course) &&
      round.date === candidate.date &&
      Number(round.score) === candidate.score
    )
  );
}

function bindGarminOcrSave() {
  const importButton = byId("importGarminOcrRound");

  if (!importButton) {
    return;
  }

  importButton.onclick = () => {
    const roundInput = {
      course: byId("ocrCourse")?.value.trim() || "",
      tees: byId("ocrTees")?.value.trim() || "",
      date: byId("ocrDate")?.value || "",
      score: optionalNumber("ocrScore"),
      relativeToPar: optionalNumber("ocrRelativeToPar"),
      fir: optionalNumber("ocrFir"),
      gir: optionalNumber("ocrGir"),
      putts: optionalNumber("ocrPutts")
    };

    if (!validateOcrRound(roundInput)) {
      return;
    }

    const newRound = createOcrRound(roundInput);
    state.rounds ??= [];

    const duplicateIndex = findDuplicateRoundIndex(state.rounds, newRound);

    if (duplicateIndex >= 0) {
      const shouldReplace = window.confirm(
        "Denne runde ser ud til allerede at være importeret. Vil du erstatte den eksisterende runde?"
      );

      if (!shouldReplace) {
        return;
      }

      state.rounds[duplicateIndex] = newRound;
    } else {
      state.rounds.push(newRound);
    }

    state.rounds.sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );

    setStatus("success", `Runden på ${newRound.course} er importeret.`);
    clearGarminImagePreviews();
    selectedGarminImages = [];
    pendingGarminRound = null;
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
  bindTrainingDrills();
  bindGarminImageImport();
  bindGarminOcrSave();
}

function render() {
  renderHeader();
  renderNav();

  const pageRenderer = pages[state.page] || homePage;
  const app = byId("app");

  if (!app) {
    console.error('Elementet med id="app" blev ikke fundet.');
    return;
  }

  try {
    app.innerHTML = pageRenderer(state);
  } catch (error) {
    console.error("Siden kunne ikke renderes:", error);
    app.innerHTML = `
      <div class="page">
        <div class="status status--error">
          Appen kunne ikke vise siden. Kontrollér browserens konsol.
        </div>
      </div>
    `;
  }

  bind();
}

const trackmanFileInput = byId("trackmanFile");

if (trackmanFileInput) {
  trackmanFileInput.onchange = async (event) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      state.clubs = importTrackman(
        parseCsv(await file.text()),
        state.clubs || []
      );
      state.clubIndex = 0;
      setStatus("success", `${state.clubs.length} køller importeret.`);
    } catch (error) {
      setStatus(
        "error",
        error instanceof Error
          ? error.message
          : "TrackMan-filen kunne ikke importeres."
      );
    }

    event.target.value = "";
    saveState(state);
    render();
  };
}

const garminFileInput = byId("garminFile");

if (garminFileInput) {
  garminFileInput.onchange = async (event) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const fileContent = await file.text();
      const rawData = file.name.toLowerCase().endsWith(".json")
        ? JSON.parse(fileContent)
        : parseCsv(fileContent);
      const importedRounds = importGarmin(rawData);

      state.rounds ??= [];

      importedRounds.forEach((round) => {
        const preparedRound = {
          ...round,
          id: round.id || createRoundId(round),
          source: round.source || "Garmin-fil"
        };
        const existingIndex = findDuplicateRoundIndex(
          state.rounds,
          preparedRound
        );

        if (existingIndex >= 0) {
          state.rounds[existingIndex] = preparedRound;
        } else {
          state.rounds.push(preparedRound);
        }
      });

      state.rounds.sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      );
      setStatus("success", `${importedRounds.length} runder importeret.`);
    } catch (error) {
      setStatus(
        "error",
        error instanceof Error
          ? error.message
          : "Garmin-filen kunne ikke importeres."
      );
    }

    event.target.value = "";
    saveState(state);
    render();
  };
}

render();
