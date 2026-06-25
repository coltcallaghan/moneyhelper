import React from 'react';

const STEP_LABELS = ['Service Status', 'Personal Details', 'Existing Savings', 'Goals & Projection'];
function StepProgress({ currentStep }) {
  return (
    <div className="step-progress">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isDone = currentStep > num;
        const isActive = currentStep === num;
        return (
          <React.Fragment key={num}>
            <div className={`step-progress-item${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
              <span className="step-progress-num">{isDone ? '✓' : num}</span>
              <span className="step-progress-label">{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`step-progress-connector${isDone ? ' done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StepProgress;
