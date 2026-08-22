import { useState } from "react";
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
  // History replaces the whole workspace view (see App.jsx) — Preview isn't
  // visible while you're on this tab. Restoring only updated project.files
  // under the hood, so from here it looked like clicking Restore "did
  // nothing" even though it worked. Track which change we just restored so
  // we can confirm it inline, and jump back to Preview so the result is
  // actually visible instead of requiring a manual tab switch.
  const [justRestoredId, setJustRestoredId] = useState(null);

  function handleRestore(change) {
    if (!window.confirm(`Restore this version ("${change.summary}")? This adds a new checkpoint — nothing is deleted.`)) return;
    dispatch({ type: "RESTORE_VERSION", changeId: change.id });
    setJustRestoredId(change.id);
    setTimeout(() => {
      dispatch({ type: "SET_RIGHT_TAB", tab: "preview" });
    }, 550);
  }

  return (
    <div className="changes-tab">
      <div className="changes-tab__shell">
        <div className="changes-tab__head">
          <div>
            <div className="files-title">History</div>
            <div className="files-subtitle">{project.changes.length} saved version{project.changes.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {project.changes.length === 0 ? (
          <EmptyState
            icon="🕓"
            title="No versions yet"
            description="Every applied edit — from the assistant or a manual code save — is recorded here as a restorable local version."
          />
        ) : (
          <div className="changes-tab__body">
            <p className="changes-tab__intro">
              Restoring a version keeps the full timeline — it never deletes history.
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
                      onClick={() => handleRestore(change)}
                    >
                      {justRestoredId === change.id ? "Restored ✓ — opening preview…" : "Restore"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
