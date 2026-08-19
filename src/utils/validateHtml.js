/**
 * Lightweight HTML/CSS validation for the Issues panel. Runs entirely in
 * the browser (DOMParser) — no external linting service required.
 */
export function validateProject({ html, css }) {
  const issues = [];
  const doc = new DOMParser().parseFromString(html || "", "text/html");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    issues.push({
      severity: "error",
      message: "HTML could not be parsed — check for unclosed or malformed tags.",
    });
  }

  doc.querySelectorAll("img").forEach((img) => {
    if (!img.getAttribute("alt")) {
      issues.push({
        severity: "warning",
        message: `Image missing "alt" text (${img.getAttribute("src") || "no src"}).`,
      });
    }
  });

  doc.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.trim() === "" || href.trim() === "#") {
      issues.push({
        severity: "warning",
        message: `Link "${a.textContent.trim().slice(0, 30) || "(empty)"}" has an empty or placeholder href.`,
      });
    }
  });

  const ids = new Set();
  doc.querySelectorAll("[id]").forEach((el) => {
    const id = el.getAttribute("id");
    if (ids.has(id)) {
      issues.push({ severity: "error", message: `Duplicate element id "${id}".` });
    }
    ids.add(id);
  });

  if (!doc.querySelector("h1")) {
    issues.push({ severity: "info", message: "Page has no top-level heading (h1)." });
  }

  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({ severity: "error", message: "CSS has mismatched braces — check for a missing { or }." });
  }

  return issues;
}
