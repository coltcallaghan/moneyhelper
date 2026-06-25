import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { fmtGBP, fmtPct } from '../utils/formatters';
import { calcIncomeTax } from '../utils/taxCalculations';

function RetirementTimelineChart({ results, form }) {
  const currentAge      = parseInt(form.age)            || 30;
  const nominalRate     = parseFloat(form.returnRate)   || 0.07;
  const inflationRate   = parseFloat(form.inflationRate) || 0.025;
  const returnRate      = (1 + nominalRate) / (1 + inflationRate) - 1;
  const existingIsa     = parseFloat(form.existingIsaPot)  || 0;
  const existingSipp    = parseFloat(form.existingSippPot) || 0;
  const targetIncome    = results.fireNumber > 0 ? results.fireNumber / 25 : 0;
  const dbPension       = results.existingDbPension || 0;
  const statePensionAge = results.statePensionAge || 67;
  const statePension    = results.statePension || 0;

  // Use the action plan's per-phase allocation (matches what the Action Plan card shows)
  const phaseAllocs = results.phaseAllocations || [];

  const apOpt      = results.options.find(o => o.id === 'addedpension');
  const leaveYears = apOpt?.leaveYears || 0;
  const apPerYear  = apOpt?.pensionPerYear || 0; // uncapped £/yr of pension bought
  const AP_CHART_MAX = 8571.21;

  const maxAge      = Math.max(75, parseInt(form.retirementAge) + 10);
  const targetRetAge = parseInt(form.retirementAge) || 60;
  const retPA  = { pa: 12570, mode: 'normal' };

  const data = [];
  let retirePossibleAge = null;
  let hasApIncome  = false;

  // Helper: find the phase allocation for a given age
  const getAllocForAge = (ageAtYear) => {
    for (const pa of phaseAllocs) {
      if (ageAtYear >= pa.startAge && ageAtYear < pa.endAge) return pa;
    }
    // After all phases (past retirement), no new contributions
    return { ap: 0, sippNet: 0, sippGross: 0, isa: 0 };
  };

  // Accumulate pots year by year using actual per-phase contributions
  let isaPotAcc  = existingIsa;
  let sippPotAcc = existingSipp;

  // Compute label positions for vertical markers to avoid overlap.
  // Group nearby markers (within `threshold` years) and alternate label positions
  // insideTop / insideBottom within each group.
  const computeLabelPositions = (markers, threshold = 2) => {
    const nums = Array.from(new Set(markers.filter(Boolean).map(Number))).sort((a, b) => a - b);
    const groups = [];
    let cur = [];
    for (const m of nums) {
      if (cur.length === 0) { cur.push(m); continue; }
      const last = cur[cur.length - 1];
      if (m - last <= threshold) cur.push(m);
      else { groups.push(cur); cur = [m]; }
    }
    if (cur.length) groups.push(cur);
    const map = {};
    for (const g of groups) {
      if (g.length === 1) { map[g[0]] = 'insideTop'; continue; }
      for (let i = 0; i < g.length; i++) {
        map[g[i]] = (i % 2 === 0) ? 'insideTop' : 'insideBottom';
      }
    }
    return map;
  };
  // (label positions will be computed after retirePossibleAge is known)

  for (let R = currentAge + 1; R <= maxAge; R++) {
    const alloc = getAllocForAge(R - 1); // contributions made during the year ending at age R

    // ISA: compound existing + add this year's contribution
    isaPotAcc = isaPotAcc * (1 + returnRate) + alloc.isa;
    const isaIncome = R >= targetRetAge ? Math.round(isaPotAcc * 0.04) : 0;

    // SIPP: compound existing + add this year's gross contribution (incl govt top-up)
    sippPotAcc = sippPotAcc * (1 + returnRate) + alloc.sippGross;
    const sippUnlockAge = Math.max(57, targetRetAge);
    const sippDraw      = R >= sippUnlockAge ? sippPotAcc * 0.75 * 0.04 : 0;
    const sippTax       = sippDraw > 0 ? calcIncomeTax(sippDraw, retPA) : 0;
    const sippNetInc    = Math.round(Math.max(0, sippDraw - sippTax));

    // AFPS 15 Added Pension grows until leaveAge, then stays fixed
    const yrs           = R - currentAge;
    const apYrs         = Math.min(yrs, leaveYears);
    const apAccrued     = Math.round(Math.min(apPerYear * apYrs, AP_CHART_MAX));
    const apIncome      = R >= statePensionAge ? apAccrued : 0;
    if (apIncome > 0) hasApIncome = true;

    // DB pension only accessible from state pension age
    const dbIncome = R >= statePensionAge ? Math.round(dbPension) : 0;

    // State pension — only from state pension age
    const spIncome = (statePension > 0 && R >= statePensionAge) ? Math.round(statePension) : 0;

    const total = isaIncome + sippNetInc + apIncome + dbIncome + spIncome;
    if (retirePossibleAge === null && targetIncome > 0 && total >= targetIncome) {
      retirePossibleAge = R;
    }

    data.push({
      age:              R,
      'DB Pension':     dbIncome,
      'Added Pension':  apIncome,
      'ISA Income':     isaIncome,
      'SIPP (net)':     sippNetInc,
      ...(statePension > 0 ? { 'State Pension': spIncome } : {}),
    });
  }

  // Derive the effective ISA/SIPP split from the action plan for display
  const totalContrib = results.contribution || 1;
  const phase2 = phaseAllocs.length > 1 ? phaseAllocs[phaseAllocs.length - 1] : phaseAllocs[0];
  const chartSippPct = Math.round(((phase2?.sippNet || 0) / totalContrib) * 100);
  const chartIsaPct  = Math.round(((phase2?.isa || 0) / totalContrib) * 100);

    // Now compute label positions including retirePossibleAge to avoid overlapping bottoms

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-icon">📈</span>
        <div>
          <p className="chart-title">Retirement Income Timeline</p>
          <p className="chart-subtitle">
            Allocation: {chartIsaPct}% ISA · {chartSippPct}% SIPP{phaseAllocs.length > 1 ? ` (after MOD)` : ''} — drawdown starts at age {targetRetAge}
            {retirePossibleAge
              ? ` — target reached at age ${retirePossibleAge} 🎯`
              : targetIncome > 0
                ? ` — target not reached by age ${maxAge}`
                : ''}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 16, right: 30, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="gradDB"   x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradAP"   x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradISA"  x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradSIPP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradSP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.25}/>
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

          {/* (labels for vertical markers are rendered once below) */}
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={v => v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}
            itemStyle={{ color: '#cbd5e1', fontSize: 13 }}
            formatter={(value, name) => [fmtGBP(value, 0) + '/yr', name]}
            labelFormatter={v => {
              const row = data.find(d => d.age === v);
              if (!row) return `Age ${v}`;
              const total = (row['DB Pension'] || 0) + (row['Added Pension'] || 0)
                          + (row['ISA Income'] || 0) + (row['SIPP (net)'] || 0)
                          + (row['State Pension'] || 0);
              return `Age ${v}  —  Total: ${fmtGBP(total, 0)}/yr`;
            }}
          />

          {/* Reference lines: target retirement age, SIPP unlock age (57), and State Pension Age */}
          {/* Build marker list and dedupe identical ages by priority: retirePossibleAge > targetRetAge > SIPP (57) > SPA */}
          {(() => {
            const raw = [];
            raw.push({ age: targetRetAge, key: 'target', label: `Target ${targetRetAge}`, color: '#60a5fa' });
            raw.push({ age: 57, key: 'sipp', label: `SIPP 57`, color: '#a78bfa' });
            raw.push({ age: statePensionAge, key: 'spa', label: `SPA ${statePensionAge}`, color: '#f59e0b' });
            if (retirePossibleAge) {
              // If retire age is 57, label it as "SIPP 57" (same as SIPP unlock), otherwise "Retire X"
              const retireLabel = retirePossibleAge === 57 ? 'SIPP 57' : `Retire ${retirePossibleAge}`;
              raw.push({ age: retirePossibleAge, key: 'retire', label: retireLabel, color: '#22d3ee' });
            }

            const priority = { retire: 1, target: 2, sipp: 3, spa: 4 };
            const byAge = {};
            for (const m of raw) {
              if (!byAge[m.age]) byAge[m.age] = m;
              else {
                const cur = byAge[m.age];
                if ((priority[m.key] || 99) < (priority[cur.key] || 99)) byAge[m.age] = m;
              }
            }
            const deduped = Object.values(byAge).sort((a, b) => a.age - b.age);
            // compute label positions for deduped markers
            const posMap = computeLabelPositions(deduped.map(d => d.age), 2);
            return deduped.map(d => (
              <ReferenceLine key={`m-${d.key}`} x={d.age} stroke={d.color} strokeDasharray="3 3" label={{ value: d.label, position: posMap[d.age] || 'insideTop', fill: d.color, fontSize: 12 }} />
            ));
          })()}

          {dbPension > 0 && (
            <Area type="monotone" dataKey="DB Pension"    stackId="1" stroke="#10b981" fill="url(#gradDB)"   strokeWidth={1.5} />
          )}
          {hasApIncome && (
            <Area type="monotone" dataKey="Added Pension" stackId="1" stroke="#34d399" fill="url(#gradAP)"   strokeWidth={1.5} />
          )}
          <Area   type="monotone" dataKey="ISA Income"    stackId="1" stroke="#3b82f6" fill="url(#gradISA)"  strokeWidth={1.5} />
          <Area   type="monotone" dataKey="SIPP (net)"    stackId="1" stroke="#8b5cf6" fill="url(#gradSIPP)" strokeWidth={1.5} />
          {statePension > 0 && (
            <Area type="monotone" dataKey="State Pension" stackId="1" stroke="#f59e0b" fill="url(#gradSP)"   strokeWidth={1.5} />
          )}

          {targetIncome > 0 && (
            <ReferenceLine
              y={targetIncome}
              stroke="#e2e8f0"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{ value: `Target: ${fmtGBP(targetIncome, 0)}/yr`, position: 'insideTopLeft', fill: '#e2e8f0', fontSize: 11 }}
            />
          )}
          {/* retirePossibleAge is handled by the deduped markers above */}
        </AreaChart>
      </ResponsiveContainer>

      {/* Coloured-text key */}
      <div className="chart-key">
        {dbPension > 0 && <span className="chart-key-item" style={{ color: '#10b981' }}>● DB Pension <span className="chart-key-note">(from age {statePensionAge}, CPI-linked)</span></span>}
        {hasApIncome  && <span className="chart-key-item" style={{ color: '#34d399' }}>● Added Pension <span className="chart-key-note">(from age {statePensionAge}, CPI-linked)</span></span>}
        <span className="chart-key-item" style={{ color: '#3b82f6' }}>● ISA Income <span className="chart-key-note">(tax-free, always accessible)</span></span>
        <span className="chart-key-item" style={{ color: '#a78bfa' }}>● SIPP (net of tax) <span className="chart-key-note">(accessible age 57+)</span></span>
        {statePension > 0 && <span className="chart-key-item" style={{ color: '#f59e0b' }}>● State Pension <span className="chart-key-note">(from age {statePensionAge}, {fmtGBP(statePension, 0)}/yr)</span></span>}
        {targetIncome > 0 && <span className="chart-key-item" style={{ color: '#e2e8f0' }}>— Target income <span className="chart-key-note">({fmtGBP(targetIncome, 0)}/yr)</span></span>}
        {retirePossibleAge && <span className="chart-key-item" style={{ color: '#22d3ee' }}>| Earliest retirement <span className="chart-key-note">(age {retirePossibleAge})</span></span>}
      </div>
      {retirePossibleAge && (
        <div className="chart-retire-callout">
          <span className="chart-retire-emoji">🎯</span>
          <div>
            <strong>Earliest retirement age: {retirePossibleAge}</strong> — {retirePossibleAge - currentAge} year{retirePossibleAge - currentAge !== 1 ? 's' : ''} from now,{' '}
            using a {chartIsaPct}% ISA / {chartSippPct}% SIPP split.
            {retirePossibleAge < 57 && (
              <span className="chart-retire-warning"> ⚠️ Before age 57 your SIPP is inaccessible — income before then comes from ISA{dbPension > 0 ? ', DB pension' : ''}{hasApIncome ? ' and Added Pension' : ''} only.</span>
            )}
          </div>
        </div>
      )}
      {!retirePossibleAge && targetIncome > 0 && (
        <div className="chart-retire-callout chart-retire-miss">
          <span className="chart-retire-emoji">📊</span>
          <div>Target of {fmtGBP(targetIncome, 0)}/yr is not reached by age {maxAge} on current contributions. Try increasing your annual investment or adjusting your target income.</div>
        </div>
      )}
      <p className="chart-footnote">
        All figures in today's money (adjusted for {fmtPct(inflationRate, 1)}/yr inflation). Income at 4% SWR. SIPP net of tax (PA £12,570). SIPP locked until 57. DB + State Pension from age {statePensionAge}. Real growth: {fmtPct(returnRate, 1)}/yr ({fmtPct(nominalRate, 1)} nominal − {fmtPct(inflationRate, 1)} inflation).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTAL WEALTH CHART
// Shows accumulated pot values (ISA + SIPP) over time vs FIRE number
// ─────────────────────────────────────────────────────────────────────────────

export default RetirementTimelineChart;
