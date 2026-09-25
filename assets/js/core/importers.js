const number = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(
    String(value)
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const text = (value, fallback = "") => {
  const normalized =
    String(value ?? "").trim();

  return normalized || fallback;
};

const key = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const field = (row, names) => {
  const match =
    Object.entries(row || {}).find(
      ([name]) =>
        names.includes(key(name))
    );

  return match?.[1];
};

const median = (values) => {
  const data = values
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!data.length) {
    return null;
  }

  const middle =
    Math.floor(data.length / 2);

  return data.length % 2
    ? data[middle]
    : (
        data[middle - 1] +
        data[middle]
      ) / 2;
};

function parseArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(number)
      .filter(Number.isFinite);
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map(number)
        .filter(Number.isFinite);
    }
  } catch {
    // Fortsæt med tekstbaseret parsing.
  }

  return String(value)
    .split(/[;,|\s]+/)
    .map(number)
    .filter(Number.isFinite);
}

function normalizeDate(value) {
  const raw = text(value);

  if (!raw) {
    return "";
  }

  const isoMatch = raw.match(
    /^\d{4}-\d{2}-\d{2}/
  );

  if (isoMatch) {
    return isoMatch[0];
  }

  const numericMatch = raw.match(
    /^(\d{1,2})\d{1,2}\d{4}$/
  );

  if (numericMatch) {
    const day =
      numericMatch[1].padStart(2, "0");

    const month =
      numericMatch[2].padStart(2, "0");

    return `${numericMatch[3]}-${month}-${day}`;
  }

  return raw;
}

function slug(value) {
  return text(value, "unknown")
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createRoundId(round, index) {
  const existingId = text(
    field(
      round,
      [
        "id",
        "scorecardid",
        "scorecardpk",
        "roundid"
      ]
    )
  );

  if (existingId) {
    return existingId;
  }

  const course = text(
    field(
      round,
      [
        "course",
        "coursename",
        "banename"
      ]
    ),
    "unknown-course"
  );

  const date = normalizeDate(
    field(
      round,
      [
        "date",
        "rounddate",
        "starttime",
        "formattedstarttime"
      ]
    )
  );

  const score = number(
    field(
      round,
      [
        "score",
        "totalscore",
        "strokes"
      ]
    )
  );

  return [
    slug(course),
    slug(date || "unknown-date"),
    score ?? index
  ].join("-");
}

export function parseCsv(csvText) {
  const lines = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error(
      "CSV-filen er tom eller mangler datarækker."
    );
  }

  const semicolonCount =
    (lines[0].match(/;/g) || []).length;

  const commaCount =
    (lines[0].match(/,/g) || []).length;

  const separator =
    semicolonCount > commaCount
      ? ";"
      : ",";

  const splitLine = (line) => {
    const output = [];

    let currentValue = "";
    let quoted = false;

    for (
      let index = 0;
      index < line.length;
      index += 1
    ) {
      const character =
        line[index];

      if (
        character === '"' &&
        line[index + 1] === '"'
      ) {
        currentValue += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (
        character === separator &&
        !quoted
      ) {
        output.push(
          currentValue.trim()
        );

        currentValue = "";
      } else {
        currentValue += character;
      }
    }

    output.push(
      currentValue.trim()
    );

    return output;
  };

  const headers =
    splitLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      const values =
        splitLine(line);

      return Object.fromEntries(
        headers.map(
          (header, index) => [
            header,
            values[index] ?? ""
          ]
        )
      );
    });
}

export function importTrackman(
  rows,
  existing = []
) {
  const groups = {};

  rows.forEach((row) => {
    const name = text(
      field(
        row,
        [
          "club",
          "clubname",
          "clubtype",
          "kolle"
        ]
      )
    );

    const carry = number(
      field(
        row,
        [
          "carry",
          "carrydistance",
          "carrymeters",
          "carrymetres"
        ]
      )
    );

    if (!name || carry === null) {
      return;
    }

    if (!groups[name]) {
      groups[name] = [];
    }

    groups[name].push({
      carry,

      total: number(
        field(
          row,
          [
            "total",
            "totaldistance",
            "totalmeters",
            "totalmetres"
          ]
        )
      ),

      side: number(
        field(
          row,
          [
            "side",
            "sideoffline",
            "offline",
            "lateral"
          ]
        )
      )
    });
  });

  const clubs =
    Object.entries(groups)
      .map(([name, shots]) => {
        const carry = Math.round(
          median(
            shots.map(
              (shot) => shot.carry
            )
          )
        );

        const oldClub =
          existing.find(
            (club) =>
              key(club.name) === key(name)
          );

        const totalMedian =
          median(
            shots.map(
              (shot) => shot.total
            )
          );

        const dispersionMedian =
          median(
            shots.map(
              (shot) =>
                Number.isFinite(shot.side)
                  ? Math.abs(shot.side)
                  : null
            )
          );

        return {
          name,

          carry,

          total: Math.round(
            totalMedian ?? carry
          ),

          dispersion: Math.round(
            dispersionMedian ?? 0
          ),

          shots: shots.length,

          benchmark:
            oldClub?.benchmark ??
            Math.round(carry * 0.96)
        };
      })
      .sort(
        (a, b) =>
          b.carry - a.carry
      );

  if (!clubs.length) {
    throw new Error(
      "Kunne ikke finde gyldige Club- og Carry-kolonner i TrackMan-filen."
    );
  }

  return clubs;
}

export function importGarmin(data) {
  const source =
    Array.isArray(data)
      ? data
      : data?.rounds ||
        data?.scorecards ||
        data?.scorecardSummaries ||
        [];

  if (!Array.isArray(source)) {
    throw new Error(
      "Garmin-filen indeholder ikke en gyldig liste med runder."
    );
  }

  const rounds = source
    .map((row, index) => {
      const course = text(
        field(
          row,
          [
            "course",
       
