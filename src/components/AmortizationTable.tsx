import React, { useState, useMemo } from 'react';
import { LoanConfig, MasSoraRecord } from '../types/sora';
import {
  generateAmortizationSchedule,
  formatSGD,
  formatPercent
} from '../utils/soraMath';
import { Table, Download, ArrowDownRight, PiggyBank, RefreshCw } from 'lucide-react';

interface AmortizationTableProps {
  latestRecord: MasSoraRecord;
  loanConfig: LoanConfig;
}

export const AmortizationTable: React.FC<AmortizationTableProps> = ({
  latestRecord,
  loanConfig
}) => {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(0);
  const [prepaymentMonth, setPrepaymentMonth] = useState<number>(24); // Year 2 end
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'all'>('all');

  const benchmarkRate =
    loanConfig.benchmarkType === '1M'
      ? latestRecord.soracomparates_1m
      : loanConfig.benchmarkType === '6M'
      ? latestRecord.soracomparates_6m
      : latestRecord.soracomparates_3m;

  const results = useMemo(() => {
    return generateAmortizationSchedule(
      loanConfig,
      benchmarkRate,
      prepaymentAmount,
      prepaymentMonth
    );
  }, [loanConfig, benchmarkRate, prepaymentAmount, prepaymentMonth]);

  // Aggregate by year
  const yearlySummary = useMemo(() => {
    const yearsMap: {
      [year: number]: {
        year: number;
        beginningBalance: number;
        totalPayment: number;
        principalPaid: number;
        interestPaid: number;
        endingBalance: number;
        rate: number;
      };
    } = {};

    results.schedule.forEach((item) => {
      if (!yearsMap[item.year]) {
        yearsMap[item.year] = {
          year: item.year,
          beginningBalance: item.beginningBalance,
          totalPayment: 0,
          principalPaid: 0,
          interestPaid: 0,
          endingBalance: item.endingBalance,
          rate: item.effectiveRate
        };
      }
      yearsMap[item.year].totalPayment += item.monthlyPayment;
      yearsMap[item.year].principalPaid += item.principalPaid;
      yearsMap[item.year].interestPaid += item.interestPaid;
      yearsMap[item.year].endingBalance = item.endingBalance;
      yearsMap[item.year].rate = item.effectiveRate;
    });

    return Object.values(yearsMap);
  }, [results]);

  const handleExportCsv = () => {
    const headers = [
      'Period',
      'Year',
      'Month',
      'Beginning Balance (SGD)',
      'Monthly Payment (SGD)',
      'Principal Paid (SGD)',
      'Interest Paid (SGD)',
      'Ending Balance (SGD)',
      'Effective Rate (%)',
      'Cumulative Interest (SGD)'
    ];

    const rows = results.schedule.map((item) => [
      item.period,
      item.year,
      item.month,
      item.beginningBalance.toFixed(2),
      item.monthlyPayment.toFixed(2),
      item.principalPaid.toFixed(2),
      item.interestPaid.toFixed(2),
      item.endingBalance.toFixed(2),
      item.effectiveRate.toFixed(4),
      item.totalInterestToDate.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SORA_Amortization_Ledger_${loanConfig.loanAmount}_${loanConfig.tenureYears}Y.csv`;
    link.click();
  };

  const filteredMonthlySchedule = useMemo(() => {
    if (selectedYearFilter === 'all') return results.schedule;
    return results.schedule.filter((s) => s.year === selectedYearFilter);
  }, [results.schedule, selectedYearFilter]);

  return (
    <div className="space-y-6">
      {/* Top Prepayment Simulator & Controls Bar */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-400" />
              SORA Loan Amortization Schedule
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Principal balance pay-down, interest portion decomposition, and lump-sum prepayment acceleration
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-md p-0.5 bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'yearly'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual Summary
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Breakdown
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Prepayment Simulator Drawer */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Lump-Sum Prepayment Simulator</span>
              <p className="text-[11px] text-slate-400">
                Test how injecting spare liquidity early reduces total interest liability
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Prepayment:</span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-500 font-mono">S$</span>
                <input
                  type="number"
                  step={5000}
                  min={0}
                  value={prepaymentAmount}
                  onChange={(e) => setPrepaymentAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">At Month:</span>
              <select
                value={prepaymentMonth}
                onChange={(e) => setPrepaymentMonth(Number(e.target.value))}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
              >
                <option value={12}>Month 12 (End of Yr 1)</option>
                <option value={24}>Month 24 (End of Yr 2)</option>
                <option value={36}>Month 36 (End of Yr 3)</option>
                <option value={60}>Month 60 (End of Yr 5)</option>
              </select>
            </div>

            {prepaymentAmount > 0 && results.prepaymentInterestSaved !== undefined && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono font-semibold text-xs">
                <span>Interest Saved:</span>
                <span>{formatSGD(results.prepaymentInterestSaved)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amortization Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        {viewMode === 'monthly' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter by Year:</span>
            <select
              value={selectedYearFilter}
              onChange={(e) =>
                setSelectedYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono"
            >
              <option value="all">All Years (1 - {loanConfig.tenureYears})</option>
              {Array.from({ length: loanConfig.tenureYears }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Year {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-800 rounded-lg">
          {viewMode === 'yearly' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Year</th>
                  <th className="py-2.5 px-3 text-right">Effective Rate</th>
                  <th className="py-2.5 px-4 text-right">Starting Balance</th>
                  <th className="py-2.5 px-4 text-right">Annual Payment</th>
                  <th className="py-2.5 px-4 text-right">Principal Paid</th>
                  <th className="py-2.5 px-4 text-right">Interest Paid</th>
                  <th className="py-2.5 px-4 text-right">Ending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                {yearlySummary.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap text-white font-semibold">
                      Year {row.year}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-400">
                      {formatPercent(row.rate, 3)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-slate-300">
                      {formatSGD(row.beginningBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-white font-medium">
                      {formatSGD(row.totalPayment)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-emerald-400 font-medium">
                      {formatSGD(row.principalPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-slate-400">
                      {formatSGD(row.interestPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap text-slate-200 font-bold">
                      {formatSGD(row.endingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-2">Year/Mo</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-right">Starting Balance</th>
                  <th className="py-2.5 px-4 text-right">Monthly Payment</th>
                  <th className="py-2.5 px-4 text-right">Principal</th>
                  <th className="py-2.5 px-4 text-right">Interest</th>
                  <th className="py-2.5 px-4 text-right">Ending Balance</th>
                  <th className="py-2.5 px-4 text-right">Cum. Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                {filteredMonthlySchedule.map((item) => (
                  <tr key={item.period} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 whitespace-nowrap text-white font-medium">
                      #{item.period}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap text-slate-400">
                      Y{item.year} M{item.month}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap text-emerald-400">
                      {formatPercent(item.effectiveRate, 3)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-slate-300">
                      {formatSGD(item.beginningBalance)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-white font-semibold">
                      {formatSGD(item.monthlyPayment)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-emerald-400">
                      {formatSGD(item.principalPaid)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-slate-400">
                      {formatSGD(item.interestPaid)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-slate-200 font-bold">
                      {formatSGD(item.endingBalance)}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap text-slate-500">
                      {formatSGD(item.totalInterestToDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
