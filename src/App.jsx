import { useState, useCallback } from "react";
import Header from "./components/Header.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import CodeEditorPanel from "./components/CodeEditorPanel.jsx";
import PreviewPanel from "./components/PreviewPanel.jsx";
import { getAIResponse } from "./mockAI.js";
import "./App.css";

const INITIAL_CODE = {
  html: `<div class="hello">
  <h1>Hello from Vibe Editor</h1>
  <p>Describe what you want in the chat, and the code will update here.</p>
</div>`,
  css: `.hello {
  font-family: system-ui, sans-serif;
  text-align: center;
  margin-top: 60px;
  color: #1e293b;
}`,
  js: `// Your generated JavaScript will appear here.`,
};

let messageIdCounter = 0;
function nextId() {
  messageIdCounter += 1;
  return messageIdCounter;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState(INITIAL_CODE);
  const [isThinking, setIsThinking] = useState(false);

  const handleSendMessage = useCallback(async (text) => {
    const userMessage = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);

    try {
      const { reply, code: newCode } = await getAIResponse(text);

      const aiMessage = { id: nextId(), role: "ai", text: reply };
      setMessages((prev) => [...prev, aiMessage]);

      if (newCode) {
        setCode(newCode);
      }
    } catch (err) {
      const errorMessage = {
        id: nextId(),
        role: "ai",
        text: `Sorry, something went wrong generating a response. (${err.message})`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="app__body">
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
        />
        <CodeEditorPanel code={code} onChangeCode={setCode} />
        <PreviewPanel code={code} />
      </main>
    </div>
  );
}
