import {
  DEMO_CLUBS,
  DEMO_ROUNDS
} from "../../data/demo-data.js";

const KEY = "golfpulse-editable-v1";

export const DEFAULT_PROFILE = {
  handicap: 12.7,
  targetHandicap: 10.0,
  homeCourse: "Aarhus Golf Club",
  handedness: "Right",
  age: 42
};

export function loadState() {

  try {

    const state = JSON.parse(
      localStorage.getItem(KEY)
    );

    const defaultState = defaults();

    return {
      ...defaultState,
      ...state,

      profile: {
        ...DEFAULT_PROFILE,
        ...(state?.profile || {})
      },

      courseNotes: {
        ...(state?.courseNotes || {})
      }
    };

  } catch {

    return defaults();

  }
}

export function saveState(state) {

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );

}

export function defaults() {

  return {

    page: "home",

    clubs: structuredClone(
      DEMO_CLUBS
    ),

    rounds: structuredClone(
      DEMO_ROUNDS
    ),

    clubIndex: 4,

    profile: structuredClone(
      DEFAULT_PROFILE
    ),

    courseNotes: {},

    status: null

  };

}

export function resetState() {

  const state = defaults();

  saveState(state);

  return state;

}
