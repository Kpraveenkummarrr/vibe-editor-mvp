/**
 * Minimal regex-based syntax highlighter. Not a full tokenizer — good
 * enough for the small HTML/CSS/JS files this editor manages, without
 * pulling in a heavy dependency like Prism/CodeMirror.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrap(cls, text) {
  return `<span class="tok-${cls}">${text}</span>`;
}

export function highlightHtml(code) {
  const escaped = escapeHtml(code);
  return escaped.replace(
    /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([a-zA-Z0-9-]+)((?:\s+[a-zA-Z-]+(?:=(?:"[^"]*"|'[^']*'))?)*)(\s*\/?&gt;)/g,
    (match, comment, open, tag, attrs, close) => {
      if (comment) return wrap("comment", comment);
      const attrHtml = attrs.replace(
        /([a-zA-Z-]+)(=)("[^"]*"|'[^']*')/g,
        (m, name, eq, val) => `${wrap("attr", name)}${eq}${wrap("string", val)}`
      );
      return `${wrap("punct", open)}${wrap("tag", tag)}${attrHtml}${wrap("punct", close)}`;
    }
  );
}

export function highlightCss(code) {
  const escaped = escapeHtml(code);
  return escaped
    .replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap("comment", m))
    .replace(/([.#]?[a-zA-Z0-9_-]+)(\s*\{)/g, (m, sel, brace) => `${wrap("selector", sel)}${brace}`)
    .replace(/([a-zA-Z-]+)(\s*:)/g, (m, prop, colon) => `${wrap("property", prop)}${colon}`)
    .replace(/(#[0-9a-fA-F]{3,8}\b)/g, (m) => wrap("number", m))
    .replace(/(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/g, (m) => wrap("number", m));
}

export function highlightJs(code) {
  const escaped = escapeHtml(code);
  const keywords =
    /\b(const|let|var|function|return|if|else|for|while|new|this|typeof|true|false|null|undefined|try|catch|document|window)\b/g;
  return escaped
    .replace(/(\/\/.*$)/gm, (m) => wrap("comment", m))
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => wrap("string", m))
    .replace(keywords, (m) => wrap("keyword", m))
    .replace(/(\b\d+(?:\.\d+)?\b)/g, (m) => wrap("number", m));
}

export function highlightFile(filename, code) {
  if (filename.endsWith(".css")) return highlightCss(code);
  if (filename.endsWith(".js")) return highlightJs(code);
  if (filename.endsWith(".html")) return highlightHtml(code);
  return escapeHtml(code);
}
