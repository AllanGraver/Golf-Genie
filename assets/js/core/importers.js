const number = value => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const key = value => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]/g, "");
const field = (row, names) => Object.entries(row || {})
  .find(([name]) => names.includes(key(name)))?.[1];
const median = values => {
  const data = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!data.length) return null;
  const middle = Math.floor(data.length / 2);
  return data.length % 2 ? data[middle] : (data[middle - 1] + data[middle]) / 2;
};
const rounded = (value, decimals = 0) => Number.isFinite(value)
  ? Number(value.toFixed(decimals))
  : null;

export const CLUB_CATALOG = [
  ["driver", "Driver"],
  ...[2, 3, 4, 5, 7, 9].map(number => [`wood-${number}`, `${number} Wood`]),
  ...[2, 3, 4, 5, 6].map(number => [`hybrid-${number}`, `${number} Hybrid`]),
  ...[2, 3, 4, 5, 6, 7, 8, 9].map(number => [`iron-${number}`, `${number} Jern`]),
  ["wedge-pw", "PW"],
  ["wedge-gw", "GW"],
  ["wedge-aw", "AW"],
  ["wedge-sw", "SW"],
  ["wedge-lw", "LW"],
  ["putter", "Putter"]
];

export function canonicalClub(value) {
  const raw = String(value || "").trim();
  let cleaned = raw;

  for (let index = 0; index < 12; index += 1) {
    const next = cleaned.replace(/^other(?:-|_)?/i, "");
    if (next === cleaned) break;
    cleaned = next;
  }

  const direct = CLUB_CATALOG.find(([clubId]) => clubId === cleaned.toLowerCase());
  if (direct) return { clubId: direct[0], name: direct[1], rawName: raw };

  const token = key(cleaned);
  if (!token) return { clubId: "", name: "", rawName: raw };
  if (/^(driver|drv|1w|1wood|wood1)$/.test(token)) {
    return { clubId: "driver", name: "Driver", rawName: raw };
  }
  if (/^(putter|pt)$/.test(token)) {
    return { clubId: "putter", name: "Putter", rawName: raw };
  }

  const wedges = {
    pw: "wedge-pw", pitching: "wedge-pw", pitchingwedge: "wedge-pw", pwedge: "wedge-pw", wedgepw: "wedge-pw",
    gw: "wedge-gw", gap: "wedge-gw", gapwedge: "wedge-gw", gwedge: "wedge-gw", wedgegw: "wedge-gw",
    aw: "wedge-aw", approach: "wedge-aw", approachwedge: "wedge-aw", awedge: "wedge-aw", wedgeaw: "wedge-aw",
    sw: "wedge-sw", sand: "wedge-sw", sandwedge: "wedge-sw", swedge: "wedge-sw", wedgesw: "wedge-sw",
    lw: "wedge-lw", lob: "wedge-lw", lobwedge: "wedge-lw", lwedge: "wedge-lw", wedgelw: "wedge-lw"
  };
  if (wedges[token]) {
    const clubId = wedges[token];
    return {
      clubId,
      name: CLUB_CATALOG.find(([id]) => id === clubId)[1],
      rawName: raw
    };
  }

  const patterns = [
    [/^(?:wood|fairway|koelle)([2-9])$/, "wood"],
    [/^([2-9])(?:w|wood|fairway|koelle)$/, "wood"],
    [/^(?:hybrid|rescue)([2-6])$/, "hybrid"],
    [/^([2-6])(?:h|hybrid|rescue)$/, "hybrid"],
    [/^(?:iron|jern)([2-9])$/, "iron"],
    [/^([2-9])(?:i|iron|jern)$/, "iron"]
  ];

  for (const [pattern, type] of patterns) {
    const match = token.match(pattern);
    if (!match) continue;
    const clubId = `${type}-${match[1]}`;
    const catalogItem = CLUB_CATALOG.find(([id]) => id === clubId);
    return { clubId, name: catalogItem?.[1] || raw, rawName: raw };
  }

  return { clubId: `other-${token}`, name: raw, rawName: raw };
}

