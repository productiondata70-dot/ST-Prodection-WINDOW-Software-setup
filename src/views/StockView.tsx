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
  Scale,
  Sliders,
  ShoppingCart,
  Download,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { AppDatabase, Product, StockItemBalance, StockMovement, AppLanguage, StockMovementType } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';
import { generateReportPdf } from '../services/pdfGenerator';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';

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
  const activeMode = normalizeBusinessMode(db.profile?.businessType);
  const modeCfg = getBusinessModeConfig(activeMode);
  const isRetailOrSmallBiz = activeMode === 'shopping_mart' || activeMode === 'small_business';
  const unitNoun = isRetailOrSmallBiz ? 'units' : 'bags';
  const unitLabel = isRetailOrSmallBiz ? 'Unit / Pack' : 'Bag Size';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedStockForLedger, setSelectedStockForLedger] = useState<{ productId: string; bagSizeKg: number } | null>(null);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const physicalProducts = db.products.filter(p => p.isActive && p.itemType !== 'service');
  const defaultBagSz = isRetailOrSmallBiz ? 1 : 50;

  // Add Stock Form State
  const [addProdId, setAddProdId] = useState(physicalProducts[0]?.id || '');
  const [addBagSize, setAddBagSize] = useState<number>(
    physicalProducts[0]?.bagSizes?.[0] || defaultBagSz
  );
  const [addBags, setAddBags] = useState<string>('');
  const [addRate, setAddRate] = useState<string>('');
  const [addSupplier, setAddSupplier] = useState('');
  const [addRef, setAddRef] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  // Transfer to Sales Form State
  const [transferProdId, setTransferProdId] = useState(physicalProducts[0]?.id || '');
  const [transferBagSize, setTransferBagSize] = useState<number>(
    physicalProducts[0]?.bagSizes?.[0] || defaultBagSz
  );
  const [transferBags, setTransferBags] = useState<string>('');

  // Stock Adjustment Form State (Inventory Improvement 1)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProdId, setAdjustProdId] = useState(physicalProducts[0]?.id || '');
  const [adjustBagSize, setAdjustBagSize] = useState<number>(
    physicalProducts[0]?.bagSizes?.[0] || defaultBagSz
  );

  // Sync selected product & bagSize whenever products list or active workspace changes
  React.useEffect(() => {
    const activeProds = db.products.filter(p => p.isActive && p.itemType !== 'service');
    const firstProd = activeProds[0];
    const fallbackSize = isRetailOrSmallBiz ? 1 : 50;

    if (!activeProds.some(p => p.id === addProdId)) {
      setAddProdId(firstProd?.id || '');
      setAddBagSize(firstProd?.bagSizes?.[0] || fallbackSize);
    } else {
      const curAdd = activeProds.find(p => p.id === addProdId);
      if (curAdd && (!curAdd.bagSizes?.includes(addBagSize) || isRetailOrSmallBiz)) {
        setAddBagSize(isRetailOrSmallBiz ? 1 : curAdd.bagSizes?.[0] || fallbackSize);
      }
    }

    if (!activeProds.some(p => p.id === adjustProdId)) {
      setAdjustProdId(firstProd?.id || '');
      setAdjustBagSize(firstProd?.bagSizes?.[0] || fallbackSize);
    } else {
      const curAdj = activeProds.find(p => p.id === adjustProdId);
      if (curAdj && (!curAdj.bagSizes?.includes(adjustBagSize) || isRetailOrSmallBiz)) {
        setAdjustBagSize(isRetailOrSmallBiz ? 1 : curAdj.bagSizes?.[0] || fallbackSize);
      }
    }

    if (!activeProds.some(p => p.id === transferProdId)) {
      setTransferProdId(firstProd?.id || '');
      setTransferBagSize(firstProd?.bagSizes?.[0] || fallbackSize);
    } else {
      const curTrf = activeProds.find(p => p.id === transferProdId);
      if (curTrf && (!curTrf.bagSizes?.includes(transferBagSize) || isRetailOrSmallBiz)) {
        setTransferBagSize(isRetailOrSmallBiz ? 1 : curTrf.bagSizes?.[0] || fallbackSize);
      }
    }
  }, [db.products, db.activeBusinessId, isRetailOrSmallBiz]);
  const [adjustMode, setAdjustMode] = useState<
    'add' | 'remove' | 'set' | 'damaged' | 'expired' | 'opening' | 'correction'
  >('add');
  const [adjustBags, setAdjustBags] = useState('');
  const [adjustReason, setAdjustReason] = useState('Physical Audit Count');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().slice(0, 10));

  // Minimum Threshold Edit State (Inventory Improvement 2)
  const [editingThresholdItem, setEditingThresholdItem] = useState<{
    productId: string;
    bagSizeKg: number;
    currentThreshold: number;
  } | null>(null);
  const [newThresholdValue, setNewThresholdValue] = useState('10');

  // TASK 2: Selection-based stock removal state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStockKeys, setSelectedStockKeys] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteStockReason, setDeleteStockReason] = useState('Manual Stock Deletion / Warehouse Audit');

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

  const currency = db.profile?.currency || 'PKR';

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    const count = parseInt(addBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid number of bags.' });
      return;
    }

    const rateVal = parseFloat(addRate);
    if (isNaN(rateVal) || rateVal <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid stock/selling rate (PKR per bag).' });
      return;
    }

    const prod = db.products.find(p => p.id === addProdId) || physicalProducts[0];
    if (!prod) {
      setNotificationMsg({ type: 'error', text: 'Selected product not found.' });
      return;
    }

    try {
      const effectiveSize = isRetailOrSmallBiz ? 1 : addBagSize || prod.bagSizes?.[0] || 50;
      const totalWeight = count * effectiveSize;
      storage.applyStockMovement({
        date: addDate,
        productId: prod.id,
        productNameEn: prod.nameEn,
        productNameUr: prod.nameUr,
        bagSizeKg: effectiveSize,
        movementType: 'purchase',
        changeBags: count,
        changeWeightKg: totalWeight,
        rate: rateVal,
        referenceId: addRef || undefined,
        referenceType: addSupplier ? `Supplier: ${addSupplier}` : 'Direct Stock Receipt',
        notes: addNotes,
        performedBy: currentUser,
      });

      setNotificationMsg({
        type: 'success',
        text: `Successfully added ${count} bags (${totalWeight.toLocaleString()} kg) of ${prod.nameEn} @ ${currency} ${rateVal.toLocaleString()}/bag to inventory.`,
      });
      setIsAddStockOpen(false);
      setAddBags('');
      setAddRate('');
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

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);
    const count = parseInt(adjustBags, 10);
    const allowZero = adjustMode === 'set' || adjustMode === 'correction';
    if (isNaN(count) || (allowZero ? count < 0 : count <= 0)) {
      setNotificationMsg({ type: 'error', text: `Please enter a valid ${allowZero ? 'non-negative' : 'positive'} quantity.` });
      return;
    }
    const prod = db.products.find(p => p.id === adjustProdId) || physicalProducts[0];
    if (!prod) {
      setNotificationMsg({ type: 'error', text: 'Product not found.' });
      return;
    }

    try {
      const targetBagSize = isRetailOrSmallBiz ? 1 : adjustBagSize || prod.bagSizes?.[0] || 50;
      const res = storage.adjustProductStock({
        productId: prod.id,
        bagSizeKg: targetBagSize,
        adjustmentMode: adjustMode,
        quantity: count,
        reason: `${adjustReason}${adjustNotes ? ` — ${adjustNotes}` : ''}`,
        currentUser,
      });

      setNotificationMsg({
        type: 'success',
        text: `Stock adjustment saved for ${prod.nameEn}: ${res.delta >= 0 ? '+' : ''}${res.delta} ${prod.unit || unitNoun} (New Balance: ${res.newStock} ${prod.unit || unitNoun}).`,
      });
      setIsAdjustModalOpen(false);
      setAdjustBags('');
      setAdjustNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error applying stock adjustment.' });
    }
  };

  const handleSaveThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThresholdItem) return;
    const thresholdNum = parseInt(newThresholdValue, 10);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid threshold number.' });
      return;
    }
    storage.updateStockThreshold(
      editingThresholdItem.productId,
      editingThresholdItem.bagSizeKg,
      thresholdNum,
      currentUser
    );
    setNotificationMsg({
      type: 'success',
      text: `Low stock alert threshold updated to ${thresholdNum} bags.`,
    });
    setEditingThresholdItem(null);
  };

  const handleExportStockPdf = () => {
    try {
      const { doc, filename } = generateReportPdf(db, { reportType: 'stock_summary' });
      doc.save(filename);
      setNotificationMsg({ type: 'success', text: `Stock Position Report downloaded (${filename}).` });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'Error generating PDF: ' + (err?.message || 'Failed') });
    }
  };

  // TASK 2: Stock selection handlers
  const handleToggleSelectAll = () => {
    if (selectedStockKeys.length === filteredBalances.length) {
      setSelectedStockKeys([]);
    } else {
      setSelectedStockKeys(filteredBalances.map(item => `${item.productId}_${item.bagSizeKg}`));
    }
  };

  const handleToggleItemSelect = (key: string) => {
    if (selectedStockKeys.includes(key)) {
      setSelectedStockKeys(selectedStockKeys.filter(k => k !== key));
    } else {
      setSelectedStockKeys([...selectedStockKeys, key]);
    }
  };

  const handleConfirmDeleteSelectedStock = () => {
    if (selectedStockKeys.length === 0) return;
    try {
      let removedCount = 0;
      let totalBagsRemoved = 0;

      for (const key of selectedStockKeys) {
        const [prodId, bagSizeStr] = key.split('_');
        const bagSize = Number(bagSizeStr);
        const balance = db.stockBalances.find(b => b.productId === prodId && b.bagSizeKg === bagSize);
        if (balance) {
          totalBagsRemoved += balance.availableBags;
          storage.removeStockItem(prodId, bagSize, currentUser, deleteStockReason);
          removedCount++;
        }
      }

      setNotificationMsg({
        type: 'success',
        text: `Successfully removed ${removedCount} stock item(s) (${totalBagsRemoved.toLocaleString()} bags). Ledger and inventory safely updated.`,
      });
      setSelectedStockKeys([]);
      setIsSelectionMode(false);
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error removing selected stock.' });
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

        <div className="flex items-center flex-wrap gap-2">
          {/* TASK 2: Select Option */}
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedStockKeys([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isSelectionMode
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-500" />
            <span>{isSelectionMode ? 'Cancel Selection' : 'Select'}</span>
          </button>

          {/* TASK 2: Delete Selected Option */}
          {isSelectionMode && selectedStockKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-98 animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedStockKeys.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsAddStockOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.addStock}</span>
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 transition-all active:scale-98"
          >
            <Scale className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-98"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t.moveStockToSales}</span>
          </button>
          <button
            onClick={handleExportStockPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Download formatted Stock Position PDF"
          >
            <Download className="w-4 h-4" />
            <span>Stock PDF</span>
          </button>
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
          <span className="text-xs font-semibold text-slate-500 uppercase">
            {isRetailOrSmallBiz ? 'Available Stock Quantity' : t.availableStockBags}
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {totalAvailableBags.toLocaleString()}{' '}
            <span className="text-xs font-sans text-slate-400">{unitNoun}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRetailOrSmallBiz ? `Ready for ${modeCfg.posTitle}` : 'Ready for sales dispatch'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            {isRetailOrSmallBiz ? 'Active SKUs in Stock' : t.availableStockWeight}
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {isRetailOrSmallBiz ? (
              <>
                {db.stockBalances.filter(s => s.availableBags > 0).length}{' '}
                <span className="text-xs font-sans text-slate-400">active items</span>
              </>
            ) : (
              <>
                {totalAvailableWeight.toLocaleString()} <span className="text-xs font-sans text-slate-400">kg</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRetailOrSmallBiz
              ? `Across ${db.products.length} configured catalog products`
              : `${(totalAvailableWeight / 1000).toFixed(2)} Metric Tons in mill`}
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
                {isSelectionMode && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredBalances.length > 0 && selectedStockKeys.length === filteredBalances.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                      title="Select / Deselect All"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 font-semibold">{t.product}</th>
                <th className="py-2.5 px-3 font-semibold">{t.category}</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  {isRetailOrSmallBiz ? 'Unit' : t.bagSize}
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  {isRetailOrSmallBiz ? 'Available Qty' : t.availableStockBags}
                </th>
                {!isRetailOrSmallBiz && (
                  <th className="py-2.5 px-3 font-semibold text-right">{t.availableStockWeight}</th>
                )}
                <th className="py-2.5 px-3 font-semibold text-right">Applicable Rate</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 9 : 8} className="py-8 text-center text-slate-400 text-xs">
                    {isRetailOrSmallBiz
                      ? 'No stock inventory balances recorded yet. Add stock or record a supplier purchase.'
                      : 'No stock inventory balances recorded yet. Add stock or complete a production shift.'}
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item, idx) => {
                  const prod = db.products.find(p => p.id === item.productId);
                  const isLow = item.availableBags <= item.minStockThreshold;
                  const itemKey = `${item.productId}_${item.bagSizeKg}`;
                  const isSelected = selectedStockKeys.includes(itemKey);

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      {isSelectionMode && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItemSelect(itemKey)}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{prod?.nameEn}</span>
                          {prod?.nameUr && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">
                                {prod?.nameUr}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{prod?.category}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${item.bagSizeKg} kg`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.availableBags}
                      </td>
                      {!isRetailOrSmallBiz && (
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.availableWeightKg.toLocaleString()} kg
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300">
                        {item.rate && item.rate > 0
                          ? `${currency} ${item.rate.toLocaleString()}`
                          : prod?.rate && prod.rate > 0
                          ? `${currency} ${prod.rate.toLocaleString()}`
                          : '-'}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (onNavigateToSalesWithDraft) {
                                onNavigateToSalesWithDraft(item.productId, item.bagSizeKg, Math.min(item.availableBags, 10));
                              } else {
                                setTransferProdId(item.productId);
                                setTransferBagSize(item.bagSizeKg);
                                setIsTransferModalOpen(true);
                              }
                            }}
                            title={isRetailOrSmallBiz ? 'Send to POS / Sales Invoice' : 'Dispatch Flour to Sales Invoice'}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>{isRetailOrSmallBiz ? 'Sell / POS' : 'Dispatch'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setAdjustProdId(item.productId);
                              setAdjustBagSize(item.bagSizeKg);
                              setIsAdjustModalOpen(true);
                            }}
                            title="Adjust Stock Balance (Physical Audit / Damage / Wastage)"
                            className="px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Scale className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingThresholdItem({
                                productId: item.productId,
                                bagSizeKg: item.bagSizeKg,
                                currentThreshold: item.minStockThreshold || 10,
                              });
                              setNewThresholdValue(String(item.minStockThreshold || 10));
                            }}
                            title="Set Low Stock Warning Limit"
                            className="px-2 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Alert ({item.minStockThreshold || 10})</span>
                          </button>
                          <button
                            onClick={() => setSelectedStockForLedger({ productId: item.productId, bagSizeKg: item.bagSizeKg })}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            Ledger
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TASK 2: Stock Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Stock Removal / Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete and remove the selected stock records from current inventory? An audit movement will be permanently recorded in the stock ledger.
            </p>

            {/* List of selected items */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40">
              {selectedStockKeys.map(key => {
                const [prodId, bagSizeStr] = key.split('_');
                const bagSize = Number(bagSizeStr);
                const prod = db.products.find(p => p.id === prodId);
                const bal = db.stockBalances.find(b => b.productId === prodId && b.bagSizeKg === bagSize);
                return (
                  <div key={key} className="py-2 px-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{prod?.nameEn || prodId}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500 font-mono">
                        {isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${bagSize} kg`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600">
                        {bal?.availableBags || 0} {isRetailOrSmallBiz ? prod?.unit || 'units' : 'bags'}
                      </span>
                      {!isRetailOrSmallBiz && (
                        <span className="text-slate-400 text-[10px] ml-1 font-mono">
                          ({(bal?.availableWeightKg || 0).toLocaleString()} kg)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Stock Removal / Audit Note *
              </label>
              <input
                type="text"
                value={deleteStockReason}
                onChange={e => setDeleteStockReason(e.target.value)}
                placeholder="e.g. Physical stock count adjustment, damaged bags removal, warehouse transfer"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelectedStock}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete Selected ({selectedStockKeys.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {db.products.find(p => p.id === selectedStockForLedger.productId)?.nameEn} —{' '}
                  {isRetailOrSmallBiz
                    ? db.products.find(p => p.id === selectedStockForLedger.productId)?.unit || 'Piece'
                    : `${selectedStockForLedger.bagSizeKg} kg`}
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
                      {m.rate && m.rate > 0 && (
                        <div className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          Stored Rate: {currency} {m.rate.toLocaleString()}/bag
                        </div>
                      )}
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
                  {physicalProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} ({p.nameUr})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {unitLabel} *
                  </label>
                  <select
                    value={addBagSize}
                    onChange={e => setAddBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === addProdId)
                      ?.bagSizes.map(size => {
                        const selProd = db.products.find(p => p.id === addProdId);
                        return (
                          <option key={size} value={size}>
                            {isRetailOrSmallBiz ? selProd?.unit || 'Piece' : `${size} kg`}
                          </option>
                        );
                      }) || <option value={isRetailOrSmallBiz ? 1 : 50}>{isRetailOrSmallBiz ? 'Piece' : '50 kg'}</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isRetailOrSmallBiz ? 'Quantity *' : 'Number of Bags *'}
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

              {/* Requirement 1: Product Rate stored with Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Selling / Stock Rate ({currency} per {isRetailOrSmallBiz ? 'Unit' : 'Bag'}) *
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={addRate}
                  onChange={e => setAddRate(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This rate is stored permanently with this stock batch and automatically locked during sale dispatch.
                </p>
              </div>

              {Number(addBags) > 0 && (
                <div className="space-y-1.5">
                  {!isRetailOrSmallBiz && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>Calculated Weight Addition:</span>
                      <strong className="font-mono text-sm">
                        {(Number(addBags) * addBagSize).toLocaleString()} kg
                      </strong>
                    </div>
                  )}
                  {Number(addRate) > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
                      <span>Total Stock Batch Valuation (Gross Value):</span>
                      <strong className="font-mono text-sm">
                        {currency} {(Number(addBags) * Number(addRate)).toLocaleString()}
                      </strong>
                    </div>
                  )}
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
                  {physicalProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} ({p.nameUr})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {unitLabel}
                  </label>
                  <select
                    value={transferBagSize}
                    onChange={e => setTransferBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === transferProdId)
                      ?.bagSizes.map(size => {
                        const selProd = db.products.find(p => p.id === transferProdId);
                        return (
                          <option key={size} value={size}>
                            {isRetailOrSmallBiz ? selProd?.unit || 'Piece' : `${size} kg`}
                          </option>
                        );
                      }) || <option value={isRetailOrSmallBiz ? 1 : 50}>{isRetailOrSmallBiz ? 'Piece' : '50 kg'}</option>}
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
                    placeholder={isRetailOrSmallBiz ? 'Units' : 'Bags'}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Available Stock Warning/Check */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
                <span>{isRetailOrSmallBiz ? 'Currently Available in Store:' : 'Currently Available in Mill:'}</span>
                <strong className="font-mono">
                  {db.stockBalances.find(
                    b => b.productId === transferProdId && b.bagSizeKg === transferBagSize
                  )?.availableBags || 0}{' '}
                  {unitNoun}
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

      {/* Stock Adjustment & Physical Audit Modal (Inventory Improvement 1) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleStockAdjustmentSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Inventory Stock Adjustment & Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Item *
                </label>
                <select
                  value={adjustProdId}
                  onChange={e => {
                    setAdjustProdId(e.target.value);
                    const prod = db.products.find(p => p.id === e.target.value);
                    if (prod && prod.bagSizes[0]) setAdjustBagSize(prod.bagSizes[0]);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  {physicalProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} ({p.nameUr})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {unitLabel}
                  </label>
                  <select
                    value={adjustBagSize}
                    onChange={e => setAdjustBagSize(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  >
                    {db.products
                      .find(p => p.id === adjustProdId)
                      ?.bagSizes.map(size => {
                        const selProd = db.products.find(p => p.id === adjustProdId);
                        return (
                          <option key={size} value={size}>
                            {isRetailOrSmallBiz ? selProd?.unit || 'Piece' : `${size} kg`}
                          </option>
                        );
                      }) || <option value={isRetailOrSmallBiz ? 1 : 50}>{isRetailOrSmallBiz ? 'Piece' : '50 kg'}</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={adjustMode}
                    onChange={e => setAdjustMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  >
                    <option value="add">+ Add Stock (Surplus Found)</option>
                    <option value="remove">- Remove Stock (Deficit / Shortage)</option>
                    <option value="set">= Set Exact Stock Count (Audit)</option>
                    <option value="damaged">- Damaged Stock Removal</option>
                    <option value="expired">- Expired Stock Removal</option>
                    <option value="opening">+ Opening Stock Entry</option>
                    <option value="correction">= Manual Stock Correction</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {adjustMode === 'set' || adjustMode === 'correction'
                      ? 'New Exact Stock Quantity *'
                      : `Quantity (${unitNoun}) *`}
                  </label>
                  <input
                    type="number"
                    min={adjustMode === 'set' || adjustMode === 'correction' ? 0 : 1}
                    value={adjustBags}
                    onChange={e => setAdjustBags(e.target.value)}
                    placeholder="e.g. 5"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Adjustment
                  </label>
                  <input
                    type="date"
                    value={adjustDate}
                    onChange={e => setAdjustDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="Physical Audit Count">Physical Audit Count Verification</option>
                  <option value="Packaging Torn / Broken Bags">Packaging Torn / Broken Bags</option>
                  <option value="Moisture & Humidity Damage">Moisture & Humidity Damage</option>
                  <option value="Warehouse Spillage">Warehouse Handling Spillage</option>
                  <option value="Sample Inspection">Laboratory / Quality Inspection</option>
                  <option value="Other Manual Correction">Other Operational Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Verified by shift supervisor during stock take"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Current balance indicator */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Current Available In Stock:</span>
                <strong className="font-mono">
                  {db.stockBalances.find(
                    b => b.productId === adjustProdId && b.bagSizeKg === adjustBagSize
                  )?.availableBags || 0}{' '}
                  {unitNoun}
                </strong>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Post Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Set Minimum Threshold Modal (Inventory Improvement 2) */}
      {editingThresholdItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleSaveThresholdSubmit}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Set Low Stock Warning Limit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingThresholdItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                Product:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {db.products.find(p => p.id === editingThresholdItem.productId)?.nameEn}
                </strong>{' '}
                (
                {isRetailOrSmallBiz
                  ? db.products.find(p => p.id === editingThresholdItem.productId)?.unit || 'Piece'
                  : `${editingThresholdItem.bagSizeKg} kg`}
                )
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isRetailOrSmallBiz ? 'Alert Threshold (Minimum Quantity) *' : 'Alert Threshold (Minimum Bags) *'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={newThresholdValue}
                  onChange={e => setNewThresholdValue(e.target.value)}
                  placeholder="e.g. 15"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  When inventory falls to or below this {unitNoun} count, a "Low Stock" alert will be triggered automatically.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingThresholdItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Threshold
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
