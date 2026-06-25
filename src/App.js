
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { inferStatePensionAge } from './utils/taxCalculations';
import { buildResults } from './utils/buildResults';
import { fmtGBP, fmtPct } from './utils/formatters';
import DisclaimerBanner from './DisclaimerBanner';
import IntroStep from './steps/IntroStep';
import ServiceStatus from './steps/ServiceStatus';
import PersonalDetails from './steps/PersonalDetails';
import CurrentPots from './steps/CurrentPots';
import ContributionProjection from './steps/ContributionProjection';


import StepProgress from './components/StepProgress';
import ActionPlanCard from './components/ActionPlanCard';
import MixCard from './components/MixCard';
import RetirementTimelineChart from './components/RetirementTimelineChart';
import TotalWealthChart from './components/TotalWealthChart';
import RetirementPictureCard from './components/RetirementPictureCard';
import ResultCard from './components/ResultCard';
import SavedCalculationsPanel from './components/SavedCalculationsPanel';

// Utility: Generate a short summary for a calculation (for display in saved list)
function getCalcSummary(form, results) {
  if (!form || !results) return 'Incomplete calculation';
  return `${form.age || '?'}y, £${form.salary || '?'} salary, £${form.contribution || '?'} invest, retire @${form.retirementAge || '?'} — Net Worth: ${results.netWorth ? fmtGBP(results.netWorth.totalNetWorth, 0) : '?'}`;
}

// Calculation engine (buildResults), formatters, chart helpers and all result
// components now live in ./utils/* and ./components/* (imported above). App.js
// keeps only top-level orchestration, form state and page layout.

