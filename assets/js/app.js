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

const byId = (id) => document.getElementById(id);

const pages = {
  home: homePage,
  rounds: roundsPage,
  training: trainingPage,
  bag: bagPage,
  data: dataPage,
  profile: profilePage
};

function renderHeader() {
  byId("appHeader").innerHTML = `
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
  byId("bottomNav").innerHTML = NAV.map(
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

  byId("sideNav").innerHTML = NAV.map(
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
      state.clubIndex = Math.min(
        state.clubs.length - 1,
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
    state = resetState();

    state.status = {
      type: "success",
      text: "Demodata er gendannet."
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
      Number(byId("hcp")?.value);

    const targetHandicap =
      Number(byId("target")?.value);

    const homeCourse =
      byId("course")?.value.trim() || "";

    const handedness =
      byId("handedness")?.value || "Right";

    const age =
      Number(byId("age")?.value);

    if (
      !Number.isFinite(handicap) ||
      handicap < -10 ||
      handicap > 54
    ) {
      state.status = {
        type: "error",
        text: "Indtast et gyldigt handicap mellem -10 og 54."
      };

      render();
      return;
    }

    if (
      !Number.isFinite(targetHandicap) ||
      targetHandicap < -10 ||
      targetHandicap > 54
    ) {
      state.status = {
        type: "error",
        text: "Indtast et gyldigt målhandicap mellem -10 og 54."
      };

      render();
      return;
    }

    if (
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120
    ) {
      state.status = {
        type: "error",
        text: "Indtast en gyldig alder mellem 1 og 120."
      };

      render();
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

        const noteField =
          document.querySelector(
            `.course-note[data-course="${CSS.escape(course)}"]`
          );

        if (!noteField) {
          return;
        }

        if (!state.courseNotes) {
          state.courseNotes = {};
        }

        const note =
          noteField.value.trim();

        if (note) {
          state.courseNotes[course] = note;
        } else {
          delete state.courseNotes[course];
        }

        state.status = {
          type: "success",
          text: `Banenoten til ${course} er gemt.`
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

function bind() {
  bindNavigation();
  bindClubSelection();
  bindImportButtons();
  bindResetButton();
  bindProfileForm();
  bindCourseNotes();
  bindTrainingDrills();
}

function render() {
  renderHeader();
  renderNav();

  const pageRenderer =
    pages[state.page] || homePage;

  byId("app").innerHTML =
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
          text: `${state.clubs.length} køller importeret.`
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

        state.rounds =
          importGarmin(raw);

        state.status = {
          type: "success",
          text: `${state.rounds.length} runder importeret.`
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
