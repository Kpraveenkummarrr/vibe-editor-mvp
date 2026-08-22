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

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * @returns {Promise<{ok: true, action: object, model: string} | {ok: false, error: string, detail?: string}>}
 */
export async function requestGeminiEdit({ prompt, selectedElement, html, css, assetNames }, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "not_configured" };

  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt({ prompt, selectedElement, html, css, assetNames }) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 900,
      // Gemini can enforce JSON output directly — a real reliability
      // advantage over prompt-only JSON instructions, which is what caused
      // the invalid_json/truncation issues seen with free OpenRouter models.
      responseMimeType: "application/json",
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
