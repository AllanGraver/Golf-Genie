function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeClassNames(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((className) =>
      className.replace(/[^a-zA-Z0-9_-]/g, "")
    )
    .filter(Boolean)
    .join(" ");
}

export function pageHeader(
  eyebrow,
  title,
  subtitle = ""
) {
  return `
    <header class="page-header">
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
    </header>
  `;
}

export function card(
  content,
  dark = false,
  extra = ""
) {
  const classes = [
    "card",
    dark ? "card--dark" : "",
    sanitizeClassNames(extra)
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <section class="${classes}">
      ${content ?? ""}
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

export function sourceBadge(source) {
  const normalizedSource = String(source ?? "")
    .trim()
    .toLowerCase();

  let badgeModifier = "";

  if (normalizedSource.includes("trackman")) {
    badgeModifier = "badge--trackman";
  } else if (normalizedSource.includes("garmin")) {
    badgeModifier = "badge--garmin";
  }

  const classes = [
    "badge",
    badgeModifier
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <span class="${classes}">
      ${escapeHtml(source)}
    </span>
  `;
}
