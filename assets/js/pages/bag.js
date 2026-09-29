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


function normalizeClubToken(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/driver|drv|1wood|1w/g, "driver")
    .replace(/pitchingwedge|pitching|pw/g, "pw")
    .replace(/gapwedge|gap|gw/g, "gw")
    .replace(/approachwedge|approach|aw/g, "aw")
    .replace(/sandwedge|sand|sw/g, "sw")
    .replace(/lobwedge|lob|lw/g, "lw")
    .replace(/putter/g, "putter")
    .replace(/([2-9])iron/g, "$1i")
    .replace(/iron([2-9])/g, "$1i")
    .replace(/([2-9])wood/g, "$1w")
    .replace(/wood([2-9])/g, "$1w")
    .replace(/([2-6])hybrid/g, "$1h")
    .replace(/hybrid([2-6])/g, "$1h")
    .replace(/[^a-z0-9]/g, "");
}

function equipmentTitle(profileClub, fallbackName) {
  if (!profileClub) return fallbackName;
  const equipment = [profileClub.brand, profileClub.model].filter(Boolean).join(" ");
  return equipment ? `${profileClub.club} · ${equipment}` : profileClub.club;
}

function matchProfileBag(trackmanClubs, profileBag) {
  const registered = Array.isArray(profileBag) ? profileBag : [];
  const usedProfileIds = new Set();
  const clubs = trackmanClubs.map((club, originalIndex) => {
    const trackmanKey = normalizeClubToken(club.name);
    const match = registered.find((item) =>
      !usedProfileIds.has(item.id) && normalizeClubToken(item.club) === trackmanKey
    ) || null;
    if (match) usedProfileIds.add(match.id);
    return {
      ...club,
      originalIndex,
      trackmanName: club.name,
      profileClub: match,
      matchStatus: match ? "matched" : "trackman-only",
      name: equipmentTitle(match, club.name)
    };
  });
  const profileOnly = registered.filter((item) => !usedProfileIds.has(item.id));
  return {
    clubs,
    matchedCount: clubs.filter((club) => club.matchStatus === "matched").length,
    trackmanOnly: clubs.filter((club) => club.matchStatus === "trackman-only"),
    profileOnly
  };
}

