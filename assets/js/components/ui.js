function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function pageHeader(
  eyebrow,
  title,
  subtitle = ""
) {
  return `
    <div>

      <p class="eyebrow">
        ${escapeHtml(eyebrow)}
      </p>

      <h1 class="page-title">
        ${escapeHtml(title)}
      </h1>

      ${
        subtitle
          ? `
            <p class="text-muted">
              ${escapeHtml(subtitle)}
            </p>
          `
          : ""
      }

    </div>
  `;
}

export function card(
  content,
  dark = false,
  extra = ""
) {
  return `
    <section
      class="card ${
        dark ? "card--dark" : ""
      } ${extra}"
    >
      ${content}
    </section>
  `;
}

export function metric(
  label,
  value
) {
  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "–"
      : value;

  return `
    <div class="metric">

      <div class="metric__label">
        ${escapeHtml(label)}
      </div>

      <div class="metric__value">
        ${displayValue}
      </div>

    </div>
  `;
}

export function sourceBadge(
  source
) {

  const normalized =
    String(source)
      .toLowerCase()
      .replace(/\s+/g, "-");

  let badgeClass =
    "badge";

  if (
    normalized.includes("trackman")
  ) {
    badgeClass +=
      " badge--trackman";
  }

  if (
    normalized.includes("garmin")
  ) {
    badgeClass +=
      " badge--garmin";
  }

  return `
    <span class="${badgeClass}">
      ${escapeHtml(source)}
    </span>
  `;
}
