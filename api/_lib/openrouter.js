/**
 * Server-side OpenRouter integration. Framework-agnostic (used by the
 * Vercel serverless functions in api/*.js AND the Vite dev middleware in
 * vite.config.js) so the same code path runs in dev and production.
 *
 * OPENROUTER_API_KEY must never be exposed to the client — it is only read
 * here, server-side. The client only ever talks to our own /api/ai-edit
 * endpoint, which forwards a structured, sanitized result.
 *
 * Design: the model is handed the FULL current page HTML (with stable
 * data-vibe-id markers) and CSS, and returns the FULL updated HTML and/or
 * CSS reflecting whatever the user asked for — not a fixed menu of action
 * types. There is no prompt-keyword-to-action mapping here; the model
 * decides what needs to change and writes it directly, the same way a real
 * code-editing AI does. The only things kept out of its hands entirely are
 * (a) raw script/behavior — expressible only through the narrow
 * `onClickAlert` field, applied via a fixed, non-model-controlled JS
 * template — and (b) real asset bytes — the model references an uploaded
 * image only by filename (`vibe-asset:<name>` placeholders resolved
 * client-side in src/ai/applyLLMAction.js), never sees or invents data URLs.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "poolside/laguna-s-2.1:free";

// Real code-execution risk (not a business-logic allow-list): these tags and
// attributes are stripped from the model's returned HTML unconditionally by
// src/utils/domIds.js's sanitizeHtmlFragment (the authoritative, DOM-based
// pass) — this pattern is only a cheap early rejection so an obviously
// unsafe response never leaves the server.
const DANGEROUS_HTML_PATTERN = /<script|<style|<link|<iframe|<object|<embed|<form|javascript:|on\w+\s*=/i;
const DANGEROUS_CSS_PATTERN = /<\/?script|javascript:|expression\(|@import/i;

function sanitizeHtmlField(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim().slice(0, 40000);
  if (DANGEROUS_HTML_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function sanitizeCssField(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim().slice(0, 40000);
  if (DANGEROUS_CSS_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validates and strips an untrusted model response down to only the safe
 * fields our client applier (src/ai/applyLLMAction.js) understands. Returns
 * null if the result has no usable effect at all.
 */
