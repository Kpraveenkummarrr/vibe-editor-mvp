/* eslint-disable react-refresh/only-export-components -- this module intentionally
   exports both the ProjectProvider component and the useProject hook together */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reducer } from "./reducer.js";
import { createInitialWorkspace } from "./defaultProjectFactory.js";
import { loadWorkspace, saveWorkspace } from "../utils/storage.js";
import { processPrompt } from "../ai/engine.js";
import { validateProject } from "../utils/validateHtml.js";
import { buildStandaloneHtml } from "../utils/download.js";
import { nextId } from "../utils/id.js";

const ProjectStateContext = createContext(null);

function init() {
  return loadWorkspace() || createInitialWorkspace();
}

export function ProjectProvider({ children }) {
  const [workspace, dispatch] = useReducer(reducer, undefined, init);
  const [isThinking, setIsThinking] = useState(false);
  const saveTimer = useRef(null);

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

      try {
        const result = await processPrompt({
          prompt: text,
          files: { html: project.files["index.html"], css: project.files["styles.css"] },
          selectedElement: project.selectedElement,
        });

        const aiMessage = {
          id: nextId("msg"),
          role: "ai",
          text: result.reply,
          status: result.files ? "success" : "info",
          timestamp: Date.now(),
        };
        dispatch({ type: "ADD_CHAT_MESSAGE", message: aiMessage });

        if (result.files) {
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
    [project.files, project.selectedElement]
  );

  const updateFile = useCallback((name, content, checkpointSummary) => {
    if (checkpointSummary) {
      dispatch({
        type: "MANUAL_CHECKPOINT",
        summary: checkpointSummary,
        snapshotBefore: { html: project.files["index.html"], css: project.files["styles.css"] },
      });
    }
    dispatch({ type: "UPDATE_FILE", name, content });
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

  const value = useMemo(
    () => ({
      workspace,
      project,
      issues,
      isThinking,
      dispatch,
      sendMessage,
      updateFile,
      runBuild,
    }),
    [workspace, project, issues, isThinking, sendMessage, updateFile, runBuild]
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectStateContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}
