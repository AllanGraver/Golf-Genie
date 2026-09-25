import {
  card,
  metric
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

export function homePage(state) {
  const profile = state.profile || {
    handicap: 12.7,
    targetHandicap: 10
  };

  const rounds =
    Array.isArray(state.rounds)
      ? state.rounds
      : [];

  const roundCount = rounds.length;

  const latestRound =
    roundCount
      ? rounds
          .slice()
          .sort(
            (a, b) =>
              String(b.date || "")
                .localeCompare(
                  String(a.date || "")
                )
          )[0]
      : null;

  const uniqueCourses =
    new Set(
      rounds.map(
        (round) =>
          round.course || "Ukendt bane"
      )
    ).size;

  const averageScore =
    average(
      rounds.map(
        (round) => round.score
      )
    );

  const averageFir =
    average(
      rounds.map(
        (round) => round.fir
      )
    );

  const averageGir =
    average(
      rounds.map(
        (round) => round.gir
      )
    );

  const averagePutts =
    average(
      rounds.map(
        (round) => round.putts
      )
    );

  return `
    <div class="page">

      ${card(`
        <div class="row">

          <div>

            <p class="eyebrow">
              DIN PROFIL
            </p>

            <div class="kpi">
              HCP ${String(
                profile.handicap
              ).replace(".", ",")}
            </div>

          </div>

          ${metric(
            "Mål",
            String(
              profile.targetHandicap
            ).replace(".", ",")
          )}

        </div>
      `, true)}

      ${card(`
        <p class="eyebrow">
          GOLF GENIE
        </p>

        <h2 class="card-title">
          Din personlige golfdatabase
        </h2>

        <p class="text-muted">
          Importér Garmin Golf scorekort,
          gennemgå statistik og opbyg
          en historik over dine runder.
        </p>
      `)}

      ${card(`
        <h2 class="card-title">
          Overblik
        </h2>

        <div class="metric-grid">

          ${metric(
            "Baner",
            uniqueCourses
          )}

          ${metric(
            "Runder",
            roundCount
          )}

        </div>

        <div class="metric-grid">

          ${metric(
            "Gns. score",
            averageScore ?? "–"
          )}

          ${metric(
            "Mål HCP",
            profile.targetHandicap
          )}

        </div>

      `)}

      ${card(`
        <h2 class="card-title">
          Gennemsnitlige nøgletal
        </h2>

        <div class="metric-grid metric-grid--3">

          ${metric(
            "FIR",
            averageFir
              ? `${averageFir}%`
              : "–"
          )}

          ${metric(
            "GIR",
            averageGir
              ? `${averageGir}%`
              : "–"
          )}

          ${metric(
            "Putts",
            averagePutts ?? "–"
          )}

        </div>
      `)}

      ${
        latestRound
          ? card(`
              <div class="row">

                <div>

                  <p class="eyebrow">
                    SENESTE RUNDE
                  </p>

                  <h2 class="card-title">
                    ${latestRound.course || "Ukendt bane"}
                  </h2>

                  <p class="text-muted">
                    ${latestRound.date || "Ukendt dato"}
                  </p>

                </div>

                <div class="round-card__score">

                  ${latestRound.score ?? "–"}

                  <small>

                    ${
                      latestRound.relativeToPar !== null &&
                      latestRound.relativeToPar !== undefined
                        ? `${
                            latestRound.relativeToPar > 0
                              ? "+"
                              : ""
                          }${latestRound.relativeToPar}`
                        : "–"
                    }

                  </small>

                </div>

              </div>

              <div class="metric-grid metric-grid--3">

                ${metric(
                  "FIR",
                  latestRound.fir != null
                    ? `${latestRound.fir}%`
                    : "–"
                )}

                ${metric(
                  "GIR",
                  latestRound.gir != null
                    ? `${latestRound.gir}%`
                    : "–"
                )}

                ${metric(
                  "Putts",
                  latestRound.putts ?? "–"
                )}

              </div>

              <div class="metric-grid">

                ${metric(
                  "Front 9",
                  latestRound.frontNine ?? "–"
                )}

                ${metric(
                  "Back 9",
                  latestRound.backNine ?? "–"
                )}

              </div>

              <div class="metric-grid metric-grid--3">

                ${metric(
                  "Pars",
                  latestRound.pars ?? "–"
                )}

                ${metric(
                  "Bogeys",
                  latestRound.bogeys ?? "–"
                )}

                ${metric(
                  "Double+",
                  latestRound.doubleBogeyPlus ?? "–"
                )}

              </div>

            `)
          : card(`
              <p class="eyebrow">
                INGEN RUNDER
              </p>

              <h2 class="card-title">
               
