import { useState, useRef, useEffect } from "react";

export default function ChatPanel({ messages, onSendMessage, isThinking }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="panel chat-panel" aria-label="Chat">
      <h2 className="panel__title">Chat</h2>

      <div className="chat-panel__messages">
        {messages.length === 0 && (
          <p className="chat-panel__empty">
            Try: "Create a blue button", "Create a card", "Create a form",
            "Create a calculator", or "Create a heading"
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble chat-bubble--${msg.role}`}
          >
            <span className="chat-bubble__author">
              {msg.role === "user" ? "You" : "AI"}
            </span>
            <p>{msg.text}</p>
          </div>
        ))}

        {isThinking && (
          <div className="chat-bubble chat-bubble--ai chat-bubble--thinking">
            <span className="chat-bubble__author">AI</span>
            <p>Thinking…</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          rows={2}
          aria-label="Chat message input"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isThinking}
          className="btn btn--primary"
        >
          Send
        </button>
      </div>
    </section>
  );
}
