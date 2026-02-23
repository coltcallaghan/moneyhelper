import { useState } from 'react';
import InfoHint from '../InfoHint';

export default function PersonalDetails({ form, handleChange, setStep }) {
  const [errors, setErrors] = useState({});

  function validateAndNext() {
    const errs = {};
    const salary = parseFloat(form.salary);
    const age = parseInt(form.age);

    if (!form.salary || isNaN(salary) || salary <= 0) errs.salary = 'Enter a valid annual salary';
    if (!form.age || isNaN(age) || age < 18 || age > 75) errs.age = 'Enter your age (18–75)';
    if (form.isServing) {
      const leaveAge = parseInt(form.leaveAge);
      if (form.leaveAge && (!isNaN(age)) && leaveAge <= age) {
        errs.leaveAge = 'Leave age must be greater than your current age';
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(3);
  }

  // Estimated AP cost per £100 pension (age-based formula from MOD tables)
  const estAge = parseInt(form.age) || 30;
  const estCostPer100 = Math.round(800 * Math.pow(1.042, estAge - 20));

  return (
    <div>
      <p className="form-section-label">Your Details</p>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="salary">Annual Salary<span className="required-star">*</span></label>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input
              id="salary" name="salary" type="number" placeholder="35000"
              value={form.salary} onChange={handleChange}
              className={errors.salary ? 'input-invalid' : ''}
            />
          </div>
          {errors.salary && <span className="field-error">{errors.salary}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="taxCode">Tax Code <span className="label-hint">(e.g. 1257L, BR, D0, K100)</span></label>
          <input id="taxCode" className="bare-input" name="taxCode" type="text" placeholder="1257L" value={form.taxCode} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age<span className="required-star">*</span></label>
          <div className="input-wrap" style={{ width: '100%' }}>
            <input
              id="age" name="age" type="number" min="18" max="75" step="1"
              placeholder="35"
              value={form.age} onChange={handleChange}
              className={errors.age ? 'input-invalid' : ''}
            />
            <span className="input-suffix">yrs</span>
          </div>
          {errors.age && <span className="field-error">{errors.age}</span>}
        </div>

        {form.isServing && (
          <div className="form-group">
            <label htmlFor="yearsService">Years of Service <span className="label-hint">(for EDP &amp; AFPS 15)</span></label>
            <div className="input-wrap" style={{ width: '100%' }}>
              <input id="yearsService" name="yearsService" type="number" min="0" max="40" step="1" placeholder="5" value={form.yearsService} onChange={handleChange} />
              <span className="input-suffix">yrs</span>
            </div>
          </div>
        )}

        {form.isServing && (
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="leaveAge">Expected Age When Leaving MOD <span className="label-hint">(for AFPS 15)</span></label>
            </div>
            <div className={`input-wrap${errors.leaveAge ? ' input-invalid-wrap' : ''}`} style={{ width: '100%' }}>
              <input id="leaveAge" name="leaveAge" type="number" placeholder="55" value={form.leaveAge || ''} onChange={handleChange} />
              <span className="input-suffix">yrs</span>
            </div>
            {errors.leaveAge && <span className="field-error">{errors.leaveAge}</span>}
          </div>
        )}
      </div>

      {/* ── Tax Adjustments ─────────────────────────────────────────── */}
      <p className="form-section-label" style={{ marginTop: '1.25rem' }}>
        Tax Adjustments <span className="label-hint">(optional)</span>
      </p>
      <div className="form-grid">
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="manualTaxablePay">Final Taxable Pay <span className="label-hint">(March payslip / P60)</span></label>
            <InfoHint>If you have your P60 or final March payslip, enter the "Total pay in this employment" figure. This overrides the salary entered above for tax calculations and gives a more accurate result.</InfoHint>
          </div>
          <div className="input-wrap">
            <span className="input-prefix">£</span>
            <input id="manualTaxablePay" name="manualTaxablePay" type="number" placeholder="leave blank to use salary above" min="0" value={form.manualTaxablePay} onChange={handleChange} />
          </div>
        </div>

        {!form.isServing && (
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="salSacrifice">Salary Sacrifice <span className="label-hint">(e.g. cycle-to-work)</span></label>
              <InfoHint>Any pre-tax salary sacrifice reduces your taxable pay and NI liability.</InfoHint>
            </div>
            <div className="input-wrap">
              <span className="input-prefix">£</span>
              <input id="salSacrifice" name="salSacrifice" type="number" placeholder="0" min="0" value={form.salSacrifice} onChange={handleChange} />
              <span className="input-suffix">/yr</span>
            </div>
          </div>
        )}

        {!form.isServing && (
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="flatRateExpenses">Flat Rate Work Expenses <span className="label-hint">(HMRC approved)</span></label>
              <InfoHint>HMRC flat rate deductions for your occupation reduce your taxable income. Check GOV.UK for your approved rate.</InfoHint>
            </div>
            <div className="input-wrap">
              <span className="input-prefix">£</span>
              <input id="flatRateExpenses" name="flatRateExpenses" type="number" placeholder="0" min="0" value={form.flatRateExpenses} onChange={handleChange} />
              <span className="input-suffix">/yr</span>
            </div>
          </div>
        )}

        {form.isServing && (
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="apPaymentType">AP Payment Type</label>
              <InfoHint>Single: one-off lump sum purchase. Periodic: monthly deductions from pay — costs ~37% more overall but spreads the cost.</InfoHint>
            </div>
            <select id="apPaymentType" name="apPaymentType" value={form.apPaymentType} onChange={handleChange}>
              <option value="single">Single (lump sum)</option>
              <option value="periodic">Periodic (monthly)</option>
            </select>
          </div>
        )}
      </div>

      {form.isServing && (
        <div className="ap-cost-info">
          <span className="ap-cost-info-label">Estimated AP cost per £100 pension for your age:</span>
          <span className="ap-cost-info-value">
            £{(form.apPaymentType === 'periodic'
              ? Math.round(estCostPer100 * 1.37)
              : estCostPer100
            ).toLocaleString()}
          </span>
          <span className="ap-cost-info-hint">Based on age {estAge} — used automatically in your calculations</span>
        </div>
      )}

      <div className="step-nav">
        <button type="button" className="btn-nav" onClick={() => setStep(1)}>◀ Back</button>
        <button type="button" className="btn-nav-primary" onClick={validateAndNext}>Next ▶</button>
      </div>
    </div>
  );
}
