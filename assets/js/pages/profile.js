export function profilePage(state) {
  const profile = state.profile;

  return `
    <div class="page">
      <div class="card">
        <p class="eyebrow">PROFIL</p>

        <h2 class="card-title">
          Spillerprofil
        </h2>

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
          value="${profile.homeCourse}"
        >

        <label for="handedness">
          Spillehånd
        </label>

        <select id="handedness">
          <option
            value="Right"
            ${profile.handedness === "Right" ? "selected" : ""}
          >
            Højrehåndet
          </option>

          <option
            value="Left"
            ${profile.handedness === "Left" ? "selected" : ""}
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
    </div>
  `;
}
