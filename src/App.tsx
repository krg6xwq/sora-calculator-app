/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MasSoraRecord, LoanConfig, TdsrConfig } from './types/sora';
import { MAS_HISTORICAL_SORA_DATA, LATEST_MAS_SORA } from './data/masHistoricalRates';
import { fetchMasSoraRates } from './services/masApiService';
import { Navbar } from './components/Navbar';
import { RateSummaryTicker } from './components/RateSummaryTicker';
import { MortgageCalculator } from './components/MortgageCalculator';
import { InstitutionalCompounding } from './components/InstitutionalCompounding';
import { RatesExplorer } from './components/RatesExplorer';
import { ScenarioAnalysis } from './components/ScenarioAnalysis';
import { AmortizationTable } from './components/AmortizationTable';
import { SoraEducationModal } from './components/SoraEducationModal';
import { generateAmortizationSchedule } from './utils/soraMath';

export default function App() {
  const [records, setRecords] = useState<MasSoraRecord[]>(MAS_HISTORICAL_SORA_DATA);
  const [source, setSource] = useState<'live_mas_api' | 'verified_mas_cache'>('verified_mas_cache');
  const [lastUpdated, setLastUpdated] = useState<string>('09:00 SGT (MAS Publication Standard)');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('mortgage');
  const [isEducationOpen, setIsEducationOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Default Singapore retail property loan parameters (typical SGD 1.6M condo or HDB executive)
  const [loanConfig, setLoanConfig] = useState<LoanConfig>({
    propertyPrice: 1_600_000,
    loanAmount: 1_200_000, // 75% LTV
    tenureYears: 25,
    benchmarkType: '3M', // 3M Compounded SORA is the market default for Singapore mortgages
    customBenchmarkRate: 3.50,
    spreadType: 'tiered',
    flatSpread: 0.70,
    tieredSpreads: {
      year1: 0.65,
      year2: 0.75,
      year3Onwards: 0.85
    },
    repaymentType: 'amortizing',
    interestOnlyYears: 0
  });

  // Singapore MAS TDSR & MSR settings
  const [tdsrConfig, setTdsrConfig] = useState<TdsrConfig>({
    borrowerGrossIncome: 12_000,
    coBorrowerGrossIncome: 6_000,
    otherMonthlyDebt: 800, // car loan / credit card commitments
    isHdbOrEc: false,
    stressTestRate: 4.00 // MAS Notice 645 benchmark
  });

  // Show temporary toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Fetch latest MAS rates
  const loadRates = useCallback(async (isManual: boolean = false) => {
    setIsRefreshing(true);
    try {
      const result = await fetchMasSoraRates();
      setRecords(result.records);
      setSource(result.source);
      setLastUpdated(result.lastUpdated);
      if (isManual) {
        showToast(
          result.source === 'live_mas_api'
            ? 'Successfully synced live rates from MAS DataStore API'
            : 'Synchronized with verified MAS benchmark rate records'
        );
      }
    } catch (err) {
      if (isManual) {
        showToast('Using verified MAS benchmark rate dataset');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRates(false);
  }, [loadRates]);

  const latestRecord = records[0] || LATEST_MAS_SORA;

  // Active benchmark rate for export
  const activeBenchmarkRate =
    loanConfig.benchmarkType === '1M'
      ? latestRecord.soracomparates_1m
      : loanConfig.benchmarkType === '6M'
      ? latestRecord.soracomparates_6m
      : latestRecord.soracomparates_3m;

  // Global CSV Export Handler
  const handleExportCurrent = () => {
    const results = generateAmortizationSchedule(loanConfig, activeBenchmarkRate);
    const headers = [
      'Period',
      'Year',
      'Month',
      'Beginning Balance (SGD)',
      'Monthly Payment (SGD)',
      'Principal Paid (SGD)',
      'Interest Paid (SGD)',
      'Ending Balance (SGD)',
      'Effective Rate (%)'
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
      item.effectiveRate.toFixed(4)
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SORA_Loan_Schedule_${loanConfig.loanAmount}_${loanConfig.tenureYears}Y.csv`;
    link.click();
    showToast('Downloaded SORA Amortization CSV');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-xl flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract (3 Zones) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshRates={() => loadRates(true)}
        isRefreshing={isRefreshing}
        onOpenGuide={() => setIsEducationOpen(true)}
        onExportCurrent={handleExportCurrent}
      />

      {/* MAS Key Rates Ticker */}
      <RateSummaryTicker
        latestRecord={latestRecord}
        source={source}
        lastUpdated={lastUpdated}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'mortgage' && (
          <MortgageCalculator
            latestRecord={latestRecord}
            loanConfig={loanConfig}
            setLoanConfig={setLoanConfig}
            tdsrConfig={tdsrConfig}
            setTdsrConfig={setTdsrConfig}
            onViewAmortization={() => setActiveTab('amortization')}
          />
        )}

        {activeTab === 'institutional' && (
          <InstitutionalCompounding records={records} />
        )}

        {activeTab === 'rates' && <RatesExplorer records={records} />}

        {activeTab === 'scenarios' && (
          <ScenarioAnalysis
            latestRecord={latestRecord}
            loanConfig={loanConfig}
          />
        )}

        {activeTab === 'amortization' && (
          <AmortizationTable
            latestRecord={latestRecord}
            loanConfig={loanConfig}
          />
        )}
      </main>

      {/* MAS Education & Conventions Modal */}
      <SoraEducationModal
        isOpen={isEducationOpen}
        onClose={() => setIsEducationOpen(false)}
      />

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-slate-400 font-medium">SORA Precision</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Monetary Authority of Singapore (MAS) Benchmark</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>ACT/365 Day-Count Standard</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>MAS Notice 645 TDSR 55% Compliance</span>
          </div>

          <div className="text-slate-600 text-[11px]">
            Financial analytics and reference tool for Singapore property loans and interbank SORA benchmark calculation.
          </div>
        </div>
      </footer>
    </div>
  );
}
