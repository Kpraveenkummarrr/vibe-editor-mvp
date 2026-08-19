import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import Button from "./ui/Button.jsx";
import { Badge } from "./ui/Primitives.jsx";

export default function TopBar({ onOpenModal }) {
  const { workspace, project, dispatch, runBuild } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const menuRef = useRef(null);
  const saveTimer = useRef(null);

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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">V</span>
        <span className="topbar__name">Vibe Editor</span>
      </div>

      <div className="topbar__project" ref={menuRef}>
        <button className="topbar__project-btn" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="true" aria-expanded={menuOpen}>
          <span className="topbar__project-label">{project.name}</span>
          <span className="topbar__chevron">▾</span>
        </button>

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
                {p.id === project.id && <span className="topbar__menu-check">✓</span>}
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

      <div className="topbar__status">
        <Badge tone={saveState === "saving" ? "neutral" : "success"}>
          {saveState === "saving" ? "Saving…" : "Saved"}
        </Badge>
      </div>

      <div className="topbar__actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            runBuild();
            onOpenModal("build");
          }}
        >
          Build
        </Button>
      </div>
    </header>
  );
}
