import {
  card,
  metric,
  pageHeader,
  sourceBadge
} from "../components/ui.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function numericValues(values) {
  return values
    .map(Number)
    .filter(Number.isFinite);
}

function average(values) {
  const valid = numericValues(values);

  if (!valid.length) {
    return null;
  }

  const result = valid.reduce(
    (sum, value) => sum + value,
    0
  ) / valid.length;

  return Number(result.toFixed(1));
}

function minimum(values) {
  const valid = numericValues(values);
  return valid.length ? Math.min(...valid) : null;
}

function calculatePercentage(made, possible) {
  const madeNumber = Number(made);
  const possibleNumber = Number(possible);

  if (
    !Number.isFinite(madeNumber) ||
    !Number.isFinite(possibleNumber) ||
    possibleNumber <= 0
  ) {
    return null;
  }

  return Number(
    ((madeNumber / possibleNumber) * 100).toFixed(1)
  );
}

function formatNumber(value, suffix = "") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "–";
  }

  return `${String(value).replace(".", ",")}${suffix}`;
}

function formatRelativeToPar(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "–";
  }

  if (number === 0) {
    return "E";
  }

  return number > 0 ? `+${number}` : String(number);
}

function normalizeCourseName(value) {
  return String(value || "Ukendt bane")
    .trim()
    .replace(/\s+/g, " ");
}

