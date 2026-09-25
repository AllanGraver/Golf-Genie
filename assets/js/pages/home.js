import {
  card,
  metric
} from "../components/ui.js";

function average(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (valid.length === 0) {
    return null;
  }

  return (
    valid.reduce((sum, value) => sum + value, 0) /
    valid.length
  ).toFixed(1);
}

export function homePage(state) {
  const profile = state.profile || {
    handicap: 12.7,
    targetHandicap: 10
  };

  const rounds = Array.isArray(state.rounds)
    ? state.rounds
    : [];

  const roundCount = rounds.length;

  const latestRound = roundCount > 0
    ? [...rounds].sort((a, b) =>
        String(b.date || "").localeCompare(
          String(a.date || "")
        )
      )[0]
    : null;

  const uniqueCourses = new Set(
    rounds.map(
      (round) => round.course || "Ukendt bane"
    )
  ).size;

  const averageScore = average(rounds.map((round) => round.score));
  const averageFir = average(rounds.map((round) => round.fir));
  const averageGir = average(rounds.map((round) => round.gir));
  const averagePutts = average(rounds.map((round) => round.putts));

  return `
    <div class="page">
      ${card(`<h2 class="card-title">Golf Genie</h2>`)}

      ${card(`
        <div class="metric-grid">
          ${metric("Baner", uniqueCourses)}
          ${metric("Runder", roundCount)}
        </div>

        <div class="metric-grid">
          ${metric("Gns. score", averageScore ?? "–")}
          ${metric("Mål HCP", profile.targetHandicap)}
        </div>
      `)}

      ${latestRound ? card(`
        <h2 class="card-title">Seneste runde</h2>
        ${metric("Bane", latestRound.course || "Ukendt bane")}
        ${metric("Score", latestRound.score ?? "–")}
      `) : card(`
        <h2 class="card-title">Importér din første Garmin-runde</h2>
        <button class="button button--accent button--full" data-page="data" type="button">
          Importér runder
        </button>
      `)}
    </div>
  `;
}
