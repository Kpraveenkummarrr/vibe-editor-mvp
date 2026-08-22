import { requestLiveEdit } from "./_lib/aiRouter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const { prompt, selectedElement, html, css, js, assetNames } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || typeof html !== "string" || typeof css !== "string") {
    res.status(400).json({ ok: false, error: "bad_request" });
    return;
  }
  // Defense in depth: the client (src/ai/engine.js) already short-circuits a
  // pasted data: URI before ever reaching this endpoint, but don't trust
  // that alone — reject an oversized prompt here too rather than spending a
  // full LLM call on something that was always going to fail downstream.
  if (prompt.length > 4000) {
    res.status(400).json({ ok: false, error: "prompt_too_long" });
    return;
  }

  const result = await requestLiveEdit({
    prompt,
    selectedElement: selectedElement || null,
    html,
    css,
    js: typeof js === "string" ? js : "",
    assetNames: Array.isArray(assetNames) ? assetNames.slice(0, 30) : [],
  });
  res.status(200).json(result);
}
