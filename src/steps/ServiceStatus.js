import React from 'react';

export default function ServiceStatus({ form, handleChange, setStep }) {
  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '1em' }}>
        <label htmlFor="isServing" style={{ fontWeight: 600 }}>
          <input
            id="isServing"
            name="isServing"
            type="checkbox"
            checked={form.isServing}
            onChange={handleChange}
            style={{ marginRight: '0.5em' }}
          />
          Currently serving in the military (show MOD-specific options)
        </label>
      </div>
      <div className="step-nav" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="preset-btn" onClick={() => setStep(0)}>◀ Back</button>
        <button type="button" className="preset-btn" onClick={() => setStep(2)}>Next ▶</button>
      </div>
    </div>
  );
}
