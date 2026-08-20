export const COLOR_WORDS = {
  green: "#16a34a",
  blue: "#2563eb",
  red: "#dc2626",
  purple: "#7c3aed",
  orange: "#ea580c",
  black: "#0f172a",
  navy: "#1e3a8a",
  teal: "#0d9488",
  pink: "#db2777",
  yellow: "#ca8a04",
  gray: "#475569",
  grey: "#475569",
};

function clamp(n) {
  return Math.max(0, Math.min(255, n));
}

export function shadeHex(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = clamp(Math.round(((num >> 16) & 255) * (1 + percent)));
  const g = clamp(Math.round(((num >> 8) & 255) * (1 + percent)));
  const b = clamp(Math.round((num & 255) * (1 + percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function findColorWord(text) {
  return Object.keys(COLOR_WORDS).find((word) => text.includes(word)) || null;
}

export function setBrandColor(css, hex, hexDark) {
  let next = css;
  if (/--brand\s*:/.test(next)) {
    next = next.replace(/--brand\s*:\s*#[0-9a-fA-F]{3,6}\s*;/, `--brand: ${hex};`);
  }
  if (/--brand-dark\s*:/.test(next)) {
    next = next.replace(/--brand-dark\s*:\s*#[0-9a-fA-F]{3,6}\s*;/, `--brand-dark: ${hexDark};`);
  }
  return next;
}

export function currentBrandColor(css) {
  const m = css.match(/--brand\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/);
  return m ? m[1] : "#16a34a";
}
