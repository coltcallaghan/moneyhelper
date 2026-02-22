import React from 'react';

export default function IntroStep({ setStep }) {
  return (
    <div className="intro-step" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
      <h1 style={{ marginTop: 0 }}>
        <img src={process.env.PUBLIC_URL + '/military-hat.png'} alt="Military Helmet" style={{height: '2.2em', verticalAlign: 'middle', marginRight: '0.6em'}} />
        Soldiers Fortune
      </h1>
      <p style={{ maxWidth: '46rem', margin: '0.5rem auto 1rem' }}>
        Your one-stop shop for UK Armed Forces personnel to understand, plan, and optimise your finances — including ISA, SIPP, AFPS 15 Added Pension, mortgage, cash reserves, and more. All calculations use real UK tax rules and inflation-adjusted projections.
      </p>

      <div className="disclaimer-box" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span className="disclaimer-icon">⚠️</span>
        <span className="disclaimer-text">This tool is for guidance only. Please seek independent financial advice before making any major decisions.</span>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button type="button" className="preset-btn" onClick={() => setStep(1)}>Start the journey →</button>
      </div>
    </div>
  );
}
