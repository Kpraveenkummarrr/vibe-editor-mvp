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

function diffSize(change) {
  if (!change.snapshotBefore || !change.snapshotAfter) return null;
  const before = Object.values(change.snapshotBefore).join("").length;
  const after = Object.values(change.snapshotAfter).join("").length;
  const delta = after - before;
  if (delta === 0) return null;
  return delta > 0 ? `+${delta} chars` : `${delta} chars`;
}

export default function ChangesTab() {
  const { project, dispatch } = useProject();

  if (project.changes.length === 0) {
    return (
      <EmptyState
        icon="🕓"
        title="No versions yet"
        description="Every applied edit — from the assistant or a manual code save — is recorded here as a restorable local version."
      />
    );
  }

  return (
    <div className="changes-tab">
      <p className="changes-tab__intro">
        Local version history. Restoring a version keeps the full timeline — it never deletes history.
      </p>
      <ul className="changes-tab__list">
        {project.changes.map((change, index) => (
          <li key={change.id} className="changes-tab__item">
            <div className="changes-tab__item-main">
              <p className="changes-tab__summary">{change.summary}</p>
              <p className="changes-tab__meta">
                {formatTime(change.timestamp)}
                {diffSize(change) && <span className="changes-tab__diff"> · {diffSize(change)}</span>}
                {index === 0 && <span className="changes-tab__current"> · current</span>}
              </p>
            </div>
            {index !== 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Restore this version ("${change.summary}")? This adds a new checkpoint — nothing is deleted.`)) {
                    dispatch({ type: "RESTORE_VERSION", changeId: change.id });
                  }
                }}
              >
                Restore
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
