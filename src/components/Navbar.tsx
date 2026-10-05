import React from 'react';
import { RefreshCw, BookOpen, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshRates: () => void;
  isRefreshing: boolean;
  onOpenGuide: () => void;
  onExportCurrent: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRefreshRates,
  isRefreshing,
  onOpenGuide,
  onExportCurrent
}) => {
  const navLinks = [
    { id: 'mortgage', label: 'Mortgage Calculator' },
    { id: 'institutional', label: 'Period Compounding' },
    { id: 'rates', label: 'MAS Rates & Index' },
    { id: 'scenarios', label: 'Sensitivity Matrix' },
    { id: 'amortization', label: 'Payment Ledger' }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SORA Precision
          </span>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-500 border-l border-slate-800 pl-3">
            MAS Benchmark
          </span>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`transition-colors relative py-1 text-sm whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400'
                    : 'hover:text-slate-200'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-md hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            title="SORA Benchmark & MAS Standards Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">MAS Guide</span>
          </button>

          <button
            onClick={onRefreshRates}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-md hover:bg-emerald-900/40 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Refresh latest rates from MAS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync MAS'}</span>
          </button>

          <button
            onClick={onExportCurrent}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer font-sans whitespace-nowrap shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation tab row */}
      <div className="lg:hidden flex overflow-x-auto border-t border-slate-900 px-4 py-2 gap-2 bg-slate-950 no-scrollbar">
        {navLinks.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`px-3 py-1 text-xs whitespace-nowrap rounded-md font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
