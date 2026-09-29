import { saveState } from "../core/storage.js";
import { CLUB_CATALOG, canonicalClub } from "../core/importers.js";

const DEFAULT_PROFILE = {
  handicap: 12.7,
  targetHandicap: 10,
  homeCourse: "",
  handedness: "Right",
  age: 42,
  bag: []
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clubOptions(selectedId) {
  return CLUB_CATALOG.map(([clubId, name]) => `
    <option value="${clubId}" ${clubId === selectedId ? "selected" : ""}>
      ${escapeHtml(name)}
    </option>
  `).join("");
}

function clubCard(item = {}, index = 0) {
  const canonical = canonicalClub(item.clubId || item.club || item.name);
  const clubId = item.clubId || canonical.clubId;

  return `
    <article class="bag-entry" data-profile-bag-row>
      <div class="bag-entry__header">
        <span class="bag-entry__index">${index + 1}</span>
        <select class="bag-entry__club" data-bag-field="clubId" aria-label="Vælg kølle">
          <option value="">Vælg kølle</option>
          ${clubOptions(clubId)}
        </select>
        <button class="bag-entry__remove remove-profile-club" type="button" aria-label="Fjern kølle">×</button>
      </div>

      <div class="bag-entry__main">
        <label class="bag-entry__field">
          <span>Mærke</span>
          <input data-bag-field="brand" type="text" placeholder="F.eks. Callaway" value="${escapeHtml(item.brand)}">
        </label>
        <label class="bag-entry__field">
          <span>Model</span>
          <input data-bag-field="model" type="text" placeholder="F.eks. Apex 21 DCB" value="${escapeHtml(item.model)}">
        </label>
      </div>

      <div class="bag-entry__meta">
        <label class="bag-entry__field">
          <span>Loft</span>
          <input data-bag-field="loft" type="number" inputmode="decimal" min="5" max="70" step="0.5" placeholder="°" value="${escapeHtml(item.loft ?? "")}">
        </label>
        <label class="bag-entry__field">
          <span>Årgang</span>
          <input data-bag-field="year" type="text" inputmode="numeric" maxlength="4" placeholder="F.eks. 2024" value="${escapeHtml(item.year)}">
        </label>
      </div>
    </article>
  `;
}

function renumberCards(editor) {
  editor.querySelectorAll("[data-profile-bag-row]").forEach((card, index) => {
    const number = card.querySelector(".bag-entry__index");
    if (number) number.textContent = index + 1;
  });
}

function readBag(editor) {
  const seen = new Set();

  return [...editor.querySelectorAll("[data-profile-bag-row]")]
    .map((card, index) => {
      const field = name => card.querySelector(`[data-bag-field="${name}"]`);
      const clubId = field("clubId")?.value || "";
      const canonical = canonicalClub(clubId);
      const loftText = String(field("loft")?.value || "").trim().replace(",", ".");
      const loft = loftText === "" ? null : Number(loftText);

      return {
        id: `bag-${Date.now()}-${index}`,
        clubId,
        club: canonical.name,
        brand: field("brand")?.value.trim() || "",
        model: field("model")?.value.trim() || "",
        loft: Number.isFinite(loft) ? loft : null,
        year: field("year")?.value.trim() || ""
      };
    })
    .filter(item => item.clubId && !seen.has(item.clubId) && seen.add(item.clubId));
}

export function bindProfileBagEditor(state, root = document) {
  const editor = root.querySelector("[data-profile-bag-editor]");
  if (!editor || editor.dataset.bound === "true") return;
  editor.dataset.bound = "true";

  editor.addEventListener("click", event => {
    const remove = event.target.closest(".remove-profile-club");
    if (remove) {
      remove.closest("[data-profile-bag-row]")?.remove();
      renumberCards(editor);
      return;
    }

    if (event.target.closest("#add-profile-club")) {
      const list = editor.querySelector("[data-profile-bag-list]");
      if (!list) return;
      list.insertAdjacentHTML("beforeend", clubCard({}, list.children.length));
      renumberCards(editor);
      return;
    }

    if (event.target.closest("#save-profile-bag")) {
      const selected = [...editor.querySelectorAll('[data-bag-field="clubId"]')]
        .map(element => element.value)
        .filter(Boolean);
      const hasDuplicate = selected.some((id, index) => selected.indexOf(id) !== index);
      if (hasDuplicate) {
        window.alert("Den samme kølletype er valgt mere end én gang.");
        return;
      }

      state.profile ??= {};
      state.profile.bag = readBag(editor);
      saveState(state);

      const status = editor.querySelector("[data-profile-bag-status]");
      if (status) {
        status.hidden = false;
        status.textContent = `${state.profile.bag.length} køller er gemt.`;
      }
      const count = editor.querySelector("[data-profile-bag-count]");
      if (count) count.textContent = `${state.profile.bag.length} køller`;
    }
  });
}

function profileStyles() {
  return `
    <style>
      .profile-bag-card{padding:18px;overflow:hidden}
      .profile-bag-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
      .profile-bag-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:22px 0}
      .bag-entry{padding:16px;border:1px solid var(--color-border);border-radius:18px;background:linear-gradient(145deg,#fff,#f7faf9);box-shadow:0 8px 24px rgba(15,23,42,.06)}
      .bag-entry__header{display:grid;grid-template-columns:32px minmax(0,1fr) 34px;align-items:center;gap:10px}
      .bag-entry__index{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#e8faf2;color:var(--color-primary-700);font-size:13px;font-weight:800}
      .bag-entry__club,.bag-entry input{width:100%;min-width:0;margin:0;padding:11px 12px;border:1px solid var(--color-border);border-radius:10px;background:#fff;font:inherit;font-size:14px}
      .bag-entry__club{font-weight:800;color:var(--color-primary-900)}
      .bag-entry__remove{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:50%;background:#fff1f2;color:#be123c;font-size:22px;cursor:pointer}
      .bag-entry__main{display:grid;grid-template-columns:1fr 1.25fr;gap:12px;margin-top:14px}
      .bag-entry__meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
      .bag-entry__field{display:grid;gap:7px;margin:0;color:var(--color-muted);font-size:12px;font-weight:800}
      .bag-entry__field>span{text-transform:uppercase;letter-spacing:.06em}
      .profile-bag-actions{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(300px,1.2fr);gap:14px}

      @media(min-width:1100px){
        .profile-bag-card{padding:26px}
        .profile-bag-list{grid-template-columns:repeat(2,minmax(480px,1fr));gap:20px;margin:26px 0}
        .bag-entry{padding:20px}
        .bag-entry__main,.bag-entry__meta{gap:16px;margin-top:16px}
        .bag-entry__club,.bag-entry input{padding:13px 14px;font-size:15px}
        .bag-entry__field{font-size:13px;gap:8px}
      }

      @media(max-width:700px){
        .profile-bag-card{padding:14px}
        .profile-bag-list{grid-template-columns:1fr;gap:8px;margin:14px 0}
        .bag-entry{padding:9px;border-radius:15px;box-shadow:0 4px 14px rgba(15,23,42,.04)}
        .bag-entry__header{grid-template-columns:26px minmax(0,1fr) 28px;gap:7px}
        .bag-entry__index{width:26px;height:26px;font-size:11px}
        .bag-entry__remove{width:28px;height:28px}
        .bag-entry__club,.bag-entry input{padding:8px 9px;font-size:12px}
        .bag-entry__main,.bag-entry__meta{gap:7px;margin-top:8px}
        .bag-entry__field{font-size:10px;gap:4px}
        .profile-bag-actions{grid-template-columns:1fr 1.3fr;gap:8px}
      }
    </style>
  `;
}

export function profilePage(state) {
  const profile = { ...DEFAULT_PROFILE, ...(state.profile || {}) };
  const bag = Array.isArray(profile.bag) ? profile.bag : [];
  queueMicrotask(() => bindProfileBagEditor(state));

  return `
    ${profileStyles()}
    <div class="page profile-page">
      <div class="card">
        <p class="eyebrow">PROFIL</p>
        <h2 class="card-title">Spillerprofil</h2>
        <label for="hcp">Handicap</label>
        <input id="hcp" type="number" step="0.1" min="-10" max="54" value="${profile.handicap}">
        <label for="target">Målhandicap</label>
        <input id="target" type="number" step="0.1" min="-10" max="54" value="${profile.targetHandicap}">
        <label for="course">Hjemmebane</label>
        <input id="course" type="text" value="${escapeHtml(profile.homeCourse)}">
        <label for="handedness">Spillehånd</label>
        <select id="handedness">
          <option value="Right" ${profile.handedness === "Right" ? "selected" : ""}>Højrehåndet</option>
          <option value="Left" ${profile.handedness === "Left" ? "selected" : ""}>Venstrehåndet</option>
        </select>
        <label for="age">Alder</label>
        <input id="age" type="number" min="1" max="120" value="${profile.age}">
        <button id="save-profile" class="button button--accent button--full" type="button">Gem profil</button>
      </div>

      <section class="card profile-bag-card" data-profile-bag-editor>
        <div class="profile-bag-head">
          <div>
            <p class="eyebrow">MIN BAG</p>
            <h2 class="card-title">Udstyr</h2>
            <p class="text-muted">Danske køllenavne med automatisk TrackMan-match</p>
          </div>
          <span class="badge" data-profile-bag-count>${bag.length} køller</span>
        </div>
        <div class="profile-bag-list" data-profile-bag-list>${bag.map(clubCard).join("")}</div>
        <div class="profile-bag-actions">
          <button id="add-profile-club" class="button button--outline" type="button">+ Tilføj kølle</button>
          <button id="save-profile-bag" class="button button--accent" type="button">Gem Min Bag</button>
        </div>
        <div class="status status--success" data-profile-bag-status hidden></div>
      </section>
    </div>
  `;
}
