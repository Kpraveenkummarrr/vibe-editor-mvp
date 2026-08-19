import { requestAiEdit } from "./_lib/openrouter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const { prompt, selectedElement, html, css } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || typeof html !== "string" || typeof css !== "string") {
    res.status(400).json({ ok: false, error: "bad_request" });
    return;
  }

  const result = await requestAiEdit({ prompt, selectedElement: selectedElement || null, html, css });
  res.status(200).json(result);
}
