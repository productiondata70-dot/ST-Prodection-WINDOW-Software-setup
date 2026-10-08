import React, { useState } from 'react';
import {
  Factory,
  Boxes,
  ShoppingCart,
  Receipt,
  Scale,
  Calendar,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { AppDatabase, ModuleKey, AppLanguage } from '../types';
import { translations } from '../services/translations';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (module: ModuleKey) => void;
  language: AppLanguage;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ db, onNavigate, language }) => {
  const t = translations[language] || translations.en;
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);
  const currency = db.profile?.currency || 'PKR';

  // Overall Statistics calculations
  const totalProductionWeight = db.productionSessions.reduce((acc, p) => acc + p.totalWeightKg, 0);
  const totalProductionBags = db.productionSessions.reduce((acc, p) => acc + p.totalBags, 0);

  const availableStockWeight = db.stockBalances.reduce((acc, s) => acc + s.availableWeightKg, 0);
  const availableStockBags = db.stockBalances.reduce((acc, s) => acc + s.availableBags, 0);

  const completedSales = db.sales.filter(s => s.status === 'completed');
  const totalSalesCount = completedSales.length;
  const totalSalesValue = completedSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalSalesBags = completedSales.reduce((acc, s) => acc + s.totalBags, 0);

  // Today's entries
  const todaySessions = db.productionSessions.filter(p => p.date === todayStr);
  const todayProductionWeight = todaySessions.reduce((acc, p) => acc + p.totalWeightKg, 0);
  const todayProductionBags = todaySessions.reduce((acc, p) => acc + p.totalBags, 0);

  const todaySalesList = completedSales.filter(s => s.date === todayStr);
  const todaySalesValue = todaySalesList.reduce((acc, s) => acc + s.grandTotal, 0);
  const todaySalesBags = todaySalesList.reduce((acc, s) => acc + s.totalBags, 0);

  // Latest Shift Breakdown (most recent session or active products breakdown)
  const latestSession = db.productionSessions[0];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {db.profile?.businessName || t.appName}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 uppercase">
              {db.profile?.businessType ? db.profile.businessType.replace('_', ' ') : 'Production Facility'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time flour mill operations, bag counting, production percentages, and inventory ledger.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('production')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.newProduction}</span>
          </button>
          <button
            onClick={() => onNavigate('stock')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <Boxes className="w-4 h-4 text-emerald-600" />
            <span>{t.stockUpdate}</span>
          </button>
          <button
            onClick={() => onNavigate('sales')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <span>{t.saleEntry}</span>
          </button>
          <button
            onClick={() => onNavigate('pdf_center')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>{t.reports}</span>
          </button>
        </div>
      </div>

      {/* Main Statistics Cards (Section 4.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Production Weight */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{t.totalProductionWeight}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalProductionWeight.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Production Volume:</span>
            <strong className="text-slate-700 dark:text-slate-300 font-mono">
              {(totalProductionWeight / 1000).toFixed(2)} Metric Tons
            </strong>
          </div>
        </div>

        {/* Total Production Bags */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{t.totalProductionBags}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalProductionBags.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">{t.bags}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Sessions Recorded:</span>
            <strong className="text-slate-700 dark:text-slate-300">{db.productionSessions.length} shifts</strong>
          </div>
        </div>

        {/* Available Stock */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{t.availableStockBags}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {availableStockBags.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">{t.bags} in Mill</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Total Weight:</span>
            <strong className="text-slate-700 dark:text-slate-300 font-mono">
              {availableStockWeight.toLocaleString()} kg
            </strong>
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{t.totalSalesValue}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-bold text-slate-400">{currency}</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalSalesValue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Dispatched:</span>
            <strong className="text-slate-700 dark:text-slate-300 font-mono">{totalSalesBags} bags ({totalSalesCount} invoices)</strong>
          </div>
        </div>
      </div>

      {/* Today's Operational Summary (Section 4.4) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.todaySummary} ({new Date().toLocaleDateString('en-GB')})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {todaySessions.length} shifts · {todaySalesList.length} sales
          </span>
        </div>

        {todaySessions.length === 0 && todaySalesList.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.noRecordsToday}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start by recording a production shift or entering stock and customer sales.
            </p>
            <button
              onClick={() => onNavigate('production')}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              {t.logFirstProduction}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.todayProduction} (Weight)</span>
              <div className="text-lg font-bold font-mono text-blue-600 mt-1">
                {todayProductionWeight.toLocaleString()} kg
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.todayProduction} (Bags)</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">
                {todayProductionBags.toLocaleString()} bags
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.todaySales} (Value)</span>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                {currency} {todaySalesValue.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.todaySales} (Bags Dispatched)</span>
              <div className="text-lg font-bold font-mono text-purple-600 mt-1">
                {todaySalesBags.toLocaleString()} bags
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Shift Product Breakdown (Section 4.5) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.currentShiftBreakdown}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {latestSession
                ? `Latest Session: ${latestSession.recordCode} (${latestSession.shiftName} - ${latestSession.date})`
                : 'All configured product lines & live inventory balances'}
            </p>
          </div>
          {latestSession && (
            <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
              Duration: {latestSession.durationFormatted} ({latestSession.startTime} - {latestSession.endTime})
            </span>
          )}
        </div>

        {/* Product Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">{t.product}</th>
                <th className="py-2.5 px-3 font-semibold">{t.category}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bagSize}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.percentage}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.stockRemaining}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {latestSession && latestSession.lines.length > 0 ? (
                latestSession.lines.map((line, idx) => {
                  const balance = db.stockBalances.find(
                    b => b.productId === line.productId && b.bagSizeKg === line.bagSizeKg
                  );

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{line.productNameEn}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">
                            {line.productNameUr}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">Flour / Product</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{line.bagSizeKg} kg</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {line.bagCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {line.totalWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {line.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {balance ? `${balance.availableBags} bags` : '0 bags'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                db.products.map(prod => {
                  const defaultSize = prod.bagSizes[0] || 50;
                  const balance = db.stockBalances.find(
                    b => b.productId === prod.id && b.bagSizeKg === defaultSize
                  );

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{prod.nameEn}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">
                            {prod.nameUr}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{prod.category}</td>
                      <td className="py-3 px-3 text-right font-mono">{defaultSize} kg</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">0</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">0 kg</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">0.0%</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {balance ? `${balance.availableBags} bags` : '0 bags'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-800 font-bold bg-slate-50/60 dark:bg-slate-800/40 text-slate-900 dark:text-white">
                <td className="py-3 px-3" colSpan={3}>
                  {t.total}
                </td>
                <td className="py-3 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                  {latestSession ? latestSession.totalBags : 0} bags
                </td>
                <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {latestSession ? latestSession.totalWeightKg.toLocaleString() : 0} kg
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                  {latestSession && latestSession.totalWeightKg > 0 ? '100%' : '0%'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {availableStockBags} bags total
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
