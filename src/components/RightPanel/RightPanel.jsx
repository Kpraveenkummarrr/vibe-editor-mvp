import { useProject } from "../../state/ProjectContext.jsx";
import FilesTab from "./FilesTab.jsx";
import CodeTab from "./CodeTab.jsx";
import ChangesTab from "./ChangesTab.jsx";
import IssuesTab from "./IssuesTab.jsx";
import { Badge } from "../ui/Primitives.jsx";

const TABS = [
  { key: "files", label: "Files" },
  { key: "code", label: "Code" },
  { key: "changes", label: "Changes" },
  { key: "issues", label: "Issues" },
];

export default function RightPanel() {
  const { project, dispatch, issues } = useProject();
  const activeTab = project.editorState.rightTab;
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <aside className="right-panel" aria-label="Project panel">
      <div className="right-panel__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`right-panel__tab ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: tab.key })}
          >
            {tab.label}
            {tab.key === "changes" && project.changes.length > 0 && (
              <Badge tone="neutral">{project.changes.length}</Badge>
            )}
            {tab.key === "issues" && issues.length > 0 && (
              <Badge tone={errorCount > 0 ? "danger" : "warning"}>{issues.length}</Badge>
            )}
          </button>
        ))}
      </div>

      <div className="right-panel__content">
        {activeTab === "files" && <FilesTab />}
        {activeTab === "code" && <CodeTab />}
        {activeTab === "changes" && <ChangesTab />}
        {activeTab === "issues" && <IssuesTab />}
      </div>
    </aside>
  );
}
