import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import Button from "./ui/Button.jsx";
import { Badge } from "./ui/Primitives.jsx";
import {
  IconMonitor,
  IconCode,
  IconFolder,
  IconHistory,
  IconAlertTriangle,
  IconTablet,
  IconSmartphone,
  IconChevronDown,
  IconMenu,
  IconRocket,
  IconHammer,
} from "./ui/Icons.jsx";

const VIEW_TABS = [
  { key: "preview", label: "Preview", Icon: IconMonitor },
  { key: "code", label: "Code", Icon: IconCode },
  { key: "files", label: "Files", Icon: IconFolder },
  { key: "changes", label: "History", Icon: IconHistory },
  { key: "issues", label: "Issues", Icon: IconAlertTriangle },
];

const VIEWPORTS = [
  { key: "desktop", label: "Desktop", Icon: IconMonitor },
  { key: "tablet", label: "Tablet", Icon: IconTablet },
  { key: "mobile", label: "Mobile", Icon: IconSmartphone },
];

export default function TopBar({ onOpenModal, sidebarOpen, onToggleSidebar }) {
  const { workspace, project, dispatch, runBuild, issues } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [publishConfigured, setPublishConfigured] = useState(true);
  const [versionToast, setVersionToast] = useState(false);
  const menuRef = useRef(null);
  const saveTimer = useRef(null);
  const prevChangeCount = useRef(project.changes.length);
  const activeView = VIEW_TABS.some((t) => t.key === project.editorState.rightTab)
    ? project.editorState.rightTab
    : "preview";
  const allFiles = { ...project.files, ...project.customFiles };
  const errorCount = issues.filter((i) => i.severity === "error").length;

  useEffect(() => {
    if (project.changes.length > prevChangeCount.current) {
      setVersionToast(true);
      const t = setTimeout(() => setVersionToast(false), 2600);
      prevChangeCount.current = project.changes.length;
      return () => clearTimeout(t);
    }
    prevChangeCount.current = project.changes.length;
  }, [project.changes.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/publish-status")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((data) => {
        if (!cancelled) setPublishConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setPublishConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      {versionToast && (
        <div className="version-toast" role="status">
          <IconHistory size={13} />
          <span>New version saved</span>
          <button type="button" onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: "changes" })}>
            View
          </button>
        </div>
      )}
      <div className="project-area">
        {!sidebarOpen && (
          <button className="open-sidebar" onClick={onToggleSidebar} aria-label="Open assistant">
            <IconMenu size={16} />
          </button>
        )}
        <span className="logo" aria-hidden="true" />
        <div className="project-meta" ref={menuRef}>
          <div className="project-name-row">
            <span className="project-name">{project.name}</span>
            <button className="project-chevron" onClick={() => setMenuOpen((value) => !value)} aria-haspopup="true" aria-expanded={menuOpen}>
              <IconChevronDown size={14} />
            </button>
          </div>
          <button
            type="button"
            className="save save--link"
            onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: "changes" })}
            title="Open version history"
          >
            <span className={`save-dot ${saveState === "saving" ? "saving" : ""}`} />
            <span>{saveState === "saving" ? "Saving..." : "Saved locally"}</span>
            {project.changes.length > 0 && (
              <span className="save__history-link">
                <IconHistory size={11} />
                {project.changes.length} version{project.changes.length === 1 ? "" : "s"}
              </span>
            )}
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
              title={tab.label}
              onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: tab.key })}
            >
              <span className="view-tab__icon"><tab.Icon size={14} strokeWidth={activeView === tab.key ? 2.1 : 1.8} /></span>
              <span>{tab.label}</span>
              {tab.key === "changes" && project.changes.length > 0 && (
                <Badge tone="neutral">{project.changes.length}</Badge>
              )}
              {tab.key === "issues" && issues.length > 0 && (
                <Badge tone={errorCount > 0 ? "danger" : "warning"}>{issues.length}</Badge>
              )}
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
              <viewport.Icon size={15} />
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
          icon={<IconHammer size={13} />}
          onClick={() => {
            runBuild();
            onOpenModal("build");
          }}
        >
          Build
        </Button>
        <Button variant="primary" size="sm" className="publish" icon={<IconRocket size={13} />} onClick={() => onOpenModal("publish")}>
          Publish
          {!publishConfigured && <span className="publish__setup-dot" title="Netlify isn't connected yet" />}
        </Button>
      </div>
    </header>
  );
}
