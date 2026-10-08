import React, { useState, useMemo } from 'react';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Wallet,
  Edit3,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Building2,
} from 'lucide-react';
import {
  AppDatabase,
  CustomerRecord,
  SupplierRecord,
  PaymentMethod,
  UserAccount,
} from '../types';
import { StorageService } from '../services/storage';

interface CustomersSuppliersViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  isDark?: boolean;
}

export const CustomersSuppliersView: React.FC<CustomersSuppliersViewProps> = ({
  db,
  currentUser,
  isDark = false,
}) => {
  const storage = StorageService.getInstance();
  const currency = db.profile?.currency || 'PKR';

  const canCreate = storage.hasPermission(currentUser, 'customers_suppliers', 'create');
  const canEdit = storage.hasPermission(currentUser, 'customers_suppliers', 'edit');
  const canDelete = storage.hasPermission(currentUser, 'customers_suppliers', 'delete');

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Party Modal
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');

  // Quick Payment / Receipt Modal
  const [paymentModalParty, setPaymentModalParty] = useState<{
    type: 'customer_receipt' | 'supplier_payment';
    id: string;
    name: string;
    currentBalance: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Ledger History Modal
  const [viewingLedgerParty, setViewingLedgerParty] = useState<{
    type: 'customer' | 'supplier';
    id: string;
    name: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const customers = db.customers || [];
  const suppliers = db.suppliers || [];

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.companyName || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0),
    [customers]
  );

  const totalPayables = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0),
    [suppliers]
  );

  const openAddModal = () => {
    setEditingCustomer(null);
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCompanyName('');
    setContactPerson('');
    setOpeningBalance('0');
    setNotes('');
    setShowPartyModal(true);
  };

  const openEditCustomer = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setEditingSupplier(null);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setOpeningBalance(String(c.openingBalance || 0));
    setNotes(c.notes || '');
    setShowPartyModal(true);
  };

  const openEditSupplier = (s: SupplierRecord) => {
    setEditingSupplier(s);
    setEditingCustomer(null);
    setName(s.name);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setCompanyName(s.companyName || '');
    setContactPerson(s.contactPerson || '');
    setOpeningBalance(String(s.openingBalance || 0));
    setNotes(s.notes || '');
    setShowPartyModal(true);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'customers') {
        if (editingCustomer) {
          storage.updateCustomer(
            editingCustomer.id,
            {
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              notes: notes.trim() || undefined,
            },
            currentUser.name
          );
          notify('success', `Customer "${name.trim()}" updated.`);
        } else {
          storage.addCustomer(
            {
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              openingBalance: Number(openingBalance) || 0,
              notes: notes.trim() || undefined,
            },
            currentUser.name
          );
          notify('success', `Customer "${name.trim()}" added.`);
        }
      } else {
        if (editingSupplier) {
          storage.updateSupplier(
            editingSupplier.id,
            {
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              companyName: companyName.trim() || undefined,
              contactPerson: contactPerson.trim() || undefined,
              notes: notes.trim() || undefined,
            },
            currentUser.name
          );
          notify('success', `Supplier "${name.trim()}" updated.`);
        } else {
          storage.addSupplier(
            {
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              companyName: companyName.trim() || undefined,
              contactPerson: contactPerson.trim() || undefined,
              openingBalance: Number(openingBalance) || 0,
              notes: notes.trim() || undefined,
            },
            currentUser.name
          );
          notify('success', `Supplier "${name.trim()}" added.`);
        }
      }
      setShowPartyModal(false);
    } catch (err: any) {
      notify('error', err.message || 'Failed to save record.');
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalParty) return;
    try {
      const amt = Number(paymentAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid positive payment amount.');
      }
      storage.addPayment(
        {
          date: new Date().toISOString().slice(0, 10),
          paymentType: paymentModalParty.type,
          partyId: paymentModalParty.id,
          partyName: paymentModalParty.name,
          amount: amt,
          paymentMethod,
          referenceNo: paymentRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        },
        currentUser.name
      );
      notify(
        'success',
        `Recorded ${paymentModalParty.type === 'customer_receipt' ? 'Customer Receipt' : 'Supplier Payment'} of ${currency} ${amt.toLocaleString()} for ${paymentModalParty.name}.`
      );
      setPaymentModalParty(null);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
    } catch (err: any) {
      notify('error', err.message || 'Failed to record payment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Customers & Suppliers Directory</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Manage customer receivables, supplier payables, contact details, and transaction ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add {activeTab === 'customers' ? 'Customer' : 'Supplier'}
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Registered Customers</div>
            <div className="text-lg font-bold mt-0.5">{customers.length}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <div className="text-[11px] font-medium text-emerald-600 uppercase">Customer Receivables</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              {currency} {totalReceivables.toLocaleString()}
            </div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Registered Suppliers</div>
            <div className="text-lg font-bold mt-0.5">{suppliers.length}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-amber-50/60 border-amber-200'}`}>
            <div className="text-[11px] font-medium text-amber-600 uppercase">Supplier Payables</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {currency} {totalPayables.toLocaleString()}
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

      {/* Tabs + Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} by name, phone, company...`}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          {activeTab === 'customers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase ${isDark ? 'bg-slate-800/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3">Phone & Contact</th>
                  <th className="py-3 px-3">Address</th>
                  <th className="py-3 px-3 text-right">Total Purchases</th>
                  <th className="py-3 px-3 text-right">Receivable Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No customers recorded yet. Click "Add Customer" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className={isDark ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50/80 text-slate-800'}>
                      <td className="py-3 px-4 font-semibold">{c.name}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone || '—'}</span>
                        </div>
                        {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{c.address || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {currency} {(c.totalPurchasesAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={c.currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {currency} {(c.currentBalance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalParty({
                                type: 'customer_receipt',
                                id: c.id,
                                name: c.name,
                                currentBalance: c.currentBalance || 0,
                              });
                              setPaymentAmount(c.currentBalance > 0 ? String(c.currentBalance) : '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 font-semibold text-[11px] flex items-center gap-1"
                          >
                            <ArrowDownLeft className="w-3 h-3" /> Receive
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingLedgerParty({ type: 'customer', id: c.id, name: c.name })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600"
                            title="View Customer Ledger"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditCustomer(c)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => storage.deleteCustomer(c.id, currentUser.name)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase ${isDark ? 'bg-slate-800/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-3">Company & Contact</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3 text-right">Total Supplied</th>
                  <th className="py-3 px-3 text-right">Payable Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No suppliers recorded yet. Click "Add Supplier" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className={isDark ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50/80 text-slate-800'}>
                      <td className="py-3 px-4 font-semibold">{s.name}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{s.companyName || '—'}</div>
                        {s.contactPerson && (
                          <div className="text-[10px] text-slate-400">Attn: {s.contactPerson}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">{s.phone || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {currency} {(s.totalSuppliedAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={s.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {currency} {(s.currentBalance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalParty({
                                type: 'supplier_payment',
                                id: s.id,
                                name: s.name,
                                currentBalance: s.currentBalance || 0,
                              });
                              setPaymentAmount(s.currentBalance > 0 ? String(s.currentBalance) : '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 font-semibold text-[11px] flex items-center gap-1"
                          >
                            <ArrowUpRight className="w-3 h-3" /> Pay
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingLedgerParty({ type: 'supplier', id: s.id, name: s.name })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600"
                            title="View Supplier Ledger"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditSupplier(s)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => storage.deleteSupplier(s.id, currentUser.name)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Customer or Supplier Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCustomer || editingSupplier ? 'Edit' : 'Add New'}{' '}
                {activeTab === 'customers' ? 'Customer' : 'Supplier'}
              </h3>
              <button onClick={() => setShowPartyModal(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveParty} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    {activeTab === 'customers' ? 'Customer Name' : 'Supplier Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {activeTab === 'suppliers' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Company / Distributor Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Address / City
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                {!editingCustomer && !editingSupplier && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Opening Balance ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={openingBalance}
                      onChange={e => setOpeningBalance(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment / Receipt Modal */}
      {paymentModalParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {paymentModalParty.type === 'customer_receipt'
                  ? `Receive Payment from ${paymentModalParty.name}`
                  : `Pay Supplier — ${paymentModalParty.name}`}
              </h3>
              <button onClick={() => setPaymentModalParty(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Outstanding Balance:</span>
                <span className="font-mono font-bold text-sm">
                  {currency} {paymentModalParty.currentBalance.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer / Online</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Reference / Receipt No
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="Optional reference"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalParty(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Party Ledger History Modal */}
      {viewingLedgerParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base">
                Transaction Ledger — {viewingLedgerParty.name}
              </h3>
              <button onClick={() => setViewingLedgerParty(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
              {viewingLedgerParty.type === 'customer' ? (
                <>
                  <h4 className="font-bold uppercase text-slate-400 text-[11px]">Sales Invoices</h4>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl overflow-hidden">
                    {db.sales
                      .filter(
                        s =>
                          s.customerId === viewingLedgerParty.id ||
                          s.customerName.toLowerCase() === viewingLedgerParty.name.toLowerCase()
                      )
                      .map(s => (
                        <div key={s.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold">{s.invoiceNo}</div>
                            <div className="text-[11px] text-slate-400">{s.date}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold">
                              {currency} {s.grandTotal.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-amber-600">
                              Due: {currency} {(s.balanceAmount || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <>
                  <h4 className="font-bold uppercase text-slate-400 text-[11px]">Purchases</h4>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl overflow-hidden">
                    {(db.millPurchases || [])
                      .filter(
                        p =>
                          p.supplierId === viewingLedgerParty.id ||
                          (p.supplierName || '').toLowerCase() === viewingLedgerParty.name.toLowerCase()
                      )
                      .map(p => (
                        <div key={p.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold">
                              {p.purchaseNo} — {p.productNameEn}
                            </div>
                            <div className="text-[11px] text-slate-400">{p.date}</div>
                          </div>
                          <div className="text-right font-mono font-bold">
                            {currency} {p.totalAmount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              <h4 className="font-bold uppercase text-slate-400 text-[11px] pt-2">
                Payments & Receipts
              </h4>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl overflow-hidden">
                {(db.payments || [])
                  .filter(
                    p =>
                      p.partyId === viewingLedgerParty.id ||
                      p.partyName.toLowerCase() === viewingLedgerParty.name.toLowerCase()
                  )
                  .map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{p.paymentNo}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.date} • {p.paymentMethod}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-600">
                        {currency} {p.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