function App() {
  // Set browser tab title on mount
  useEffect(() => {
    document.title = 'Soldiers Fortune';
  }, []);

  useEffect(() => {
    const prevent = (e) => {
      if (document.activeElement?.type === 'number') e.preventDefault();
    };
    document.addEventListener('wheel', prevent, { passive: false });
    return () => document.removeEventListener('wheel', prevent);
  }, []);
  const [form, setForm] = useState({
    isServing: true,
    salary: '', taxCode: '', age: '', yearsService: '',
    leaveAge: '', apCostPer100: '', apPaymentType: 'single',
    existingDbPension: '', existingIsaPot: '', existingSippPot: '',
    statePension: '11502',
    salSacrifice: '', flatRateExpenses: '', manualTaxablePay: '',
    propertyValue: '', mortgageBalance: '', mortgageRate: '', mortgageTermYears: '', monthlyMortgage: '',
    cashReserve: '', monthlyExpenses: '',
    contribution: '', contributionFreq: 'annual', retirementAge: '', returnRate: '0.07', inflationRate: '0.025', targetIncome: '',
  });
  // const [showPayslipDetails, setShowPayslipDetails] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [step, setStep] = useState(0);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [optMode, setOptMode] = useState('targetRetirement'); // 'maxReturn' | 'earliestFire' | 'targetRetirement'

  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  // Clear previous results when serving toggle changes (forces recalculation)
  useEffect(() => {
    setResults(null);
  }, [form.isServing]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'isServing' && !checked ? { leaveAge: '' } : {})
      };
      // If the user changed their age while serving and leaveAge is empty or
      // previously <= prior age, auto-set leaveAge to age+1 to keep sensible defaults.
      if (name === 'age' && prev.isServing) {
        const newAge = parseInt(value) || 0;
        const prevLeave = parseInt(prev.leaveAge);
        const prevAge = parseInt(prev.age) || 0;
        if (!prev.leaveAge || (!isNaN(prevLeave) && prevLeave <= prevAge)) {
          next.leaveAge = String(Math.max(newAge + 1, prevAge + 1));
        }
      }
      return next;
    });
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      try { const el = document.getElementsByName(name)[0]; if (el) { el.classList.remove('input-invalid'); } } catch {}
    }
  };

  const taxSummaryRef = useRef(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    const elForm = formRef.current || e.target;
    const requiredEls = elForm.querySelectorAll('[required]');
    const nextErrors = {};
    requiredEls.forEach(el => {
      const name = el.name;
      const val = el.value;
      if (!val || (el.type === 'number' && parseFloat(val) <= 0)) {
        nextErrors[name] = true;
        try { el.classList.add('input-invalid'); } catch {}
      } else {
        try { el.classList.remove('input-invalid'); } catch {}
      }
    });
    // Additional validation: if serving, leaveAge must be greater than current age
    try {
      if (form.isServing) {
        const curAge = parseInt(form.age) || 0;
        const la = parseInt(form.leaveAge);
        if (isNaN(la) || la <= curAge) {
          nextErrors.leaveAge = true;
          const el = elForm.querySelector('[name="leaveAge"]');
          if (el) el.classList.add('input-invalid');
        }
      }
    } catch (err) {}
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstName = Object.keys(nextErrors)[0];
      const firstEl = elForm.querySelector(`[name="${firstName}"]`);
      if (firstEl) { try { firstEl.focus(); firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }
      return;
    }

    const salary        = parseFloat(form.salary)        || 0;
    const age           = parseInt(form.age)              || 30;
    const yearsService  = parseInt(form.yearsService)     || 0;
    const retirementAge  = parseInt(form.retirementAge)    || 60;
    const leaveAge       = parseInt(form.leaveAge)         || retirementAge;
    const apCostPer100      = parseFloat(form.apCostPer100)      || 0;
    const existingDbPension = parseFloat(form.existingDbPension) || 0;
    const existingIsaPot    = parseFloat(form.existingIsaPot)    || 0;
    const existingSippPot   = parseFloat(form.existingSippPot)   || 0;
    const statePensionAge   = inferStatePensionAge(age);
    const statePension      = parseFloat(form.statePension)      || 0;
    const salSacrifice      = parseFloat(form.salSacrifice)      || 0;
    const flatRateExpenses  = parseFloat(form.flatRateExpenses)  || 0;
    const manualTaxablePay  = parseFloat(form.manualTaxablePay)  || 0;
    const propertyValue     = parseFloat(form.propertyValue)     || 0;
    const mortgageBalance   = parseFloat(form.mortgageBalance)   || 0;
    const mortgageRate      = (parseFloat(form.mortgageRate)      || 0) / 100;
    const mortgageTermYears = parseFloat(form.mortgageTermYears) || 0;
    const monthlyMortgage   = parseFloat(form.monthlyMortgage)   || 0;
    const propertyAppRate   = parseFloat(form.propertyAppRate)   || 0.02;
    const cashReserve       = parseFloat(form.cashReserve)       || 0;
    const monthlyExpenses   = parseFloat(form.monthlyExpenses)   || 0;
    const contributionRaw  = parseFloat(form.contribution)      || 0;
    const contribution      = form.contributionFreq === 'monthly' ? contributionRaw * 12 : contributionRaw;
    const returnRate        = parseFloat(form.returnRate)        || 0.07;
    const inflationRate     = parseFloat(form.inflationRate)     || 0.025;
    const targetIncome      = parseFloat(form.targetIncome)      || salary * 0.67;

    const params = {
      salary, taxCode: form.taxCode, age,
      yearsService: form.isServing ? yearsService : 0,
      leaveAge: form.isServing ? leaveAge : retirementAge,
      apCostPer100: form.isServing ? apCostPer100 : 0,
      apPaymentType: form.isServing ? form.apPaymentType : 'single',
      existingDbPension: existingDbPension,
      existingIsaPot, existingSippPot, statePensionAge, statePension, contribution, retirementAge, returnRate, inflationRate, targetIncome, salSacrifice, flatRateExpenses, manualTaxablePay, propertyValue, mortgageBalance, mortgageRate, mortgageTermYears, monthlyMortgage, propertyAppRate, cashReserve, monthlyExpenses,
      isServing: !!form.isServing,
      fmtGBP, fmtPct,
    };
    setResults(buildResults(params));
    setFormCollapsed(true);
    setTimeout(() => {
      if (taxSummaryRef.current) {
        taxSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


  // ── Local Save/Compare State ──
  const [savedCalcs, setSavedCalcs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_savedCalcs') || '[]');
    } catch {
      return [];
    }
  });
  const [viewingCalc, setViewingCalc] = useState(null); // saved calc being viewed (null = live)
  // Editing state for rename feature
  const [editingIdx, setEditingIdx] = useState(null);
  const [tempNames, setTempNames] = useState(() => savedCalcs.map(c => c.name || c.summary));

  // ── Derived display values (live or viewed saved calc) ──
  const displayResults = viewingCalc ? viewingCalc.results : results;
  const displayForm    = viewingCalc ? viewingCalc.form    : form;

  // Save calculations to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('sf_savedCalcs', JSON.stringify(savedCalcs));
  }, [savedCalcs]);

  // Automatically save calculation when results change
  useEffect(() => {
    if (!results) return;
    const summary = getCalcSummary(form, results);
    setSavedCalcs(prev => {
      // Avoid duplicate saves for identical results
      if (prev.length > 0 && JSON.stringify(prev[0].results) === JSON.stringify(results)) return prev;
      const nextIdx = prev.length + 1;
      return [
        { form: { ...form }, results, summary, ts: Date.now(), name: `Calculation ${nextIdx}` },
        ...prev.slice(0, 9)
      ];
    });
    // Use functional updater to avoid depending on savedCalcs in the dep array;
    // form is intentionally captured at the time results are generated
    setTempNames(prev => [`Calculation ${prev.length + 1}`, ...prev.slice(0, 9)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Delete a saved calculation
  function handleDeleteSaved(idx) {
    setSavedCalcs(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
    setViewingCalc(vc => {
      if (!vc) return vc;
      // If the deleted calc was being viewed, go back to live
      const deleted = savedCalcs[idx];
      return (deleted && vc.ts === deleted.ts) ? null : vc;
    });
  }

  // Load a saved calculation into the main view
  function handleCompareSaved(idx) {
    const calc = savedCalcs[idx];
    if (!calc) return;
    setViewingCalc(calc);
    setFormCollapsed(true);
    setTimeout(() => {
      if (taxSummaryRef.current) {
        taxSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  return (
    <div className="app">
      <DisclaimerBanner />
      {/* ── Header ── */}
      <header className="app-header" />

      {/* ── Body: single column layout ── */}
      <div className="app-body">
      <div className="app-col-left">

      {/* ── Input Form ── */}
      {formCollapsed && (results || viewingCalc) ? (
        <div className="form-card form-card-collapsed">
          <div className="collapsed-summary">
            <div className="collapsed-summary-header">
              <span className="collapsed-summary-title">
                {viewingCalc ? (viewingCalc.name || viewingCalc.summary) : 'Your Inputs'}
              </span>
              {viewingCalc ? (
                <button type="button" className="btn-edit-inputs" onClick={() => setViewingCalc(null)}>← Live results</button>
              ) : (
                <button type="button" className="btn-edit-inputs" onClick={() => setFormCollapsed(false)}>✎ Edit inputs</button>
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
      ) : (
        <div className="form-card">
          {step === 0 ? (
            <IntroStep setStep={setStep} />
          ) : (
            <>
              <StepProgress currentStep={step} />
              <form ref={formRef} onSubmit={handleSubmit} noValidate>
                {step === 1 && <ServiceStatus form={form} handleChange={handleChange} setStep={setStep} />}
                {step === 2 && <PersonalDetails form={form} handleChange={handleChange} setStep={setStep} />}
                {step === 3 && <CurrentPots form={form} handleChange={handleChange} showPropertyDetails={showPropertyDetails} setShowPropertyDetails={setShowPropertyDetails} setStep={setStep} />}
                {step === 4 && <ContributionProjection form={form} handleChange={handleChange} setStep={setStep} />}
              </form>
            </>
          )}
        </div>
      )}

      {/* ── Save/Compare Controls ── */}
      {(results || viewingCalc) && (
        <div className="save-compare-bar">
          <SavedCalculationsPanel
            savedCalcs={savedCalcs}
            viewingCalc={viewingCalc}
            editingIdx={editingIdx}
            tempNames={tempNames}
            setEditingIdx={setEditingIdx}
            setTempNames={setTempNames}
            setSavedCalcs={setSavedCalcs}
            onCompare={handleCompareSaved}
            onDelete={handleDeleteSaved}
          />
      </div>
      )}
      </div>{/* end app-col-left */}

      <div className="app-col-right">
      {/* ── Results ── */}
      {displayResults && formCollapsed && (() => {
        const activeResults = displayResults ? {
          ...displayResults,
          actionPlan: displayResults.modes?.[optMode]?.actionPlan ?? displayResults.actionPlan,
          phaseAllocations: displayResults.modes?.[optMode]?.phaseAllocations ?? displayResults.phaseAllocations,
          activeIsaPhasePot: displayResults.modes?.[optMode]?.isaPhasePot,
          activeSippPhasePot: displayResults.modes?.[optMode]?.sippPhasePot,
          activeApPhasePension: displayResults.modes?.[optMode]?.apPhasePension,
          activeApPhaseEdpLump: displayResults.modes?.[optMode]?.apPhaseEdpLump,
          activeApPhaseEdpIncome: displayResults.modes?.[optMode]?.apPhaseEdpIncome,
        } : null;
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
      })()}


      </div>{/* end app-col-right */}
      </div>{/* end app-body */}
    </div>
  );
}

export default App;
