import {
  card,
  metric,
  pageHeader,
  sourceBadge
} from "../components/ui.js";

function average(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (!valid.length) {
    return null;
  }

  return (
    valid.reduce(
      (sum, value) => sum + value,
      0
    ) / valid.length
  ).toFixed(1);
}

function minimum(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (!valid.length) {
    return null;
  }

  return Math.min(...valid);
}

function formatMetric(value, suffix = "") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "–";
  }

  return `${value}${suffix}`;
}

export function roundsPage(state) {

  if (!state.rounds?.length) {

    return `
      <div class="page">

        ${pageHeader(
          "GARMIN GOLF",
          "Mine baner",
          "Ingen runder importeret endnu"
        )}

        ${card(`
          <h2 class="card-title">
            Importér din første runde
          </h2>

          <p class="text-muted">
            Gå til Data og importér dine Garmin Golf screenshots.
          </p>

          <button
            class="button button--accent button--full"
            data-page="data"
          >
            Gå til import
          </button>
        `)}

      </div>
    `;
  }

  const grouped = {};

  state.rounds.forEach((round) => {

    const course =
      round.course || "Ukendt bane";

    if (!grouped[course]) {
      grouped[course] = [];
    }

    grouped[course].push(round);

  });

  const courses =
    Object.entries(grouped);

  return `
    <div class="page">

      ${pageHeader(
        "GARMIN GOLF",
        "Mine baner",
        `${state.rounds.length} runder på ${courses.length} baner`
      )}

      ${courses.map(([course, rounds]) => {

        const sortedRounds =
          rounds
            .slice()
            .sort(
              (a, b) =>
                String(b.date || "")
                  .localeCompare(
                    String(a.date || "")
                  )
            );

        const latest =
          sortedRounds[0];

        const bestScore =
          minimum(
            rounds.map(
              r => r.score
            )
          );

        const avgScore =
          average(
            rounds.map(
              r => r.score
            )
          );

        const avgFir =
          average(
            rounds.map(
              r => r.fir
            )
          );

        const avgGir =
          average(
            rounds.map(
              r => r.gir
            )
          );

        const avgPutts =
          average(
            rounds.map(
              r => r.putts
            )
          );

        const avgFront =
          average(
            rounds.map(
              r => r.frontNine
            )
          );

        const avgBack =
          average(
            rounds.map(
              r => r.backNine
            )
          );

        const avgPars =
          average(
            rounds.map(
              r => r.pars
            )
          );

        const avgBogeys =
          average(
            rounds.map(
              r => r.bogeys
            )
          );

        const avgDoubleBogeys =
          average(
            rounds.map(
              r => r.doubleBogeyPlus
            )
          );

        const note =
          state.courseNotes?.[course] || "";

        return card(`

          <div class="row">

            <div>

              ${sourceBadge("Garmin")}

              <h2 class="card-title">
                ${course}
              </h2>

              <p class="text-muted">
                ${rounds.length}
                ${rounds.length === 1
                  ? " runde"
                  : " runder"}
              </p>

            </div>

            <div class="round-card__score">
              ${avgScore || "–"}
            </div>

          </div>

          <div class="metric-grid">

            ${metric(
              "Bedste score",
              formatMetric(bestScore)
            )}

            ${metric(
              "Seneste score",
              formatMetric(latest.score)
            )}

          </div>

          <div class="metric-grid metric-grid--3">

            ${metric(
              "FIR",
              formatMetric(
                avgFir,
                "%"
              )
            )}

            ${metric(
              "GIR",
              formatMetric(
                avgGir,
                "%"
              )
            )}

            ${metric(
              "Putts",
              formatMetric(
                avgPutts
              )
            )}

          </div>

          <div class="metric-grid">

            ${metric(
              "Front 9",
              formatMetric(
                avgFront
              )
            )}

            ${metric(
              "Back 9",
              formatMetric(
                avgBack
              )
            )}

          </div>

          <div class="metric-grid metric-grid--3">

            ${metric(
              "Pars",
              formatMetric(
                avgPars
              )
            )}

            ${metric(
              "Bogeys",
              formatMetric(
                avgBogeys
              )
            )}

            ${metric(
              "Double",
              formatMetric(
                avgDoubleBogeys
              )
            )}

          </div>

          <p class="text-muted">
            Seneste runde: ${latest.date}
          </p>

          <label>
            Banenoter
          </label>

          <textarea
            class="course-note"
            rows="4"
            data-course="${course}"
          >${note}</textarea>

          <button
            class="button button--outline save-course-note"
            data-course="${course}"
          >
            Gem noter
          </button>

          <hr>

          <h3 class="card-title">
            Historik
          </h3>

          ${sortedRounds.map(round => `

            <div class="metric">

              <strong>
                ${round.date}
              </strong>

              <div class="text-muted">

                Score:
                ${round.score ?? "–"}

                ${
                  round.relativeToPar != null
                    ? `(+${round.relativeToPar})`
                    : ""
                }

              </div>

            </div>

          `).join("")}

        `);

      }).join("")}

    </div>
  `;
}
