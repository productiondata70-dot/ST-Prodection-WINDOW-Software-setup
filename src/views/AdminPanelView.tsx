import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  KeyRound,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
  Check,
  Edit3,
  Layers,
  Key,
  LogOut,
  Globe,
  Sliders,
  Shield,
  Search,
  Settings,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  RotateCcw,
  Wallet,
  FileText,
  History,
  Factory,
  Calendar,
  Cloud,
} from 'lucide-react';
import {
  AppDatabase,
  BusinessProfile,
  UserAccount,
  AppLanguage,
  ModuleKey,
} from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';
import {
  normalizeBusinessMode,
  getBusinessModeConfig,
} from '../services/businessMode';

interface AdminPanelViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onRequestPinAuth: (action: () => void) => void;
  language: AppLanguage;
  onExitAdmin?: () => void;
}

export const ALL_AVAILABLE_MODULES: Array<{
  key: ModuleKey;
  label: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    category: 'Core',
    description: 'Executive KPI metrics, charts, and operational summaries',
    icon: Layers,
  },
  {
    key: 'production',
    label: 'Production Entry',
    category: 'Manufacturing',
    description: 'Shift production entry, formulas, and multi-bag sizing',
    icon: Factory,
  },
  {
    key: 'daily_production',
    label: 'Daily Production',
    category: 'Manufacturing',
    description: 'Daily shift breakdown, daily totals, and shift reports',
    icon: Calendar,
  },
  {
    key: 'products_catalog',
    label: 'Product Catalogue',
    category: 'Inventory',
    description: 'Item master, SKUs, barcode definitions, and bag sizes',
    icon: Package,
  },
  {
    key: 'stock',
    label: 'Inventory & Stock Management',
    category: 'Inventory',
    description: 'Warehouse balances, batch adjustments, and stock registers',
    icon: Boxes,
  },
  {
    key: 'sales',
    label: 'Sales & Invoicing',
    category: 'Commercial',
    description: 'POS billing, sales dispatches, wholesale invoices, and payments',
    icon: ShoppingCart,
  },
  {
    key: 'mill_purchases',
    label: 'Purchases',
    category: 'Commercial',
    description: 'Raw material procurement, mill grain intakes, and supplier billing',
    icon: Truck,
  },
  {
    key: 'customers_suppliers',
    label: 'Customers & Suppliers',
    category: 'Commercial',
    description: 'Party accounts, contact records, and ledger balances',
    icon: Users,
  },
  {
    key: 'expenses_payments',
    label: 'Expenses & Payments',
    category: 'Financial',
    description: 'Operating expenses, cash vouchers, and party payment receipts',
    icon: Wallet,
  },
  {
    key: 'returns',
    label: 'Returns & Credit Notes',
    category: 'Commercial',
    description: 'Customer and vendor return vouchers with stock reconciliation',
    icon: RotateCcw,
  },
  {
    key: 'waste_recycle',
    label: 'Waste & Scrap',
    category: 'Manufacturing',
    description: 'Production scrap logging, shrinkage records, and recycling bin',
    icon: Trash2,
  },
  {
    key: 'history',
    label: 'Reports & Analytics (History)',
    category: 'Audit',
    description: 'Transaction audit log, historical shift logs, and deletion history',
    icon: History,
  },
  {
    key: 'pdf_center',
    label: 'PDF Center & Reports',
    category: 'Audit',
    description: 'Professional exportable PDF sheets, ledgers, and thermal slips',
    icon: FileText,
  },
  {
    key: 'price_control',
    label: 'Price & Rate Information',
    category: 'Settings',
    description: 'Product price controls, bag rates, and locked invoice rates',
    icon: Settings,
  },
  {
    key: 'profile',
    label: 'Business Profile',
    category: 'Settings',
    description: 'Business identity, tax numbers, logo, and receipt formatting',
    icon: Building2,
  },
  {
    key: 'cloud_backup',
    label: 'Cloud & Google Drive',
    category: 'System',
    description: 'Automated Google Drive backups and Firestore cloud synchronization',
    icon: Cloud,
  },
];

