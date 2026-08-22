/**
 * Utilities for parsing the stored HTML fragment, assigning stable
 * `data-vibe-id` markers deterministically (pre-order traversal), and
 * serializing back to a clean fragment string.
 *
 * The same deterministic assignment is used both when building the preview
 * (so clicks in the iframe can be identified) and when applying an AI/manual
 * edit against the stored HTML (so the same id maps to the same node),
 * without ever persisting `data-vibe-id` into saved project files.
 */

export function parseFragment(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  return doc.body;
}

export function serializeFragment(bodyEl) {
  return bodyEl.innerHTML.trim();
}

export function assignVibeIds(rootEl) {
  let counter = 0;
  const walk = (el) => {
    for (const child of Array.from(el.children)) {
      counter += 1;
      child.setAttribute("data-vibe-id", `v${counter}`);
      walk(child);
    }
  };
  walk(rootEl);
  return rootEl;
}

export function stripVibeIds(rootEl) {
  rootEl.querySelectorAll("[data-vibe-id]").forEach((el) => {
    el.removeAttribute("data-vibe-id");
  });
  return rootEl;
}

export function findByVibeId(rootEl, vibeId) {
  if (!vibeId) return null;
  return rootEl.querySelector(`[data-vibe-id="${vibeId}"]`);
}

// Tags that can never appear in LLM-generated HTML we insert into the page —
// script execution, style/link injection into the page-wide cascade, and
// embeds/forms that could exfiltrate data or phish.
const DISALLOWED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "BASE",
  "META",
  "svg", // blocked to avoid <svg><script> smuggling; images should use <img> instead
]);

/**
 * Sanitizes an arbitrary HTML fragment (as returned by the live LLM's
 * `htmlReplace` field — see applyLLMAction.js) by walking the parsed DOM
 * tree and removing anything dangerous: disallowed tags outright, all
 * event-handler attributes (onclick, onerror, ...), and javascript: URLs in
 * href/src. This is real DOM-based sanitization, not a string/regex filter —
 * the model's raw text response is never trusted or inserted as-is.
 */
export function sanitizeHtmlFragment(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const body = doc.body;

  function clean(node) {
    // Iterate a snapshot array, not the live children collection — removing
    // a child while iterating the live collection skips the next sibling.
    for (const child of Array.from(node.children)) {
      if (DISALLOWED_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on")) {
          child.removeAttribute(attr.name);
        } else if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          child.removeAttribute(attr.name);
        }
      }
      clean(child);
    }
  }

  clean(body);
  return body.innerHTML;
}

/**
 * Builds an id-annotated copy of the stored HTML for use inside the preview
 * iframe. Returns the annotated HTML string.
 */
export function annotateForPreview(html) {
  const body = parseFragment(html);
  assignVibeIds(body);
  return serializeFragment(body);
}

/**
 * Re-derives the same vibe-id mapping against the *stored* (unannotated)
 * HTML, hands the matching node to `mutate`, then returns the new stored
 * HTML string with ids stripped again.
 */
export function withMutatedNode(html, vibeId, mutate) {
  const body = parseFragment(html);
  assignVibeIds(body);
  const node = findByVibeId(body, vibeId);
  if (!node) return null;
  mutate(node, body);
  stripVibeIds(body);
  return serializeFragment(body);
}

export function withDocument(html, mutate) {
  const body = parseFragment(html);
  // Every caller's `mutate` looks up the currently-selected element via
  // `findTarget(body, selectedVibeId, ...)`, which needs `data-vibe-id`
  // attributes to exist on this freshly-parsed body — otherwise the lookup
  // always misses and silently falls back to a generic selector, editing
  // the wrong element. Assign the same deterministic ids used by the
  // preview/selection flow, then strip them again before returning.
  assignVibeIds(body);
  mutate(body);
  stripVibeIds(body);
  return serializeFragment(body);
}
