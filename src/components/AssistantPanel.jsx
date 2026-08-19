import { useEffect, useRef, useState } from "react";
import { useProject } from "../state/ProjectContext.jsx";
import { SUGGESTED_PROMPTS } from "../ai/engine.js";
import ChatMessage from "./ChatMessage.jsx";
import Button from "./ui/Button.jsx";
import { Spinner } from "./ui/Primitives.jsx";

export default function AssistantPanel() {
  const { project, isThinking, sendMessage, dispatch } = useProject();
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.chat.length, isThinking]);

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
    <section className="assistant-panel" aria-label="AI assistant">
      <div className="assistant-panel__header">
        <h2>Edit the site by asking</h2>
        <p>
          Select something on the page or describe a page-wide change. Every applied edit
          creates a checkpoint you can review or revert.
        </p>
      </div>

      {selected ? (
        <div className="assistant-panel__selection">
          <span className="assistant-panel__selection-label">Editing element</span>
          <span className="assistant-panel__selection-value">
            {selected.tag}
            {selected.text ? ` — "${selected.text.slice(0, 36)}${selected.text.length > 36 ? "…" : ""}"` : ""}
          </span>
          <button
            className="assistant-panel__selection-clear"
            onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
            aria-label="Deselect element"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="assistant-panel__selection assistant-panel__selection--empty">
          <span>No element selected — requests apply to the whole page.</span>
        </div>
      )}

      <div className="assistant-panel__messages">
        {project.chat.length === 0 && (
          <div className="assistant-panel__empty">
            <p>Try one of these to see the editor in action:</p>
          </div>
        )}

        {project.chat.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} text={msg.text} status={msg.status} />
        ))}

        {isThinking && (
          <div className="chat-msg chat-msg--ai chat-msg--thinking">
            <span className="chat-msg__author">Assistant</span>
            <p>
              <Spinner /> Applying your change…
            </p>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="assistant-panel__suggestions">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="suggestion-chip"
            onClick={() => submit(prompt)}
            disabled={isThinking}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="assistant-panel__input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selected ? `Describe a change for this ${selected.tag}…` : "Describe a page-wide change…"}
          rows={2}
          aria-label="Message the assistant"
        />
        <Button variant="primary" onClick={() => submit()} disabled={!input.trim() || isThinking}>
          {isThinking ? <Spinner /> : "Send"}
        </Button>
      </div>
    </section>
  );
}
