import { classifyIntent, heuristicTargetSelector } from "./intentParser.js";
import { applyIntent } from "./applyAction.js";
import { applyLLMAction } from "./applyLLMAction.js";

/**
 * Editing engine entry point. Tries a real LLM call (OpenRouter, via our own
 * /api/ai-edit endpoint so the API key never reaches the browser) first; if
 * no key is configured, the network fails, or the model's response can't be
 * safely applied, it falls back to a deterministic local rule-based engine
 * so the editor keeps working offline. Callers can't tell which path ran
 * except via the returned `source` field — used only for the small status
 * badge in the UI, never to change behavior.
 *
 * @param {{ prompt: string, files: {html: string, css: string}, selectedElement: {vibeId, tag, text} | null }} input
 * @returns {Promise<{ reply: string, files: {html: string, css: string} | null, summary: string | null, actionType: string | null, source: "llm" | "local" }>}
 */
export async function processPrompt({ prompt, files, selectedElement, assets }) {
  if (!prompt || !prompt.trim()) {
    return {
      reply: "Please describe what you'd like to change.",
      files: null,
      summary: null,
      actionType: null,
      source: "local",
    };
  }

  // A pasted data: URI (someone copying raw image data into the chat box
  // instead of using the Assets tab) can never work: it's hundreds of KB of
  // text with no field in the action schema to carry it, and even if there
  // were, api/_lib/openrouter.js's 200-char CSS-value cap would reject it.
  // Catching this up front avoids burning a live LLM round-trip that was
  // always going to come back as an unhelpful "empty_action".
  if (/data:image\/[a-z0-9.+-]+;base64,/i.test(prompt)) {
    return {
      reply:
        "That looks like raw image data pasted into the chat — that can't be used directly. Upload the image in the Assets tab instead, then just ask me to use it, e.g. \"use the uploaded image in the hero section\" (I'll pick the most recently uploaded one, or name the file if you have more than one).",
      files: null,
      summary: null,
      actionType: "image_use",
      source: "local",
    };
  }

  const live = await tryLiveEdit({ prompt, files, selectedElement, assets });
  if (live.ok) return live.result;

  const local = await runLocalEngine({ prompt, files, selectedElement, assets });
  // `live.reason` is null when no LLM key is configured at all (the expected,
  // silent case). Any other reason means the live call was actually attempted
  // and failed — surface that instead of silently pretending the local
  // rule-based fallback was the only path that ever existed.
  return live.reason ? { ...local, fallbackReason: live.reason } : local;
}

/**
 * Picks which uploaded asset a prompt like "use this uploaded image" or
 * "use hero-photo.jpg" refers to: an explicit filename mention wins, else
 * fall back to the most recently uploaded image (index 0 doesn't exist here
 * — assets are stored oldest-first, so the most recent is the last one).
 */
function resolveAssetFromPrompt(prompt, assets) {
  if (!assets || !assets.length) return null;
  const lower = prompt.toLowerCase();
  const named = assets.find((a) => {
    const base = a.name.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    return lower.includes(a.name.toLowerCase()) || (base.length > 2 && lower.includes(base));
  });
  return named || assets[assets.length - 1];
}

/**
 * @returns {Promise<{ok: true, result: object} | {ok: false, reason: string|null}>}
 * `reason` is null for the expected "no key configured" case, and a short
 * human-readable string for every other failure (timeout, network, bad
 * upstream response, unparsable/unsafe model output) — this is what used to
 * be silently discarded, which is exactly why live failures were
 * indistinguishable from "AI never configured" in the UI.
 */
async function tryLiveEdit({ prompt, files, selectedElement, assets }) {
  let response;
  const controller = new AbortController();
  // A hung request (slow free-tier model, flaky network/proxy) must never
  // block the UI forever — without this, isThinking stays true and the
  // composer looks silently frozen. Fall back to the local engine instead.
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    response = await fetch("/api/ai-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only asset NAMES go to the server/model — never dataUrl. This keeps
      // the request small (no multi-KB base64 payloads inflating tokens/cost)
      // and means the model picks an image by name (imageAssetName) rather
      // than needing to see or reproduce its actual data.
      body: JSON.stringify({
        prompt,
        selectedElement,
        html: files.html,
        css: files.css,
        assetNames: (assets || []).map((a) => a.name),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    return { ok: false, reason: err.name === "AbortError" ? "the AI model timed out" : "couldn't reach /api/ai-edit (offline or dev server not running)" };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return { ok: false, reason: `/api/ai-edit returned HTTP ${response.status}` };

  const data = await response.json().catch(() => null);
  if (!data) return { ok: false, reason: "/api/ai-edit returned a non-JSON response" };
  if (!data.ok) {
    return { ok: false, reason: data.error === "not_configured" ? null : `live AI failed (${data.error || "unknown_error"})` };
  }

  const applied = applyLLMAction(data.action, { html: files.html, css: files.css, selectedElement, assets });
  if (!applied) return { ok: false, reason: "the model's response couldn't be safely applied to the page" };

  return {
    ok: true,
    result: {
      reply: data.action.reply,
      files: { html: applied.html, css: applied.css },
      summary: applied.summary,
      actionType: "llm_edit",
      source: "llm",
      model: data.model,
    },
  };
}

async function runLocalEngine({ prompt, files, selectedElement, assets }) {
  // Small artificial delay so the "thinking" state reads naturally when
  // falling back to the instant local engine.
  await new Promise((resolve) => setTimeout(resolve, 550));

  const intent = classifyIntent(prompt);
  const targetSelector = heuristicTargetSelector(intent.type);
  if (intent.type === "image_use") {
    intent.asset = resolveAssetFromPrompt(prompt, assets);
  }

  const result = applyIntent(intent, {
    html: files.html,
    css: files.css,
    selectedVibeId: selectedElement ? selectedElement.vibeId : null,
    targetSelector,
  });

  if (!result) {
    if (intent.type === "image_use" && !intent.asset) {
      return {
        reply: "I don't see any uploaded images yet — upload one in the Assets tab first, then ask me to use it.",
        files: null,
        summary: null,
        actionType: intent.type,
        source: "local",
      };
    }
    const where = selectedElement ? `the selected ${selectedElement.tag}` : "the page";
    return {
      reply: `I couldn't find a good match for that on ${where}. Try selecting a specific element first, or rephrase — e.g. "make the hero more premium" or "use a darker green".`,
      files: null,
      summary: null,
      actionType: intent.type,
      source: "local",
    };
  }

  const target = selectedElement
    ? `the selected ${selectedElement.tag}${selectedElement.text ? ` ("${selectedElement.text.slice(0, 40)}")` : ""}`
    : "the page";

  return {
    reply: `Done — ${result.summary.toLowerCase()} on ${target}.`,
    files: { html: result.html, css: result.css },
    summary: result.summary,
    actionType: intent.type,
    source: "local",
  };
}

export const SUGGESTED_PROMPTS = [
  "Make the hero more premium",
  "Shorten the headline",
  "Use a darker green",
  "Make this section more modern",
  "Improve the spacing",
  "Make this mobile friendly",
];
