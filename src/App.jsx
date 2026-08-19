import { useState } from "react";
import { ProjectProvider } from "./state/ProjectContext.jsx";
import TopBar from "./components/TopBar.jsx";
import AssistantPanel from "./components/AssistantPanel.jsx";
import PreviewWorkspace from "./components/PreviewWorkspace.jsx";
import RightPanel from "./components/RightPanel/RightPanel.jsx";
import RenameModal from "./components/modals/RenameModal.jsx";
import ImportExportModal from "./components/modals/ImportExportModal.jsx";
import BuildModal from "./components/modals/BuildModal.jsx";
import "./styles/tokens.css";
import "./styles/app.css";

function EditorShell() {
  const [activeModal, setActiveModal] = useState(null);
  const [mobilePanel, setMobilePanel] = useState("assistant");

  return (
    <div className="app">
      <TopBar onOpenModal={setActiveModal} />

      <div className="app__mobile-nav">
        {[
          { key: "assistant", label: "Assistant" },
          { key: "preview", label: "Preview" },
          { key: "panel", label: "Project" },
        ].map((item) => (
          <button
            key={item.key}
            className={`app__mobile-nav-item ${mobilePanel === item.key ? "is-active" : ""}`}
            onClick={() => setMobilePanel(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <main className="app__body">
        <div className={`app__center ${mobilePanel !== "panel" ? "" : "app__center--hidden-mobile"}`}>
          <div className={`app__assistant ${mobilePanel === "preview" ? "app__assistant--hidden-mobile" : ""}`}>
            <AssistantPanel />
          </div>
          <div className={`app__preview ${mobilePanel === "assistant" ? "app__preview--hidden-mobile" : ""}`}>
            <PreviewWorkspace />
          </div>
        </div>
        <div className={`app__right ${mobilePanel !== "panel" ? "app__right--hidden-mobile" : ""}`}>
          <RightPanel />
        </div>
      </main>

      {activeModal === "rename" && <RenameModal onClose={() => setActiveModal(null)} />}
      {activeModal === "import-export" && <ImportExportModal onClose={() => setActiveModal(null)} />}
      {activeModal === "build" && <BuildModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <EditorShell />
    </ProjectProvider>
  );
}
