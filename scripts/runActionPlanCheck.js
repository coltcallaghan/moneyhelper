const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../src/actionPlanCivilian.js'), 'utf8');
// Convert `export function` to regular function so we can eval safely
const modSrc = src.replace(/export\s+function/g, 'function');

// Helpers the function expects
const fmtGBP = (n, dec = 0) => (typeof n === 'number' ? `£${n.toFixed(dec)}` : String(n));
const fmtPct = (n, dec = 0) => (typeof n === 'number' ? `${(n * 100).toFixed(dec)}%` : String(n));
function projectPot(annualContrib, years, r) {
  if (years <= 0) return annualContrib;
  if (r === 0) return annualContrib * years;
  return annualContrib * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}

// Build a wrapper to capture the function
const wrapper = `
${modSrc}

const out = buildCivilianActionPlan({
  contribution: 25000,
  years: 30,
  realReturnRate: 0.044,
  taxRate: 0.40,
  niRate: 0.02,
  age: 30,
  retirementAge: 60,
  sippNetLimit: 48000,
  fmtGBP: ${fmtGBP.toString()},
  fmtPct: ${fmtPct.toString()},
  projectPot: ${projectPot.toString()},
  alreadyLeft: false
});
console.log(JSON.stringify(out, null, 2));
`;

try {
  eval(wrapper);
} catch (e) {
  console.error('Error running wrapper:', e);
  process.exit(1);
}
