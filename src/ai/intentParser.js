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

  // Style/color instructions that must NOT be misread as literal text replacement
  // even when phrased as "change this to ...".
  const STYLE_GUARD = /(darker|darken|lighter|lighten|brighten|colou?r|shorten|shorter|concise|trim|bigger|larger|bolder|emphasi[sz]e|premium|luxur|elevated|upscale|high[- ]end|modern|fresh|contemporary|spacing|padding|breathing room|cramped|crowded|tighter|looser|center|centre|mobile|responsive|small screen|phone|round|corner|remove|delete|hide)/i;

  // Explicit mention of "text/headline/title/..." — unambiguous, always a text edit.
  const explicitTextMatch = promptRaw.match(
    /(?:change|set|replace|update|rename|turn)\s+(?:the\s+)?(?:text|headline|title|heading|copy|content|label)\b[\s\S]{0,20}?\b(?:to|into|with|as)\s*["']?([^"'.]+?)["']?[.!]?\s*$/i
  );
  if (explicitTextMatch && explicitTextMatch[1].trim()) {
    return { type: "text_replace", text: explicitTextMatch[1].trim() };
  }

  // "make it/this say X" — explicit verb "say", also unambiguous.
  const sayMatch = promptRaw.match(/make (?:it|this) say\s*["']?([^"'.]+?)["']?[.!]?\s*$/i);
  if (sayMatch && sayMatch[1].trim()) {
    return { type: "text_replace", text: sayMatch[1].trim() };
  }

  // Implicit "change this/it ... to/into X" (no explicit "text" keyword, may contain a
  // typo like "etext"). Only treat as text replacement if the trailing part doesn't
  // look like a style/color instruction, to avoid misreading "change this to darker green".
  const implicitMatch = promptRaw.match(
    /(?:change|set|replace|update|rename|turn)\s+(?:this|it)\b[\s\S]{0,20}?\b(?:to|into|with|as)\s*["']?([^"'.]+?)["']?[.!]?\s*$/i
  );
  if (implicitMatch && implicitMatch[1].trim() && !STYLE_GUARD.test(implicitMatch[1]) && !findColorWord(implicitMatch[1].toLowerCase())) {
    return { type: "text_replace", text: implicitMatch[1].trim() };
  }

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
    case "text_replace":
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