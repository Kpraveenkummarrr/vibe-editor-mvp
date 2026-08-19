import { classifyIntent, heuristicTargetSelector } from "./intentParser.js";
import { applyIntent } from "./applyAction.js";

/**
 * Local, offline AI editing engine. No external API key is configured for
 * this project, so requests are handled by a deterministic rule-based
 * engine instead of pretending to call a real model. The shape of the
 * response ({ reply, files, summary }) is designed so a real OpenAI/Claude
 * call could later replace the body of `processPrompt` without any caller
 * changes (see README).
 *
 * @param {{ prompt: string, files: {html: string, css: string}, selectedElement: {vibeId, tag, text} | null }} input
 * @returns {Promise<{ reply: string, files: {html: string, css: string} | null, summary: string | null, actionType: string }>}
 */
export async function processPrompt({ prompt, files, selectedElement }) {
  await new Promise((resolve) => setTimeout(resolve, 550));

  if (!prompt || !prompt.trim()) {
    return {
      reply: "Please describe what you'd like to change.",
      files: null,
      summary: null,
      actionType: null,
    };
  }

  const intent = classifyIntent(prompt);
  const targetSelector = heuristicTargetSelector(intent.type);

  const result = applyIntent(intent, {
    html: files.html,
    css: files.css,
    selectedVibeId: selectedElement ? selectedElement.vibeId : null,
    targetSelector,
  });

  if (!result) {
    const where = selectedElement
      ? `the selected ${selectedElement.tag}`
      : "the page";
    return {
      reply: `I couldn't find a good match for that on ${where}. Try selecting a specific element first, or rephrase — e.g. "make the hero more premium" or "use a darker green".`,
      files: null,
      summary: null,
      actionType: intent.type,
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
