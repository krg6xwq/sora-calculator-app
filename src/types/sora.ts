export interface MasSoraRecord {
  date: string; // YYYY-MM-DD
  sora: number; // Overnight rate in percent (e.g. 3.4215)
  soracomparates_1m: number; // 1-Month Compounded SORA in %
  soracomparates_3m: number; // 3-Month Compounded SORA in %
  soracomparates_6m: number; // 6-Month Compounded SORA in %
  sora_index: number; // MAS SORA Index (e.g. 1.15421098)
  aggregate_volume: number; // SGD Millions transacted (e.g. 3950)
  calculation_method?: string;
  highest_rate?: number;
  lowest_rate?: number;
}

export type BenchmarkType = '1M' | '3M' | '6M' | 'OVERNIGHT_ARREARS' | 'CUSTOM';
export type SpreadType = 'flat' | 'tiered';

export interface LoanConfig {
  propertyPrice: number;
  loanAmount: number;
  tenureYears: number;
  benchmarkType: BenchmarkType;
  customBenchmarkRate: number;
  spreadType: SpreadType;
  flatSpread: number; // e.g. 0.70%
  tieredSpreads: {
    year1: number;
    year2: number;
    year3Onwards: number;
  };
  repaymentType: 'amortizing' | 'interest_only';
  interestOnlyYears: number;
}

export interface TdsrConfig {
  borrowerGrossIncome: number;
  coBorrowerGrossIncome: number;
  otherMonthlyDebt: number; // other loan installments
  isHdbOrEc: boolean;
  stressTestRate: number; // MAS mandated 4.00%
}

export type LookbackConvention = 'lookback_with_shift' | 'lookback_no_shift' | 'plain_compounding';

export interface CompoundingConfig {
  principal: number;
  startDate: string;
  endDate: string;
  margin: number; // in % p.a.
  convention: LookbackConvention;
  lookbackDays: number;
  dayCountConvention: 'ACT/365';
}

export interface DailyCompoundingRow {
  date: string;
  dayOfWeek: string;
  referenceDate: string;
  overnightRate: number; // % p.a.
  weightingDays: number; // n_i
  dailyFactor: number;
  cumulativeFactor: number;
  cumulativeCompoundedRate: number; // % p.a.
  dailyAccruedInterest: number; // SGD
  cumulativeAccruedInterest: number; // SGD
}

export interface CompoundingResult {
  compoundedRateAnnualized: number; // % p.a.
  effectiveRateWithMargin: number; // % p.a.
  totalAccruedInterest: number; // SGD
  totalCalendarDays: number;
  businessDaysCount: number;
  dailyRows: DailyCompoundingRow[];
  soraIndexComparison?: {
    startIndexValue: number;
    endIndexValue: number;
    indexDerivedCompoundedRate: number;
    deltaBps: number;
  };
}

export interface AmortizationScheduleItem {
  period: number; // 1..N months
  year: number;
  month: number;
  beginningBalance: number;
  monthlyPayment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
  effectiveRate: number;
  totalInterestToDate: number;
}

export interface ScenarioComparison {
  label: string;
  deltaBps: number;
  effectiveRate: number;
  monthlyPayment: number;
  monthlyDifference: number;
  totalInterest: number;
  totalDifference: number;
}
