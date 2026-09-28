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

function average(values) {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function format(value, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${String(Math.round(number * 10) / 10).replace(".", ",")}${suffix}`
    : "–";
}

function percentage(made, possible, fallback) {
  const hit = Number(made);
  const total = Number(possible);

  if (Number.isFinite(hit) && Number.isFinite(total) && total > 0) {
    return (hit / total) * 100;
  }

  const fallbackNumber = Number(fallback);
  return Number.isFinite(fallbackNumber) ? fallbackNumber : null;
}

function clubKey(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]/g, "");
}

function recentRounds(rounds, limit = 10) {
  return [...rounds]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, limit);
}

function sortedClubs(clubs) {
  return [...clubs]
    .filter((club) => Number.isFinite(Number(club.carry)))
    .sort((a, b) => Number(b.carry) - Number(a.carry));
}

function findClub(clubs, patterns) {
  return clubs.find((club) => {
    const name = clubKey(club.name);
    return patterns.some((pattern) => name.includes(pattern));
  }) || null;
}

function calculateAnalysis(rounds, clubs) {
  const latest = recentRounds(rounds);
  const fir = average(latest.map((round) => percentage(
    round.firMade,
    round.firPossible,
    round.fir
  )));
  const gir = average(latest.map((round) => percentage(
    round.girMade,
    round.girPossible,
    round.gir
  )));
  const putts = average(latest.map((round) => round.putts));
  const doubles = average(latest.map((round) => round.doubleBogeyPlus));
  const driver = findClub(clubs, ["driver"]);
  const dispersion = average(clubs.map((club) => club.dispersion));

  const ordered = sortedClubs(clubs);
  const gaps = ordered.slice(0, -1).map((club, index) => ({
    from: club,
    to: ordered[index + 1],
    gap: Number(club.carry) - Number(ordered[index + 1].carry)
  }));
  const badGaps = gaps.filter(({ gap }) => gap < 7 || gap > 20).length;

  const driving = clamp(
    (fir ?? 60) * 0.65 +
    (driver && Number.isFinite(Number(driver.dispersion))
      ? clamp(110 - Number(driver.dispersion) * 2)
      : fir ?? 60) * 0.35
  );

  const scores = {
    driving: Math.round(driving),
    approach: Math.round(gir === null ? 60 : clamp(gir * 1.7)),
    putting: Math.round(putts === null ? 60 : clamp(100 - Math.max(0, putts - 28) * 6)),
    scoring: Math.round(doubles === null ? 60 : clamp(100 - doubles * 12)),
    distance: Math.round(dispersion === null ? 60 : clamp(110 - dispersion * 2.3)),
    bag: Math.round(gaps.length ? clamp(100 - badGaps * 14) : 60)
  };

  return {
    latest,
    fir,
    gir,
    putts,
    doubles,
    driver,
    dispersion,
    gaps,
    scores
  };
}

function totalScore(scores) {
  return Math.round(average(Object.values(scores)) ?? 0);
}

function focusAreas(analysis) {
  return [
    {
      key: "approach",
      title: "Approach-spil",
      score: analysis.scores.approach,
      value: `GIR ${format(analysis.gir, "%")}`,
      reason: "Forbedr startretning og carry-kontrol mod green."
    },
    {
      key: "driver",
      title: "Driver-kontrol",
      score: analysis.scores.driving,
      value: analysis.driver
        ? `${format(analysis.driver.dispersion, " m")} spredning`
        : `FIR ${format(analysis.fir, "%")}`,
      reason: "Arbejd med centertræf, tempo og en tydelig fairway-korridor."
    },
    {
      key: "putting",
      title: "Putting",
      score: analysis.scores.putting,
      value: `${format(analysis.putts)} putts`,
      reason: "Træn startlinje og hastighed fra 2 til 5 meter."
    },
    {
      key: "scoring",
      title: "Skadesbegrænsning",
      score: analysis.scores.scoring,
      value: `${format(analysis.doubles)} double+`,
      reason: "Reducer store fejl med konservative mål og et sikkert næste slag."
    },
    {
      key: "distance",
      title: "Længdekontrol",
      score: analysis.scores.distance,
      value: `${format(analysis.dispersion, " m")} spredning`,
      reason: "Træn flere længder med samme kølle og et stabilt tempo."
    },
    {
      key: "bag",
      title: "Bag-gapping",
      score: analysis.scores.bag,
      value: `${analysis.gaps.filter(({ gap }) => gap < 7 || gap > 20).length} problematiske gaps`,
      reason: "Kalibrér mellem-slag omkring de største carry-gaps."
    }
  ].sort((a, b) => a.score - b.score).slice(0, 3);
}

const DRILLS = {
  "130m": {
    title: "130 m Challenge",
    purpose: "Forbedre carry-præcision omkring 130 meter.",
    method: [
      "Slå 5 bolde mod et mål på 130 meter.",
      "Brug samme pre-shot rutine på alle slag.",
      "Fokusér på carry frem for totalafstand."
    ],
    kpis: ["Carry", "Side Offline", "Spredning"],
    target: "Mindst 4 af 5 slag inden for ±5 meter."
  },
  "150m": {
    title: "150 m Precision",
    purpose: "Forbedre præcisionen med de længere approach-køller.",
    method: [
      "Slå 3 serier af 5 bolde mod 150 meter.",
      "Skift målretning mellem hver serie.",
      "Hold samme tempo og registrér køllevalg i TrackMan."
    ],
    kpis: ["Carry", "Offline", "Carry-variation"],
    target: "Gennemsnitlig carry mellem 145 og 155 meter."
  },
  random: {
    title: "Random Distance",
    purpose: "Træne beslutning og længdekontrol uden gentagelse.",
    method: [
      "Skift mellem fem forskellige målafstande.",
      "Slå kun én bold til hver afstand ad gangen.",
      "Gennemfør tre runder uden at gentage samme afstand."
    ],
    kpis: ["Carry-afvigelse", "Køllevalg", "Spredning"],
    target: "Mindst 60 % af slagene inden for ±7 meter."
  },
  fairway: {
    title: "Fairway Challenge",
    purpose: "Forbedre FIR og reducere driverens sidespredning.",
    method: [
      "Slå 24 drives mod en cirka 25 meter bred korridor.",
      "Del træningen i seks serier af fire bolde.",
      "Skift mål mellem serierne og behold samme rutine."
    ],
    kpis: ["Side Offline", "Spredning", "Carry"],
    target: "Mindst 14 af 24 drives i korridoren."
  },
  dispersion: {
    title: "Dispersion Challenge",
    purpose: "Reducere variationen i både retning og længde.",
    method: [
      "Slå 12 bolde med samme kølle.",
      "Brug et fast mål og samme tempo.",
      "Fjern kun åbenlyse fejlmålinger, ikke dårlige slag."
    ],
    kpis: ["Side Offline", "Carry", "Total spredning"],
    target: "Lavere spredning end køllens nuværende TrackMan-baseline."
  },
  tempo: {
    title: "Tempo 70 %",
    purpose: "Find et kontrolleret tee-slag med mindre spredning.",
    method: [
      "Slå 10 bolde med cirka 70 % oplevet tempo.",
      "Sammenlign derefter med 10 normale drives.",
      "Vurder forskellen i carry og dispersion."
    ],
    kpis: ["Carry", "Spredning", "Side Offline"],
    target: "Reducer spredningen uden at miste mere end 10 % carry."
  },
  circle: {
    title: "3 m Circle",
    purpose: "Forbedre startlinje og sikkerhed fra tre meter.",
    method: [
      "Placér 8 bolde i en cirkel omkring hullet.",
      "Alle bolde placeres cirka 3 meter fra hullet.",
      "Gennemfør hele cirklen med samme rutine."
    ],
    kpis: ["Succesrate", "Startlinje", "Returlængde"],
    target: "Hul mindst 5 af 8 putts."
  },
  clock: {
    title: "Clock Drill",
    purpose: "Forbedre korte putts fra forskellige fald og retninger.",
    method: [
      "Placér 8 bolde rundt om hullet som timer på et ur.",
      "Start fra cirka 2 meter.",
      "Begynd forfra efter en miss, hvis du vil øge presset."
    ],
    kpis: ["Succesrate", "Startlinje"],
    target: "Hul 8 putts i træk."
  },
  gate: {
    title: "Gate Drill",
    purpose: "Forbedre putterhovedets startretning.",
    method: [
      "Lav en port med to tees lidt bredere end bolden.",
      "Slå 20 putts gennem porten fra 2 meter.",
      "Flyt porten tættere på bolden, når øvelsen bliver stabil."
    ],
    kpis: ["Startlinje", "Succesrate"],
    target: "18 af 20 bolde gennem porten uden berøring."
  },
  nineball: {
    title: "9-ball Challenge",
    purpose: "Træne variation og beslutninger omkring green.",
    method: [
      "Spil 9 bolde fra forskellige lejer.",
      "Skift mellem chip, pitch og bunker, hvis muligt.",
      "Spil hver bold færdig i hul."
    ],
    kpis: ["Up & Down", "Nærhed til hul", "Antal slag"],
    target: "Mindst 4 af 9 up-and-downs."
  },
  updown: {
    title: "Up & Down",
    purpose: "Forbedre sandsynligheden for at redde par omkring green.",
    method: [
      "Vælg seks forskellige positioner omkring green.",
      "Spil én bold fra hver position og putt færdig.",
      "Gentag for tre runder."
    ],
    kpis: ["Up & Down", "Første putts længde"],
    target: "Mindst 9 af 18 up-and-downs."
  },
  landing: {
    title: "Landing Zone",
    purpose: "Forbedre kontrol af landingspunkt ved chip og pitch.",
    method: [
      "Markér en landingszone med håndklæde eller tees.",
      "Slå 15 bolde fra samme sted.",
      "Skift kølle og gentag fra en ny afstand."
    ],
    kpis: ["Landingspræcision", "Rullelængde"],
    target: "10 af 15 bolde rammer landingszonen."
  }
};

function renderDrillInfo(drillId) {
  const drill = DRILLS[drillId];

  if (!drill) {
    return "";
  }

  return `
    <div class="drill-info" data-drill-info="${escapeHtml(drillId)}">
      <div class="drill-info__header">
        <div>
          <p class="eyebrow">ØVELSESFORKLARING</p>
          <h3>${escapeHtml(drill.title)}</h3>
        </div>

        <button
          class="drill-info__close"
          data-close-drill
          type="button"
          aria-label="Luk forklaring"
        >
          ×
        </button>
      </div>

      <div class="drill-info__section">
        <strong>Formål</strong>
        <p>${escapeHtml(drill.purpose)}</p>
      </div>

      <div class="drill-info__section">
        <strong>Sådan gør du</strong>
        <ol>
          ${drill.method.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </div>

      <div class="drill-info__section">
        <strong>TrackMan / trænings-KPI'er</strong>
        <div class="drill-kpi-list">
          ${drill.kpis.map((kpi) => `<span>${escapeHtml(kpi)}</span>`).join("")}
        </div>
      </div>

      <div class="status status--success">
        <strong>Succesmål:</strong> ${escapeHtml(drill.target)}
      </div>
    </div>
  `;
}

function renderDrillButton(id, label, extraClass = "") {
  return `
    <div class="drill-entry">
      <button
        class="button button--outline button--full drill-explain ${extraClass}"
        data-drill-id="${escapeHtml(id)}"
        type="button"
        aria-expanded="false"
      >
        ${escapeHtml(label)}
      </button>

      <div class="drill-explanation-slot" data-drill-slot="${escapeHtml(id)}"></div>
    </div>
  `;
}

function renderSkills(scores) {
  const skills = [
    ["Driving", scores.driving],
    ["Approach", scores.approach],
    ["Putting", scores.putting],
    ["Scoring", scores.scoring],
    ["Længdekontrol", scores.distance],
    ["Bag-struktur", scores.bag]
  ];

  return `
    <div class="skills-list">
      ${skills.map(([label, value]) => `
        <div class="skill-row">
          <div class="skill-row__header">
            <strong>${escapeHtml(label)}</strong>
            <span>${value}/100</span>
          </div>
          <div class="skill-bar"><span style="width:${value}%"></span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFocus(focus) {
  return `
    <div class="training-focus-list">
      ${focus.map((item, index) => `
        <div class="training-focus-item">
          <span class="training-focus-item__rank">${index + 1}</span>
          <div class="training-focus-item__content">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="text-muted">${escapeHtml(item.value)}</span>
            <p>${escapeHtml(item.reason)}</p>
          </div>
          <span class="training-score-badge">${item.score}/100</span>
        </div>
      `).join("")}
    </div>
  `;
}

function approachTargets(clubs) {
  const values = sortedClubs(clubs)
    .map((club) => Number(club.carry))
    .filter((carry) => carry >= 100 && carry <= 190)
    .map((carry) => Math.round(carry / 5) * 5);

  return values.length
    ? [...new Set(values)].sort((a, b) => a - b).slice(0, 6)
    : [120, 130, 140, 150, 160];
}

function renderApproach(clubs) {
  const ordered = sortedClubs(clubs);

  return `
    <div class="approach-target-grid">
      ${approachTargets(clubs).map((distance) => {
        const nearest = [...ordered].sort(
          (a, b) =>
            Math.abs(Number(a.carry) - distance) -
            Math.abs(Number(b.carry) - distance)
        )[0];
        const id = distance <= 135 ? "130m" : distance <= 155 ? "150m" : "random";

        return `
          <div class="approach-target-card">
            <strong>${distance} m</strong>
            <span>${nearest ? escapeHtml(nearest.name) : "Vælg kølle"}</span>
            <small>5 bolde · ±5 m</small>
            ${renderDrillButton(id, "Vis øvelse")}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderWedgeMatrix(clubs) {
  const patterns = ["pw", "pitching", "gw", "gap", "aw", "sw", "sand", "lw", "lob"];
  const wedges = sortedClubs(clubs).filter((club) =>
    patterns.some((pattern) => clubKey(club.name).includes(pattern))
  );

  if (!wedges.length) {
    return `<div class="status status--info">Importér TrackMan-data for wedges for at bygge matricen.</div>`;
  }

  return `
    <div class="wedge-matrix">
      <div class="wedge-matrix__header">
        <span>Kølle</span><span>50 %</span><span>75 %</span><span>100 %</span>
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

function renderLibrary() {
  const groups = [
    ["Approach", [["130m", "130 m Challenge"], ["150m", "150 m Precision"], ["random", "Random Distance"]]],
    ["Driver", [["fairway", "Fairway Challenge"], ["dispersion", "Dispersion Challenge"], ["tempo", "Tempo 70 %"]]],
    ["Putting", [["circle", "3 m Circle"], ["clock", "Clock Drill"], ["gate", "Gate Drill"]]],
    ["Short Game", [["nineball", "9-ball Challenge"], ["updown", "Up & Down"], ["landing", "Landing Zone"]]]
  ];

  return `
    <div class="training-library-grid">
      ${groups.map(([title, drills]) => `
        <section class="training-library-group">
          <h3>${escapeHtml(title)}</h3>
          ${drills.map(([id, label]) => renderDrillButton(id, label)).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

export function trainingPage(state) {
  const rounds = Array.isArray(state.rounds) ? state.rounds : [];
  const clubs = Array.isArray(state.clubs) ? state.clubs : [];
  const analysis = calculateAnalysis(rounds, clubs);
  const score = totalScore(analysis.scores);
  const focus = focusAreas(analysis);
  const driver = analysis.driver;

  return `
    <div class="page training-cockpit">
      ${pageHeader(
        "TRAINING INTELLIGENCE",
        "Coach",
        "Prioritering baseret på Garmin-runder og TrackMan-data."
      )}

      ${card(`
        <div class="training-score-header">
          <div>
            <p class="eyebrow">TRÆNINGSSCORE</p>
            <div class="kpi">${score}/100</div>
            <p class="text-muted">Datagrundlag: ${analysis.latest.length} runder</p>
          </div>
          <div class="training-score-focus">
            <span>Vigtigste fokus</span>
            <strong>${escapeHtml(focus[0].title)}</strong>
            <small>${escapeHtml(focus[0].value)}</small>
          </div>
        </div>
        <div class="metric-grid metric-grid--3">
          ${metric("FIR", format(analysis.fir, "%"))}
          ${metric("GIR", format(analysis.gir, "%"))}
          ${metric("Putts", format(analysis.putts))}
        </div>
      `, true)}

      ${card(`
        <div class="section-heading">
          <div><p class="eyebrow">PRIORITERING</p><h2 class="card-title">Top 3 fokusområder</h2></div>
          ${sourceBadge("Garmin")}
        </div>
        ${renderFocus(focus)}
      `)}

      ${card(`
        <p class="eyebrow">KOMPETENCEPROFIL</p>
        <h2 class="card-title">Skills Dashboard</h2>
        ${renderSkills(analysis.scores)}
      `)}

      ${card(`
        <div class="section-heading">
          <div><p class="eyebrow">APPROACH</p><h2 class="card-title">Approach Cockpit</h2></div>
          ${sourceBadge("TrackMan")}
        </div>
        <p class="text-muted">Afstandene er afledt af din aktuelle bag. Klik på Vis øvelse for en kort instruktion.</p>
        ${renderApproach(clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div><p class="eyebrow">WEDGES</p><h2 class="card-title">Wedge Matrix</h2></div>
          ${sourceBadge("TrackMan")}
        </div>
        ${renderWedgeMatrix(clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div><p class="eyebrow">DRIVER</p><h2 class="card-title">Driver Control</h2></div>
          ${sourceBadge("TrackMan")}
        </div>
        <div class="metric-grid metric-grid--3">
          ${metric("Carry", driver ? format(driver.carry, " m") : "–")}
          ${metric("Spredning", driver ? format(driver.dispersion, " m") : "–")}
          ${metric("FIR", format(analysis.fir, "%"))}
        </div>
        ${renderDrillButton("fairway", "Vis Fairway Challenge")}
      `)}

      ${card(`
        <p class="eyebrow">ØVELSESBIBLIOTEK</p>
        <h2 class="card-title">Klik på en øvelse for at se forklaringen</h2>
        <p class="text-muted">Der skal ikke indtastes resultater. Brug instruktionen på træningsanlægget og importér senere TrackMan-rapporten.</p>
        ${renderLibrary()}
      `)}

      ${rounds.length === 0
        ? `<div class="status status--info">Importér Garmin-runder for personlig FIR-, GIR-, putting- og scoringsanalyse.</div>`
        : ""}
      ${clubs.length === 0
        ? `<div class="status status--info">Importér TrackMan-data for personlige afstande og køllevalg.</div>`
        : ""}
    </div>
  `;
}

export function bindTrainingDrillCards(root = document) {
  root.querySelectorAll("[data-drill-id]").forEach((button) => {
    button.onclick = () => {
      const drillId = button.dataset.drillId;
      const entry = button.closest(".drill-entry");
      const slot = entry?.querySelector(`[data-drill-slot="${drillId}"]`);

      if (!slot) {
        return;
      }

      const isOpen = slot.childElementCount > 0;

      root.querySelectorAll(".drill-explanation-slot").forEach((otherSlot) => {
        otherSlot.innerHTML = "";
      });

      root.querySelectorAll("[data-drill-id]").forEach((otherButton) => {
        otherButton.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        slot.innerHTML = renderDrillInfo(drillId);
        button.setAttribute("aria-expanded", "true");
        slot.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };
  });

  root.querySelectorAll("[data-close-drill]").forEach((button) => {
    button.onclick = () => {
      const info = button.closest(".drill-info");
      const slot = info?.parentElement;
      const entry = slot?.closest(".drill-entry");
      const trigger = entry?.querySelector("[data-drill-id]");

      if (slot) {
        slot.innerHTML = "";
      }

      trigger?.setAttribute("aria-expanded", "false");
      trigger?.focus();
    };
  });
}
