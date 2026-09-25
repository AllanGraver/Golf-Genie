import { card, metric } from "../components/ui.js";

export function homePage(state) {

  const profile = state.profile || {
    handicap: 12.7,
    targetHandicap: 10
  };

  const latestRound =
    state.rounds?.length
      ? state.rounds
          .slice()
          .sort(
            (a, b) =>
              String(b.date || "")
                .localeCompare(
                  String(a.date || "")
                )
          )[0]
      : null;

  const roundCount =
    state.rounds?.length || 0;

  const averageScore =
    roundCount
      ? (
          state.rounds.reduce(
            (sum, round) =>
              sum + Number(round.score || 0),
            0
          ) / roundCount
        ).toFixed(1)
      : null;

  return `
    <div class="page">

      ${card(`

        <div class="row">

          <div>

            <p class="eyebrow">
              DIN PROFIL
            </p>

            <div class="kpi">
              HCP ${String(profile.handicap)
                .replace(".", ",")}
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
          Din golfdatabase
        </h2>

        <p class="text-muted">
          Importér Garmin Golf scorekort
          direkte fra screenshots og byg din
          personlige banehistorik.
        </p>

      `)}

      ${card(`

        <h2 class="card-title">
          Statistik
        </h2>

        <div class="metric-grid">

          ${metric(
            "Baner",
            state.rounds
              ? new Set(
                  state.rounds.map(
                    round => round.course
                  )
                ).size
              : 0
          )}

          ${metric(
            "Runder",
            roundCount
          )}

        </div>

        <div class="metric-grid">

          ${metric(
            "Gns. score",
            averageScore || "–"
          )}

          ${metric(
            "HCP mål",
            profile.targetHandicap
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
                  ${latestRound.course}
                </h2>

                <p class="text-muted">
                  ${latestRound.date}
                </p>

              </div>

              <div class="round-card__score">

                ${latestRound.score}

                <small
                  style="
                    display:block;
                    font-size:11px
                  "
                >

                  ${
                    latestRound.relativeToPar !== null &&
                    latestRound.relativeToPar !== undefined
                      ? `+${
                          latestRound.relativeToPar
                        }`
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

          `)
          : card(`

            <p class="eyebrow">
              INGEN RUNDER
            </p>

            <h2 class="card-title">
              Importér din første Garmin-runde
            </h2>

            <p class="text-muted">
              Gå til Data og vælg dine Garmin
              Golf screenshots.
            </p>

            <button
              class="button button--accent button--full"
              data-page="data"
            >
              Importér runder
            </button>

          `)
      }

    </div>
  `;
}
