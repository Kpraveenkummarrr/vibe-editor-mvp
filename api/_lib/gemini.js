/**
 * Server-side Google Gemini integration — a second live-AI provider
 * alongside OpenRouter (openrouter.js). Reuses that file's prompt-building
 * (buildSystemPrompt/buildUserPrompt), JSON extraction/repair, and
 * sanitizeAction so both providers are validated by identical rules and
 * produce an identical action shape — the only difference between them is
 * how each talks to its own HTTP API and extracts the raw text response.
 *
 * GEMINI_API_KEY must never reach the client — the browser only ever talks
 * to our own /api/ai-edit endpoint.
 *
 * Gemini's free tier (no credit card required) is generally more available
 * than OpenRouter's shifting free-model roster, so this is used as a
 * fallback/alternate provider — see aiRouter.js for the selection order.
 */
import { buildSystemPrompt, buildUserPrompt, extractJson, repairTruncatedJson, sanitizeAction } from "./openrouter.js";

// "gemini-2.5-flash" (the original default) 404s for this project's key with
// "no longer available to new users" — confirmed directly against Google's
// API. "gemini-flash-latest" (tried next) resolves to a "thinking" model
// (currently gemini-3.7-flash) which (a) burns maxOutputTokens on an
// invisible reasoning pass before the actual JSON, frequently returning
// finishReason MAX_TOKENS with empty content, and (b) carries a very tight
// free-tier quota (20 requests/day) — both also confirmed directly, not
// assumed. "gemini-flash-lite-latest" doesn't think by default, so it
// reliably returns real content within a small token budget on the first
// try, and it's a lighter, cheaper model anyway for this task (a small
// constrained JSON action, not something that benefits from reasoning).
const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

/**
 * @returns {Promise<{ok: true, action: object, model: string} | {ok: false, error: string, detail?: string}>}
 */
export async function requestGeminiEdit({ prompt, selectedElement, html, css, js, assetNames }, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "not_configured" };

  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt({ prompt, selectedElement, html, css, js, assetNames }) }] }],
    generationConfig: {
      temperature: 0.4,
      // Returning the full page html/css (not a small fixed action) needs a
      // much larger budget than the old schema's 900 tokens.
      maxOutputTokens: 8192,
      // Gemini can enforce JSON output directly — a real reliability
      // advantage over prompt-only JSON instructions, which is what caused
      // the invalid_json/truncation issues seen with free OpenRouter models.
      responseMimeType: "application/json",
      // Deliberately no thinkingConfig here: gemini-flash-lite-latest (the
      // default above) rejects it outright with 400 INVALID_ARGUMENT
      // (confirmed directly against the API) — it isn't a thinking model,
      // so the field doesn't apply to it in the first place.
    },
  };

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: "network_error", detail: err.message };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, error: "upstream_error", status: response.status, detail: text.slice(0, 300) };
  }

  const data = await response.json().catch(() => null);
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    // A finishReason of SAFETY/RECITATION/etc means Gemini refused to
    // generate rather than returning malformed output — surface that
    // distinctly rather than a generic "empty response".
    const finishReason = data?.candidates?.[0]?.finishReason;
    return { ok: false, error: finishReason ? `gemini_${finishReason.toLowerCase()}` : "empty_response" };
  }

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

export function getGeminiStatus(env = process.env) {
  return {
    configured: Boolean(env.GEMINI_API_KEY),
    model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  };
}
