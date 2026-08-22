/**
 * Server-side OpenRouter integration. Framework-agnostic (used by the
 * Vercel serverless functions in api/*.js AND the Vite dev middleware in
 * vite.config.js) so the same code path runs in dev and production.
 *
 * OPENROUTER_API_KEY must never be exposed to the client — it is only read
 * here, server-side. The client only ever talks to our own /api/ai-edit
 * endpoint, which forwards a structured, sanitized result.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "poolside/laguna-s-2.1:free";

export const ALLOWED_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "borderRadius",
  "boxShadow",
  "fontWeight",
  "fontSize",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textTransform",
  "transition",
  "opacity",
  "gap",
  "display",
  "flexWrap",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "maxWidth",
  "minWidth",
  "width",
  "border",
  "borderColor",
  "borderWidth",
];

function isSafeCssValue(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return false;
  const lower = value.toLowerCase();
  if (lower.includes("javascript:")) return false;
  if (lower.includes("expression(")) return false;
  if (lower.includes("url(") && !lower.includes("url(#")) return false;
  return true;
}

/**
 * Validates and strips an untrusted model response down to only the safe
 * fields/values our client applier understands. Returns null if the result
 * has no usable effect at all.
 */
const DANGEROUS_HTML_PATTERN = /<script|<style|<link|<iframe|<object|<embed|<form|javascript:|on\w+\s*=/i;

