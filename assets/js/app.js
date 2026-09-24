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

const byId = id => document.getElementById(id);

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
    <button class="brand" data-page="home">
      <span class="brand__logo">⚑</span>

      <span>
        <span class="brand__name">
          GOLF<span>PULSE</span>
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
    ([p, i, l]) => `
      <button
        class="nav-button ${
          state.page === p
            ? "nav-button--active"
            : ""
        }"
        data-page="${p}">

        <span class="nav-button__icon">
          ${i}
        </span>

        ${l}

      </button>
    `
  ).join("");

  byId("sideNav").innerHTML = NAV.map(
    ([p, i, l]) => `
      <button
        class="side-button ${
          state.page === p
            ? "side-button--active"
            : ""
        }"
        data-page="${p}">

        ${i} ${l}

      </button>
    `
  ).join("");
}

function bind() {

  document
    .querySelectorAll("[data-page]")
    .forEach(button =>
      button.onclick = () => {

        state.page =
          button.dataset.page;

        saveState(state);

        render();
      }
    );

  document
    .querySelectorAll("[data-club]")
    .forEach(button =>
      button.onclick = () => {

        state.clubIndex = Number(
          button.dataset.club
        );

        saveState(state);

        render();
      }
    );

  if (byId("previousClub"))
    byId("previousClub").onclick = () => {

      state.clubIndex = Math.max(
        0,
        state.clubIndex - 1
      );

      saveState(state);

      render();
    };

  if (byId("nextClub"))
    byId("nextClub").onclick = () => {

      state.clubIndex = Math.min(
        state.clubs.length - 1,
        state.clubIndex + 1
      );

      saveState(state);

      render();
    };

  if (byId("trackmanButton"))
    byId("trackmanButton").onclick = () =>
      byId("trackmanFile").click();

  if (byId("garminButton"))
    byId("garminButton").onclick = () =>
      byId("garminFile").click();

  if (byId("resetButton"))
    byId("resetButton").onclick = () => {

      state = resetState();

      state.status = {
        type: "success",
        text: "Demodata er gendannet."
      };

      render();
    };

  if (byId("save-profile"))
    byId("save-profile").onclick = () => {

      state.profile = {

        handicap: Number(
          byId("hcp").value
        ),

        targetHandicap: Number(
          byId("target").value
        ),

        homeCourse:
          byId("course").value,

        handedness:
          byId("handedness").value,

        age: Number(
          byId("age").value
        )

      };

      saveState(state);

      state.status = {
        type: "success",
        text: "Profil gemt."
      };

      render();
    };

  document
    .querySelectorAll(".drill")
    .forEach(button =>
      button.onclick = () =>
        button.classList.toggle(
          "button--accent"
        )
    );
}

function render() {

  renderHeader();

  renderNav();

  byId("app").innerHTML =
    (pages[state.page] || homePage)(state);

  bind();
}

byId("trackmanFile").onchange =
  async event => {

    try {

      const file =
        event.target.files[0];

      state.clubs = importTrackman(
        parseCsv(
          await file.text()
        ),
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
        text: error.message
      };

    }

    saveState(state);

    render();
  };

byId("garminFile").onchange =
  async event => {

    try {

      const file =
        event.target.files[0];

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
        text: error.message
      };

    }

    saveState(state);

    render();
  };

render();
`