export function sanitizeAction(raw) {
  if (!raw || typeof raw !== "object") return null;

  const onClickAlertRaw = raw.onClickAlert && typeof raw.onClickAlert === "object" ? raw.onClickAlert : null;
  const onClickAlert =
    onClickAlertRaw &&
    typeof onClickAlertRaw.targetVibeId === "string" &&
    onClickAlertRaw.targetVibeId.trim() &&
    typeof onClickAlertRaw.message === "string" &&
    onClickAlertRaw.message.trim()
      ? { targetVibeId: onClickAlertRaw.targetVibeId.trim().slice(0, 40), message: onClickAlertRaw.message.trim().slice(0, 200) }
      : null;

  const action = {
    reply: typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim().slice(0, 300) : "Applied your requested change.",
    html: sanitizeHtmlField(raw.html),
    css: sanitizeCssField(raw.css),
    onClickAlert,
  };

  const hasEffect = action.html || action.css || action.onClickAlert;
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
 * mid-object (the full html/css fields make this more likely than the old
 * small-action schema). Only closes structure that's still open — never
 * invents field values — so a near-complete action can still be salvaged
 * instead of the whole edit being discarded on a technicality. A truncated
 * `html`/`css` string value itself is still handled downstream: applying it
 * goes through DOM parsing (tolerant of malformed markup, same as a real
 * browser) and an empty-result guard, so a badly-cut response fails safely
 * rather than corrupting the stored page.
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
  return `You are the editing engine inside "Vibe Editor", a visual website builder. A user is editing a live HTML/CSS page and describes ANY change in their own words — there is no fixed list of supported requests; understand the actual intent of whatever they type and make it happen by directly editing the page's HTML and/or CSS, the way a skilled front-end developer would.

The request may be written in ANY language or script (Tamil, Hindi, Spanish, etc.), or informally code-mixed with English (e.g. Tanglish/Hinglish, like "hero bg ah light blue gradient potu"). Understand the intent regardless of language. Write the "reply" field in the same language/script the user wrote their request in; default to English only if the request itself is in English.

You will be given the CURRENT full page HTML (with stable data-vibe-id="vN" attributes already assigned to every element) and the CURRENT full stylesheet. Respond with ONLY one JSON object (no markdown fences, no commentary before or after) matching exactly this shape:
{
  "reply": string (<=160 chars, friendly, present tense, describes what you changed),
  "html": string | null (the COMPLETE updated page HTML, or null if this request needs no HTML change),
  "css": string | null (the COMPLETE updated stylesheet, or null if this request needs no CSS change),
  "onClickAlert": { "targetVibeId": string, "message": string } | null (ONLY when the user explicitly asks for a popup/alert/notification on click of a specific element — targetVibeId is that element's data-vibe-id from the HTML you were given. This is the ONLY interactive/JS behavior you can request; there is no general way to add arbitrary JavaScript — for any other click/interaction behavior, leave this null and explain the limitation in "reply" instead of inventing something unsupported.)
}

Ground rules for html/css:
- Prefer editing CSS alone (add or change rules keyed to existing classes, or add new classes and reference them) whenever that alone can express the request — it's a smaller, safer change. Only touch HTML when you need to add/remove/reorder/restructure elements, insert an image, or change text/content — CSS cannot do those.
- When you DO return html, it must be the ENTIRE page body content from first element to last — copy every section you are not changing byte-for-byte from the input, including its data-vibe-id attributes. NEVER return just the changed fragment/section on its own; that would delete the rest of the page. Only omit data-vibe-id on brand-new elements you create.
- When you DO return css, it must be the complete stylesheet (existing rules you're not touching, unchanged, plus your edits) — never a partial snippet.
- If an element is selected (see below), prioritize your change there and its immediate context; for a page-wide request, edit whatever parts of the page are actually relevant.
- Preserve existing functionality: don't remove or rename ids/classes referenced by the page's script.js (given below for context) unless the user explicitly asked to remove that feature. Change only what the request actually requires — don't reformat, reorder, or rewrite unrelated markup or styles.
- To insert or replace an uploaded image, use an <img> tag with src="vibe-asset:EXACT_FILENAME" (or a background-image: url("vibe-asset:EXACT_FILENAME") in CSS) using one of the exact filenames listed below — never invent a filename. If the user asks for an image and no listed filename plausibly matches, don't include one; say so in "reply" instead.
- Plain semantic HTML only: div, section, header, footer, nav, h1-h6, p, span, ul, ol, li, img, a, button, strong, em, br, article. NEVER include <script>, <style>, <link>, <iframe>, <object>, <embed>, <form>, <input>, event-handler attributes like onclick, or javascript: URLs — these get stripped server-side anyway, so including them only wastes your response.
- Never invent CSS that loads external resources (@import, remote fonts you weren't given, etc.).`;
}

export function buildUserPrompt({ prompt, selectedElement, html, css, js, assetNames }) {
  const context = selectedElement
    ? `The user has selected this element: <${selectedElement.tag}> data-vibe-id="${selectedElement.vibeId}"${
        selectedElement.text ? ` with text "${selectedElement.text}"` : ""
      }. Prioritize your change there unless the request clearly applies to the whole page.`
    : `No specific element is selected — infer the most relevant target(s) from the page HTML.`;

  const assetContext =
    assetNames && assetNames.length
      ? `Uploaded images available (reference by exact filename via vibe-asset:NAME, never invent one): ${assetNames.join(", ")}`
      : `No images have been uploaded yet — if the user asks to use/insert an image, don't add one and say so in "reply".`;

  const jsContext = js && js.trim() ? `\n\nExisting script.js (context only, to avoid breaking it — you cannot edit this, only html/css/onClickAlert):\n${js.slice(0, 3000)}` : "";

  return `User request: "${prompt}"\n\n${context}\n\n${assetContext}\n\nCurrent page HTML (data-vibe-id attributes are stable markers, not part of the visible page):\n${html.slice(
    0,
    20000
  )}\n\nCurrent page CSS:\n${css.slice(0, 12000)}${jsContext}`;
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
export async function requestAiEdit({ prompt, selectedElement, html, css, js, assetNames }, env = process.env) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "not_configured" };
  }

  const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const messages = buildMessages({ prompt, selectedElement, html, css, js, assetNames });

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
      // Returning full html/css (not a small fixed action) needs a much
      // larger budget than the old schema's 900 tokens.
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 4096 }),
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
