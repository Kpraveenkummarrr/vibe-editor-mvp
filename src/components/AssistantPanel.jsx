import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import { SUGGESTED_PROMPTS } from "../ai/engine.js";
import ChatMessage from "./ChatMessage.jsx";
import { Spinner } from "./ui/Primitives.jsx";
import { IconSparkles, IconPlus, IconX, IconCpu, IconChevronDown } from "./ui/Icons.jsx";

export default function AssistantPanel({ onCloseSidebar }) {
  const { project, isThinking, sendMessage, applyPendingEdit, dispatch } = useProject();
  const [input, setInput] = useState("");
  const [aiStatus, setAiStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [slowThinking, setSlowThinking] = useState(false);
  const endRef = useRef(null);
  const chatMode = project.editorState.chatMode || "build";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.chat.length, isThinking]);

  // Free-tier LLM responses can take 15-20s; a bare spinner that long reads
  // as "stuck" rather than "working" — say so explicitly past a few seconds.
  useEffect(() => {
    if (!isThinking) {
      setSlowThinking(false);
      return;
    }
    const t = setTimeout(() => setSlowThinking(true), 4000);
    return () => clearTimeout(t);
  }, [isThinking]);

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
          <span className="ai-dot"><IconSparkles size={12} /></span>
          <span>Vibe Assistant</span>
        </div>
        <div className="chat-head-actions">
          <button
            className="shell-icon"
            type="button"
            aria-label="New chat"
            title="New chat"
            disabled={project.chat.length === 0}
            onClick={() => {
              if (project.chat.length === 0) return;
              if (window.confirm("Start a new chat? This clears the conversation but keeps your version history and files intact.")) {
                dispatch({ type: "CLEAR_CHAT" });
              }
            }}
          >
            <IconPlus size={15} />
          </button>
          <button className="shell-icon" type="button" onClick={onCloseSidebar} aria-label="Close assistant" title="Close assistant">
            <IconX size={15} />
          </button>
        </div>
      </div>

      <div className="chat">
        <div className="intro">
          <h2>Edit the site by asking</h2>
          <p>
            Select anything in the preview or describe a page-wide edit. Changes stay reversible in version history.
          </p>

          {aiStatus && !aiStatus.configured && (
            <div className="ai-mode-banner">
              <div className="ai-mode-banner__row">
                <IconCpu size={14} />
                <span>
                  Running on the <strong>local rule-based engine</strong> — no LLM key connected yet.
                </span>
              </div>
              <button type="button" className="ai-mode-banner__toggle" onClick={() => setShowSetup((v) => !v)}>
                {showSetup ? "Hide setup steps" : "Connect a real LLM (free)"}
                <IconChevronDown size={11} style={{ transform: showSetup ? "rotate(180deg)" : "none" }} />
              </button>
              {showSetup && (
                <ol className="ai-mode-banner__steps">
                  <li>
                    Get a free key at <code>openrouter.ai/keys</code> (no card required).
                  </li>
                  <li>
                    In the project folder, copy <code>.env.example</code> to <code>.env.local</code>.
                  </li>
                  <li>
                    Paste it as <code>OPENROUTER_API_KEY=your_key</code> in <code>.env.local</code>.
                  </li>
                  <li>Restart the dev server (stop it, then run it again) so the key loads.</li>
                </ol>
              )}
            </div>
          )}

          <div className="quick">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={isThinking}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="messages">
          {project.chat.map((msg, idx) => {
            const prevUser = [...project.chat.slice(0, idx)].reverse().find((m) => m.role === "user");
            return (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                text={msg.text}
                status={msg.status}
                source={msg.source}
                pendingEdit={msg.pendingEdit}
                applied={msg.applied}
                onApply={() => applyPendingEdit(msg.id)}
                onRetry={prevUser ? () => submit(prevUser.text) : undefined}
              />
            );
          })}

          {isThinking && (
            <div className="msg progress">
              <Spinner />
              <span>
                {slowThinking
                  ? "Still working — the AI model can take up to 20s on the free tier..."
                  : "Applying your change..."}
              </span>
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
            <IconX size={13} />
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
              <span
                className={`compose-icon ${aiStatus?.configured ? "compose-icon--live" : "compose-icon--local"}`}
                title={aiStatus?.configured ? "Connected to a live LLM" : "Local engine (no LLM key configured)"}
              >
                {aiStatus?.configured ? <IconSparkles size={12} /> : <IconCpu size={12} />}
                <span>{aiStatus?.configured ? "Live AI" : "Local"}</span>
              </span>
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
              aria-label={isThinking ? "Sending message" : "Send message"}
            >
              {isThinking ? "Sending…" : "Go"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
