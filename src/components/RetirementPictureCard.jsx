import { fmtGBP } from '../utils/formatters';

function RetirementPictureCard({ results, isServing }) {
  const isaOpt  = results.options.find(o => o.id === 'isa');
  const sippOpt = results.options.find(o => o.id === 'sipp');
  const apOpt   = results.options.find(o => o.id === 'addedpension');

  const dbAnnual        = results.existingDbPension || 0;
  const statePension    = results.statePension      || 0;
  const statePensionAge = results.statePensionAge   || 67;
  const retirementAge   = results.retirementAge     || 60;
  const hasDeferredIncome = retirementAge < statePensionAge;

  // Added Pension shown here is what the ACTIVE mode's plan actually bought, not
  // the hypothetical full-contribution figure. If the plan allocated £0 to AP
  // (e.g. early retirement before SPA), no AP income/lump is shown — matching the
  // Action Plan. Falls back to the legacy option figures for older saved calcs.
  const apAnnualFull = (isServing && typeof results.activeApPhasePension === 'number')
    ? results.activeApPhasePension
    : ((isServing && apOpt) ? apOpt.totalPensionAcquired || 0 : 0);
  const edpLump = (isServing && typeof results.activeApPhaseEdpLump === 'number')
    ? results.activeApPhaseEdpLump
    : ((isServing && apOpt) ? apOpt.edpLumpSum || 0 : 0);
  const edpAnnual = (isServing && typeof results.activeApPhaseEdpIncome === 'number')
    ? results.activeApPhaseEdpIncome
    : ((isServing && apOpt) ? apOpt.edpIncome || 0 : 0);
  // Derive BOTH ISA and SIPP from the active mode's phase allocations so this
  // card matches the Action Plan and Net Worth card. Previously ISA used the
  // (maxReturn-default) _phasePot while SIPP used sippOpt.annualIncomeAtRetirement
  // — which assumes the WHOLE contribution goes into a SIPP — so the card could
  // show an ISA-light / SIPP-heavy picture that contradicted an ISA-first plan.
  // Fall back to the legacy option figures for calculations saved before this change.
  const isaPhasePot = (typeof results.activeIsaPhasePot === 'number')
    ? results.activeIsaPhasePot
    : (isaOpt && Object.prototype.hasOwnProperty.call(isaOpt, '_phasePot') ? isaOpt._phasePot : (isaOpt?.potAtRetirement ?? 0));
  const sippPhasePot = (typeof results.activeSippPhasePot === 'number')
    ? results.activeSippPhasePot
    : (sippOpt?.potAtRetirement ?? 0);

  const isaAnnual = isaPhasePot > 0 ? Math.round(isaPhasePot * 0.04) : 0;
  // SIPP drawdown: 4% of the 75% that stays invested after the 25% tax-free lump.
  const sippAnnual = sippPhasePot > 0 ? Math.round(sippPhasePot * 0.75 * 0.04) : 0;
  const sippLump   = sippPhasePot > 0 ? Math.round(sippPhasePot * 0.25) : 0;

  const sippAvailableAge = Math.max(57, retirementAge);
  const sippAvailableNow = retirementAge >= 57;

  // Income available immediately at target retirement age (exclude SIPP if locked until 57)
  const earlyTotal = isaAnnual + (sippAvailableNow ? sippAnnual : 0) + (apOpt?.edpEligible ? edpAnnual : 0);
  // Full income once all sources (including SIPP and deferred pensions) are available
  const fullTotal  = isaAnnual + sippAnnual + (apOpt?.edpEligible ? edpAnnual : 0) + dbAnnual + apAnnualFull + statePension;

  const fireTarget      = results.fireNumber > 0 ? results.fireNumber / 25 : 0;
  // Use the income available at the user's target retirement age for FIRE progress
  // (earlyTotal = income available immediately at retirementAge)
  const fireProgressAmt = earlyTotal;
  const fireProgress    = fireTarget > 0 ? Math.min(100, (fireProgressAmt / fireTarget) * 100) : 0;

  // Build sources for early retirement phase
  const earlySources = [
    (apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income',           annual: edpAnnual,  color: '#6ee7b7', note: 'Enhanced Departure Payment',          icon: '\uD83C\uDFC6' },
    isaAnnual > 0                         && { label: 'ISA Drawdown (4%/yr)',         annual: isaAnnual,  color: '#3b82f6', note: '100% tax-free income',               icon: '\uD83D\uDCB0' },
    sippAnnual > 0                        && { label: 'SIPP Drawdown (4% of 75%)',    annual: sippAnnual, color: '#a78bfa', note: 'Taxable above personal allowance',  icon: '\uD83C\uDFE6' },
  ].filter(Boolean);

  // Deferred sources that unlock at state pension age
  const deferredSources = [
    dbAnnual > 0     && { label: 'AFPS 15 DB Pension (from statement)', annual: dbAnnual,      color: '#10b981', icon: '\uD83C\uDF96\uFE0F' },
    (isServing && apAnnualFull > 0) && { label: 'AFPS 15 Added Pension (calculated)',  annual: apAnnualFull,  color: '#34d399', icon: '\u2795' },
    statePension > 0 && { label: 'State Pension',                       annual: statePension,  color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F' },
  ].filter(Boolean);

  

  const oneOffs = [
    sippLump > 0 && {
      label: 'SIPP 25% Tax-Free Lump Sum',
      value: sippLump,
      color: '#a78bfa',
      note: sippAvailableNow ? 'Take at retirement — zero tax' : `Available at age ${sippAvailableAge}`,
      icon: '\uD83C\uDFE6'
    },
    (apOpt?.edpEligible && edpLump > 0) && { label: 'EDP Tax-Free Lump Sum', value: edpLump, color: '#10b981', note: '2.25\u00d7 added pension — zero tax', icon: '\uD83C\uDFC6' },
  ].filter(Boolean);

  // Build staged income sections depending on retirement, SIPP unlock (57) and SPA
  const stages = [];
  const sippUnlock = 57;
  const spa = statePensionAge;

  if (retirementAge < sippUnlock && sippUnlock < spa) {
    // Three stages: retirement->56, 57->(spa-1), spa->
    const stage1End = Math.min(sippUnlock - 1, spa - 1);
    const stage2Start = sippUnlock;
    const stage2End = Math.max(sippUnlock, spa - 1);

    const stage1Income = {
      label: `Age ${retirementAge}–${stage1End}`,
      note: 'Only ISA, SIPP (locked) and EDP (if eligible) — early retirement phase',
      total: isaAnnual + (apOpt?.edpEligible ? edpAnnual : 0),
      sources: [
        isaAnnual > 0 && { label: 'ISA Drawdown (4%/yr)', annual: isaAnnual, color: '#3b82f6', icon: '\uD83D\uDCB0' },
        (apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income', annual: edpAnnual, color: '#6ee7b7', icon: '\uD83C\uDFC6' },
      ].filter(Boolean),
    };

    const stage2Income = {
      label: `Age ${stage2Start}–${Math.max(stage2End, stage2Start)}`,
      note: 'SIPP unlocked — ISA + SIPP + EDP available',
      total: isaAnnual + sippAnnual + (apOpt?.edpEligible ? edpAnnual : 0),
      sources: [
        isaAnnual > 0 && { label: 'ISA Drawdown (4%/yr)', annual: isaAnnual, color: '#3b82f6', icon: '\uD83D\uDCB0' },
        sippAnnual > 0 && { label: 'SIPP Drawdown (4% of 75%)', annual: sippAnnual, color: '#a78bfa', icon: '\uD83C\uDFE6' },
        (apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income', annual: edpAnnual, color: '#6ee7b7', icon: '\uD83C\uDFC6' },
      ].filter(Boolean),
    };

    const stage3Income = {
      label: `Age ${spa}+`,
      note: 'All income sources (DB, Added Pension, State Pension) available',
      total: fullTotal,
      sources: [
        dbAnnual > 0 && { label: 'AFPS 15 DB Pension', annual: dbAnnual, color: '#10b981', icon: '\uD83C\uDF96\uFE0F' },
        (isServing && apAnnualFull > 0) && { label: 'AFPS 15 Added Pension', annual: apAnnualFull, color: '#34d399', icon: '\u2795' },
        isaAnnual > 0 && { label: 'ISA Drawdown (4%/yr)', annual: isaAnnual, color: '#3b82f6', icon: '\uD83D\uDCB0' },
        sippAnnual > 0 && { label: 'SIPP Drawdown (4% of 75%)', annual: sippAnnual, color: '#a78bfa', icon: '\uD83C\uDFE6' },
        statePension > 0 && { label: 'State Pension', annual: statePension, color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F' },
      ].filter(Boolean),
    };

    stages.push(stage1Income, stage2Income, stage3Income);
  } else if (retirementAge < spa && retirementAge < sippUnlock) {
    // retirement < SPA but SPA <= SIPP unlock => two stages: retirement->(spa-1), spa+
    const stage1Income = {
      label: `Age ${retirementAge}–${spa - 1}`,
      note: 'Pre-SPA income (SIPP may be locked)',
      total: isaAnnual + (apOpt?.edpEligible ? edpAnnual : 0) + (retirementAge >= 57 ? sippAnnual : 0),
      sources: [
        isaAnnual > 0 && { label: 'ISA Drawdown (4%/yr)', annual: isaAnnual, color: '#3b82f6', icon: '\uD83D\uDCB0' },
        (retirementAge >= 57 && sippAnnual > 0) && { label: 'SIPP Drawdown (4% of 75%)', annual: sippAnnual, color: '#a78bfa', icon: '\uD83C\uDFE6' },
        (apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income', annual: edpAnnual, color: '#6ee7b7', icon: '\uD83C\uDFC6' },
      ].filter(Boolean),
    };
    const stage2Income = {
      label: `Age ${spa}+`, note: 'All sources', total: fullTotal, sources: [].filter(Boolean),
    };
    stages.push(stage1Income, stage2Income);
  } else if (retirementAge >= spa) {
    // retirement at or after SPA — single stage
    stages.push({ label: `Age ${retirementAge}+`, note: 'All sources available', total: fullTotal, sources: [
      dbAnnual > 0 && { label: 'AFPS 15 DB Pension', annual: dbAnnual, color: '#10b981', icon: '\uD83C\uDF96\uFE0F' },
      (isServing && apAnnualFull > 0) && { label: 'AFPS 15 Added Pension', annual: apAnnualFull, color: '#34d399', icon: '\u2795' },
      isaAnnual > 0 && { label: 'ISA Drawdown (4%/yr)', annual: isaAnnual, color: '#3b82f6', icon: '\uD83D\uDCB0' },
      sippAnnual > 0 && { label: 'SIPP Drawdown (4% of 75%)', annual: sippAnnual, color: '#a78bfa', icon: '\uD83C\uDFE6' },
      statePension > 0 && { label: 'State Pension', annual: statePension, color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F' },
    ].filter(Boolean) });
  } else {
    // fallback: retirement < SPA but SIPP unlock <= retirementAge
    stages.push({ label: `Age ${retirementAge}–${spa - 1}`, note: 'Pre-SPA', total: earlyTotal, sources: earlySources });
    stages.push({ label: `Age ${spa}+`, note: 'All sources', total: fullTotal, sources: deferredSources.concat(earlySources) });
  }

  const renderSourceRow = (s, i) => (
    <div key={i} className="rp-source-row">
      <span className="rp-source-icon">{s.icon}</span>
      <div className="rp-source-info">
        <span className="rp-source-label">{s.label}</span>
        {s.note && <span className="rp-source-note">{s.note}</span>}
      </div>
      <span className="rp-source-value" style={{ color: s.color }}>{fmtGBP(s.annual, 0)}/yr</span>
    </div>
  );

  return (
    <div className="retirement-picture-card">
      <div className="rp-header">
        <span className="rp-header-icon">🌅</span>
        <div>
          <p className="rp-title">Total Retirement Picture</p>
          <p className="rp-subtitle">All projected income in today's money — {results.years} years from now</p>
        </div>
      </div>

      {/* Render 1-3 staged income sections computed above */}
      <div className="rp-sources">
        {stages.length === 0 && (
          <p className="rp-empty">Fill in the inputs above to see your retirement picture.</p>
        )}
        {stages.map((st, idx) => (
          <div key={`stage-${idx}`} className={idx === stages.length - 1 ? 'rp-stage rp-stage-final' : 'rp-stage'}>
            <p className="rp-phase-label">{idx === 0 ? '📅 Phase 1:' : idx === 1 ? '📅 Phase 2:' : '📅 Phase 3:'} {st.label}</p>
            {st.note && <p className="rp-phase-note">{st.note}</p>}
            {(!st.sources || st.sources.length === 0) && (
              <p className="rp-empty">No income sources in this phase.</p>
            )}
            {st.sources && st.sources.map(renderSourceRow)}
            {st.total > 0 && (
              <div className="rp-total-row">
                <span className="rp-total-label">Σ {st.label.includes('+') ? 'Total from' : 'Income'} {st.label}</span>
                <span className="rp-total-value">{fmtGBP(st.total, 0)}/yr</span>
              </div>
            )}
            {idx === stages.length - 1 && st.note && (
              <div className="rp-warning" style={{ marginTop: '0.5rem', color: '#92400e' }}>{st.note}</div>
            )}
          </div>
        ))}
      </div>

      {oneOffs.length > 0 && (
        <div className="rp-oneoffs">
          <p className="rp-oneoffs-title">One-off Lump Sums at Retirement</p>
          {oneOffs.map((o, i) => (
            <div key={i} className="rp-source-row">
              <span className="rp-source-icon">{o.icon}</span>
              <div className="rp-source-info">
                <span className="rp-source-label">{o.label}</span>
                <span className="rp-source-note">{o.note}</span>
              </div>
              <span className="rp-source-value" style={{ color: o.color }}>{fmtGBP(o.value)}</span>
            </div>
          ))}
        </div>
      )}

      {fireTarget > 0 && fireProgressAmt > 0 && (
        <div className="rp-fire-progress">
          <div className="rp-fire-header">
            <span>FIRE target: {fmtGBP(fireTarget, 0)}/yr needed</span>
            <span className={fireProgress >= 100 ? 'rp-fire-pct achieved' : 'rp-fire-pct'}>{fireProgress.toFixed(0)}% covered</span>
          </div>
          <div className="rp-fire-track">
            <div className="rp-fire-fill" style={{ width: `${Math.min(100, fireProgress)}%` }} />
          </div>
          <p className="rp-fire-note">
            {fireProgress >= 100
              ? `\uD83C\uDF89 Your full income from age ${retirementAge} (${fmtGBP(fireProgressAmt, 0)}/yr) meets or exceeds your FIRE target!`
              : `${fmtGBP(Math.max(0, fireTarget - fireProgressAmt), 0)}/yr short of FIRE target at age ${retirementAge} \u2014 consider increasing contributions or adjusting retirement age.`}
            {hasDeferredIncome && earlyTotal < fireTarget && earlyTotal > 0 && `\n(Note: only ${fmtGBP(earlyTotal, 0)}/yr available at age ${retirementAge} before pensions unlock.)`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default RetirementPictureCard;
