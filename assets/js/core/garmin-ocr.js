const DANISH_MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", maj: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", okt: "10", nov: "11", dec: "12"
};

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLines(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", ".").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundOne(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function fractionToPercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return null;
  return roundOne((value / total) * 100);
}

function parseDanishDate(text) {
  const normalized = normalizeText(text);
  const danishMatch = normalized.match(
    /\b(\d{1,2})\.\s*(jan(?:uar)?|feb(?:ruar)?|mar(?:ts)?|apr(?:il)?|maj|jun(?:i)?|jul(?:i)?|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*(\d{4})\b/i
  );

  if (danishMatch) {
    const day = danishMatch[1].padStart(2, "0");
    const month = DANISH_MONTHS[danishMatch[2].toLowerCase().slice(0, 3)];
    if (month) return `${danishMatch[3]}-${month}-${day}`;
  }

  const numericMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (numericMatch) {
    return `${numericMatch[3]}-${numericMatch[2].padStart(2, "0")}-${numericMatch[1].padStart(2, "0")}`;
  }

  const isoMatch = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return isoMatch ? isoMatch[0] : "";
}

function findCourse(text) {
  const lines = getLines(text);
  const ignored = ["scorekort", "scorecard", "statistik", "statistics", "stableford", "stroke play", "slagspil", "rediger", "edit", "garmin", "golf", "tees", "tee"];
  const strong = lines.find((line) =>
    /(?:golf\s*(?:klub|club)|golfklub|golfclub)/i.test(line) &&
    !/garmin/i.test(line) && line.length >= 5 && line.length <= 100
  );
  if (strong) return strong;

  const dateIndex = lines.findIndex((line) => Boolean(parseDanishDate(line)));
  if (dateIndex > 0) {
    for (let index = dateIndex - 1; index >= Math.max(0, dateIndex - 4); index -= 1) {
      const line = lines[index];
      const lower = line.toLowerCase();
      if (line.length >= 4 && line.length <= 100 && !ignored.includes(lower) && !/^\d+$/.test(line)) return line;
    }
  }
  return "";
}

function findTees(text) {
  return getLines(text).find((line) =>
    /\btees?\b/i.test(line) && !/golf\s*(?:klub|club)/i.test(line) && line.length <= 60
  ) || "";
}

function findScoreAndRelativeToPar(text) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const combined = normalized.match(/\b(\d{2,3})\s*([+-]\s*\d{1,2})\b/);
  if (combined) {
    return { score: toNumber(combined[1]), relativeToPar: toNumber(combined[2].replace(/\s+/g, "")) };
  }
  const score = normalized.match(/(?:total(?:\s+score)?|score)[^\d]{0,15}(\d{2,3})\b/i);
  return { score: score ? toNumber(score[1]) : null, relativeToPar: null };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFraction(text, labels) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const names = labels.map(escapeRegex).join("|");
  const after = normalized.match(new RegExp(`(\\d{1,2})\\s*[/|]\\s*(\\d{1,2})\\s*(?:${names})\\b`, "i"));
  if (after) return { value: toNumber(after[1]), total: toNumber(after[2]) };
  const before = normalized.match(new RegExp(`(?:${names})[^\\d]{0,15}(\\d{1,2})\\s*[/|]\\s*(\\d{1,2})`, "i"));
  return before
    ? { value: toNumber(before[1]), total: toNumber(before[2]) }
    : { value: null, total: null };
}

function findPutts(text) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const before = normalized.match(/\b(\d{1,3})\s*(?:put|putt|putts|puts)\b/i);
  if (before) return toNumber(before[1]);
  const after = normalized.match(/\b(?:put|putt|putts|puts)\b[^\d]{0,15}(\d{1,3})\b/i);
  return after ? toNumber(after[1]) : null;
}

function findCategoryCount(text, labels) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const names = labels.map(escapeRegex).join("|");
  const before = normalized.match(new RegExp(`\\b(\\d{1,2})\\s*(?:${names})\\b`, "i"));
  if (before) return toNumber(before[1]);
  const after = normalized.match(new RegExp(`\\b(?:${names})\\b[^\\d]{0,15}(\\d{1,2})`, "i"));
  return after ? toNumber(after[1]) : null;
}

