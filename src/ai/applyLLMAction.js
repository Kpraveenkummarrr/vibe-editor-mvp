import { parseFragment, serializeFragment, assignVibeIds, stripVibeIds, sanitizeHtmlFragment } from "../utils/domIds.js";
import { nextId } from "../utils/id.js";

const ASSET_TOKEN = /vibe-asset:([^"')\s]+)/gi;

function findAsset(assets, name) {
  return (assets || []).find((a) => a.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Resolves every `vibe-asset:<name>` placeholder the model may have left in
 * `src`/`style` attributes against the real uploaded assets. The model only
 * ever sees asset filenames (never dataUrls, never sent to it — see
 * api/_lib/openrouter.js's buildUserPrompt) so this is the one place its
 * text reference becomes real image data; an unmatched name is dropped
 * rather than left as a dangling fake URL.
 */
function resolveAssetPlaceholders(body, assets) {
  body.querySelectorAll("[src], [style]").forEach((el) => {
    const src = el.getAttribute("src");
    if (src && src.startsWith("vibe-asset:")) {
      const asset = findAsset(assets, src.slice("vibe-asset:".length));
      if (asset) {
        el.setAttribute("src", asset.dataUrl);
        if (!el.getAttribute("alt")) el.setAttribute("alt", asset.name.replace(/\.[a-z0-9]+$/i, ""));
      } else if (el.tagName === "IMG") {
        el.remove();
      } else {
        el.removeAttribute("src");
      }
    }
    const style = el.getAttribute("style");
    if (style && ASSET_TOKEN.test(style)) {
      el.setAttribute(
        "style",
        style.replace(ASSET_TOKEN, (_match, name) => {
          const asset = findAsset(assets, name);
          return asset ? asset.dataUrl : "";
        })
      );
    }
  });
}

/**
 * Locates the element the model wants a click-alert bound to (by the
 * data-vibe-id it was shown in the prompt) and gives it a PERSISTED,
 * addressable marker for script.js to reference. Can't use data-vibe-id
 * itself for that — it's re-derived fresh on every render and never
 * persisted into stored HTML, so a script.js selector built from it would
 * silently stop matching after the very next edit. A real `id` (if the
 * element already has one) or a freshly-minted `data-vibe-hook` attribute
 * survives serialization the same way any other HTML attribute does.
 */
function resolveClickHook(body, onClickAlert) {
  if (!onClickAlert) return null;
  const el = body.querySelector(`[data-vibe-id="${onClickAlert.targetVibeId}"]`);
  if (!el) return null;
  if (!el.id) el.setAttribute("data-vibe-hook", nextId("hook"));
  const selector = el.id ? `#${el.id}` : `[data-vibe-hook="${el.getAttribute("data-vibe-hook")}"]`;
  return { selector, message: onClickAlert.message };
}

/**
 * Applies a sanitized action returned by the live LLM edit endpoint (see
 * api/_lib/openrouter.js) against the current project files. The model
 * returns the full updated page HTML and/or CSS directly — there is no
 * fixed catalog of edit types here, this just validates and wires the
 * result into the same { html, css, js, summary } shape the reducer expects.
 */
export function applyLLMAction(action, { html, css, js, assets }) {
  if (!action) return null;

  const clickRequested = Boolean(action.onClickAlert);
  if (!action.html && !action.css && !clickRequested) return null;

  let nextHtml = html;
  let clickHook = null;

  if (action.html || clickRequested) {
    let body;
    if (action.html) {
      // sanitizeHtmlFragment does the actual, authoritative security work
      // (real DOM tree-walking, not string matching) — the server's
      // pattern-based check is only a cheap early filter, never trust its
      // pass as sufficient on its own.
      const sanitized = sanitizeHtmlFragment(action.html);
      body = parseFragment(sanitized);
      if (!body.children.length) return null; // model returned garbage/empty
    } else {
      // No HTML change requested beyond the click hook — re-derive the
      // SAME deterministic vibe-id mapping the model was shown this request
      // (pre-order traversal over unchanged content is stable) so
      // targetVibeId still resolves correctly.
      body = parseFragment(html);
      assignVibeIds(body);
    }

    resolveAssetPlaceholders(body, assets);
    clickHook = resolveClickHook(body, action.onClickAlert);

    stripVibeIds(body);
    const serialized = serializeFragment(body);
    if (!serialized.trim()) return null;
    nextHtml = serialized;
  }

  let nextCss = css;
  if (action.css) {
    nextCss = action.css;
  }

  let nextJs = js || "";
  if (clickHook) {
    // The model only ever supplies a plain message string (already
    // length-capped server-side) — this template's structure is fixed by
    // us, not the model, and JSON.stringify handles safe escaping of both
    // strings into JS string literals. This is the only way requested
    // click behavior reaches script.js; there is no path for the model to
    // inject arbitrary code here.
    const snippet = `document.querySelectorAll(${JSON.stringify(clickHook.selector)}).forEach(function (el) { el.addEventListener("click", function () { window.alert(${JSON.stringify(
      clickHook.message
    )}); }); });`;
    nextJs = nextJs ? `${nextJs}\n${snippet}` : snippet;
  }

  if (nextHtml === html && nextCss === css && !clickHook) return null;

  return {
    html: nextHtml,
    css: nextCss,
    js: nextJs,
    summary: action.reply,
  };
}
