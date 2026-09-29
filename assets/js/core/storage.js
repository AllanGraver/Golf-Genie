import {
  DEMO_CLUBS
} from "../../data/demo-data.js";

const KEY = "golfpulse-editable-v1";

export const DEFAULT_PROFILE = {
  handicap: 12.7,
  targetHandicap: 10.0,
  homeCourse: "Aarhus Golf Club",
  handedness: "Right",
  age: 42,
  bag: []
};

function normalizeBag(bag) {
  if (!Array.isArray(bag)) return [];
  return bag
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id || `bag-club-${index + 1}`),
      club: String(item.club || item.name || "").trim(),
      brand: String(item.brand || "").trim(),
      model: String(item.model || "").trim(),
      loft: Number.isFinite(Number(item.loft)) ? Number(item.loft) : null,
      year: String(item.year || "").trim()
    }))
    .filter((item) => item.club);
}

export function defaults() {
  return {
    page: "home",
    clubs: structuredClone(DEMO_CLUBS),
    rounds: [],
    clubIndex: 0,
    editRoundId: null,
    profile: structuredClone(DEFAULT_PROFILE),
    courseNotes: {},
    status: null
  };
}

export function loadState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(KEY));
    const defaultState = defaults();
    return {
      ...defaultState,
      ...storedState,
      editRoundId: null,
      profile: {
        ...DEFAULT_PROFILE,
        ...(storedState?.profile || {}),
        bag: normalizeBag(storedState?.profile?.bag)
      },
      courseNotes: {
        ...(storedState?.courseNotes || {})
      },
      rounds: Array.isArray(storedState?.rounds) ? storedState.rounds : [],
      clubs: Array.isArray(storedState?.clubs)
        ? storedState.clubs
        : structuredClone(DEMO_CLUBS)
    };
  } catch (error) {
    console.error("Kunne ikke læse localStorage:", error);
    return defaults();
  }
}

export function saveState(state) {
  try {
    const stateToSave = {
      ...state,
      editRoundId: null,
      profile: {
        ...DEFAULT_PROFILE,
        ...(state.profile || {}),
        bag: normalizeBag(state.profile?.bag)
      }
    };
    localStorage.setItem(KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Kunne ikke gemme localStorage:", error);
  }
}

export function resetState() {
  const state = defaults();
  saveState(state);
  return state;
}
