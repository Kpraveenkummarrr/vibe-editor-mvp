import { findColorWord } from "./colors.js";

/**
 * Rule-based natural-language intent classifier for the local AI engine.
 * Returns a single best-matching intent describing what to do and, where
 * relevant, extracted parameters (color word, direction, etc).
 *
 * This is intentionally simple and deterministic (no external API) so the
 * editor stays fully functional offline. See ai/engine.js for how a real
 * OpenAI/Claude call could replace `classifyIntent` without touching the
 * rest of the app (it only needs to keep returning this same shape).
 */
export function classifyIntent(promptRaw) {
  const prompt = promptRaw.trim().toLowerCase();

  if (/darker|darken/.test(prompt)) {
    return { type: "color_adjust", direction: "darken", colorWord: findColorWord(prompt) };
  }
  if (/lighter|lighten|brighten/.test(prompt)) {
    return { type: "color_adjust", direction: "lighten", colorWord: findColorWord(prompt) };
  }
  const colorWord = findColorWord(prompt);
  if (colorWord && /(color|colour|use|make it|change (it|this) to)/.test(prompt)) {
    return { type: "color_set", colorWord };
  }

  if (/(shorten|shorter|more concise|too long|trim)/.test(prompt)) {
    return { type: "text_shorten" };
  }
  if (/(bigger|larger|bolder|more bold|emphasi[sz]e)/.test(prompt)) {
    return { type: "text_emphasize" };
  }

  if (/(premium|luxur|elevated|upscale|high[- ]end)/.test(prompt)) {
    return { type: "style_premium" };
  }
  if (/(modern|fresh|contemporary)/.test(prompt)) {
    return { type: "style_modern" };
  }

  if (/(spacing|padding|breathing room|cramped|crowded|tighter|looser)/.test(prompt)) {
    return { type: "spacing_increase" };
  }

  if (/(center|centre)/.test(prompt)) {
    return { type: "layout_center" };
  }

  if (/(mobile|responsive|small screen|phone)/.test(prompt)) {
    return { type: "layout_responsive" };
  }

  if (/(round|corner)/.test(prompt)) {
    return { type: "style_rounded" };
  }

  if (/(remove|delete|hide)/.test(prompt)) {
    return { type: "remove_element" };
  }

  return { type: "generic_polish" };
}

/**
 * Heuristic default target when the user hasn't selected an element:
 * some intents make most sense applied to a specific section/tag.
 */
export function heuristicTargetSelector(intentType) {
  switch (intentType) {
    case "text_shorten":
    case "text_emphasize":
      return ".hero__title, h1";
    case "style_premium":
    case "style_modern":
    case "spacing_increase":
      return "[data-vibe-section='hero'], .hero";
    case "layout_responsive":
      return null; // page-wide, handled specially
    case "color_set":
    case "color_adjust":
      return null; // page-wide brand color, handled specially
    default:
      return "[data-vibe-section='hero'], .hero";
  }
}
