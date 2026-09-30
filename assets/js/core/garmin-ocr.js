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
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeGarminOcrWords(text) {
  return normalizeText(text)
    .replace(/\b[Pp][o0]rs\b/g, "Pars")
    .replace(/\b[Bb]og(?:e|c|o)?v?s\b/g, "Bogeys")
    .replace(/\b[Ff]a[i1l]rways?\b/g, "Fairways")
    .replace(/\b[Gg][i1l][Rr][s5]?\b/g, "GIRs")
    .replace(/\b[Pp]u[t7][t5s]?\b/g, "Put")
    .replace(/\b[Oo]p\s*(?:og|&)\s*n[e3]d\b/g, "Op og ned")
    .replace(/dobbelt\s*bog[e3]y/gi, "Dobbeltbogey");
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


function findGarminStatisticsSummary(text) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const first = patterns => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) return toNumber(match[1]);
    }
    return null;
  };
  return {
    pars: first([/(?:^|\s)(\d{1,2})\s+pars?\b/i, /\bpars?\b[^\d]{0,12}(\d{1,2})\b/i]),
    bogeys: first([/(?:^|\s)(\d{1,2})\s+bogeys?\b/i, /\bbogeys?\b[^\d]{0,12}(\d{1,2})\b/i]),
    doubleBogeyPlus: first([/(?:^|\s)(\d{1,2})\s+dobbelt\s*bogey(?:s)?\s+eller\s+værre\b/i, /(?:dobbelt\s*bogey(?:s)?\s+eller\s+værre)[^\d]{0,12}(\d{1,2})\b/i]),
    upAndDown: findFraction(normalized, ["op og ned", "op & ned", "up and down", "up & down"])
  };
}

function mergeParsedResults(results) {
  const originalText = results
    .map((result) => result.rawText)
    .join("\n");
  const mergedText = normalizeGarminOcrWords(originalText);

  const statisticsSummary = findGarminStatisticsSummary(mergedText);
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
    upAndDownMade: statisticsSummary.upAndDown.value,
    upAndDownPossible: statisticsSummary.upAndDown.total,
    upAndDown: fractionToPercent(statisticsSummary.upAndDown.value, statisticsSummary.upAndDown.total),

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
        : statisticsSummary.pars,

    bogeys:
      scoring.completedHoles
        ? scoring.bogeys
        : statisticsSummary.bogeys,

    doubleBogeyPlus:
      scoring.completedHoles
        ? scoring.doubleBogeyPlus
        : statisticsSummary.doubleBogeyPlus,

    completedHoles:
      scoring.completedHoles,

    rawText: originalText,
    normalizedText: mergedText
  };
}

export function parseGarminOcrText(text) {
  return mergeParsedResults([
    {
      rawText: normalizeText(text)
    }
  ]);
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
    } catch (error) {
      console.warn("createImageBitmap fallback:", error);
    }
  }
  const url = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Kunne ikke åbne ${file.name}.`));
    element.src = url;
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}
function enhanceCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray = 0.299 * imageData.data[index] + 0.587 * imageData.data[index + 1] + 0.114 * imageData.data[index + 2];
    const value = Math.max(0, Math.min(255, (gray - 128) * 1.38 + 136));
    imageData.data[index] = value;
    imageData.data[index + 1] = value;
    imageData.data[index + 2] = value;
    imageData.data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}
async function preprocessGarminImage(file, report) {
  report?.({ status: "optimerer billede", progress: 0.05 });
  const loaded = await loadImageSource(file);
  try {
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(loaded.width, loaded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(loaded.width * scale));
    canvas.height = Math.max(1, Math.round(loaded.height * scale));
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.source, 0, 0, canvas.width, canvas.height);
    report?.({ status: "forbedrer kontrast", progress: 0.1 });
    return enhanceCanvas(canvas);
  } finally {
    loaded.close();
  }
}
function hasUsefulStatistics(parsed) {
  return [parsed.firMade, parsed.girMade, parsed.putts, parsed.pars, parsed.bogeys, parsed.doubleBogeyPlus, parsed.upAndDownMade]
    .filter(value => Number.isFinite(Number(value))).length >= 4;
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

  await worker.setParameters({
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1",
    user_defined_dpi: "180"
  });

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

      const optimizedImage = await preprocessGarminImage(file, message => onProgress?.({
        ...message,
        fileIndex: currentFileIndex + 1,
        fileCount: selectedFiles.length,
        fileName: file.name
      }));

      let recognition = await worker.recognize(optimizedImage);
      const firstParsed = parseGarminOcrText(recognition.data.text || "");
      if (!hasUsefulStatistics(firstParsed)) {
        await worker.setParameters({ tessedit_pageseg_mode: "11" });
        const sparse = await worker.recognize(optimizedImage);
        const sparseParsed = parseGarminOcrText(sparse.data.text || "");
        if (hasUsefulStatistics(sparseParsed) || (sparse.data.confidence ?? 0) > (recognition.data.confidence ?? 0)) {
          recognition = sparse;
        }
        await worker.setParameters({ tessedit_pageseg_mode: "6" });
      }

      results.push({
        fileName: file.name,
        rawText: recognition.data.text || "",
        confidence: recognition.data.confidence ?? null,
        optimizedWidth: optimizedImage.width,
        optimizedHeight: optimizedImage.height
      });
    }

    return {
      ...mergeParsedResults(results),
      images: results.map(
        ({ fileName, confidence, optimizedWidth, optimizedHeight }) => ({
          fileName,
          confidence,
          optimizedWidth,
          optimizedHeight
        })
      )
    };
  } finally {
    await worker.terminate();
  }
}
