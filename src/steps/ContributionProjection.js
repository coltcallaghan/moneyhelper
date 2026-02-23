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
                ? 'Gross monthly amount — annualised for comparison.'
                : 'Gross annual amount to compare across all three options'}
            </InfoHint>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <span className="input-prefix">£</span>
              <input id="contribution" name="contribution" type="number" value={form.contribution} onChange={handleChange} required />
              <span className="input-suffix">/{form.contributionFreq === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <select name="contributionFreq" value={form.contributionFreq} onChange={handleChange} className="bare-input" style={{ width: 'auto', paddingRight: '2.25rem', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', appearance: 'none', cursor: 'pointer' }}>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="retirementAge">Target Retirement Age<span className="required-star">*</span></label>
          <div className="input-wrap" style={{ width: '100%' }}>
            <input id="retirementAge" name="retirementAge" type="number" min="40" max="75" step="1" placeholder="60" value={form.retirementAge} onChange={handleChange} required />
            <span className="input-suffix">yrs</span>
          </div>
        </div>
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="targetIncome">Target Annual Retirement Income<span className="required-star">*</span></label>
            <InfoHint>Used to calculate your FIRE number (25× rule)</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="targetIncome" name="targetIncome" type="number" value={form.targetIncome} onChange={handleChange} required />
          </div>
        </div>
      </div>

      <p className="form-section-label" style={{ marginTop: '1.25rem' }}>Projection Assumptions <span className="label-hint">(optional)</span></p>
      <div className="form-grid">
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="returnRate">Expected Annual Return</label>
            <InfoHint>Nominal annual investment return. 7% is a common long-run estimate for a globally diversified equity portfolio.</InfoHint>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input id="returnRate" name="returnRate" type="range" min="0.02" max="0.15" step="0.005" value={form.returnRate || 0.07} onChange={handleChange} style={{ flex: 1 }} />
            <span style={{ minWidth: '3rem', textAlign: 'right' }}>{((parseFloat(form.returnRate || 0.07)) * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="inflationRate">Inflation Rate</label>
            <InfoHint>Used to deflate future values to today's money. UK long-run CPI average is ~2.5%.</InfoHint>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input id="inflationRate" name="inflationRate" type="range" min="0.005" max="0.08" step="0.005" value={form.inflationRate || 0.025} onChange={handleChange} style={{ flex: 1 }} />
            <span style={{ minWidth: '3rem', textAlign: 'right' }}>{((parseFloat(form.inflationRate || 0.025)) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="step-nav">
        <button type="button" className="btn-nav" onClick={() => setStep(3)}>◀ Back</button>
        <button className="btn-calculate" type="submit">Calculate My Best Option →</button>
      </div>
    </div>
  );
}
