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
    assets: [],
    activeFile: "index.html",
    selectedElement: null,
    editorState: { mode: "edit", viewport: "desktop", rightTab: "preview", chatMode: "build" },
    changes: [],
    buildState: { status: "idle", lastResult: null, lastBuildAt: null },
    publishState: { status: "idle", url: null, siteId: null, lastPublishedAt: null, error: null },
    chat: [],
  };
}

// Two extra starter projects so the project switcher has something to
// switch between out of the box. They reuse the same demo template as the
// primary project — only the name differs — since they exist to demonstrate
// project switching, not to be distinct designs.
export const DEMO_PROJECT_NAMES = ["Demo Project 1", "Demo Project 2"];

export function createInitialWorkspace() {
  const project = createProject();
  const demoProjects = DEMO_PROJECT_NAMES.map((name) => createProject(name));
  return {
    projects: [project, ...demoProjects],
    activeProjectId: project.id,
  };
}
