import React, { useState } from 'react';
import {
  History,
  Search,
  Factory,
  Boxes,
  ShoppingCart,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { AppDatabase, AppLanguage } from '../types';
import { translations } from '../services/translations';
import { StorageService, groupProductionLinesByProduct } from '../services/storage';

interface HistoryViewProps {
  db: AppDatabase;
  storage?: StorageService;
  currentUser?: string;
  language: AppLanguage;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  db,
  storage,
  currentUser = 'Admin',
  language,
}) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';

  const [activeSection, setActiveSection] = useState<
    'production' | 'sales' | 'stock' | 'returns' | 'waste' | 'audit'
  >('production');
  const [searchQuery, setSearchQuery] = useState('');

  // TASK 1: Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Manual deletion from History and Audit');
  const [notificationMsg, setNotificationMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Deleted history IDs set for efficient exclusion
  const deletedIdsSet = new Set(db.settings.deletedHistoryRecordIds || []);

  // Filter records per tab: exclude deleted history entries and apply search
  const visibleProduction = db.productionSessions
    .filter(ps => !deletedIdsSet.has(ps.id))
    .filter(
      ps =>
        !searchQuery ||
        ps.recordCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.shiftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.date.includes(searchQuery)
    );

  const visibleSales = db.sales
    .filter(s => !deletedIdsSet.has(s.id))
    .filter(
      s =>
        !searchQuery ||
        s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.date.includes(searchQuery)
    );

  const visibleStockMovements = db.stockMovements
    .filter(m => !deletedIdsSet.has(m.id))
    .filter(
      m =>
        !searchQuery ||
        m.productNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.movementType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.performedBy.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const visibleReturns = db.returns
    .filter(r => !deletedIdsSet.has(r.id))
    .filter(
      r =>
        !searchQuery ||
        r.returnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerOrSupplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.productNameEn.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const visibleWaste = db.wasteRecords
    .filter(w => !deletedIdsSet.has(w.id))
    .filter(
      w =>
        !searchQuery ||
        w.wasteNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.productNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const visibleAudit = db.activityLogs
    .filter(l => !deletedIdsSet.has(l.id))
    .filter(
      l =>
        !searchQuery ||
        l.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.user.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Get active items list according to current tab
  const getActiveTabItems = () => {
    switch (activeSection) {
      case 'production':
        return visibleProduction;
      case 'sales':
        return visibleSales;
      case 'stock':
        return visibleStockMovements;
      case 'returns':
        return visibleReturns;
      case 'waste':
        return visibleWaste;
      case 'audit':
        return visibleAudit;
      default:
        return [];
    }
  };

  const currentTabItems = getActiveTabItems();
  const allCurrentTabIds = currentTabItems.map((item: any) => item.id);
  const isAllCurrentSelected =
    allCurrentTabIds.length > 0 &&
    allCurrentTabIds.every((id: string) => selectedRecordIds.includes(id));

  // Toggle selection for all visible in current tab
  const handleToggleSelectAll = () => {
    if (isAllCurrentSelected) {
      setSelectedRecordIds(prev => prev.filter(id => !allCurrentTabIds.includes(id)));
    } else {
      setSelectedRecordIds(prev => Array.from(new Set([...prev, ...allCurrentTabIds])));
    }
  };

  // Toggle selection for a single record
  const handleToggleRecordSelect = (id: string) => {
    setSelectedRecordIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Switch tabs and optionally maintain selection
  const handleTabChange = (
    tab: 'production' | 'sales' | 'stock' | 'returns' | 'waste' | 'audit'
  ) => {
    setActiveSection(tab);
  };

  // Trigger single-record delete confirmation
  const handleDeleteSingleRecord = (id: string) => {
    setSelectedRecordIds([id]);
    setIsDeleteConfirmOpen(true);
  };

  // Execute deletion of selected history records
  const handleConfirmDelete = () => {
    if (selectedRecordIds.length === 0) return;
    if (!storage) {
      setNotificationMsg({
        type: 'error',
        text: 'Storage service is not available to perform deletion.',
      });
      return;
    }

    try {
      const prodIds = selectedRecordIds.filter(id =>
        db.productionSessions.some(ps => ps.id === id)
      );
      const otherIds = selectedRecordIds.filter(
        id => !db.productionSessions.some(ps => ps.id === id)
      );

      let archivedProdCount = 0;
      if (prodIds.length > 0) {
        archivedProdCount = storage.archiveProductionSessions(
          prodIds,
          currentUser,
          deleteReason || 'Deleted from Production History'
        );
      }

      let deletedOtherCount = 0;
      let protectedCount = 0;
      if (otherIds.length > 0) {
        const res = storage.deleteHistoryRecords(otherIds, currentUser, deleteReason);
        deletedOtherCount = res.deletedCount;
        protectedCount = res.protectedCount;
      }

      let successMsg = '';
      if (archivedProdCount > 0 && deletedOtherCount === 0) {
        successMsg = `Successfully moved ${archivedProdCount} production record(s) to the Recycle Bin.`;
      } else {
        successMsg = `Successfully removed ${archivedProdCount + deletedOtherCount} record(s) (${archivedProdCount} moved to Recycle Bin).`;
        if (protectedCount > 0) {
          successMsg += ` (${protectedCount} compliance security log(s) remained immutable).`;
        }
      }

      setNotificationMsg({
        type: 'success',
        text: successMsg,
      });

      setSelectedRecordIds([]);
      setIsSelectionMode(false);
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      setNotificationMsg({
        type: 'error',
        text: err.message || 'Error occurred while deleting history records.',
      });
    }
  };

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

        {/* Global Notification Banner */}
        {notificationMsg && (
          <div
            className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-xs max-w-xl ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{notificationMsg.text}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Subsections Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'production', label: 'Production Shifts', icon: Factory, count: visibleProduction.length },
          { key: 'sales', label: 'Sales Register', icon: ShoppingCart, count: visibleSales.length },
          { key: 'stock', label: 'Stock Ledger Movements', icon: Boxes, count: visibleStockMovements.length },
          { key: 'returns', label: 'Returns Log', icon: RotateCcw, count: visibleReturns.length },
          { key: 'waste', label: 'Waste Log', icon: Trash2, count: visibleWaste.length },
          { key: 'audit', label: 'System Audit Trail', icon: ShieldCheck, count: visibleAudit.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
        {/* Top Controls: Search Bar & Selection Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search historical records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Selection Actions: Select All, Clear Selection, Selected Count, Delete Selected */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAllCurrentSelected ? 'Clear Selection' : 'Select All'}</span>
            </button>

            {selectedRecordIds.length > 0 && (
              <>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  {selectedRecordIds.length} Selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds([])}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-98 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRecordIds.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 1: Production Shifts */}
        {activeSection === 'production' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Record Code</th>
                  <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-3 font-semibold">Shift & Times</th>
                  <th className="py-2.5 px-3 font-semibold">Duration</th>
                  <th className="py-2.5 px-3 font-semibold">Products & Bag Sizes</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                  <th className="py-2.5 px-3 font-semibold">Recorded By</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleProduction.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No production history records found.
                    </td>
                  </tr>
                ) : (
                  visibleProduction.map(ps => {
                    const isSelected = selectedRecordIds.includes(ps.id);
                    const groupedProducts =
                      ps.productEntries && ps.productEntries.length > 0
                        ? ps.productEntries
                        : groupProductionLinesByProduct(ps.lines);

                    return (
                      <tr
                        key={ps.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRecordSelect(ps.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 mt-1"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white align-top">
                          {ps.recordCode}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 align-top">{ps.date}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white align-top">
                          {ps.shiftName} ({ps.startTime} - {ps.endTime})
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-600 align-top">{ps.durationFormatted}</td>
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1.5">
                            {groupedProducts.map(gp => (
                              <div key={gp.productId} className="text-xs">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {gp.productNameEn}
                                </div>
                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                                  {gp.sizes.map(sz => (
                                    <div key={sz.bagSizeKg}>
                                      {sz.bagSizeKg} KG — {sz.bagCount} bags
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white align-top">
                          {ps.totalBags}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 align-top">
                          {ps.totalWeightKg.toLocaleString()} kg
                        </td>
                        <td className="py-3 px-3 text-slate-500 align-top">{ps.createdBy}</td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate align-top">{ps.notes || '—'}</td>
                        <td className="py-3 px-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleRecord(ps.id)}
                            title="Delete and move to Recycle Bin"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
                  {isSelectionMode && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
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
                {visibleSales.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 9 : 8} className="py-8 text-center text-slate-400">
                      No sales history records logged.
                    </td>
                  </tr>
                ) : (
                  visibleSales.map(s => {
                    const isSelected = selectedRecordIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRecordSelect(s.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {s.invoiceNo}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{s.date}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {s.customerName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {s.totalBags}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {s.totalWeightKg.toLocaleString()} kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600">
                          {currency} {s.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{s.createdBy}</td>
                      </tr>
                    );
                  })
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
                  {isSelectionMode && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
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
                {visibleStockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 9 : 8} className="py-8 text-center text-slate-400">
                      No stock movement records found.
                    </td>
                  </tr>
                ) : (
                  visibleStockMovements.map(m => {
                    const isSelected = selectedRecordIds.includes(m.id);
                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRecordSelect(m.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
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
                          {m.changeWeightKg >= 0
                            ? `+${m.changeWeightKg.toLocaleString()}`
                            : m.changeWeightKg.toLocaleString()}{' '}
                          kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {m.balanceBagsAfter} bags
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                          {m.referenceType || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{m.performedBy}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Returns Log */}
        {activeSection === 'returns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  {isSelectionMode && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-3 font-semibold">Return No</th>
                  <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-3 font-semibold">Customer / Type</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Bags</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Weight</th>
                  <th className="py-2.5 px-3 font-semibold">Condition</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleReturns.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 9 : 8} className="py-8 text-center text-slate-400">
                      No return records logged.
                    </td>
                  </tr>
                ) : (
                  visibleReturns.map(r => {
                    const isSelected = selectedRecordIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRecordSelect(r.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {r.returnNo}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{r.date}</td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                          {r.customerOrSupplierName} ({r.returnType})
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {r.productNameEn} ({r.bagSizeKg}kg)
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {r.returnedBags}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {r.returnedWeightKg.toLocaleString()} kg
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800">
                            {r.condition}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{r.createdBy}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Waste Log */}
        {activeSection === 'waste' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  {isSelectionMode && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-3 font-semibold">Waste No</th>
                  <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Bags</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Weight</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Reason</th>
                  <th className="py-2.5 px-3 font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleWaste.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 9 : 8} className="py-8 text-center text-slate-400">
                      No waste records logged.
                    </td>
                  </tr>
                ) : (
                  visibleWaste.map(w => {
                    const isSelected = selectedRecordIds.includes(w.id);
                    return (
                      <tr
                        key={w.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRecordSelect(w.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {w.wasteNo}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{w.date}</td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                          {w.productNameEn} ({w.bagSizeKg}kg)
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                          {w.bags}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {w.weightKg.toLocaleString()} kg
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800">
                            {w.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{w.reason}</td>
                        <td className="py-3 px-3 text-slate-500">{w.recordedBy}</td>
                      </tr>
                    );
                  })
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
                  {isSelectionMode && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Action Type</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleAudit.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="py-8 text-center text-slate-400">
                      No audit trail logs found.
                    </td>
                  </tr>
                ) : (
                  visibleAudit.map(log => {
                    const isSelected = selectedRecordIds.includes(log.id);
                    const isSecurityComplianceLog =
                      log.eventType.toLowerCase().includes('security') ||
                      log.eventType.toLowerCase().includes('pin') ||
                      log.eventType.toLowerCase().includes('role') ||
                      log.eventType.toLowerCase().includes('lock') ||
                      log.eventType.toLowerCase().includes('auth') ||
                      log.eventType.toLowerCase().includes('user blocked') ||
                      log.eventType.toLowerCase().includes('user added');

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="py-3 px-3 text-center">
                            {isSecurityComplianceLog ? (
                              <span title="Immutable security compliance log cannot be deleted" className="text-slate-400">
                                🔒
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRecordSelect(log.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            )}
                          </td>
                        )}
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{log.eventType}</span>
                          {isSecurityComplianceLog && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                              Immutable
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                          {log.user}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {log.description}
                        </td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TASK 1 Step 3: Deletion Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Selected History Records?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Warning and Safety Rules */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Recycle Bin & Data Protection Notice:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Are you sure you want to delete the selected production record(s)? They will be moved to the <strong>Recycle Bin</strong> where you can restore them or permanently delete them at any time.
              </p>
            </div>

            {/* Selected Count & Summary */}
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selected Records for Removal: <span className="font-mono text-rose-600 font-bold">{selectedRecordIds.length}</span> record(s)
            </div>

            {/* List Preview */}
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40 text-xs">
              {selectedRecordIds.map(id => {
                // Find matching record across categories for helpful preview
                const prod = db.productionSessions.find(p => p.id === id);
                if (prod) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-mono font-bold text-blue-600">{prod.recordCode}</span>
                      <span className="text-slate-500">{prod.date} · {prod.shiftName} ({prod.totalBags} bags)</span>
                    </div>
                  );
                }
                const sale = db.sales.find(s => s.id === id);
                if (sale) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-mono font-bold text-indigo-600">{sale.invoiceNo}</span>
                      <span className="text-slate-500">{sale.customerName} · {sale.date}</span>
                    </div>
                  );
                }
                const sm = db.stockMovements.find(m => m.id === id);
                if (sm) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{sm.productNameEn}</span>
                      <span className="text-slate-500">{sm.movementType} · {sm.changeBags} bags</span>
                    </div>
                  );
                }
                const ret = db.returns.find(r => r.id === id);
                if (ret) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-mono font-bold">{ret.returnNo}</span>
                      <span className="text-slate-500">{ret.customerOrSupplierName} · {ret.returnedBags} bags</span>
                    </div>
                  );
                }
                const wst = db.wasteRecords.find(w => w.id === id);
                if (wst) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-mono font-bold">{wst.wasteNo}</span>
                      <span className="text-slate-500">{wst.category} · {wst.bags} bags</span>
                    </div>
                  );
                }
                const act = db.activityLogs.find(a => a.id === id);
                if (act) {
                  return (
                    <div key={id} className="py-1.5 px-2 flex justify-between">
                      <span className="font-bold">{act.eventType}</span>
                      <span className="text-slate-500 truncate max-w-xs">{act.description}</span>
                    </div>
                  );
                }
                return (
                  <div key={id} className="py-1.5 px-2 font-mono text-slate-400">
                    ID: {id}
                  </div>
                );
              })}
            </div>

            {/* Optional Reason Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for History Removal *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Audit view cleanup, redundant test entries"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 active:scale-98 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete ({selectedRecordIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