function findNineHoleTotals(text) {
  const normalized = normalizeText(text).replace(/\n/g, " ");
  const front = normalized.match(/(?:ud|out|front\s*9)[^\d]{0,12}(\d{2,3})\b/i);
  const back = normalized.match(/(?:ind|in|back\s*9)[^\d]{0,12}(\d{2,3})\b/i);
  return { frontNine: front ? toNumber(front[1]) : null, backNine: back ? toNumber(back[1]) : null };
}

function findHoleScores(text) {
  const lines = getLines(text);
  const results = [];

  for (let start = 1; start <= 10; start += 9) {
    const holes = Array.from({ length: 9 }, (_, index) => String(start + index));
    const headerIndex = lines.findIndex((line) =>
      holes.filter((hole) => new RegExp(`(?:^|\\s)${hole}(?:\\s|$)`).test(line)).length >= 6
    );
    if (headerIndex < 0) continue;

    for (let index = headerIndex + 1; index < Math.min(lines.length, headerIndex + 8); index += 1) {
      const numbers = lines[index].match(/\b\d{1,2}\b/g)?.map(Number).filter((value) => value >= 1 && value <= 15);
      if (numbers?.length >= 9) {
        results.push(...numbers.slice(0, 9));
        break;
      }
    }
  }

  return results.length === 18 ? results : [];
}

function mergeParsedResults(results) {
  const mergedText = results.map((result) => result.rawText).join("\n");
  const scoreData = findScoreAndRelativeToPar(mergedText);
  const fairways = findFraction(mergedText, ["fairways", "fairway", "fir"]);
  const greens = findFraction(mergedText, ["girs", "gir", "greens in regulation"]);
  const upAndDown = findFraction(mergedText, ["op og ned", "up and down", "up & down"]);
  const nine = findNineHoleTotals(mergedText);

  return {
    course: findCourse(mergedText),
    tees: findTees(mergedText),
    date: parseDanishDate(mergedText),
    score: scoreData.score,
    relativeToPar: scoreData.relativeToPar,
    fir: fractionToPercent(fairways.value, fairways.total),
    firMade: fairways.value,
    firPossible: fairways.total,
    gir: fractionToPercent(greens.value, greens.total),
    girMade: greens.value,
    girPossible: greens.total,
    putts: findPutts(mergedText),
    upAndDown: fractionToPercent(upAndDown.value, upAndDown.total),
    upAndDownMade: upAndDown.value,
    upAndDownPossible: upAndDown.total,
    pars: findCategoryCount(mergedText, ["pars", "par"]),
    bogeys: findCategoryCount(mergedText, ["bogeys", "bogey"]),
    doubleBogeyPlus: findCategoryCount(mergedText, ["dobbeltbogey eller værre", "double bogey or worse", "double bogeys"]),
    frontNine: nine.frontNine,
    backNine: nine.backNine,
    holes: findHoleScores(mergedText),
    rawText: mergedText
  };
}

export function parseGarminOcrText(text) {
  return mergeParsedResults([{ rawText: normalizeText(text) }]);
}

export async function recognizeGarminImages(files, onProgress) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) throw new Error("Der er ikke valgt nogen billeder.");
  if (!window.Tesseract) throw new Error("OCR-biblioteket er ikke indlæst. Kontrollér scriptet i index.html.");

  let currentFileIndex = 0;
  const worker = await window.Tesseract.createWorker("dan+eng", 1, {
    logger(message) {
      onProgress?.({
        ...message,
        fileIndex: currentFileIndex + 1,
        fileCount: selectedFiles.length,
        fileName: selectedFiles[currentFileIndex]?.name || ""
      });
    }
  });

  try {
    const results = [];
    for (currentFileIndex = 0; currentFileIndex < selectedFiles.length; currentFileIndex += 1) {
      const file = selectedFiles[currentFileIndex];
      if (!file.type.startsWith("image/")) throw new Error(`${file.name} er ikke en understøttet billedfil.`);

      onProgress?.({
        status: "læser billede",
        progress: 0,
        fileIndex: currentFileIndex + 1,
        fileCount: selectedFiles.length,
        fileName: file.name
      });

      const recognition = await worker.recognize(file);
      results.push({
        fileName: file.name,
        rawText: recognition.data.text || "",
        confidence: recognition.data.confidence ?? null
      });
    }

    return {
      ...mergeParsedResults(results),
      images: results.map(({ fileName, confidence }) => ({ fileName, confidence }))
    };
  } finally {
    await worker.terminate();
  }
}
