import {
  CompoundingConfig,
  CompoundingResult,
  DailyCompoundingRow,
  LoanConfig,
  AmortizationScheduleItem,
  MasSoraRecord,
  TdsrConfig,
  ScenarioComparison
} from '../types/sora';
import { findRateForDate } from '../services/masApiService';

/**
 * Format currency in Singapore Dollars (SGD)
 */
export function formatSGD(amount: number, showDecimals: boolean = false): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(amount);
}

/**
 * Format percentages with high precision
 */
export function formatPercent(rate: number, decimals: number = 4): string {
  return `${rate.toFixed(decimals)}%`;
}

/**
 * Formats basis points
 */
export function formatBps(bps: number): string {
  const sign = bps > 0 ? '+' : '';
  return `${sign}${bps.toFixed(1)} bps`;
}

/**
 * Check if a date is a Saturday (6) or Sunday (0)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add calendar days to a date
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Calculates standard monthly amortization payment
 */
export function calculateMonthlyInstallment(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) return principal / tenureMonths;

  const monthlyRate = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

/**
 * Compute the complete amortization schedule with tiered spreads
 */
export function generateAmortizationSchedule(
  config: LoanConfig,
  compoundedSoraBenchmark: number,
  prepaymentAmount: number = 0,
  prepaymentMonth: number = 12
): {
  monthlyPaymentYr1: number;
  monthlyPaymentYr2: number;
  monthlyPaymentYr3: number;
  totalInterestPaid: number;
  totalPaid: number;
  schedule: AmortizationScheduleItem[];
  prepaymentInterestSaved?: number;
} {
  const totalMonths = config.tenureYears * 12;
  let balance = config.loanAmount;
  let cumulativeInterest = 0;
  const schedule: AmortizationScheduleItem[] = [];

  // Determine effective rate for a given month
  const getRateForMonth = (monthNumber: number): number => {
    let spread = config.flatSpread;
    if (config.spreadType === 'tiered') {
      if (monthNumber <= 12) spread = config.tieredSpreads.year1;
      else if (monthNumber <= 24) spread = config.tieredSpreads.year2;
      else spread = config.tieredSpreads.year3Onwards;
    }
    return Math.max(0.01, compoundedSoraBenchmark + spread);
  };

  // Base monthly payment calculation for reference display
  const rateYr1 = getRateForMonth(1);
  const rateYr2 = getRateForMonth(13);
  const rateYr3 = getRateForMonth(25);

  const paymentYr1 = calculateMonthlyInstallment(config.loanAmount, rateYr1, totalMonths);
  const paymentYr2 = calculateMonthlyInstallment(config.loanAmount, rateYr2, totalMonths);
  const paymentYr3 = calculateMonthlyInstallment(config.loanAmount, rateYr3, totalMonths);

  let currentMonthlyPayment = paymentYr1;
  let remainingMonths = totalMonths;

  for (let m = 1; m <= totalMonths; m++) {
    if (balance <= 0.01) break;

    const rate = getRateForMonth(m);
    const monthlyRate = rate / 100 / 12;

    // Recalculate monthly installment if rate changed (tiered) or after prepayment
    if (config.spreadType === 'tiered' && (m === 13 || m === 25)) {
      currentMonthlyPayment = calculateMonthlyInstallment(balance, rate, remainingMonths);
    }

    const beginningBal = balance;
    let interest = beginningBal * monthlyRate;
    let principalPart = 0;

    if (config.repaymentType === 'interest_only' && m <= config.interestOnlyYears * 12) {
      principalPart = 0;
      currentMonthlyPayment = interest;
    } else {
      principalPart = currentMonthlyPayment - interest;
      if (principalPart > beginningBal) {
        principalPart = beginningBal;
        currentMonthlyPayment = principalPart + interest;
      }
    }

    // Apply prepayment if triggered
    let extraPrincipal = 0;
    if (prepaymentAmount > 0 && m === prepaymentMonth) {
      extraPrincipal = Math.min(prepaymentAmount, beginningBal - principalPart);
      balance -= extraPrincipal;
      // Recalculate payment for remaining tenure
      remainingMonths = totalMonths - m;
      if (remainingMonths > 0) {
        currentMonthlyPayment = calculateMonthlyInstallment(balance, rate, remainingMonths);
      }
    }

    balance = Math.max(0, balance - principalPart);
    cumulativeInterest += interest;
    remainingMonths--;

    schedule.push({
      period: m,
      year: Math.ceil(m / 12),
      month: ((m - 1) % 12) + 1,
      beginningBalance: beginningBal,
      monthlyPayment: currentMonthlyPayment + extraPrincipal,
      principalPaid: principalPart + extraPrincipal,
      interestPaid: interest,
      endingBalance: balance,
      effectiveRate: rate,
      totalInterestToDate: cumulativeInterest
    });
  }

  // Calculate baseline interest without prepayment for comparison
  let prepaymentSaved = 0;
  if (prepaymentAmount > 0) {
    const baseSchedule = generateAmortizationSchedule(config, compoundedSoraBenchmark, 0, 0);
    prepaymentSaved = Math.max(0, baseSchedule.totalInterestPaid - cumulativeInterest);
  }

  return {
    monthlyPaymentYr1: paymentYr1,
    monthlyPaymentYr2: paymentYr2,
    monthlyPaymentYr3: paymentYr3,
    totalInterestPaid: cumulativeInterest,
    totalPaid: config.loanAmount + cumulativeInterest,
    schedule,
    prepaymentInterestSaved: prepaymentSaved
  };
}

