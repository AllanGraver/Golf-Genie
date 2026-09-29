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

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function clubOptions(selectedId = "") {
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
        <input data-bag-field="brand" type="text" placeholder="Mærke" value="${escapeHtml(item.brand)}">
        <input data-bag-field="model" type="text" placeholder="Model" value="${escapeHtml(item.model)}">
      </div>
      <div class="bag-entry__meta">
        <label>
          <span>Loft</span>
          <input data-bag-field="loft" type="number" inputmode="decimal" min="5" max="70" step="0.5" placeholder="°" value="${escapeHtml(item.loft ?? "")}">
        </label>
        <label>
          <span>Årgang</span>
          <input data-bag-field="year" type="text" inputmode="numeric" maxlength="4" placeholder="2024" value="${escapeHtml(item.year)}">
        </label>
      </div>
    </article>
  `;
}

function renumberCards(editor) {
  editor.querySelectorAll("[data-profile-bag-row]").forEach((card, index) => {
    const badge = card.querySelector(".bag-entry__index");
    if (badge) badge.textContent = index + 1;
  });
}

function readBag(editor) {
  const seen = new Set();
  return [...editor.querySelectorAll("[data-profile-bag-row]")]
    .map((card, index) => {
      const field = name => card.querySelector(`[data-bag-field="${name}"]`);
      const clubId = field("clubId")?.value || "";
      const canonical = canonicalClub(clubId);
      const loftValue = String(field("loft")?.value || "").trim().replace(",", ".");
      const loft = loftValue === "" ? null : Number(loftValue);
      return {
        id: `bag-club-${Date.now()}-${index}`,
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
      list.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    if (event.target.closest("#save-profile-bag")) {
      const allSelected = [...editor.querySelectorAll('[data-bag-field="clubId"]')]
        .map(select => select.value)
        .filter(Boolean);
      const duplicates = allSelected.filter((id, index) => allSelected.indexOf(id) !== index);
      if (duplicates.length) {
        window.alert("Den samme kølletype er valgt mere end én gang. Fjern dubletten før du gemmer.");
        return;
      }
      state.profile ??= {};
      state.profile.bag = readBag(editor);
      saveState(state);
      const status = editor.querySelector("[data-profile-bag-status]");
      if (status) {
        status.hidden = false;
        status.textContent = `${state.profile.bag.length} køller er gemt og klar til matching i Bag IQ.`;
      }
      const count = editor.querySelector("[data-profile-bag-count]");
      if (count) count.textContent = `${state.profile.bag.length} køller`;
    }
  });
}

function bagEditorStyles() {
  return `
    <style>
      .profile-bag-card{padding:18px;overflow:hidden}
      .profile-bag-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .profile-bag-head .card-title{margin-bottom:4px}
      .profile-bag-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}
      .bag-entry{padding:10px;border:1px solid var(--color-border);border-radius:15px;background:linear-gradient(145deg,#fff,#f7faf9);box-shadow:0 4px 14px rgba(15,23,42,.04)}
      .bag-entry__header{display:grid;grid-template-columns:26px minmax(0,1fr) 28px;align-items:center;gap:7px}
      .bag-entry__index{display:grid;width:26px;height:26px;place-items:center;border-radius:50%;background:#e8faf2;color:var(--color-primary-700);font-size:11px;font-weight:800}
      .bag-entry__club,.bag-entry input{width:100%;min-width:0;margin:0;padding:8px 9px;border-radius:9px;font-size:12px;background:#fff}
      .bag-entry__club{font-weight:800;color:var(--color-primary-900)}
      .bag-entry__remove{display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:50%;background:#fff1f2;color:#be123c;font-size:20px;line-height:1;cursor:pointer}
      .bag-entry__remove:hover{background:#ffe4e6}
      .bag-entry__main{display:grid;grid-template-columns:1fr 1.25fr;gap:7px;margin-top:7px}
      .bag-entry__meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}
      .bag-entry__meta label{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:5px;margin:0;padding-left:8px;border:1px solid var(--color-border);border-radius:9px;background:#fff;color:var(--color-muted);font-size:10px;font-weight:700}
      .bag-entry__meta input{border:0;padding-left:2px}
      .profile-bag-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:9px;margin-top:12px}
      .profile-bag-summary{display:flex;align-items:center;gap:8px;color:var(--color-muted);font-size:12px}
      .profile-bag-summary__dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
      @media(max-width:700px){
        .profile-bag-card{padding:14px}
        .profile-bag-list{grid-template-columns:1fr;gap:8px}
        .bag-entry{padding:9px}
        .bag-entry__main{grid-template-columns:1fr 1fr}
        .profile-bag-actions{position:sticky;bottom:70px;z-index:5;padding:8px;background:rgba(248,250,249,.96);border-radius:14px;backdrop-filter:blur(10px)}
      }
      @media(max-width:390px){.bag-entry__main{grid-template-columns:1fr}.bag-entry__meta{grid-template-columns:1fr 1fr}}
    </style>
  `;
}

export function profilePage(state) {
  const profile = { ...DEFAULT_PROFILE, ...(state.profile || {}) };
  const bag = Array.isArray(profile.bag) ? profile.bag : [];
  queueMicrotask(() => bindProfileBagEditor(state));

  return `
    ${bagEditorStyles()}
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
            <div class="profile-bag-summary">
              <span class="profile-bag-summary__dot"></span>
              <span>Danske køllenavne med automatisk TrackMan-match</span>
            </div>
          </div>
          <span class="badge" data-profile-bag-count>${bag.length} køller</span>
        </div>

        <div class="profile-bag-list" data-profile-bag-list>
          ${bag.map(clubCard).join("")}
        </div>

        ${bag.length === 0 ? `
          <div class="status status--info">
            Tilføj køllerne i din bag. Mærke, model, loft og årgang er valgfrie.
          </div>
        ` : ""}

        <div class="profile-bag-actions">
          <button id="add-profile-club" class="button button--outline" type="button">+ Tilføj kølle</button>
          <button id="save-profile-bag" class="button button--accent" type="button">Gem Min Bag</button>
        </div>
        <div class="status status--success" data-profile-bag-status role="status" hidden></div>
      </section>
    </div>
  `;
}
