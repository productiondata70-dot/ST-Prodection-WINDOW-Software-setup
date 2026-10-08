import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  TrendingUp,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  PieChart,
  DollarSign,
} from 'lucide-react';
import {
  AppDatabase,
  PaymentMethod,
  UserAccount,
} from '../types';
import { StorageService } from '../services/storage';

interface ExpensesPaymentsViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  isDark?: boolean;
}

const EXPENSE_CATEGORIES = [
  'Shop / Building Rent',
  'Electricity & Utility Bills',
  'Staff Salaries & Wages',
  'Transport & Delivery',
  'Packaging & Bags',
  'Equipment Maintenance',
  'Marketing & Office Supplies',
  'Taxes & Government Fees',
  'Miscellaneous Expense',
];

export const ExpensesPaymentsView: React.FC<ExpensesPaymentsViewProps> = ({
  db,
  currentUser,
  isDark = false,
}) => {
  const storage = StorageService.getInstance();
  const currency = db.profile?.currency || 'PKR';

  const canCreate = storage.hasPermission(currentUser, 'expenses_payments', 'create');
  const canDelete = storage.hasPermission(currentUser, 'expenses_payments', 'delete');

  const [activeTab, setActiveTab] = useState<'expenses' | 'payments' | 'profit_loss'>('expenses');

  // Expense Form State
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expNotes, setExpNotes] = useState('');

  // Payment Form State
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payType, setPayType] = useState<'customer_receipt' | 'supplier_payment'>('customer_receipt');
  const [payPartyName, setPayPartyName] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const expenses = db.expenses || [];
  const payments = db.payments || [];

  // Financial & Profit/Loss Calculations for Active Business
  const financials = useMemo(() => {
    const completedSales = db.sales.filter(s => s.status === 'completed');
    const grossSales = completedSales.reduce((sum, s) => sum + (s.subtotal || s.grandTotal || 0), 0);
    const totalDiscounts = completedSales.reduce((sum, s) => sum + (s.discount || 0), 0);
    const customerReturnsTotal = db.returns
      .filter(r => r.returnType === 'customer')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const netSales = Math.max(0, grossSales - totalDiscounts - customerReturnsTotal);

    // Estimate COGS from sold lines using product purchasePrice or latest purchase rate
    let estimatedCogs = 0;
    for (const sale of completedSales) {
      for (const line of sale.lines) {
        const prod = db.products.find(p => p.id === line.productId);
        if (prod?.purchasePrice && prod.purchasePrice > 0) {
          estimatedCogs += line.bags * prod.purchasePrice;
        } else {
          // Check latest purchase rate for this product
          const latestPurchase = (db.millPurchases || []).find(mp => mp.productId === line.productId);
          if (latestPurchase && latestPurchase.purchaseRate > 0) {
            estimatedCogs += line.bags * latestPurchase.purchaseRate;
          }
        }
      }
    }

    const totalPurchases = (db.millPurchases || []).reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = netSales - estimatedCogs;
    const netProfit = grossProfit - totalExpenses;

    const customerReceipts = payments
      .filter(p => p.paymentType === 'customer_receipt')
      .reduce((sum, p) => sum + p.amount, 0);
    const supplierPayments = payments
      .filter(p => p.paymentType === 'supplier_payment')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      grossSales,
      totalDiscounts,
      customerReturnsTotal,
      netSales,
      estimatedCogs,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      customerReceipts,
      supplierPayments,
    };
  }, [db.sales, db.returns, db.products, db.millPurchases, expenses, payments]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.addExpense(
        {
          date: expDate,
          category: expCategory,
          title: expTitle.trim() || expCategory,
          amount: Number(expAmount),
          paymentMethod: expMethod,
          notes: expNotes.trim() || undefined,
        },
        currentUser.name
      );
      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
      notify('success', 'Expense recorded successfully.');
    } catch (err: any) {
      notify('error', err.message || 'Failed to record expense.');
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!payPartyName.trim()) {
        throw new Error('Please enter or select a customer/supplier name.');
      }
      storage.addPayment(
        {
          date: payDate,
          paymentType: payType,
          partyName: payPartyName.trim(),
          amount: Number(payAmount),
          paymentMethod: payMethod,
          referenceNo: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined,
        },
        currentUser.name
      );
      setPayPartyName('');
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      notify('success', 'Payment entry recorded and ledger updated.');
    } catch (err: any) {
      notify('error', err.message || 'Failed to record payment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Expenses, Payments & Profit/Loss</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Record operating expenses, customer receipts, supplier payments, and live business profit analysis
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'expenses'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Payments & Receipts ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profit_loss')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'profit_loss'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Profit & Loss Statement
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/60 border-blue-200'}`}>
            <div className="text-[11px] font-medium text-blue-600 uppercase">Net Sales Revenue</div>
            <div className="text-lg font-bold text-blue-600 mt-0.5">
              {currency} {financials.netSales.toLocaleString()}
            </div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-50/60 border-rose-200'}`}>
            <div className="text-[11px] font-medium text-rose-600 uppercase">Total Expenses</div>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              {currency} {financials.totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-amber-50/60 border-amber-200'}`}>
            <div className="text-[11px] font-medium text-amber-600 uppercase">Estimated COGS</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {currency} {financials.estimatedCogs.toLocaleString()}
            </div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <div className="text-[11px] font-medium text-emerald-600 uppercase">Net Profit / Loss</div>
            <div className={`text-lg font-bold mt-0.5 ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currency} {financials.netProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {canCreate && (
            <div className={`lg:col-span-4 rounded-2xl p-5 border shadow-sm h-fit ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500" />
                Record New Expense
              </h3>
              <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Expense Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Description / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={e => setExpTitle(e.target.value)}
                    placeholder="e.g. Monthly Electricity Bill"
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Amount ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Paid Via
                    </label>
                    <select
                      value={expMethod}
                      onChange={e => setExpMethod(e.target.value as PaymentMethod)}
                      className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={expNotes}
                    onChange={e => setExpNotes(e.target.value)}
                    placeholder="Optional voucher or bill reference"
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition"
                >
                  Save Expense Entry
                </button>
              </form>
            </div>
          )}

          <div className={`${canCreate ? 'lg:col-span-8' : 'lg:col-span-12'} rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold uppercase ${isDark ? 'bg-slate-800/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Category & Title</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                        <td className="py-3 px-4 font-mono font-semibold">{exp.expenseNo}</td>
                        <td className="py-3 px-3">{exp.date}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{exp.title}</div>
                          <div className="text-[10px] text-slate-400">{exp.category}</div>
                        </td>
                        <td className="py-3 px-3 capitalize">{exp.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {currency} {exp.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => storage.deleteExpense(exp.id, currentUser.name)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {canCreate && (
            <div className={`lg:col-span-4 rounded-2xl p-5 border shadow-sm h-fit ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="font-bold text-sm mb-4">Record Payment / Receipt</h3>
              <form onSubmit={handleAddPayment} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayType('customer_receipt')}
                    className={`py-2 px-2.5 rounded-xl font-bold border text-[11px] flex items-center justify-center gap-1 ${
                      payType === 'customer_receipt'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Customer Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayType('supplier_payment')}
                    className={`py-2 px-2.5 rounded-xl font-bold border text-[11px] flex items-center justify-center gap-1 ${
                      payType === 'supplier_payment'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Supplier Payment
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    {payType === 'customer_receipt' ? 'Customer Name' : 'Supplier Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    list="party-datalist"
                    value={payPartyName}
                    onChange={e => setPayPartyName(e.target.value)}
                    placeholder="Select or type name"
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                  <datalist id="party-datalist">
                    {payType === 'customer_receipt'
                      ? (db.customers || []).map(c => <option key={c.id} value={c.name} />)
                      : (db.suppliers || []).map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Amount ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Method
                    </label>
                    <select
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                      className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Reference / Notes
                  </label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition"
                >
                  Record Entry
                </button>
              </form>
            </div>
          )}

          <div className={`${canCreate ? 'lg:col-span-8' : 'lg:col-span-12'} rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold uppercase ${isDark ? 'bg-slate-800/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Party Name</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No payment or receipt vouchers recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map(pay => (
                      <tr key={pay.id} className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                        <td className="py-3 px-4 font-mono font-semibold">{pay.paymentNo}</td>
                        <td className="py-3 px-3">{pay.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pay.paymentType === 'customer_receipt'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {pay.paymentType === 'customer_receipt' ? 'Customer Receipt' : 'Supplier Payment'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold">{pay.partyName}</td>
                        <td className="py-3 px-3 capitalize">{pay.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {currency} {pay.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => storage.deletePayment(pay.id, currentUser.name)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profit_loss' && (
        <div className={`rounded-2xl p-6 border shadow-sm space-y-5 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <h3 className="font-bold text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Profit & Loss Financial Statement — {db.profile?.businessName}
          </h3>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm border rounded-2xl overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-slate-50/60 dark:bg-slate-800/40">
              <span className="font-semibold">Gross Sales Revenue</span>
              <span className="font-mono font-bold">
                {currency} {financials.grossSales.toLocaleString()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-center text-rose-600">
              <span>Less: Invoice Discounts & Customer Returns</span>
              <span className="font-mono">
                - {currency} {(financials.totalDiscounts + financials.customerReturnsTotal).toLocaleString()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-center font-bold bg-blue-50/50 dark:bg-blue-950/30 text-blue-600">
              <span>Net Sales Revenue</span>
              <span className="font-mono text-base">
                {currency} {financials.netSales.toLocaleString()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-center text-amber-600">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono">
                - {currency} {financials.estimatedCogs.toLocaleString()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-center font-bold">
              <span>Gross Operating Profit</span>
              <span className="font-mono">
                {currency} {financials.grossProfit.toLocaleString()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-center text-rose-600">
              <span>Less: Operating Expenses ({expenses.length} vouchers)</span>
              <span className="font-mono">
                - {currency} {financials.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="p-5 flex justify-between items-center font-extrabold text-base bg-emerald-50/70 dark:bg-emerald-950/30">
              <span>Net Business Profit / (Loss)</span>
              <span className={`font-mono text-xl ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currency} {financials.netProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
