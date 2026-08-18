# Vibe Editor — MVP

A chat-based coding editor prototype: describe what you want in the chat panel,
see mock-generated HTML/CSS/JS appear in the code editor, and watch the live
preview update instantly. Built with React + Vite.

No OpenAI/Claude API is integrated yet — responses are simulated locally
(see "Next Steps for Real AI Integration" below).

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

To check for lint errors:

```bash
npm run lint
```

To build for production:

```bash
npm run build
```

## Files created

```
vibe-editor-mvp/
├── index.html                     # Vite entry HTML
├── package.json
├── vite.config.js
├── .eslintrc.cjs
├── .gitignore
└── src/
    ├── main.jsx                   # React root
    ├── App.jsx                    # Top-level state + layout
    ├── App.css                    # All component styling (dark theme)
    ├── index.css                  # Global resets + CSS variables
    ├── mockAI.js                  # Simulated AI response logic
    └── components/
        ├── Header.jsx             # Top app header
        ├── ChatPanel.jsx          # Chat messages + input
        ├── CodeEditorPanel.jsx    # Tabbed HTML/CSS/JS editor
        └── PreviewPanel.jsx       # Sandboxed iframe live preview
```

## How the chat → code editor → preview flow works

1. **User types a message** in `ChatPanel` and hits Send (or Enter).
2. `App.jsx`'s `handleSendMessage` adds the user message to state, then calls
   `getAIResponse(text)` from `mockAI.js`.
3. `mockAI.js` matches keywords in the prompt (`button`, `card`, `form`,
   `calculator`, `heading`) and returns a canned `{ reply, code }` pair.
   Unmatched prompts get a generic reply plus a default example snippet,
   after a simulated ~500ms delay to mimic a real API call.
4. The AI's `reply` is appended to the chat. If `code` was returned, it
   replaces the current code in `App`'s state.
5. `CodeEditorPanel` displays the current `code.html` / `code.css` / `code.js`
   in a tabbed textarea. Users can freely edit any tab — edits update the same
   shared state.
6. `PreviewPanel` recomputes a combined HTML document from `code` on every
   change (`useMemo`) and renders it inside a sandboxed `<iframe>`, so the
   preview always reflects the latest code, whether it came from the AI or
   manual edits. The iframe's `sandbox="allow-scripts"` and an in-page
   `try/catch` around the injected JS keep a broken snippet from crashing the
   editor itself.

## What should be added later for real OpenAI/Claude integration

- Replace the body of `getAIResponse` in `src/mockAI.js` with a real API call
  (e.g. `fetch` to a backend proxy — never call OpenAI/Claude directly from
  the browser with an exposed API key).
- Add a small backend/serverless endpoint (Node/Express, Vercel function,
  etc.) that holds the API key server-side and forwards prompts.
- Extend the prompt sent to the model so it returns structured JSON
  (`{ reply, html, css, js }`) — a system prompt instructing the model to
  always respond in that shape keeps `App.jsx` unchanged.
- Add a loading/error UI for real network failures (partially in place via
  the `try/catch` in `App.jsx`'s `handleSendMessage`).
- Consider streaming responses (SSE or fetch streaming) for a more
  responsive chat experience once wired to a real model.
- Add conversation history/context so multi-turn edits ("make it red instead")
  work against the previous code state.

## Notes

- Kept intentionally minimal per the MVP scope: no auth, no collaboration,
  no GitHub automation, no multi-agent logic, no file tree — just the
  chat → code → preview loop.
- No external code-editor library (e.g. Monaco/CodeMirror) was added to keep
  dependencies minimal; the tabbed `<textarea>` is a placeholder that can be
  swapped for a richer editor later without changing the data flow.