import { useState } from "react";
import { ProjectProvider, useProject } from "./state/ProjectContext.jsx";
import TopBar from "./components/TopBar.jsx";
import AssistantPanel from "./components/AssistantPanel.jsx";
import PreviewWorkspace from "./components/PreviewWorkspace.jsx";
import CodeTab from "./components/RightPanel/CodeTab.jsx";
import FilesTab from "./components/RightPanel/FilesTab.jsx";
import ChangesTab from "./components/RightPanel/ChangesTab.jsx";
import IssuesTab from "./components/RightPanel/IssuesTab.jsx";
import RenameModal from "./components/modals/RenameModal.jsx";
import ImportExportModal from "./components/modals/ImportExportModal.jsx";
import BuildModal from "./components/modals/BuildModal.jsx";
import PublishModal from "./components/modals/PublishModal.jsx";
import "./styles/tokens.css";
import "./styles/app.css";

function EditorShell() {
  const { project } = useProject();
  const [activeModal, setActiveModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const activeView = ["preview", "code", "files", "changes", "issues"].includes(project.editorState.rightTab)
    ? project.editorState.rightTab
    : "preview";

  return (
    <div className={`app ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <TopBar
        onOpenModal={setActiveModal}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
      />

      <main className="app__body">
        {sidebarOpen && <AssistantPanel onCloseSidebar={() => setSidebarOpen(false)} />}
        {sidebarOpen && <div className="app__resizer" aria-hidden="true" />}
        <section className={`app__main app__main--${activeView}`} aria-label="Workspace">
          {activeView === "preview" && <PreviewWorkspace />}
          {activeView === "code" && <CodeTab />}
          {activeView === "files" && <FilesTab />}
          {activeView === "changes" && <ChangesTab />}
          {activeView === "issues" && <IssuesTab />}
        </section>
      </main>

      {activeModal === "rename" && <RenameModal onClose={() => setActiveModal(null)} />}
      {activeModal === "import-export" && <ImportExportModal onClose={() => setActiveModal(null)} />}
      {activeModal === "build" && <BuildModal onClose={() => setActiveModal(null)} />}
      {activeModal === "publish" && <PublishModal onClose={() => setActiveModal(null)} />}
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
