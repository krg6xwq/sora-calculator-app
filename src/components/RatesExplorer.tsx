import React, { useState, useMemo } from 'react';
import { MasSoraRecord } from '../types/sora';
import { formatPercent, formatSGD } from '../utils/soraMath';
import { TrendingUp, Search, Download, Calendar, Layers } from 'lucide-react';

interface RatesExplorerProps {
  records: MasSoraRecord[];
}

export const RatesExplorer: React.FC<RatesExplorerProps> = ({ records }) => {
  const [rangeDays, setRangeDays] = useState<number>(60);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeSeries, setActiveSeries] = useState<'all' | 'overnight' | '3m' | '1m'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sliced chronological data for chart (oldest to newest)
  const chartData = useMemo(() => {
    const subset = records.slice(0, Math.min(rangeDays, records.length));
    return [...subset].reverse();
  }, [records, rangeDays]);

  // Statistics
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const rates = chartData.map((d) => d.sora);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const latest = chartData[chartData.length - 1];
    const first = chartData[0];
    const delta = latest.sora - first.sora;

    return { min, max, avg, latest, delta };
  }, [chartData]);

  // Filtered table records
  const filteredTableRecords = useMemo(() => {
    if (!filterQuery.trim()) return records;
    const q = filterQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.date.includes(q) ||
        r.sora.toString().includes(q) ||
        r.soracomparates_3m.toString().includes(q)
    );
  }, [records, filterQuery]);

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // Min and Max for scaling with padding
  const yMin = useMemo(() => {
    if (!chartData.length) return 3.0;
    const allVals = chartData.flatMap((d) => [d.sora, d.soracomparates_3m, d.soracomparates_1m]);
    return Math.floor(Math.min(...allVals) * 10) / 10 - 0.05;
  }, [chartData]);

  const yMax = useMemo(() => {
    if (!chartData.length) return 4.0;
    const allVals = chartData.flatMap((d) => [d.sora, d.soracomparates_3m, d.soracomparates_1m]);
    return Math.ceil(Math.max(...allVals) * 10) / 10 + 0.05;
  }, [chartData]);

  const getX = (idx: number) => {
    if (chartData.length <= 1) return padding.left;
    return padding.left + (idx / (chartData.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const range = yMax - yMin || 0.01;
    return padding.top + innerHeight - ((val - yMin) / range) * innerHeight;
  };

  // Generate SVG polyline path strings
  const overnightPath = useMemo(() => {
    if (!chartData.length) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.sora).toFixed(1)}`)
      .join(' ');
  }, [chartData, yMin, yMax]);

  const threeMonthPath = useMemo(() => {
    if (!chartData.length) return '';
    return chartData
      .map(
        (d, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.soracomparates_3m).toFixed(1)}`
      )
      .join(' ');
  }, [chartData, yMin, yMax]);

  const oneMonthPath = useMemo(() => {
    if (!chartData.length) return '';
    return chartData
      .map(
        (d, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.soracomparates_1m).toFixed(1)}`
      )
      .join(' ');
  }, [chartData, yMin, yMax]);

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Overnight SORA (%)',
      '1M Compounded SORA (%)',
      '3M Compounded SORA (%)',
      '6M Compounded SORA (%)',
      'MAS SORA Index',
      'Transacted Volume (SGD Millions)'
    ];

    const rows = records.map((r) => [
      r.date,
      r.sora.toFixed(4),
      r.soracomparates_1m.toFixed(4),
      r.soracomparates_3m.toFixed(4),
      r.soracomparates_6m.toFixed(4),
      r.sora_index.toFixed(8),
      r.aggregate_volume
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAS_SORA_Historical_Data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              MAS SORA Rate Trajectory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison of daily Overnight SORA vs 1-Month and 3-Month Compounded Benchmarks
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Series Toggle */}
            <div className="flex rounded-md p-0.5 bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveSeries('all')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeSeries === 'all'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Series
              </button>
              <button
                onClick={() => setActiveSeries('3m')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeSeries === '3m'
                    ? 'bg-slate-800 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3M Benchmark
              </button>
              <button
                onClick={() => setActiveSeries('1m')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeSeries === '1m'
                    ? 'bg-slate-800 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1M SORA
              </button>
              <button
                onClick={() => setActiveSeries('overnight')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  activeSeries === 'overnight'
                    ? 'bg-slate-800 text-cyan-400 font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overnight Only
              </button>
            </div>

            {/* Timeframe Presets */}
            <div className="flex rounded-md p-0.5 bg-slate-950 border border-slate-800 text-xs">
              {[30, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    rangeDays === d
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-level stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="text-slate-400">Period Average:</span>
              <div className="text-base font-bold font-mono tabular-nums text-white mt-0.5">
                {formatPercent(stats.avg, 3)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="text-slate-400">Range Min:</span>
              <div className="text-base font-bold font-mono tabular-nums text-slate-300 mt-0.5">
                {formatPercent(stats.min, 4)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="text-slate-400">Range Max:</span>
              <div className="text-base font-bold font-mono tabular-nums text-slate-300 mt-0.5">
                {formatPercent(stats.max, 4)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="text-slate-400">Period Shift:</span>
              <div
                className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                  stats.delta >= 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {stats.delta >= 0 ? '+' : ''}
                {(stats.delta * 100).toFixed(1)} bps
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
            <span className="text-slate-300">Overnight SORA (Daily)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
            <span className="text-slate-300">3-Month Compounded SORA (Mortgage Standard)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
            <span className="text-slate-300">1-Month Compounded SORA</span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto text-slate-500 font-mono text-[10px]"
            style={{ minHeight: '220px' }}
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = yMin + pct * (yMax - yMin);
              const yPos = getY(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={svgWidth - padding.right}
                    y2={yPos}
                    stroke="currentColor"
                    strokeOpacity={0.15}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    fill="currentColor"
                    className="select-none font-mono"
                  >
                    {yVal.toFixed(2)}%
                  </text>
                </g>
              );
            })}

            {/* X-axis date labels */}
            {chartData.map((d, i) => {
              const step = Math.max(1, Math.floor(chartData.length / 5));
              if (i % step !== 0 && i !== chartData.length - 1) return null;
              return (
                <text
                  key={d.date}
                  x={getX(i)}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill="currentColor"
                  className="select-none text-[9px] font-mono"
                >
                  {d.date.slice(5)}
                </text>
              );
            })}

            {/* Series Paths */}
            {(activeSeries === 'all' || activeSeries === '1m') && (
              <path
                d={oneMonthPath}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.8}
              />
            )}

            {(activeSeries === 'all' || activeSeries === 'overnight') && (
              <path
                d={overnightPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={1.8}
                opacity={0.9}
              />
            )}

            {(activeSeries === 'all' || activeSeries === '3m') && (
              <path
                d={threeMonthPath}
                fill="none"
                stroke="#34d399"
                strokeWidth={2.5}
              />
            )}

            {/* Hover Indicator */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <g>
                <line
                  x1={getX(hoveredIndex)}
                  y1={padding.top}
                  x2={getX(hoveredIndex)}
                  y2={svgHeight - padding.bottom}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(chartData[hoveredIndex].soracomparates_3m)}
                  r={4}
                  fill="#34d399"
                />
              </g>
            )}

            {/* Transparent overlay for mouse hover detection */}
            {chartData.map((_, i) => {
              const xStart = i === 0 ? padding.left : (getX(i - 1) + getX(i)) / 2;
              const xEnd =
                i === chartData.length - 1
                  ? svgWidth - padding.right
                  : (getX(i) + getX(i + 1)) / 2;
              return (
                <rect
                  key={i}
                  x={xStart}
                  y={padding.top}
                  width={xEnd - xStart}
                  height={innerHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Hover Tooltip Card */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <div className="absolute top-2 right-4 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs shadow-lg font-mono pointer-events-none space-y-1">
              <div className="text-slate-400 font-sans font-medium text-[11px]">
                {chartData[hoveredIndex].date}
              </div>
              <div className="text-emerald-400 font-bold">
                3M SORA: {formatPercent(chartData[hoveredIndex].soracomparates_3m, 4)}
              </div>
              <div className="text-cyan-400">
                Overnight: {formatPercent(chartData[hoveredIndex].sora, 4)}
              </div>
              <div className="text-slate-400 text-[10px]">
                Volume: {formatSGD(chartData[hoveredIndex].aggregate_volume * 1_000_000).replace('.00', '')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Data Table Section */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              MAS Benchmark Historical Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Official Monetary Authority of Singapore publication records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Search date or rate..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export History</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="py-2.5 px-3">End of Day</th>
                <th className="py-2.5 px-3 text-right">Overnight SORA</th>
                <th className="py-2.5 px-3 text-right">1M Compounded</th>
                <th className="py-2.5 px-3 text-right">3M Compounded</th>
                <th className="py-2.5 px-3 text-right">6M Compounded</th>
                <th className="py-2.5 px-3 text-right">MAS SORA Index</th>
                <th className="py-2.5 px-3 text-right">Volume (S$M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 font-mono text-slate-300">
              {filteredTableRecords.slice(0, 100).map((r) => (
                <tr key={r.date} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 whitespace-nowrap text-white font-medium">{r.date}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-cyan-400 font-semibold">
                    {formatPercent(r.sora, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-amber-300">
                    {formatPercent(r.soracomparates_1m, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-emerald-400 font-semibold">
                    {formatPercent(r.soracomparates_3m, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-300">
                    {formatPercent(r.soracomparates_6m, 4)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-400">
                    {r.sora_index.toFixed(8)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-200">
                    S$ {r.aggregate_volume.toLocaleString()}M
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
