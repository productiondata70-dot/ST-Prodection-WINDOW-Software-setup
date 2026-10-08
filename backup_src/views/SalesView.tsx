import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  Ban,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import {
  AppDatabase,
  SaleRecord,
  SaleLineItem,
  PaymentMethod,
  PaymentStatus,
  AppLanguage,
} from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

interface SalesViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  initialDraftItem?: { productId: string; bagSizeKg: number; bags: number } | null;
  onClearDraft?: () => void;
  language: AppLanguage;
}

export const SalesView: React.FC<SalesViewProps> = ({
  db,
  storage,
  currentUser,
  initialDraftItem,
  onClearDraft,
  language,
}) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';

  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleRecord | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<SaleRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [referenceNo, setReferenceNo] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  const [saleLines, setSaleLines] = useState<
    Array<{
      productId: string;
      bagSizeKg: number;
      bags: number;
      unitPrice: number;
    }>
  >([]);

  // If opened via "Move Stock to Sales" draft
  useEffect(() => {
    if (initialDraftItem) {
      setSaleLines([
        {
          productId: initialDraftItem.productId,
          bagSizeKg: initialDraftItem.bagSizeKg,
          bags: initialDraftItem.bags,
          unitPrice: 0,
        },
      ]);
      setIsNewSaleOpen(true);
      if (onClearDraft) onClearDraft();
    }
  }, [initialDraftItem]);

  const handleAddLine = () => {
    const firstProd = db.products.find(p => p.isActive) || db.products[0];
    if (!firstProd) return;
    setSaleLines([
      ...saleLines,
      {
        productId: firstProd.id,
        bagSizeKg: firstProd.bagSizes[0] || 50,
        bags: 10,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setSaleLines(saleLines.filter((_, i) => i !== idx));
  };

  // Line Calculations
  const calculatedLines: SaleLineItem[] = saleLines.map((line, idx) => {
    const prod = db.products.find(p => p.id === line.productId);
    const weightKg = line.bags * line.bagSizeKg;
    const lineTotal = line.bags * (line.unitPrice || 0);

    return {
      id: `sline-${idx}`,
      productId: line.productId,
      productNameEn: prod ? prod.nameEn : 'Unknown',
      productNameUr: prod ? prod.nameUr : '',
      bagSizeKg: line.bagSizeKg,
      bags: line.bags,
      weightKg,
      unitPrice: line.unitPrice,
      lineTotal,
    };
  });

  const totalBags = calculatedLines.reduce((acc, l) => acc + l.bags, 0);
  const totalWeightKg = calculatedLines.reduce((acc, l) => acc + l.weightKg, 0);
  const subtotal = calculatedLines.reduce((acc, l) => acc + l.lineTotal, 0);
  const discountVal = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);

  const effectivePaidAmount =
    paymentStatus === 'paid' ? grandTotal : paymentStatus === 'credit' ? 0 : Number(paidAmount) || 0;
  const balanceAmount = Math.max(0, grandTotal - effectivePaidAmount);

  // Stats
  const completedSales = db.sales.filter(s => s.status === 'completed');
  const totalSalesRevenue = completedSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalOutstanding = completedSales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const totalBagsSold = completedSales.reduce((acc, s) => acc + s.totalBags, 0);

  const handlePostSale = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    if (!customerName.trim()) {
      setNotificationMsg({ type: 'error', text: 'Customer name is required.' });
      return;
    }

    if (calculatedLines.length === 0) {
      setNotificationMsg({ type: 'error', text: 'Please add at least one product item to the invoice.' });
      return;
    }

    // Verify Stock before posting
    for (const line of calculatedLines) {
      const balance = storage.getStockBalance(line.productId, line.bagSizeKg);
      const available = balance ? balance.availableBags : 0;
      if (!db.settings.allowNegativeInventory && available < line.bags) {
        setNotificationMsg({
          type: 'error',
          text: `Insufficient stock for ${line.productNameEn} (${line.bagSizeKg} kg). Available: ${available} bags, Required: ${line.bags} bags.`,
        });
        return;
      }
    }

    try {
      const sale = storage.addSale(
        {
          date: saleDate,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          lines: calculatedLines,
          totalBags,
          totalWeightKg,
          subtotal,
          discount: discountVal,
          grandTotal,
          paymentMethod,
          paymentStatus,
          paidAmount: effectivePaidAmount,
          balanceAmount,
          referenceNo: referenceNo.trim() || undefined,
          notes: saleNotes.trim(),
          createdBy: currentUser,
        },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Invoice ${sale.invoiceNo} successfully generated and posted! Inventory updated.`,
      });
      setIsNewSaleOpen(false);
      setSaleLines([]);
      setCustomerName('');
      setCustomerPhone('');
      setSaleNotes('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error creating sale invoice.' });
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalSale) return;
    try {
      storage.cancelSale(cancelModalSale.id, cancelReason.trim() || 'Customer requested cancellation', currentUser);
      setNotificationMsg({
        type: 'success',
        text: `Invoice ${cancelModalSale.invoiceNo} cancelled and stock inventory reversed.`,
      });
      setCancelModalSale(null);
      setCancelReason('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error cancelling sale.' });
    }
  };

  const filteredSales = db.sales.filter(s => {
    return (
      s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lines.some(l => l.productNameEn.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.sales} (سیلز رجسٹر و بلنگ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispatch billing, customer receivables, real-time stock deduction, and reversal audits.
          </p>
        </div>

        <button
          onClick={() => {
            handleAddLine();
            setIsNewSaleOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-98 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Invoice</span>
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t.totalSalesValue}</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            <span className="text-sm font-bold text-slate-400 mr-1">{currency}</span>
            {totalSalesRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{completedSales.length} completed invoices</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Bags Dispatched</span>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {totalBagsSold.toLocaleString()} <span className="text-xs font-sans text-slate-400">bags</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total flour & products sold</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Receivables</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            <span className="text-sm font-bold text-slate-400 mr-1">{currency}</span>
            {totalOutstanding.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending credit sales / udhaar</p>
        </div>
      </div>

      {/* Sales Invoices Register */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, customer, phone, product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                <th className="py-2.5 px-3 font-semibold">Customer</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.grandTotal}</th>
                <th className="py-2.5 px-3 font-semibold text-center">Payment</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No sales invoices found. Click "New Sales Invoice" to dispatch flour.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isCancelled = sale.status === 'cancelled';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isCancelled ? 'opacity-60 bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{sale.date}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {sale.totalBags}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {sale.totalWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {currency} {sale.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : sale.paymentStatus === 'partial'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Posted
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          title="View Invoice Details"
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => setCancelModalSale(sale)}
                            title="Cancel Invoice & Reverse Stock"
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sales Invoice Modal */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handlePostSale}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold">New Sales Dispatch Invoice</h3>
                <p className="text-xs text-slate-300">Inventory will be deducted automatically upon confirmation.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSaleOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Customer and Sale Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Party Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Al-Madina Traders"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0300-0000000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Product Dispatch Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Product Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {saleLines.map((line, idx) => {
                    const prod = db.products.find(p => p.id === line.productId);
                    const sizes = prod?.bagSizes || [50];
                    const balance = storage.getStockBalance(line.productId, line.bagSizeKg);
                    const available = balance ? balance.availableBags : 0;
                    const isInsufficient = available < line.bags;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs grid grid-cols-12 gap-2 items-center ${
                          isInsufficient
                            ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* Product Select (col 4) */}
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] text-slate-400">Product</label>
                          <select
                            value={line.productId}
                            onChange={e => {
                              const newProdId = e.target.value;
                              const p = db.products.find(pr => pr.id === newProdId);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx].productId = newProdId;
                                copy[idx].bagSizeKg = p?.bagSizes[0] || 50;
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

                        {/* Bag Size (col 2) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-400">Bag Size</label>
                          <select
                            value={line.bagSizeKg}
                            onChange={e => {
                              const size = Number(e.target.value);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx].bagSizeKg = size;
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          >
                            {sizes.map(s => (
                              <option key={s} value={s}>
                                {s} kg
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Bags Count (col 2) */}
                        <div className="col-span-4 sm:col-span-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Bags</span>
                            <span className={isInsufficient ? 'text-rose-600 font-bold' : ''}>
                              (Avail: {available})
                            </span>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={line.bags}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx].bags = isNaN(val) ? 0 : val;
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        {/* Unit Price (col 2) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-400">Rate / Bag ({currency})</label>
                          <input
                            type="number"
                            min={0}
                            value={line.unitPrice}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx].unitPrice = isNaN(val) ? 0 : val;
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        {/* Total & Delete (col 2) */}
                        <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                          <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                            {currency} {(line.bags * (line.unitPrice || 0)).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                      <option value="credit">Credit / Udhaar (ادھار)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Discount ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>

                  {paymentStatus === 'partial' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Paid Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={grandTotal}
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Totals Summary Bar */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span>Total Bags: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{totalBags} bags</strong>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>Total Weight: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{totalWeightKg.toLocaleString()} kg</strong>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Grand Total</div>
                      <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {currency} {grandTotal.toLocaleString()}
                      </div>
                    </div>
                    {paymentStatus !== 'paid' && (
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Outstanding Balance</div>
                        <div className="text-base font-bold font-mono text-rose-600">
                          {currency} {balanceAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewSaleOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Post Sales Invoice</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Invoice {selectedSaleDetail.invoiceNo}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSaleDetail.customerName} · Date: {selectedSaleDetail.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold uppercase">{selectedSaleDetail.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold uppercase text-indigo-600">{selectedSaleDetail.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grand Total:</span>
                  <span className="font-mono font-bold">{currency} {selectedSaleDetail.grandTotal.toLocaleString()}</span>
                </div>
                {selectedSaleDetail.balanceAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">{currency} {selectedSaleDetail.balanceAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-xs font-bold uppercase text-slate-500">Invoice Items</div>
              {selectedSaleDetail.lines.map((l, i) => (
                <div key={i} className="p-2.5 border rounded-xl flex justify-between text-xs">
                  <div>
                    <div className="font-bold">{l.productNameEn} ({l.bagSizeKg} kg)</div>
                    <div className="text-[11px] text-slate-400">{l.bags} bags @ {currency} {l.unitPrice}</div>
                  </div>
                  <div className="font-mono font-bold text-indigo-600">
                    {currency} {l.lineTotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel Invoice {cancelModalSale.invoiceNo}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Cancelling this invoice will automatically reverse all stock deductions and log an audit reversal.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Order cancelled by party; incorrect price entered."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalSale(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
