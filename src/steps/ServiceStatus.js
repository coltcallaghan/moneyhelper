export default function ServiceStatus({ form, handleChange, setStep }) {
  return (
    <div>
      <p className="form-section-label">Are you currently serving?</p>
      <div className="service-status-toggle">
        <label className="service-toggle-label">
          <input
            id="isServing"
            name="isServing"
            type="checkbox"
            checked={form.isServing}
            onChange={handleChange}
            className="service-toggle-checkbox"
          />
          <span className="service-toggle-text">
            <strong>Currently serving in HM Armed Forces</strong>
            <span className="service-toggle-sub">Unlocks MOD-specific options: AFPS 15 Added Pension, EDP calculations, service years</span>
          </span>
        </label>
      </div>

      <div className="step-nav">
        <button type="button" className="btn-nav" onClick={() => setStep(0)}>◀ Back</button>
        <button type="button" className="btn-nav-primary" onClick={() => setStep(2)}>Next ▶</button>
      </div>
    </div>
  );
}
