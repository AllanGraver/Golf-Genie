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

function optionalNumber(id) {
  const element = byId(id);

  if (!element) {
    return null;
  }

  const value = element.value.trim();

  if (value === "") {
    return null;
  }

  const number = Number(
    value.replace(",", ".")
  );

  return Number.isFinite(number)
    ? number
    : null;
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
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clearGarminImagePreviews() {
  garminImagePreviewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });

  garminImagePreviewUrls = [];
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
    >
      <span class="brand__logo">⚑</span>

      <span>
        <span class="brand__name">
          GOLF<span>Genie</span>
        </span>

        <span class="brand__tagline">
          EDITABLE HUB
        </span>
      </span>
    </button>

    <span class="badge">LOKAL</span>
  `;
}

function renderNav() {
  const bottomNav = byId("bottomNav");
  const sideNav = byId("sideNav");

  if (bottomNav) {
    bottomNav.innerHTML = NAV.map(
      ([page, icon, label]) => `
        <button
          class="nav-button ${
            state.page === page
              ? "nav-button--active"
              : ""
          }"
          data-page="${page}"
          type="button"
        >
          <span class="nav-button__icon">
            ${icon}
          </span>

          ${label}
        </button>
      `
    ).join("");
  }

  if (sideNav) {
    sideNav.innerHTML = NAV.map(
      ([page, icon, label]) => `
        <button
          class="side-button ${
            state.page === page
              ? "side-button--active"
              : ""
          }"
          data-page="${page}"
          type="button"
        >
          ${icon} ${label}
        </button>
      `
    ).join("");
  }
}

function bindNavigation() {
  document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
      button.onclick = () => {
        state.page = button.dataset.page;

        saveState(state);
        render();
      };
    });
}

function bindClubSelection() {
  document
    .querySelectorAll("[data-club]")
    .forEach((button) => {
      button.onclick = () => {
        state.clubIndex = Number(
          button.dataset.club
        );

        saveState(state);
        render();
      };
    });

  const previousClubButton =
    byId("previousClub");

  if (previousClubButton) {
    previousClubButton.onclick = () => {
      state.clubIndex = Math.max(
        0,
        state.clubIndex - 1
      );

      saveState(state);
      render();
    };
  }

  const nextClubButton =
    byId("nextClub");

  if (nextClubButton) {
    nextClubButton.onclick = () => {
      const lastClubIndex = Math.max(
        0,
        (state.clubs?.length || 0) - 1
      );

      state.clubIndex = Math.min(
        lastClubIndex,
        state.clubIndex + 1
      );

      saveState(state);
      render();
    };
  }
}

function bindImportButtons() {
  const trackmanButton =
    byId("trackmanButton");

  if (trackmanButton) {
    trackmanButton.onclick = () => {
      byId("trackmanFile")?.click();
    };
  }

  const garminButton =
    byId("garminButton");

  if (garminButton) {
    garminButton.onclick = () => {
      byId("garminFile")?.click();
    };
  }
}

function bindResetButton() {
  const resetButton =
    byId("resetButton");

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

    state.status = {
      type: "success",
      text: "Lokale data er nulstillet."
    };

    saveState(state);
    render();
  };
}

function bindProfileForm() {
  const saveProfileButton =
    byId("save-profile");

  if (!saveProfileButton) {
    return;
  }

  saveProfileButton.onclick = () => {
    const handicap =
      optionalNumber("hcp");

    const targetHandicap =
      optionalNumber("target");

    const homeCourse =
      byId("course")?.value.trim() || "";

    const handedness =
      byId("handedness")?.value || "Right";

    const age =
      optionalNumber("age");

    if (
      handicap === null ||
      handicap < -10 ||
      handicap > 54
    ) {
      window.alert(
        "Indtast et gyldigt handicap mellem -10 og 54."
      );

      byId("hcp")?.focus();
      return;
    }

    if (
      targetHandicap === null ||
      targetHandicap < -10 ||
      targetHandicap > 54
    ) {
      window.alert(
        "Indtast et gyldigt målhandicap mellem -10 og 54."
      );

      byId("target")?.focus();
      return;
    }

    if (
      age === null ||
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120
    ) {
      window.alert(
        "Indtast en gyldig alder mellem 1 og 120."
      );

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

    state.status = {
      type: "success",
      text: "Profilen er gemt."
    };

    saveState(state);
    render();
  };
}

function bindCourseNotes() {
  document
    .querySelectorAll(".save-course-note")
    .forEach((button) => {
      button.onclick = () => {
        const course =
          button.dataset.course;

        if (!course) {
          return;
        }

        const cardElement =
          button.closest(".card");

        const noteField =
          cardElement?.querySelector(
            ".course-note"
          );

        if (!noteField) {
          return;
        }

        state.courseNotes ??= {};

        const note =
          noteField.value.trim();

        if (note) {
          state.courseNotes[course] =
            note;
        } else {
          delete state.courseNotes[
            course
          ];
        }

        state.status = {
          type: "success",
          text:
            `Banenoten til ${course} er gemt.`
        };

        saveState(state);
        render();
      };
    });
}

function bindTrainingDrills() {
  document
    .querySelectorAll(".drill")
    .forEach((button) => {
      button.onclick = () => {
        button.classList.toggle(
          "button--accent"
        );
      };
    });
}

function renderGarminImagePreviews() {
  const preview =
    byId("garminImagePreview");

  const readButton =
    byId("readGarminImages");

  if (!preview || !readButton) {
    return;
  }

  clearGarminImagePreviews();

  if (!selectedGarminImages.length) {
    preview.innerHTML = "";
    readButton.disabled = true;
    return;
  }

  preview.innerHTML =
    selectedGarminImages
      .map((file) => {
        const url =
          URL.createObjectURL(file);

        garminImagePreviewUrls.push(url);

        return `
          <figure class="image-preview">
            ${url}"
            >

            <figcaption>
              ${escapeHtml(file.name)}
            </figcaption>
          </figure>
        `;
      })
      .join("");

  readButton.disabled = false;
}

function populateGarminReview(round) {
  pendingGarminRound = round;

  const assignments = {
    ocrCourse:
      round.course || "",

    ocrTees:
      round.tees || "",

    ocrDate:
      round.date || "",

    ocrScore:
      round.score ?? "",

    ocrRelativeToPar:
      round.relativeToPar ?? "",

    ocrFir:
      round.fir ?? "",

    ocrGir:
      round.gir ?? "",

    ocrPutts:
      round.putts ?? "",

    ocrRawText:
      round.rawText || ""
  };

  Object.entries(assignments).forEach(
    ([id, value]) => {
      const element = byId(id);

      if (element) {
        element.value = value;
      }
    }
  );

  const review =
    byId("garminReview");

  if (review) {
    review.hidden = false;

    review.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function bindGarminImageImport() {
  const imageButton =
    byId("garminImageButton");

  const fileInput =
    byId("garminImageFile");

  const readButton =
    byId("readGarminImages");

  const progress =
    byId("garminOcrProgress");

  if (
    !imageButton ||
    !fileInput ||
    !readButton
  ) {
    return;
  }

  imageButton.onclick = () => {
    fileInput.click();
  };

  fileInput.onchange = (event) => {
    selectedGarminImages =
      Array.from(
        event.target.files || []
      ).filter((file) =>
        file.type.startsWith("image/")
      );

    pendingGarminRound = null;

    renderGarminImagePreviews();

    if (progress) {
      progress.hidden = true;
      progress.textContent = "";
    }

    const review =
      byId("garminReview");

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
      progress.className =
        "status status--info";

      progress.textContent =
        "Forbereder billedlæsning...";
    }

    try {
      const round =
        await recognizeGarminImages(
          selectedGarminImages,
          (message) => {
            if (!progress) {
              return;
            }

            const fileNumber =
              message.fileIndex || 1;

            const fileCount =
              message.fileCount ||
              selectedGarminImages.length;

            const percentage =
              Number.isFinite(
                message.progress
              )
                ? Math.round(
                    message.progress * 100
                  )
                : null;

            const status =
              message.status ||
              "Læser billede";

            progress.textContent =
              percentage === null
                ? `${status} (${fileNumber} af ${fileCount})`
                : `${status}: ${percentage}% (${fileNumber} af ${fileCount})`;
          }
        );

      populateGarminReview(round);

      if (progress) {
        progress.className =
          "status status--success";

        progress.textContent =
          "Billederne er læst. Kontrollér oplysningerne før import.";
      }
    } catch (error) {
      pendingGarminRound = null;

      if (progress) {
        progress.className =
          "status status--error";

        progress.textContent =
          error instanceof Error
            ? error.message
            : "Billederne kunne ikke læses.";
      }
    } finally {
      readButton.disabled = false;
    }
  };
}

function bindGarminOcrSave() {
  const importButton =
    byId("importGarminOcrRound");

  if (!importButton) {
    return;
  }

  importButton.onclick = () => {
    const course =
      byId("ocrCourse")?.value.trim();

    const tees =
      byId("ocrTees")?.value.trim() || "";

    const date =
      byId("ocrDate")?.value || "";

    const score =
      optionalNumber("ocrScore");

    const relativeToPar =
      optionalNumber(
        "ocrRelativeToPar"
      );

    const fir =
      optionalNumber("ocrFir");

    const gir =
      optionalNumber("ocrGir");

    const putts =
      optionalNumber("ocrPutts");

    if (!course) {
      window.alert(
        "Indtast eller kontrollér banens navn."
      );

      byId("ocrCourse")?.focus();
      return;
    }

    if (!date) {
      window.alert(
        "Indtast eller kontrollér datoen."
      );

      byId("ocrDate")?.focus();
      return;
    }

    if (
      score === null ||
      score < 1 ||
      score > 250
    ) {
      window.alert(
        "Indtast en gyldig score."
      );

      byId("ocrScore")?.focus();
      return;
    }

    if (
      relativeToPar !== null &&
      (
        relativeToPar < -30 ||
        relativeToPar > 100
      )
    ) {
      window.alert(
        "Resultatet i forhold til par ser ikke gyldigt ud."
      );

      byId("ocrRelativeToPar")?.focus();
      return;
    }

    if (
      fir !== null &&
      (
        fir < 0 ||
        fir > 100
      )
    ) {
      window.alert(
        "FIR skal være mellem 0 og 100 procent."
      );

      byId("ocrFir")?.focus();
      return;
    }

    if (
      gir !== null &&
      (
        gir < 0 ||
        gir > 100
      )
    ) {
      window.alert(
        "GIR skal være mellem 0 og 100 procent."
      );

      byId("ocrGir")?.focus();
      return;
    }

    if (
      putts !== null &&
      (
        putts < 0 ||
        putts > 100
      )
    ) {
      window.alert(
        "Antallet af putts ser ikke gyldigt ud."
      );

      byId("ocrPutts")?.focus();
      return;
    }

    const newRound = {
      id: "",

      course,
      tees,
      date,
      score,
      relativeToPar,
      fir,
      gir,
      putts,

      firMade:
        pendingGarminRound?.firMade ??
        null,

      firPossible:
        pendingGarminRound?.firPossible ??
        null,

      girMade:
        pendingGarminRound?.girMade ??
        null,

      girPossible:
        pendingGarminRound?.girPossible ??
        null,

      upAndDown:
        pendingGarminRound?.upAndDown ??
        null,

      upAndDownMade:
        pendingGarminRound
          ?.upAndDownMade ?? null,

      upAndDownPossible:
        pendingGarminRound
          ?.upAndDownPossible ?? null,

      pars:
        pendingGarminRound?.pars ??
        null,

      bogeys:
        pendingGarminRound?.bogeys ??
        null,

      doubleBogeyPlus:
        pendingGarminRound
          ?.doubleBogeyPlus ?? null,

      frontNine:
        pendingGarminRound?.frontNine ??
        null,

      backNine:
        pendingGarminRound?.backNine ??
        null,

      holes:
        Array.isArray(
          pendingGarminRound?.holes
        )
          ? [
              ...pendingGarminRound.holes
            ]
          : [],

      ocrImages:
        Array.isArray(
          pendingGarminRound?.images
        )
          ? [
              ...pendingGarminRound.images
            ]
          : [],

      source: "Garmin PNG",

      importedAt:
        new Date().toISOString()
    };

    newRound.id =
      createRoundId(newRound);

    state.rounds ??= [];

    const duplicateIndex =
      state.rounds.findIndex(
        (round) =>
          round.id === newRound.id ||
          (
            String(
              round.course || ""
            ).toLocaleLowerCase(
              "da-DK"
            ) ===
              newRound.course
                .toLocaleLowerCase(
                  "da-DK"
                ) &&
            round.date ===
              newRound.date &&
            Number(round.score) ===
              newRound.score
          )
      );

    if (duplicateIndex >= 0) {
      const shouldReplace =
        window.confirm(
          "Denne runde ser ud til allerede at være importeret. Vil du erstatte den eksisterende runde?"
        );

      if (!shouldReplace) {
        return;
      }

      state.rounds[
        duplicateIndex
      ] = newRound;
    } else {
      state.rounds.push(newRound);
    }

    state.rounds.sort(
      (a, b) =>
        String(b.date || "")
          .localeCompare(
            String(a.date || "")
          )
    );

    state.status = {
      type: "success",
      text:
        `Runden på ${course} er importeret.`
    };

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
  bindTrainingDrills();
  bindGarminImageImport();
  bindGarminOcrSave();
}

function render() {
  renderHeader();
  renderNav();

  const pageRenderer =
    pages[state.page] || homePage;

  const app = byId("app");

  if (!app) {
    return;
  }

  app.innerHTML =
    pageRenderer(state);

  bind();
}

const trackmanFileInput =
  byId("trackmanFile");

if (trackmanFileInput) {
  trackmanFileInput.onchange =
    async (event) => {
      try {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        const fileContent =
          await file.text();

        state.clubs = importTrackman(
          parseCsv(fileContent),
          state.clubs
        );

        state.clubIndex = 0;

        state.status = {
          type: "success",
          text:
            `${state.clubs.length} køller importeret.`
        };
      } catch (error) {
        state.status = {
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "TrackMan-filen kunne ikke importeres."
        };
      }

      event.target.value = "";

      saveState(state);
      render();
    };
}

const garminFileInput =
  byId("garminFile");

if (garminFileInput) {
  garminFileInput.onchange =
    async (event) => {
      try {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        const text =
          await file.text();

        const raw =
          file.name
            .toLowerCase()
            .endsWith(".json")
            ? JSON.parse(text)
            : parseCsv(text);

        const importedRounds =
          importGarmin(raw);

        const preparedRounds =
          importedRounds.map(
            (round) => {
              const preparedRound = {
                ...round,

                source:
                  round.source ||
                  "Garmin-fil"
              };

              preparedRound.id =
                round.id ||
                createRoundId(
                  preparedRound
                );

              return preparedRound;
            }
          );

        state.rounds ??= [];

        preparedRounds.forEach(
          (importedRound) => {
            const existingIndex =
              state.rounds.findIndex(
                (round) =>
                  round.id ===
                    importedRound.id
              );

            if (existingIndex >= 0) {
              state.rounds[
                existingIndex
              ] = importedRound;
            } else {
              state.rounds.push(
                importedRound
              );
            }
          }
        );

        state.rounds.sort(
          (a, b) =>
            String(b.date || "")
              .localeCompare(
                String(a.date || "")
              )
        );

        state.status = {
          type: "success",
          text:
            `${preparedRounds.length} runder importeret.`
        };
      } catch (error) {
        state.status = {
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Garmin-filen kunne ikke importeres."
        };
      }

      event.target.value = "";

      saveState(state);
      render();
    };
}

render();
