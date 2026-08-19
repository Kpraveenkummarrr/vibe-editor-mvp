import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import Button from "./ui/Button.jsx";

const VIEW_TABS = [
  { key: "preview", label: "Preview", icon: "P" },
  { key: "code", label: "Code", icon: "</>" },
  { key: "files", label: "Files", icon: "F" },
];

const VIEWPORTS = [
  { key: "desktop", label: "Desktop", icon: "D" },
  { key: "tablet", label: "Tablet", icon: "T" },
  { key: "mobile", label: "Mobile", icon: "M" },
];

export default function TopBar({ onOpenModal, sidebarOpen, onToggleSidebar }) {
  const { workspace, project, dispatch, runBuild } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const menuRef = useRef(null);
  const saveTimer = useRef(null);
  const activeView = ["preview", "code", "files"].includes(project.editorState.rightTab)
    ? project.editorState.rightTab
    : "preview";
  const allFiles = { ...project.files, ...project.customFiles };

  useEffect(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 450);
    return () => clearTimeout(saveTimer.current);
  }, [project.files, project.name]);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onWindowBlur() {
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="project-area">
        {!sidebarOpen && (
          <button className="open-sidebar" onClick={onToggleSidebar} aria-label="Open assistant">
            =
          </button>
        )}
        <span className="logo" aria-hidden="true" />
        <div className="project-meta" ref={menuRef}>
          <div className="project-name-row">
            <span className="project-name">{project.name}</span>
            <button className="project-chevron" onClick={() => setMenuOpen((value) => !value)} aria-haspopup="true" aria-expanded={menuOpen}>
              v
            </button>
          </div>
          <div className="save">
            <span className={`save-dot ${saveState === "saving" ? "saving" : ""}`} />
            <span>{saveState === "saving" ? "Saving..." : "Saved locally"}</span>
          </div>

          {menuOpen && (
            <div className="topbar__menu" role="menu">
              <div className="topbar__menu-section-label">Projects</div>
              {workspace.projects.map((p) => (
                <button
                  key={p.id}
                  className={`topbar__menu-item ${p.id === project.id ? "is-active" : ""}`}
                  onClick={() => {
                    dispatch({ type: "SWITCH_PROJECT", id: p.id });
                    setMenuOpen(false);
                  }}
                >
                  {p.name}
                  {p.id === project.id && <span className="topbar__menu-check">ok</span>}
                </button>
              ))}
              <div className="topbar__menu-divider" />
              <button
                className="topbar__menu-item"
                onClick={() => {
                  onOpenModal("rename");
                  setMenuOpen(false);
                }}
              >
                Rename project
              </button>
              <button
                className="topbar__menu-item"
                onClick={() => {
                  dispatch({ type: "DUPLICATE_PROJECT" });
                  setMenuOpen(false);
                }}
              >
                Duplicate locally
              </button>
              <button
                className="topbar__menu-item"
                onClick={() => {
                  onOpenModal("import-export");
                  setMenuOpen(false);
                }}
              >
                Import / Export project
              </button>
              <div className="topbar__menu-divider" />
              <button
                className="topbar__menu-item topbar__menu-item--danger"
                onClick={() => {
                  if (window.confirm(`Reset "${project.name}" back to the demo starting point? This cannot be undone.`)) {
                    dispatch({ type: "RESET_PROJECT" });
                  }
                  setMenuOpen(false);
                }}
              >
                Reset demo
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="centerbar">
        <div className="center-spacer" />
        <div className="view-tabs" role="tablist" aria-label="Workspace view">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              className={`view-tab ${activeView === tab.key ? "active" : ""}`}
              aria-selected={activeView === tab.key}
              onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: tab.key })}
            >
              <span className="view-tab__icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="page-controls">
          {VIEWPORTS.map((viewport) => (
            <button
              key={viewport.key}
              className={`device-toolbar ${project.editorState.viewport === viewport.key ? "active" : ""}`}
              onClick={() => dispatch({ type: "SET_VIEWPORT", viewport: viewport.key })}
              aria-label={viewport.label}
              title={viewport.label}
            >
              {viewport.icon}
            </button>
          ))}
          <select
            className="page-picker"
            value={project.activeFile}
            onChange={(e) => dispatch({ type: "SET_ACTIVE_FILE", name: e.target.value })}
            aria-label="Current file"
          >
            {Object.keys(allFiles).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="top-actions">
        <Button
          variant="secondary"
          size="sm"
          className="share"
          onClick={() => {
            runBuild();
            onOpenModal("build");
          }}
        >
          Build
        </Button>
        <Button variant="primary" size="sm" className="publish" onClick={() => onOpenModal("publish")}>
          Publish
        </Button>
      </div>
    </header>
  );
}
