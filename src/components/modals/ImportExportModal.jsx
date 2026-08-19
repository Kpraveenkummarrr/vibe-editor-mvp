import { useRef, useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import Modal from "../Modal.jsx";
import Button from "../ui/Button.jsx";
import { downloadTextFile, buildStandaloneHtml } from "../../utils/download.js";

export default function ImportExportModal({ onClose }) {
  const { project, dispatch } = useProject();
  const fileInputRef = useRef(null);
  const [feedback, setFeedback] = useState(null);

  function exportProject() {
    const payload = {
      name: project.name,
      files: project.files,
      customFiles: project.customFiles,
      exportedAt: new Date().toISOString(),
      exportedFrom: "Vibe Editor",
    };
    downloadTextFile(
      `${project.name.toLowerCase().replace(/\s+/g, "-")}.vibe.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    setFeedback({ tone: "success", text: "Project exported as JSON." });
  }

  function downloadHtml() {
    const html = buildStandaloneHtml(
      { html: project.files["index.html"], css: project.files["styles.css"], js: project.files["script.js"] },
      project.name
    );
    downloadTextFile(`${project.name.toLowerCase().replace(/\s+/g, "-")}.html`, html, "text/html");
    setFeedback({ tone: "success", text: "Standalone HTML file downloaded." });
  }

  function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.files || !parsed.files["index.html"]) {
          throw new Error("File is missing required project data.");
        }
        dispatch({
          type: "IMPORT_PROJECT",
          project: {
            name: parsed.name || "Imported project",
            files: parsed.files,
            customFiles: parsed.customFiles || {},
            activeFile: "index.html",
            selectedElement: null,
            editorState: { mode: "edit", viewport: "desktop", rightTab: "files" },
            changes: [],
            buildState: { status: "idle", lastResult: null, lastBuildAt: null },
            chat: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
        setFeedback({ tone: "success", text: `Imported "${parsed.name || "project"}" successfully.` });
      } catch (err) {
        setFeedback({ tone: "error", text: `Import failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <Modal title="Import / Export project" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="import-export">
        <section>
          <h4>Export</h4>
          <p>Save this project as a JSON file, or export the current page as standalone HTML.</p>
          <div className="import-export__actions">
            <Button variant="secondary" onClick={exportProject}>Export project (.json)</Button>
            <Button variant="secondary" onClick={downloadHtml}>Download HTML</Button>
          </div>
        </section>
        <section>
          <h4>Import</h4>
          <p>Load a previously exported .vibe.json project. It will open as a new project.</p>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose file…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={onImportFile}
          />
        </section>
        {feedback && <p className={`import-export__feedback import-export__feedback--${feedback.tone}`}>{feedback.text}</p>}
      </div>
    </Modal>
  );
}
