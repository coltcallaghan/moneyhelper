import { fmtGBP } from '../utils/formatters';

function MixCard({ mixData, taxRate, contribution, years }) {
  const { scenarios, bestIdx, sippMaxForPA } = mixData;
  const best     = scenarios[bestIdx];
  const maxIncome = Math.max(...scenarios.map(s => s.totalNetIncome));
  const sippCapped = sippMaxForPA < contribution * 0.9;

  let advice = '';
  if (taxRate >= 0.60) {
    advice = `You're in the 60% personal allowance taper zone — every £1 into a SIPP costs just 40p after tax relief. ISA offers zero upfront relief. Max out SIPP (and AFPS 15 Added Pension) before putting anything into an ISA.`;
  } else if (taxRate >= 0.40) {
    advice = `As a higher-rate taxpayer, SIPP contributions attract 40% relief now but withdrawals are likely taxed at 20% in retirement — a permanent 20p-in-the-pound saving on top of the government's 25% top-up. Max SIPP first. Once you hit the Annual Allowance, use ISA for penalty-free access before age 57.`;
  } else if (taxRate >= 0.20) {
    if (sippCapped) {
      advice = `As a basic-rate taxpayer, SIPP's 25% top-up is great — but if your SIPP annual income at retirement exceeds £12,570 you'll pay 20% on the excess, largely cancelling the top-up benefit. Optimal split: ~${fmtGBP(sippMaxForPA)}/yr into SIPP (keeping retirement drawdown within your personal allowance), the rest into ISA for fully tax-free income on top.`;
    } else {
      advice = `At this contribution level all of your SIPP income stays within the personal allowance at retirement, so 100% SIPP wins on pure maths thanks to the 25% top-up. Add ISA if you want penalty-free access before age 57 — nearly the same long-term result with added flexibility.`;
    }
  } else {
    advice = `You're below the income tax threshold — the SIPP's 25% government top-up applies automatically even at 0% tax. ISA is simpler and more flexible (no lock-in). A split favours whichever you value more: growth (SIPP) or access (ISA).`;
  }

  return (
    <div className="mix-card">
      <div className="mix-header">
        <span className="mix-icon">⚖️</span>
        <div className="mix-header-text">
          <p className="mix-title">ISA + SIPP Mix Analysis</p>
          <p className="mix-subtitle">{years} year projection in today's money — optimal split for your tax position</p>
        </div>
        <div className="mix-best-pill">{best.label} ⭐</div>
      </div>
      <p className="mix-advice">{advice}</p>
      <div className="mix-table">
        <div className="mix-table-head">
          <span>Split</span>
          <span>Net cost / yr</span>
          <span>Total pot</span>
          <span>Net income / yr</span>
          <span className="mix-bar-col">Relative income</span>
        </div>
        {scenarios.map((s, i) => {
          const barW = maxIncome > 0 ? (s.totalNetIncome / maxIncome) * 100 : 0;
          return (
            <div key={i} className={`mix-table-row${i === bestIdx ? ' mix-best-row' : ''}`}>
              <span className="mix-split-label">
                {i === bestIdx && <span className="mix-star">★ </span>}
                {s.label}
              </span>
              <span>{fmtGBP(s.netCost)}</span>
              <span>{fmtGBP(s.totalPot)}</span>
              <span className="positive">{fmtGBP(s.totalNetIncome, 0)}/yr</span>
              <span className="mix-bar-cell">
                <div className="mix-bar-bg">
                  <div className="mix-bar-fill" style={{ width: `${barW}%`, opacity: i === bestIdx ? 1 : 0.5 }} />
                </div>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mix-footnote">
        Net income = ISA drawdown (always tax-free) + SIPP drawdown after estimated income tax at retirement.
        The SIPP 25% tax-free lump sum is shown separately in the card below and not included in the annual income column above.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RETIREMENT TIMELINE CHART
// Stacked area chart: income from each source vs retirement age
// ─────────────────────────────────────────────────────────────────────────────

export default MixCard;
