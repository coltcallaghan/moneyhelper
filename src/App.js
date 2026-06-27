
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
import ResultsSection from './components/ResultsSection';
import InputSummaryChips from './components/InputSummaryChips';
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
        <InputSummaryChips
          displayForm={displayForm}
          viewingCalc={viewingCalc}
          onEdit={() => setFormCollapsed(false)}
          onBackToLive={() => setViewingCalc(null)}
        />
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
      {displayResults && formCollapsed && (
        <ResultsSection
          displayResults={displayResults}
          optMode={optMode}
          setOptMode={setOptMode}
          form={form}
          taxSummaryRef={taxSummaryRef}
        />
      )}


      </div>{/* end app-col-right */}
      </div>{/* end app-body */}
    </div>
  );
}

export default App;
