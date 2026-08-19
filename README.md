# Vibe Editor — MVP

An AI-powered website editor: select an element on the live preview (or describe a
page-wide change), ask the assistant for an edit, watch it apply instantly, then
review/revert it as a checkpoint, inspect the underlying code, check for issues, and
build/export a standalone HTML page. Built with React + Vite.

No OpenAI/Claude API key is configured for this project, so edits are handled by a
deterministic, rule-based local AI engine instead of pretending to call a real model
(see "Next steps for real AI integration" below).

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm run lint    # ESLint
npm run test    # Vitest (AI engine + validator unit tests)
npm run build   # Production build
```

## How it works

**Select → describe → apply → review**

1. Click any element in the preview canvas (edit mode) — it's outlined and shown in
   the assistant panel as "Editing element". Click a suggested prompt or type your own
   ("make this more premium", "shorten the headline", "use a darker green").
2. `ai/intentParser.js` classifies the request into an intent (`text_shorten`,
   `color_adjust`, `style_premium`, `spacing_increase`, `layout_center`,
   `layout_responsive`, `remove_element`, …).
3. `ai/applyAction.js` applies that intent against the current HTML/CSS, either
   targeting the selected element (via a stable `data-vibe-id` re-derived from the
   stored HTML — see `utils/domIds.js`) or a sensible page-wide fallback.
4. The result updates `files["index.html"]`/`files["styles.css"]` in the central
   project state and pushes a **checkpoint** onto `project.changes`, which can be
   reviewed or reverted from the Changes tab.
5. The preview iframe re-renders from the updated files; an injected script reports
   clicks back to the parent via `postMessage` so selection keeps working after every
   re-render.

## Architecture

```
src/
  state/            ProjectContext (React context + useReducer) + localStorage persistence
  ai/                intentParser, applyAction, engine (mock AI layer) + tests
  utils/             domIds (selection/mutation), validateHtml (Issues panel),
                     highlight (code syntax highlighting), download, storage
  data/              default demo project content (a small business site)
  components/
    TopBar.jsx                project switcher, save status, Build
    AssistantPanel.jsx        chat, suggested prompts, selection indicator
    PreviewWorkspace.jsx      iframe canvas, edit/preview + viewport toggles
    RightPanel/               Files / Code / Changes / Issues tabs
    modals/                   Rename, Import/Export, Build
    ui/                       Button, Badge, EmptyState, SegmentedControl, Modal
```

State shape (per project, all persisted to `localStorage`):

```
Project
├── files            { "index.html", "styles.css", "script.js" }
├── customFiles       user-created extra files
├── selectedElement   { vibeId, tag, text } | null
├── editorState        { mode: edit|preview, viewport, rightTab }
├── changes            checkpoint stack (summary, timestamp, snapshotBefore) — revertible
├── issues             derived from files via utils/validateHtml.js
├── buildState          { status, lastResult, lastBuildAt }
└── chat                assistant message history
```

Multiple projects are supported (switch/duplicate/rename/reset/import/export from the
project menu in the top bar).

## Next steps for real OpenAI/Claude integration

- Replace the body of `processPrompt` in `src/ai/engine.js` with a real API call
  (`fetch` to a backend proxy — never call OpenAI/Claude directly from the browser
  with an exposed API key). The function's return shape
  (`{ reply, files, summary, actionType }`) is designed to stay the same so no caller
  changes are needed.
- Add a small backend/serverless endpoint (Vercel function, etc.) holding the API key
  server-side, forwarding the prompt plus the current `selectedElement` and file
  contents, and returning structured JSON in that same shape.
- Add conversation history/context so multi-turn edits ("make it red instead") can
  reference the previous turn.
- Consider streaming responses for a more responsive chat experience.

## Notes

- Kept intentionally scoped as an MVP: no auth, no collaboration/multiplayer, no
  real backend — the chat → AI action → preview → checkpoint → build loop is the
  focus.
- No heavy code-editor or highlighting dependency (e.g. Monaco/CodeMirror/Prism) —
  `utils/highlight.js` is a small regex-based highlighter, kept lightweight on
  purpose; swap it for a richer editor later without changing how files are stored.
- Element selection uses a `data-vibe-id` attribute assigned deterministically
  (pre-order traversal) when building the preview, and re-derived the same way when
  applying an edit — so it never needs to be persisted into saved project files.