export const BUSINESS_CATEGORIES: Array<{
  value: string;
  label: string;
  mode: string;
  description: string;
}> = [
  {
    value: 'flour_mill',
    label: 'Mill / Factory',
    mode: 'mill',
    description: 'Flour mills, grain processing, industrial feed plants with bag weights',
  },
  {
    value: 'small_business',
    label: 'Small Business',
    mode: 'small_business',
    description: 'Shops, trading companies, distribution agencies, and service businesses',
  },
  {
    value: 'shopping_mart',
    label: 'Shopping Mart / Supermarket',
    mode: 'shopping_mart',
    description: 'Retail stores, supermarkets with barcode POS scanners and retail billing',
  },
  {
    value: 'general_trading',
    label: 'General Trading Business',
    mode: 'small_business',
    description: 'Import/export, wholesale commodity traders, and commercial merchants',
  },
  {
    value: 'manufacturing',
    label: 'Manufacturing Business',
    mode: 'factory',
    description: 'General industrial plants, packaging, chemical, and assembly units',
  },
  {
    value: 'custom',
    label: 'Other / Custom Business',
    mode: 'small_business',
    description: 'Customized business configuration tailored to bespoke operational needs',
  },
];

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  db,
  storage,
  currentUser,
  onRequestPinAuth,
  language,
  onExitAdmin,
}) => {
  const t = translations[language] || translations.en;
  const masterConfig = storage.getMasterAdminConfig();

  // Navigation Tabs inside Master Admin
  const [activeTab, setActiveTab] = useState<'businesses' | 'workspaces' | 'security' | 'audit'>('businesses');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search Filter for Businesses
  const [businessSearch, setBusinessSearch] = useState('');

  // ==========================================
  // REGISTER NEW BUSINESS & USER MODAL STATE
  // ==========================================
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regBizName, setRegBizName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('1234');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCategory, setRegCategory] = useState('flour_mill');
  const [regAccountStatus, setRegAccountStatus] = useState<'active' | 'locked'>('active');
  const [regSelectedModules, setRegSelectedModules] = useState<ModuleKey[]>([
    'dashboard',
    'production',
    'daily_production',
    'products_catalog',
    'stock',
    'sales',
    'mill_purchases',
    'customers_suppliers',
    'history',
    'pdf_center',
  ]);

  // ==========================================
  // PERMISSIONS EDITOR MODAL STATE
  // ==========================================
  const [permissionModalBiz, setPermissionModalBiz] = useState<BusinessProfile | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<ModuleKey[]>([]);

  // ==========================================
  // EDIT BUSINESS DETAILS MODAL STATE
  // ==========================================
  const [editingBiz, setEditingBiz] = useState<BusinessProfile | null>(null);
  const [editBizName, setEditBizName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // ==========================================
  // RESET USER PASSWORD MODAL STATE
  // ==========================================
  const [resetPasswordUser, setResetPasswordUser] = useState<UserAccount | null>(null);
  const [newUserPasswordInput, setNewUserPasswordInput] = useState('');

  // ==========================================
  // MASTER ADMINISTRATOR CREDENTIALS CHANGE STATE
  // ==========================================
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState(masterConfig.username);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [newMasterPin, setNewMasterPin] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  // All Businesses list
  const allBusinesses = storage.getAllBusinesses();
  const allUsers = storage.getAllUsers();

  const filteredBusinesses = allBusinesses.filter(b => {
    const q = businessSearch.toLowerCase();
    return (
      b.businessName.toLowerCase().includes(q) ||
      b.ownerName.toLowerCase().includes(q) ||
      b.businessType.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

  // Handle Register New Business
  const handleRegisterBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    try {
      const res = storage.registerBusinessByMasterAdmin({
        businessName: regBizName,
        ownerName: regOwnerName,
        username: regUsername,
        password: regPassword,
        pin: regPin,
        phone: regPhone,
        email: regEmail,
        address: regAddress,
        businessCategory: regCategory,
        allowedModules: regSelectedModules,
        accountStatus: regAccountStatus,
      });

      setNotification({
        type: 'success',
        text: `Business "${res.business.businessName}" and user account "${res.user.username}" registered successfully!`,
      });

      // Reset form
      setIsRegisterOpen(false);
      setRegBizName('');
      setRegOwnerName('');
      setRegUsername('');
      setRegPassword('');
      setRegPhone('');
      setRegEmail('');
      setRegAddress('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to register business.',
      });
    }
  };

  // Open Permission Editor
  const handleOpenPermissions = (biz: BusinessProfile) => {
    setPermissionModalBiz(biz);
    // If business has explicit enabledModules, use them; otherwise use default category modules
    const currentEnabled = biz.enabledModules && biz.enabledModules.length > 0
      ? biz.enabledModules
      : getBusinessModeConfig(biz.businessType).allowedModules;
    setEditingPermissions([...currentEnabled]);
  };

  // Save Permissions
  const handleSavePermissions = () => {
    if (!permissionModalBiz) return;
    try {
      storage.updateBusinessModules(permissionModalBiz.id, editingPermissions);
      setNotification({
        type: 'success',
        text: `Updated module permissions for "${permissionModalBiz.businessName}".`,
      });
      setPermissionModalBiz(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to update permissions.',
      });
    }
  };

  // Toggle Module in Permission Editor
  const handleToggleModulePermission = (modKey: ModuleKey) => {
    setEditingPermissions(prev =>
      prev.includes(modKey) ? prev.filter(k => k !== modKey) : [...prev, modKey]
    );
  };

  // Select All / Deselect All
  const handleSelectAllPermissions = () => {
    setEditingPermissions(ALL_AVAILABLE_MODULES.map(m => m.key));
  };
  const handleDeselectAllPermissions = () => {
    setEditingPermissions(['dashboard']); // Dashboard remains minimal
  };

  // Toggle Lock/Unlock Business
  const handleToggleLockBusiness = (biz: BusinessProfile) => {
    const isCurrentlyLocked = biz.accountStatus === 'suspended';
    const nextStatus = isCurrentlyLocked ? 'active' : 'locked';
    try {
      storage.setBusinessAccountStatus(biz.id, nextStatus);
      setNotification({
        type: 'success',
        text: `Business "${biz.businessName}" account is now ${nextStatus === 'locked' ? 'Locked' : 'Unlocked & Active'}.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to update account status.',
      });
    }
  };

  // Open Edit Details
  const handleOpenEditBiz = (biz: BusinessProfile) => {
    setEditingBiz(biz);
    setEditBizName(biz.businessName);
    setEditOwnerName(biz.ownerName);
    setEditCategory(biz.businessType);
    setEditPhone(biz.contactNumber || '');
    setEditEmail(biz.email || '');
    setEditAddress(biz.address || '');
  };

  // Save Edit Details
  const handleSaveEditBiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    try {
      storage.updateBusinessByMasterAdmin(editingBiz.id, {
        businessName: editBizName.trim(),
        ownerName: editOwnerName.trim(),
        businessType: editCategory,
        contactNumber: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
      });
      setNotification({
        type: 'success',
        text: `Details for "${editBizName}" updated successfully.`,
      });
      setEditingBiz(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to update business.',
      });
    }
  };

  // Reset User Password
  const handleSavePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    try {
      storage.resetBusinessUserPassword(resetPasswordUser.id, newUserPasswordInput);
      setNotification({
        type: 'success',
        text: `Password for user "${resetPasswordUser.name}" has been successfully reset.`,
      });
      setResetPasswordUser(null);
      setNewUserPasswordInput('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'Failed to reset password.',
      });
    }
  };

  // Save Master Admin Security Credentials
  const handleSaveSecurityCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (!currentAdminPassword) {
      setSecurityError('Please confirm your current administrator password to authorize changes.');
      return;
    }

    if (newAdminPassword && newAdminPassword !== newAdminConfirmPassword) {
      setSecurityError('New password and confirm password do not match.');
      return;
    }

    try {
      const res = storage.updateMasterAdminCredentials({
        currentPassword: currentAdminPassword,
        newUsername: newAdminUsername,
        newPassword: newAdminPassword || undefined,
        newPin: newMasterPin || undefined,
      });

      if (res.success) {
        setSecuritySuccess('Administrator credentials and security PIN updated successfully!');
        setCurrentAdminPassword('');
        setNewAdminPassword('');
        setNewAdminConfirmPassword('');
        setNewMasterPin('');
      } else {
        setSecurityError(res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      setSecurityError(err?.message || 'Failed to update administrator credentials.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Banner: Master Administrator Identity & Exit */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-500/30 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Master Authority
              </span>
              <span className="text-xs text-slate-400">
                Centralized Control Panel
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Master Administrator Panel
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Logged in as <strong className="text-amber-300">{masterConfig.username}</strong> · Central administration for businesses, permissions, and security
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsRegisterOpen(true);
              setNotification(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Business</span>
          </button>

          {onExitAdmin && (
            <button
              type="button"
              onClick={onExitAdmin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Master Admin Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('businesses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'businesses'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Businesses & Users ({allBusinesses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workspaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'workspaces'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Workspaces & Business Modes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Administrator Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>System Audit Log</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS MANAGEMENT & REGISTRATION (Requirements 4, 5, 10)         */}
      {/* ========================================================================= */}
      {activeTab === 'businesses' && (
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={businessSearch}
                onChange={e => setBusinessSearch(e.target.value)}
                placeholder="Search businesses by name, owner, or category..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total Businesses: <strong>{allBusinesses.length}</strong> · Active: <strong>{allBusinesses.filter(b => b.accountStatus !== 'suspended').length}</strong>
              </span>
            </div>
          </div>

          {/* Businesses Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Business & Details</th>
                    <th className="py-3 px-4">Owner / User</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Modules Enabled</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBusinesses.map(biz => {
                    const isLocked = biz.accountStatus === 'suspended';
                    const bizUser = allUsers.find(u => u.businessId === biz.id);
                    const categoryInfo = BUSINESS_CATEGORIES.find(c => c.value === biz.businessType) || {
                      label: biz.businessType,
                    };
                    const enabledCount = biz.enabledModules ? biz.enabledModules.length : getBusinessModeConfig(biz.businessType).allowedModules.length;

                    return (
                      <tr
                        key={biz.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                          isLocked ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                              {biz.businessName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{biz.businessName}</span>
                                {storage.getActiveBusinessId() === biz.id && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                    Active Workspace
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ID: {biz.id} · Prefix: {biz.invoicePrefix || 'INV'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {biz.ownerName}
                          </div>
                          {bizUser && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span className="font-mono">@{bizUser.username}</span>
                              {biz.contactNumber && <span>· {biz.contactNumber}</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {categoryInfo.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isLocked
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {isLocked ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            <span>{isLocked ? 'Locked' : 'Active'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenPermissions(biz)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold transition-all cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>{enabledCount} of {ALL_AVAILABLE_MODULES.length} enabled</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Configure Permissions */}
                            <button
                              type="button"
                              onClick={() => handleOpenPermissions(biz)}
                              title="Configure Module Permissions"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Details */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditBiz(biz)}
                              title="Edit Details & Category"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            {bizUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPasswordUser(bizUser);
                                  setNewUserPasswordInput('');
                                }}
                                title="Reset User Password"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Lock / Unlock */}
                            <button
                              type="button"
                              onClick={() => handleToggleLockBusiness(biz)}
                              title={isLocked ? 'Unlock Account' : 'Lock Account'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked
                                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                              }`}
                            >
                              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete (if not primary) */}
                            {biz.id !== 'prof-main-1' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to completely delete business "${biz.businessName}" and its users?`)) {
                                    try {
                                      storage.deleteBusinessByMasterAdmin(biz.id);
                                      setNotification({
                                        type: 'success',
                                        text: `Business "${biz.businessName}" deleted.`,
                                      });
                                    } catch (e: any) {
                                      setNotification({
                                        type: 'error',
                                        text: e?.message || 'Failed to delete business.',
                                      });
                                    }
                                  }
                                }}
                                title="Delete Business"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WORKSPACES & BUSINESS MODES (Requirement 8)                        */}
      {/* ========================================================================= */}
      {activeTab === 'workspaces' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Centralized Business Mode & Multi-Workspace Controls</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure global multi-workspace settings, active workspace assignment, and business operational paradigms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Business Mode Support
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enables mode-specific workflows (Factory, Mill, POS Mart, Small Business)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Enabled
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Multiple Business Workspace
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Isolates products, ledgers, and transactions per registered business
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Active & Isolated
                  </span>
                </div>
              </div>
            </div>

            {/* Active Workspace Selector for Admin View */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Administrative Workspace Preview / Switch Active Workspace
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {allBusinesses.map(b => {
                  const isActive = storage.getActiveBusinessId() === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        storage.switchBusinessWorkspace(b.id, 'Master Administrator');
                        setNotification({
                          type: 'success',
                          text: `Switched active preview workspace to "${b.businessName}".`,
                        });
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {b.businessName} ({b.businessType})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MASTER ADMINISTRATOR SECURITY (Requirement 2 & 9)                  */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span>Master Administrator Security & Credential Management</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Change administrator username, password, and Master Security PIN. Current password confirmation is required for all credential modifications.
            </p>
          </div>

          {securitySuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{securitySuccess}</span>
            </div>
          )}

          {securityError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{securityError}</span>
            </div>
          )}

          <form onSubmit={handleSaveSecurityCredentials} className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                Confirm Current Password (موجودہ پاسورڈ درج کریں) *
              </label>
              <input
                type="password"
                value={currentAdminPassword}
                onChange={e => setCurrentAdminPassword(e.target.value)}
                placeholder="Enter current administrator password..."
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none font-mono"
              />
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Initial default password is: <code className="font-bold">Tanzeel56</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Administrator Username
              </label>
              <input
                type="text"
                value={newAdminUsername}
                onChange={e => setNewAdminUsername(e.target.value)}
                placeholder="Enter new administrator username..."
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={newAdminConfirmPassword}
                  onChange={e => setNewAdminConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Master Security PIN (Optional)
              </label>
              <input
                type="password"
                maxLength={8}
                value={newMasterPin}
                onChange={e => setNewMasterPin(e.target.value)}
                placeholder="Initial default PIN is: 5683"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all cursor-pointer"
              >
                Save Security Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM AUDIT LOG                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>System-Wide Activity & Audit Logs</span>
            </h2>
            <span className="text-xs text-slate-400">
              Showing recent system events
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-96 overflow-y-auto">
            {(db.activityLogs || []).slice(0, 50).map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {log.eventType}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {log.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {log.user}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER NEW BUSINESS & USER (Requirement 4 & 5)                  */}
      {/* ========================================================================= */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Register New Business & User Account
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set up credentials, category, and grant explicit module permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={regBizName}
                    onChange={e => setRegBizName(e.target.value)}
                    placeholder="e.g. Al Rahman Traders, Noor Flour Mills"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner or User Name *
                  </label>
                  <input
                    type="text"
                    value={regOwnerName}
                    onChange={e => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Haji Tariq Mehmood"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Login Username *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="e.g. alrahman, noormill"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min 3 characters"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={regPin}
                    onChange={e => setRegPin(e.target.value)}
                    placeholder="Default 1234"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Category *
                  </label>
                  <select
                    value={regCategory}
                    onChange={e => setRegCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
                  >
                    {BUSINESS_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={regAccountStatus}
                    onChange={e => setRegAccountStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="locked">Locked (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="contact@business.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Module Permissions Checklist */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Assigned Modules & Permissions ({regSelectedModules.length} selected)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enable only the software sections this business is permitted to access.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRegSelectedModules(ALL_AVAILABLE_MODULES.map(m => m.key))}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegSelectedModules(['dashboard'])}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pt-1">
                  {ALL_AVAILABLE_MODULES.map(mod => {
                    const isChecked = regSelectedModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setRegSelectedModules(prev =>
                              prev.includes(mod.key)
                                ? prev.filter(k => k !== mod.key)
                                : [...prev, mod.key]
                            );
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="truncate">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Register Business Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEDICATED PERMISSIONS EDITOR (Requirement 5)                      */}
      {/* ========================================================================= */}
      {permissionModalBiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Module Access & Permissions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Business: <strong className="text-indigo-600 dark:text-indigo-400">{permissionModalBiz.businessName}</strong> ({permissionModalBiz.businessType})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPermissionModalBiz(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">
                Active Modules: <strong>{editingPermissions.length}</strong> of {ALL_AVAILABLE_MODULES.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px]"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllPermissions}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]"
                >
                  Minimal Only
                </button>
              </div>
            </div>

            {/* Modules List with Individual Toggles */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {ALL_AVAILABLE_MODULES.map(mod => {
                const isEnabled = editingPermissions.includes(mod.key);
                const IconComponent = mod.icon;
                return (
                  <div
                    key={mod.key}
                    onClick={() => handleToggleModulePermission(mod.key)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isEnabled
                        ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isEnabled
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {mod.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Indicator */}
                    <div
                      className={`w-12 h-6 rounded-full transition-colors flex items-center p-1 shrink-0 ${
                        isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPermissionModalBiz(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Save Business Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT BUSINESS DETAILS & CATEGORY                                  */}
      {/* ========================================================================= */}
      {editingBiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Business Details
              </h2>
              <button
                type="button"
                onClick={() => setEditingBiz(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBiz} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editBizName}
                  onChange={e => setEditBizName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Owner / User Name
                </label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={e => setEditOwnerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Category
                </label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
                >
                  {BUSINESS_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBiz(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESET USER PASSWORD                                               */}
      {/* ========================================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset User Password</span>
              </h2>
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reset password for user: <strong>{resetPasswordUser.name}</strong> (@{resetPasswordUser.username})
            </p>

            <form onSubmit={handleSavePasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newUserPasswordInput}
                  onChange={e => setNewUserPasswordInput(e.target.value)}
                  placeholder="Enter new password (min 3 chars)"
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Set Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
