import React, { useState, useEffect, useRef } from 'react';

export default function InfoHint({ children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span className="info-hint-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`info-hint-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="More information"
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        <div className="info-hint-popup" role="dialog">
          <div className="info-hint-popup-header">
            <span className="info-hint-popup-title">Info</span>
            <button type="button" className="info-hint-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="info-hint-popup-body">{children}</div>
        </div>
      )}
    </span>
  );
}
