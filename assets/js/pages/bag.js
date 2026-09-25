import {
  card,
  metric,
  pageHeader,
  sourceBadge
} from "../components/ui.js";

export function bagPage(state) {

  if (!state.clubs?.length) {

    return `
      <div class="page">

        ${pageHeader(
          "TRACKMAN",
          "Min bag",
          "Ingen TrackMan-data importeret endnu"
        )}

        ${card(`

          <h2 class="card-title">
            Importér dine køller
          </h2>

          <p class="text-muted">
            Importér en TrackMan CSV-fil for at se
            carry, totalafstande og spredning.
          </p>

          <button
            class="button button--accent button--full"
            data-page="data"
          >
            Gå til Data
          </button>

        `)}

      </div>
    `;
  }

  const index = Math.min(
    state.clubIndex || 0,
    state.clubs.length - 1
  );

  const club =
    state.clubs[index];

  const delta =
    Number(club.carry || 0) -
    Number(club.benchmark || 0);

  return `
    <div class="page">

      ${pageHeader(
        "TRACKMAN CAPABILITY",
        "Min bag",
        "Median carry fra normale TrackMan-slag."
      )}

      <div class="row">

        <button
          class="button button--outline"
          id="previousClub"
          type="button"
        >
          ‹
        </button>

        <b>
          ${index + 1}
          af
          ${state.clubs.length}
        </b>

        <button
          class="button button--outline"
          id="nextClub"
          type="button"
        >
          ›
        </button>

      </div>

      ${card(`

        ${sourceBadge("TrackMan")}

        <h2 class="card-title">
          ${club.name}
        </h2>

        <div class="metric-grid">

          ${metric(
            "Median carry",
            `${club.carry} m`
          )}

          ${metric(
            "Total",
            `${club.total} m`
          )}

        </div>

        <div class="metric-grid metric-grid--3">

          ${metric(
            "Spredning",
            `${club.dispersion} m`
          )}

          ${metric(
            "Slag",
            club.shots
          )}

          ${metric(
            "Mod HCP",
            `${delta >= 0 ? "+" : ""}${delta} m`
          )}

        </div>

      `, true)}

      ${card(`

        <h2 class="card-title">
          Alle køller
        </h2>

        <div class="scroll-row">

          ${state.clubs.map((club, n) => `

            <button
              class="club-tab ${
                n === index
                  ? "club-tab--active"
                  : ""
              }"
              data-club="${n}"
              type="button"
            >

              <b>
                ${club.name}
              </b>

              <br>

              ${club.carry} m

            </button>

          `).join("")}

        </div>

      `)}

    </div>
  `;
}
