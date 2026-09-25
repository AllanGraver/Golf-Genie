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

export function roundsPage(state) {

  const grouped = {};

  state.rounds.forEach(round => {

    const course = round.course || "Ukendt bane";

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

        const latest =
          rounds
            .slice()
            .sort(
              (a, b) =>
                String(b.date)
                  .localeCompare(
                    String(a.date)
                  )
            )[0];

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

              ${
                average(
                  rounds.map(
                    x => x.score
                  )
                ) ?? "–"
              }

            </div>

          </div>

          <div class="metric-grid metric-grid--3">

            ${metric(
              "FIR",
              average(
                rounds.map(
                  x => x.fir
                )
              )
              ? `${average(
                  rounds.map(
                    x => x.fir
                  )
                )}%`
              : "–"
            )}

            ${metric(
              "GIR",
              average(
                rounds.map(
                  x => x.gir
                )
              )
              ? `${average(
                  rounds.map(
                    x => x.gir
                  )
                )}%`
              : "–"
            )}

            ${metric(
              "Putts",
              average(
                rounds.map(
                  x => x.putts
                )
              ) ?? "–"
            )}

          </div>

          <p class="text-muted">
            Seneste runde:
            ${latest.date}
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

        `);

      }).join("")}

    </div>
  `;
}
