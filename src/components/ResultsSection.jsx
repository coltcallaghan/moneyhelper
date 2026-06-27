import React from 'react';
import { fmtGBP, fmtPct } from '../utils/formatters';
import ActionPlanCard from './ActionPlanCard';
import MixCard from './MixCard';
import RetirementTimelineChart from './RetirementTimelineChart';
import TotalWealthChart from './TotalWealthChart';
import RetirementPictureCard from './RetirementPictureCard';
import ResultCard from './ResultCard';

// ─────────────────────────────────────────────────────────────────────────────
// ResultsSection — the entire right-hand results column. Pure presentation: it
// reads displayResults + the selected optimisation mode and renders the tax
// summary, FIRE number, mode toggle, action plan, charts, mortgage/cash/net-worth
// cards, recommendation, mix analysis and full comparison. All state lives in
// App(); this component only receives props and calls back via setOptMode.
// Extracted from App.js to keep that file at orchestration level only.
// ─────────────────────────────────────────────────────────────────────────────
export default function ResultsSection({ displayResults, optMode, setOptMode, form, taxSummaryRef }) {
  const activeResults = {
    ...displayResults,
    actionPlan: displayResults.modes?.[optMode]?.actionPlan ?? displayResults.actionPlan,
    phaseAllocations: displayResults.modes?.[optMode]?.phaseAllocations ?? displayResults.phaseAllocations,
    activeIsaPhasePot: displayResults.modes?.[optMode]?.isaPhasePot,
    activeSippPhasePot: displayResults.modes?.[optMode]?.sippPhasePot,
    activeApPhasePension: displayResults.modes?.[optMode]?.apPhasePension,
    activeApPhaseEdpLump: displayResults.modes?.[optMode]?.apPhaseEdpLump,
    activeApPhaseEdpIncome: displayResults.modes?.[optMode]?.apPhaseEdpIncome,
  };

  return (
        <div className="results-section">

          {/* Tax summary */}
          <div className="tax-summary-card" ref={taxSummaryRef}>
            <p className="form-section-label" style={{ marginBottom: '1rem' }}>Your Tax Summary (2025/26)</p>
            <div className="tax-summary-grid">
              <div className="tax-summary-item">
                <span className="ts-label">Gross Pay</span>
                <span className="ts-value">{fmtGBP(displayResults.salary)}</span>
                {displayResults.taxSummary.hasDeductions && (
                  <span className="ts-sub">
                    {displayResults.taxSummary.salSacrifice > 0 && `−${fmtGBP(displayResults.taxSummary.salSacrifice)} sal. sacrifice`}
                    {displayResults.taxSummary.salSacrifice > 0 && displayResults.taxSummary.flatRateExpenses > 0 && ', '}
                    {displayResults.taxSummary.flatRateExpenses > 0 && `−${fmtGBP(displayResults.taxSummary.flatRateExpenses)} expenses`}
                  </span>
                )}
              </div>
              {displayResults.taxSummary.hasDeductions && (
                <div className="tax-summary-item">
                  <span className="ts-label">Taxable Pay</span>
                  <span className="ts-value">{fmtGBP(displayResults.taxSummary.adjustedSalary)}</span>
                  <span className="ts-sub">{fmtGBP(displayResults.salary - displayResults.taxSummary.adjustedSalary)} sheltered from tax</span>
                </div>
              )}
              <div className="tax-summary-item">
                <span className="ts-label">Personal Allowance</span>
                <span className="ts-value">{displayResults.taxSummary.taxInfo.pa <= 0 ? 'None' : fmtGBP(displayResults.taxSummary.effectivePA)}</span>
                {displayResults.taxSummary.effectivePA !== displayResults.taxSummary.taxInfo.pa && displayResults.taxSummary.taxInfo.pa > 0 && (
                  <span className="ts-sub">Tapered from {fmtGBP(displayResults.taxSummary.taxInfo.pa)}</span>
                )}
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">Income Tax</span>
                <span className="ts-value negative">{fmtGBP(displayResults.taxSummary.incomeTax)}</span>
                <span className="ts-sub">Effective rate: {fmtPct(displayResults.taxSummary.effectiveTaxRate, 1)}</span>
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">National Insurance</span>
                <span className="ts-value negative">{fmtGBP(displayResults.taxSummary.ni)}</span>
                {displayResults.taxSummary.hasDeductions && (
                  <span className="ts-sub">On NIable pay of {fmtGBP(displayResults.taxSummary.niableSalary)}</span>
                )}
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">Take-home Pay</span>
                <span className="ts-value positive">{fmtGBP(displayResults.taxSummary.takeHome)}</span>
                <span className="ts-sub">Marginal rate: {fmtPct(displayResults.taxSummary.marginalRate)}{displayResults.taxSummary.marginalRate >= 0.60 ? ' ⚠️' : ''} | {fmtGBP(displayResults.taxSummary.takeHome / 12, 0)}/mo</span>
              </div>
            </div>
            {displayResults.taxSummary.taxInfo.note && (
              <div className="tax-code-info">
                <span>🏷️ Tax code: {displayResults.taxSummary.taxInfo.note}</span>
                {typeof displayResults.taxSummary.effectivePA === 'number' && typeof displayResults.taxSummary.taxInfo.pa === 'number' && displayResults.taxSummary.effectivePA < displayResults.taxSummary.taxInfo.pa && (
                  <div style={{ marginTop: '0.5rem', color: '#92400e' }}>
                    Note: your personal allowance has been reduced due to your income (tapered from {fmtGBP(displayResults.taxSummary.taxInfo.pa)} to {fmtGBP(displayResults.taxSummary.effectivePA)}).
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FIRE number */}
          {displayResults.fireNumber > 0 && form.targetIncome && parseFloat(form.targetIncome) > 0 && (
            <div className="fire-card">
              <div className="fire-header">
                <span className="fire-emoji">🔥</span>
                <div>
                  <p className="fire-label">Your FIRE Number (25× rule)</p>
                  <p className="fire-number">{fmtGBP(displayResults.fireNumber)}</p>
                </div>
              </div>
              <p className="fire-sub">
                Based on a 4% safe withdrawal rate — you need {fmtGBP(displayResults.fireNumber)} in today's money to sustainably withdraw {fmtGBP(displayResults.fireNumber / 25, 0)}/yr.
                All projections adjusted for {fmtPct(displayResults.inflationRate, 1)}/yr inflation (real growth: {fmtPct(displayResults.realReturnRate, 1)}/yr).
              </p>
            </div>
          )}

          {/* Optimisation Mode Toggle */}
          <div className="opt-mode-toggle">
            <button
              className={`opt-toggle-btn${optMode === 'targetRetirement' ? ' active' : ''}`}
              onClick={() => setOptMode('targetRetirement')}
            >Target Age</button>
            <button
              className={`opt-toggle-btn${optMode === 'maxReturn' ? ' active' : ''}`}
              onClick={() => setOptMode('maxReturn')}
            >Max Return</button>
            <button
              className={`opt-toggle-btn${optMode === 'earliestFire' ? ' active' : ''}`}
              onClick={() => setOptMode('earliestFire')}
            >Earliest FIRE</button>
          </div>

          {/* Action Plan */}
          <ActionPlanCard results={activeResults} />

          {/* Retirement Income Timeline */}
          <RetirementTimelineChart results={activeResults} form={form} />

          {/* Total Wealth */}
          <TotalWealthChart results={activeResults} form={form} />

          {/* Total Retirement Picture */}
          <RetirementPictureCard results={activeResults} isServing={form.isServing} />

          {/* Mortgage vs Invest Analysis */}
          {displayResults.mortgageAnalysis && (
            <div className="mortgage-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>🏠 Mortgage vs Invest Analysis</p>
              <div className="mortgage-verdict">
                <span className={`mortgage-verdict-badge ${displayResults.mortgageAnalysis.shouldOverpay ? 'overpay' : 'invest'}`}>
                  {displayResults.mortgageAnalysis.shouldOverpay ? '🏠 Overpay Mortgage' : '📈 Invest Instead'}
                </span>
                <p className="mortgage-verdict-text">{displayResults.mortgageAnalysis.verdict}</p>
              </div>
              <div className="tax-summary-grid" style={{ marginTop: '1rem' }}>
                <div className="tax-summary-item">
                  <span className="ts-label">Property Value</span>
                  <span className="ts-value">{fmtGBP(displayResults.mortgageAnalysis.propertyValue, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Mortgage Balance</span>
                  <span className="ts-value negative">{fmtGBP(displayResults.mortgageAnalysis.mortgageBalance, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Current Equity</span>
                  <span className="ts-value positive">{fmtGBP(displayResults.mortgageAnalysis.equityNow, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Mortgage Rate</span>
                  <span className="ts-value">{fmtPct(displayResults.mortgageAnalysis.mortgageRate, 2)}</span>
                  <span className="ts-sub">Guaranteed return if overpaying</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Real Investment Return</span>
                  <span className="ts-value">{fmtPct(displayResults.realReturnRate, 2)}</span>
                  <span className="ts-sub">Expected (not guaranteed)</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Est. Total Interest Cost</span>
                  <span className="ts-value negative">{fmtGBP(displayResults.mortgageAnalysis.totalInterestEst, 0)}</span>
                  <span className="ts-sub">Over remaining {displayResults.mortgageAnalysis.mortgageTermYears}yr term</span>
                </div>
                {displayResults.mortgageAnalysis.mortgagePaidOffAge && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Mortgage Paid Off</span>
                    <span className="ts-value">Age {displayResults.mortgageAnalysis.mortgagePaidOffAge}</span>
                    <span className="ts-sub">{displayResults.mortgageAnalysis.mortgagePaidOffAge <= displayResults.retirementAge ? '✅ Before retirement' : '⚠️ After retirement'}</span>
                  </div>
                )}
              </div>
              <div className="mortgage-note">
                <p>💡 <strong>Key insight:</strong> Mortgage overpayment gives a <em>guaranteed, risk-free, tax-free</em> return equal to your mortgage rate.
                Investment returns are uncertain. Even if expected returns are higher, the risk-free nature of mortgage overpayment has real value.</p>
                <p style={{ marginTop: '0.5rem' }}>🎯 <strong>Suggested priority:</strong> Emergency fund (6 months) → {displayResults.mortgageAnalysis.shouldOverpay ? 'Mortgage overpayment → ISA/SIPP' : 'AP/SIPP/ISA (per Action Plan) → Mortgage overpayment'}</p>
              </div>
            </div>
          )}

          {/* Cash Reserves */}
          {displayResults.cashAnalysis && (
            <div className="cash-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>🏦 Cash Reserve Health</p>
              <div className="tax-summary-grid">
                <div className="tax-summary-item">
                  <span className="ts-label">Cash Reserves</span>
                  <span className="ts-value">{fmtGBP(displayResults.cashAnalysis.cashReserve, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Monthly Expenses</span>
                  <span className="ts-value">{fmtGBP(displayResults.cashAnalysis.monthlyExpenses, 0)}/mo</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Emergency Cover</span>
                  <span className={`ts-value ${displayResults.cashAnalysis.emergencyOk ? 'positive' : 'negative'}`}>
                    {displayResults.cashAnalysis.monthlyExpenses > 0 ? `${(displayResults.cashAnalysis.cashReserve / displayResults.cashAnalysis.monthlyExpenses).toFixed(1)} months` : '—'}
                  </span>
                  <span className="ts-sub">Target: 6 months ({fmtGBP(displayResults.cashAnalysis.emergencyTarget, 0)})</span>
                </div>
                {displayResults.cashAnalysis.emergencyShortfall > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Shortfall</span>
                    <span className="ts-value negative">{fmtGBP(displayResults.cashAnalysis.emergencyShortfall, 0)}</span>
                    <span className="ts-sub">⚠️ Build this before investing</span>
                  </div>
                )}
              </div>
              {!displayResults.cashAnalysis.emergencyOk && displayResults.cashAnalysis.monthlyExpenses > 0 && (
                <div className="mortgage-note" style={{ marginTop: '0.75rem' }}>
                  <p>⚠️ <strong>Priority:</strong> Your emergency fund covers less than 6 months of expenses. Build this up in easy-access savings <em>before</em> investing or making mortgage overpayments.</p>
                </div>
              )}
            </div>
          )}

          {/* Net Worth Summary — follows the optimisation toggle (falls back to
              the legacy single netWorth for calculations saved before this change) */}
          {(() => {
            const nw = displayResults.modes?.[optMode]?.netWorth ?? displayResults.netWorth;
            if (!nw || !(nw.totalNetWorth > 0)) return null;
            return (
            <div className="networth-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>💰 Projected Net Worth at Retirement</p>
              <div className="tax-summary-grid">
                <div className="tax-summary-item">
                  <span className="ts-label">ISA Pot</span>
                  <span className="ts-value">{fmtGBP(nw.isaOptPot, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">SIPP Pot</span>
                  <span className="ts-value">{fmtGBP(nw.sippOptPot, 0)}</span>
                </div>
                {nw.apOptPot > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Added Pension (commuted)</span>
                    <span className="ts-value">{fmtGBP(nw.apOptPot, 0)}</span>
                    <span className="ts-sub">DB value — not a pot you can access</span>
                  </div>
                )}
                {nw.dbOptPot > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">DB Pension (commuted)</span>
                    <span className="ts-value">{fmtGBP(nw.dbOptPot, 0)}</span>
                    <span className="ts-sub">Estimated capital equivalent (×25)</span>
                  </div>
                )}
                {nw.propertyEquityAtRetirement > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Property Equity</span>
                    <span className="ts-value">{fmtGBP(nw.propertyEquityAtRetirement, 0)}</span>
                  </div>
                )}
                {nw.cashAtRetirement > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Cash (nominal)</span>
                    <span className="ts-value">{fmtGBP(nw.cashAtRetirement, 0)}</span>
                    <span className="ts-sub">Eroded by inflation if not invested</span>
                  </div>
                )}
                <div className="tax-summary-item" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
                  <span className="ts-label" style={{ fontWeight: 700 }}>Liquid Wealth (ISA + SIPP)</span>
                  <span className="ts-value positive" style={{ fontSize: '1.15rem' }}>{fmtGBP(nw.liquidWealth, 0)}</span>
                </div>
                <div className="tax-summary-item" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
                  <span className="ts-label" style={{ fontWeight: 700 }}>Total Net Worth</span>
                  <span className="ts-value positive" style={{ fontSize: '1.25rem' }}>{fmtGBP(nw.totalNetWorth, 0)}</span>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Recommendation */}
          {(() => {
            const modeMap = {
              maxReturn:        { best: displayResults.recommendation.maxReturnBest,    reason: displayResults.recommendation.maxReturnReason,    badge: 'Max Return' },
              earliestFire:     { best: displayResults.recommendation.earliestFireBest, reason: displayResults.recommendation.earliestFireReason, badge: 'Earliest FIRE' },
              targetRetirement: { best: displayResults.recommendation.targetBest,       reason: displayResults.recommendation.targetReason,       badge: 'Best for Target Age' },
            };
            const activeRec = modeMap[optMode] || modeMap.maxReturn;
            return (
              <div className="recommendation-card">
                <div className="rec-header">
                  <span className="rec-badge">{activeRec.badge}</span>
                  <h2>{activeRec.best.icon} {activeRec.best.name}</h2>
                </div>
                <p className="rec-reason">{activeRec.reason}</p>
                <div className="rec-stats">
                  <div className="rec-stat">
                    <span className="rec-stat-label">Net cost to you</span>
                    <span className="rec-stat-value">{fmtGBP(activeRec.best.costToYou)}</span>
                  </div>
                  <div className="rec-stat">
                    <span className="rec-stat-label">Efficiency score</span>
                    <span className="rec-stat-value rec-efficiency">{activeRec.best.efficiency.toFixed(2)}×</span>
                  </div>
                  <div className="rec-stat">
                    <span className="rec-stat-label">Projected pot</span>
                    <span className="rec-stat-value">{fmtGBP(activeRec.best.potAtRetirement)}</span>
                  </div>
                  <div className="rec-stat">
                    <span className="rec-stat-label">Annual income</span>
                    <span className="rec-stat-value">{fmtGBP(activeRec.best.annualIncomeAtRetirement, 0)}/yr</span>
                  </div>
                </div>
                <p className="rec-note" style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Figures above assume your whole {fmtGBP(displayResults.contribution)}/yr goes into this vehicle. For the recommended split across vehicles, follow the <strong>Action Plan</strong> above.
                </p>
              </div>
            );
          })()}

          {/* Mix analysis */}
          <MixCard
            mixData={displayResults.mixData}
            taxRate={displayResults.taxSummary.marginalRate}
            contribution={parseFloat(form.contribution) || 0}
            years={displayResults.years}
          />

          {/* Full comparison */}
          <p className="results-heading">Full Comparison ({displayResults.years} years — all values in today's money at {fmtPct(displayResults.realReturnRate, 1)}/yr real growth)</p>
          <p className="results-subheading" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Each card below shows what would happen if you put your <strong>entire</strong> {fmtGBP(displayResults.contribution)}/yr into that <strong>one</strong> vehicle — a like-for-like comparison. Your actual recommended split across vehicles is in the <strong>Action Plan</strong> above.
          </p>
          <div className="results-grid">
            {displayResults.options.map(o => (
              <ResultCard key={o.id} option={o} maxEfficiency={displayResults.maxEfficiency} years={displayResults.years} />
            ))}
          </div>

          <p className="disclaimer">
            ⚠️ Illustrative only. All values in today's purchasing power (adjusted for {fmtPct(parseFloat(form.inflationRate) || 0.025, 1)}/yr inflation).
            Uses 2025/26 UK tax rates. Investment returns are not guaranteed. AFPS 15 and State Pension are CPI-linked (constant in real terms). Seek independent financial advice.
          </p>
        </div>
  );
}
