export default function ChatMessage({ role, text, status }) {
  return (
    <div className={`chat-msg chat-msg--${role} ${status ? `chat-msg--${status}` : ""}`}>
      <span className="chat-msg__author">{role === "user" ? "You" : "Assistant"}</span>
      <p>{text}</p>
    </div>
  );
}
