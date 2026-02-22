import React from 'react';

export default function PersonalDetails({ form, handleChange, setStep }) {
  return (
    <div>
      <p className="form-section-label">Your Details</p>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="salary">Annual Salary<span className="required-star">*</span></label>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="salary" name="salary" type="number" placeholder="35000" value={form.salary} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="taxCode">Tax Code <span className="label-hint">(e.g. 1257L, BR, D0, K100)</span></label>
          <input id="taxCode" className="bare-input" name="taxCode" type="text" placeholder="1257L" value={form.taxCode} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="age">Age<span className="required-star">*</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="input-wrap" style={{ width: '100%' }}>
              <input id="age" name="age" type="number" min="18" max="75" step="1" value={form.age || 35} onChange={handleChange} required />
              <span className="input-suffix">yrs</span>
            </div>
          </div>
        </div>
        {form.isServing && (
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="leaveAge">Expected Age When Leaving MOD <span className="label-hint">(for AFPS 15)</span></label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="input-wrap" style={{ width: '100%' }}>
                <input id="leaveAge" name="leaveAge" type="number" value={form.leaveAge || ''} onChange={handleChange} />
                <span className="input-suffix">yrs</span>
              </div>
            </div>
          </div>
        )}
        {form.isServing && (
          <div className="form-group">
            <label htmlFor="modPayslip">MOD Payslip Type</label>
            <select id="modPayslip" name="modPayslip" value={form.modPayslip} onChange={handleChange}>
              <option value="">Select payslip</option>
              <option value="regular">Regular MOD payslip</option>
              <option value="detailed">Detailed payslip (with breakdown)</option>
              <option value="none">No payslip</option>
            </select>
          </div>
        )}
      </div>

      <div className="step-nav" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="preset-btn" onClick={() => setStep(1)}>◀ Back</button>
        <button type="button" className="preset-btn" onClick={() => setStep(3)}>Next ▶</button>
      </div>
    </div>
  );
}
