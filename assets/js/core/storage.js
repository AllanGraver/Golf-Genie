import {DEMO_CLUBS,DEMO_ROUNDS} from "../../data/demo-data.js";
const KEY="golfpulse-editable-v1";
export function loadState(){try{return JSON.parse(localStorage.getItem(KEY))||defaults()}catch{return defaults()}}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(state))}
export function defaults(){return {page:"home",clubs:structuredClone(DEMO_CLUBS),rounds:structuredClone(DEMO_ROUNDS),clubIndex:4,status:null}}
export function resetState(){const state=defaults();saveState(state);return state}