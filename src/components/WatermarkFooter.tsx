import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { AppDatabase } from '../types';

interface WatermarkFooterProps {
  db: AppDatabase;
}

export const WatermarkFooter: React.FC<WatermarkFooterProps> = ({ db }) => {
  const totalProductionEntries = db.productionSessions.length;
  const totalSalesCount = db.sales.length;
  const totalStockItems = db.stockBalances.length;

  return (
    <footer className="h-7 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none shrink-0 z-20 transition-colors">
      {/* Left: System Status & Metrics */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <Database className="w-3 h-3 text-emerald-500" />
          <span>Local DB Active (v{db.schemaVersion})</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="hidden sm:inline">
          Prod: <strong className="text-slate-700 dark:text-slate-200">{totalProductionEntries}</strong> ·
          Sales: <strong className="text-slate-700 dark:text-slate-200">{totalSalesCount}</strong> ·
          Stock SKUs: <strong className="text-slate-700 dark:text-slate-200">{totalStockItems}</strong>
        </span>
        <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
        <div className="hidden md:flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3 h-3" />
          <span>Secured</span>
        </div>
      </div>

      {/* Right: Developer Branding & Official Watermark */}
      <div className="flex items-center gap-2 font-medium">
        <span className="text-slate-700 dark:text-slate-300">
          ST Software & Apps developers Company
        </span>
      </div>
    </footer>
  );
};
