import {
  card,
  metric,
  pageHeader,
  sourceBadge
} from "../components/ui.js";

export function bagPage(state) {

  const index = Math.min(
    state.clubIndex,
    state.clubs.length - 1
  );

  const club = state.clubs[index];

  const delta =
    club.carry - club.benchmark;

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
          id="previousClub">
          ‹
        </button>

        <b>
          ${index + 1} af ${state.clubs.length}
        </b>

        <button
          class="button button--outline"
          id="nextClub">
          ›
        </button>

      </div>

      ${card(`
        ${sourceBadge("TrackMan")}

        <h2 class="club-card__name">
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

          ${state.clubs.map((x, n) => `
            <button
              class="club-tab ${
                n === index
                  ? "club-tab--active"
                  : ""
              }"
              data-club="${n}">

              <b>${x.name}</b>

              <br>

              ${x.carry} m

            </button>
          `).join("")}

        </div>
      `)}

    </div>
  `;
}
