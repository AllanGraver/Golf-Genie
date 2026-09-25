const DANISH_MONTHS = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  maj: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  okt: "10",
  nov: "11",
  dec: "12"
};

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLines(text) {
  return normalizeText(text)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(
    String(value)
      .replace(",", ".")
      .replace(/[^\d.+-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function roundOne(value) {
  return Number.isFinite(value)
    ? Math.round(value * 10) / 10
    : null;
}

function fractionToPercent(value, total) {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return null;
  }

  return roundOne((value / total) * 100);
}

function parseDanishDate(text) {
  const normalized = normalizeText(text);

  const danishMatch = normalized.match(
    /\b(\d{1,2})\.\s*(jan(?:uar)?|feb(?:ruar)?|mar(?:ts)?|apr(?:il)?|maj|jun(?:i)?|jul(?:i)?|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*(\d{4})\b/i
  );

  if (danishMatch) {
    const day = danishMatch[1].padStart(2, "0");
    const monthKey = danishMatch[2]
      .toLowerCase()
      .slice(0, 3);
    const month = DANISH_MONTHS[monthKey];

    if (month) {
      return `${danishMatch[3]}-${month}-${day}`;
    }
  }

  const numericMatch = normalized.match(
    /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/
  );

  if (numericMatch) {
    const day = numericMatch[1].padStart(2, "0");
    const month = numericMatch[2].padStart(2, "0");

    return `${numericMatch[3]}-${month}-${day}`;
  }

  const isoMatch = normalized.match(
    /\b\d{4}-\d{2}-\d{2}\b/
  );

  return isoMatch ? isoMatch[0] : "";
}

function findCourse(text) {
  const lines = getLines(text);

  const ignored = [
    "scorekort",
    "scorecard",
    "statistik",
    "statistics",
    "stableford",
    "stroke play",
    "slagspil",
    "rediger",
    "edit",
    "garmin",
    "golf",
    "tees",
    "tee"
  ];

  const strongCandidate = lines.find((line) =>
    /(?:golf\s*(?:klub|club)|golfklub|golfclub)/i.test(line) &&
    !/garmin/i.test(line) &&
    line.length >= 5 &&
    line.length <= 100
  );

  if (strongCandidate) {
    return strongCandidate;
  }

  const dateIndex = lines.findIndex(
    (line) => Boolean(parseDanishDate(line))
  );

  if (dateIndex > 0) {
    for (
      let index = dateIndex - 1;
      index >= Math.max(0, dateIndex - 4);
      index -= 1
    ) {
      const line = lines[index];
      const lower = line.toLowerCase();

      if (
        line.length >= 4 &&
        line.length <= 100 &&
        !ignored.includes(lower) &&
        !/^\d+$/.test(line)
      ) {
        return line;
      }
    }
  }

  return "";
}

function findTees(text) {
  return getLines(text).find((line) =>
    /\btees?\b/i.test(line) &&
    !/golf\s*(?:klub|club)/i.test(line) &&
    line.length <= 60
  ) || "";
}

function findScoreAndRelativeToPar(text) {
  const normalized = normalizeText(text)
    .replace(/\n/g, " ");

  const combined = normalized.match(
    /\b(\d{2,3})\s*([+-]\s*\d{1,2})\b/
  );

  if (combined) {
    return {
      score: toNumber(combined[1]),
      relativeToPar: toNumber(
        combined[2].replace(/\s+/g, "")
      )
    };
  }

  const explicitScore = normalized.match(
    /(?:total(?:\s+score)?|score)[^\d]{0,15}(\d{2,3})\b/i
  );

  return {
    score: explicitScore
      ? toNumber(explicitScore[1])
      : null,
    relativeToPar: null
  };
}

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function findFraction(text, labels) {
  const normalized = normalizeText(text)
    .replace(/\n/g, " ");

  const names = labels
    .map(escapeRegex)
    .join("|");

  const valueBeforeLabel = normalized.match(
    new RegExp(
      `(\\d{1,2})\\s*[/|]\\s*(\\d{1,2})\\s*(?:${names})\\b`,
      "i"
    )
  );

  if (valueBeforeLabel) {
    return {
      value: toNumber(valueBeforeLabel[1]),
      total: toNumber(valueBeforeLabel[2])
    };
  }

  const labelBeforeValue = normalized.match(
    new RegExp(
      `(?:${names})[^\\d]{0,15}(\\d{1,2})\\s*[/|]\\s*(\\d{1,2})`,
      "i"
    )
  );

  return labelBeforeValue
    ? {
        value: toNumber(labelBeforeValue[1]),
        total: toNumber(labelBeforeValue[2])
      }
    : {
        value: null,
        total: null
      };
}

function findPutts(text) {
  const normalized = normalizeText(text)
    .replace(/\n/g, " ");

  const valueBeforeLabel = normalized.match(
    /\b(\d{1,3})\s*(?:put|putt|putts|puts)\b/i
  );

  if (valueBeforeLabel) {
    return toNumber(valueBeforeLabel[1]);
  }

  const labelBeforeValue = normalized.match(
    /\b(?:put|putt|putts|puts)\b[^\d]{0,15}(\d{1,3})\b/i
  );

  return labelBeforeValue
    ? toNumber(labelBeforeValue[1])
    : null;
}

function findNineHoleTotals(text) {
  const normalized = normalizeText(text)
    .replace(/\n/g, " ");

  const frontMatch = normalized.match(
    /(?:ud|out|front\s*9)[^\d]{0,12}(\d{2,3})\b/i
  );

  const backMatch = normalized.match(
    /(?:ind|in|back\s*9)[^\d]{0,12}(\d{2,3})\b/i
  );

  return {
    frontNine: frontMatch
      ? toNumber(frontMatch[1])
      : null,
    backNine: backMatch
      ? toNumber(backMatch[1])
      : null
  };
}

function lineNumbers(line, minimum, maximum) {
  return (line.match(/\b\d{1,3}\b/g) || [])
    .map(Number)
    .filter(
      (value) => value >= minimum && value <= maximum
    );
}

function findHoleHeaderIndex(lines, startHole) {
  const expected = Array.from(
    { length: 9 },
    (_, index) => startHole + index
  );

  return lines.findIndex((line) => {
    const numbers = lineNumbers(line, 1, 18);
    const matches = expected.filter(
      (hole) => numbers.includes(hole)
    );

    return matches.length >= 6;
  });
}

function findNineHoleRows(lines, startHole) {
  const headerIndex = findHoleHeaderIndex(
    lines,
    startHole
  );

  if (headerIndex < 0) {
    return {
      pars: [],
      scores: [],
      handicapStrokes: []
    };
  }

  const candidateRows = [];

  for (
    let index = headerIndex + 1;
    index < Math.min(lines.length, headerIndex + 12);
    index += 1
  ) {
    const numbers = lineNumbers(lines[index], 0, 20);

    if (numbers.length >= 9) {
      candidateRows.push({
        lineIndex: index,
        values: numbers.slice(0, 9)
      });
    }
  }

  const parRow = candidateRows.find(({ values }) =>
    values.every(
      (value) => value >= 3 && value <= 6
    )
  );

  const scoreRow = candidateRows.find(({ lineIndex, values }) =>
    lineIndex !== parRow?.lineIndex &&
    values.every(
      (value) => value >= 1 && value <= 20
    )
  );

  return {
    pars: parRow?.values || [],
    scores: scoreRow?.values || [],
    handicapStrokes: []
  };
}

function findHoleData(text) {
  const lines = getLines(text);
  const front = findNineHoleRows(lines, 1);
  const back = findNineHoleRows(lines, 10);

  const holePars = [
    ...front.pars,
    ...back.pars
  ];

  const holes = [
    ...front.scores,
    ...back.scores
  ];

  const holeHandicapStrokes = [
    ...front.handicapStrokes,
    ...back.handicapStrokes
  ];

  return {
    holePars: holePars.length === 18
      ? holePars
      : [],
    holes: holes.length === 18
      ? holes
      : [],
    holeHandicapStrokes:
      holeHandicapStrokes.length === 18
        ? holeHandicapStrokes
        : []
  };
}

function calculateScoringCategories(
  holes,
  holePars
) {
  const result = {
    eaglesOrBetter: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeyPlus: 0,
    completedHoles: 0
  };

  for (let index = 0; index < 18; index += 1) {
    const score = Number(holes[index]);
    const par = Number(holePars[index]);

    if (
      !Number.isFinite(score) ||
      !Number.isFinite(par)
    ) {
      continue;
    }

    result.completedHoles += 1;
    const difference = score - par;

    if (difference <= -2) {
      result.eaglesOrBetter += 1;
    } else if (difference === -1) {
      result.birdies += 1;
    } else if (difference === 0) {
      result.pars += 1;
    } else if (difference === 1) {
      result.bogeys += 1;
    } else {
      result.doubleBogeyPlus += 1;
    }
  }

  return result;
}

function sum(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  return valid.length
    ? valid.reduce(
        (total, value) => total + value,
        0
      )
    : null;
}

function mergeParsedResults(results) {
  const mergedText = results
    .map((result) => result.rawText)
    .join("\n");

  const scoreData = findScoreAndRelativeToPar(
    mergedText
  );

  const fairways = findFraction(
    mergedText,
    ["fairways", "fairway", "fir"]
  );

  const greens = findFraction(
    mergedText,
    ["girs", "gir", "greens in regulation"]
  );

  const nineHoleTotals = findNineHoleTotals(
    mergedText
  );

  const holeData = findHoleData(mergedText);

  const scoring = calculateScoringCategories(
    holeData.holes,
    holeData.holePars
  );

  const calculatedScore =
    holeData.holes.length === 18
      ? sum(holeData.holes)
      : null;

  const calculatedPar =
    holeData.holePars.length === 18
      ? sum(holeData.holePars)
      : null;

  const calculatedFrontNine =
    holeData.holes.length === 18
      ? sum(holeData.holes.slice(0, 9))
      : null;

  const calculatedBackNine =
    holeData.holes.length === 18
      ? sum(holeData.holes.slice(9, 18))
      : null;

  const calculatedRelativeToPar =
    Number.isFinite(calculatedScore) &&
    Number.isFinite(calculatedPar)
      ? calculatedScore - calculatedPar
      : null;

  return {
    course: findCourse(mergedText),
    tees: findTees(mergedText),
    date: parseDanishDate(mergedText),

    score:
      calculatedScore ??
      scoreData.score,

    relativeToPar:
      calculatedRelativeToPar ??
      scoreData.relativeToPar,

    firMade: fairways.value,
    firPossible: fairways.total,
    fir: fractionToPercent(
      fairways.value,
      fairways.total
    ),

    girMade: greens.value,
    girPossible: greens.total,
    gir: fractionToPercent(
      greens.value,
      greens.total
    ),

    putts: findPutts(mergedText),

    frontNine:
      calculatedFrontNine ??
      nineHoleTotals.frontNine,

    backNine:
      calculatedBackNine ??
      nineHoleTotals.backNine,

    holes: holeData.holes,
    holePars: holeData.holePars,
    holeHandicapStrokes:
      holeData.holeHandicapStrokes,

    eaglesOrBetter:
      scoring.completedHoles
        ? scoring.eaglesOrBetter
        : null,

    birdies:
      scoring.completedHoles
        ? scoring.birdies
        : null,

    pars:
      scoring.completedHoles
        ? scoring.pars
        : null,

    bogeys:
      scoring.completedHoles
        ? scoring.bogeys
        : null,

    doubleBogeyPlus:
      scoring.completedHoles
        ? scoring.doubleBogeyPlus
        : null,

    completedHoles:
      scoring.completedHoles,

    rawText: mergedText
  };
}

export function parseGarminOcrText(text) {
  return mergeParsedResults([
    {
      rawText: normalizeText(text)
    }
  ]);
}

export async function recognizeGarminImages(
  files,
  onProgress
) {
  const selectedFiles = Array.from(
    files || []
  );

  if (!selectedFiles.length) {
    throw new Error(
      "Der er ikke valgt nogen billeder."
    );
  }

  if (!window.Tesseract) {
    throw new Error(
      "OCR-biblioteket er ikke indlæst. Kontrollér scriptet i index.html."
    );
  }

  let currentFileIndex = 0;

  const worker = await window.Tesseract.createWorker(
    "dan+eng",
    1,
    {
      logger(message) {
        onProgress?.({
          ...message,
          fileIndex: currentFileIndex + 1,
          fileCount: selectedFiles.length,
          fileName:
            selectedFiles[currentFileIndex]
              ?.name || ""
        });
      }
    }
  );

  try {
    const results = [];

    for (
      currentFileIndex = 0;
      currentFileIndex < selectedFiles.length;
      currentFileIndex += 1
    ) {
      const file = selectedFiles[
        currentFileIndex
      ];

      if (!file.type.startsWith("image/")) {
        throw new Error(
          `${file.name} er ikke en understøttet billedfil.`
        );
      }

      onProgress?.({
        status: "læser billede",
        progress: 0,
        fileIndex: currentFileIndex + 1,
        fileCount: selectedFiles.length,
        fileName: file.name
      });

      const recognition = await worker.recognize(
        file
      );

      results.push({
        fileName: file.name,
        rawText: recognition.data.text || "",
        confidence:
          recognition.data.confidence ?? null
      });
    }

    return {
      ...mergeParsedResults(results),
      images: results.map(
        ({ fileName, confidence }) => ({
          fileName,
          confidence
        })
      )
    };
  } finally {
    await worker.terminate();
  }
}
