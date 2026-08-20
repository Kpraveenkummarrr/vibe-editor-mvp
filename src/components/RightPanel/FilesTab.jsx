import { useRef, useState } from "react";
import { useProject } from "../../state/ProjectContext.jsx";
import Button from "../ui/Button.jsx";
import { IconUpload, IconTrash, IconCopy, IconImage } from "../ui/Icons.jsx";
import { nextId } from "../../utils/id.js";

function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AssetCard({ asset, onDelete }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(asset.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      window.prompt("Copy this image URL:", asset.dataUrl);
    }
  }

  return (
    <li className="asset-card">
      <div className="asset-card__thumb">
        <img src={asset.dataUrl} alt={asset.name} />
      </div>
      <div className="asset-card__info">
        <span className="asset-card__name" title={asset.name}>{asset.name}</span>
        <span className="asset-card__size">{formatSize(asset.size)}</span>
      </div>
      <div className="asset-card__actions">
        <button className="asset-card__btn" onClick={copyUrl} aria-label={`Copy URL for ${asset.name}`} title="Copy image URL">
          <IconCopy size={13} />
          {copied ? "Copied" : "Copy URL"}
        </button>
        <button className="asset-card__btn asset-card__btn--danger" onClick={onDelete} aria-label={`Delete ${asset.name}`} title="Delete">
          <IconTrash size={13} />
        </button>
      </div>
    </li>
  );
}

export default function FilesTab() {
  const { project, dispatch } = useProject();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const assets = project.assets || [];

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const dataUrl = await readAsDataUrl(file);
        dispatch({
          type: "ADD_ASSET",
          asset: {
            id: nextId("asset"),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            uploadedAt: Date.now(),
          },
        });
      }
    } catch {
      setError("Couldn't read that file — try a different image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="files-view">
      <div className="files-shell">
        <div className="files-head">
          <div>
            <div className="files-title">Assets</div>
            <div className="files-subtitle">{assets.length} uploaded image{assets.length === 1 ? "" : "s"}</div>
          </div>
          <div className="files-actions">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<IconUpload size={13} />}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          </div>
        </div>

        {error && <div className="files-error">{error}</div>}

        {assets.length === 0 ? (
          <div
            className="assets-empty"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <IconImage size={28} />
            <p>No images yet</p>
            <p className="assets-empty__hint">Upload logos, photos, or icons — drag &amp; drop or use the button above. Copy an image&rsquo;s URL to paste into your page&rsquo;s HTML.</p>
          </div>
        ) : (
          <ul className="files-grid assets-grid">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => {
                  if (window.confirm(`Delete "${asset.name}"?`)) {
                    dispatch({ type: "DELETE_ASSET", id: asset.id });
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
