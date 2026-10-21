import { EmployerConfig, Shift } from '../types';

export interface PayStubPreview {
  basicGross: number;
  vacationPay: number;
  grossPay: number;
  cppDeduction: number;
  cpp2Deduction: number;
  eiDeduction: number;
  incomeTax: number;
  customDeductions: Array<{ name: string; amount: number }>;
  netPay: number;
  totalDeductions: number;
}

// CRA & Ontario Statutory Constants
const CPP_RATE = 0.0595;
const CPP2_RATE = 0.0400;
const EI_RATE = 0.0163;
const ANNUAL_CPP_EXEMPTION = 3500;
const YMPE = 74600;  // First CPP Ceiling
const YAMPE = 85000; // Second CPP Ceiling

const PAY_PERIODS: Record<string, number> = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12
};

const FED_BPA = 16452; // Federal Basic Personal Amount
const ON_BPA = 12989;  // Ontario Basic Personal Amount

const FED_BRACKETS = [
  { limit: 58523, rate: 0.1400 },
  { limit: 117045, rate: 0.2050 },
  { limit: 181440, rate: 0.2600 },
  { limit: 258482, rate: 0.2900 },
  { limit: Infinity, rate: 0.3300 }
];

const ON_BRACKETS = [
  { limit: 53891, rate: 0.0505 },
  { limit: 107785, rate: 0.0915 },
  { limit: 150000, rate: 0.1116 },
  { limit: 220000, rate: 0.1216 },
  { limit: Infinity, rate: 0.1316 }
];

function calculateProgressiveTax(annualIncome: number, brackets: { limit: number; rate: number }[], bpa: number): number {
  if (annualIncome <= 0) return 0;

  // 1. Calculate Gross Progressive Tax
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    const taxableInThisBracket = Math.max(0, Math.min(annualIncome, bracket.limit) - previousLimit);
    tax += taxableInThisBracket * bracket.rate;
    previousLimit = bracket.limit;
    if (annualIncome <= bracket.limit) break;
  }

  // 2. Subtract Non-Refundable BPA Tax Credit (Calculated at lowest bracket rate)
  const lowestRate = brackets[0].rate;
  const bpaCredit = bpa * lowestRate;

  return Math.max(0, tax - bpaCredit);
}

export function calculatePayroll(shifts: Shift[], employer: EmployerConfig): PayStubPreview {
  const totalHours = shifts.reduce((sum, s) => sum + s.scheduledHours, 0);
  const periodsPerYear = PAY_PERIODS[employer.payCycle] || 26;
  
  // 1. Gross Pay
  const basicGross = shifts.reduce((sum, s) => {
    const rate = s.hourlyRateOverride || employer.roles.find(r => r.roleId === s.roleId)?.hourlyRate || 0;
    return sum + (s.scheduledHours * rate);
  }, 0);
  
  const vacationPay = basicGross * (employer.vacationAccrualPct / 100);
  const totalGross = basicGross + vacationPay;

  // 2. CPP / CPP2 / EI Statutory Deductions
  const periodExemption = ANNUAL_CPP_EXEMPTION / periodsPerYear;
  const pensionableEarnings = Math.max(0, totalGross - periodExemption);
  const cppDeduction = pensionableEarnings * CPP_RATE;
  
  // EI on gross earnings (no period exemption)
  const eiDeduction = totalGross * EI_RATE;

  // 3. Projected Annualization Tax Method
  const projectedAnnualIncome = totalGross * periodsPerYear;
  
  const annualFedTax = calculateProgressiveTax(projectedAnnualIncome, FED_BRACKETS, FED_BPA);
  const annualOnTax = calculateProgressiveTax(projectedAnnualIncome, ON_BRACKETS, ON_BPA);
  
  const periodIncomeTax = (annualFedTax + annualOnTax) / periodsPerYear;

  // CPP2 (Second Ceiling Contribution)
  let cpp2Deduction = 0;
  if (projectedAnnualIncome > YMPE) {
    const cpp2Base = Math.min(projectedAnnualIncome, YAMPE) - YMPE;
    cpp2Deduction = (cpp2Base * CPP2_RATE) / periodsPerYear;
  }

  // 4. Non-Statutory / Custom Deductions
  const itemizedCustomDeductions = employer.customDeductions.map(d => {
    let amount = 0;
    switch (d.type) {
      case 'fixed_per_paycheck': amount = d.value; break;
      case 'fixed_per_hour': amount = totalHours * d.value; break;
      case 'percentage_gross': amount = totalGross * (d.value / 100); break;
    }
    return { name: d.name, amount };
  });

  const totalCustomDeductions = itemizedCustomDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDeductions = cppDeduction + cpp2Deduction + eiDeduction + periodIncomeTax + totalCustomDeductions;
  const netPay = totalGross - totalDeductions;

  return {
    basicGross,
    grossPay: totalGross,
    vacationPay,
    cppDeduction,
    cpp2Deduction,
    eiDeduction,
    incomeTax: periodIncomeTax,
    customDeductions: itemizedCustomDeductions,
    netPay,
    totalDeductions
  };
}