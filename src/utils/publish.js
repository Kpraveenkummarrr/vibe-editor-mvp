export async function requestPublish({ projectName, siteId, html }) {
  try {
    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, siteId, html }),
    });
    if (!response.ok) return { ok: false, error: "request_failed" };
    return await response.json();
  } catch (err) {
    return { ok: false, error: "network_error", detail: err.message };
  }
}

export async function fetchPublishStatus() {
  try {
    const response = await fetch("/api/publish-status");
    if (!response.ok) return { configured: false };
    return await response.json();
  } catch {
    return { configured: false };
  }
}
