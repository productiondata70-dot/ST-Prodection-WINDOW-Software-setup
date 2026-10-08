import React, { useState } from 'react';
import {
  Trash2,
  Recycle,
  Plus,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { AppDatabase, WasteRecord, RecycleBinItem, AppLanguage } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

interface WasteRecycleViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onRequestPinAuth: (action: () => void) => void;
  language: AppLanguage;
}

export const WasteRecycleView: React.FC<WasteRecycleViewProps> = ({
  db,
  storage,
  currentUser,
  onRequestPinAuth,
  language,
}) => {
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState<'waste' | 'recycle'>('waste');
  const [isAddWasteOpen, setIsAddWasteOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Waste Form State
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedProdId, setSelectedProdId] = useState(db.products[0]?.id || '');
  const [selectedBagSize, setSelectedBagSize] = useState<number>(50);
  const [wasteBags, setWasteBags] = useState<string>('');
  const [wasteCategory, setWasteCategory] = useState<WasteRecord['category']>('spillage');
  const [wasteReason, setWasteReason] = useState('');
  const [wasteNotes, setWasteNotes] = useState('');

  const handleAddWaste = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    const count = parseInt(wasteBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid bag count for waste.' });
      return;
    }

    const prod = db.products.find(p => p.id === selectedProdId);
    if (!prod) {
      setNotificationMsg({ type: 'error', text: 'Selected product not found.' });
      return;
    }

    const weightKg = count * selectedBagSize;

    try {
      const wst = storage.addWaste(
        {
          date: wasteDate,
          productId: prod.id,
          productNameEn: prod.nameEn,
          productNameUr: prod.nameUr,
          bagSizeKg: selectedBagSize,
          bags: count,
          weightKg,
          category: wasteCategory,
          reason: wasteReason.trim(),
          notes: wasteNotes.trim(),
          recordedBy: currentUser,
        },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Logged waste record ${wst.wasteNo} (${count} bags, ${weightKg.toLocaleString()} kg). Inventory deducted.`,
      });
      setIsAddWasteOpen(false);
      setWasteBags('');
      setWasteReason('');
      setWasteNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error logging waste.' });
    }
  };

  const handleRestoreItem = (item: RecycleBinItem) => {
    onRequestPinAuth(() => {
      try {
        storage.restoreFromRecycleBin(item.id, currentUser);
        setNotificationMsg({
          type: 'success',
          text: `Restored ${item.recordType} "${item.recordTitle}" successfully.`,
        });
      } catch (err: any) {
        setNotificationMsg({ type: 'error', text: err.message || 'Error restoring item.' });
      }
    });
  };

  const handlePurgeItem = (item: RecycleBinItem) => {
    onRequestPinAuth(() => {
      try {
        storage.purgeFromRecycleBin(item.id, currentUser);
        setNotificationMsg({
          type: 'success',
          text: `Permanently purged ${item.recordType} "${item.recordTitle}".`,
        });
      } catch (err: any) {
        setNotificationMsg({ type: 'error', text: err.message || 'Error purging item.' });
      }
    });
  };

  const totalWasteWeight = db.wasteRecords.reduce((acc, w) => acc + w.weightKg, 0);
  const totalWasteBags = db.wasteRecords.reduce((acc, w) => acc + w.bags, 0);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner & Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.wasteRecycle}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clearly distinguish physical production waste from archived recycle bin records. Protected by administrator PIN.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('waste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'waste'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t.wasteLog} ({db.wasteRecords.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('recycle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'recycle'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>{t.recycleBin} ({db.recycleBin.length})</span>
            </button>
          </div>

          {activeTab === 'waste' && (
            <button
              onClick={() => setIsAddWasteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Log Physical Waste</span>
            </button>
          )}
        </div>
      </div>

      {notificationMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Physical Waste */}
      {activeTab === 'waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Logged Waste Weight</span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {totalWasteWeight.toLocaleString()} <span className="text-xs font-sans text-slate-400">kg</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {(totalWasteWeight / 1000).toFixed(2)} Metric Tons lost in production/spillage
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Damaged / Wasted Bags</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {totalWasteBags.toLocaleString()} <span className="text-xs font-sans text-slate-400">bags</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{db.wasteRecords.length} waste entries recorded</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Physical Production Waste Ledger
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 font-semibold">Waste #</th>
                    <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                    <th className="py-2.5 px-3 font-semibold">{t.product}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.bagSize}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Reason / Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {db.wasteRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No physical waste records logged yet.
                      </td>
                    </tr>
                  ) : (
                    db.wasteRecords.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{w.wasteNo}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{w.date}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{w.productNameEn}</td>
                        <td className="py-3 px-3 text-right font-mono">{w.bagSizeKg} kg</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">{w.bags}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">{w.weightKg.toLocaleString()} kg</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                            {w.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{w.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Recycle Bin (Protected) */}
      {activeTab === 'recycle' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Archived & Soft-Deleted Records
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Restoration and permanent purge require security PIN authentication.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
              <span>Protected Area</span>
            </div>
          </div>

          <div className="space-y-2">
            {db.recycleBin.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Recycle Bin is empty. No archived records.
              </div>
            ) : (
              db.recycleBin.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.recordType}
                      </span>
                      <span>{item.recordTitle}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Reason: {item.reason} · Removed By: {item.removedBy} on {new Date(item.removedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreItem(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.restore}</span>
                    </button>
                    <button
                      onClick={() => handlePurgeItem(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.permanentDelete}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Waste Modal */}
      {isAddWasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleAddWaste}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Physical Production Waste</h3>
              <button
                type="button"
                onClick={() => setIsAddWasteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={wasteDate}
                    onChange={e => setWasteDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waste Category *
                  </label>
                  <select
                    value={wasteCategory}
                    onChange={e => setWasteCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="spillage">Flour Spillage (گر جانا / چھڑکاؤ)</option>
                    <option value="damaged_bag">Torn / Damaged Bag (پھٹی ہوئی بوری)</option>
                    <option value="contamination">Contamination / Foreign Matter (آلودگی)</option>
                    <option value="machine_jam">Roller / Machine Jam (مشین جام)</option>
                    <option value="quality_rejected">Quality Rejected (معیار مسترد)</option>
                    <option value="other">Other Production Loss</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product *
                  </label>
                  <select
                    value={selectedProdId}
                    onChange={e => {
                      setSelectedProdId(e.target.value);
                      const prod = db.products.find(p => p.id === e.target.value);
                      if (prod && prod.bagSizes[0]) setSelectedBagSize(prod.bagSizes[0]);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    {db.products
                      .filter(p => p.isActive)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nameEn}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bag Size (kg) *
                  </label>
                  <select
                    value={selectedBagSize}
                    onChange={e => setSelectedBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === selectedProdId)
                      ?.bagSizes.map(size => (
                        <option key={size} value={size}>
                          {size} kg
                        </option>
                      )) || <option value={50}>50 kg</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wasted Bags Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  value={wasteBags}
                  onChange={e => setWasteBags(e.target.value)}
                  placeholder="e.g. 2 bags"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Technical Details *
                </label>
                <input
                  type="text"
                  value={wasteReason}
                  onChange={e => setWasteReason(e.target.value)}
                  placeholder="e.g. Bag burst during conveyor transit; insect infestation in outer lot"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddWasteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Waste Log
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
