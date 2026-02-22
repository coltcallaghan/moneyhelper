import React from 'react';
import InfoHint from '../InfoHint';

export default function ContributionProjection({ form, handleChange, setStep }) {
  return (
    <div>
      <p className="form-section-label">Contribution &amp; Projection Settings</p>
      <div className="form-grid">
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="contribution">Amount to Invest<span className="required-star">*</span></label>
            <InfoHint>
              {form.contributionFreq === 'monthly'
                ? `Gross monthly amount — annualised.`
                : 'Gross annual amount to compare across all three options'}
            </InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="contribution" name="contribution" type="number" value={form.contribution} onChange={handleChange} required />
            <span className="input-suffix">/{form.contributionFreq === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="retirementAge">Target Retirement Age<span className="required-star">*</span></label>
          <div className="input-wrap" style={{ width: '100%' }}>
            <input id="retirementAge" name="retirementAge" type="number" min="40" max="75" step="1" value={form.retirementAge || 60} onChange={handleChange} required />
            <span className="input-suffix">yrs</span>
          </div>
        </div>
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="targetIncome">Target Annual Retirement Income <span className="required-star">*</span></label>
            <InfoHint>Used to calculate your FIRE number (25× rule)</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="targetIncome" name="targetIncome" type="number" value={form.targetIncome} onChange={handleChange} required />
          </div>
        </div>
      </div>

      <div className="step-nav" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="preset-btn" onClick={() => setStep(3)}>◀ Back</button>
        <button className="btn-calculate" type="submit">Calculate My Best Option →</button>
      </div>
    </div>
  );
}
