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
  CreditCard,
  Wallet,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  CircleSlash,
  ArrowRight,
  DollarSign,
  Truck,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import { AppDatabase, ModuleKey, AppLanguage } from '../types';
import { translations } from '../services/translations';
import { getBusinessModeConfig, normalizeBusinessMode } from '../services/businessMode';

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
  const mode = normalizeBusinessMode(db.profile?.businessType);
  const modeConfig = getBusinessModeConfig(db.profile?.businessType);

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

  // Sales & Payment Summary Calculations
  const currentMonthPrefix = todayStr.slice(0, 7);
  const summarySales = completedSales.filter(s => {
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === 'month') return s.date.startsWith(currentMonthPrefix);
    return true;
  });

  const summaryGrossSales = summarySales.reduce((acc, s) => acc + (s.subtotal || s.grandTotal), 0);
  const summaryDiscounts = summarySales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const summaryNetSales = summarySales.reduce((acc, s) => acc + s.grandTotal, 0);
  const summaryPaid = summarySales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const summaryBalance = summarySales.reduce((acc, s) => acc + Math.max(0, s.balanceAmount || 0), 0);
  const summaryBags = summarySales.reduce((acc, s) => acc + s.totalBags, 0);

  const recoveryPercent = summaryNetSales > 0 ? Math.min(100, (summaryPaid / summaryNetSales) * 100) : 100;

  const cashReceived = summarySales
    .filter(s => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const bankReceived = summarySales
    .filter(s => s.paymentMethod === 'bank_transfer' || s.paymentMethod === 'cheque')
    .reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const otherReceived = Math.max(0, summaryPaid - cashReceived - bankReceived);

  const paidCount = summarySales.filter(s => s.paymentStatus === 'paid').length;
  const partialCount = summarySales.filter(s => s.paymentStatus === 'partial').length;
  const unpaidCount = summarySales.filter(s => s.paymentStatus === 'credit').length;

  const recentTransactions = summarySales.slice(0, 4);

  // Dedicated Mill / Factory Purchases Data (Requirement 3)
  const millPurchases = db.millPurchases || [];
  const totalMillPurchaseCount = millPurchases.length;
  const totalMillPurchaseValue = millPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const totalMillPurchasedStock = millPurchases.reduce((acc, p) => acc + (p.quantityBags || 0), 0);
  const totalMillAvailableStock = millPurchases.reduce((acc, p) => acc + (p.remainingBags || 0), 0);
  const totalMillAvailableWeightKg = millPurchases.reduce((acc, p) => acc + (p.remainingWeightKg || 0), 0);
  const totalMillUsedStock = millPurchases.reduce((acc, p) => acc + (p.usedBags || 0), 0);
  const recentMillPurchases = millPurchases.slice(0, 4);

  // Latest Shift Breakdown (most recent session or active products breakdown)
  const latestSession = db.productionSessions[0];

  if (mode === 'shopping_mart' || mode === 'small_business') {
    const todayPurchasesValue = millPurchases
      .filter(p => p.date === todayStr)
      .reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const monthSalesValue = completedSales
      .filter(s => s.date.startsWith(currentMonthPrefix))
      .reduce((acc, s) => acc + s.grandTotal, 0);

    const expensesList = db.expenses || [];
    const todayExpensesValue = expensesList
      .filter(e => e.date === todayStr)
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalExpensesValue = expensesList.reduce((acc, e) => acc + (e.amount || 0), 0);

    let estimatedCogs = 0;
    for (const s of completedSales) {
      for (const l of s.lines) {
        const prod = db.products.find(p => p.id === l.productId);
        if (prod?.purchasePrice && prod.purchasePrice > 0) {
          estimatedCogs += l.bags * prod.purchasePrice;
        }
      }
    }
    const netProfit = totalSalesValue - estimatedCogs - totalExpensesValue;

    const physicalProducts = db.products.filter(p => p.isActive && p.itemType !== 'service');
    const getProdStock = (pid: string) =>
      db.stockBalances.filter(b => b.productId === pid).reduce((sum, b) => sum + b.availableBags, 0);

    const outOfStockProducts = physicalProducts.filter(p => getProdStock(p.id) <= 0);
    const lowStockProducts = physicalProducts.filter(p => {
      const st = getProdStock(p.id);
      return st > 0 && st <= (p.minStockLevel ?? 10);
    });

    const totalReceivables =
      (db.customers || []).reduce((acc, c) => acc + (c.currentBalance || 0), 0) ||
      completedSales.reduce((acc, s) => acc + (s.balanceAmount || 0), 0);
    const totalPayables =
      (db.suppliers || []).reduce((acc, s) => acc + (s.currentBalance || 0), 0) ||
      millPurchases.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);

    return (
      <div className="space-y-6 pb-12 select-none">
        {/* Top Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {db.profile?.businessName || modeConfig.appTitle}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                  mode === 'shopping_mart'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-200'
                    : 'bg-purple-50 dark:bg-purple-950 text-purple-600 border-purple-200'
                }`}
              >
                {modeConfig.labelEn}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{modeConfig.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('sales')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{mode === 'shopping_mart' ? 'New POS Bill' : 'New Sale Invoice'}</span>
            </button>
            <button
              onClick={() => onNavigate('products_catalog')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>{modeConfig.moduleLabels.products_catalog}</span>
            </button>
            <button
              onClick={() => onNavigate('mill_purchases')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
            >
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Record Purchase</span>
            </button>
            <button
              onClick={() => onNavigate('expenses_payments')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
            >
              <Wallet className="w-4 h-4 text-rose-600" />
              <span>Expenses & Profit</span>
            </button>
          </div>
        </div>

        {/* 8 Mode-Specific KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Today's Sales</span>
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {currency} {todaySalesValue.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {todaySalesList.length} invoices today • Total: {currency} {totalSalesValue.toLocaleString()}
            </div>
          </div>

          {mode === 'shopping_mart' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Today's Purchases</span>
                <Truck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {currency} {todayPurchasesValue.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Cumulative Purchases: {currency} {totalMillPurchaseValue.toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Monthly Sales</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {currency} {monthSalesValue.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Total Purchases: {currency} {totalMillPurchaseValue.toLocaleString()}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">
                {mode === 'shopping_mart' ? "Today's Expenses" : 'Total Expenses'}
              </span>
              <Wallet className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
              {currency}{' '}
              {(mode === 'shopping_mart' ? todayExpensesValue : totalExpensesValue).toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              All-Time Expenses: {currency} {totalExpensesValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Estimated Net Profit</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div
              className={`mt-2 text-2xl font-bold font-mono ${
                netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {currency} {netProfit.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              After COGS ({currency} {estimatedCogs.toLocaleString()}) & Expenses
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Catalog Products</span>
              <Boxes className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {db.products.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Available Units in Stock: {availableStockBags.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Low Stock & Out of Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-600">
              {lowStockProducts.length} Low / {outOfStockProducts.length} Out
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Items below minimum reorder threshold
            </div>
          </div>

          <div
            onClick={() => onNavigate('customers_suppliers')}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs cursor-pointer hover:border-blue-400 transition"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Customer Receivables</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
              {currency} {totalReceivables.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {(db.customers || []).length} registered customers
            </div>
          </div>

          <div
            onClick={() => onNavigate('customers_suppliers')}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs cursor-pointer hover:border-blue-400 transition"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Supplier Payables</span>
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-600">
              {currency} {totalPayables.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {(db.suppliers || []).length} registered suppliers
            </div>
          </div>
        </div>

        {/* Recent Sales Invoices & Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Recent {mode === 'shopping_mart' ? 'POS Sales & Bills' : 'Sales Invoices'}
              </h3>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {completedSales.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No sales invoices recorded in this workspace yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {completedSales.slice(0, 6).map(sale => (
                  <div key={sale.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {sale.invoiceNo} — {sale.customerName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sale.date} • {sale.lines.length} items • {sale.paymentMethod}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-blue-600">
                        {currency} {sale.grandTotal.toLocaleString()}
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          sale.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Low Stock & Out-of-Stock Alerts
              </h3>
              <button
                onClick={() => onNavigate('products_catalog')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Manage Catalog
              </button>
            </div>
            {[...outOfStockProducts, ...lowStockProducts].length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-600">
                All active products have healthy stock levels.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs max-h-72 overflow-y-auto">
                {[...outOfStockProducts, ...lowStockProducts].slice(0, 8).map(prod => {
                  const st = getProdStock(prod.id);
                  return (
                    <div key={prod.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {prod.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {prod.category} {prod.barcode ? `• ${prod.barcode}` : ''}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          st <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {st <= 0 ? 'Out of Stock' : `${st} ${prod.unit || 'units'} left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
      {(() => {
        const isFlourPro = db.settings.theme === 'flourpro-light';
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Production Weight */}
            <div
              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                isFlourPro
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-300/80 shadow-amber-900/5 ring-1 ring-amber-300/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isFlourPro ? 'text-amber-900 font-bold' : ''}`}>
                  {t.totalProductionWeight}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isFlourPro
                      ? 'bg-amber-500/15 text-amber-800 border border-amber-300/60'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    isFlourPro ? 'text-amber-950' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {totalProductionWeight.toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${isFlourPro ? 'text-amber-800' : 'text-slate-500'}`}>kg</span>
              </div>
              <div className={`mt-2 text-xs flex items-center gap-1 ${isFlourPro ? 'text-amber-800/80' : 'text-slate-500'}`}>
                <span>Production Volume:</span>
                <strong className={`font-mono ${isFlourPro ? 'text-amber-950' : 'text-slate-700 dark:text-slate-300'}`}>
                  {(totalProductionWeight / 1000).toFixed(2)} Metric Tons
                </strong>
              </div>
            </div>

            {/* Total Production Bags */}
            <div
              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                isFlourPro
                  ? 'bg-gradient-to-br from-orange-50 to-orange-100/60 border-orange-300/80 shadow-orange-900/5 ring-1 ring-orange-300/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isFlourPro ? 'text-orange-900 font-bold' : ''}`}>
                  {t.totalProductionBags}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isFlourPro
                      ? 'bg-orange-500/15 text-orange-800 border border-orange-300/60'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
                  }`}
                >
                  <Factory className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    isFlourPro ? 'text-orange-950' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {totalProductionBags.toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${isFlourPro ? 'text-orange-800' : 'text-slate-500'}`}>{t.bags}</span>
              </div>
              <div className={`mt-2 text-xs flex items-center gap-1 ${isFlourPro ? 'text-orange-800/80' : 'text-slate-500'}`}>
                <span>Sessions Recorded:</span>
                <strong className={isFlourPro ? 'text-orange-950' : 'text-slate-700 dark:text-slate-300'}>
                  {db.productionSessions.length} shifts
                </strong>
              </div>
            </div>

            {/* Available Stock */}
            <div
              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                isFlourPro
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-100/60 border-emerald-300/80 shadow-emerald-900/5 ring-1 ring-emerald-300/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isFlourPro ? 'text-emerald-900 font-bold' : ''}`}>
                  {t.availableStockBags}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isFlourPro
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300/60'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    isFlourPro ? 'text-emerald-950' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {availableStockBags.toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${isFlourPro ? 'text-emerald-800' : 'text-slate-500'}`}>{t.bags} in Mill</span>
              </div>
              <div className={`mt-2 text-xs flex items-center gap-1 ${isFlourPro ? 'text-emerald-800/80' : 'text-slate-500'}`}>
                <span>Total Weight:</span>
                <strong className={`font-mono ${isFlourPro ? 'text-emerald-950' : 'text-slate-700 dark:text-slate-300'}`}>
                  {availableStockWeight.toLocaleString()} kg
                </strong>
              </div>
            </div>

            {/* Total Sales Value */}
            <div
              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                isFlourPro
                  ? 'bg-gradient-to-br from-indigo-50 to-blue-100/60 border-indigo-300/80 shadow-indigo-900/5 ring-1 ring-indigo-300/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isFlourPro ? 'text-indigo-900 font-bold' : ''}`}>
                  {t.totalSalesValue}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isFlourPro
                      ? 'bg-indigo-500/15 text-indigo-800 border border-indigo-300/60'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-xs font-bold ${isFlourPro ? 'text-indigo-700' : 'text-slate-400'}`}>{currency}</span>
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    isFlourPro ? 'text-indigo-950' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {totalSalesValue.toLocaleString()}
                </span>
              </div>
              <div className={`mt-2 text-xs flex items-center gap-1 ${isFlourPro ? 'text-indigo-800/80' : 'text-slate-500'}`}>
                <span>Dispatched:</span>
                <strong className={`font-mono ${isFlourPro ? 'text-indigo-950' : 'text-slate-700 dark:text-slate-300'}`}>
                  {totalSalesBags} bags ({totalSalesCount} invoices)
                </strong>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Sales & Payment Summary (Task 5: Dashboard Sales & Payment Summary) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.salesPaymentSummary || 'Sales & Payment Recovery Summary'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time receivables, cash flow, recovery rate, and invoice payment statuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dateFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.allTime || 'All-Time'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('month')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dateFilter === 'month'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.thisMonth || 'This Month'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dateFilter === 'today'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.todayFilter || 'Today'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all"
            >
              <span>{t.viewSalesLedger || 'Sales Ledger'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Primary Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Net Sales Volume */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {t.totalNetSales || 'Net Sales Volume'}
              </span>
              <Receipt className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-slate-400">{currency}</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {summaryNetSales.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Gross: {currency} {summaryGrossSales.toLocaleString()}</span>
              {summaryDiscounts > 0 && (
                <span className="text-amber-600 font-medium">Disc: -{currency} {summaryDiscounts.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* 2. Total Collected */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {t.totalReceived || 'Total Collected'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-emerald-500">{currency}</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summaryPaid.toLocaleString()}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 space-y-1">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, recoveryPercent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Recovery Rate:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {recoveryPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 3. Outstanding Receivables (Udhaar) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {t.totalReceivables || 'Outstanding Receivables'}
              </span>
              <AlertTriangle className={`w-4 h-4 ${summaryBalance > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-rose-500">{currency}</span>
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  summaryBalance > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {summaryBalance.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Credit Invoices:</span>
              <span className={`font-semibold ${summaryBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {unpaidCount + partialCount} pending
              </span>
            </div>
          </div>

          {/* 4. Dispatched Volume */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Dispatched Quantity
              </span>
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {summaryBags.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">{t.bags}</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Invoices:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {summarySales.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Payment Modes & Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Left: Payment Method Collections */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.paymentBreakdown || 'Collection by Payment Mode'}</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.cash || 'Cash'}
                </span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {currency} {cashReceived.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.bankTransfer || 'Bank / Online'}
                </span>
                <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">
                  {currency} {bankReceived.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.credit || 'Udhaar / Credit'}
                </span>
                <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                  {currency} {summaryBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Payment Status Breakdown */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Invoice Payment Status</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  {t.paid || 'Fully Paid'}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {paidCount}
                </span>
                <span className="text-[10px] text-slate-400 block">invoices</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  {t.partial || 'Partial'}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {partialCount}
                </span>
                <span className="text-[10px] text-slate-400 block">invoices</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  {t.unpaid || 'Unpaid / Udhaar'}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {unpaidCount}
                </span>
                <span className="text-[10px] text-slate-400 block">invoices</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Snapshot */}
        {recentTransactions.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Latest Sales & Invoices ({recentTransactions.length})
              </span>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View all in Sales Module
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {recentTransactions.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => onNavigate('sales')}
                  className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {sale.invoiceNo}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sale.paymentStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                          : sale.paymentStatus === 'partial'
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950 text-rose-600 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {sale.paymentStatus}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {sale.customerName || 'Walk-in Customer'}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-400">{sale.totalBags} bags</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currency} {sale.grandTotal.toLocaleString()}
                    </span>
                  </div>
                  {sale.balanceAmount > 0 && (
                    <div className="text-[11px] text-rose-500 font-mono text-right font-medium">
                      Bal: {currency} {sale.balanceAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* REQUIREMENT 3: DEDICATED MILL / FACTORY PURCHASES & STOCK SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Mill / Factory Purchases & Stock (مل خریداری و میٹریل)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Direct Purchases
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Separately tracks materials and products purchased directly by the mill. Distinct from production stock and customer returns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigate('mill_purchases')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-98"
            >
              <span>Manage Mill Purchases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Purchases</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {currency} {totalMillPurchaseValue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{totalMillPurchaseCount} batches recorded</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Purchased Stock Total</div>
            <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {totalMillPurchasedStock.toLocaleString()} bags
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Raw materials & purchased goods</div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Available Stock</div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalMillAvailableStock.toLocaleString()} bags
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{totalMillAvailableWeightKg.toLocaleString()} kg active in mill</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Used / Issued Quantity</div>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {totalMillUsedStock.toLocaleString()} bags
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Consumed in mill operations</div>
          </div>
        </div>

        {/* Recent Purchases Table / Snippet */}
        {recentMillPurchases.length > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Mill Purchases</span>
              <span className="text-[11px] text-slate-400 font-normal">Last {recentMillPurchases.length} batches</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentMillPurchases.map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('mill_purchases')}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.purchaseNo}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.productNameEn}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Supplier: {item.supplierName} · {item.date}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500 font-mono">{item.remainingBags} / {item.quantityBags} bags</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {currency} {item.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Truck className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <p className="text-xs font-semibold">No direct mill purchases recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Keep grain purchases, bags, and raw materials organized separately in Mill Purchases.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('mill_purchases')}
              className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Record First Mill Purchase
            </button>
          </div>
        )}
      </div>

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
