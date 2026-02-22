
import React from 'react';
import InfoHint from '../InfoHint';

export default function CurrentPots({ form, handleChange, showPropertyDetails, setShowPropertyDetails, setStep }) {
  return (
    <div>
      <p className="form-section-label">Current Pots & Pension Statement <span className="label-hint">(optional — needed for full retirement picture)</span></p>
      <div className="form-grid">
        {/* MOD DB Pension */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="existingDbPension">MOD DB Pension — Annual Statement Value <span className="label-hint">(£/yr at retirement)</span></label>
            <InfoHint>The projected annual pension shown on your latest MOD pension statement (your AFPS 15 defined benefit). Enter 0 or leave blank if not yet received.</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="existingDbPension" name="existingDbPension" type="number" placeholder="12000" min="0" value={form.existingDbPension} onChange={handleChange} />
          </div>
        </div>
        {/* ISA Pot */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="existingIsaPot">Existing ISA Balance</label>
            <InfoHint>Current value of your Stocks &amp; Shares or Cash ISA. Will compound at your chosen growth rate until retirement.</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="existingIsaPot" name="existingIsaPot" type="number" placeholder="5000" min="0" value={form.existingIsaPot} onChange={handleChange} />
          </div>
        </div>
        {/* SIPP Pot */}
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="existingSippPot">Existing SIPP / Pension Pot Balance</label>
            <InfoHint>Current value of any SIPP or workplace pension. Will compound at your chosen growth rate until retirement.</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="existingSippPot" name="existingSippPot" type="number" placeholder="10000" min="0" value={form.existingSippPot} onChange={handleChange} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`section-toggle-btn property-toggle${showPropertyDetails ? ' open' : ''}`}
        onClick={() => setShowPropertyDetails(v => !v)}
        aria-expanded={showPropertyDetails}
      >
        <span className="toggle-arrow">{showPropertyDetails ? '▼' : '▶'}</span>
        <span className="toggle-icon">🏠</span>
        <span className="toggle-label">I have a mortgage & cash savings — include in my plan</span>
      </button>

      {showPropertyDetails && (
        <div>
          <p className="form-section-label">Property &amp; Mortgage</p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="propertyValue">Property Value <span className="label-hint">(estimated current market value)</span></label>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="propertyValue" name="propertyValue" type="number" placeholder="300000" min="0" value={form.propertyValue} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="mortgageBalance">Mortgage Balance Remaining</label>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="mortgageBalance" name="mortgageBalance" type="number" placeholder="200000" min="0" value={form.mortgageBalance} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="mortgageRate">Mortgage Interest Rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input id="mortgageRate" name="mortgageRate" type="range" min="0" max="10" step="0.1" value={form.mortgageRate || 4.5} onChange={handleChange} />
                <span style={{ minWidth: '4.5rem', textAlign: 'right' }}>{(parseFloat(form.mortgageRate || 4.5) || 0) / 100}%</span>
              </div>
            </div>
          </div>

          <p className="form-section-label" style={{ marginTop: '1rem' }}>Cash Reserves</p>
          <div className="form-grid">
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="cashReserve">Current Cash / Emergency Fund</label>
                <InfoHint>Total easily accessible cash savings (current account + easy-access savings)</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="cashReserve" name="cashReserve" type="number" placeholder="10000" min="0" value={form.cashReserve} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="monthlyExpenses">Monthly Living Expenses <span className="label-hint">(exc. mortgage)</span></label>
                <InfoHint>Used to calculate your emergency fund target (6 months)</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="monthlyExpenses" name="monthlyExpenses" type="number" placeholder="2000" min="0" value={form.monthlyExpenses} onChange={handleChange} />
                <span className="input-suffix">/mo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="step-nav" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="preset-btn" onClick={() => setStep(2)}>◀ Back</button>
        <button type="button" className="preset-btn" onClick={() => setStep(4)}>Next ▶</button>
      </div>
    </div>
  );
}
