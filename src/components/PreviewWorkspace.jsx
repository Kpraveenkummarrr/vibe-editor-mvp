import { useEffect, useMemo, useRef } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import { annotateForPreview } from "../utils/domIds.js";
import { IconEdit, IconEye } from "./ui/Icons.jsx";

const VIEWPORTS = [
  { value: "desktop", label: "Desktop", width: "100%" },
  { value: "tablet", label: "Tablet", width: "768px" },
  { value: "mobile", label: "Mobile", width: "390px" },
];

const INJECTED_SCRIPT = `
(function () {
  function closestVibe(el) {
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-vibe-id')) return el;
      el = el.parentElement;
    }
    return null;
  }
  document.addEventListener('click', function (e) {
    if (!document.documentElement.classList.contains('vibe-edit-mode')) return;
    var el = closestVibe(e.target);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.vibe-selected').forEach(function (n) { n.classList.remove('vibe-selected'); });
    el.classList.add('vibe-selected');
    parent.postMessage({
      type: 'vibe-select',
      vibeId: el.getAttribute('data-vibe-id'),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 120),
    }, '*');
  }, true);

  window.addEventListener('message', function (e) {
    var data = e.data || {};
    if (data.type === 'vibe-set-selection') {
      document.querySelectorAll('.vibe-selected').forEach(function (n) { n.classList.remove('vibe-selected'); });
      if (data.vibeId) {
        var el = document.querySelector('[data-vibe-id="' + data.vibeId + '"]');
        if (el) el.classList.add('vibe-selected');
      }
    }
  });

  parent.postMessage({ type: 'vibe-ready' }, '*');
})();
`;

const SELECTION_STYLES = `
html.vibe-edit-mode [data-vibe-id]:hover { outline: 2px dashed #4f78ff; outline-offset: 2px; cursor: pointer; }
.vibe-selected { outline: 2px solid #4f78ff !important; outline-offset: 2px; }
`;

function buildSrcDoc(files, mode) {
  const annotatedHtml = annotateForPreview(files["index.html"]);
  return `<!doctype html>
<html class="${mode === "edit" ? "vibe-edit-mode" : ""}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${files["styles.css"] || ""}</style>
    <style>${SELECTION_STYLES}</style>
  </head>
  <body>
    ${annotatedHtml}
    <script>
      try {
        ${files["script.js"] || ""}
      } catch (err) {
        console.error("Preview script error:", err);
      }
    </script>
    <script>${INJECTED_SCRIPT}</script>
  </body>
</html>`;
}

export default function PreviewWorkspace() {
  const { project, dispatch, isThinking } = useProject();
  const iframeRef = useRef(null);
  const { mode, viewport } = project.editorState;

  const srcDoc = useMemo(() => buildSrcDoc(project.files, mode), [project.files, mode]);

  useEffect(() => {
    function onMessage(e) {
      const data = e.data || {};
      if (data.type === "vibe-select") {
        dispatch({
          type: "SELECT_ELEMENT",
          element: { vibeId: data.vibeId, tag: data.tag, text: data.text },
        });
      } else if (data.type === "vibe-ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "vibe-set-selection", vibeId: project.selectedElement?.vibeId || null },
          "*"
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [dispatch, project.selectedElement]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "vibe-set-selection", vibeId: project.selectedElement?.vibeId || null },
      "*"
    );
  }, [project.selectedElement]);

  const activeViewport = VIEWPORTS.find((v) => v.value === viewport) || VIEWPORTS[0];

  return (
    <div className="preview-workspace">
      <div className="preview-workspace__canvas">
        <div className={`preview-workspace__frame-wrap viewport-${activeViewport.value}`} style={{ width: activeViewport.width }}>
          <iframe
            ref={iframeRef}
            title="Site preview"
            className="preview-workspace__frame"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <div className="floating-tools" role="toolbar" aria-label="Preview tools">
          <button
            className={`float-tool ${mode === "edit" ? "active" : ""}`}
            type="button"
            onClick={() => dispatch({ type: "SET_MODE", mode: "edit" })}
            aria-label="Edit mode"
            title="Edit mode"
          >
            <IconEdit size={13} />
            <span>Edit</span>
          </button>
          <button
            className={`float-tool ${mode === "preview" ? "active" : ""}`}
            type="button"
            onClick={() => dispatch({ type: "SET_MODE", mode: "preview" })}
            aria-label="Preview mode"
            title="Preview mode"
          >
            <IconEye size={13} />
            <span>View</span>
          </button>
          <span className="float-sep" />
          <span className="float-status">
            {isThinking ? "Updating" : activeViewport.width === "100%" ? "Fluid" : activeViewport.width}
          </span>
        </div>
      </div>
    </div>
  );
}
