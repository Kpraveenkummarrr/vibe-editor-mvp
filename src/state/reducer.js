import { createProject } from "./defaultProjectFactory.js";
import { nextId } from "../utils/id.js";

function mapActiveProject(workspace, projectId, updater) {
  return {
    ...workspace,
    projects: workspace.projects.map((p) =>
      p.id === projectId ? { ...updater(p), updatedAt: Date.now() } : p
    ),
  };
}

export function reducer(workspace, action) {
  const activeId = action.projectId || workspace.activeProjectId;

  switch (action.type) {
    case "CREATE_PROJECT": {
      const project = createProject(action.name);
      return { projects: [...workspace.projects, project], activeProjectId: project.id };
    }

    case "SWITCH_PROJECT": {
      if (!workspace.projects.some((p) => p.id === action.id)) return workspace;
      return { ...workspace, activeProjectId: action.id };
    }

    case "RENAME_PROJECT": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, name: action.name.trim() || p.name }));
    }

    case "DUPLICATE_PROJECT": {
      const source = workspace.projects.find((p) => p.id === activeId);
      if (!source) return workspace;
      const now = Date.now();
      const copy = {
        ...source,
        id: nextId("proj"),
        name: `${source.name} copy`,
        createdAt: now,
        updatedAt: now,
        changes: [],
        chat: [],
        selectedElement: null,
        buildState: { status: "idle", lastResult: null, lastBuildAt: null },
        publishState: { status: "idle", url: null, siteId: null, lastPublishedAt: null, error: null },
      };
      return { projects: [...workspace.projects, copy], activeProjectId: copy.id };
    }

    case "RESET_PROJECT": {
      return mapActiveProject(workspace, activeId, (p) => {
        const fresh = createProject(p.name);
        return { ...fresh, id: p.id, name: p.name, createdAt: p.createdAt };
      });
    }

    case "DELETE_PROJECT": {
      if (workspace.projects.length <= 1) return workspace;
      const remaining = workspace.projects.filter((p) => p.id !== action.id);
      const activeProjectId =
        workspace.activeProjectId === action.id ? remaining[0].id : workspace.activeProjectId;
      return { projects: remaining, activeProjectId };
    }

    case "IMPORT_PROJECT": {
      const imported = { ...action.project, id: nextId("proj") };
      return { projects: [...workspace.projects, imported], activeProjectId: imported.id };
    }

    case "SELECT_ELEMENT": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, selectedElement: action.element }));
    }

    case "CLEAR_SELECTION": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, selectedElement: null }));
    }

    case "SET_MODE": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        editorState: { ...p.editorState, mode: action.mode },
        selectedElement: action.mode === "preview" ? null : p.selectedElement,
      }));
    }

    case "SET_VIEWPORT": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        editorState: { ...p.editorState, viewport: action.viewport },
      }));
    }

    case "SET_RIGHT_TAB": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        editorState: { ...p.editorState, rightTab: action.tab },
      }));
    }

    case "SET_CHAT_MODE": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        editorState: { ...p.editorState, chatMode: action.mode },
      }));
    }

    case "SET_ACTIVE_FILE": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, activeFile: action.name }));
    }

    case "UPDATE_FILE": {
      return mapActiveProject(workspace, activeId, (p) =>
        Object.prototype.hasOwnProperty.call(p.customFiles, action.name)
          ? { ...p, customFiles: { ...p.customFiles, [action.name]: action.content } }
          : { ...p, files: { ...p.files, [action.name]: action.content } }
      );
    }

    case "CREATE_CUSTOM_FILE": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        customFiles: { ...p.customFiles, [action.name]: action.content || "" },
        activeFile: action.name,
      }));
    }

    case "DELETE_CUSTOM_FILE": {
      return mapActiveProject(workspace, activeId, (p) => {
        const nextCustom = { ...p.customFiles };
        delete nextCustom[action.name];
        return {
          ...p,
          customFiles: nextCustom,
          activeFile: p.activeFile === action.name ? "index.html" : p.activeFile,
        };
      });
    }

    case "RENAME_CUSTOM_FILE": {
      return mapActiveProject(workspace, activeId, (p) => {
        const { name, nextName } = action;
        if (!nextName || nextName === name || !Object.prototype.hasOwnProperty.call(p.customFiles, name)) return p;
        if (p.files[nextName] !== undefined || p.customFiles[nextName] !== undefined) return p;
        const nextCustom = { ...p.customFiles };
        nextCustom[nextName] = nextCustom[name];
        delete nextCustom[name];
        return {
          ...p,
          customFiles: nextCustom,
          activeFile: p.activeFile === name ? nextName : p.activeFile,
        };
      });
    }

    case "ADD_ASSET": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        assets: [action.asset, ...p.assets],
      }));
    }

    case "DELETE_ASSET": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        assets: p.assets.filter((a) => a.id !== action.id),
      }));
    }

    case "ADD_CHAT_MESSAGE": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, chat: [...p.chat, action.message] }));
    }

    case "CLEAR_CHAT": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, chat: [], selectedElement: null }));
    }

    case "MARK_MESSAGE_APPLIED": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        chat: p.chat.map((m) => (m.id === action.messageId ? { ...m, pendingEdit: null, applied: true } : m)),
      }));
    }

    // A "version" is a full snapshot of the site's core files (index.html,
    // styles.css, script.js) before and after a single edit. Every edit —
    // whether from the AI (live or local engine) or a manual code save —
    // goes through one of these two cases, so Version History always has a
    // complete, restorable timeline (see RESTORE_VERSION below).
    case "APPLY_AI_EDIT": {
      return mapActiveProject(workspace, activeId, (p) => {
        const snapshotBefore = { ...p.files };
        const nextFiles = {
          ...p.files,
          "index.html": action.files.html,
          "styles.css": action.files.css,
          // Only the live LLM path (onClickAlert) ever produces a "script.js"
          // change; the local engine and manual edits don't touch it here,
          // so leave the existing file alone unless a new value was actually
          // returned — never blank out the user's script.js by accident.
          ...(action.files.js !== undefined ? { "script.js": action.files.js } : {}),
        };
        const change = {
          id: nextId("chg"),
          summary: action.summary,
          timestamp: Date.now(),
          snapshotBefore,
          snapshotAfter: nextFiles,
        };
        return { ...p, files: nextFiles, changes: [change, ...p.changes] };
      });
    }

    case "COMMIT_FILE_EDIT": {
      return mapActiveProject(workspace, activeId, (p) => {
        const snapshotBefore = { ...p.files };
        const nextFiles = { ...p.files, [action.name]: action.content };
        const change = {
          id: nextId("chg"),
          summary: action.summary,
          timestamp: Date.now(),
          snapshotBefore,
          snapshotAfter: nextFiles,
        };
        return { ...p, files: nextFiles, changes: [change, ...p.changes] };
      });
    }

    // Restoring is non-destructive (like a git revert, not a hard reset):
    // it copies the target version's files back to HEAD and records that
    // as a *new* checkpoint, so the full history — including the version
    // being restored from — is always still there afterward.
    case "RESTORE_VERSION": {
      return mapActiveProject(workspace, activeId, (p) => {
        const target = p.changes.find((c) => c.id === action.changeId);
        if (!target) return p;
        const snapshotBefore = { ...p.files };
        const nextFiles = { ...target.snapshotAfter };
        // No "unchanged, skip" guard here on purpose: even when the restored
        // content happens to match HEAD byte-for-byte, still record the
        // checkpoint. Clicking Restore should never be a silent no-op — the
        // version toast confirming "New version saved" is the user's only
        // feedback that anything happened.
        const change = {
          id: nextId("chg"),
          summary: `Restored version: ${target.summary}`,
          timestamp: Date.now(),
          snapshotBefore,
          snapshotAfter: nextFiles,
        };
        return { ...p, files: nextFiles, changes: [change, ...p.changes] };
      });
    }

    case "PUBLISH_START": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        publishState: { ...p.publishState, status: "publishing", error: null },
      }));
    }

    case "PUBLISH_RESULT": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        publishState: {
          status: action.status,
          url: action.url || p.publishState.url,
          siteId: action.siteId || p.publishState.siteId,
          lastPublishedAt: action.status === "success" ? Date.now() : p.publishState.lastPublishedAt,
          error: action.error || null,
          errorDetail: action.status === "error" ? action.detail || null : null,
        },
      }));
    }

    case "BUILD_START": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        buildState: { ...p.buildState, status: "building" },
      }));
    }

    case "BUILD_RESULT": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        buildState: {
          status: action.status,
          lastResult: action.result,
          lastBuildAt: Date.now(),
        },
      }));
    }

    default:
      return workspace;
  }
}
