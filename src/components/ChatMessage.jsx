import Button from "./ui/Button.jsx";

export default function ChatMessage({ role, text, status, source, pendingEdit, applied, onApply }) {
  return (
    <div className={`chat-msg chat-msg--${role} ${status ? `chat-msg--${status}` : ""}`}>
      <span className="chat-msg__author">
        {role === "user" ? "You" : "Assistant"}
        {role === "ai" && source === "llm" && <span className="chat-msg__source chat-msg__source--llm">Live AI</span>}
        {role === "ai" && source === "local" && <span className="chat-msg__source">Local engine</span>}
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
    </div>
  );
}
