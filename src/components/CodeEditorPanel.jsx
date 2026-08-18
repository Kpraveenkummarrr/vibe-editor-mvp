import { useState } from "react";

const TABS = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JS" },
];

export default function CodeEditorPanel({ code, onChangeCode }) {
  const [activeTab, setActiveTab] = useState("html");

  function handleChange(e) {
    onChangeCode({ ...code, [activeTab]: e.target.value });
  }

  return (
    <section className="panel editor-panel" aria-label="Code editor">
      <h2 className="panel__title">Code Editor</h2>

      <div className="editor-panel__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`editor-panel__tab ${
              activeTab === tab.key ? "editor-panel__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <textarea
        className="editor-panel__textarea"
        value={code[activeTab]}
        onChange={handleChange}
        spellCheck={false}
        aria-label={`${activeTab.toUpperCase()} code`}
      />
    </section>
  );
}
