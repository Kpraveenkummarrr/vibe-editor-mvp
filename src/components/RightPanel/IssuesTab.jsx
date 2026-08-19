import { useProject } from "../../state/ProjectContext.jsx";
import { EmptyState } from "../ui/Primitives.jsx";
import { Badge } from "../ui/Primitives.jsx";

const SEVERITY_TONE = { error: "danger", warning: "warning", info: "neutral" };
const SEVERITY_LABEL = { error: "Error", warning: "Warning", info: "Info" };

export default function IssuesTab() {
  const { issues } = useProject();

  if (issues.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="No issues found"
        description="HTML and CSS look clean. Issues will show up here automatically as you edit."
      />
    );
  }

  return (
    <ul className="issues-tab__list">
      {issues.map((issue, i) => (
        <li key={i} className="issues-tab__item">
          <Badge tone={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
          <p>{issue.message}</p>
        </li>
      ))}
    </ul>
  );
}
