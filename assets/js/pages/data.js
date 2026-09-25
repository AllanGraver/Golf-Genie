import {
  card,
  pageHeader,
  sourceBadge,
  metric
} from "../components/ui.js";

export function dataPage(state) {
  const totalShots = state.clubs.reduce(
    (sum, club) => sum + (club.shots || 0),
    0
  );

  const totalRounds = state.rounds.length;

  return `
    <div class="page">

      ${pageHeader(
        "LOKAL BEHANDLING",
        "Dataimport",
        "Filer behandles i browseren og gemmes lokalt."
      )}

      ${
        state.status
          ? `
            <div
              class="status status--${state.status.type}"
              role="status"
            >
              ${state.status.text}
            </div>
          `
          : ""
      }

      ${card(`
        ${sourceBadge("Garmin PNG")}

        <h2 class="card-title">
          Garmin Golf-billeder
        </h2>

        <p class="text-muted">
          Vælg scorekort og statistikbillede direkte fra
          mobilen. Vælg gerne begge billeder fra den samme
          runde på én gang.
        </p>

        <input
          id="garminImageFile"
          class="file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
        >

        <button
          id="garminImageButton"
          class="button button--upload"
          type="button"
        >
          Vælg Garmin-billeder
        </button>

        <div
          id="garminImagePreview"
          class="image-preview-grid"
          aria-live="polite"
        ></div>

        <button
          id="readGarminImages"
          class="button button--accent button--full"
          type="button"
          disabled
        >
          Læs valgte billeder
        </button>

        <div
          id="garminOcrProgress"
          class="status status--info"
          role="status"
          hidden
        ></div>

        <div
          id="garminReview"
          class="garmin-review"
          hidden
        >
          <h2 class="card-title">
            Kontrollér den aflæste runde
          </h2>

          <p class="text-muted">
            Kontrollér oplysningerne og ret eventuelle
            aflæsningsfejl inden import.
          </p>

          <label for="ocrCourse">
            Bane
          </label>

          <input
            id="ocrCourse"
            type="text"
            autocomplete="off"
            placeholder="Eksempelvis Hammel Golf Klub"
          >

          <label for="ocrTees">
            Teested
          </label>

          <input
            id="ocrTees"
            type="text"
            autocomplete="off"
            placeholder="Eksempelvis Gul Tees"
          >

          <label for="ocrDate">
            Dato
          </label>

          <input
            id="ocrDate"
            type="date"
          >

          <label for="ocrScore">
            Score
          </label>

          <input
            id="ocrScore"
            type="number"
            inputmode="numeric"
            min="1"
            max="250"
          >

          <label for="ocrRelativeToPar">
            Slag i forhold til par
          </label>

          <input
            id="ocrRelativeToPar"
            type="number"
            inputmode="numeric"
            min="-30"
            max="100"
            placeholder="Eksempelvis 17"
          >

          <div class="metric-grid metric-grid--3">

            <div>
              <label for="ocrFir">
                FIR %
              </label>

              <input
                id="ocrFir"
                type="number"
                inputmode="decimal"
                step="0.1"
                min="0"
                max="100"
              >
            </div>

            <div>
              <label for="ocrGir">
                GIR %
              </label>

              <input
                id="ocrGir"
                type="number"
                inputmode="decimal"
                step="0.1"
                min="0"
                max="100"
              >
            </div>

            <div>
              <label for="ocrPutts">
                Putts
              </label>

              <input
                id="ocrPutts"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
              >
            </div>

          </div>

          <label for="ocrRawText">
            Aflæst tekst
          </label>

          <textarea
            id="ocrRawText"
            rows="8"
            readonly
          ></textarea>

          <button
            id="importGarminOcrRound"
            class="button button--accent button--full"
            type="button"
          >
            Importér runden
          </button>
        </div>
      `)}

      ${card(`
        ${sourceBadge("TrackMan")}

        <h2 class="card-title">
          TrackMan CSV
        </h2>

        <p class="text-muted">
          Importér en CSV-fil med kolonnerne Club, Carry,
          Total og Side Offline.
        </p>

        <button
          id="trackmanButton"
          class="button button--upload"
          type="button"
        >
          Vælg TrackMan CSV
        </button>
      `)}

      ${card(`
        ${sourceBadge("Garmin")}

        <h2 class="card-title">
          Garmin JSON eller CSV
        </h2>

        <p class="text-muted">
          Brug denne import som alternativ, hvis du allerede
          har en JSON- eller CSV-fil med bane, dato, score,
          FIR, GIR og putts.
        </p>

        <button
          id="garminButton"
          class="button button--upload"
          type="button"
        >
          Vælg Garmin-fil
        </button>
      `)}

      ${card(`
        <h2 class="card-title">
          Aktuelt datagrundlag
        </h2>

        <div class="metric-grid">
          ${metric(
            "TrackMan",
            `${totalShots} slag`
          )}

          ${metric(
            "Garmin",
            `${totalRounds} ${
              totalRounds === 1
                ? "runde"
                : "runder"
            }`
          )}
        </div>

        ${
          totalRounds === 0
            ? `
              <div class="status status--info">
                Der er ingen rigtige runder importeret endnu.
                Vælg Garmin-billeder ovenfor for at importere
                den første runde.
              </div>
            `
            : ""
        }

        <button
          id="resetButton"
          class="button button--outline button--full"
          type="button"
        >
          Nulstil lokale data
        </button>
      `, true)}

      <div class="status status--info">
        Billeder og importerede data behandles lokalt i
        browseren. Gem aldrig Garmin-login, adgangskoder
        eller tokens i GitHub-repositoriet.
      </div>

    </div>
  `;
}
