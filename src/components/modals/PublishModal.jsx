import { useEffect, useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import { fetchPublishStatus } from "../../utils/publish.js";
import Modal from "../Modal.jsx";
import Button from "../ui/Button.jsx";
import { Spinner } from "../ui/Primitives.jsx";
import { downloadTextFile, buildStandaloneHtml } from "../../utils/download.js";

const ERROR_COPY = {
  not_configured: "not_configured",
  fix_issues_first: "Fix the errors in the Issues tab before publishing.",
  create_site_failed: "Netlify rejected the request to create a site.",
  deploy_failed: "The deploy to Netlify failed.",
  zip_failed: "Couldn't package the site for deploy. Try again.",
  network_error: "Couldn't reach the publish service — check your connection and try again.",
  request_failed: "The publish request failed. Try again.",
};

// Netlify's error `detail` is usually JSON like {"error": "..."} or
// {"message": "..."}, but can also be a raw string or HTML error page —
// extract whatever's human-readable rather than dumping raw JSON/markup.
function extractDetailMessage(detail) {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail);
    const msg = parsed?.error?.message || parsed?.error || parsed?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    // not JSON — fall through to raw text below
  }
  const trimmed = detail.trim();
  if (!trimmed || trimmed.startsWith("<")) return null; // skip HTML error pages
  return trimmed.slice(0, 240);
}

export default function PublishModal({ onClose }) {
  const { project, dispatch, runPublish } = useProject();
  const { status, url, error, errorDetail, lastPublishedAt } = project.publishState;
  const detailMessage = extractDetailMessage(errorDetail);
  const [configured, setConfigured] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishStatus().then((data) => {
      if (!cancelled) setConfigured(Boolean(data.configured));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadHtml() {
    const html = buildStandaloneHtml(
      { html: project.files["index.html"], css: project.files["styles.css"], js: project.files["script.js"] },
      project.name
    );
    downloadTextFile(`${project.name.toLowerCase().replace(/\s+/g, "-")}.html`, html, "text/html");
  }

  function goFixIssues() {
    dispatch({ type: "SET_RIGHT_TAB", tab: "issues" });
    onClose();
  }

  return (
    <Modal title="Publish project" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="publish-modal">
        {status === "publishing" && (
          <div className="publish-modal__state">
            <Spinner size={20} />
            <p>Preparing production build and deploying to Netlify…</p>
          </div>
        )}

        {status === "success" && url && (
          <div className="publish-modal__state publish-modal__state--success">
            <p className="publish-modal__headline">✅ Published</p>
            <p>Your site is live{lastPublishedAt ? ` (last published ${new Date(lastPublishedAt).toLocaleString()})` : ""}.</p>
            <div className="publish-modal__url-row">
              <a href={url} target="_blank" rel="noreferrer" className="publish-modal__url">
                {url}
              </a>
              <Button variant="secondary" size="sm" onClick={copyLink}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="publish-modal__actions">
              <Button variant="primary" onClick={runPublish}>Publish again</Button>
              <Button variant="secondary" onClick={downloadHtml}>Download HTML</Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="publish-modal__state publish-modal__state--error">
            <p className="publish-modal__headline">⚠ {error === "not_configured" ? "Netlify isn't connected yet" : "Publish failed"}</p>
            {error === "not_configured" ? (
              <>
                <p>Add a free Netlify personal access token to enable one-click deploys:</p>
                <ol className="publish-modal__steps">
                  <li>
                    Create a token at <code>app.netlify.com/user/applications#personal-access-tokens</code>.
                  </li>
                  <li>
                    Copy <code>.env.example</code> to <code>.env.local</code> in the project folder.
                  </li>
                  <li>
                    Paste it as <code>NETLIFY_API_TOKEN=your_token</code> in <code>.env.local</code>.
                  </li>
                  <li>Restart the dev server so the token loads.</li>
                </ol>
              </>
            ) : (
              <>
                <p>{ERROR_COPY[error] || "Something went wrong publishing this project."}</p>
                {detailMessage && <p className="publish-modal__detail">{detailMessage}</p>}
              </>
            )}
            <div className="publish-modal__actions">
              {error === "fix_issues_first" ? (
                <Button variant="secondary" onClick={goFixIssues}>Go to Issues</Button>
              ) : error !== "not_configured" ? (
                <Button variant="secondary" onClick={runPublish}>Retry</Button>
              ) : null}
              <Button variant="ghost" onClick={downloadHtml}>Download HTML instead</Button>
            </div>
          </div>
        )}

        {status === "idle" && (
          <div className="publish-modal__state">
            <p>
              Publishing validates your page and deploys it to Netlify as a live, shareable URL.
              {!configured && " No Netlify token is configured yet, so this will show setup instructions instead."}
            </p>
            <Button variant="primary" onClick={runPublish}>Publish</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
