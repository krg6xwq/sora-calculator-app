import React, { useState, useMemo } from 'react';
import { LoanConfig, MasSoraRecord } from '../types/sora';
import {
  generateScenarioMatrix,
  formatSGD,
  formatPercent,
  formatBps,
  calculateMonthlyInstallment
} from '../utils/soraMath';
import { Sliders, GitCompare, ArrowUpDown, HelpCircle } from 'lucide-react';

interface ScenarioAnalysisProps {
  latestRecord: MasSoraRecord;
  loanConfig: LoanConfig;
}

export const ScenarioAnalysis: React.FC<ScenarioAnalysisProps> = ({
  latestRecord,
  loanConfig
}) => {
  // Current active benchmark
  const currentBenchmark =
    loanConfig.benchmarkType === '1M'
      ? latestRecord.soracomparates_1m
      : loanConfig.benchmarkType === '6M'
      ? latestRecord.soracomparates_6m
      : latestRecord.soracomparates_3m;

  // Fixed vs Floating parameters
  const [fixedRate, setFixedRate] = useState<number>(3.05); // Typical 2-year fixed bank package
  const [lockInYears, setLockInYears] = useState<number>(2);

  // Generate sensitivity matrix
  const matrix = useMemo(() => {
    return generateScenarioMatrix(loanConfig, currentBenchmark);
  }, [loanConfig, currentBenchmark]);

  // Fixed package comparison calculation
  const fixedComparison = useMemo(() => {
    const tenureMonths = loanConfig.tenureYears * 12;
    const lockInMonths = lockInYears * 12;

    const currentSpread =
      loanConfig.spreadType === 'flat' ? loanConfig.flatSpread : loanConfig.tieredSpreads.year1;
    const floatingEffective = currentBenchmark + currentSpread;

    const floatingMonthly = calculateMonthlyInstallment(
      loanConfig.loanAmount,
      floatingEffective,
      tenureMonths
    );
    const fixedMonthly = calculateMonthlyInstallment(
      loanConfig.loanAmount,
      fixedRate,
      tenureMonths
    );

    const monthlyDiff = fixedMonthly - floatingMonthly;
    const lockInTotalFloating = floatingMonthly * lockInMonths;
    const lockInTotalFixed = fixedMonthly * lockInMonths;
    const lockInTotalDiff = lockInTotalFixed - lockInTotalFloating;

    // Breakeven SORA rate: Fixed Rate - Bank Spread
    const breakevenSora = Math.max(0, fixedRate - currentSpread);

    return {
      floatingEffective,
      floatingMonthly,
      fixedMonthly,
      monthlyDiff,
      lockInTotalFloating,
      lockInTotalFixed,
      lockInTotalDiff,
      breakevenSora
    };
  }, [loanConfig, currentBenchmark, fixedRate, lockInYears]);

  return (
    <div className="space-y-6">
      {/* Section 1: Fixed vs Floating SORA Breakeven Analyzer */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-emerald-400" />
              Fixed Rate vs Floating SORA Breakeven Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Determine the threshold at which a fixed loan package outperforms a SORA floating package
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Lock-in Duration:</span>
            <div className="flex rounded p-0.5 bg-slate-950 border border-slate-800">
              {[1, 2, 3].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setLockInYears(yr)}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    lockInYears === yr
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {yr} {yr === 1 ? 'Year' : 'Years'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inputs & Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Fixed Rate Package Input */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Fixed Rate Bank Offer</span>
              <span className="text-[10px] text-slate-500 font-mono">{lockInYears} Yr Lock-in</span>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1">Guaranteed Fixed Rate (% p.a.)</label>
              <input
                type="number"
                step={0.05}
                min={1.0}
                max={10.0}
                value={fixedRate}
                onChange={(e) => setFixedRate(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Monthly Payment:</span>
                <span className="font-mono text-white font-semibold">
                  {formatSGD(fixedComparison.fixedMonthly)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total during lock-in:</span>
                <span className="font-mono text-slate-300">
                  {formatSGD(fixedComparison.lockInTotalFixed)}
                </span>
              </div>
            </div>
          </div>

          {/* Current Floating SORA Package */}
          <div className="p-4 rounded-lg bg-slate-950 border border-emerald-500/30 space-y-3">
            <div className="text-emerald-400 font-semibold flex items-center justify-between">
              <span>Floating SORA Package</span>
              <span className="text-[10px] text-emerald-400/80 font-mono">Current Market</span>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Effective Rate:</div>
              <div className="text-lg font-bold font-mono text-emerald-300">
                {formatPercent(fixedComparison.floatingEffective, 3)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {formatPercent(currentBenchmark, 3)} SORA + {formatPercent(loanConfig.spreadType === 'flat' ? loanConfig.flatSpread : loanConfig.tieredSpreads.year1, 2)} Spread
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Monthly Payment:</span>
                <span className="font-mono text-white font-semibold">
                  {formatSGD(fixedComparison.floatingMonthly)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total during lock-in:</span>
                <span className="font-mono text-slate-300">
                  {formatSGD(fixedComparison.lockInTotalFloating)}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Breakeven Verdict */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-slate-300 font-semibold text-xs mb-2">Breakeven SORA Analysis</div>
              <div className="text-slate-400 text-xs leading-relaxed">
                For the Fixed Rate offer ({formatPercent(fixedRate, 2)}) to be cheaper, SORA benchmark must average above:
              </div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-2">
                {formatPercent(fixedComparison.breakevenSora, 3)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Current 3M SORA is {formatPercent(currentBenchmark, 3)} (
                {currentBenchmark > fixedComparison.breakevenSora ? (
                  <strong className="text-amber-400">
                    +{((currentBenchmark - fixedComparison.breakevenSora) * 100).toFixed(0)} bps above breakeven
                  </strong>
                ) : (
                  <strong className="text-emerald-400">
                    -{((fixedComparison.breakevenSora - currentBenchmark) * 100).toFixed(0)} bps below breakeven
                  </strong>
                )}
                )
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              {fixedComparison.lockInTotalDiff > 0 ? (
                <span>
                  Floating SORA currently saves <strong className="text-emerald-400 font-mono">{formatSGD(fixedComparison.lockInTotalDiff)}</strong> over the {lockInYears}-year period.
                </span>
              ) : (
                <span>
                  Fixed package saves <strong className="text-amber-400 font-mono">{formatSGD(Math.abs(fixedComparison.lockInTotalDiff))}</strong> over the {lockInYears}-year period if rates remain unchanged.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Rate Sensitivity Matrix Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              SORA Interest Rate Sensitivity Matrix
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Impact of market interest rate movements on monthly installments and cumulative tenure interest
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Principal: {formatSGD(loanConfig.loanAmount)} · Tenure: {loanConfig.tenureYears} Years
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="py-2.5 px-4">Rate Scenario</th>
                <th className="py-2.5 px-3 text-right">Delta (bps)</th>
                <th className="py-2.5 px-3 text-right">All-in Rate</th>
                <th className="py-2.5 px-4 text-right">Monthly Payment</th>
                <th className="py-2.5 px-4 text-right">Monthly Difference</th>
                <th className="py-2.5 px-4 text-right">Total Interest</th>
                <th className="py-2.5 px-4 text-right">Tenure Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
              {matrix.map((row) => {
                const isBaseline = row.deltaBps === 0;
                return (
                  <tr
                    key={row.label}
                    className={`transition-colors ${
                      isBaseline
                        ? 'bg-emerald-950/20 font-semibold text-white'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap font-sans">
                      <div className="flex items-center gap-2">
                        {isBaseline && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {row.deltaBps === 0 ? '0' : formatBps(row.deltaBps)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-white font-semibold">
                      {formatPercent(row.effectiveRate, 3)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-emerald-300 font-bold">
                      {formatSGD(row.monthlyPayment)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {row.monthlyDifference === 0 ? (
                        <span className="text-slate-500">—</span>
                      ) : row.monthlyDifference > 0 ? (
                        <span className="text-rose-400">+{formatSGD(row.monthlyDifference)}</span>
                      ) : (
                        <span className="text-emerald-400">-{formatSGD(Math.abs(row.monthlyDifference))}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-slate-300">
                      {formatSGD(row.totalInterest)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap font-semibold">
                      {row.totalDifference === 0 ? (
                        <span className="text-slate-500">Baseline</span>
                      ) : row.totalDifference > 0 ? (
                        <span className="text-rose-400">+{formatSGD(row.totalDifference)}</span>
                      ) : (
                        <span className="text-emerald-400">-{formatSGD(Math.abs(row.totalDifference))}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
