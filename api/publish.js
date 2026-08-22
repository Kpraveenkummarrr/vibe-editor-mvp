import { publishProject } from "./_lib/vercel.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const { projectName, siteId, html } = req.body || {};
  if (typeof projectName !== "string" || typeof html !== "string" || !html.trim()) {
    res.status(400).json({ ok: false, error: "bad_request" });
    return;
  }

  const result = await publishProject({ projectName, siteId: siteId || null, html });
  res.status(200).json(result);
}
