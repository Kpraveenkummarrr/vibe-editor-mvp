import { useState } from "react";
import Button from "./ui/Button.jsx";
import { IconCopy, IconCheck, IconRefresh } from "./ui/Icons.jsx";

export default function ChatMessage({ role, text, status, source, fallbackReason, pendingEdit, applied, onApply, onRetry }) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={`chat-msg chat-msg--${role} ${status ? `chat-msg--${status}` : ""}`}>
      <span className="chat-msg__author">
        {role === "user" ? "You" : "Assistant"}
        {role === "ai" && source === "llm" && <span className="chat-msg__source chat-msg__source--llm">Live AI</span>}
        {role === "ai" && source === "local" && (
          <span
            className={`chat-msg__source ${fallbackReason ? "chat-msg__source--fallback" : ""}`}
            title={fallbackReason ? `Live AI was attempted but failed: ${fallbackReason}. Used the local rule-based engine instead.` : "No LLM key configured — using the local rule-based engine."}
          >
            Local engine{fallbackReason ? " ⚠" : ""}
          </span>
        )}
      </span>
      <p>{text}</p>
      {pendingEdit && (
        <div className="chat-msg__plan-actions">
          <Button size="sm" variant="primary" onClick={onApply}>
            Apply this change
          </Button>
        </div>
      )}
      {applied && <p className="chat-msg__applied">Applied</p>}
      {role === "ai" && (
        <div className={`chat-msg__actions ${status === "error" ? "always-show" : ""}`}>
          <button type="button" className="chat-msg__action-btn" onClick={copyText}>
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {status === "error" && onRetry && (
            <button type="button" className="chat-msg__action-btn" onClick={onRetry}>
              <IconRefresh size={12} />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
