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

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function average(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function roundOne(value) {
  return Number.isFinite(value)
    ? Math.round(value * 10) / 10
    : null;
}

function formatNumber(value, suffix = "") {
  if (!Number.isFinite(Number(value))) {
    return "–";
  }

  return `${String(roundOne(Number(value))).replace(".", ",")}${suffix}`;
}

function calculatePercentage(made, possible, fallback) {
  const madeNumber = Number(made);
  const possibleNumber = Number(possible);

  if (
    Number.isFinite(madeNumber) &&
    Number.isFinite(possibleNumber) &&
    possibleNumber > 0
  ) {
    return (madeNumber / possibleNumber) * 100;
  }

  const fallbackNumber = Number(fallback);
  return Number.isFinite(fallbackNumber) ? fallbackNumber : null;
}

function getRecentRounds(rounds, limit = 10) {
  return [...rounds]
    .sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    )
    .slice(0, limit);
}

function roundStatistics(round) {
  return {
    fir: calculatePercentage(
      round.firMade,
      round.firPossible,
      round.fir
    ),
    gir: calculatePercentage(
      round.girMade,
      round.girPossible,
      round.gir
    ),
    putts: Number.isFinite(Number(round.putts))
      ? Number(round.putts)
      : null,
    doubleBogeyPlus: Number.isFinite(Number(round.doubleBogeyPlus))
      ? Number(round.doubleBogeyPlus)
      : null,
    bogeys: Number.isFinite(Number(round.bogeys))
      ? Number(round.bogeys)
      : null,
    pars: Number.isFinite(Number(round.pars))
      ? Number(round.pars)
      : null,
    birdies: Number.isFinite(Number(round.birdies))
      ? Number(round.birdies)
      : null
  };
}

function clubNameKey(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]/g, "");
}

function findClub(clubs, patterns) {
  return clubs.find((club) => {
    const name = clubNameKey(club.name);
    return patterns.some((pattern) => name.includes(pattern));
  }) || null;
}

function sortClubsByCarry(clubs) {
  return [...clubs]
    .filter((club) => Number.isFinite(Number(club.carry)))
    .sort((a, b) => Number(b.carry) - Number(a.carry));
}

function calculateBagGaps(clubs) {
  const sorted = sortClubsByCarry(clubs);

  return sorted.slice(0, -1).map((club, index) => ({
    from: club,
    to: sorted[index + 1],
    gap: Number(club.carry) - Number(sorted[index + 1].carry)
  }));
}

function calculateSkills(rounds, clubs) {
  const recentRounds = getRecentRounds(rounds);
  const stats = recentRounds.map(roundStatistics);

  const fir = average(stats.map((item) => item.fir));
  const gir = average(stats.map((item) => item.gir));
  const putts = average(stats.map((item) => item.putts));
  const doubles = average(stats.map((item) => item.doubleBogeyPlus));

  const driver = findClub(clubs, ["driver"]);
  const validDispersion = clubs
    .map((club) => Number(club.dispersion))
    .filter(Number.isFinite);
  const averageDispersion = average(validDispersion);

  const gaps = calculateBagGaps(clubs);
  const problematicGaps = gaps.filter(
    ({ gap }) => gap < 7 || gap > 20
  ).length;

  const drivingFromFir = fir === null ? 60 : fir;
  const driverControl = driver && Number.isFinite(Number(driver.dispersion))
    ? clamp(110 - Number(driver.dispersion) * 2)
    : drivingFromFir;

  const driving = clamp(
    drivingFromFir * 0.65 + driverControl * 0.35
  );

  const approach = gir === null
    ? 60
    : clamp(gir * 1.7);

  const putting = putts === null
    ? 60
    : clamp(100 - Math.max(0, putts - 28) * 6);

  const scoring = doubles === null
    ? 60
    : clamp(100 - doubles * 12);

  const distanceControl = averageDispersion === null
    ? 60
    : clamp(110 - averageDispersion * 2.3);

  const bagStructure = gaps.length
    ? clamp(100 - problematicGaps * 14)
    : 60;

  return {
    recentRounds,
    averages: {
      fir,
      gir,
      putts,
      doubles
    },
    scores: {
      driving: Math.round(driving),
      approach: Math.round(approach),
      putting: Math.round(putting),
      scoring: Math.round(scoring),
      distanceControl: Math.round(distanceControl),
      bagStructure: Math.round(bagStructure)
    },
    driver,
    gaps,
    averageDispersion
  };
}

