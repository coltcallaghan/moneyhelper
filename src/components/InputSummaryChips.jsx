import React from 'react';
import { fmtGBP } from '../utils/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// InputSummaryChips — the collapsed "Your Inputs" summary shown once results are
// generated: a row of chips echoing the user's key inputs, with a button to edit
// them (live mode) or return to live results (when viewing a saved calc). Pure
// presentation; App owns the form state and the two callbacks.
// ─────────────────────────────────────────────────────────────────────────────
export default function InputSummaryChips({ displayForm, viewingCalc, onEdit, onBackToLive }) {
  return (
    <div className="form-card form-card-collapsed">
      <div className="collapsed-summary">
        <div className="collapsed-summary-header">
          <span className="collapsed-summary-title">
            {viewingCalc ? (viewingCalc.name || viewingCalc.summary) : 'Your Inputs'}
          </span>
          {viewingCalc ? (
            <button type="button" className="btn-edit-inputs" onClick={onBackToLive}>← Live results</button>
          ) : (
            <button type="button" className="btn-edit-inputs" onClick={onEdit}>✎ Edit inputs</button>
          )}
        </div>

        <div className="chips-row">
          {/* Personal */}
          <div className="input-chip">
            <span className="chip-label">Salary</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.salary) || 0, 0)}</span>
          </div>
          <div className="input-chip">
            <span className="chip-label">Age</span><span className="chip-sep">·</span><span className="chip-value">{displayForm.age} yrs</span>
          </div>
          <div className={`input-chip${displayForm.isServing ? ' chip-serving' : ''}`}>
            <span className="chip-label">Serving</span><span className="chip-sep">·</span><span className="chip-value">{displayForm.isServing ? 'Yes' : 'No'}</span>
          </div>
          {displayForm.isServing && displayForm.yearsService && (
            <div className="input-chip">
              <span className="chip-label">Service</span><span className="chip-sep">·</span><span className="chip-value">{displayForm.yearsService} yrs</span>
            </div>
          )}
          {displayForm.isServing && displayForm.leaveAge && (
            <div className="input-chip">
              <span className="chip-label">Leave age</span><span className="chip-sep">·</span><span className="chip-value">{displayForm.leaveAge} yrs</span>
            </div>
          )}
          {parseFloat(displayForm.manualTaxablePay) > 0 && (
            <div className="input-chip">
              <span className="chip-label">P60 pay</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.manualTaxablePay), 0)}</span>
            </div>
          )}
          {!displayForm.isServing && parseFloat(displayForm.salSacrifice) > 0 && (
            <div className="input-chip">
              <span className="chip-label">Sal. sacrifice</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.salSacrifice), 0)}/yr</span>
            </div>
          )}
          {!displayForm.isServing && parseFloat(displayForm.flatRateExpenses) > 0 && (
            <div className="input-chip">
              <span className="chip-label">Flat rate exp.</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.flatRateExpenses), 0)}/yr</span>
            </div>
          )}

          {/* Savings — conditional divider */}
          {(parseFloat(displayForm.existingDbPension) > 0 || parseFloat(displayForm.existingIsaPot) > 0 || parseFloat(displayForm.existingSippPot) > 0) && (
            <>
              <div className="chips-divider" />
              {parseFloat(displayForm.existingDbPension) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">DB pension</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.existingDbPension), 0)}/yr</span>
                </div>
              )}
              {parseFloat(displayForm.existingIsaPot) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">ISA pot</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.existingIsaPot), 0)}</span>
                </div>
              )}
              {parseFloat(displayForm.existingSippPot) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">SIPP pot</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.existingSippPot), 0)}</span>
                </div>
              )}
            </>
          )}

          {/* Cash & property — conditional divider */}
          {(parseFloat(displayForm.cashReserve) > 0 || parseFloat(displayForm.monthlyExpenses) > 0 || parseFloat(displayForm.propertyValue) > 0) && (
            <>
              <div className="chips-divider" />
              {parseFloat(displayForm.cashReserve) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">Cash</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.cashReserve), 0)}</span>
                </div>
              )}
              {parseFloat(displayForm.monthlyExpenses) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">Monthly exp.</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.monthlyExpenses), 0)}/mo</span>
                </div>
              )}
              {parseFloat(displayForm.propertyValue) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">Property</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.propertyValue), 0)}</span>
                </div>
              )}
              {parseFloat(displayForm.mortgageBalance) > 0 && (
                <div className="input-chip">
                  <span className="chip-label">Mortgage</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.mortgageBalance), 0)} @ {parseFloat(displayForm.mortgageRate || 4.5).toFixed(1)}%</span>
                </div>
              )}
            </>
          )}

          {/* Goals */}
          <div className="chips-divider" />
          <div className="input-chip">
            <span className="chip-label">Investing</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.contribution) || 0, 0)}/{displayForm.contributionFreq === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          <div className="input-chip">
            <span className="chip-label">Retire at</span><span className="chip-sep">·</span><span className="chip-value">{displayForm.retirementAge} yrs</span>
          </div>
          {parseFloat(displayForm.targetIncome) > 0 && (
            <div className="input-chip">
              <span className="chip-label">Target income</span><span className="chip-sep">·</span><span className="chip-value">{fmtGBP(parseFloat(displayForm.targetIncome), 0)}/yr</span>
            </div>
          )}
          <div className="input-chip">
            <span className="chip-label">Return</span><span className="chip-sep">·</span><span className="chip-value">{((parseFloat(displayForm.returnRate) || 0.07) * 100).toFixed(1)}%</span>
          </div>
          <div className="input-chip">
            <span className="chip-label">Inflation</span><span className="chip-sep">·</span><span className="chip-value">{((parseFloat(displayForm.inflationRate) || 0.025) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
