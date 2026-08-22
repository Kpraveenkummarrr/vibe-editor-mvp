/* eslint-disable react-refresh/only-export-components -- this module intentionally
   exports both the ProjectProvider component and the useProject hook together */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reducer } from "./reducer.js";
import { createInitialWorkspace, createProject, DEMO_PROJECT_NAMES } from "./defaultProjectFactory.js";
import { loadWorkspace, saveWorkspace } from "../utils/storage.js";
import { processPrompt } from "../ai/engine.js";
import { validateProject } from "../utils/validateHtml.js";
import { buildStandaloneHtml } from "../utils/download.js";
import { requestPublish } from "../utils/publish.js";
import { nextId } from "../utils/id.js";

const ProjectStateContext = createContext(null);

function init() {
  const saved = loadWorkspace();
  const workspace = saved || createInitialWorkspace();

  // Migration for workspaces saved before `assets` existed, and before the
  // starter demo projects were seeded — keeps older localStorage state
  // compatible with the current project shape instead of crashing on it.
  const hasDemoProjects = DEMO_PROJECT_NAMES.every((name) =>
    workspace.projects.some((p) => p.name === name)
  );
  const projects = workspace.projects.map((project) => ({
    assets: [],
    ...project,
    editorState: { ...project.editorState, rightTab: "preview" },
  }));

  return {
    ...workspace,
    projects: saved && !hasDemoProjects
      ? [...projects, ...DEMO_PROJECT_NAMES.map((name) => createProject(name))]
      : projects,
  };
}

export function ProjectProvider({ children }) {
  const [workspace, dispatch] = useReducer(reducer, undefined, init);
  const [isThinking, setIsThinking] = useState(false);
  const saveTimer = useRef(null);
  // Ref (not state) so a rapid repeat click is blocked synchronously — state
  // wouldn't commit until after the click handler returns, leaving a window
  // where multiple in-flight publishes could each read a still-null siteId
  // and each create a brand new Netlify site instead of reusing one.
  const publishInFlight = useRef(false);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveWorkspace(workspace), 250);
    return () => clearTimeout(saveTimer.current);
  }, [workspace]);

  const project = useMemo(
    () => workspace.projects.find((p) => p.id === workspace.activeProjectId) || workspace.projects[0],
    [workspace]
  );

  const issues = useMemo(
    () => validateProject({ html: project.files["index.html"], css: project.files["styles.css"] }),
    [project.files]
  );

  const sendMessage = useCallback(
    async (text) => {
      const userMessage = { id: nextId("msg"), role: "user", text, timestamp: Date.now() };
      dispatch({ type: "ADD_CHAT_MESSAGE", message: userMessage });
      setIsThinking(true);

      const planOnly = project.editorState.chatMode === "plan";

      try {
        const result = await processPrompt({
          prompt: text,
          files: { html: project.files["index.html"], css: project.files["styles.css"] },
          selectedElement: project.selectedElement,
          assets: project.assets,
        });

        const aiMessage = {
          id: nextId("msg"),
          role: "ai",
          text: planOnly && result.files ? `Plan: ${result.reply}` : result.reply,
          status: result.files ? "success" : "info",
          source: result.source,
          fallbackReason: result.fallbackReason || null,
          timestamp: Date.now(),
          pendingEdit: planOnly && result.files ? { files: result.files, summary: result.summary } : null,
          applied: false,
        };
        dispatch({ type: "ADD_CHAT_MESSAGE", message: aiMessage });

        // A pasted-into-chat image (see src/ai/engine.js's extractPastedImage)
        // gets saved to Assets even in plan mode — it's a real file the user
        // just handed over, not a pending edit to review, so there's nothing
        // to "apply" about having captured it.
        if (result.newAsset) {
          dispatch({ type: "ADD_ASSET", asset: result.newAsset });
        }

        if (result.files && !planOnly) {
          dispatch({ type: "APPLY_AI_EDIT", files: result.files, summary: result.summary });
        }
      } catch (err) {
        dispatch({
          type: "ADD_CHAT_MESSAGE",
          message: {
            id: nextId("msg"),
            role: "ai",
            text: `Something went wrong applying that change. (${err.message})`,
            status: "error",
            timestamp: Date.now(),
          },
        });
      } finally {
        setIsThinking(false);
      }
    },
    [project.files, project.selectedElement, project.editorState.chatMode, project.assets]
  );

  const applyPendingEdit = useCallback((messageId) => {
    const message = project.chat.find((m) => m.id === messageId);
    if (!message?.pendingEdit) return;
    dispatch({ type: "APPLY_AI_EDIT", files: message.pendingEdit.files, summary: message.pendingEdit.summary });
    dispatch({ type: "MARK_MESSAGE_APPLIED", messageId });
  }, [project.chat]);

  const updateFile = useCallback((name, content, checkpointSummary) => {
    const isCoreFile = Object.prototype.hasOwnProperty.call(project.files, name);
    if (checkpointSummary && isCoreFile) {
      dispatch({ type: "COMMIT_FILE_EDIT", name, content, summary: checkpointSummary });
    } else {
      dispatch({ type: "UPDATE_FILE", name, content });
    }
  }, [project.files]);

  const runBuild = useCallback(() => {
    dispatch({ type: "BUILD_START" });
    setTimeout(() => {
      const buildIssues = validateProject({
        html: project.files["index.html"],
        css: project.files["styles.css"],
      });
      const errors = buildIssues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        dispatch({
          type: "BUILD_RESULT",
          status: "error",
          result: { errors, output: null },
        });
        return;
      }
      const output = buildStandaloneHtml(
        {
          html: project.files["index.html"],
          css: project.files["styles.css"],
          js: project.files["script.js"],
        },
        project.name
      );
      dispatch({
        type: "BUILD_RESULT",
        status: "success",
        result: { errors: [], output },
      });
    }, 700);
  }, [project.files, project.name]);

  const runPublish = useCallback(async () => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;

    try {
      dispatch({ type: "PUBLISH_START" });

      const buildIssues = validateProject({
        html: project.files["index.html"],
        css: project.files["styles.css"],
      });
      if (buildIssues.some((i) => i.severity === "error")) {
        dispatch({ type: "PUBLISH_RESULT", status: "error", error: "fix_issues_first" });
        return;
      }

      const html = buildStandaloneHtml(
        {
          html: project.files["index.html"],
          css: project.files["styles.css"],
          js: project.files["script.js"],
        },
        project.name
      );

      const result = await requestPublish({
        projectName: project.name,
        siteId: project.publishState.siteId,
        html,
      });

      if (!result.ok) {
        dispatch({ type: "PUBLISH_RESULT", status: "error", error: result.error || "publish_failed", detail: result.detail || null });
        return;
      }

      dispatch({ type: "PUBLISH_RESULT", status: "success", url: result.url, siteId: result.siteId });
    } finally {
      publishInFlight.current = false;
    }
  }, [project.files, project.name, project.publishState.siteId]);

  const value = useMemo(
    () => ({
      workspace,
      project,
      issues,
      isThinking,
      dispatch,
      sendMessage,
      applyPendingEdit,
      updateFile,
      runBuild,
      runPublish,
    }),
    [workspace, project, issues, isThinking, sendMessage, applyPendingEdit, updateFile, runBuild, runPublish]
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectStateContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}