function trainingScore(scores) {
  return Math.round(
    (
      scores.driving +
      scores.approach +
      scores.putting +
      scores.scoring +
      scores.distanceControl +
      scores.bagStructure
    ) / 6
  );
}

function scoreLabel(score) {
  if (score >= 90) return "Fremragende";
  if (score >= 80) return "Meget god";
  if (score >= 70) return "God";
  if (score >= 60) return "Udvikling";
  return "Prioriteret fokus";
}

function createFocusAreas(analysis) {
  const candidates = [
    {
      key: "approach",
      title: "Approach-spil",
      score: analysis.scores.approach,
      value: `GIR ${formatNumber(analysis.averages.gir, "%")}`,
      reason: "Arbejd med startretning og carry-kontrol mod green."
    },
    {
      key: "driving",
      title: "Driver-kontrol",
      score: analysis.scores.driving,
      value: analysis.driver
        ? `${formatNumber(analysis.driver.dispersion, " m")} spredning`
        : `FIR ${formatNumber(analysis.averages.fir, "%")}`,
      reason: "Prioritér centertræf, tempo og en tydelig fairway-korridor."
    },
    {
      key: "putting",
      title: "Putting",
      score: analysis.scores.putting,
      value: `${formatNumber(analysis.averages.putts)} putts`,
      reason: "Træn startlinje og hastighed fra 2-5 meter."
    },
    {
      key: "scoring",
      title: "Skadesbegrænsning",
      score: analysis.scores.scoring,
      value: `${formatNumber(analysis.averages.doubles)} double+`,
      reason: "Reducer store fejl med konservative mål og sikkert næste slag."
    },
    {
      key: "distance",
      title: "Længdekontrol",
      score: analysis.scores.distanceControl,
      value: `${formatNumber(analysis.averageDispersion, " m")} gennemsnitlig spredning`,
      reason: "Træn tre længder med samme kølle og stabilt tempo."
    },
    {
      key: "bag",
      title: "Bag-gapping",
      score: analysis.scores.bagStructure,
      value: `${analysis.gaps.filter(({ gap }) => gap < 7 || gap > 20).length} problematiske gaps`,
      reason: "Kalibrér mellem-slag eller undersøg behovet for en ekstra kølle."
    }
  ];

  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

function sessionForFocus(focus, clubs) {
  const sortedClubs = sortClubsByCarry(clubs);
  const midIrons = sortedClubs.filter((club) => {
    const carry = Number(club.carry);
    return carry >= 120 && carry <= 180;
  });

  if (focus.key === "approach") {
    const targets = midIrons.length
      ? midIrons.slice(-4).map((club) => Math.round(Number(club.carry)))
      : [130, 140, 150, 160];

    return {
      title: "Approach-kontrol",
      volume: "30 bolde",
      description: `Slå 5-8 bolde mod ${targets.join(", ")} m. Registrér carry-afvigelse og sidespredning.`
    };
  }

  if (focus.key === "driving") {
    return {
      title: "Driver fairway challenge",
      volume: "24 bolde",
      description: "Spil seks serier af fire bolde mod en 25 meter bred korridor. Registrér fairway-træf og spredning."
    };
  }

  if (focus.key === "putting") {
    return {
      title: "Startlinje og hastighed",
      volume: "36 putts",
      description: "12 putts fra 2 m, 12 fra 3 m og 12 fra 5 m. Registrér holed og længden på returen."
    };
  }

  if (focus.key === "scoring") {
    return {
      title: "Bogey-stop challenge",
      volume: "18 scenarier",
      description: "Træn recovery-slag og konservative mål. Målet er at undgå double bogey efter et dårligt første slag."
    };
  }

  if (focus.key === "distance") {
    return {
      title: "Tre-længde kontrol",
      volume: "27 bolde",
      description: "Vælg tre køller og slå 50 %, 75 % og 100 % slag. Registrér carry og variation."
    };
  }

  return {
    title: "Gap-kalibrering",
    volume: "25 bolde",
    description: "Træn de to køller omkring det største gap og find et kontrolleret mellem-slag."
  };
}

function potentialStrokes(analysis) {
  let potential = 0;

  if (analysis.averages.gir !== null && analysis.averages.gir < 40) {
    potential += 1.2;
  }

  if (analysis.averages.fir !== null && analysis.averages.fir < 55) {
    potential += 0.8;
  }

  if (analysis.averages.putts !== null && analysis.averages.putts > 33) {
    potential += 1;
  }

  if (analysis.averages.doubles !== null && analysis.averages.doubles > 2) {
    potential += 0.8;
  }

  return roundOne(Math.max(0.5, potential));
}

function renderFocusAreas(focusAreas) {
  return `
    <div class="training-focus-list">
      ${focusAreas.map((focus, index) => `
        <div class="training-focus-item">
          <span class="training-focus-item__rank">${index + 1}</span>

          <div class="training-focus-item__content">
            <strong>${escapeHtml(focus.title)}</strong>
            <span class="text-muted">${escapeHtml(focus.value)}</span>
            <p>${escapeHtml(focus.reason)}</p>
          </div>

          <span class="training-score-badge">
            ${focus.score}/100
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSkills(scores) {
  const skills = [
    ["Driving", scores.driving],
    ["Approach", scores.approach],
    ["Putting", scores.putting],
    ["Scoring", scores.scoring],
    ["Længdekontrol", scores.distanceControl],
    ["Bag-struktur", scores.bagStructure]
  ];

  return `
    <div class="skills-list">
      ${skills.map(([label, value]) => `
        <div class="skill-row">
          <div class="skill-row__header">
            <strong>${escapeHtml(label)}</strong>
            <span>${value}/100</span>
          </div>

          <div class="skill-bar" aria-label="${escapeHtml(label)} ${value} af 100">
            <span style="width:${clamp(value)}%"></span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWeeklyPlan(focusAreas, clubs) {
  return `
    <div class="weekly-plan-grid">
      ${focusAreas.map((focus, index) => {
        const session = sessionForFocus(focus, clubs);

        return `
          <article class="training-session">
            <p class="eyebrow">SESSION ${index + 1}</p>
            <h3>${escapeHtml(session.title)}</h3>
            <strong>${escapeHtml(session.volume)}</strong>
            <p>${escapeHtml(session.description)}</p>

            <button
              class="button button--outline drill"
              type="button"
            >
              Markér udført
            </button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function approachTargets(clubs) {
  const valid = sortClubsByCarry(clubs)
    .filter((club) => {
      const carry = Number(club.carry);
      return carry >= 100 && carry <= 190;
    });

  if (!valid.length) {
    return [120, 130, 140, 150, 160];
  }

  const unique = [...new Set(
    valid.map((club) => Math.round(Number(club.carry) / 5) * 5)
  )];

  return unique.slice(0, 6).sort((a, b) => a - b);
}

function renderApproachCockpit(clubs) {
  const targets = approachTargets(clubs);

  return `
    <div class="approach-target-grid">
      ${targets.map((distance) => {
        const nearest = sortClubsByCarry(clubs)
          .sort(
            (a, b) =>
              Math.abs(Number(a.carry) - distance) -
              Math.abs(Number(b.carry) - distance)
          )[0];

        return `
          <button
            class="approach-target drill"
            type="button"
          >
            <strong>${distance} m</strong>
            <span>${nearest ? escapeHtml(nearest.name) : "Vælg kølle"}</span>
            <small>5 bolde · ±5 m</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function wedgeClubs(clubs) {
  const wedgePatterns = [
    "pw",
    "pitching",
    "gw",
    "gap",
    "aw",
    "approachwedge",
    "sw",
    "sand",
    "lw",
    "lob"
  ];

  return sortClubsByCarry(clubs).filter((club) => {
    const name = clubNameKey(club.name);
    return wedgePatterns.some((pattern) => name.includes(pattern));
  });
}

function renderWedgeMatrix(clubs) {
  const wedges = wedgeClubs(clubs);

  if (!wedges.length) {
    return `
      <div class="status status--info">
        Importér TrackMan-data for PW, GW, SW eller LW for at bygge wedge-matricen.
      </div>
    `;
  }

  return `
    <div class="wedge-matrix">
      <div class="wedge-matrix__header">
        <span>Kølle</span>
        <span>50 %</span>
        <span>75 %</span>
        <span>100 %</span>
      </div>

      ${wedges.map((club) => {
        const carry = Number(club.carry);

        return `
          <div class="wedge-matrix__row">
            <strong>${escapeHtml(club.name)}</strong>
            <span>${Math.round(carry * 0.5)} m</span>
            <span>${Math.round(carry * 0.75)} m</span>
            <span>${Math.round(carry)} m</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderDriverControl(driver, averageFir) {
  if (!driver) {
    return `
      <div class="status status--info">
        Ingen Driver blev fundet i TrackMan-data.
      </div>
    `;
  }

  const dispersion = Number(driver.dispersion);
  const target = 20;
  const status = Number.isFinite(dispersion) && dispersion <= target
    ? "På mål"
    : "Fokusområde";

  return `
    <div class="metric-grid metric-grid--3">
      ${metric("Carry", `${Math.round(Number(driver.carry))} m`)}
      ${metric("Spredning", Number.isFinite(dispersion) ? `${Math.round(dispersion)} m` : "–")}
      ${metric("FIR", formatNumber(averageFir, "%"))}
    </div>

    <div class="driver-control-target">
      <div>
        <strong>Mål for spredning</strong>
        <span>&lt; ${target} m</span>
      </div>

      <span class="training-score-badge">${status}</span>
    </div>

    <button
      class="button button--outline button--full drill"
      type="button"
    >
      Start 24-boldes fairway challenge
    </button>
  `;
}

function renderCoach(analysis, focusAreas) {
  const mainFocus = focusAreas[0];
  const potential = potentialStrokes(analysis);
  const session = sessionForFocus(mainFocus, []);

  return `
    <div class="coach-summary">
      <div class="coach-summary__lead">
        <p class="eyebrow">STØRSTE POTENTIALE</p>
        <h3>${escapeHtml(mainFocus.title)}</h3>
        <p>${escapeHtml(mainFocus.reason)}</p>
      </div>

      <div class="metric-grid">
        ${metric("Potentiel gevinst", `${String(potential).replace(".", ",")} slag/runde`)}
        ${metric("Datagrundlag", `${analysis.recentRounds.length} runder`)}
      </div>

      <div class="status status--info">
        Næste anbefaling: ${escapeHtml(session.title)}. ${escapeHtml(session.description)}
      </div>
    </div>
  `;
}

function renderTrainingLibrary() {
  const groups = [
    ["Approach", ["130 m Challenge", "150 m Precision", "Random Distance"]],
    ["Driver", ["Fairway Challenge", "Dispersion Challenge", "Tempo 70 %"]],
    ["Putting", ["3 m Circle", "Clock Drill", "Gate Drill"]],
    ["Short Game", ["9-ball Challenge", "Up & Down", "Landing Zone"]]
  ];

  return `
    <div class="training-library-grid">
      ${groups.map(([title, drills]) => `
        <section class="training-library-group">
          <h3>${escapeHtml(title)}</h3>

          ${drills.map((drill) => `
            <button
              class="button button--outline button--full drill"
              type="button"
            >
              ${escapeHtml(drill)}
            </button>
          `).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

export function trainingPage(state) {
  const rounds = Array.isArray(state.rounds)
    ? state.rounds
    : [];

  const clubs = Array.isArray(state.clubs)
    ? state.clubs
    : [];

  const analysis = calculateSkills(rounds, clubs);
  const score = trainingScore(analysis.scores);
  const focusAreas = createFocusAreas(analysis);
  const mainFocus = focusAreas[0];

  return `
    <div class="page training-cockpit">
      ${pageHeader(
        "TRAINING INTELLIGENCE",
        "Mit træningscockpit",
        "Prioritering baseret på Garmin-runder og TrackMan-data."
      )}

      ${card(`
        <div class="training-score-header">
          <div>
            <p class="eyebrow">TRÆNINGSSCORE</p>
            <div class="kpi">${score}/100</div>
            <p class="text-muted">${scoreLabel(score)}</p>
          </div>

          <div class="training-score-focus">
            <span>Vigtigste fokus</span>
            <strong>${escapeHtml(mainFocus.title)}</strong>
            <small>${escapeHtml(mainFocus.value)}</small>
          </div>
        </div>

        <div class="metric-grid metric-grid--3">
          ${metric("FIR", formatNumber(analysis.averages.fir, "%"))}
          ${metric("GIR", formatNumber(analysis.averages.gir, "%"))}
          ${metric("Putts", formatNumber(analysis.averages.putts))}
        </div>
      `, true)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">PRIORITERING</p>
            <h2 class="card-title">Top 3 fokusområder</h2>
          </div>

          ${sourceBadge("Garmin")}
        </div>

        ${renderFocusAreas(focusAreas)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">KOMPETENCEPROFIL</p>
            <h2 class="card-title">Skills Dashboard</h2>
          </div>
        </div>

        ${renderSkills(analysis.scores)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">DENNE UGE</p>
            <h2 class="card-title">Tre prioriterede sessioner</h2>
          </div>
        </div>

        ${renderWeeklyPlan(focusAreas, clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">APPROACH</p>
            <h2 class="card-title">Approach Cockpit</h2>
          </div>

          ${sourceBadge("TrackMan")}
        </div>

        <p class="text-muted">
          Målafstandene er afledt af carry-data i bagen. Hver challenge består af fem bolde med et mål på ±5 meter.
        </p>

        ${renderApproachCockpit(clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">WEDGES</p>
            <h2 class="card-title">Wedge Matrix</h2>
          </div>

          ${sourceBadge("TrackMan")}
        </div>

        <p class="text-muted">
          50 % og 75 % er planlægningsafstande beregnet fra fuld carry. Kalibrér dem med rigtige TrackMan-slag.
        </p>

        ${renderWedgeMatrix(clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">DRIVER</p>
            <h2 class="card-title">Driver Control</h2>
          </div>

          ${sourceBadge("TrackMan")}
        </div>

        ${renderDriverControl(
          analysis.driver,
          analysis.averages.fir
        )}
      `)}

      ${card(`
        <p class="eyebrow">GOLF GENIE COACH</p>
        <h2 class="card-title">Databaseret anbefaling</h2>

        ${renderCoach(analysis, focusAreas)}
      `)}

      ${card(`
        <p class="eyebrow">ØVELSESBIBLIOTEK</p>
        <h2 class="card-title">Vælg en ekstra challenge</h2>

        ${renderTrainingLibrary()}
      `)}

      ${rounds.length === 0 ? `
        <div class="status status--info">
          Importér Garmin-runder for at gøre FIR-, GIR-, putting- og scoringsanalysen personlig.
        </div>
      ` : ""}

      ${clubs.length === 0 ? `
        <div class="status status--info">
          Importér TrackMan-data for at gøre approach-, wedge- og drivertræningen personlig.
        </div>
      ` : ""}
    </div>
  `;
}
