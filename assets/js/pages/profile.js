import { saveState } from "../core/storage.js";

const DEFAULT_PROFILE = {
  handicap: 12.7,
  targetHandicap: 10.0,
  homeCourse: "",
  handedness: "Right",
  age: 42,
  bag: []
};

const CLUB_OPTIONS = [
  "Driver", "2W", "3W", "4W", "5W", "7W", "9W",
  "2H", "3H", "4H", "5H", "6H",
  "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i",
  "PW", "GW", "AW", "SW", "LW", "Putter"
];

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function clubRow(item = {}, index = 0) {
  const selectedClub = String(item.club || "");
  const options = CLUB_OPTIONS.map((club) => `
    <option value="${escapeAttribute(club)}" ${club === selectedClub ? "selected" : ""}>
      ${escapeAttribute(club)}
    </option>
  `).join("");
  return `
    <div class="profile-bag-row" data-profile-bag-row>
      <div class="profile-bag-row__header">
        <strong>Kølle ${index + 1}</strong>
        <button class="button button--danger remove-profile-club" type="button">Fjern</button>
      </div>
      <div class="profile-bag-grid">
        <div>
          <label>Kølle</label>
          <select data-bag-field="club">
            <option value="">Vælg kølle</option>
            ${options}
          </select>
        </div>
        <div>
          <label>Mærke</label>
          <input data-bag-field="brand" type="text" placeholder="F.eks. TaylorMade" value="${escapeAttribute(item.brand)}">
        </div>
        <div>
          <label>Model</label>
          <input data-bag-field="model" type="text" placeholder="F.eks. P770" value="${escapeAttribute(item.model)}">
        </div>
        <div>
          <label>Loft</label>
          <input data-bag-field="loft" type="number" inputmode="decimal" min="5" max="70" step="0.5" placeholder="°" value="${escapeAttribute(item.loft ?? "")}">
        </div>
        <div>
          <label>Årgang</label>
          <input data-bag-field="year" type="text" inputmode="numeric" maxlength="4" placeholder="F.eks. 2024" value="${escapeAttribute(item.year)}">
        </div>
      </div>
    </div>
  `;
}

function renumberRows(root) {
  root.querySelectorAll("[data-profile-bag-row]").forEach((row, index) => {
    const title = row.querySelector(".profile-bag-row__header strong");
    if (title) title.textContent = `Kølle ${index + 1}`;
  });
}

function readBag(root) {
  return Array.from(root.querySelectorAll("[data-profile-bag-row]"))
    .map((row, index) => {
      const field = (name) => row.querySelector(`[data-bag-field="${name}"]`);
      const loftValue = String(field("loft")?.value || "").trim().replace(",", ".");
      const loft = loftValue === "" ? null : Number(loftValue);
      return {
        id: `bag-club-${Date.now()}-${index}`,
        club: field("club")?.value.trim() || "",
        brand: field("brand")?.value.trim() || "",
        model: field("model")?.value.trim() || "",
        loft: Number.isFinite(loft) ? loft : null,
        year: field("year")?.value.trim() || ""
      };
    })
    .filter((item) => item.club);
}

export function bindProfileBagEditor(state, root = document) {
  const editor = root.querySelector("[data-profile-bag-editor]");
  if (!editor || editor.dataset.bound === "true") return;
  editor.dataset.bound = "true";

  editor.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-profile-club");
    if (removeButton) {
      removeButton.closest("[data-profile-bag-row]")?.remove();
      renumberRows(editor);
      return;
    }
    if (event.target.closest("#add-profile-club")) {
      const list = editor.querySelector("[data-profile-bag-list]");
      if (!list) return;
      list.insertAdjacentHTML("beforeend", clubRow({}, list.children.length));
      renumberRows(editor);
      list.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (event.target.closest("#save-profile-bag")) {
      state.profile ??= {};
      state.profile.bag = readBag(editor);
      saveState(state);
      const status = editor.querySelector("[data-profile-bag-status]");
      if (status) {
        status.hidden = false;
        status.textContent = `${state.profile.bag.length} køller er gemt i Min Bag.`;
      }
    }
  });
}

export function profilePage(state) {
  const profile = { ...DEFAULT_PROFILE, ...(state.profile || {}) };
  const bag = Array.isArray(profile.bag) ? profile.bag : [];
  queueMicrotask(() => bindProfileBagEditor(state));

  return `
    <div class="page profile-page">
      <div class="card">
        <p class="eyebrow">PROFIL</p>
        <h2 class="card-title">Spillerprofil</h2>
        <p class="text-muted">Oplysningerne gemmes lokalt og bruges til at tilpasse Golf Genie.</p>

        <label for="hcp">Handicap</label>
        <input id="hcp" type="number" inputmode="decimal" step="0.1" min="-10" max="54" value="${profile.handicap}">

        <label for="target">Målhandicap</label>
        <input id="target" type="number" inputmode="decimal" step="0.1" min="-10" max="54" value="${profile.targetHandicap}">

        <label for="course">Hjemmebane</label>
        <input id="course" type="text" autocomplete="organization" placeholder="Eksempelvis Aarhus Golf Club" value="${escapeAttribute(profile.homeCourse)}">

        <label for="handedness">Spillehånd</label>
        <select id="handedness">
          <option value="Right" ${profile.handedness === "Right" ? "selected" : ""}>Højrehåndet</option>
          <option value="Left" ${profile.handedness === "Left" ? "selected" : ""}>Venstrehåndet</option>
        </select>

        <label for="age">Alder</label>
        <input id="age" type="number" inputmode="numeric" step="1" min="1" max="120" value="${profile.age}">

        <button id="save-profile" class="button button--accent button--full" type="button">Gem profil</button>
      </div>

      <div class="card" data-profile-bag-editor>
        <div class="section-heading">
          <div>
            <p class="eyebrow">MIN BAG</p>
            <h2 class="card-title">Jern og køller</h2>
          </div>
          <span class="badge">${bag.length} registreret</span>
        </div>
        <p class="text-muted">
          Registrér kølletype, mærke, model, loft og eventuelt årgang. Bag IQ matcher kølletype mod navnet i TrackMan-data.
        </p>
        <div class="profile-bag-list" data-profile-bag-list>
          ${bag.map(clubRow).join("")}
        </div>
        ${bag.length === 0 ? `<div class="status status--info">Du har endnu ikke registreret køller i Min Bag.</div>` : ""}
        <div class="profile-bag-actions">
          <button id="add-profile-club" class="button button--outline" type="button">Tilføj kølle</button>
          <button id="save-profile-bag" class="button button--accent" type="button">Gem Min Bag</button>
        </div>
        <div class="status status--success" data-profile-bag-status role="status" hidden></div>
      </div>

      <div class="status status--info">
        Profil og Min Bag gemmes kun lokalt på denne enhed. Hvis browserdata slettes, nulstilles oplysningerne.
      </div>
    </div>
  `;
}
