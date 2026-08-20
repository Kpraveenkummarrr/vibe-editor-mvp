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
const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export const ALLOWED_STYLE_PROPS = [
  "color",
  "backgroundColor",
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
    action.remove || action.textReplacement || action.brandColorHex || Object.keys(action.styleChanges).length > 0;

  return hasEffect ? action : null;
}

function extractJson(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}

function buildMessages({ prompt, selectedElement, html, css }) {
  const system = `You are the editing engine inside "Vibe Editor", a visual website builder. A user is editing a live HTML/CSS page and describes a change in plain English. Respond with ONLY one JSON object (no markdown fences, no commentary before or after) matching exactly this shape:
{
  "reply": string (<=160 chars, friendly, present tense, describes what you changed),
  "scope": "element" | "page",
  "targetHint": string | null (a CSS selector to target ONLY when no element is selected, e.g. ".hero__title"; otherwise null),
  "remove": boolean (true ONLY if the user explicitly asked to remove/delete the target),
  "textReplacement": string | null (new text content, ONLY if the user asked to change/shorten/rewrite text),
  "brandColorHex": string | null (a hex color, ONLY for page-wide brand/theme color requests such as "use a darker green"),
  "styleChanges": object | null (inline style properties to set on the target element, camelCase keys; allowed keys: ${ALLOWED_STYLE_PROPS.join(", ")})
}
Only set fields relevant to the request; use null/{} otherwise. Never invent new HTML elements or return raw HTML/CSS text — only structured values from the shape above. Keep styleChanges minimal (1-4 properties) and tasteful.`;

  const context = selectedElement
    ? `The user has selected this element: <${selectedElement.tag}>${
        selectedElement.text ? ` with text "${selectedElement.text}"` : ""
      }. Prefer scope "element" and leave targetHint null.`
    : `No element is selected. Infer the most relevant target from the page HTML and set scope "page" with a targetHint CSS selector (or set brandColorHex for a page-wide color change).`;

  const user = `User request: "${prompt}"\n\n${context}\n\nCurrent page HTML:\n${html.slice(0, 4000)}\n\nCurrent page CSS:\n${css.slice(
    0,
    3000
  )}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * @returns {Promise<{ok: true, action: object, model: string} | {ok: false, error: string, detail?: string}>}
 */
export async function requestAiEdit({ prompt, selectedElement, html, css }, env = process.env) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "not_configured" };
  }

  const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const messages = buildMessages({ prompt, selectedElement, html, css });

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
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 400 }),
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
    return { ok: false, error: "invalid_json", detail: content.slice(0, 300) };
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
