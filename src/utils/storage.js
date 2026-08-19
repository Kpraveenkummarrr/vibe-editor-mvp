const STORAGE_KEY = "vibe-editor:workspace-v1";

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Storage may be unavailable (private browsing, quota). Editing still
    // works for the session — it just won't persist across reloads.
  }
}

export function clearWorkspace() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
