import { useProject } from "../../state/ProjectContext.jsx";
import { EmptyState } from "../ui/Primitives.jsx";
import { Badge } from "../ui/Primitives.jsx";

const SEVERITY_TONE = { error: "danger", warning: "warning", info: "neutral" };
const SEVERITY_LABEL = { error: "Error", warning: "Warning", info: "Info" };

export default function IssuesTab() {
  const { issues } = useProject();
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="issues-tab">
      <div className="issues-tab__shell">
        <div className="issues-tab__head">
          <div>
            <div className="files-title">Issues</div>
            <div className="files-subtitle">
              {issues.length === 0
                ? "Everything looks clean"
                : `${errorCount} error${errorCount === 1 ? "" : "s"} · ${warningCount} warning${warningCount === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        {issues.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No issues found"
            description="HTML and CSS look clean. Issues will show up here automatically as you edit."
          />
        ) : (
          <ul className="issues-tab__list">
            {issues.map((issue, i) => (
              <li key={i} className="issues-tab__item">
                <Badge tone={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
                <p>{issue.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
