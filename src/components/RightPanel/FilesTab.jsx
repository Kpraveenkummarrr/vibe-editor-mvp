import { useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import Button from "../ui/Button.jsx";

const CORE_ICON = { "index.html": "HTML", "styles.css": "CSS", "script.js": "JS" };

function formatSize(content) {
  const bytes = new Blob([content || ""]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function FileCard({ name, content, active, canDelete, onOpen, onDelete }) {
  const label = CORE_ICON[name] || "DOC";

  return (
    <li>
      <button className={`file-card ${active ? "active" : ""}`} onClick={onOpen}>
        <span className="file-icon">{label}</span>
        <span className="file-info">
          <span className="file-name">{name}</span>
          <span className="file-path">{formatSize(content)}</span>
        </span>
      </button>
      {canDelete && (
        <button className="file-delete" aria-label={`Delete ${name}`} onClick={onDelete}>
          Del
        </button>
      )}
    </li>
  );
}

export default function FilesTab() {
  const { project, dispatch } = useProject();
  const [newFileName, setNewFileName] = useState("");

  const files = [
    ...Object.entries(project.files).map(([name, content]) => ({ name, content, canDelete: false })),
    ...Object.entries(project.customFiles).map(([name, content]) => ({ name, content, canDelete: true })),
  ];

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
    <div className="files-view">
      <div className="files-shell">
        <div className="files-head">
          <div>
            <div className="files-title">Files</div>
            <div className="files-subtitle">{files.length} project files</div>
          </div>
          <div className="files-actions">
            <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: "code" })}>
              Open code
            </Button>
          </div>
        </div>

        <ul className="files-grid">
          {files.map((file) => (
            <FileCard
              key={file.name}
              name={file.name}
              content={file.content}
              active={project.activeFile === file.name}
              canDelete={file.canDelete}
              onOpen={() => openFile(file.name)}
              onDelete={() => {
                if (window.confirm(`Delete "${file.name}"?`)) {
                  dispatch({ type: "DELETE_CUSTOM_FILE", name: file.name });
                }
              }}
            />
          ))}
        </ul>

        <form className="files-new" onSubmit={createFile}>
          <input
            type="text"
            placeholder="notes.txt"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            aria-label="New file name"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!newFileName.trim()}>
            New file
          </Button>
        </form>
      </div>
    </div>
  );
}
