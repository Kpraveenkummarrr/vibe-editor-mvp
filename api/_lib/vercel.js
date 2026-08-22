/**
 * Server-side Vercel "deploy without git" integration — same role as
 * netlify.js, swapped in as the active publish target per user request.
 * netlify.js is left in place, untouched, in case of a rollback; only
 * api/publish.js, api/publish-status.js, and vite.config.js's dev-server
 * mirror were repointed to this file.
 *
 * VERCEL_API_TOKEN must never reach the client — the browser only ever
 * talks to our own /api/publish endpoint.
 *
 * project.publishState.siteId (the field name is unchanged from the Netlify
 * integration, to avoid touching reducer.js) now holds a Vercel PROJECT ID
 * instead of a Netlify SITE ID — same role: "the stable identifier we
 * remember so republishing updates the same live URL instead of creating
 * a new one every time."
 */
const API_BASE = "https://api.vercel.com";

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  return base || "vibe-editor-site";
}

async function vercelFetch(path, token, options = {}) {
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

/**
 * Creates (or updates, if projectId is passed) a production deployment.
 * Files are inlined directly in the request body — fine for a single HTML
 * file; Vercel's two-step upload-then-reference flow exists for larger
 * multi-file deployments, which this editor doesn't produce.
 */
async function createDeployment(token, { projectName, projectId, html }) {
  const body = {
    files: [
      {
        file: "index.html",
        data: Buffer.from(html, "utf8").toString("base64"),
        encoding: "base64",
      },
    ],
    target: "production",
    // `name` is required on every deployment call, confirmed via a real
    // "missing required property `name`" API error on a redeploy — even
    // when `project` (below) already identifies which project to deploy to.
    name: slugify(projectName),
  };
  // Passing `project` (an existing project ID) takes precedence over `name`
  // for WHICH project this targets, per Vercel's docs — but `name` above
  // still needs to be present in the request either way.
  if (projectId) {
    body.project = projectId;
  } else {
    // Vercel requires projectSettings when a deployment creates a brand-new
    // project (confirmed via a real "missing_project_settings" API error) —
    // framework: null tells it this is a plain static site with no build
    // step, which matches what buildStandaloneHtml() actually produces.
    // Not needed on redeploys to an existing project (those keep whatever
    // settings the project already has), so this only applies here.
    body.projectSettings = { framework: null };
  }

  const res = await vercelFetch("/v13/deployments?skipAutoDetectionConfirmation=1", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      ok: false,
      error: "deploy_failed",
      // Lets publishProject tell "the remembered project was deleted from
      // the Vercel dashboard" (recoverable — create a new one by name) apart
      // from a genuine deploy failure.
      projectMissing: res.status === 404,
      detail: res.raw?.slice(0, 300),
    };
  }

  return {
    ok: true,
    deploymentId: res.data.id,
    projectId: res.data.projectId || res.data.project?.id || projectId || null,
    url: res.data.url ? `https://${res.data.url}` : null,
    readyState: res.data.readyState,
  };
}

async function pollDeployReady(token, deploymentId, { attempts = 5, delayMs = 1500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await vercelFetch(`/v13/deployments/${deploymentId}`, token);
    if (res.ok) {
      const state = res.data.readyState;
      // A production deployment's stable domain shows up in `alias` once
      // Vercel finishes assigning it — prefer that over the deployment's own
      // (sometimes hash-suffixed) `url` when it's available.
      const alias = Array.isArray(res.data.alias) && res.data.alias.length ? res.data.alias[0] : null;
      if (state === "READY") {
        return { state, url: alias ? `https://${alias}` : res.data.url ? `https://${res.data.url}` : null };
      }
      if (state === "ERROR" || state === "CANCELED") {
        return { state, error: true };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { state: "processing" };
}

/**
 * @returns {Promise<{ok:true, url:string, siteId:string, state:string} | {ok:false, error:string, detail?:string}>}
 */
export async function publishProject({ token, projectName, siteId, html }, env = process.env) {
  const apiKey = token || env.VERCEL_API_TOKEN;
  if (!apiKey) return { ok: false, error: "not_configured" };

  let deployed = await createDeployment(apiKey, { projectName, projectId: siteId || null, html });
  if (!deployed.ok && deployed.projectMissing && siteId) {
    // The project this project remembers publishing to is gone — recreate
    // by name once rather than leaving the project permanently stuck.
    deployed = await createDeployment(apiKey, { projectName, projectId: null, html });
  }
  if (!deployed.ok) return deployed;

  const status = await pollDeployReady(apiKey, deployed.deploymentId);
  // Fall back to Vercel's default production domain pattern
  // (https://<project-name>.vercel.app) if polling didn't resolve an alias
  // in time — the deployment itself still succeeded, this only affects
  // which URL we hand back for the "Published" link.
  const fallbackUrl = `https://${slugify(projectName)}.vercel.app`;

  return {
    ok: true,
    url: status.url || deployed.url || fallbackUrl,
    siteId: deployed.projectId,
    state: status.state || deployed.readyState || "processing",
  };
}

export function getPublishStatus(env = process.env) {
  return { configured: Boolean(env.VERCEL_API_TOKEN) };
}
