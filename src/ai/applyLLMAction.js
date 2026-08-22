import { withMutatedNode, withDocument, parseFragment } from "../utils/domIds.js";
import { setBrandColor, shadeHex } from "./colors.js";
import { applyImageAsset } from "./applyAction.js";

/**
 * Applies a sanitized structured action returned by the live LLM edit
 * endpoint (see api/_lib/openrouter.js) against the current project files.
 * Mirrors applyAction.js's shape ({ html, css, summary }) so both the local
 * rule-based engine and the live LLM path plug into the same reducer flow.
 */
export function applyLLMAction(action, { html, css, selectedElement, assets }) {
  if (!action) return null;

  const matchedAsset =
    action.imageAssetName && assets
      ? assets.find((a) => a.name.toLowerCase() === action.imageAssetName.toLowerCase())
      : null;

  const hasRequestedEffect =
    action.remove || action.textReplacement || action.brandColorHex || matchedAsset || Object.keys(action.styleChanges || {}).length > 0;
  if (!hasRequestedEffect) return null;

  const mutate = (el) => {
    if (action.remove) {
      el.remove();
      return;
    }
    if (matchedAsset) {
      applyImageAsset(el, matchedAsset);
    }
    if (action.textReplacement) {
      el.textContent = action.textReplacement;
    }
    for (const [prop, value] of Object.entries(action.styleChanges || {})) {
      try {
        el.style[prop] = value;
      } catch {
        // Ignore properties the browser rejects rather than failing the whole edit.
      }
    }
  };

  let nextHtml = null;
  let targeted = false;

  if (selectedElement?.vibeId) {
    nextHtml = withMutatedNode(html, selectedElement.vibeId, (el) => {
      targeted = true;
      mutate(el);
    });
  } else {
    nextHtml = withDocument(html, (body) => {
      let el = null;
      if (action.targetHint) {
        try {
          el = body.querySelector(action.targetHint);
        } catch {
          el = null;
        }
      }
      if (!el) el = body.querySelector("[data-vibe-section='hero'], .hero, h1");
      if (el) {
        targeted = true;
        mutate(el);
      }
    });
  }

  let nextCss = css;
  if (action.brandColorHex) {
    nextCss = setBrandColor(css, action.brandColorHex, shadeHex(action.brandColorHex, -0.15));
    targeted = true;
  }

  if (!targeted) return null;

  // Guard against a mutation that produced unparsable/empty output.
  if (nextHtml !== null && !parseFragment(nextHtml).children.length) return null;

  return {
    html: nextHtml !== null ? nextHtml : html,
    css: nextCss,
    summary: action.reply,
  };
}