function createCourseKey(value) {
  return normalizeCourseName(value)
    .toLocaleLowerCase("da-DK")
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sortRoundsByDate(rounds) {
  return [...rounds].sort(
    (a, b) =>
      String(b.date || "").localeCompare(
        String(a.date || "")
      )
  );
}

function getRoundId(round, index) {
  return String(
    round.id ||
    [
      round.course || "course",
      round.date || "date",
      round.score ?? index
    ].join("-")
  );
}

function createHoleValues(round, property) {
  const existing = Array.isArray(round[property])
    ? round[property]
    : [];

  return Array.from({ length: 18 }, (_, index) => {
    const value = Number(existing[index]);
    return Number.isFinite(value) ? value : "";
  });
}

function calculateScoringCategories(round) {
  const scores = Array.isArray(round.holes)
    ? round.holes
    : [];

  const pars = Array.isArray(round.holePars)
    ? round.holePars
    : [];

  const result = {
    eaglesOrBetter: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeyPlus: 0,
    completedHoles: 0
  };

  for (let index = 0; index < 18; index += 1) {
    const score = Number(scores[index]);
    const par = Number(pars[index]);

    if (!Number.isFinite(score) || !Number.isFinite(par)) {
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

function numberInput({
  id,
  label,
  value,
  min,
  max,
  step = "1",
  dataField = "",
  readOnly = false
}) {
  return `
    <div class="round-edit__field">
      <label for="${escapeAttribute(id)}">
        ${escapeHtml(label)}
      </label>

      <input
        id="${escapeAttribute(id)}"
        type="number"
        inputmode="${step === "1" ? "numeric" : "decimal"}"
        step="${escapeAttribute(step)}"
        ${min !== undefined ? `min="${min}"` : ""}
        ${max !== undefined ? `max="${max}"` : ""}
        ${dataField ? `data-round-field="${escapeAttribute(dataField)}"` : ""}
        value="${escapeAttribute(value ?? "")}"
        ${readOnly ? "readonly" : ""}
      >
    </div>
  `;
}

function renderHoleInputs(roundId, round) {
  const pars = createHoleValues(round, "holePars");
  const scores = createHoleValues(round, "holes");
  const handicapStrokes = createHoleValues(
    round,
    "holeHandicapStrokes"
  );

  return `
    <fieldset class="round-edit__section">
      <legend>Huldata</legend>

      <p class="text-muted">
        Indtast par, brugte slag og tildelte handicapslag for hvert hul.
        Birdies, pars, bogeys og double eller værre beregnes automatisk.
      </p>

      <div class="hole-editor-grid">
        ${Array.from({ length: 18 }, (_, index) => `
          <div class="hole-editor-card">
            <strong class="hole-editor-card__title">
              Hul ${index + 1}
            </strong>

            <label
              for="round-${escapeAttribute(roundId)}-par-${index + 1}"
            >
              Par
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-par-${index + 1}"
              type="number"
              inputmode="numeric"
              min="3"
              max="6"
              step="1"
              data-round-hole-par="${index}"
              value="${escapeAttribute(pars[index])}"
            >

            <label
              for="round-${escapeAttribute(roundId)}-score-${index + 1}"
            >
              Slag
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-score-${index + 1}"
              type="number"
              inputmode="numeric"
              min="1"
              max="20"
              step="1"
              data-round-hole="${index}"
              value="${escapeAttribute(scores[index])}"
            >

            <label
              for="round-${escapeAttribute(roundId)}-hcp-${index + 1}"
            >
              HCP-slag
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-hcp-${index + 1}"
              type="number"
              inputmode="numeric"
              min="0"
              max="5"
              step="1"
              data-round-hole-handicap="${index}"
              value="${escapeAttribute(handicapStrokes[index])}"
            >
          </div>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function renderEditForm(round, roundId) {
  const calculatedFir = calculatePercentage(
    round.firMade,
    round.firPossible
  );

  const calculatedGir = calculatePercentage(
    round.girMade,
    round.girPossible
  );

  const scoring = calculateScoringCategories(round);

  return `
    <form
      class="round-edit"
      data-round-edit-form="${escapeAttribute(roundId)}"
      novalidate
    >
      <div class="round-edit__heading">
        <div>
          <p class="eyebrow">REDIGER RUNDE</p>
          <h3 class="card-title">
            ${escapeHtml(round.course || "Ukendt bane")}
          </h3>
        </div>
      </div>

      <fieldset class="round-edit__section">
        <legend>Rundeoplysninger</legend>

        <div class="round-edit__grid">
          <div class="round-edit__field round-edit__field--wide">
            <label for="round-${escapeAttribute(roundId)}-course">
              Bane
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-course"
              type="text"
              data-round-field="course"
              value="${escapeAttribute(round.course || "")}"
              required
            >
          </div>

          <div class="round-edit__field">
            <label for="round-${escapeAttribute(roundId)}-tees">
              Teested
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-tees"
              type="text"
              data-round-field="tees"
              value="${escapeAttribute(round.tees || "")}"
            >
          </div>

          <div class="round-edit__field">
            <label for="round-${escapeAttribute(roundId)}-date">
              Dato
            </label>

            <input
              id="round-${escapeAttribute(roundId)}-date"
              type="date"
              data-round-field="date"
              value="${escapeAttribute(round.date || "")}"
              required
            >
          </div>
        </div>
      </fieldset>

      <fieldset class="round-edit__section">
        <legend>Score</legend>

        <div class="round-edit__grid">
          ${numberInput({
            id: `round-${roundId}-score`,
            label: "Samlet score",
            value: round.score,
            min: 1,
            max: 250,
            dataField: "score"
          })}

          ${numberInput({
            id: `round-${roundId}-relative`,
            label: "I forhold til par",
            value: round.relativeToPar,
            min: -30,
            max: 100,
            dataField: "relativeToPar"
          })}

          ${numberInput({
            id: `round-${roundId}-points`,
            label: "Stableford-point",
            value: round.points,
            min: 0,
            max: 100,
            dataField: "points"
          })}

          ${numberInput({
            id: `round-${roundId}-front-nine`,
            label: "Front 9",
            value: round.frontNine,
            min: 1,
            max: 125,
            dataField: "frontNine"
          })}

          ${numberInput({
            id: `round-${roundId}-back-nine`,
            label: "Back 9",
            value: round.backNine,
            min: 1,
            max: 125,
            dataField: "backNine"
          })}
        </div>
      </fieldset>

      <fieldset class="round-edit__section">
        <legend>Fairways og greens</legend>

        <p class="text-muted">
          FIR og GIR beregnes automatisk ud fra antal ramte og mulige.
        </p>

        <div class="round-edit__grid">
          ${numberInput({
            id: `round-${roundId}-fir-made`,
            label: "Fairways ramt",
            value: round.firMade,
            min: 0,
            max: 18,
            dataField: "firMade"
          })}

          ${numberInput({
            id: `round-${roundId}-fir-possible`,
            label: "Mulige fairways",
            value: round.firPossible,
            min: 0,
            max: 18,
            dataField: "firPossible"
          })}

          ${numberInput({
            id: `round-${roundId}-fir-calculated`,
            label: "Beregnet FIR %",
            value: calculatedFir,
            min: 0,
            max: 100,
            step: "0.1",
            readOnly: true
          })}

          ${numberInput({
            id: `round-${roundId}-gir-made`,
            label: "Greens ramt",
            value: round.girMade,
            min: 0,
            max: 18,
            dataField: "girMade"
          })}

          ${numberInput({
            id: `round-${roundId}-gir-possible`,
            label: "Mulige greens",
            value: round.girPossible,
            min: 0,
            max: 18,
            dataField: "girPossible"
          })}

          ${numberInput({
            id: `round-${roundId}-gir-calculated`,
            label: "Beregnet GIR %",
            value: calculatedGir,
            min: 0,
            max: 100,
            step: "0.1",
            readOnly: true
          })}
        </div>
      </fieldset>

      <fieldset class="round-edit__section">
        <legend>Putting</legend>

        <div class="round-edit__grid">
          ${numberInput({
            id: `round-${roundId}-putts`,
            label: "Antal putts",
            value: round.putts,
            min: 0,
            max: 100,
            dataField: "putts"
          })}
        </div>
      </fieldset>

      <fieldset class="round-edit__section">
        <legend>Beregnet scoreresultat</legend>

        <div class="metric-grid metric-grid--3">
          ${metric("Eagle eller bedre", scoring.eaglesOrBetter)}
          ${metric("Birdies", scoring.birdies)}
          ${metric("Pars", scoring.pars)}
          ${metric("Bogeys", scoring.bogeys)}
          ${metric("Double eller værre", scoring.doubleBogeyPlus)}
          ${metric("Huller beregnet", scoring.completedHoles)}
        </div>
      </fieldset>

      ${renderHoleInputs(roundId, round)}

      <div
        class="round-edit__validation"
        data-round-validation="${escapeAttribute(roundId)}"
        hidden
      ></div>

      <div class="round-actions">
        <button
          class="button button--outline cancel-round-edit"
          data-round-id="${escapeAttribute(roundId)}"
          type="button"
        >
          Annuller
        </button>

        <button
          class="button button--accent save-round-edit"
          data-round-id="${escapeAttribute(roundId)}"
          type="button"
        >
          Gem ændringer
        </button>
      </div>
    </form>
  `;
}

function getRoundStatistics(round) {
  const scoring = calculateScoringCategories(round);

  return {
    fir: calculatePercentage(
      round.firMade,
      round.firPossible
    ) ?? round.fir ?? null,

    gir: calculatePercentage(
      round.girMade,
      round.girPossible
    ) ?? round.gir ?? null,

    pars: scoring.completedHoles
      ? scoring.pars
      : round.pars ?? null,

    bogeys: scoring.completedHoles
      ? scoring.bogeys
      : round.bogeys ?? null,

    doubleBogeyPlus: scoring.completedHoles
      ? scoring.doubleBogeyPlus
      : round.doubleBogeyPlus ?? null,

    birdies: scoring.completedHoles
      ? scoring.birdies
      : round.birdies ?? null
  };
}

function renderRoundDetails(round) {
  const stats = getRoundStatistics(round);

  return `
    <div class="round-history__metrics">
      ${metric("FIR", stats.fir != null ? formatNumber(stats.fir, "%") : "–")}
      ${metric("GIR", stats.gir != null ? formatNumber(stats.gir, "%") : "–")}
      ${metric("Putts", formatNumber(round.putts))}
      ${metric("Front 9", formatNumber(round.frontNine))}
      ${metric("Back 9", formatNumber(round.backNine))}
      ${metric("Birdies", formatNumber(stats.birdies))}
      ${metric("Pars", formatNumber(stats.pars))}
      ${metric("Bogeys", formatNumber(stats.bogeys))}
      ${metric("Double+", formatNumber(stats.doubleBogeyPlus))}
    </div>
  `;
}

function renderRoundHistory(round, roundId, isEditing) {
  if (isEditing) {
    return `
      <article class="round-history round-history--editing">
        ${renderEditForm(round, roundId)}
      </article>
    `;
  }

  return `
    <article class="round-history">
      <div class="round-history__header">
        <div>
          <strong>${escapeHtml(round.date || "Ukendt dato")}</strong>

          ${round.tees ? `
            <p class="text-muted">
              ${escapeHtml(round.tees)}
            </p>
          ` : ""}
        </div>

        <div class="round-history__score">
          ${formatNumber(round.score)}
          <small>${formatRelativeToPar(round.relativeToPar)}</small>
        </div>
      </div>

      ${renderRoundDetails(round)}

      <div class="round-actions">
        <button
          class="button button--outline edit-round"
          data-round-id="${escapeAttribute(roundId)}"
          type="button"
        >
          Rediger
        </button>

        <button
          class="button button--danger delete-round"
          data-round-id="${escapeAttribute(roundId)}"
          type="button"
        >
          Slet
        </button>
      </div>
    </article>
  `;
}

function renderCourseCard(state, course, rounds) {
  const sortedRounds = sortRoundsByDate(rounds);
  const latest = sortedRounds[0];
  const courseKey = createCourseKey(course);

  const note =
    state.courseNotes?.[course] ??
    state.courseNotes?.[courseKey] ??
    "";

  const statistics = rounds.map(getRoundStatistics);

  const avgScore = average(
    rounds.map((round) => round.score)
  );

  const bestScore = minimum(
    rounds.map((round) => round.score)
  );

  const avgFir = average(
    statistics.map((stats) => stats.fir)
  );

  const avgGir = average(
    statistics.map((stats) => stats.gir)
  );

  const avgPutts = average(
    rounds.map((round) => round.putts)
  );

  const avgFrontNine = average(
    rounds.map((round) => round.frontNine)
  );

  const avgBackNine = average(
    rounds.map((round) => round.backNine)
  );

  const avgPars = average(
    statistics.map((stats) => stats.pars)
  );

  const avgBogeys = average(
    statistics.map((stats) => stats.bogeys)
  );

  const avgDoubleBogeyPlus = average(
    statistics.map((stats) => stats.doubleBogeyPlus)
  );

  return card(`
    <div class="course-summary">
      <div class="course-summary__header">
        <div>
          ${sourceBadge("Garmin")}

          <h2 class="card-title">
            ${escapeHtml(course)}
          </h2>

          <p class="text-muted">
            ${rounds.length} ${rounds.length === 1 ? "runde" : "runder"}
          </p>
        </div>

        <div class="round-card__score">
          ${formatNumber(avgScore)}
          <small>Gns.</small>
        </div>
      </div>

      <div class="metric-grid">
        ${metric("Bedste score", formatNumber(bestScore))}
        ${metric("Seneste score", formatNumber(latest?.score))}
      </div>

      <div class="metric-grid metric-grid--3">
        ${metric("FIR", avgFir != null ? formatNumber(avgFir, "%") : "–")}
        ${metric("GIR", avgGir != null ? formatNumber(avgGir, "%") : "–")}
        ${metric("Putts", formatNumber(avgPutts))}
      </div>

      <div class="metric-grid">
        ${metric("Front 9", formatNumber(avgFrontNine))}
        ${metric("Back 9", formatNumber(avgBackNine))}
      </div>

      <div class="metric-grid metric-grid--3">
        ${metric("Pars", formatNumber(avgPars))}
        ${metric("Bogeys", formatNumber(avgBogeys))}
        ${metric("Double+", formatNumber(avgDoubleBogeyPlus))}
      </div>

      <p class="text-muted">
        Seneste runde: ${escapeHtml(latest?.date || "–")}
      </p>

      <div class="course-note-section">
        <label for="course-note-${escapeAttribute(courseKey)}">
          Banenoter
        </label>

        <textarea
          id="course-note-${escapeAttribute(courseKey)}"
          class="course-note"
          rows="4"
          data-course="${escapeAttribute(course)}"
          placeholder="Skriv strategi, køllevalg eller erfaringer fra banen..."
        >${escapeHtml(note)}</textarea>

        <button
          class="button button--outline save-course-note"
          data-course="${escapeAttribute(course)}"
          type="button"
        >
          Gem banenote
        </button>
      </div>

      <div class="round-history-list">
        <h3 class="card-title">Historik</h3>

        ${sortedRounds.map((round, index) => {
          const roundId = getRoundId(round, index);
          const isEditing =
            String(state.editRoundId || "") === roundId;

          return renderRoundHistory(
            round,
            roundId,
            isEditing
          );
        }).join("")}
      </div>
    </div>
  `);
}

export function roundsPage(state) {
  const rounds = Array.isArray(state.rounds)
    ? state.rounds
    : [];

  if (!rounds.length) {
    return `
      <div class="page">
        ${pageHeader(
          "GARMIN GOLF",
          "Mine baner",
          "Ingen runder importeret endnu"
        )}

        ${card(`
          <div class="empty-state">
            <h2 class="card-title">
              Importér din første runde
            </h2>

            <p class="text-muted">
              Gå til Data og importér dine Garmin Golf-billeder.
            </p>

            <button
              class="button button--accent button--full"
              data-page="data"
              type="button"
            >
              Gå til import
            </button>
          </div>
        `)}
      </div>
    `;
  }

  const groupedCourses = new Map();

  rounds.forEach((round) => {
    const course = normalizeCourseName(round.course);
    const courseKey = createCourseKey(course);

    if (!groupedCourses.has(courseKey)) {
      groupedCourses.set(courseKey, {
        course,
        rounds: []
      });
    }

    groupedCourses.get(courseKey).rounds.push(round);
  });

  const courses = Array.from(
    groupedCourses.values()
  ).sort(
    (a, b) => a.course.localeCompare(
      b.course,
      "da-DK"
    )
  );

  return `
    <div class="page">
      ${pageHeader(
        "GARMIN GOLF",
        "Mine baner",
        `${rounds.length} ${rounds.length === 1 ? "runde" : "runder"} på ${courses.length} ${courses.length === 1 ? "bane" : "baner"}`
      )}

      ${courses.map(
        ({ course, rounds: courseRounds }) =>
          renderCourseCard(
            state,
            course,
            courseRounds
          )
      ).join("")}
    </div>
  `;
}
