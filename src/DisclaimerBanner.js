import React, { useState, useEffect } from 'react';
import './DisclaimerBanner.css';

export default function DisclaimerBanner() {
  const key = 'mh_disclaimer_dismissed_v1';
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(key) === '1'); } catch (e) { /* ignore */ }
  }, []);

  function handleDismiss() {
    try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="mh-disclaimer-banner" role="region" aria-label="Simulation disclaimer">
      <div className="mh-disclaimer-inner">
        <div className="mh-disclaimer-text">
          <strong>Simulation only — not regulated financial advice.</strong>
          <div>
            This tool is illustrative and does not provide personalised or regulated financial advice. For tailored advice consult an <a href="https://www.fca.org.uk/" target="_blank" rel="noopener noreferrer">FCA-authorised adviser</a>. For official tax guidance see <a href="https://www.gov.uk/government/organisations/hm-revenue-customs" target="_blank" rel="noopener noreferrer">HMRC</a>.
          </div>
        </div>
        <div className="mh-disclaimer-actions">
          <button className="mh-disclaimer-dismiss" onClick={handleDismiss} aria-label="Dismiss disclaimer">Dismiss</button>
        </div>
      </div>
    </div>
  );
}
