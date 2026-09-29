import { DEMO_CLUBS } from "../../data/demo-data.js";
import { canonicalClub } from "./importers.js";
const KEY="golfpulse-editable-v1";
export const DEFAULT_PROFILE={handicap:12.7,targetHandicap:10,homeCourse:"Aarhus Golf Club",handedness:"Right",age:42,bag:[]};
function normalizeBag(bag){
  if(!Array.isArray(bag))return[];
  const seen=new Set();
  return bag.filter(x=>x&&typeof x==="object").map((item,index)=>{
    const canonical=canonicalClub(item.clubId||item.club||item.name);
    return {id:String(item.id||`bag-club-${index+1}`),clubId:canonical.clubId,club:canonical.name,brand:String(item.brand||"").trim(),model:String(item.model||"").trim(),loft:Number.isFinite(Number(item.loft))?Number(item.loft):null,year:String(item.year||"").trim()};
  }).filter(item=>item.clubId&&!seen.has(item.clubId)&&seen.add(item.clubId));
}
function normalizeClubs(clubs){return (Array.isArray(clubs)?clubs:[]).map(club=>{const c=canonicalClub(club.clubId||club.name);return {...club,clubId:c.clubId,name:c.name,rawNames:Array.isArray(club.rawNames)?club.rawNames:[club.name].filter(Boolean)};});}
export function defaults(){return{page:"home",clubs:normalizeClubs(structuredClone(DEMO_CLUBS)),rounds:[],clubIndex:0,editRoundId:null,profile:structuredClone(DEFAULT_PROFILE),courseNotes:{},status:null};}
export function loadState(){try{const stored=JSON.parse(localStorage.getItem(KEY));const base=defaults();return{...base,...stored,editRoundId:null,profile:{...DEFAULT_PROFILE,...(stored?.profile||{}),bag:normalizeBag(stored?.profile?.bag)},courseNotes:{...(stored?.courseNotes||{})},rounds:Array.isArray(stored?.rounds)?stored.rounds:[],clubs:Array.isArray(stored?.clubs)?normalizeClubs(stored.clubs):base.clubs};}catch(error){console.error("Kunne ikke læse localStorage:",error);return defaults();}}
export function saveState(state){try{localStorage.setItem(KEY,JSON.stringify({...state,editRoundId:null,profile:{...DEFAULT_PROFILE,...(state.profile||{}),bag:normalizeBag(state.profile?.bag)},clubs:normalizeClubs(state.clubs)}));}catch(error){console.error("Kunne ikke gemme localStorage:",error);}}
export function resetState(){const state=defaults();saveState(state);return state;}
