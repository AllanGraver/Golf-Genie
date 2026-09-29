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

function clubIdFromName(value) {
  const raw=String(value||"").trim().toLowerCase();
  if (/^(iron|wood|hybrid)-[2-9]$/.test(raw) || /^wedge-(pw|gw|aw|sw|lw)$/.test(raw) || ["driver","putter"].includes(raw)) return raw;
  const token=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  if (/^(driver|drv|1w|1wood)$/.test(token)) return "driver"; if (/^(putter|pt)$/.test(token)) return "putter";
  const w={pw:"wedge-pw",pitchingwedge:"wedge-pw",gw:"wedge-gw",gapwedge:"wedge-gw",aw:"wedge-aw",approachwedge:"wedge-aw",sw:"wedge-sw",sandwedge:"wedge-sw",lw:"wedge-lw",lobwedge:"wedge-lw"}; if(w[token]) return w[token];
  let m=token.match(/^([2-9])(?:i|iron|jern)$/)||token.match(/^(?:iron|jern)([2-9])$/); if(m)return `iron-${m[1]}`;
  m=token.match(/^([2-9])(?:w|wood)$/)||token.match(/^(?:wood)([2-9])$/); if(m)return `wood-${m[1]}`;
  m=token.match(/^([2-6])(?:h|hybrid)$/)||token.match(/^(?:hybrid)([2-6])$/); if(m)return `hybrid-${m[1]}`; return `other-${token}`;
}
function normalizeBag(bag) {
  if (!Array.isArray(bag)) return [];
  return bag
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id || `bag-club-${index + 1}`),
      club: String(item.club || item.name || "").trim(),
      clubId: String(item.clubId || clubIdFromName(item.club || item.name)).trim(),
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
