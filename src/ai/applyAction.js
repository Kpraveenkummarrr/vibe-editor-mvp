import { withMutatedNode, withDocument, parseFragment, assignVibeIds } from "../utils/domIds.js";
import { COLOR_WORDS, shadeHex, setBrandColor, currentBrandColor } from "./colors.js";

function px(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function bumpPadding(el, factor = 1.35, fallback = 48) {
  const current = el.style.paddingTop || el.style.padding;
  const base = px(current, fallback);
  const next = Math.round(base * factor);
  el.style.padding = `${next}px ${Math.round(next * 0.5)}px`;
}

function findTarget(body, selectedVibeId, fallbackSelector) {
  if (selectedVibeId) {
    const el = body.querySelector(`[data-vibe-id="${selectedVibeId}"]`);
    if (el) return el;
  }
  if (fallbackSelector) return body.querySelector(fallbackSelector);
  return null;
}

/**
 * Swaps an uploaded asset into a target element: replaces the src of an
 * <img> if the target IS one or contains one, otherwise sets it as a
 * cover/centered background-image. `asset.dataUrl` is our own trusted data
 * (came from the user's own file upload via FilesTab, not from model text),
 * so this intentionally bypasses the 200-char CSS-value cap in
 * api/_lib/openrouter.js — that cap exists to stop an LLM from inventing
 * arbitrary long values, not to block a real, user-provided image.
 */
export function applyImageAsset(el, asset) {
  const img = el.tagName === "IMG" ? el : el.querySelector("img");
  if (img) {
    img.setAttribute("src", asset.dataUrl);
    if (!img.getAttribute("alt")) img.setAttribute("alt", asset.name.replace(/\.[a-z0-9]+$/i, ""));
    return "img";
  }
  el.style.backgroundImage = `url("${asset.dataUrl}")`;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  return "background";
}

/**
 * Applies a classified intent against the current project files.
 * Returns { html, css, summary } on success, or null if the intent could
 * not be applied at all (e.g. no target found).
 */
export function applyIntent(intent, { html, css, selectedVibeId, targetSelector }) {
  switch (intent.type) {
    case "color_set": {
      const hex = COLOR_WORDS[intent.colorWord] || COLOR_WORDS.green;
      const hexDark = shadeHex(hex, -0.15);
      if (selectedVibeId) {
        const nextHtml = withMutatedNode(html, selectedVibeId, (el) => {
          el.style.backgroundColor = hex;
          el.style.color = "#ffffff";
        });
        if (nextHtml) {
          return { html: nextHtml, css, summary: `Changed selected element's color to ${intent.colorWord}` };
        }
      }
      return { html, css: setBrandColor(css, hex, hexDark), summary: `Updated the brand color to ${intent.colorWord}` };
    }

    case "color_adjust": {
      const base = currentBrandColor(css);
      const factor = intent.direction === "darken" ? -0.25 : 0.25;
      const hex = shadeHex(intent.colorWord ? COLOR_WORDS[intent.colorWord] || base : base, factor);
      const hexDark = shadeHex(hex, -0.15);
      if (selectedVibeId) {
        const nextHtml = withMutatedNode(html, selectedVibeId, (el) => {
          const existing = el.style.backgroundColor;
          el.style.backgroundColor = shadeHex(existing && existing.startsWith("#") ? existing : base, factor);
        });
        if (nextHtml) {
          return { html: nextHtml, css, summary: `Made the selected element's color ${intent.direction === "darken" ? "darker" : "lighter"}` };
        }
      }
      return {
        html,
        css: setBrandColor(css, hex, hexDark),
        summary: `Made the brand color${intent.colorWord ? ` a ${intent.direction === "darken" ? "darker" : "lighter"} ${intent.colorWord}` : intent.direction === "darken" ? " darker" : " lighter"}`,
      };
    }

    case "text_replace": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.textContent = intent.text;
      });
      const check = parseFragment(nextHtml);
      assignVibeIds(check);
      const changed = findTarget(check, selectedVibeId, targetSelector);
      if (!changed) return null;
      return { html: nextHtml, css, summary: `Changed the text to "${intent.text}"` };
    }

    case "text_shorten": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        const text = el.textContent.trim();
        const words = text.split(/\s+/);
        if (words.length > 6) {
          el.textContent = words.slice(0, 6).join(" ");
        } else if (text.includes(",")) {
          el.textContent = text.split(",")[0];
        }
      });
      const check = parseFragment(nextHtml);
      assignVibeIds(check);
      const changed = findTarget(check, selectedVibeId, targetSelector);
      if (!changed) return null;
      return { html: nextHtml, css, summary: "Shortened the headline text" };
    }

    case "text_emphasize": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.fontWeight = "800";
        el.style.fontSize = `${Math.round(px(el.style.fontSize, 32) * 1.15)}px`;
      });
      return { html: nextHtml, css, summary: "Made the text bigger and bolder" };
    }

    case "style_premium": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.letterSpacing = "-0.01em";
        el.style.boxShadow = "0 20px 40px -20px rgba(15, 23, 42, 0.25)";
        bumpPadding(el, 1.25, 56);
        const heading = el.matches("h1,h2,h3") ? el : el.querySelector("h1,h2,h3");
        if (heading) heading.style.fontWeight = "700";
      });
      return { html: nextHtml, css, summary: "Elevated the section with refined spacing and depth" };
    }

    case "style_modern": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.borderRadius = "16px";
        el.style.letterSpacing = "-0.01em";
      });
      return { html: nextHtml, css, summary: "Applied a more modern look to the section" };
    }

    case "style_rounded": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.borderRadius = "20px";
      });
      return { html: nextHtml, css, summary: "Rounded the corners" };
    }

    case "style_font": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.fontFamily = "'Georgia', 'Times New Roman', serif";
      });
      return { html: nextHtml, css, summary: "Updated the font on the selected element" };
    }

    case "background_gradient": {
      const hex = COLOR_WORDS[intent.colorWord] || COLOR_WORDS.blue;
      const hexLight = shadeHex(hex, 0.4);
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.backgroundImage = `linear-gradient(135deg, ${hexLight}, ${hex})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      });
      return {
        html: nextHtml,
        css,
        summary: `Added a ${intent.colorWord ? intent.colorWord + " " : ""}gradient background`,
      };
    }

    case "image_use": {
      // intent.asset is resolved upstream in engine.js's runLocalEngine,
      // which has access to project.assets — applyIntent itself stays
      // asset-source-agnostic so the same case shape works for both the
      // local engine and (via applyLLMAction.js) the live LLM path.
      if (!intent.asset) return null;
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        applyImageAsset(el, intent.asset);
      });
      const check = parseFragment(nextHtml);
      assignVibeIds(check);
      const changed = findTarget(check, selectedVibeId, targetSelector);
      if (!changed) return null;
      return { html: nextHtml, css, summary: `Used the uploaded image "${intent.asset.name}"` };
    }

    case "spacing_increase": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        bumpPadding(el, 1.4, 48);
      });
      return { html: nextHtml, css, summary: "Increased spacing for a more open layout" };
    }

    case "layout_center": {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.textAlign = "center";
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
      });
      return { html: nextHtml, css, summary: "Centered the selected content" };
    }

    case "layout_responsive": {
      let nextCss = css;
      if (!nextCss.includes("max-width: 100%; }")) {
        nextCss += `\n\nimg, table, iframe { max-width: 100%; height: auto; }`;
      }
      return { html, css: nextCss, summary: "Added responsive rules so content adapts to small screens" };
    }

    case "remove_element": {
      if (!selectedVibeId) return null;
      const nextHtml = withMutatedNode(html, selectedVibeId, (el) => {
        el.remove();
      });
      if (!nextHtml) return null;
      return { html: nextHtml, css, summary: "Removed the selected element" };
    }

    case "generic_polish":
    default: {
      const nextHtml = withDocument(html, (body) => {
        const el = findTarget(body, selectedVibeId, targetSelector);
        if (!el) return;
        el.style.transition = "box-shadow 0.2s ease, transform 0.2s ease";
        el.style.boxShadow = "0 10px 24px -16px rgba(15, 23, 42, 0.2)";
      });
      return { html: nextHtml, css, summary: "Applied a general visual refinement" };
    }
  }
}
