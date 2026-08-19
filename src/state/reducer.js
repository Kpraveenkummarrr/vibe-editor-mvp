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

    case "SET_ACTIVE_FILE": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, activeFile: action.name }));
    }

    case "UPDATE_FILE": {
      return mapActiveProject(workspace, activeId, (p) => ({
        ...p,
        files: { ...p.files, [action.name]: action.content },
      }));
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

    case "ADD_CHAT_MESSAGE": {
      return mapActiveProject(workspace, activeId, (p) => ({ ...p, chat: [...p.chat, action.message] }));
    }

    case "APPLY_AI_EDIT": {
      return mapActiveProject(workspace, activeId, (p) => {
        const snapshotBefore = { html: p.files["index.html"], css: p.files["styles.css"] };
        const change = {
          id: nextId("chg"),
          summary: action.summary,
          timestamp: Date.now(),
          snapshotBefore,
        };
        return {
          ...p,
          files: { ...p.files, "index.html": action.files.html, "styles.css": action.files.css },
          changes: [change, ...p.changes],
        };
      });
    }

    case "MANUAL_CHECKPOINT": {
      return mapActiveProject(workspace, activeId, (p) => {
        const change = {
          id: nextId("chg"),
          summary: action.summary,
          timestamp: Date.now(),
          snapshotBefore: action.snapshotBefore,
        };
        return { ...p, changes: [change, ...p.changes] };
      });
    }

    case "REVERT_CHANGE": {
      return mapActiveProject(workspace, activeId, (p) => {
        const index = p.changes.findIndex((c) => c.id === action.changeId);
        if (index === -1) return p;
        const change = p.changes[index];
        const remaining = p.changes.slice(index + 1);
        return {
          ...p,
          files: {
            ...p.files,
            "index.html": change.snapshotBefore.html,
            "styles.css": change.snapshotBefore.css,
          },
          changes: remaining,
        };
      });
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
