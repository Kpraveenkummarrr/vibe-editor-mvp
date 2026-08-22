import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

/**
 * Mirrors the Vercel serverless functions in /api during `vite dev`, so the
 * OpenRouter (AI edit) and Netlify (publish) endpoints work locally without
 * needing `vercel dev`. Production deploys use the real functions in /api
 * directly.
 */
function apiDevPlugin() {
  return {
    name: "vibe-editor-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.method === "GET" && req.url === "/api/ai-status") {
            const { getAiProvidersStatus } = await import("./api/_lib/aiRouter.js");
            sendJson(res, 200, getAiProvidersStatus());
            return;
          }

          if (req.method === "POST" && req.url === "/api/ai-edit") {
            const body = await readJsonBody(req);
            const { requestLiveEdit } = await import("./api/_lib/aiRouter.js");
            const result = await requestLiveEdit({
              prompt: body.prompt,
              selectedElement: body.selectedElement || null,
              html: body.html || "",
              css: body.css || "",
              js: body.js || "",
              assetNames: Array.isArray(body.assetNames) ? body.assetNames.slice(0, 30) : [],
            });
            sendJson(res, 200, result);
            return;
          }

          if (req.method === "GET" && req.url === "/api/publish-status") {
            const { getPublishStatus } = await import("./api/_lib/vercel.js");
            sendJson(res, 200, getPublishStatus());
            return;
          }

          if (req.method === "POST" && req.url === "/api/publish") {
            const body = await readJsonBody(req);
            const { publishProject } = await import("./api/_lib/vercel.js");
            const result = await publishProject({
              projectName: body.projectName || "vibe-editor-site",
              siteId: body.siteId || null,
              html: body.html || "",
            });
            sendJson(res, 200, result);
            return;
          }
        } catch (err) {
          sendJson(res, 500, { ok: false, error: "server_error", detail: err.message });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Loads .env / .env.local with no prefix filter so server-only vars like
  // OPENROUTER_API_KEY / NETLIFY_API_TOKEN are available to the dev
  // middleware above without ever being exposed to client code (only
  // import.meta.env.VITE_* is inlined into the client bundle by Vite).
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiDevPlugin()],
    server: {
      port: 5173,
    },
    test: {
      environment: "jsdom",
    },
  };
});
