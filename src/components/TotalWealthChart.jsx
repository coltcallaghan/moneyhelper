import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { fmtGBP, fmtPct } from '../utils/formatters';
import { computeLabelPositions } from '../utils/chartHelpers';

function TotalWealthChart({ results, form }) {
  const currentAge   = parseInt(form.age)           || 30;
  const nominalRate  = parseFloat(form.returnRate)  || 0.07;
  const inflationRate = parseFloat(form.inflationRate) || 0.025;
  const returnRate   = (1 + nominalRate) / (1 + inflationRate) - 1;
  const existingIsa  = parseFloat(form.existingIsaPot)  || 0;
  const existingSipp = parseFloat(form.existingSippPot) || 0;
  const targetRetAge = parseInt(form.retirementAge) || 60;
  const fireNumber   = results.fireNumber || 0;

  // Use action plan's per-phase allocation (matches the timeline chart and action plan card)
  const phaseAllocs = results.phaseAllocations || [];

  const maxAge = Math.max(75, targetRetAge + 10);

  const wealthData = [];
  let fireAge = null;
  let isaPotAcc  = existingIsa;
  let sippPotAcc = existingSipp;

  // Helper: find the phase allocation for a given age
  const getAllocForAge = (ageAtYear) => {
    for (const pa of phaseAllocs) {
      if (ageAtYear >= pa.startAge && ageAtYear < pa.endAge) return pa;
    }
    return { ap: 0, sippNet: 0, sippGross: 0, isa: 0 };
  };

  for (let R = currentAge + 1; R <= maxAge; R++) {
    const alloc = getAllocForAge(R - 1);

    isaPotAcc  = isaPotAcc * (1 + returnRate) + alloc.isa;
    sippPotAcc = sippPotAcc * (1 + returnRate) + alloc.sippGross;

    const isaPot  = Math.round(isaPotAcc);
    const sippPot = Math.round(sippPotAcc);
    // Only count SIPP towards an early-FIRE pot once it's actually accessible (age 57+)
    const accessibleTotal = isaPot + (R >= 57 ? sippPot : 0);

    if (fireNumber > 0 && fireAge === null && accessibleTotal >= fireNumber) fireAge = R;

    wealthData.push({ age: R, 'ISA Pot': isaPot, 'SIPP Pot': sippPot });
  }

  // Derive the effective split for display
  const totalContrib = results.contribution || 1;
  const phase2 = phaseAllocs.length > 1 ? phaseAllocs[phaseAllocs.length - 1] : phaseAllocs[0];
  const chartSippPct = Math.round(((phase2?.sippNet || 0) / totalContrib) * 100);
  const chartIsaPct  = Math.round(((phase2?.isa || 0) / totalContrib) * 100);
  const peakTotal   = wealthData.length > 0
    ? wealthData[wealthData.length - 1]['ISA Pot'] + wealthData[wealthData.length - 1]['SIPP Pot']
    : 0;

  // Determine pots at the user's target retirement age to explain accessibility
  const potAtTargetRow = wealthData.find(d => d.age === targetRetAge) || null;
  const potAtTargetTotal = potAtTargetRow ? (potAtTargetRow['ISA Pot'] + potAtTargetRow['SIPP Pot']) : 0;
  const accessibleAtTarget = potAtTargetRow ? (potAtTargetRow['ISA Pot'] + (targetRetAge >= 57 ? potAtTargetRow['SIPP Pot'] : 0)) : 0;

  // Compute label positions for vertical markers on this chart to avoid overlap

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-icon">💰</span>
        <div>
          <p className="chart-title">Total Accumulated Wealth</p>
          <p className="chart-subtitle">
            {chartIsaPct}% ISA · {chartSippPct}% SIPP split{phaseAllocs.length > 1 ? ' (after MOD)' : ''}
            {fireAge
              ? ` — FIRE number reached at age ${fireAge} 🔥`
              : fireNumber > 0
                ? ` — FIRE number not reached by age ${maxAge}`
                : ''}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={wealthData} margin={{ top: 16, right: 30, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="wgradISA"  x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.20}/>
            </linearGradient>
            <linearGradient id="wgradSIPP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.20}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="age"
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={v => v >= 1000000 ? `£${(v / 1000000).toFixed(1)}m` : v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}
            itemStyle={{ color: '#cbd5e1', fontSize: 13 }}
            formatter={(value, name) => [fmtGBP(value, 0), name]}
            labelFormatter={v => {
              const row = wealthData.find(d => d.age === v);
              const tot = row ? row['ISA Pot'] + row['SIPP Pot'] : 0;
              return `Age ${v}  —  Total: ${fmtGBP(tot, 0)}`;
            }}
          />
          <Area type="monotone" dataKey="ISA Pot"  stackId="1" stroke="#3b82f6" fill="url(#wgradISA)"  strokeWidth={1.5} />
          <Area type="monotone" dataKey="SIPP Pot" stackId="1" stroke="#8b5cf6" fill="url(#wgradSIPP)" strokeWidth={1.5} />

          {(() => {
            // Markers considered on the wealth chart: target retirement age, SIPP unlock (57), SPA, and FIRE age.
            // If multiple markers share the same age, keep the most informative one by priority: FIRE > target > SIPP (57) > SPA
            const raw = [];
            if (fireNumber > 0 && typeof fireNumber === 'number') raw.push({ age: 'yref', y: fireNumber, key: 'fireline', isY: true, label: `FIRE: ${fmtGBP(fireNumber, 0)}`, color: '#f59e0b' });
            raw.push({ age: targetRetAge, key: 'target', label: `Retire ${targetRetAge}`, color: '#22d3ee' });
            raw.push({ age: 57, key: 'sipp', label: `SIPP ${57}`, color: '#a78bfa' });
            raw.push({ age: results.statePensionAge || 0, key: 'spa', label: `SPA ${results.statePensionAge || 0}`, color: '#f59e0b' });

            // Separate horizontal (y) markers from vertical (x) markers
            const yMarkers = raw.filter(r => r.isY);
            const vRaw = raw.filter(r => !r.isY && typeof r.age === 'number' && !isNaN(r.age));

            // Dedupe vertical markers by age with priority
            const priority = { fireline: 1, target: 2, sipp: 3, spa: 4 };
            const byAge = {};
            for (const m of vRaw) {
              if (!byAge[m.age]) byAge[m.age] = m;
              else {
                const cur = byAge[m.age];
                if ((priority[m.key] || 99) < (priority[cur.key] || 99)) byAge[m.age] = m;
              }
            }
            const deduped = Object.values(byAge).sort((a, b) => a.age - b.age);
            const posMap = computeLabelPositions(deduped.map(d => d.age), 2);

            return (
              <>
                {yMarkers.map(y => (
                  <ReferenceLine key={y.key} y={y.y} stroke={y.color} strokeDasharray="6 4" strokeWidth={2} label={{ value: y.label, position: 'insideTopLeft', fill: y.color, fontSize: 11 }} />
                ))}
                {deduped.map(d => (
                  <ReferenceLine key={`m-${d.key}`} x={d.age} stroke={d.color} strokeDasharray="4 3" strokeWidth={2} label={{ value: d.label, position: posMap[d.age] || 'insideTop', fill: d.color, fontSize: 11 }} />
                ))}
              </>
            );
          })()}
        </AreaChart>
      </ResponsiveContainer>

      {/* Coloured-text key */}
      <div className="chart-key">
        <span className="chart-key-item" style={{ color: '#3b82f6' }}>● ISA Pot <span className="chart-key-note">(tax-free, no lock-in)</span></span>
        <span className="chart-key-item" style={{ color: '#a78bfa' }}>● SIPP Pot <span className="chart-key-note">(accessible age 57+, gross value)</span></span>
        {fireNumber > 0 && <span className="chart-key-item" style={{ color: '#f59e0b' }}>— FIRE number <span className="chart-key-note">({fmtGBP(fireNumber, 0)} = 25× target income)</span></span>}
        <span className="chart-key-item" style={{ color: '#22d3ee' }}>| Target retirement <span className="chart-key-note">(age {targetRetAge})</span></span>
        {fireAge && fireAge !== targetRetAge && <span className="chart-key-item" style={{ color: '#f97316' }}>| FIRE age <span className="chart-key-note">(age {fireAge} — pot hits FIRE number)</span></span>}
      </div>

      {/* Explain when total pot exceeds FIRE but SIPP is locked at target age */}
      {(fireNumber > 0 && potAtTargetTotal >= fireNumber && accessibleAtTarget < fireNumber) && (
        <div className="chart-retire-callout chart-retire-warning" style={{ borderColor: '#f59e0b' }}>
          <span className="chart-retire-emoji">⚠️</span>
          <div>
            <strong>Your total pot meets the FIRE number, but most is in a SIPP.</strong>
            <div style={{ marginTop: '0.25rem' }}>
              At age {targetRetAge} your accessible pot is {fmtGBP(accessibleAtTarget, 0)} — {fmtGBP(Math.max(0, fireNumber - accessibleAtTarget), 0)} short of the {fmtGBP(fireNumber, 0)} FIRE target.
              SIPP funds are locked until age 57, so you can only use ISA (and any DB/EDP) to bridge the gap.
            </div>
            <div style={{ marginTop: '0.25rem' }}>Options: increase ISA savings, delay retirement, or plan a SIPP/ISA bridge.</div>
          </div>
        </div>
      )}

      {fireAge && (
        <div className="chart-retire-callout">
          <span className="chart-retire-emoji">🔥</span>
          <div>
            <strong>Pot reaches FIRE number ({fmtGBP(fireNumber, 0)}) at age {fireAge}</strong>
            {fireAge < targetRetAge
              ? ` — ${targetRetAge - fireAge} year${targetRetAge - fireAge !== 1 ? 's' : ''} before your target retirement age. You could retire early!`
              : ` — ${fireAge - targetRetAge} year${fireAge - targetRetAge !== 1 ? 's' : ''} after your target retirement age.`}
              {fireAge < 57 && (
                <div className="chart-retire-warning" style={{ marginTop: '0.25rem' }}>⚠️ Before age 57 your SIPP is inaccessible — withdrawals before then come from your ISA pot only.</div>
              )}
          </div>
        </div>
      )}
      {!fireAge && fireNumber > 0 && (
        <div className="chart-retire-callout chart-retire-miss">
          <span className="chart-retire-emoji">📊</span>
          <div>
            Pot reaches {fmtGBP(peakTotal, 0)} by age {maxAge} — {fmtGBP(fireNumber - peakTotal, 0)} short of FIRE number.
            Consider increasing contributions or accepting a lower safe withdrawal amount.
          </div>
        </div>
      )}
      <p className="chart-footnote">
        All values in today's money ({fmtPct(inflationRate, 1)}/yr inflation adjusted). Pots shown gross (before drawdown). SIPP at full market value — 75% taxable on withdrawal. FIRE = 25× target income (4% SWR). Real growth: {fmtPct(returnRate, 1)}/yr.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RETIREMENT PICTURE CARD
// Shows every income source combined — DB pension, Added Pension, ISA, SIPP
// ─────────────────────────────────────────────────────────────────────────────

export default TotalWealthChart;
