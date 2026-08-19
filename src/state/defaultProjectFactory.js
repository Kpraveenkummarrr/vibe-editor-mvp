import { createDefaultFiles, DEFAULT_PROJECT_NAME } from "../data/defaultProject.js";
import { nextId } from "../utils/id.js";

export function createProject(name = DEFAULT_PROJECT_NAME) {
  const now = Date.now();
  return {
    id: nextId("proj"),
    name,
    createdAt: now,
    updatedAt: now,
    files: createDefaultFiles(),
    customFiles: {},
    activeFile: "index.html",
    selectedElement: null,
    editorState: { mode: "edit", viewport: "desktop", rightTab: "preview", chatMode: "build" },
    changes: [],
    buildState: { status: "idle", lastResult: null, lastBuildAt: null },
    publishState: { status: "idle", url: null, siteId: null, lastPublishedAt: null, error: null },
    chat: [],
  };
}

export function createInitialWorkspace() {
  const project = createProject();
  return {
    projects: [project],
    activeProjectId: project.id,
  };
}
