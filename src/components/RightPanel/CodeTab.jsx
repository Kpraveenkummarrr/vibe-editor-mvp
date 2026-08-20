import { useEffect, useRef, useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import { highlightFile } from "../../utils/highlight.js";
import Button from "../ui/Button.jsx";
import { IconFile, IconPlus, IconTrash, IconPencil, IconFolder } from "../ui/Icons.jsx";

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

function TreeItem({ name, active, canManage, onOpen, onDelete, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  function commitRename() {
    const trimmed = draftName.trim();
    setRenaming(false);
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraftName(name);
  }

  if (renaming) {
    return (
      <li className="code-tree__row">
        <input
          ref={inputRef}
          className="code-tree__rename-input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraftName(name);
              setRenaming(false);
            }
          }}
        />
      </li>
    );
  }

  return (
    <li className={`code-tree__row ${active ? "is-active" : ""}`}>
      <button className="code-tree__item" onClick={onOpen}>
        <IconFile size={13} />
        <span>{name}</span>
      </button>
      {canManage && (
        <span className="code-tree__row-actions">
          <button aria-label={`Rename ${name}`} title="Rename" onClick={() => setRenaming(true)}>
            <IconPencil size={11} />
          </button>
          <button aria-label={`Delete ${name}`} title="Delete" onClick={onDelete}>
            <IconTrash size={11} />
          </button>
        </span>
      )}
    </li>
  );
}

export default function CodeTab() {
  const { project, updateFile, dispatch } = useProject();
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const newFileRef = useRef(null);

  const coreNames = Object.keys(project.files);
  const customNames = Object.keys(project.customFiles);
  const allFiles = { ...project.files, ...project.customFiles };
  const fileNames = [...coreNames, ...customNames];
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

  useEffect(() => {
    if (newFileOpen) newFileRef.current?.focus();
  }, [newFileOpen]);

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

  function createFile(e) {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) return;
    if (project.files[name] || project.customFiles[name]) {
      window.alert(`A file named "${name}" already exists.`);
      return;
    }
    dispatch({ type: "CREATE_CUSTOM_FILE", name, content: "" });
    setNewFileName("");
    setNewFileOpen(false);
  }

  return (
    <div className="code-tab">
      <div className="code-tab__tree">
        <div className="code-tree__header">
          <span className="code-tree__header-label">
            <IconFolder size={13} />
            Project
          </span>
          <button
            className="code-tree__add"
            aria-label="New file"
            title="New file"
            onClick={() => setNewFileOpen((v) => !v)}
          >
            <IconPlus size={13} />
          </button>
        </div>

        {newFileOpen && (
          <form className="code-tree__new-file" onSubmit={createFile}>
            <input
              ref={newFileRef}
              type="text"
              placeholder="notes.txt"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNewFileOpen(false)}
              aria-label="New file name"
            />
          </form>
        )}

        <ul className="code-tree__list">
          {coreNames.map((name) => (
            <TreeItem
              key={name}
              name={name}
              active={activeFile === name}
              canManage={false}
              onOpen={() => dispatch({ type: "SET_ACTIVE_FILE", name })}
            />
          ))}
          {customNames.length > 0 && <li className="code-tree__divider" />}
          {customNames.map((name) => (
            <TreeItem
              key={name}
              name={name}
              active={activeFile === name}
              canManage
              onOpen={() => dispatch({ type: "SET_ACTIVE_FILE", name })}
              onDelete={() => {
                if (window.confirm(`Delete "${name}"?`)) dispatch({ type: "DELETE_CUSTOM_FILE", name });
              }}
              onRename={(nextName) => dispatch({ type: "RENAME_CUSTOM_FILE", name, nextName })}
            />
          ))}
        </ul>
      </div>

      <div className="code-tab__main">
        <div className="code-tab__filetabs">
          <span className="code-tab__active-label">{FILE_LABELS[activeFile] || activeFile}</span>
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
    </div>
  );
}
