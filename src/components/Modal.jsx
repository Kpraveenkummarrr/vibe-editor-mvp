import { useEffect } from "react";

export default function Modal({ title, onClose, children, footer, width = 480 }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="ui-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ui-modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ui-modal__header">
          <h3>{title}</h3>
          <button className="ui-icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