/**
 * Calculates MAS regulatory TDSR (Total Debt Servicing Ratio) and MSR (Mortgage Servicing Ratio)
 */
export function calculateTdsrMSR(
  monthlyInstallmentAtStressRate: number,
  tdsrConfig: TdsrConfig
): {
  totalGrossIncome: number;
  totalMonthlyCommitment: number;
  tdsrPercentage: number;
  isTdsrCompliant: boolean; // <= 55%
  msrPercentage?: number;
  isMsrCompliant?: boolean; // <= 30% for HDB/EC
  maxBorrowingCapacityAt55Pct: number;
} {
  const totalIncome = tdsrConfig.borrowerGrossIncome + tdsrConfig.coBorrowerGrossIncome;
  const totalDebt = monthlyInstallmentAtStressRate + tdsrConfig.otherMonthlyDebt;

  const tdsrPct = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;
  const isTdsrOk = tdsrPct <= 55;

  let msrPct: number | undefined;
  let isMsrOk: boolean | undefined;

  if (tdsrConfig.isHdbOrEc) {
    msrPct = totalIncome > 0 ? (monthlyInstallmentAtStressRate / totalIncome) * 100 : 0;
    isMsrOk = msrPct <= 30;
  }

  // Max installment allowed under 55% TDSR
  const maxAllowablePayment = Math.max(0, totalIncome * 0.55 - tdsrConfig.otherMonthlyDebt);

  return {
    totalGrossIncome: totalIncome,
    totalMonthlyCommitment: totalDebt,
    tdsrPercentage: tdsrPct,
    isTdsrCompliant: isTdsrOk,
    msrPercentage: msrPct,
    isMsrCompliant: isMsrOk,
    maxBorrowingCapacityAt55Pct: maxAllowablePayment
  };
}

/**
 * Institutional Compounding in Arrears (MAS ACT/365 standard)
 * Implements the official ABS/MAS recommended formula for daily overnight SORA compounding:
 * Compounded Rate = [ \prod (1 + (r_i * n_i / 365)) - 1 ] * (365 / d) * 100%
 */
