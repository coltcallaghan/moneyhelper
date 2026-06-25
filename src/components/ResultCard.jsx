import { fmtGBP } from '../utils/formatters';

function ResultCard({ option, maxEfficiency, years }) {
  const rankEmoji = ['🥇', '🥈', '🥉'][option.rank - 1];
  const barWidth  = Math.min(100, (option.efficiency / maxEfficiency) * 100);
  return (
    <div className="result-card" style={{ '--card-color': option.color }}>
      <div className="result-card-header">
        <span className="result-icon">{option.icon}</span>
        <span className="result-rank">{rankEmoji}</span>
      </div>
      <h3 className="result-card-name">{option.name}</h3>
      {option.limitExceeded && option.limitNote && (
        <div className="limit-warning-banner">⚠️ {option.limitNote}</div>
      )}
      <div className="result-stats">
        <div className="result-stat">
          <span className="stat-label">Net cost to you / yr</span>
          <span className="stat-value">{fmtGBP(option.costToYou)}</span>
        </div>
        {(option.taxSaving + option.niSaving) > 0 && (
          <div className="result-stat">
            <span className="stat-label">Tax + NI saved</span>
            <span className="stat-value positive">+{fmtGBP(option.taxSaving + option.niSaving)}</span>
          </div>
        )}
        <div className="result-stat">
          <span className="stat-label">Projected pot at retirement</span>
          <span className="stat-value positive">{fmtGBP(option.potAtRetirement)}</span>
        </div>
      </div>
      {option.incomeBreakdown && (
        <div className="income-breakdown">
          <p className="income-breakdown-title">💷 At Retirement ({years} yrs time)</p>
          {option.incomeBreakdown.map((item, i) => (
            <div key={i} className="income-breakdown-row">
              <span className="ib-label">{item.label}</span>
              <div className="ib-right">
                <span className="ib-value">{item.value}</span>
                {item.note && <span className="ib-note">{item.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="efficiency-section">
        <div className="efficiency-label">
          <span>Efficiency score</span>
          <span className="efficiency-score">{option.efficiency.toFixed(2)}×</span>
        </div>
        <div className="efficiency-bar">
          <div className="efficiency-bar-fill" style={{ width: `${barWidth}%`, background: option.color }} />
        </div>
      </div>
      <ul className="highlights-list">
        {option.highlights.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
      <div className="result-footer">
        <div className="result-pros">✅ {option.pros}</div>
        <div className="result-cons">⚠️ {option.cons}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────


export default ResultCard;
