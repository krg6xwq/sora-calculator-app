import React from 'react';
import { X, BookOpen, CheckCircle, Scale, Clock, ShieldAlert } from 'lucide-react';

interface SoraEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoraEducationModal: React.FC<SoraEducationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-300 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MAS SORA Benchmark Reference Guide</h2>
              <p className="text-xs text-slate-400">
                Official Monetary Authority of Singapore conventions, formulas, and regulatory limits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Modules */}
        <div className="space-y-5 text-xs leading-relaxed">
          {/* Section 1: What is SORA */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              1. What is SORA?
            </h3>
            <p className="text-slate-400">
              The <strong>Singapore Overnight Rate Average (SORA)</strong> is the volume-weighted average rate of unsecured overnight interbank SGD cash transactions brokered in Singapore between 8:00 AM and 6:15 PM SGT. It is administered and published by the <strong>Monetary Authority of Singapore (MAS)</strong> every business day at approximately <strong>9:00 AM SGT</strong> for the preceding business day.
            </p>
          </div>

          {/* Section 2: Compounded in Advance vs Arrears */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              2. Compounding Conventions: In Advance vs In Arrears
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-semibold text-emerald-400">Compounded in Advance (Retail Standard)</span>
                <p className="text-slate-400 text-[11px]">
                  Uses MAS published 1-month, 3-month, or 6-month compounded SORA rates established on the rate reset date. This provides homeowners with certainty on their monthly installment before the payment month begins.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-semibold text-cyan-400">Compounded in Arrears (Institutional Standard)</span>
                <p className="text-slate-400 text-[11px]">
                  Calculates exact daily interest by compounding each day's actual overnight SORA over the interest period (using a 5-day lookback with observation shift). Used in corporate syndicated loans, commercial real estate, and derivatives.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: The ACT/365 Day Count Convention */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              3. Day Count Convention: ACT/365 (Singapore Currency Standard)
            </h3>
            <p className="text-slate-400">
              Unlike US Dollar markets which use ACT/360, Singapore financial instruments adhere strictly to <strong>ACT/365</strong>. Interest is accrued on actual calendar days divided by 365, with Friday overnight rates applying across Saturday and Sunday ($n_i = 3$).
            </p>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800">
              Interest = Principal × [(Compounded SORA + Spread) / 100] × (Days / 365)
            </div>
          </div>

          {/* Section 4: MAS Regulatory Limits */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              4. MAS Housing Loan Regulations & Stress Testing
            </h3>
            <div className="space-y-2 pt-1 text-[11px]">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Total Debt Servicing Ratio (TDSR):</strong> Capped at <strong>55%</strong> of borrower gross monthly income for all property loans (MAS Notice 645).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Mandatory Stress Test Rate:</strong> Under MAS guidelines, banks must compute debt servicing capacity using a minimum benchmark of <strong>4.00% p.a.</strong> for residential properties.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Mortgage Servicing Ratio (MSR):</strong> Capped at <strong>30%</strong> of gross income for HDB flats and new Executive Condominiums (ECs).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Loan-To-Value (LTV) Limit:</strong> Maximum <strong>75%</strong> financing from financial institutions for first residential housing loans.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
