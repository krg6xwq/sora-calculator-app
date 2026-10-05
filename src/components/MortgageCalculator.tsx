import React, { useState } from 'react';
import { LoanConfig, MasSoraRecord, TdsrConfig } from '../types/sora';
import {
  formatSGD,
  formatPercent,
  generateAmortizationSchedule,
  calculateMonthlyInstallment,
  calculateTdsrMSR
} from '../utils/soraMath';
import { Building, ShieldCheck, AlertCircle, Sparkles, ChevronRight, Calculator } from 'lucide-react';

interface MortgageCalculatorProps {
  latestRecord: MasSoraRecord;
  loanConfig: LoanConfig;
  setLoanConfig: React.Dispatch<React.SetStateAction<LoanConfig>>;
  tdsrConfig: TdsrConfig;
  setTdsrConfig: React.Dispatch<React.SetStateAction<TdsrConfig>>;
  onViewAmortization: () => void;
}

export const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({
  latestRecord,
  loanConfig,
  setLoanConfig,
  tdsrConfig,
  setTdsrConfig,
  onViewAmortization
}) => {
  const [showTdsrDrawer, setShowTdsrDrawer] = useState(true);

  // Active benchmark rate based on selection
  const getActiveBenchmarkRate = (): number => {
    switch (loanConfig.benchmarkType) {
      case '1M':
        return latestRecord.soracomparates_1m;
      case '3M':
        return latestRecord.soracomparates_3m;
      case '6M':
        return latestRecord.soracomparates_6m;
      case 'OVERNIGHT_ARREARS':
        return latestRecord.sora;
      case 'CUSTOM':
        return loanConfig.customBenchmarkRate;
      default:
        return latestRecord.soracomparates_3m;
    }
  };

  const benchmarkRate = getActiveBenchmarkRate();

  // Effective rates
  const effectiveRateYr1 =
    loanConfig.spreadType === 'flat'
      ? benchmarkRate + loanConfig.flatSpread
      : benchmarkRate + loanConfig.tieredSpreads.year1;

  const effectiveRateYr2 =
    loanConfig.spreadType === 'flat'
      ? effectiveRateYr1
      : benchmarkRate + loanConfig.tieredSpreads.year2;

  const effectiveRateYr3 =
    loanConfig.spreadType === 'flat'
      ? effectiveRateYr1
      : benchmarkRate + loanConfig.tieredSpreads.year3Onwards;

  // Monthly installments
  const results = generateAmortizationSchedule(loanConfig, benchmarkRate);

  // Stress test calculation (MAS Notice 645/632 mandates 4.00% benchmark or contractual rate + spread)
  const stressRate = Math.max(4.0, benchmarkRate) + (loanConfig.spreadType === 'flat' ? loanConfig.flatSpread : loanConfig.tieredSpreads.year1);
  const stressMonthlyPayment = calculateMonthlyInstallment(
    loanConfig.loanAmount,
    stressRate,
    loanConfig.tenureYears * 12
  );

  const tdsrResults = calculateTdsrMSR(stressMonthlyPayment, tdsrConfig);

  // Quick preset packages
  const applyPreset = (
    name: string,
    benchmark: '1M' | '3M',
    spreadType: 'flat' | 'tiered',
    flat: number,
    y1: number,
    y2: number,
    y3: number
  ) => {
    setLoanConfig((prev) => ({
      ...prev,
      benchmarkType: benchmark,
      spreadType,
      flatSpread: flat,
      tieredSpreads: { year1: y1, year2: y2, year3Onwards: y3 }
    }));
  };

  const handleLtvClick = (pct: number) => {
    const calculatedAmount = Math.round(loanConfig.propertyPrice * (pct / 100));
    setLoanConfig((prev) => ({ ...prev, loanAmount: calculatedAmount }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Loan Parameters & Presets (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Preset Bank Packages */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Singapore Bank SORA Presets
            </span>
            <span className="text-[11px] text-slate-500">Retail Mortgage Packages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => applyPreset('DBS', '3M', 'tiered', 0.7, 0.65, 0.75, 0.85)}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-200">DBS Home Loan</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">3M SORA + 0.65% (Yr 1)</div>
              <div className="text-[10px] text-slate-500 mt-1">Tiered: 0.65% / 0.75% / 0.85%</div>
            </button>

            <button
              onClick={() => applyPreset('OCBC', '1M', 'flat', 0.68, 0.68, 0.68, 0.68)}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-200">OCBC Eco-Care</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">1M SORA + 0.68%</div>
              <div className="text-[10px] text-slate-500 mt-1">Flat margin, monthly reset</div>
            </button>

            <button
              onClick={() => applyPreset('UOB', '3M', 'flat', 0.70, 0.7, 0.7, 0.7)}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-200">UOB Home Flexi</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">3M SORA + 0.70%</div>
              <div className="text-[10px] text-slate-500 mt-1">Flat margin across tenure</div>
            </button>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              Loan Specifications
            </h2>
            <span className="text-xs text-slate-500 font-mono">ACT/365 Amortization</span>
          </div>

          {/* Property Price & Loan Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Property Valuation / Price (SGD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">S$</span>
                <input
                  type="number"
                  min={100000}
                  step={10000}
                  value={loanConfig.propertyPrice}
                  onChange={(e) => {
                    const price = Number(e.target.value);
                    setLoanConfig((prev) => ({
                      ...prev,
                      propertyPrice: price,
                      loanAmount: Math.min(prev.loanAmount, Math.round(price * 0.75))
                    }));
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Loan Amount (SGD)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleLtvClick(75)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    75% LTV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLtvClick(55)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    55% LTV
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">S$</span>
                <input
                  type="number"
                  min={50000}
                  step={10000}
                  value={loanConfig.loanAmount}
                  onChange={(e) =>
                    setLoanConfig((prev) => ({ ...prev, loanAmount: Number(e.target.value) }))
                  }
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono tabular-nums text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tenure Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-400">Loan Tenure</span>
              <span className="font-mono tabular-nums text-white font-semibold">
                {loanConfig.tenureYears} Years ({loanConfig.tenureYears * 12} Months)
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={loanConfig.tenureYears}
              onChange={(e) =>
                setLoanConfig((prev) => ({ ...prev, tenureYears: Number(e.target.value) }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
              <span>5 yrs</span>
              <span>15 yrs</span>
              <span>25 yrs (HDB max)</span>
              <span>30 yrs (Private max)</span>
            </div>
          </div>

          {/* SORA Benchmark Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              MAS SORA Benchmark Reference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setLoanConfig((prev) => ({ ...prev, benchmarkType: '3M' }))}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  loanConfig.benchmarkType === '3M'
                    ? 'border-emerald-500 bg-emerald-950/20 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">3-Month SORA</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {formatPercent(latestRecord.soracomparates_3m, 4)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Most common</div>
              </button>

              <button
                type="button"
                onClick={() => setLoanConfig((prev) => ({ ...prev, benchmarkType: '1M' }))}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  loanConfig.benchmarkType === '1M'
                    ? 'border-emerald-500 bg-emerald-950/20 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">1-Month SORA</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {formatPercent(latestRecord.soracomparates_1m, 4)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Monthly reset</div>
              </button>

              <button
                type="button"
                onClick={() => setLoanConfig((prev) => ({ ...prev, benchmarkType: '6M' }))}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  loanConfig.benchmarkType === '6M'
                    ? 'border-emerald-500 bg-emerald-950/20 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">6-Month SORA</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {formatPercent(latestRecord.soracomparates_6m, 4)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Semi-annual reset</div>
              </button>

              <button
                type="button"
                onClick={() => setLoanConfig((prev) => ({ ...prev, benchmarkType: 'CUSTOM' }))}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  loanConfig.benchmarkType === 'CUSTOM'
                    ? 'border-emerald-500 bg-emerald-950/20 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">Custom Rate</div>
                <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                  {formatPercent(loanConfig.customBenchmarkRate, 2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Manual override</div>
              </button>
            </div>

            {loanConfig.benchmarkType === 'CUSTOM' && (
              <div className="pt-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Custom Benchmark Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  max={15}
                  value={loanConfig.customBenchmarkRate}
                  onChange={(e) =>
                    setLoanConfig((prev) => ({
                      ...prev,
                      customBenchmarkRate: Number(e.target.value)
                    }))
                  }
                  className="w-full sm:w-48 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-white"
                />
              </div>
            )}
          </div>

          {/* Bank Spread / Margin */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Bank Margin / Spread Structure</label>
              <div className="flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoanConfig((prev) => ({ ...prev, spreadType: 'flat' }))}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                    loanConfig.spreadType === 'flat'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Flat Spread
                </button>
                <button
                  type="button"
                  onClick={() => setLoanConfig((prev) => ({ ...prev, spreadType: 'tiered' }))}
                  className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                    loanConfig.spreadType === 'tiered'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tiered Spread
                </button>
              </div>
            </div>

            {loanConfig.spreadType === 'flat' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bank Flat Spread (% p.a.)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-40">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">+</span>
                    <input
                      type="number"
                      step={0.05}
                      min={0}
                      value={loanConfig.flatSpread}
                      onChange={(e) =>
                        setLoanConfig((prev) => ({ ...prev, flatSpread: Number(e.target.value) }))
                      }
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono tabular-nums text-white"
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    All-in Rate:{' '}
                    <strong className="text-emerald-400 font-mono font-semibold">
                      {formatPercent(benchmarkRate + loanConfig.flatSpread, 4)}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Year 1 Margin</label>
                  <input
                    type="number"
                    step={0.05}
                    value={loanConfig.tieredSpreads.year1}
                    onChange={(e) =>
                      setLoanConfig((prev) => ({
                        ...prev,
                        tieredSpreads: { ...prev.tieredSpreads, year1: Number(e.target.value) }
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-white"
                  />
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Rate: {formatPercent(benchmarkRate + loanConfig.tieredSpreads.year1, 3)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Year 2 Margin</label>
                  <input
                    type="number"
                    step={0.05}
                    value={loanConfig.tieredSpreads.year2}
                    onChange={(e) =>
                      setLoanConfig((prev) => ({
                        ...prev,
                        tieredSpreads: { ...prev.tieredSpreads, year2: Number(e.target.value) }
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-white"
                  />
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Rate: {formatPercent(benchmarkRate + loanConfig.tieredSpreads.year2, 3)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Year 3+ Margin</label>
                  <input
                    type="number"
                    step={0.05}
                    value={loanConfig.tieredSpreads.year3Onwards}
                    onChange={(e) =>
                      setLoanConfig((prev) => ({
                        ...prev,
                        tieredSpreads: { ...prev.tieredSpreads, year3Onwards: Number(e.target.value) }
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-white"
                  />
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Rate: {formatPercent(benchmarkRate + loanConfig.tieredSpreads.year3Onwards, 3)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Output Card & TDSR Stress Assessment (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Main Result Card */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 ring-1 ring-emerald-500/10 space-y-6">
          <div>
            <span className="text-xs font-mono text-emerald-400 tracking-wide uppercase">
              Monthly Repayment (Year 1)
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-white mt-1">
              {formatSGD(results.monthlyPaymentYr1)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Effective Rate:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatPercent(effectiveRateYr1, 3)}
              </span>
              <span className="text-slate-600">({formatPercent(benchmarkRate, 3)} SORA + {formatPercent(loanConfig.spreadType === 'flat' ? loanConfig.flatSpread : loanConfig.tieredSpreads.year1, 2)} spread)</span>
            </div>
          </div>

          {/* Tiered preview if tiered */}
          {loanConfig.spreadType === 'tiered' && (
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400">Year 2 Monthly:</span>
                <div className="font-mono font-bold text-slate-200 mt-0.5">
                  {formatSGD(results.monthlyPaymentYr2)} ({formatPercent(effectiveRateYr2, 2)})
                </div>
              </div>
              <div>
                <span className="text-slate-400">Year 3+ Monthly:</span>
                <div className="font-mono font-bold text-slate-200 mt-0.5">
                  {formatSGD(results.monthlyPaymentYr3)} ({formatPercent(effectiveRateYr3, 2)})
                </div>
              </div>
            </div>
          )}

          {/* Key Loan Totals */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Loan Principal</span>
              <span className="font-mono text-slate-200 font-semibold">{formatSGD(loanConfig.loanAmount)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Estimated Total Interest</span>
              <span className="font-mono text-emerald-400 font-semibold">{formatSGD(results.totalInterestPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Total Payments (P + I)</span>
              <span className="font-mono text-white font-bold">{formatSGD(results.totalPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Loan-To-Value (LTV)</span>
              <span className="font-mono text-slate-200">
                {((loanConfig.loanAmount / loanConfig.propertyPrice) * 100).toFixed(1)}% (Max 75%)
              </span>
            </div>
          </div>

          {/* CTA to view amortization */}
          <button
            type="button"
            onClick={onViewAmortization}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>View Complete Amortization Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* MAS Stress Test & TDSR Compliance Module */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                MAS TDSR & Stress Test
              </h3>
            </div>
            <button
              onClick={() => setShowTdsrDrawer(!showTdsrDrawer)}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              {showTdsrDrawer ? 'Hide Details' : 'Configure Income'}
            </button>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">MAS Stress Test Rate (Notice 645):</span>
              <span className="font-mono font-bold text-amber-400">
                {formatPercent(stressRate, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Stress Monthly Payment:</span>
              <span className="font-mono font-semibold text-white">
                {formatSGD(stressMonthlyPayment)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Singapore banks must assess borrower qualification against minimum 4.00% benchmark.
            </div>
          </div>

          {showTdsrDrawer && (
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Borrower Monthly Income</label>
                  <input
                    type="number"
                    step={500}
                    value={tdsrConfig.borrowerGrossIncome}
                    onChange={(e) =>
                      setTdsrConfig((prev) => ({
                        ...prev,
                        borrowerGrossIncome: Number(e.target.value)
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Co-Borrower Income</label>
                  <input
                    type="number"
                    step={500}
                    value={tdsrConfig.coBorrowerGrossIncome}
                    onChange={(e) =>
                      setTdsrConfig((prev) => ({
                        ...prev,
                        coBorrowerGrossIncome: Number(e.target.value)
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Other Monthly Commitments (Car/Loans/Cards)
                </label>
                <input
                  type="number"
                  step={100}
                  value={tdsrConfig.otherMonthlyDebt}
                  onChange={(e) =>
                    setTdsrConfig((prev) => ({
                      ...prev,
                      otherMonthlyDebt: Number(e.target.value)
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hdb-check"
                  checked={tdsrConfig.isHdbOrEc}
                  onChange={(e) =>
                    setTdsrConfig((prev) => ({ ...prev, isHdbOrEc: e.target.checked }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="hdb-check" className="text-slate-300 text-xs cursor-pointer">
                  Subject to HDB / EC Mortgage Servicing Ratio (MSR 30% cap)
                </label>
              </div>
            </div>
          )}

          {/* TDSR Result Meter */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Total Debt Servicing Ratio (TDSR)</span>
              <span
                className={`font-mono font-bold ${
                  tdsrResults.isTdsrCompliant ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {tdsrResults.tdsrPercentage.toFixed(1)}% / 55.0% Max
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  tdsrResults.isTdsrCompliant ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (tdsrResults.tdsrPercentage / 55) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                {tdsrResults.isTdsrCompliant ? (
                  <span className="text-emerald-400 font-medium">PASS: Compliant with MAS Notice 645</span>
                ) : (
                  <span className="text-rose-400 font-medium">EXCEEDED: Fails 55% MAS limit</span>
                )}
              </span>
              <span className="text-slate-400 font-mono">
                Buffer: {formatSGD(Math.max(0, tdsrResults.maxBorrowingCapacityAt55Pct - stressMonthlyPayment))} /mo
              </span>
            </div>

            {tdsrConfig.isHdbOrEc && tdsrResults.msrPercentage !== undefined && (
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                <span className="text-slate-400">Mortgage Servicing Ratio (MSR):</span>
                <span
                  className={`font-mono font-bold ${
                    tdsrResults.isMsrCompliant ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tdsrResults.msrPercentage.toFixed(1)}% / 30.0% Max
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
