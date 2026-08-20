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
export async function processPrompt({ prompt, files, selectedElement }) {
  if (!prompt || !prompt.trim()) {
    return {
      reply: "Please describe what you'd like to change.",
      files: null,
      summary: null,
      actionType: null,
      source: "local",
    };
  }

  const live = await tryLiveEdit({ prompt, files, selectedElement });
  if (live) return live;

  return runLocalEngine({ prompt, files, selectedElement });
}

async function tryLiveEdit({ prompt, files, selectedElement }) {
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
      body: JSON.stringify({ prompt, selectedElement, html: files.html, css: files.css }),
      signal: controller.signal,
    });
  } catch {
    return null; // offline, timed out, or no dev server for /api — fall back silently
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data || !data.ok) return null; // includes the expected "not_configured" case

  const applied = applyLLMAction(data.action, { html: files.html, css: files.css, selectedElement });
  if (!applied) return null;

  return {
    reply: data.action.reply,
    files: { html: applied.html, css: applied.css },
    summary: applied.summary,
    actionType: "llm_edit",
    source: "llm",
    model: data.model,
  };
}

async function runLocalEngine({ prompt, files, selectedElement }) {
  // Small artificial delay so the "thinking" state reads naturally when
  // falling back to the instant local engine.
  await new Promise((resolve) => setTimeout(resolve, 550));

  const intent = classifyIntent(prompt);
  const targetSelector = heuristicTargetSelector(intent.type);

  const result = applyIntent(intent, {
    html: files.html,
    css: files.css,
    selectedVibeId: selectedElement ? selectedElement.vibeId : null,
    targetSelector,
  });

  if (!result) {
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