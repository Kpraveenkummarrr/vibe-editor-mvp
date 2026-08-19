import { useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import Button from "../ui/Button.jsx";

const CORE_ICON = { "index.html": "🌐", "styles.css": "🎨", "script.js": "⚙️" };

function formatSize(content) {
  const bytes = new Blob([content || ""]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export default function FilesTab() {
  const { project, dispatch } = useProject();
  const [newFileName, setNewFileName] = useState("");

  const coreFiles = Object.entries(project.files);
  const customFiles = Object.entries(project.customFiles);

  function openFile(name) {
    dispatch({ type: "SET_ACTIVE_FILE", name });
    dispatch({ type: "SET_RIGHT_TAB", tab: "code" });
  }

  function createFile(e) {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) return;
    if (project.files[name] || project.customFiles[name]) {
      window.alert(`A file named "${name}" already exists.`);
      return;
    }
    dispatch({ type: "CREATE_CUSTOM_FILE", name, content: "" });
    dispatch({ type: "SET_RIGHT_TAB", tab: "code" });
    setNewFileName("");
  }

  return (
    <div className="files-tab">
      <div className="files-tab__group">
        <p className="files-tab__group-label">Project files</p>
        <ul className="files-tab__list">
          {coreFiles.map(([name, content]) => (
            <li key={name}>
              <button
                className={`files-tab__item ${project.activeFile === name ? "is-active" : ""}`}
                onClick={() => openFile(name)}
              >
                <span className="files-tab__icon">{CORE_ICON[name]}</span>
                <span className="files-tab__name">{name}</span>
                <span className="files-tab__size">{formatSize(content)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="files-tab__group">
        <p className="files-tab__group-label">assets/</p>
        <p className="files-tab__hint">No binary assets in this demo project yet.</p>
      </div>

      {customFiles.length > 0 && (
        <div className="files-tab__group">
          <p className="files-tab__group-label">Custom files</p>
          <ul className="files-tab__list">
            {customFiles.map(([name, content]) => (
              <li key={name}>
                <button
                  className={`files-tab__item ${project.activeFile === name ? "is-active" : ""}`}
                  onClick={() => openFile(name)}
                >
                  <span className="files-tab__icon">📄</span>
                  <span className="files-tab__name">{name}</span>
                  <span className="files-tab__size">{formatSize(content)}</span>
                </button>
                <button
                  className="files-tab__delete"
                  aria-label={`Delete ${name}`}
                  onClick={() => {
                    if (window.confirm(`Delete "${name}"?`)) {
                      dispatch({ type: "DELETE_CUSTOM_FILE", name });
                    }
                  }}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="files-tab__new" onSubmit={createFile}>
        <input
          type="text"
          placeholder="notes.txt"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          aria-label="New file name"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={!newFileName.trim()}>
          + New file
        </Button>
      </form>
    </div>
  );
}
