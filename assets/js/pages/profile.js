const DEFAULT_PROFILE = {
  handicap: 12.7,
  targetHandicap: 10.0,
  homeCourse: "",
  handedness: "Right",
  age: 42
};

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function profilePage(state) {
  const profile = {
    ...DEFAULT_PROFILE,
    ...(state.profile || {})
  };

  return `
    <div class="page">

      <div class="card">

        <p class="eyebrow">
          PROFIL
        </p>

        <h2 class="card-title">
          Spillerprofil
        </h2>

        <p class="text-muted">
          Oplysningerne gemmes lokalt i browseren og bruges
          til at tilpasse Golf Genie.
        </p>

        <label for="hcp">
          Handicap
        </label>

        <input
          id="hcp"
          type="number"
          inputmode="decimal"
          step="0.1"
          min="-10"
          max="54"
          value="${profile.handicap}"
        >

        <label for="target">
          Målhandicap
        </label>

        <input
          id="target"
          type="number"
          inputmode="decimal"
          step="0.1"
          min="-10"
          max="54"
          value="${profile.targetHandicap}"
        >

        <label for="course">
          Hjemmebane
        </label>

        <input
          id="course"
          type="text"
          autocomplete="organization"
          placeholder="Eksempelvis Aarhus Golf Club"
          value="${escapeAttribute(profile.homeCourse)}"
        >

        <label for="handedness">
          Spillehånd
        </label>

        <select id="handedness">
          <option
            value="Right"
            ${
              profile.handedness === "Right"
                ? "selected"
                : ""
            }
          >
            Højrehåndet
          </option>

          <option
            value="Left"
            ${
              profile.handedness === "Left"
                ? "selected"
                : ""
            }
          >
            Venstrehåndet
          </option>
        </select>

        <label for="age">
          Alder
        </label>

        <input
          id="age"
          type="number"
          inputmode="numeric"
          step="1"
          min="1"
          max="120"
          value="${profile.age}"
        >

        <button
          id="save-profile"
          class="button button--accent button--full"
          type="button"
        >
          Gem profil
        </button>

      </div>

      <div class="status status--info">
        Profiloplysningerne gemmes kun lokalt på denne enhed.
        Hvis browserens lokale data slettes, nulstilles profilen.
      </div>

    </div>
  `;
}
