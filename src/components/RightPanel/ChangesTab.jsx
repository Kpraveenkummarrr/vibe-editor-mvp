import { useProject } from "../../state/ProjectContext.jsx";
import { EmptyState } from "../ui/Primitives.jsx";
import Button from "../ui/Button.jsx";

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ChangesTab() {
  const { project, dispatch } = useProject();

  if (project.changes.length === 0) {
    return (
      <EmptyState
        icon="🕓"
        title="No changes yet"
        description="Checkpoints appear here every time the assistant applies an edit, or you save a manual code change."
      />
    );
  }

  return (
    <ul className="changes-tab__list">
      {project.changes.map((change, index) => (
        <li key={change.id} className="changes-tab__item">
          <div className="changes-tab__item-main">
            <p className="changes-tab__summary">{change.summary}</p>
            <p className="changes-tab__meta">
              {formatTime(change.timestamp)}
              {index === 0 && <span className="changes-tab__current"> · current</span>}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm(`Revert "${change.summary}"? Later checkpoints will be discarded.`)) {
                dispatch({ type: "REVERT_CHANGE", changeId: change.id });
              }
            }}
          >
            Revert
          </Button>
        </li>
      ))}
    </ul>
  );
}
