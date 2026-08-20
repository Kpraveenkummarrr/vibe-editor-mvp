import { useEffect, useRef, useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import { highlightFile } from "../../utils/highlight.js";
import Button from "../ui/Button.jsx";

const FILE_LABELS = { "index.html": "HTML", "styles.css": "CSS", "script.js": "JS" };

function LineGutter({ count, scrollRef }) {
  const gutterRef = useRef(null);
  useEffect(() => {
    const source = scrollRef.current;
    const gutter = gutterRef.current;
    if (!source || !gutter) return;
    const onScroll = () => {
      gutter.scrollTop = source.scrollTop;
    };
    source.addEventListener("scroll", onScroll);
    return () => source.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  return (
    <div className="code-gutter" ref={gutterRef}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="code-gutter__line">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

export default function CodeTab() {
  const { project, updateFile, dispatch } = useProject();
  const allFiles = { ...project.files, ...project.customFiles };
  const fileNames = Object.keys(allFiles);
  const activeFile = allFiles[project.activeFile] !== undefined ? project.activeFile : fileNames[0];
  const content = allFiles[activeFile] ?? "";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef(null);
  const preRef = useRef(null);

  useEffect(() => {
    setEditing(false);
    setDraft(content);
  }, [activeFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = (editing ? draft : content).split("\n");
  const highlighted = highlightFile(activeFile, content).split("\n");

  function startEdit() {
    setDraft(content);
    setEditing(true);
  }

  function save() {
    if (draft !== content) {
      updateFile(activeFile, draft, `Edited ${activeFile} manually`);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(content);
    setEditing(false);
  }

  return (
    <div className="code-tab">
      <div className="code-tab__filetabs" role="tablist">
        {fileNames.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={activeFile === name}
            className={`code-tab__filetab ${activeFile === name ? "is-active" : ""}`}
            onClick={() => dispatch({ type: "SET_ACTIVE_FILE", name })}
          >
            {FILE_LABELS[name] || name}
          </button>
        ))}
        <div className="code-tab__spacer" />
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={save}>
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>

      <div className="code-tab__body">
        {editing ? (
          <>
            <LineGutter count={lines.length} scrollRef={textareaRef} />
            <textarea
              ref={textareaRef}
              className="code-tab__textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              aria-label={`Edit ${activeFile}`}
            />
          </>
        ) : (
          <>
            <LineGutter count={lines.length} scrollRef={preRef} />
            <pre className="code-tab__pre" ref={preRef}>
              <code>
                {highlighted.map((line, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html: line || " " }} />
                ))}
              </code>
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
