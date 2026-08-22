/**
 * Tries each configured live-AI provider in order, falling through to the
 * next on a REAL failure (network error, rate limit, deprecated/unavailable
 * model, unparsable response) — not just because one wasn't configured.
 * This is what "try whichever AI works" means in code: automatic failover
 * across providers before ever giving up to the local rule-based engine.
 *
 * Gemini is tried first when configured — its free tier (no credit card,
 * no rotating model list of the kind that broke this project's OpenRouter
 * integration twice already this session) is generally more available than
 * OpenRouter's free-model roster. OpenRouter remains a real fallback, not
 * dead code — if Gemini is unconfigured, rate-limited, or errors, this
 * tries OpenRouter next before giving up.
 */
import { requestAiEdit, getAiStatus } from "./openrouter.js";
import { requestGeminiEdit, getGeminiStatus } from "./gemini.js";

/**
 * @returns {Promise<{ok: true, action: object, model: string, provider: string} | {ok: false, error: string, detail?: string, attempts?: object[]}>}
 */
export async function requestLiveEdit(input, env = process.env) {
  const attempts = [];

  const geminiResult = await requestGeminiEdit(input, env);
  if (geminiResult.ok) return { ...geminiResult, provider: "gemini" };
  if (geminiResult.error !== "not_configured") attempts.push({ provider: "gemini", ...geminiResult });

  const openrouterResult = await requestAiEdit(input, env);
  if (openrouterResult.ok) return { ...openrouterResult, provider: "openrouter" };
  if (openrouterResult.error !== "not_configured") attempts.push({ provider: "openrouter", ...openrouterResult });

  if (attempts.length === 0) {
    // Neither provider has a key configured at all — the expected, silent
    // "use the local engine" case.
    return { ok: false, error: "not_configured" };
  }

  // At least one provider WAS configured and genuinely failed — report that
  // failure (the most recent attempt) rather than collapsing to
  // "not_configured", which would hide that a real attempt was made and
  // undo the whole point of surfacing fallbackReason to the UI.
  const last = attempts[attempts.length - 1];
  return { ok: false, error: last.error, status: last.status, detail: last.detail, attempts };
}

export function getAiProvidersStatus(env = process.env) {
  const gemini = getGeminiStatus(env);
  const openrouter = getAiStatus(env);
  return {
    configured: gemini.configured || openrouter.configured,
    providers: { gemini, openrouter },
    // Single `model` field kept for backward compatibility with the
    // existing UI banner (AssistantPanel.jsx) — reflects whichever provider
    // would actually be tried first.
    model: gemini.configured ? gemini.model : openrouter.model,
  };
}
