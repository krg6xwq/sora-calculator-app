import React from 'react';
import { MasSoraRecord } from '../types/sora';
import { formatPercent, formatSGD } from '../utils/soraMath';

interface RateSummaryTickerProps {
  latestRecord: MasSoraRecord;
  source: 'live_mas_api' | 'verified_mas_cache';
  lastUpdated: string;
}

export const RateSummaryTicker: React.FC<RateSummaryTickerProps> = ({
  latestRecord,
  source,
  lastUpdated
}) => {
  return (
    <section className="border-b border-slate-800/80 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Source metadata row without pills */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Monetary Authority of Singapore (MAS) Benchmark</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Date: {latestRecord.date}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Volume-Weighted Unsecured Overnight SGD</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">
              {source === 'live_mas_api' ? 'Official MAS Live Stream' : 'MAS Verified Benchmark Series'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{lastUpdated}</span>
          </div>
        </div>

        {/* High-density financial metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Metric 1: Overnight SORA */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Overnight SORA</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-0.5">
              {formatPercent(latestRecord.sora, 4)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Daily interbank rate</div>
          </div>

          {/* Metric 2: 1-Month Compounded */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">1-Month SORA</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
              {formatPercent(latestRecord.soracomparates_1m, 4)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Compounded 30 days</div>
          </div>

          {/* Metric 3: 3-Month Compounded (Benchmark) */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/30 ring-1 ring-emerald-500/20">
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span>3-Month SORA</span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Benchmark</span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-300 mt-0.5">
              {formatPercent(latestRecord.soracomparates_3m, 4)}
            </div>
            <div className="text-[11px] text-emerald-400/70 mt-1">Retail mortgage standard</div>
          </div>

          {/* Metric 4: 6-Month Compounded */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">6-Month SORA</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-0.5">
              {formatPercent(latestRecord.soracomparates_6m, 4)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Compounded 180 days</div>
          </div>

          {/* Metric 5: SORA Index */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">MAS SORA Index</div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-200 mt-1">
              {latestRecord.sora_index.toFixed(6)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Base: 1.0000 (Jan 2020)</div>
          </div>

          {/* Metric 6: Aggregate Volume */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400">Daily Transacted</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-0.5">
              {formatSGD(latestRecord.aggregate_volume * 1_000_000).replace('.00', '')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">MAS brokered market</div>
          </div>
        </div>
      </div>
    </section>
  );
};
