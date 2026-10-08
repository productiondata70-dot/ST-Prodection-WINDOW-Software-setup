import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  PackageCheck,
  PackageX,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { AppDatabase, ReturnRecord, AppLanguage } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

interface ReturnsViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  language: AppLanguage;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ db, storage, currentUser, language }) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';

  const [isAddReturnOpen, setIsAddReturnOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [returnType, setReturnType] = useState<'customer' | 'supplier'>('customer');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerOrSupplier, setCustomerOrSupplier] = useState('');
  const [selectedProdId, setSelectedProdId] = useState(db.products[0]?.id || '');
  const [selectedBagSize, setSelectedBagSize] = useState<number>(50);
  const [returnedBags, setReturnedBags] = useState<string>('');
  const [condition, setCondition] = useState<'usable' | 'damaged' | 'rejected'>('usable');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    const count = parseInt(returnedBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid returned bag quantity.' });
      return;
    }

    const prod = db.products.find(p => p.id === selectedProdId);
    if (!prod) {
      setNotificationMsg({ type: 'error', text: 'Selected product not found.' });
      return;
    }

    const weightKg = count * selectedBagSize;

    try {
      const ret = storage.addReturn(
        {
          returnType,
          date,
          customerOrSupplierName: customerOrSupplier.trim() || (returnType === 'customer' ? 'Walk-in Customer' : 'Supplier'),
          productId: prod.id,
          productNameEn: prod.nameEn,
          productNameUr: prod.nameUr,
          bagSizeKg: selectedBagSize,
          returnedBags: count,
          returnedWeightKg: weightKg,
          condition,
          refundAmount: Number(refundAmount) || 0,
          reason: reason.trim(),
          notes: notes.trim(),
          createdBy: currentUser,
        },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Return ${ret.returnNo} recorded successfully! Stock has been ${
          returnType === 'customer' && condition === 'usable'
            ? 'restored to available inventory'
            : returnType === 'supplier'
            ? 'deducted from inventory'
            : 'recorded as quarantined/damaged'
        }.`,
      });

      setIsAddReturnOpen(false);
      setReturnedBags('');
      setReason('');
      setNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error processing return.' });
    }
  };

  const filteredReturns = db.returns.filter(
    r =>
      r.returnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerOrSupplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.returns} (واپسی مال - گاہک و سپلائر)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Handle customer sales returns (with usable stock replenishment or damage sorting) and supplier stock returns.
          </p>
        </div>

        <button
          onClick={() => setIsAddReturnOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-98 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Return</span>
        </button>
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

      {/* Returns Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by return #, party name, product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">{filteredReturns.length} return events logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Return #</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                <th className="py-2.5 px-3 font-semibold">Customer / Supplier</th>
                <th className="py-2.5 px-3 font-semibold">{t.product}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                <th className="py-2.5 px-3 font-semibold text-center">Condition</th>
                <th className="py-2.5 px-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No return records found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {ret.returnNo}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ret.returnType === 'customer'
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200'
                            : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200'
                        }`}
                      >
                        {ret.returnType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{ret.date}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {ret.customerOrSupplierName}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{ret.productNameEn}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ret.bagSizeKg} kg bag</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {ret.returnedBags}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-600 font-bold">
                      {ret.returnedWeightKg.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ret.condition === 'usable'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {ret.condition}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{ret.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Return Modal */}
      {isAddReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleAddReturn}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Goods Return</h3>
              <button
                type="button"
                onClick={() => setIsAddReturnOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Return Type *
                  </label>
                  <select
                    value={returnType}
                    onChange={e => setReturnType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="customer">Customer Return (گاہک کی واپسی)</option>
                    <option value="supplier">Supplier Return (سپلائر کو واپسی)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Supplier Name *
                </label>
                <input
                  type="text"
                  value={customerOrSupplier}
                  onChange={e => setCustomerOrSupplier(e.target.value)}
                  placeholder="e.g. Al-Madina Bakery or Supplier"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Returned Bags Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={returnedBags}
                    onChange={e => setReturnedBags(e.target.value)}
                    placeholder="Bags"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Goods Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="usable">Usable (Accept into Stock)</option>
                    <option value="damaged">Damaged (Do NOT add to usable stock)</option>
                    <option value="rejected">Rejected / Contaminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Return *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Excess order returned; bag torn; moisture complaint"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddReturnOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Return Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
