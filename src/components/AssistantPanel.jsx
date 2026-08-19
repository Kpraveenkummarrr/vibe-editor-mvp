import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import { SUGGESTED_PROMPTS } from "../ai/engine.js";
import ChatMessage from "./ChatMessage.jsx";
import { Spinner } from "./ui/Primitives.jsx";

export default function AssistantPanel({ onCloseSidebar }) {
  const { project, isThinking, sendMessage, applyPendingEdit, dispatch } = useProject();
  const [input, setInput] = useState("");
  const [aiStatus, setAiStatus] = useState(null);
  const endRef = useRef(null);
  const chatMode = project.editorState.chatMode || "build";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.chat.length, isThinking]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setAiStatus(data);
      })
      .catch(() => {
        if (!cancelled) setAiStatus({ configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isThinking) return;
    sendMessage(trimmed);
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const selected = project.selectedElement;

  return (
    <aside className="assistant-panel" aria-label="AI assistant">
      <div className="chat-head">
        <div className="chat-head-title">
          <span className="ai-dot">V</span>
          <span>Vibe Assistant</span>
        </div>
        <div className="chat-head-actions">
          <button className="shell-icon" type="button" aria-label="New chat" title="New chat">
            +
          </button>
          <button className="shell-icon" type="button" onClick={onCloseSidebar} aria-label="Close assistant" title="Close assistant">
            x
          </button>
        </div>
      </div>

      <div className="chat">
        <div className="intro">
          <h2>Edit the site by asking</h2>
          <p>
            Select anything in the preview or describe a page-wide edit. Changes stay reversible in version history.
          </p>
          <div className="quick">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={isThinking}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="messages">
          {project.chat.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              text={msg.text}
              status={msg.status}
              source={msg.source}
              pendingEdit={msg.pendingEdit}
              applied={msg.applied}
              onApply={() => applyPendingEdit(msg.id)}
            />
          ))}

          {isThinking && (
            <div className="msg progress">
              <Spinner />
              <span>Applying your change...</span>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="composer-area">
        <div className={`status-strip ${selected ? "show" : ""}`}>
          <span>
            {selected ? `Editing ${selected.tag}${selected.text ? `: ${selected.text.slice(0, 34)}` : ""}` : ""}
          </span>
          <button type="button" onClick={() => dispatch({ type: "CLEAR_SELECTION" })} aria-label="Clear selection">
            x
          </button>
        </div>

        <div className="composer">
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={selected ? `Describe a change for this ${selected.tag}...` : "Ask Vibe Editor..."}
            aria-label="Message the assistant"
          />
          <div className="compose-foot">
            <div className="compose-left">
              <button className="compose-icon" type="button" title={aiStatus?.configured ? "Live AI" : "Local engine"} aria-label="AI status">
                {aiStatus?.configured ? "AI" : "L"}
              </button>
              <button
                className={`mode-pill ${chatMode === "plan" ? "plan" : ""}`}
                type="button"
                onClick={() => dispatch({ type: "SET_CHAT_MODE", mode: chatMode === "build" ? "plan" : "build" })}
              >
                {chatMode === "build" ? "Build" : "Plan"} ▾
              </button>
            </div>
            <button
              className={`send ${isThinking ? "stop" : ""}`}
              type="button"
              onClick={() => submit()}
              disabled={!input.trim() || isThinking}
              aria-label="Send message"
            >
              {isThinking ? "Stop" : "Go"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
