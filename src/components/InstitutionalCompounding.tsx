import React, { useState, useMemo } from 'react';
import { CompoundingConfig, MasSoraRecord } from '../types/sora';
import {
  calculateCompoundedSoraInArrears,
  formatSGD,
  formatPercent,
  formatBps
} from '../utils/soraMath';
import { Landmark, ArrowRight, Download, Info, CheckCircle2 } from 'lucide-react';

interface InstitutionalCompoundingProps {
  records: MasSoraRecord[];
}

export const InstitutionalCompounding: React.FC<InstitutionalCompoundingProps> = ({ records }) => {
  // Determine available date range in records
  const latestDate = records[0]?.date || '2026-10-02';
  const defaultStartDate = records[Math.min(60, records.length - 1)]?.date || '2026-07-01';

  const [config, setConfig] = useState<CompoundingConfig>({
    principal: 5_000_000,
    startDate: defaultStartDate,
    endDate: latestDate,
    margin: 0.85,
    convention: 'lookback_with_shift',
    lookbackDays: 5,
    dayCountConvention: 'ACT/365'
  });

  const [filterQuery, setFilterQuery] = useState('');

  // Calculate compounding
  const result = useMemo(() => {
    try {
      return calculateCompoundedSoraInArrears(records, config);
    } catch (e: any) {
      return null;
    }
  }, [records, config]);

  // Quick period presets
  const applyPresetPeriod = (daysBack: number) => {
    const endRec = records[0];
    const startRec = records[Math.min(daysBack, records.length - 1)];
    if (endRec && startRec) {
      setConfig((prev) => ({
        ...prev,
        startDate: startRec.date,
        endDate: endRec.date
      }));
    }
  };

  const handleExportCsv = () => {
    if (!result || !result.dailyRows.length) return;

    const headers = [
      'Date',
      'Day of Week',
      'Lookback Reference Date',
      'Overnight SORA Rate (%)',
      'Weighting Days (n_i)',
      'Daily Factor',
      'Cumulative Compounded Rate (%)',
      'Daily Accrued Interest (SGD)',
      'Cumulative Accrued Interest (SGD)'
    ];

    const rows = result.dailyRows.map((r) => [
      r.date,
      r.dayOfWeek,
      r.referenceDate,
      r.overnightRate.toFixed(4),
      r.weightingDays,
      r.dailyFactor.toFixed(8),
      r.cumulativeCompoundedRate.toFixed(4),
      r.dailyAccruedInterest.toFixed(2),
      r.cumulativeAccruedInterest.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `SORA_Compounding_Ledger_${config.startDate}_to_${config.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = useMemo(() => {
    if (!result) return [];
    if (!filterQuery.trim()) return result.dailyRows;
    const q = filterQuery.toLowerCase();
    return result.dailyRows.filter(
      (r) =>
        r.date.includes(q) ||
        r.dayOfWeek.toLowerCase().includes(q) ||
        r.referenceDate.includes(q)
    );
  }, [result, filterQuery]);

  return (
    <div className="space-y-6">
      {/* Parameter Configuration & Presets Header */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Corporate & Institutional Period Compounding
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ABS/MAS Standard ACT/365 Daily Compounded SORA in Arrears calculation engine
            </p>
          </div>

          {/* Quick period selectors */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 mr-1 text-[11px]">Quick Ranges:</span>
            <button
              onClick={() => applyPresetPeriod(22)}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer font-mono text-[11px]"
            >
              1 Month (~22d)
            </button>
            <button
              onClick={() => applyPresetPeriod(65)}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer font-mono text-[11px]"
            >
              3 Months (~65d)
            </button>
            <button
              onClick={() => applyPresetPeriod(125)}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer font-mono text-[11px]"
            >
              6 Months (~125d)
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Principal Amount */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Facility Principal (SGD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono">S$</span>
              <input
                type="number"
                step={100000}
                min={10000}
                value={config.principal}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, principal: Number(e.target.value) }))
                }
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {formatSGD(config.principal)}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Interest Period Start
            </label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-slate-500 mt-1">Inclusive start date</div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Interest Period End</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-slate-500 mt-1">Payment date (exclusive)</div>
          </div>

          {/* Margin */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Margin / Spread (% p.a.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono">+</span>
              <input
                type="number"
                step={0.05}
                min={0}
                value={config.margin}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, margin: Number(e.target.value) }))
                }
                className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Contractual facility margin</div>
          </div>
        </div>

        {/* Lookback Convention Selector */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Lookback Convention:</span>
            <div className="flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, convention: 'lookback_with_shift' }))
                }
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  config.convention === 'lookback_with_shift'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                5-Day Lookback with Observation Shift
              </button>
              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, convention: 'lookback_no_shift' }))
                }
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  config.convention === 'lookback_no_shift'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                5-Day Lookback without Shift
              </button>
              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, convention: 'plain_compounding' }))
                }
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  config.convention === 'plain_compounding'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Plain Period Compounding
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Singapore Day-Count Convention: <strong>ACT/365</strong></span>
          </div>
        </div>
      </div>

      {/* Calculated Results Summary Grid */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">Compounded SORA Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
              {formatPercent(result.compoundedRateAnnualized, 4)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Annualized across {result.totalCalendarDays} calendar days
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">All-in Floating Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {formatPercent(result.effectiveRateWithMargin, 4)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Includes +{formatPercent(config.margin, 2)} contractual margin
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 ring-1 ring-emerald-500/10">
            <div className="text-xs text-emerald-400 font-medium">Total Interest Payable</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
              {formatSGD(result.totalAccruedInterest, true)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Principal: {formatSGD(config.principal)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-xs text-slate-400">Period Composition</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-200 mt-1">
              {result.businessDaysCount} Biz Days / {result.totalCalendarDays} Cal Days
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>ACT/365 Exact Singapore Base</span>
            </div>
          </div>
        </div>
      )}

      {/* SORA Index Cross-Check Parity Module */}
      {result?.soraIndexComparison && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              MAS SORA Index Dual-Method Reconciliation
            </div>
            <div className="text-slate-400 text-[11px]">
              Verifies daily compounded product against MAS published SORA Index ratio: (Index_end /
              Index_start - 1) * 365 / d
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Start Index:</span>
              <span className="text-slate-300">
                {result.soraIndexComparison.startIndexValue.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">End Index:</span>
              <span className="text-slate-300">
                {result.soraIndexComparison.endIndexValue.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Index Compounded Rate:</span>
              <span className="text-emerald-400 font-semibold">
                {formatPercent(result.soraIndexComparison.indexDerivedCompoundedRate, 4)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Variance:</span>
              <span className="text-slate-300 font-semibold">
                {formatBps(result.soraIndexComparison.deltaBps)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Day-by-Day Compounding Breakdown Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Daily Overnight Compounding Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Detailed breakdown of daily interest factors, weekend weighting, and incremental accrued interest
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search date or day..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-2">Day</th>
                <th className="py-2.5 px-3">Ref Date</th>
                <th className="py-2.5 px-3 text-right">Overnight SORA</th>
                <th className="py-2.5 px-3 text-right">Weight (n_i)</th>
                <th className="py-2.5 px-3 text-right">Daily Factor</th>
                <th className="py-2.5 px-3 text-right">Compounded Rate</th>
                <th className="py-2.5 px-3 text-right">Daily Accrued</th>
                <th className="py-2.5 px-3 text-right">Cumulative Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 font-mono text-slate-300">
              {filteredRows.map((row) => (
                <tr key={row.date} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 whitespace-nowrap text-white font-medium">{row.date}</td>
                  <td className="py-2 px-2 whitespace-nowrap text-slate-400">{row.dayOfWeek}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-slate-500">{row.referenceDate}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-emerald-400 font-semibold">
                    {formatPercent(row.overnightRate, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    {row.weightingDays > 1 ? (
                      <span className="text-amber-400 font-semibold">{row.weightingDays} days</span>
                    ) : (
                      <span>{row.weightingDays} day</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-400">
                    {row.dailyFactor.toFixed(8)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-white">
                    {formatPercent(row.cumulativeCompoundedRate, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-300">
                    {formatSGD(row.dailyAccruedInterest, true)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-emerald-300 font-semibold">
                    {formatSGD(row.cumulativeAccruedInterest, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