function renderBagMatchStatus(match) {
  return card(`
    <div class="section-heading">
      <div><p class="eyebrow">MIN BAG + TRACKMAN</p><h2 class="card-title">Matchstatus</h2></div>
      <span class="badge">${match.matchedCount} matchet</span>
    </div>
    <div class="metric-grid metric-grid--3">
      ${metric("Matchet", match.matchedCount)}
      ${metric("Kun TrackMan", match.trackmanOnly.length)}
      ${metric("Uden TrackMan", match.profileOnly.length)}
    </div>
    ${match.trackmanOnly.length ? `<div class="status status--warning"><strong>Ikke registreret i Min Bag:</strong> ${match.trackmanOnly.map((club) => escapeHtml(club.trackmanName)).join(", ")}</div>` : ""}
    ${match.profileOnly.length ? `<div class="status status--info"><strong>Mangler TrackMan-data:</strong> ${match.profileOnly.map((club) => escapeHtml(equipmentTitle(club, club.club))).join(", ")}</div>` : ""}
    <button class="button button--outline button--full" data-page="profile" type="button">Rediger Min Bag i Profil</button>
  `);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMeters(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)} m` : "–";
}

function sortClubsByCarry(clubs) {
  return [...clubs]
    .filter((club) => Number.isFinite(Number(club.carry)))
    .sort((a, b) => Number(b.carry) - Number(a.carry));
}

function gapStatus(gap) {
  if (!Number.isFinite(gap)) {
    return {
      key: "unknown",
      label: "Ukendt",
      text: "Ikke nok data"
    };
  }

  if (gap < 7) {
    return {
      key: "overlap",
      label: "Overlap",
      text: "Køllerne ligger meget tæt"
    };
  }

  if (gap <= 15) {
    return {
      key: "good",
      label: "Godt gap",
      text: "Jævn afstandsdækning"
    };
  }

  if (gap <= 20) {
    return {
      key: "watch",
      label: "Observer",
      text: "Gap bør vurderes"
    };
  }

  return {
    key: "large",
    label: "Stort gap",
    text: "Mulig manglende kølle"
  };
}

function controlStatus(dispersion) {
  if (!Number.isFinite(dispersion)) {
    return {
      key: "unknown",
      label: "Ukendt"
    };
  }

  if (dispersion <= 10) {
    return {
      key: "excellent",
      label: "Meget stabil"
    };
  }

  if (dispersion <= 15) {
    return {
      key: "good",
      label: "Stabil"
    };
  }

  if (dispersion <= 25) {
    return {
      key: "watch",
      label: "Bør forbedres"
    };
  }

  return {
    key: "poor",
    label: "Ustabil"
  };
}

function calculateGaps(clubs) {
  return clubs.slice(0, -1).map((club, index) => {
    const nextClub = clubs[index + 1];
    const gap = Number(club.carry) - Number(nextClub.carry);

    return {
      from: club,
      to: nextClub,
      gap,
      status: gapStatus(gap)
    };
  });
}

function calculateGapScore(gaps) {
  if (!gaps.length) {
    return 0;
  }

  const scores = gaps.map(({ gap }) => {
    if (gap >= 10 && gap <= 15) {
      return 100;
    }

    if (gap >= 8 && gap <= 17) {
      return 90;
    }

    if (gap >= 7 && gap <= 20) {
      return 75;
    }

    return 50;
  });

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) /
      scores.length
  );
}

function calculateConsistencyScore(clubs) {
  const valid = clubs
    .map((club) => Number(club.dispersion))
    .filter(Number.isFinite);

  if (!valid.length) {
    return 0;
  }

  const scores = valid.map((dispersion) => {
    if (dispersion < 10) {
      return 100;
    }

    if (dispersion <= 15) {
      return 90;
    }

    if (dispersion <= 25) {
      return 75;
    }

    return 50;
  });

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) /
      scores.length
  );
}

function bagRating(score) {
  if (score >= 90) {
    return "Fremragende";
  }

  if (score >= 80) {
    return "Meget god";
  }

  if (score >= 70) {
    return "God";
  }

  if (score >= 60) {
    return "Udviklingspotentiale";
  }

  return "Kræver optimering";
}

function missingClubSuggestion(gapItem) {
  if (!gapItem || gapItem.gap <= 20) {
    return "Ingen tydelig manglende kølle ud fra carry-gaps.";
  }

  const targetCarry = Math.round(
    (Number(gapItem.from.carry) + Number(gapItem.to.carry)) / 2
  );

  return `Test en kølle omkring ${targetCarry} m carry, eller arbejd med et kontrolleret kortere slag med ${escapeHtml(gapItem.from.name)}.`;
}

function createAdvisorItems(clubs, gaps) {
  const items = [];
  const largeGaps = gaps.filter(({ gap }) => gap > 20);
  const overlaps = gaps.filter(({ gap }) => gap < 7);
  const unstable = clubs.filter(
    (club) => Number(club.dispersion) > 25
  );

  if (!largeGaps.length) {
    items.push({
      type: "success",
      title: "Ingen kritiske carry-gaps",
      text: "Bagen har ingen afstandsspring over 20 meter."
    });
  } else {
    const largest = [...largeGaps].sort(
      (a, b) => b.gap - a.gap
    )[0];

    items.push({
      type: "warning",
      title: `${largest.gap} m mellem ${largest.from.name} og ${largest.to.name}`,
      text: missingClubSuggestion(largest)
    });
  }

  if (overlaps.length) {
    const overlap = [...overlaps].sort(
      (a, b) => a.gap - b.gap
    )[0];

    items.push({
      type: "warning",
      title: `Overlap mellem ${overlap.from.name} og ${overlap.to.name}`,
      text: `Kun ${overlap.gap} m adskiller køllerne. Vurder loft, skaft eller køllernes rolle i bagen.`
    });
  } else {
    items.push({
      type: "success",
      title: "Ingen tydelige overlaps",
      text: "Ingen nabokøller ligger mindre end 7 meter fra hinanden."
    });
  }

  if (unstable.length) {
    const leastStable = [...unstable].sort(
      (a, b) => Number(b.dispersion) - Number(a.dispersion)
    )[0];

    items.push({
      type: "warning",
      title: `${leastStable.name} har størst spredning`,
      text: `${formatMeters(leastStable.dispersion)} spredning. Prioritér centertræf, tempo og længdekontrol.`
    });
  } else {
    items.push({
      type: "success",
      title: "Ingen meget ustabile køller",
      text: "Alle registrerede køller ligger på højst 25 meter spredning."
    });
  }

  return items;
}

function renderDistanceLadder(clubs) {
  const maximumCarry = Math.max(
    ...clubs.map((club) => Number(club.carry)),
    1
  );

  return `
    <div class="distance-ladder">
      ${clubs.map((club) => {
        const carry = Number(club.carry);
        const width = Math.max(10, (carry / maximumCarry) * 100);

        return `
          <button
            class="distance-ladder__row"
            data-club="${club.originalIndex}"
            type="button"
            aria-label="Vis ${escapeHtml(club.name)}"
          >
            <span class="distance-ladder__name">
              ${escapeHtml(club.name)}
            </span>

            <span class="distance-ladder__track">
              <span
                class="distance-ladder__bar"
                style="width:${width}%"
              ></span>
            </span>

            <strong class="distance-ladder__value">
              ${formatMeters(carry)}
            </strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderGapAnalysis(gaps) {
  if (!gaps.length) {
    return `
      <div class="empty-state">
        <p class="text-muted">
          Der kræves mindst to køller med carry-data for at beregne gaps.
        </p>
      </div>
    `;
  }

  return `
    <div class="gap-list">
      ${gaps.map(({ from, to, gap, status }) => `
        <div class="gap-row gap-row--${status.key}">
          <div class="gap-row__clubs">
            <strong>
              ${escapeHtml(from.name)} → ${escapeHtml(to.name)}
            </strong>

            <span class="text-muted">
              ${formatMeters(from.carry)} → ${formatMeters(to.carry)}
            </span>
          </div>

          <div class="gap-row__result">
            <strong>${formatMeters(gap)}</strong>
            <span class="gap-badge gap-badge--${status.key}">
              ${escapeHtml(status.label)}
            </span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderLengthControl(clubs) {
  const sorted = [...clubs].sort(
    (a, b) => Number(a.dispersion) - Number(b.dispersion)
  );

  return `
    <div class="control-list">
      ${sorted.map((club) => {
        const dispersion = Number(club.dispersion);
        const status = controlStatus(dispersion);

        return `
          <button
            class="control-row"
            data-club="${club.originalIndex}"
            type="button"
          >
            <span>
              <strong>${escapeHtml(club.name)}</strong>
              <small>${toFiniteNumber(club.shots)} slag</small>
            </span>

            <span class="control-row__result">
              <strong>${formatMeters(dispersion)}</strong>
              <span class="control-badge control-badge--${status.key}">
                ${escapeHtml(status.label)}
              </span>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdvisor(items) {
  return `
    <div class="advisor-list">
      ${items.map((item) => `
        <div class="advisor-item advisor-item--${item.type}">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${item.text}</p>
        </div>
      `).join("")}
    </div>
  `;
}

export function bagPage(state) {
  const rawClubs = Array.isArray(state.clubs) ? state.clubs : [];
  const profileBag = Array.isArray(state.profile?.bag) ? state.profile.bag : [];
  const match = matchProfileBag(rawClubs, profileBag);

  if (!rawClubs.length) {
    return `
      <div class="page">
        ${pageHeader("BAG IQ", "Bag IQ", profileBag.length ? "Din bag er registreret, men mangler TrackMan-data" : "Ingen køller registreret endnu")}
        ${profileBag.length ? renderBagMatchStatus(match) : card(`
          <div class="empty-state">
            <h2 class="card-title">Registrér din bag</h2>
            <p class="text-muted">Start i Profil med at registrere kølletype, mærke og model. Importér derefter TrackMan CSV fra Mit Spil.</p>
            <button class="button button--accent button--full" data-page="profile" type="button">Gå til Profil</button>
          </div>
        `)}
        <button class="button button--outline button--full" data-page="home" type="button">Gå til Mit Spil og importér TrackMan</button>
      </div>
    `;
  }

  const clubs = sortClubsByCarry(match.clubs);

  const selectedIndex = Math.min(
    Math.max(0, Number(state.clubIndex || 0)),
    rawClubs.length - 1
  );

  const selectedClub = match.clubs[selectedIndex];
  const selectedDelta =
    Number(selectedClub.carry || 0) -
    Number(selectedClub.benchmark || 0);

  const gaps = calculateGaps(clubs);
  const gapScore = calculateGapScore(gaps);
  const consistencyScore = calculateConsistencyScore(clubs);
  const bagScore = Math.round(
    (gapScore + consistencyScore) / 2
  );

  const largestGap = gaps.length
    ? [...gaps].sort((a, b) => b.gap - a.gap)[0]
    : null;

  const mostStable = [...clubs]
    .filter((club) => Number.isFinite(Number(club.dispersion)))
    .sort(
      (a, b) => Number(a.dispersion) - Number(b.dispersion)
    )[0] || null;

  const leastStable = [...clubs]
    .filter((club) => Number.isFinite(Number(club.dispersion)))
    .sort(
      (a, b) => Number(b.dispersion) - Number(a.dispersion)
    )[0] || null;

  const advisorItems = createAdvisorItems(clubs, gaps);

  return `
    <div class="page bag-cockpit">
      ${pageHeader(
        "TRACKMAN BAG INTELLIGENCE",
        "Bag IQ",
        "Carry-gaps, afstandsdækning og længdekontrol på samme side."
      )}
      ${renderBagMatchStatus(match)}

      ${card(`
        <div class="bag-score-header">
          <div>
            <p class="eyebrow">BAG SCORE</p>
            <div class="kpi">${bagScore}/100</div>
            <p class="text-muted">${bagRating(bagScore)}</p>
          </div>

          <div class="bag-score-ring" style="--bag-score:${bagScore}">
            <span>${bagScore}</span>
          </div>
        </div>

        <div class="metric-grid metric-grid--3">
          ${metric("Køller", clubs.length)}
          ${metric(
            "Største gap",
            largestGap ? formatMeters(largestGap.gap) : "–"
          )}
          ${metric(
            "Mest stabil",
            mostStable ? escapeHtml(mostStable.name) : "–"
          )}
        </div>
      `, true)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">AFSTANDSDÆKNING</p>
            <h2 class="card-title">Distance Ladder</h2>
          </div>

          ${sourceBadge("TrackMan")}
        </div>

        <p class="text-muted">
          Køllerne er sorteret efter median carry. Tryk på en kølle
          for at vise detaljer nederst på siden.
        </p>

        ${renderDistanceLadder(clubs)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">GAPPING</p>
            <h2 class="card-title">Gap-analyse</h2>
          </div>

          ${largestGap
            ? `<span class="badge">MAX ${largestGap.gap} M</span>`
            : ""}
        </div>

        <p class="text-muted">
          7-15 meter vurderes som et godt gap. Under 7 meter kan
          indikere overlap, mens over 20 meter kan indikere en
          manglende kølle eller behov for et kontrolleret mellem-slag.
        </p>

        ${renderGapAnalysis(gaps)}
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">KONTROL</p>
            <h2 class="card-title">Længdekontrol</h2>
          </div>

          ${mostStable
            ? `<span class="badge">BEDST ${escapeHtml(mostStable.name)}</span>`
            : ""}
        </div>

        <p class="text-muted">
          Lavere spredning indikerer mere ensartet længde og retning.
          Brug analysen som træningsindikator, ikke som fitting-konklusion.
        </p>

        ${renderLengthControl(clubs)}
      `)}

      ${card(`
        <p class="eyebrow">BAG ADVISOR</p>
        <h2 class="card-title">Prioriterede anbefalinger</h2>

        ${renderAdvisor(advisorItems)}

        <div class="metric-grid metric-grid--3">
          ${metric("Gap-score", `${gapScore}/100`)}
          ${metric("Kontrol-score", `${consistencyScore}/100`)}
          ${metric(
            "Mest ustabil",
            leastStable ? escapeHtml(leastStable.name) : "–"
          )}
        </div>
      `)}

      ${card(`
        <div class="section-heading">
          <div>
            <p class="eyebrow">KØLLEDETALJER</p>
            <h2 class="card-title">
              ${escapeHtml(selectedClub.name)}
            </h2>
          </div>

          ${sourceBadge("TrackMan")}
        </div>

        <div class="row bag-club-navigation">
          <button
            class="button button--outline"
            id="previousClub"
            type="button"
            ${selectedIndex === 0 ? "disabled" : ""}
          >
            ‹
          </button>

          <strong>
            ${selectedIndex + 1} af ${rawClubs.length}
          </strong>

          <button
            class="button button--outline"
            id="nextClub"
            type="button"
            ${selectedIndex === rawClubs.length - 1 ? "disabled" : ""}
          >
            ›
          </button>
        </div>

        <div class="metric-grid">
          ${metric("Median carry", formatMeters(selectedClub.carry))}
          ${metric("Total", formatMeters(selectedClub.total))}
        </div>

        <div class="metric-grid metric-grid--3">
          ${metric("Spredning", formatMeters(selectedClub.dispersion))}
          ${metric("Slag", toFiniteNumber(selectedClub.shots))}
          ${metric(
            "Mod benchmark",
            `${selectedDelta >= 0 ? "+" : ""}${Math.round(selectedDelta)} m`
          )}
        </div>

        <div class="scroll-row">
          ${match.clubs.map((club, index) => `
            <button
              class="club-tab ${index === selectedIndex ? "club-tab--active" : ""}"
              data-club="${index}"
              type="button"
            >
              <b>${escapeHtml(club.name)}</b>
              <br>
              ${formatMeters(club.carry)}
            </button>
          `).join("")}
        </div>
      `)}
    </div>
  `;
}
