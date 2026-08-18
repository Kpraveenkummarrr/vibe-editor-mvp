import { useMemo } from "react";

/**
 * Builds a single HTML document string combining the user's HTML, CSS, and
 * JS so it can be rendered inside a sandboxed iframe. The iframe sandbox
 * isolates any runtime errors in the user's JS from the main app.
 */
function buildSrcDoc({ html, css, js }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 16px; font-family: system-ui, sans-serif; color: #0f172a; }
      ${css || ""}
    </style>
  </head>
  <body>
    ${html || ""}
    <script>
      try {
        ${js || ""}
      } catch (err) {
        document.body.insertAdjacentHTML(
          "beforeend",
          '<pre style="color:#dc2626;background:#fee2e2;padding:8px;border-radius:6px;margin-top:12px;">Runtime error: ' +
            (err && err.message ? err.message : String(err)) +
            '</pre>'
        );
      }
    </script>
  </body>
</html>`;
}

export default function PreviewPanel({ code }) {
  const srcDoc = useMemo(() => {
    try {
      return buildSrcDoc(code);
    } catch (err) {
      return `<p style="color:red;">Failed to build preview: ${err.message}</p>`;
    }
  }, [code]);

  return (
    <section className="panel preview-panel" aria-label="Live preview">
      <h2 className="panel__title">Live Preview</h2>
      <iframe
        title="Live preview"
        className="preview-panel__frame"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
      />
    </section>
  );
}
