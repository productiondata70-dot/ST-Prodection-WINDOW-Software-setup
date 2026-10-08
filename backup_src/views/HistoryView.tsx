import React, { useState } from 'react';
import {
  History,
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  Factory,
  Boxes,
  ShoppingCart,
  RotateCcw,
  Trash2,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import { AppDatabase, AppLanguage } from '../types';
import { translations } from '../services/translations';

interface HistoryViewProps {
  db: AppDatabase;
  language: AppLanguage;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ db, language }) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';

  const [activeSection, setActiveSection] = useState<
    'production' | 'sales' | 'stock' | 'returns' | 'waste' | 'audit' | 'backup'
  >('production');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.history} (تاریخچہ و آڈٹ ریکارڈ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete append-only audit trail and chronological transaction log across all business modules.
          </p>
        </div>
      </div>

      {/* Subsections Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'production', label: 'Production Shifts', icon: Factory, count: db.productionSessions.length },
          { key: 'sales', label: 'Sales Register', icon: ShoppingCart, count: db.sales.length },
          { key: 'stock', label: 'Stock Ledger Movements', icon: Boxes, count: db.stockMovements.length },
          { key: 'returns', label: 'Returns Log', icon: RotateCcw, count: db.returns.length },
          { key: 'waste', label: 'Waste Log', icon: Trash2, count: db.wasteRecords.length },
          { key: 'audit', label: 'System Audit Trail', icon: ShieldCheck, count: db.activityLogs.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Filter & Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search historical records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">Records preserved in local persistent storage</span>
        </div>

        {/* Section 1: Production Shifts */}
        {activeSection === 'production' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Record Code</th>
                  <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-3 font-semibold">Shift & Times</th>
                  <th className="py-2.5 px-3 font-semibold">Duration</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                  <th className="py-2.5 px-3 font-semibold">Recorded By</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {db.productionSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No production records found.</td>
                  </tr>
                ) : (
                  db.productionSessions.map(ps => (
                    <tr key={ps.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{ps.recordCode}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{ps.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {ps.shiftName} ({ps.startTime} - {ps.endTime})
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600">{ps.durationFormatted}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{ps.totalBags}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">{ps.totalWeightKg.toLocaleString()} kg</td>
                      <td className="py-3 px-3 text-slate-500">{ps.createdBy}</td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{ps.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Sales Register */}
        {activeSection === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.grandTotal}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {db.sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No sales transactions logged.</td>
                  </tr>
                ) : (
                  db.sales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{s.invoiceNo}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{s.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{s.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{s.totalBags}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{s.totalWeightKg.toLocaleString()} kg</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600">
                        {currency} {s.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{s.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 3: Stock Ledger Movements */}
        {activeSection === 'stock' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Change Bags</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Change Weight</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Balance After</th>
                  <th className="py-2.5 px-3 font-semibold">Reference</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {db.stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No stock movements recorded.</td>
                  </tr>
                ) : (
                  db.stockMovements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800">
                          {m.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {m.productNameEn} ({m.bagSizeKg}kg)
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold ${
                          m.changeBags >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.changeBags >= 0 ? `+${m.changeBags}` : m.changeBags}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold ${
                          m.changeWeightKg >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.changeWeightKg >= 0 ? `+${m.changeWeightKg.toLocaleString()}` : m.changeWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {m.balanceBagsAfter} bags
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{m.referenceType || '—'}</td>
                      <td className="py-3 px-3 text-slate-500">{m.performedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 6: Audit Trail */}
        {activeSection === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Action Type</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {db.activityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{log.eventType}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{log.user}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{log.description}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.result === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.result === 'warning'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
