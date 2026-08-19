import { useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import Modal from "../Modal.jsx";
import Button from "../ui/Button.jsx";

export default function RenameModal({ onClose }) {
  const { project, dispatch } = useProject();
  const [name, setName] = useState(project.name);

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: "RENAME_PROJECT", name: trimmed });
    onClose();
  }

  return (
    <Modal
      title="Rename project"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Rename
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="ui-field">
          <span>Project name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </label>
      </form>
    </Modal>
  );
}
