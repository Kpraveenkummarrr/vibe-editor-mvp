import { useProject } from "../../state/ProjectContext.jsx";
import Modal from "../Modal.jsx";
import Button from "../ui/Button.jsx";
import { Spinner } from "../ui/Primitives.jsx";
import { downloadTextFile } from "../../utils/download.js";

export default function BuildModal({ onClose }) {
  const { project, runBuild } = useProject();
  const { status, result } = project.buildState;

  function download() {
    if (!result?.output) return;
    downloadTextFile(`${project.name.toLowerCase().replace(/\s+/g, "-")}.html`, result.output, "text/html");
  }

  return (
    <Modal title="Build project" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="build-modal">
        {status === "building" && (
          <div className="build-modal__state">
            <Spinner size={20} />
            <p>Validating and building your page…</p>
          </div>
        )}

        {status === "success" && (
          <div className="build-modal__state build-modal__state--success">
            <p className="build-modal__headline">✅ Build succeeded</p>
            <p>Your page passed validation and was bundled into a single standalone HTML file.</p>
            <Button variant="primary" onClick={download}>Download build.html</Button>
          </div>
        )}

        {status === "error" && (
          <div className="build-modal__state build-modal__state--error">
            <p className="build-modal__headline">⚠ Build failed</p>
            <p>Fix the following errors and build again:</p>
            <ul>
              {result?.errors?.map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
            <Button variant="secondary" onClick={runBuild}>Retry build</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
