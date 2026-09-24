import {
  getProfile,
  saveProfile
} from "../core/storage.js";

export function profilePage() {

  const profile = getProfile();

  return `
    <div class="page">

      <div class="card">

        <p class="eyebrow">PROFIL</p>

        <h2 class="card-title">
          Spillerprofil
        </h2>

        <label>Handicap</label>
        <input
          id="handicap"
          type="number"
          step="0.1"
          value="${profile.handicap}"
        >

        <label>Målhandicap</label>
        <input
          id="targetHandicap"
          type="number"
          step="0.1"
          value="${profile.targetHandicap}"
        >

        <label>Hjemmebane</label>
        <input
          id="homeCourse"
          value="${profile.homeCourse}"
        >

        <label>Spillehånd</label>

        <select id="handedness">

          <option
            value="Right"
            ${profile.handedness==="Right"?"selected":""}
          >
            Højrehåndet
          </option>

          <option
            value="Left"
            ${profile.handedness==="Left"?"selected":""}
          >
            Venstrehåndet
          </option>

        </select>

        <label>Alder</label>

        <input
          id="age"
          type="number"
          value="${profile.age}"
        >

        <button
          class="button button--accent button--full"
          id="save-profile"
        >
          Gem profil
        </button>

      </div>

    </div>
  `;
}

export function initProfilePage() {

  const button =
    document.getElementById("save-profile");

  if (!button) return;

  button.addEventListener("click", () => {

    saveProfile({

      handicap: Number(
        document.getElementById("handicap").value
      ),

      targetHandicap: Number(
        document.getElementById("targetHandicap").value
      ),

      homeCourse:
        document.getElementById("homeCourse").value,

      handedness:
        document.getElementById("handedness").value,

      age: Number(
        document.getElementById("age").value
      )

    });

    alert("Profil gemt");

  });

}