export function parseCsv(csvText) {
  const lines = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(line => line.trim());
  if (lines.length < 2) throw new Error("CSV-filen er tom eller mangler datarækker.");

  const separator = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length
    ? ";"
    : ",";

  const splitLine = line => {
    const output = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === separator && !quoted) {
        output.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }
    output.push(current.trim());
    return output;
  };

  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function previousSnapshot(oldClub) {
  if (!oldClub || !Number.isFinite(Number(oldClub.carry))) return null;
  return {
    carry: Number(oldClub.carry),
    total: Number(oldClub.total),
    dispersion: Number(oldClub.dispersion),
    spinRate: Number.isFinite(Number(oldClub.spinRate)) ? Number(oldClub.spinRate) : null,
    attackAngle: Number.isFinite(Number(oldClub.attackAngle)) ? Number(oldClub.attackAngle) : null,
    smashFactor: Number.isFinite(Number(oldClub.smashFactor)) ? Number(oldClub.smashFactor) : null,
    shots: Number(oldClub.shots) || 0,
    importedAt: oldClub.importedAt || null
  };
}

export function importTrackman(rows, existing = []) {
  const groups = new Map();

  for (const row of rows) {
    const rawName = text(field(row, ["club", "clubname", "clubtype", "kolle"]));
    const carry = number(field(row, ["carry", "carrydistance", "carrymeters", "carrymetres"]));
    if (!rawName || carry === null) continue;

    const canonical = canonicalClub(rawName);
    const group = groups.get(canonical.clubId) || {
      ...canonical,
      rawNames: new Set(),
      shots: []
    };

    group.rawNames.add(rawName);
    group.shots.push({
      carry,
      total: number(field(row, ["total", "totaldistance", "totalmeters", "totalmetres"])),
      side: number(field(row, ["side", "sideoffline", "offline", "lateral", "lateraldispersion"])),
      spinRate: number(field(row, ["spinrate", "spin", "backspin", "totalspin"])),
      attackAngle: number(field(row, ["attackangle", "angleofattack", "aoa"])),
      smashFactor: number(field(row, ["smashfactor", "smash"])),
      ballSpeed: number(field(row, ["ballspeed"])),
      clubSpeed: number(field(row, ["clubspeed", "clubheadspeed"])),
      launchAngle: number(field(row, ["launchangle", "verticallaunch"])),
      height: number(field(row, ["height", "maxheight", "apex"])),
      landingAngle: number(field(row, ["landingangle", "descentangle"])),
      faceAngle: number(field(row, ["faceangle"])),
      clubPath: number(field(row, ["clubpath"])),
      faceToPath: number(field(row, ["facetopath"])),
      date: text(field(row, ["date", "shotdate", "sessiondate"]))
    });
    groups.set(canonical.clubId, group);
  }

  const importedAt = new Date().toISOString();
  const clubs = [...groups.values()].map(group => {
    const oldClub = existing.find(club =>
      (club.clubId || canonicalClub(club.name).clubId) === group.clubId
    );
    const medianOf = property => median(group.shots.map(shot => shot[property]));
    const carry = rounded(medianOf("carry"));
    const total = rounded(medianOf("total") ?? carry);
    const dispersion = rounded(median(group.shots.map(shot =>
      Number.isFinite(shot.side) ? Math.abs(shot.side) : null
    )) ?? 0);

    return {
      clubId: group.clubId,
      name: group.name,
      rawNames: [...group.rawNames],
      carry,
      total,
      dispersion,
      shots: group.shots.length,
      spinRate: rounded(medianOf("spinRate")),
      attackAngle: rounded(medianOf("attackAngle"), 1),
      smashFactor: rounded(medianOf("smashFactor"), 2),
      ballSpeed: rounded(medianOf("ballSpeed"), 1),
      clubSpeed: rounded(medianOf("clubSpeed"), 1),
      launchAngle: rounded(medianOf("launchAngle"), 1),
      height: rounded(medianOf("height"), 1),
      landingAngle: rounded(medianOf("landingAngle"), 1),
      faceAngle: rounded(medianOf("faceAngle"), 1),
      clubPath: rounded(medianOf("clubPath"), 1),
      faceToPath: rounded(medianOf("faceToPath"), 1),
      benchmark: oldClub?.benchmark ?? null,
      previous: previousSnapshot(oldClub),
      importedAt,
      dataQuality: group.shots.length >= 10 ? "strong" : group.shots.length >= 5 ? "usable" : "limited"
    };
  }).sort((a, b) => b.carry - a.carry);

  if (!clubs.length) {
    throw new Error("Kunne ikke finde gyldige Club- og Carry-kolonner i TrackMan-filen.");
  }
  return clubs;
}
