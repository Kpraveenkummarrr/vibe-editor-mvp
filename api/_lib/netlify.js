/**
 * Server-side Netlify "deploy without git" integration. Framework-agnostic
 * (used by api/publish.js on Vercel AND the Vite dev middleware) so the
 * publish flow behaves identically in dev and production.
 *
 * NETLIFY_API_TOKEN must never reach the client — the browser only ever
 * talks to our own /api/publish endpoint.
 */
import JSZip from "jszip";

const API_BASE = "https://api.netlify.com/api/v1";

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "vibe-editor-site"}-${Math.random().toString(36).slice(2, 7)}`;
}

async function netlifyFetch(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data, raw: text };
}

async function createSite(token, projectName) {
  const res = await netlifyFetch("/sites", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: slugify(projectName) }),
  });
  if (!res.ok) return { ok: false, error: "create_site_failed", detail: res.raw?.slice(0, 300) };
  return { ok: true, siteId: res.data.id, url: res.data.ssl_url || res.data.url };
}

async function deployZip(token, siteId, zipBuffer) {
  const res = await netlifyFetch(`/sites/${siteId}/deploys`, token, {
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: zipBuffer,
  });
  if (!res.ok) return { ok: false, error: "deploy_failed", detail: res.raw?.slice(0, 300) };
  return { ok: true, deployId: res.data.id, url: res.data.ssl_url || res.data.deploy_ssl_url };
}

async function pollDeployReady(token, deployId, { attempts = 4, delayMs = 1200 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await netlifyFetch(`/deploys/${deployId}`, token);
    if (res.ok && (res.data.state === "ready" || res.data.state === "current")) {
      return { state: res.data.state, url: res.data.ssl_url || res.data.deploy_ssl_url };
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { state: "processing" };
}

/**
 * @returns {Promise<{ok:true, url:string, siteId:string, state:string} | {ok:false, error:string, detail?:string}>}
 */
export async function publishProject({ token, projectName, siteId, html }, env = process.env) {
  const apiKey = token || env.NETLIFY_API_TOKEN;
  if (!apiKey) return { ok: false, error: "not_configured" };

  let resolvedSiteId = siteId;
  let siteUrl = null;

  if (!resolvedSiteId) {
    const created = await createSite(apiKey, projectName);
    if (!created.ok) return created;
    resolvedSiteId = created.siteId;
    siteUrl = created.url;
  }

  const zip = new JSZip();
  zip.file("index.html", html);
  // Force the correct Content-Type on Netlify's CDN. Without this, some deploy
  // paths can serve index.html with a non-HTML content type, which makes
  // browsers render the raw markup as text instead of the page.
  zip.file("_headers", "/*\n  Content-Type: text/html; charset=utf-8\n");
  let zipBuffer;
  try {
    zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  } catch (err) {
    return { ok: false, error: "zip_failed", detail: err.message };
  }

  const deployed = await deployZip(apiKey, resolvedSiteId, zipBuffer);
  if (!deployed.ok) return deployed;

  const status = await pollDeployReady(apiKey, deployed.deployId);

  return {
    ok: true,
    url: status.url || deployed.url || siteUrl,
    siteId: resolvedSiteId,
    state: status.state || "processing",
  };
}

export function getPublishStatus(env = process.env) {
  return { configured: Boolean(env.NETLIFY_API_TOKEN) };
}