function sanitizeHtmlReplaceField(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim().slice(0, 6000);
  // Reject outright rather than trying to strip-and-salvage here — the real,
  // authoritative sanitization is the DOM-based tree walk in
  // src/utils/domIds.js's sanitizeHtmlFragment, which runs unconditionally
  // on the client regardless of what passes this check. This is just a
  // cheap early filter so obviously-bad content doesn't even leave the server.
  if (DANGEROUS_HTML_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeAction(raw) {
  if (!raw || typeof raw !== "object") return null;

  const action = {
    reply: typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim().slice(0, 300) : "Applied your requested change.",
    scope: raw.scope === "page" ? "page" : "element",
    targetHint: typeof raw.targetHint === "string" && raw.targetHint.trim() ? raw.targetHint.trim().slice(0, 120) : null,
    remove: raw.remove === true,
    textReplacement:
      typeof raw.textReplacement === "string" && raw.textReplacement.trim() ? raw.textReplacement.trim().slice(0, 300) : null,
    brandColorHex: typeof raw.brandColorHex === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw.brandColorHex) ? raw.brandColorHex : null,
    // Deliberately a NAME, never image data — the model only ever sees the
    // list of uploaded asset filenames (see buildMessages), never the actual
    // base64. The client resolves the name back to the real dataUrl locally.
    imageAssetName:
      typeof raw.imageAssetName === "string" && raw.imageAssetName.trim() ? raw.imageAssetName.trim().slice(0, 120) : null,
    htmlReplace: sanitizeHtmlReplaceField(raw.htmlReplace),
    styleChanges: {},
  };

  if (raw.styleChanges && typeof raw.styleChanges === "object") {
    for (const [key, value] of Object.entries(raw.styleChanges)) {
      if (ALLOWED_STYLE_PROPS.includes(key) && isSafeCssValue(value)) {
        action.styleChanges[key] = value;
      }
    }
  }

  const hasEffect =
    action.remove ||
    action.textReplacement ||
    action.brandColorHex ||
    action.imageAssetName ||
    action.htmlReplace ||
    Object.keys(action.styleChanges).length > 0;

  return hasEffect ? action : null;
}

export function extractJson(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}

/**
 * Best-effort recovery for a response cut off by max_tokens mid-string or
 * mid-object (e.g. a long styleChanges.backgroundImage gradient value that
 * ran past the token budget). Only closes structure that's still open —
 * never invents field values — so a near-complete action can still be
 * salvaged instead of the whole edit being discarded on a technicality.
 */
export function repairTruncatedJson(text) {
  let repaired = text;
  let quoteCount = 0;
  for (let i = 0; i < repaired.length; i += 1) {
    if (repaired[i] === '"' && repaired[i - 1] !== "\\") quoteCount += 1;
  }
  if (quoteCount % 2 === 1) repaired += '"';
  const opens = (repaired.match(/\{/g) || []).length;
  const closes = (repaired.match(/\}/g) || []).length;
  repaired += "}".repeat(Math.max(0, opens - closes));
  return repaired;
}

export function buildSystemPrompt() {
  return `You are the editing engine inside "Vibe Editor", a visual website builder. A user is editing a live HTML/CSS page and describes a change in plain English. Respond with ONLY one JSON object (no markdown fences, no commentary before or after) matching exactly this shape:
{
  "reply": string (<=160 chars, friendly, present tense, describes what you changed),
  "scope": "element" | "page",
  "targetHint": string | null (a CSS selector to target ONLY when no element is selected, e.g. ".hero__title"; otherwise null),
  "remove": boolean (true ONLY if the user explicitly asked to remove/delete the target),
  "textReplacement": string | null (new text content, ONLY if the user asked to change/shorten/rewrite text),
  "brandColorHex": string | null (a hex color, ONLY for page-wide brand/theme color requests such as "use a darker green"),
  "imageAssetName": string | null (the EXACT filename from "Uploaded images available" below, ONLY if the user asked to use/insert/replace an image and one of those filenames is a plausible match; null if they mention an image but none of the available filenames fit — never invent a filename),
  "htmlReplace": string | null (a small HTML fragment to REPLACE THE INSIDE of the target element — use this ONLY when nothing else in this schema can express the request: adding new elements, a list of testimonials/features/cards, restructuring content, adding a whole new block. Plain semantic tags only: div, section, h1-h6, p, span, ul, ol, li, img, a, button, strong, em, br. NEVER include <script>, <style>, <link>, <iframe>, <object>, <embed>, <form>, event-handler attributes like onclick, or javascript: URLs — these get stripped anyway, so including them wastes your response. Prefer the other fields above when they can express the request; only use htmlReplace for things they genuinely cannot.)
  "styleChanges": object | null (inline style properties to set on the target element, camelCase keys; allowed keys: ${ALLOWED_STYLE_PROPS.join(", ")})
}
Only set fields relevant to the request; use null/{} otherwise. Never invent new HTML elements or return raw HTML/CSS text — only structured values from the shape above. Never put image data/URLs in styleChanges or textReplacement — that's what imageAssetName is for. Keep styleChanges minimal (1-4 properties) and tasteful.`;
}

export function buildUserPrompt({ prompt, selectedElement, html, css, assetNames }) {
  const context = selectedElement
    ? `The user has selected this element: <${selectedElement.tag}>${
        selectedElement.text ? ` with text "${selectedElement.text}"` : ""
      }. Prefer scope "element" and leave targetHint null.`
    : `No element is selected. Infer the most relevant target from the page HTML and set scope "page" with a targetHint CSS selector (or set brandColorHex for a page-wide color change).`;

  const assetContext =
    assetNames && assetNames.length
      ? `Uploaded images available (reference by exact filename in imageAssetName, never invent one): ${assetNames.join(", ")}`
      : `No images have been uploaded yet — if the user asks to use/insert an image, leave imageAssetName null and say so in "reply".`;

  return `User request: "${prompt}"\n\n${context}\n\n${assetContext}\n\nCurrent page HTML:\n${html.slice(
    0,
    4000
  )}\n\nCurrent page CSS:\n${css.slice(0, 3000)}`;
}

function buildMessages(input) {
  return [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(input) },
  ];
}

/**
 * @returns {Promise<{ok: true, action: object, model: string} | {ok: false, error: string, detail?: string}>}
 */
export async function requestAiEdit({ prompt, selectedElement, html, css, assetNames }, env = process.env) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "not_configured" };
  }

  const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const messages = buildMessages({ prompt, selectedElement, html, css, assetNames });

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.PUBLIC_APP_URL || "https://vibe-editor-mvp.vercel.app",
        "X-Title": "Vibe Editor",
      },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 900 }),
    });
  } catch (err) {
    return { ok: false, error: "network_error", detail: err.message };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, error: "upstream_error", status: response.status, detail: text.slice(0, 300) };
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { ok: false, error: "empty_response" };

  let parsed;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    try {
      parsed = JSON.parse(repairTruncatedJson(extractJson(content)));
    } catch {
      return { ok: false, error: "invalid_json", detail: content.slice(0, 300) };
    }
  }

  const action = sanitizeAction(parsed);
  if (!action) return { ok: false, error: "empty_action" };

  return { ok: true, action, model };
}

export function getAiStatus(env = process.env) {
  return {
    configured: Boolean(env.OPENROUTER_API_KEY),
    model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
  };
}
