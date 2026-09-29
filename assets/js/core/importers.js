const number = value => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const key = value => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const field = (row, names) => Object.entries(row || {}).find(([name]) => names.includes(key(name)))?.[1];
const median = values => { const data = values.filter(Number.isFinite).sort((a,b)=>a-b); if (!data.length) return null; const m=Math.floor(data.length/2); return data.length%2 ? data[m] : (data[m-1]+data[m])/2; };

export const CLUB_CATALOG = [
  ["driver", "Driver"],
  ...[2,3,4,5,7,9].map(n => [`wood-${n}`, `${n} Wood`]),
  ...[2,3,4,5,6].map(n => [`hybrid-${n}`, `${n} Hybrid`]),
  ...[2,3,4,5,6,7,8,9].map(n => [`iron-${n}`, `${n} Jern`]),
  ["wedge-pw", "PW"], ["wedge-gw", "GW"], ["wedge-aw", "AW"],
  ["wedge-sw", "SW"], ["wedge-lw", "LW"], ["putter", "Putter"]
];

export function canonicalClub(value) {
  const raw = String(value || "").trim();
  let cleaned = raw;
  // Migrate values repeatedly prefixed by older versions, e.g. other-otherother5jern.
  for (let index = 0; index < 12; index += 1) {
    const next = cleaned.replace(/^other(?:-|_)?/i, "");
    if (next === cleaned) break;
    cleaned = next;
  }
  const directId = cleaned.toLowerCase();
  const direct = CLUB_CATALOG.find(([id]) => id === directId);
  if (direct) return { clubId: direct[0], name: direct[1], rawName: raw };
  const token = key(cleaned);
  if (!token) return { clubId: "", name: "", rawName: raw };
  if (/^(driver|drv|1w|1wood|wood1)$/.test(token)) return { clubId:"driver", name:"Driver", rawName:raw };
  if (/^(putter|pt)$/.test(token)) return { clubId:"putter", name:"Putter", rawName:raw };
  const wedges={pw:"wedge-pw",pitching:"wedge-pw",pitchingwedge:"wedge-pw",pwedge:"wedge-pw",gw:"wedge-gw",gap:"wedge-gw",gapwedge:"wedge-gw",gwedge:"wedge-gw",aw:"wedge-aw",approach:"wedge-aw",approachwedge:"wedge-aw",awedge:"wedge-aw",sw:"wedge-sw",sand:"wedge-sw",sandwedge:"wedge-sw",swedge:"wedge-sw",lw:"wedge-lw",lob:"wedge-lw",lobwedge:"wedge-lw",lwedge:"wedge-lw",wedgepw:"wedge-pw",wedgegw:"wedge-gw",wedgeaw:"wedge-aw",wedgesw:"wedge-sw",wedgelw:"wedge-lw"};
  if (wedges[token]) { const id=wedges[token]; return { clubId:id, name:CLUB_CATALOG.find(([x])=>x===id)[1], rawName:raw }; }
  const patterns=[
    [/^(?:wood|fairway|koelle)([2-9])$/, "wood"], [/^([2-9])(?:w|wood|fairway|koelle)$/, "wood"],
    [/^(?:hybrid|rescue)([2-6])$/, "hybrid"], [/^([2-6])(?:h|hybrid|rescue)$/, "hybrid"],
    [/^(?:iron|jern)([2-9])$/, "iron"], [/^([2-9])(?:i|iron|jern)$/, "iron"]
  ];
  for (const [rx,type] of patterns) { const match=token.match(rx); if (match) { const id=`${type}-${match[1]}`; const hit=CLUB_CATALOG.find(([x])=>x===id); if(hit) return {clubId:id,name:hit[1],rawName:raw}; } }
  return { clubId:`other-${token}`, name:raw, rawName:raw };
}

export function parseCsv(csvText) {
  const lines=String(csvText||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim());
  if(lines.length<2) throw new Error("CSV-filen er tom eller mangler datarækker.");
  const separator=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?";":",";
  const split=line=>{const out=[];let value="",quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===separator&&!quoted){out.push(value.trim());value="";}else value+=c;}out.push(value.trim());return out;};
  const headers=split(lines[0]);
  return lines.slice(1).map(line=>{const values=split(line);return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));});
}

export function importTrackman(rows, existing=[]) {
  const groups=new Map();
  for(const row of rows){
    const rawName=text(field(row,["club","clubname","clubtype","kolle"]));
    const carry=number(field(row,["carry","carrydistance","carrymeters","carrymetres"]));
    if(!rawName||carry===null) continue;
    const canonical=canonicalClub(rawName);
    const group=groups.get(canonical.clubId)||{...canonical,rawNames:new Set(),shots:[]};
    group.rawNames.add(rawName);
    group.shots.push({carry,total:number(field(row,["total","totaldistance","totalmeters","totalmetres"])),side:number(field(row,["side","sideoffline","offline","lateral"]))});
    groups.set(canonical.clubId,group);
  }
  const clubs=[...groups.values()].map(group=>{const carry=Math.round(median(group.shots.map(s=>s.carry)));const old=existing.find(c=>(c.clubId||canonicalClub(c.name).clubId)===group.clubId);const total=median(group.shots.map(s=>s.total));const dispersion=median(group.shots.map(s=>Number.isFinite(s.side)?Math.abs(s.side):null));return{clubId:group.clubId,name:group.name,rawNames:[...group.rawNames],carry,total:Math.round(total??carry),dispersion:Math.round(dispersion??0),shots:group.shots.length,benchmark:old?.benchmark??Math.round(carry*.96)};}).sort((a,b)=>b.carry-a.carry);
  if(!clubs.length) throw new Error("Kunne ikke finde gyldige Club- og Carry-kolonner i TrackMan-filen.");
  return clubs;
}
