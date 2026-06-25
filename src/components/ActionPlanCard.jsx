import { fmtGBP, fmtPct } from '../utils/formatters';

function ActionPlanCard({ results }) {
  const { actionPlan, contribution } = results;
  const { phases, alreadyLeft } = actionPlan;

  if (!phases || phases.length === 0) return null;

  const multiPhase = phases.length > 1;

  return (
    <div className="action-plan-card">
      <div className="ap-header">
        <span className="ap-header-icon">🗺️</span>
        <div>
          <p className="ap-title">Your Action Plan</p>
          <p className="ap-subtitle">
            {multiPhase
              ? `How to allocate your ${fmtGBP(contribution)}/yr — changes when you leave MOD service`
              : `Exactly how to allocate your ${fmtGBP(contribution)}/yr for maximum efficiency`}
          </p>
        </div>
      </div>

      {alreadyLeft && (
        <p className="ap-left-note">You've left MOD service — Added Pension contributions are no longer possible. Your existing Added Pension is preserved and CPI-linked.</p>
      )}

      {phases.map((phase, pi) => (
        <div key={pi} className="ap-phase">
          <div className="ap-phase-header">
            <span className="ap-phase-icon">{phase.icon}</span>
            <div>
              <p className="ap-phase-label">{phase.label}</p>
              <p className="ap-phase-subtitle">{phase.subtitle}</p>
            </div>
          </div>

          <div className="ap-steps">
            {phase.steps.map((s, i) => (
              <div key={i} className="ap-step" style={{ '--step-color': s.color }}>
                <div className="ap-step-number">Step {i + 1}</div>
                <div className="ap-step-header">
                  <span className="ap-step-icon">{s.icon}</span>
                  <span className="ap-step-vehicle">{s.vehicle}</span>
                  <span className="ap-step-amount" style={{ color: s.color }}>{fmtGBP(s.gross)}/yr</span>
                </div>
                <div className="ap-step-body">
                  <div className="ap-step-money">
                    <div className="ap-step-money-row">
                      <span className="ap-money-label">Gross contribution</span>
                      <span className="ap-money-value">{fmtGBP(s.gross)}/yr</span>
                    </div>
                    {s.saving > 0 && (
                      <div className="ap-step-money-row">
                        <span className="ap-money-label">Tax + NI saved</span>
                        <span className="ap-money-value positive">−{fmtGBP(s.saving)}/yr</span>
                      </div>
                    )}
                    {s.govTopUp > 0 && (
                      <div className="ap-step-money-row">
                        <span className="ap-money-label">Govt top-up</span>
                        <span className="ap-money-value positive">+{fmtGBP(s.govTopUp)}/yr</span>
                      </div>
                    )}
                    <div className="ap-step-money-row ap-net-row">
                      <span className="ap-money-label">Net cost to you</span>
                      <span className="ap-money-value">{fmtGBP(s.netCost)}/yr</span>
                    </div>
                  </div>
                  <p className="ap-step-outcome">→ {s.outcome}</p>
                  <p className="ap-step-reason">{s.reason}</p>
                  {s.note && <p className="ap-step-note">💡 {s.note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="ap-phase-totals">
            <div className="ap-summary-row">
              <span>Phase budget</span>
              <span className="ap-summary-value">{fmtGBP(phase.totalGross)}/yr × {phase.years} yr{phase.years !== 1 ? 's' : ''}</span>
            </div>
            <div className="ap-summary-row">
              <span>Net cost to you</span>
              <span className="ap-summary-value">{fmtGBP(phase.totalNet)}/yr</span>
            </div>
            {phase.totalGross > phase.totalNet && (
              <div className="ap-summary-row ap-summary-saving">
                <span>Tax + NI savings</span>
                <span className="ap-summary-value positive">{fmtGBP(phase.totalGross - phase.totalNet)}/yr</span>
              </div>
            )}
          </div>

          {multiPhase && pi < phases.length - 1 && (
            <div className="ap-phase-transition">
              <span className="ap-transition-arrow">↓</span>
              <span>When you leave MOD, redirect Added Pension budget into SIPP + ISA</span>
            </div>
          )}
        </div>
      ))}

      <div className="ap-summary">
        <p className="ap-summary-title">Overall Summary</p>
        {phases.map((phase, pi) => (
          <div key={pi} className="ap-summary-row">
            <span>{phase.icon} {phase.label}</span>
            <span className="ap-summary-value">{fmtGBP(phase.totalNet)}/yr net for {phase.years} yr{phase.years !== 1 ? 's' : ''}</span>
          </div>
        ))}
        {phases[0] && phases[0].totalGross > phases[0].totalNet && (
          <p className="ap-summary-note">
            {multiPhase ? 'While serving: f' : 'F'}or every £1 you spend, {fmtGBP(phases[0].totalGross / phases[0].totalNet, 2)} is invested — a {fmtPct((phases[0].totalGross - phases[0].totalNet) / phases[0].totalNet)} boost from tax relief and salary sacrifice.
            That's {fmtGBP(phases[0].totalGross / 12, 0)}/month gross from just {fmtGBP(phases[0].totalNet / 12, 0)}/month net.
          </p>
        )}
      </div>
    </div>
  );
}

// MIX CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default ActionPlanCard;