export function calculateCompoundedSoraInArrears(
  records: MasSoraRecord[],
  config: CompoundingConfig
): CompoundingResult {
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);

  if (start >= end) {
    throw new Error('Start date must be strictly prior to end date');
  }

  // Total calendar days d in interest calculation period
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);

  // Generate business days sequence
  const dailyRows: DailyCompoundingRow[] = [];
  let cumulativeFactor = 1.0;
  let cumulativeAccruedInterest = 0;
  let businessDaysCount = 0;

  // Day names for legibility
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let curDate = new Date(start);

  while (curDate < end) {
    const curDay = curDate.getDay();

    // If curDate is weekend, in typical compounding it is covered by the preceding business day (Friday)
    // In MAS convention: loop across business days, and n_i is the calendar days until the next business day.
    if (!isWeekend(curDate)) {
      businessDaysCount++;
      const curDateStr = curDate.toISOString().split('T')[0];

      // Determine the next business day to calculate weighting calendar days n_i
      let nextDay = addDays(curDate, 1);
      while (isWeekend(nextDay) && nextDay <= end) {
        nextDay = addDays(nextDay, 1);
      }
      // Calendar days that rate r_i applies for:
      const n_i = Math.round((nextDay.getTime() - curDate.getTime()) / 86400000);

      // Reference date determination based on lookback convention
      let referenceDateStr = curDateStr;
      if (config.convention === 'lookback_with_shift' || config.convention === 'lookback_no_shift') {
        // Shift backwards by lookbackDays business days
        let shifted = new Date(curDate);
        let bDaysBack = 0;
        while (bDaysBack < config.lookbackDays) {
          shifted = addDays(shifted, -1);
          if (!isWeekend(shifted)) {
            bDaysBack++;
          }
        }
        referenceDateStr = shifted.toISOString().split('T')[0];
      }

      // Fetch the SORA rate for the reference date
      const record = findRateForDate(records, referenceDateStr);
      const r_i = record ? record.sora : 3.40; // in % p.a.

      // Daily factor = 1 + (r_i / 100 * n_i / 365)
      const dailyFactor = 1 + ((r_i / 100) * n_i) / 365;
      cumulativeFactor *= dailyFactor;

      // Cumulative compounded rate up to this day annualized:
      const calendarDaysSoFar = Math.round((nextDay.getTime() - start.getTime()) / 86400000);
      const curCompoundedRate = ((cumulativeFactor - 1) * 365) / calendarDaysSoFar * 100;

      // Accrued dollar interest for this period slice
      const effectiveDailyRate = (r_i + config.margin) / 100;
      const dailyInterest = (config.principal * effectiveDailyRate * n_i) / 365;
      cumulativeAccruedInterest += dailyInterest;

      dailyRows.push({
        date: curDateStr,
        dayOfWeek: dayNames[curDay],
        referenceDate: referenceDateStr,
        overnightRate: r_i,
        weightingDays: n_i,
        dailyFactor,
        cumulativeFactor,
        cumulativeCompoundedRate: curCompoundedRate,
        dailyAccruedInterest: dailyInterest,
        cumulativeAccruedInterest: cumulativeAccruedInterest
      });

      // Advance curDate to nextDay
      curDate = nextDay;
    } else {
      // Advance to next day if started on weekend
      curDate = addDays(curDate, 1);
    }
  }

  // Final annualized compounded SORA rate
  const compoundedRateAnnualized = ((cumulativeFactor - 1) * 365) / totalDays * 100;
  const effectiveRateWithMargin = compoundedRateAnnualized + config.margin;

  // Final exact interest calculation
  const totalAccruedInterest = (config.principal * (effectiveRateWithMargin / 100) * totalDays) / 365;

  // SORA Index cross-check verification if records contain SORA index
  let soraIndexComparison: CompoundingResult['soraIndexComparison'];
  const startRec = findRateForDate(records, config.startDate);
  const endRec = findRateForDate(records, config.endDate);

  if (startRec?.sora_index && endRec?.sora_index && endRec.sora_index > startRec.sora_index) {
    const indexCompounded = ((endRec.sora_index / startRec.sora_index - 1) * 365) / totalDays * 100;
    const deltaBps = (compoundedRateAnnualized - indexCompounded) * 100;
    soraIndexComparison = {
      startIndexValue: startRec.sora_index,
      endIndexValue: endRec.sora_index,
      indexDerivedCompoundedRate: indexCompounded,
      deltaBps: deltaBps
    };
  }

  return {
    compoundedRateAnnualized,
    effectiveRateWithMargin,
    totalAccruedInterest,
    totalCalendarDays: totalDays,
    businessDaysCount,
    dailyRows,
    soraIndexComparison
  };
}

/**
 * Generate Scenario Sensitivities (e.g. -100bps, -50bps, baseline, +50bps, +100bps, +150bps)
 */
export function generateScenarioMatrix(
  loanConfig: LoanConfig,
  currentBenchmark: number
): ScenarioComparison[] {
  const totalMonths = loanConfig.tenureYears * 12;
  const baseSpread = loanConfig.spreadType === 'flat' ? loanConfig.flatSpread : loanConfig.tieredSpreads.year1;
  const baseEffective = currentBenchmark + baseSpread;
  const baseMonthlyPayment = calculateMonthlyInstallment(loanConfig.loanAmount, baseEffective, totalMonths);
  const baseTotalInterest = (baseMonthlyPayment * totalMonths) - loanConfig.loanAmount;

  const scenarios = [
    { label: 'Eased -100 bps (-1.00%)', delta: -100 },
    { label: 'Eased -50 bps (-0.50%)', delta: -50 },
    { label: 'Eased -25 bps (-0.25%)', delta: -25 },
    { label: 'Current Base SORA', delta: 0 },
    { label: 'Tightened +25 bps (+0.25%)', delta: 25 },
    { label: 'Tightened +50 bps (+0.50%)', delta: 50 },
    { label: 'Tightened +100 bps (+1.00%)', delta: 100 },
    { label: 'MAS Regulatory Stress (+4.0% cap)', delta: (4.0 - currentBenchmark) * 100 }
  ];

  return scenarios.map(sc => {
    const rate = Math.max(0.1, currentBenchmark + (sc.delta / 100) + baseSpread);
    const monthly = calculateMonthlyInstallment(loanConfig.loanAmount, rate, totalMonths);
    const totalInt = (monthly * totalMonths) - loanConfig.loanAmount;

    return {
      label: sc.label,
      deltaBps: sc.delta,
      effectiveRate: rate,
      monthlyPayment: monthly,
      monthlyDifference: monthly - baseMonthlyPayment,
      totalInterest: totalInt,
      totalDifference: totalInt - baseTotalInterest
    };
  });
}
