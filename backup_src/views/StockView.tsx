import React, { useState } from 'react';
import {
  Boxes,
  PlusCircle,
  ArrowRightLeft,
  Search,
  Filter,
  AlertTriangle,
  History,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  PackageCheck,
  TrendingDown,
} from 'lucide-react';
import { AppDatabase, Product, StockItemBalance, StockMovement, AppLanguage } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

interface StockViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onNavigateToSalesWithDraft?: (productId: string, bagSizeKg: number, bags: number) => void;
  onNavigateToPdf?: () => void;
  language: AppLanguage;
}

export const StockView: React.FC<StockViewProps> = ({
  db,
  storage,
  currentUser,
  onNavigateToSalesWithDraft,
  onNavigateToPdf,
  language,
}) => {
  const t = translations[language] || translations.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedStockForLedger, setSelectedStockForLedger] = useState<{ productId: string; bagSizeKg: number } | null>(null);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Stock Form State
  const [addProdId, setAddProdId] = useState(db.products[0]?.id || '');
  const [addBagSize, setAddBagSize] = useState<number>(50);
  const [addBags, setAddBags] = useState<string>('');
  const [addSupplier, setAddSupplier] = useState('');
  const [addRef, setAddRef] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  // Transfer to Sales Form State
  const [transferProdId, setTransferProdId] = useState(db.products[0]?.id || '');
  const [transferBagSize, setTransferBagSize] = useState<number>(50);
  const [transferBags, setTransferBags] = useState<string>('');

  // Overall calculations
  const totalAvailableWeight = db.stockBalances.reduce((acc, s) => acc + s.availableWeightKg, 0);
  const totalAvailableBags = db.stockBalances.reduce((acc, s) => acc + s.availableBags, 0);
  const lowStockCount = db.stockBalances.filter(s => s.availableBags <= s.minStockThreshold).length;

  const categories = Array.from(new Set(db.products.map(p => p.category)));

  // Filtered Stock Balances
  const filteredBalances = db.stockBalances.filter(item => {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod) return false;

    const matchesSearch =
      prod.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.nameUr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = filterCategory === 'all' || prod.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    const count = parseInt(addBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid number of bags.' });
      return;
    }

    const prod = db.products.find(p => p.id === addProdId);
    if (!prod) {
      setNotificationMsg({ type: 'error', text: 'Selected product not found.' });
      return;
    }

    try {
      const totalWeight = count * addBagSize;
      storage.applyStockMovement({
        date: addDate,
        productId: prod.id,
        productNameEn: prod.nameEn,
        productNameUr: prod.nameUr,
        bagSizeKg: addBagSize,
        movementType: 'purchase',
        changeBags: count,
        changeWeightKg: totalWeight,
        referenceId: addRef || undefined,
        referenceType: addSupplier ? `Supplier: ${addSupplier}` : 'Direct Stock Receipt',
        notes: addNotes,
        performedBy: currentUser,
      });

      setNotificationMsg({
        type: 'success',
        text: `Successfully added ${count} bags (${totalWeight.toLocaleString()} kg) of ${prod.nameEn} to inventory.`,
      });
      setIsAddStockOpen(false);
      setAddBags('');
      setAddSupplier('');
      setAddRef('');
      setAddNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error updating stock.' });
    }
  };

  const handleTransferToSale = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(transferBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid quantity of bags to transfer.' });
      return;
    }

    const balance = db.stockBalances.find(
      b => b.productId === transferProdId && b.bagSizeKg === transferBagSize
    );

    const available = balance ? balance.availableBags : 0;
    if (available < count) {
      setNotificationMsg({
        type: 'error',
        text: `Cannot transfer: requested ${count} bags, but only ${available} are currently available in stock.`,
      });
      return;
    }

    setIsTransferModalOpen(false);
    if (onNavigateToSalesWithDraft) {
      onNavigateToSalesWithDraft(transferProdId, transferBagSize, count);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.stock} (اسٹاک و انوینٹری رجسٹر)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete stock ledger, perpetual inventory calculations, low-stock notifications, and sales dispatch allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddStockOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.addStock}</span>
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-98"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t.moveStockToSales}</span>
          </button>
          {onNavigateToPdf && (
            <button
              onClick={onNavigateToPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              <FileText className="w-4 h-4" />
              <span>Stock PDF</span>
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

      {/* Stock Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t.availableStockBags}</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {totalAvailableBags.toLocaleString()} <span className="text-xs font-sans text-slate-400">bags</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for sales dispatch</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t.availableStockWeight}</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {totalAvailableWeight.toLocaleString()} <span className="text-xs font-sans text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {(totalAvailableWeight / 1000).toFixed(2)} Metric Tons in mill
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Stock Health & Thresholds</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>{lowStockCount}</span>
            {lowStockCount > 0 ? (
              <span className="text-xs font-sans font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200">
                Low Stock Warning
              </span>
            ) : (
              <span className="text-xs font-sans font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                Stock Optimal
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all product lines and sizes</p>
        </div>
      </div>

      {/* Stock Balances Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, category, Urdu name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 border-0 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">{t.product}</th>
                <th className="py-2.5 px-3 font-semibold">{t.category}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bagSize}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.availableStockBags}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.availableStockWeight}</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No stock inventory balances recorded yet. Add stock or complete a production shift.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item, idx) => {
                  const prod = db.products.find(p => p.id === item.productId);
                  const isLow = item.availableBags <= item.minStockThreshold;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{prod?.nameEn}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">
                            {prod?.nameUr}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{prod?.category}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{item.bagSizeKg} kg</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.availableBags}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.availableWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedStockForLedger({ productId: item.productId, bagSizeKg: item.bagSizeKg })}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Ledger History Modal */}
      {selectedStockForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Ledger Movements Audit
                </h3>
                <p className="text-xs text-slate-500">
                  {db.products.find(p => p.id === selectedStockForLedger.productId)?.nameEn} ({selectedStockForLedger.bagSizeKg} kg)
                </p>
              </div>
              <button
                onClick={() => setSelectedStockForLedger(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
              {db.stockMovements
                .filter(
                  m =>
                    m.productId === selectedStockForLedger.productId &&
                    m.bagSizeKg === selectedStockForLedger.bagSizeKg
                )
                .map(m => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {m.movementType.replace('_', ' ')}
                        </span>
                        <span>{m.referenceType || 'Stock Operation'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {m.notes ? `${m.notes} · ` : ''}User: {m.performedBy} · {new Date(m.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          m.changeBags >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.changeBags >= 0 ? `+${m.changeBags}` : m.changeBags} bags
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Balance after: {m.balanceBagsAfter} bags
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleAddStockSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.addStock}</h3>
              <button
                type="button"
                onClick={() => setIsAddStockOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product *
                </label>
                <select
                  value={addProdId}
                  onChange={e => {
                    setAddProdId(e.target.value);
                    const prod = db.products.find(p => p.id === e.target.value);
                    if (prod && prod.bagSizes[0]) setAddBagSize(prod.bagSizes[0]);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  {db.products
                    .filter(p => p.isActive)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameEn} ({p.nameUr})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bag Size (kg) *
                  </label>
                  <select
                    value={addBagSize}
                    onChange={e => setAddBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === addProdId)
                      ?.bagSizes.map(size => (
                        <option key={size} value={size}>
                          {size} kg
                        </option>
                      )) || <option value={50}>50 kg</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Number of Bags *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={addBags}
                    onChange={e => setAddBags(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {Number(addBags) > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Calculated Weight Addition:</span>
                  <strong className="font-mono text-sm">
                    {(Number(addBags) * addBagSize).toLocaleString()} kg
                  </strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Source
                  </label>
                  <input
                    type="text"
                    value={addSupplier}
                    onChange={e => setAddSupplier(e.target.value)}
                    placeholder="e.g. Grain Agency Lahore"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Bilty No.
                  </label>
                  <input
                    type="text"
                    value={addRef}
                    onChange={e => setAddRef(e.target.value)}
                    placeholder="e.g. BL-892"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={e => setAddNotes(e.target.value)}
                  placeholder="e.g. Direct purchase or mill opening stock"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddStockOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Stock Receipt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Stock to Sales Modal (Section 7.6) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleTransferToSale}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.moveStockToSales}</h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product
                </label>
                <select
                  value={transferProdId}
                  onChange={e => {
                    setTransferProdId(e.target.value);
                    const prod = db.products.find(p => p.id === e.target.value);
                    if (prod && prod.bagSizes[0]) setTransferBagSize(prod.bagSizes[0]);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  {db.products
                    .filter(p => p.isActive)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameEn} ({p.nameUr})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bag Size (kg)
                  </label>
                  <select
                    value={transferBagSize}
                    onChange={e => setTransferBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === transferProdId)
                      ?.bagSizes.map(size => (
                        <option key={size} value={size}>
                          {size} kg
                        </option>
                      )) || <option value={50}>50 kg</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity to Transfer
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={transferBags}
                    onChange={e => setTransferBags(e.target.value)}
                    placeholder="Bags"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Available Stock Warning/Check */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
                <span>Currently Available in Mill:</span>
                <strong className="font-mono">
                  {db.stockBalances.find(
                    b => b.productId === transferProdId && b.bagSizeKg === transferBagSize
                  )?.availableBags || 0}{' '}
                  bags
                </strong>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Open in Sales Invoice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
