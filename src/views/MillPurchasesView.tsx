import React, { useState } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  DollarSign,
  PackageCheck,
  RotateCcw,
  Trash2,
  X,
  CreditCard,
  Building2,
  Calendar,
  Eye,
  Send,
  Boxes,
} from 'lucide-react';
import { AppDatabase, MillPurchaseRecord, PaymentMethod, PaymentStatus, AppLanguage } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';

interface MillPurchasesViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  language: AppLanguage;
}

export const MillPurchasesView: React.FC<MillPurchasesViewProps> = ({
  db,
  storage,
  currentUser,
  language,
}) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';
  const mode = normalizeBusinessMode(db.profile?.businessType);
  const modeCfg = getBusinessModeConfig(mode);
  const isRetailOrSmallBiz = mode !== 'factory';
  const [addToProductStock, setAddToProductStock] = useState<boolean>(isRetailOrSmallBiz);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'exhausted'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [issueModalItem, setIssueModalItem] = useState<MillPurchaseRecord | null>(null);
  const [issueBags, setIssueBags] = useState<string>('');
  const [issueReason, setIssueReason] = useState<string>('');

  const [selectedDetailItem, setSelectedDetailItem] = useState<MillPurchaseRecord | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MillPurchaseRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Form Fields for New Purchase
  const physicalCatalogProducts = db.products.filter(p => p.isActive && p.itemType !== 'service');
  const [useCatalogProduct, setUseCatalogProduct] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    physicalCatalogProducts[0]?.id || db.products[0]?.id || ''
  );
  const [customProductName, setCustomProductName] = useState('');
  const [customProductNameUr, setCustomProductNameUr] = useState('');
  const [category, setCategory] = useState(
    isRetailOrSmallBiz ? modeCfg.defaultCategories[0] || 'General Goods' : 'Raw Wheat / Grain'
  );
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantityBags, setQuantityBags] = useState('');
  const [bagSizeKg, setBagSizeKg] = useState(isRetailOrSmallBiz ? '1' : '50');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  React.useEffect(() => {
    const activeProds = db.products.filter(p => p.isActive && p.itemType !== 'service');
    const firstProd = activeProds[0] || db.products[0];
    if (!activeProds.some(p => p.id === selectedProductId)) {
      setSelectedProductId(firstProd?.id || '');
    }
    setBagSizeKg(isRetailOrSmallBiz ? '1' : String(firstProd?.bagSizes?.[0] || 50));
    setCategory(
      isRetailOrSmallBiz ? modeCfg.defaultCategories[0] || 'General Goods' : 'Raw Wheat / Grain'
    );
  }, [db.products, db.activeBusinessId, isRetailOrSmallBiz]);

  const purchases = db.millPurchases || [];

  // Metrics
  const totalPurchasesCount = purchases.length;
  const totalPurchaseValue = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const totalAvailableBags = purchases.reduce((acc, p) => acc + (p.remainingBags || 0), 0);
  const totalAvailableWeightKg = purchases.reduce((acc, p) => acc + (p.remainingWeightKg || 0), 0);
  const totalUsedBags = purchases.reduce((acc, p) => acc + (p.usedBags || 0), 0);

  // Filtered List
  const filteredPurchases = purchases.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.productNameEn.toLowerCase().includes(q) || (p.productNameUr && p.productNameUr.includes(q));
      const matchSupplier = p.supplierName.toLowerCase().includes(q);
      const matchNo = p.purchaseNo.toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      if (!matchName && !matchSupplier && !matchNo && !matchCategory) return false;
    }
    return true;
  });

  const categoriesList = Array.from(new Set(purchases.map(p => p.category).filter(Boolean)));

  // Calculated totals for Add form
  const calcQty = Number(quantityBags) || 0;
  const calcRate = Number(purchaseRate) || 0;
  const calcTotalAmount = calcQty * calcRate;
  const calcBagSize = Number(bagSizeKg) || 50;
  const calcTotalWeight = calcQty * calcBagSize;

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    let prodNameEn = '';
    let prodNameUr = '';
    let prodId = 'prod-custom';

    if (useCatalogProduct) {
      const catalogProd = db.products.find(p => p.id === selectedProductId);
      if (!catalogProd) {
        setNotificationMsg({ type: 'error', text: 'Please select a catalog product.' });
        return;
      }
      prodId = catalogProd.id;
      prodNameEn = catalogProd.nameEn;
      prodNameUr = catalogProd.nameUr;
    } else {
      if (!customProductName.trim()) {
        setNotificationMsg({ type: 'error', text: 'Please enter the purchased product/material name.' });
        return;
      }
      prodId = 'custom-' + Date.now();
      prodNameEn = customProductName.trim();
      prodNameUr = customProductNameUr.trim();
    }

    if (calcQty <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid purchase quantity greater than 0.' });
      return;
    }

    if (calcRate <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid purchase rate greater than 0.' });
      return;
    }

    const effectivePaid =
      paymentStatus === 'paid' ? calcTotalAmount : paymentStatus === 'credit' ? 0 : Number(paidAmount) || 0;
    const balanceAmount = Math.max(0, calcTotalAmount - effectivePaid);

    try {
      storage.addMillPurchase(
        {
          date: purchaseDate,
          productId: prodId,
          productNameEn: prodNameEn,
          productNameUr: prodNameUr,
          category: category.trim() || (isRetailOrSmallBiz ? 'General Goods' : 'General Material'),
          supplierName: supplierName.trim() || 'Direct Market Vendor',
          quantityBags: calcQty,
          bagSizeKg: !isRetailOrSmallBiz ? calcBagSize : 1,
          purchaseRate: calcRate,
          paymentMethod,
          paymentStatus,
          paidAmount: effectivePaid,
          balanceAmount,
          addedToStock: addToProductStock,
          notes: purchaseNotes.trim(),
        },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `${isRetailOrSmallBiz ? 'Supplier Purchase' : 'Mill Purchase'} recorded: ${calcQty} ${isRetailOrSmallBiz ? 'units' : 'bags'} of ${prodNameEn} from ${supplierName || 'Vendor'} @ ${currency} ${calcRate.toLocaleString()} (Total: ${currency} ${calcTotalAmount.toLocaleString()}).`,
      });

      // Reset form
      setIsAddModalOpen(false);
      setCustomProductName('');
      setCustomProductNameUr('');
      setSupplierName('');
      setQuantityBags('');
      setPurchaseRate('');
      setPaidAmount('');
      setPurchaseNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err?.message || 'Failed to record mill purchase.' });
    }
  };

  const handleConfirmIssueStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModalItem) return;

    const count = parseInt(issueBags, 10);
    if (isNaN(count) || count <= 0) {
      setNotificationMsg({ type: 'error', text: 'Please enter a valid quantity of bags to issue/use.' });
      return;
    }

    if (count > issueModalItem.remainingBags) {
      setNotificationMsg({
        type: 'error',
        text: `Cannot issue ${count} bags. Only ${issueModalItem.remainingBags} bags available in batch ${issueModalItem.purchaseNo}.`,
      });
      return;
    }

    try {
      storage.issueMillPurchaseStock(
        issueModalItem.id,
        count,
        issueReason.trim() || 'Mill facility consumption',
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Successfully issued ${count} bags (${(count * issueModalItem.bagSizeKg).toLocaleString()} kg) from batch ${issueModalItem.purchaseNo}. Remaining: ${issueModalItem.remainingBags - count} bags.`,
      });

      setIssueModalItem(null);
      setIssueBags('');
      setIssueReason('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err?.message || 'Failed to issue material stock.' });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    try {
      storage.deleteMillPurchase(deleteConfirmItem.id, currentUser, deleteReason.trim() || 'Removed by administrator');
      setNotificationMsg({
        type: 'success',
        text: `Mill purchase batch ${deleteConfirmItem.purchaseNo} (${deleteConfirmItem.productNameEn}) deleted permanently.`,
      });
      setDeleteConfirmItem(null);
      setDeleteReason('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err?.message || 'Failed to delete purchase record.' });
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isRetailOrSmallBiz
                ? `${modeCfg.purchasesTitle} (سپلائر خریداری و اسٹاک ری اسٹاک)`
                : 'Mill & Factory Purchases (مل / فیکٹری خریداری و میٹریل)'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 uppercase">
              Purchased Stock
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isRetailOrSmallBiz
              ? `Record supplier invoices, restock ${modeCfg.label} catalog products, and track supplier payables.`
              : 'Dedicated tracking for raw wheat, packaging bags, fortification premix, and direct products purchased directly by the mill. Separated from production stock and customer returns.'}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isRetailOrSmallBiz ? '+ Record Supplier Purchase' : '+ Record Mill Purchase'}</span>
        </button>
      </div>

      {notificationMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">
            ×
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchase Value */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Purchase Value</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {currency} {totalPurchaseValue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">Across {totalPurchasesCount} purchase batch(es)</div>
        </div>

        {/* Available Purchased Stock */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Available Purchased Stock</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {totalAvailableBags.toLocaleString()}{' '}
            <span className="text-xs font-normal">{isRetailOrSmallBiz ? 'units' : 'bags'}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {isRetailOrSmallBiz
              ? 'Active in store inventory'
              : `Weight: ${totalAvailableWeightKg.toLocaleString()} kg active in mill`}
          </div>
        </div>

        {/* Used / Issued Material */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isRetailOrSmallBiz ? 'Issued / Dispatched Stock' : 'Used / Issued Material'}
            </span>
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {totalUsedBags.toLocaleString()}{' '}
            <span className="text-xs font-normal">{isRetailOrSmallBiz ? 'units' : 'bags'}</span>
          </div>
          <div className="text-xs text-slate-400">
            {isRetailOrSmallBiz ? 'Issued from purchase batches' : 'Consumed in milling / packaging'}
          </div>
        </div>

        {/* Active Batches */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Batches</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {purchases.filter(p => p.status === 'active').length} <span className="text-xs font-normal text-slate-400">in stock</span>
          </div>
          <div className="text-xs text-slate-400">
            {purchases.filter(p => p.status === 'exhausted').length} batches fully exhausted
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by product, supplier, batch #..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({purchases.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Available ({purchases.filter(p => p.status === 'active').length})
              </button>
              <button
                onClick={() => setStatusFilter('exhausted')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'exhausted'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Exhausted ({purchases.filter(p => p.status === 'exhausted').length})
              </button>
            </div>

            {/* Category Dropdown Filter */}
            {categoriesList.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="all">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Purchases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Batch / Date</th>
                <th className="py-2.5 px-3 font-semibold">Purchased Product & Category</th>
                <th className="py-2.5 px-3 font-semibold">Supplier / Vendor</th>
                <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                <th className="py-2.5 px-3 font-semibold text-right">Purchase Rate</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Amount</th>
                <th className="py-2.5 px-3 font-semibold text-center">Remaining Stock</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No mill purchases found</p>
                    <p className="text-[11px] mt-1">
                      Click "+ Record Mill Purchase" above to add products purchased directly by the mill.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(item => {
                  const percentRemaining =
                    item.quantityBags > 0
                      ? Math.round((item.remainingBags / item.quantityBags) * 100)
                      : 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.purchaseNo}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.date}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productNameEn}
                          {item.productNameUr && (
                            <span className="text-blue-600 dark:text-blue-400 ml-1.5 font-medium" dir="rtl">
                              ({item.productNameUr})
                            </span>
                          )}
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.supplierName}
                        </div>
                        {item.paymentStatus && (
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              item.paymentStatus === 'paid'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                                : item.paymentStatus === 'partial'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.quantityBags} bags
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(item.totalWeightKg || item.quantityBags * item.bagSizeKg).toLocaleString()} kg ({item.bagSizeKg}kg)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {currency} {item.purchaseRate.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {currency} {item.totalAmount.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.remainingBags} bags
                        </div>
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percentRemaining > 30 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percentRemaining}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {item.usedBags} used ({percentRemaining}%)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.remainingBags > 0 && (
                            <button
                              onClick={() => {
                                setIssueModalItem(item);
                                setIssueBags('10');
                                setIssueReason('');
                              }}
                              title="Issue / Use Material"
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs transition-all active:scale-98"
                            >
                              Issue Stock
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            title="View Full Purchase Record"
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmItem(item);
                              setDeleteReason('');
                            }}
                            title="Delete Batch Record"
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Record New Purchase Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleCreatePurchase}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">Record Mill / Factory Purchase</h3>
                  <p className="text-xs text-slate-300">
                    This material will be added directly into dedicated Purchased Stock inventory.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Product Selection Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Source *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUseCatalogProduct(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      useCatalogProduct
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    Select From Catalog Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCatalogProduct(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      !useCatalogProduct
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    Enter Raw Material / Custom Item
                  </button>
                </div>
              </div>

              {useCatalogProduct ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catalog Product *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={e => {
                      const newId = e.target.value;
                      setSelectedProductId(newId);
                      const prod = db.products.find(p => p.id === newId);
                      if (prod) {
                        if (prod.category) setCategory(prod.category);
                        if (isRetailOrSmallBiz) {
                          setBagSizeKg('1');
                        } else if (prod.bagSizes?.[0]) {
                          setBagSizeKg(String(prod.bagSizes[0]));
                        }
                        if (prod.purchasePrice && prod.purchasePrice > 0) {
                          setPurchaseRate(String(prod.purchasePrice));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    {physicalCatalogProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameEn} ({p.nameUr}) · {p.category}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Material / Product Name (English) *
                    </label>
                    <input
                      type="text"
                      value={customProductName}
                      onChange={e => setCustomProductName(e.target.value)}
                      placeholder="e.g. Raw Wheat Gandaam Grade A"
                      required={!useCatalogProduct}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Name (Urdu - اختیاری)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={customProductNameUr}
                      onChange={e => setCustomProductNameUr(e.target.value)}
                      placeholder="گندم درجہ اول"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Category, Date, Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Material Category / Type *
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Raw Wheat, Packaging Bags, Fortification"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Vendor Name *
                  </label>
                  <input
                    type="text"
                    list="purchase-suppliers-list"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    placeholder="e.g. Punjab Traders / Unilever Distributor"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                  <datalist id="purchase-suppliers-list">
                    {(db.suppliers || []).map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {useCatalogProduct && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToProductStock}
                    onChange={e => setAddToProductStock(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Automatically add purchased quantity (+{calcQty || 0}) directly into active Product Stock Inventory
                  </span>
                </label>
              )}

              {/* Quantity, Bag Size, Purchase Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity (Bags / Units) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantityBags}
                    onChange={e => setQuantityBags(e.target.value)}
                    placeholder="e.g. 100"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isRetailOrSmallBiz ? 'Product Unit' : 'Unit / Bag Weight (kg) *'}
                  </label>
                  {isRetailOrSmallBiz ? (
                    <div className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold">
                      {useCatalogProduct
                        ? db.products.find(p => p.id === selectedProductId)?.unit || 'Pieces'
                        : 'Units'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={bagSizeKg}
                      onChange={e => setBagSizeKg(e.target.value)}
                      placeholder="50"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Rate ({currency} / Unit) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={purchaseRate}
                    onChange={e => setPurchaseRate(e.target.value)}
                    placeholder="e.g. 4800"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Calculation Banner */}
              {calcQty > 0 && calcRate > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 dark:text-slate-300">Total Weight: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{calcTotalWeight.toLocaleString()} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-300">Total Purchase Amount: </span>
                    <strong className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                      {currency} {calcTotalAmount.toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Supplier Payment Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="cash">Cash (نقد)</option>
                      <option value="bank_transfer">Bank Transfer (بینک)</option>
                      <option value="cheque">Cheque (چیک)</option>
                      <option value="credit">Credit / Payable (ادھار)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="partial">Partial Payment</option>
                      <option value="credit">Unpaid / Full Credit</option>
                    </select>
                  </div>

                  {paymentStatus === 'partial' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Amount Paid ({currency}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={calcTotalAmount}
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Quality Remarks / Delivery Vehicle #
                </label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Truck # LES-9081, moisture content 10.5%, verified on weighbridge"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Add to Purchased Stock</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Issue / Use Stock Modal */}
      {issueModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleConfirmIssueStock}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Issue / Use Purchased Material</h3>
                  <p className="text-xs text-slate-400">{issueModalItem.purchaseNo} · {issueModalItem.productNameEn}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Batch Quantity:</span>
                <span className="font-mono font-bold">{issueModalItem.quantityBags} bags</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Remaining:</span>
                <span className="font-mono font-bold text-emerald-600">{issueModalItem.remainingBags} bags ({(issueModalItem.remainingWeightKg || issueModalItem.remainingBags * issueModalItem.bagSizeKg).toLocaleString()} kg)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity to Issue / Use (Bags) *
              </label>
              <input
                type="number"
                min={1}
                max={issueModalItem.remainingBags}
                value={issueBags}
                onChange={e => setIssueBags(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono font-bold"
              />
              {Number(issueBags) > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Weight to deduct: {(Number(issueBags) * issueModalItem.bagSizeKg).toLocaleString()} kg. Remaining after: {Math.max(0, issueModalItem.remainingBags - Number(issueBags))} bags.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issuance Destination / Reason *
              </label>
              <input
                type="text"
                value={issueReason}
                onChange={e => setIssueReason(e.target.value)}
                placeholder="e.g. Issued to Production Mill Shift 1, Packaging department, Mixing"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIssueModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Confirm Issuance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Purchase Batch {selectedDetailItem.purchaseNo}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDetailItem.productNameEn} · {selectedDetailItem.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400">Supplier:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedDetailItem.supplierName}</div>
                </div>
                <div>
                  <span className="text-slate-400">Category:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedDetailItem.category}</div>
                </div>
                <div>
                  <span className="text-slate-400">Purchase Date:</span>
                  <div className="font-mono text-slate-900 dark:text-white">{selectedDetailItem.date}</div>
                </div>
                <div>
                  <span className="text-slate-400">Recorded By:</span>
                  <div className="text-slate-900 dark:text-white">{selectedDetailItem.createdBy}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400">Total Quantity:</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedDetailItem.quantityBags} bags ({(selectedDetailItem.totalWeightKg || selectedDetailItem.quantityBags * selectedDetailItem.bagSizeKg).toLocaleString()} kg)
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Purchase Rate:</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {currency} {selectedDetailItem.purchaseRate.toLocaleString()} / bag
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Total Purchase Value:</span>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {currency} {selectedDetailItem.totalAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Payment Status:</span>
                  <div className="font-bold uppercase text-slate-900 dark:text-white">
                    {selectedDetailItem.paymentStatus || 'N/A'} ({selectedDetailItem.paymentMethod || 'cash'})
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">Available In Stock:</span>
                    <div className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedDetailItem.remainingBags} bags
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px]">Used / Issued:</span>
                    <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {selectedDetailItem.usedBags} bags
                    </div>
                  </div>
                </div>
              </div>

              {selectedDetailItem.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-400 block mb-0.5">Notes:</span>
                  {selectedDetailItem.notes}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Mill Purchase Batch</h3>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete purchase batch <strong>{deleteConfirmItem.purchaseNo}</strong> ({deleteConfirmItem.productNameEn})?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Removal / Audit Note *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate entry, cancelled order"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
