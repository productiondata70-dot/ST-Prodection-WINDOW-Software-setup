import React, { useState } from 'react';
import {
  DollarSign,
  Users,
  Cloud,
  Lock,
  Building2,
  Package,
  Bell,
  Sliders,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Edit3,
  Languages,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Printer,
  Shield,
  KeyRound,
  Send,
  Eye,
  Check,
  Save,
} from 'lucide-react';
import {
  AppDatabase,
  AppTheme,
  AppLanguage,
  Product,
  UserAccount,
  CustomRole,
} from '../types';
import { StorageService, simpleHash } from '../services/storage';
import { translations, autoTranslateToUrdu, productUrduDict } from '../services/translations';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';
import {
  connectRealGoogleAccount,
  disconnectRealGoogleAccount,
  listRealDriveBackups,
} from '../services/googleDrive';

interface SettingsViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onRequestPinAuth: (action: () => void) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

type SettingsSectionKey =
  | 'overview'
  | 'price_control'
  | 'user_roles'
  | 'cloud_drive'
  | 'security_pin'
  | 'mill_profile'
  | 'product_catalog'
  | 'broadcast_audit'
  | 'admin_control';

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  storage,
  currentUser,
  onRequestPinAuth,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}) => {
  const t = translations[language] || translations.en;
  const [selectedSection, setSelectedSection] = useState<SettingsSectionKey>('overview');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scoped User info
  const activeUser = db.users.find(u => u.name === currentUser || u.username === currentUser);
  const activeBiz = storage.getActiveBusiness() || db.profile;
  const isFactoryMode = activeBiz?.businessType === 'flour_mill' || activeBiz?.businessType === 'mill' || activeBiz?.businessType === 'factory';

  // --- SECTION 1: PRICE & RATE CONTROL STATE ---
  const [priceLockMode, setPriceLockMode] = useState<'unlocked' | 'locked'>(
    db.settings.saleInvoicePriceMode || 'unlocked'
  );
  const [taxRateInput, setTaxRateInput] = useState(String(db.profile?.taxRate ?? 0));

  // --- SECTION 3: CLOUD & GOOGLE DRIVE STATE ---
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [cloudBackupsList, setCloudBackupsList] = useState<any[]>([]);

  // --- SECTION 4: SECURITY PIN & LOCKS STATE ---
  const [autoLockMinutes, setAutoLockMinutes] = useState(db.settings.autoLockMinutes || 15);
  const [enableClosePin, setEnableClosePin] = useState(Boolean(db.settings.enableClosePin));
  const [adminPinInput, setAdminPinInput] = useState(activeUser?.pinCode || '1234');

  // --- SECTION 5: MILL PROFILE STATE ---
  const [bizName, setBizName] = useState(activeBiz?.businessName || '');
  const [ownerName, setOwnerName] = useState(activeBiz?.ownerName || '');
  const [contactNumber, setContactNumber] = useState(activeBiz?.contactNumber || '');
  const [email, setEmail] = useState(activeBiz?.email || '');
  const [address, setAddress] = useState(activeBiz?.address || '');
  const [plantSupervisor, setPlantSupervisor] = useState(activeBiz?.plantSupervisor || '');
  const [factoryManager, setFactoryManager] = useState(activeBiz?.factoryManager || '');
  const [registrationNumber, setRegistrationNumber] = useState(activeBiz?.registrationNumber || '');
  const [currency, setCurrency] = useState(activeBiz?.currency || 'PKR');
  const [invoicePrefix, setInvoicePrefix] = useState(activeBiz?.invoicePrefix || 'INV');
  const [receiptPrintMode, setReceiptPrintMode] = useState<'a4' | 'thermal_80mm' | 'thermal_58mm'>(
    activeBiz?.receiptPrintMode || 'a4'
  );

  // --- SECTION 6: MASTER PRODUCT CATALOGUE STATE ---
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdNameEn, setNewProdNameEn] = useState('');
  const [newProdNameUr, setNewProdNameUr] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Atta / Flour');
  const [newProdRate, setNewProdRate] = useState('');
  const [newProdMinStock, setNewProdMinStock] = useState('20');
  const [newProdBagSizes, setNewProdBagSizes] = useState<number[]>([20, 25, 50, 80]);

  // --- SECTION 7: BROADCAST AUDIT STATE ---
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  // --- SECTION 8: ADMINISTRATIVE CONTROL STATE ---
  const [localBackupData, setLocalBackupData] = useState<string>('');

  // The 8 Defined Settings Cards as requested in Requirement 7
  const settingsCards: Array<{
    key: SettingsSectionKey;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
  }> = [
    {
      key: 'price_control',
      title: '1. Price and Rate Control',
      description: 'Configure invoice rate locking, tax settings, and retail/wholesale price controls.',
      icon: DollarSign,
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      key: 'user_roles',
      title: '2. User Role Management',
      description: 'Manage staff accounts, employee roles, PIN credentials, and operational duties.',
      icon: Users,
      colorClass: 'text-indigo-500',
      bgClass: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      key: 'cloud_drive',
      title: '3. Google Drive / Cloud',
      description: 'Automate Google Drive backups, manual cloud sync, and backup restoration.',
      icon: Cloud,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      key: 'security_pin',
      title: '4. Security PIN and Locks',
      description: 'Set up auto-lock idle timeout, window exit verification, and user PIN codes.',
      icon: Lock,
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      key: 'mill_profile',
      title: isFactoryMode ? '5. Mill Profile' : '5. Business Profile',
      description: 'Update business identity, registration, phone numbers, supervisors, and receipt format.',
      icon: Building2,
      colorClass: 'text-violet-500',
      bgClass: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      key: 'product_catalog',
      title: '6. Master Product Catalogue',
      description: 'Manage items, bag sizes, SKUs, inventory thresholds, and bilingual names.',
      icon: Package,
      colorClass: 'text-sky-500',
      bgClass: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      key: 'broadcast_audit',
      title: '7. Broadcast Audit',
      description: 'Broadcast notifications to active shift operators and inspect activity audits.',
      icon: Bell,
      colorClass: 'text-pink-500',
      bgClass: 'bg-pink-500/10 border-pink-500/20',
    },
    {
      key: 'admin_control',
      title: '8. Administrative Control Centre',
      description: 'Local database backup file, JSON restore, theme appearance, and language options.',
      icon: Sliders,
      colorClass: 'text-teal-500',
      bgClass: 'bg-teal-500/10 border-teal-500/20',
    },
  ];

  // Auto-translate Urdu name
  const handleEnNameChange = (val: string) => {
    setNewProdNameEn(val);
    const translated = autoTranslateToUrdu(val);
    setNewProdNameUr(translated);
  };

  // Save Price Control
  const handleSavePriceControl = () => {
    try {
      storage.updateSettings(
        {
          saleInvoicePriceMode: priceLockMode,
        },
        currentUser
      );
      if (db.profile) {
        storage.updateProfile(
          {
            taxRate: Number(taxRateInput) || 0,
          },
          currentUser
        );
      }
      setNotification({ type: 'success', text: 'Price and Rate Control settings updated.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'Failed to update prices.' });
    }
  };

  // Save Security PIN & Locks
  const handleSaveSecurityPin = () => {
    try {
      storage.updateSettings(
        {
          autoLockMinutes: Number(autoLockMinutes) || 15,
          enableClosePin,
        },
        currentUser
      );
      if (activeUser && adminPinInput) {
        storage.updateUserAccount(
          activeUser.id,
          {
            pinCode: adminPinInput.trim(),
          },
          currentUser
        );
      }
      setNotification({ type: 'success', text: 'Security PIN and Lock settings updated.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'Failed to update security.' });
    }
  };

  // Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.updateProfile(
        {
          businessName: bizName.trim(),
          ownerName: ownerName.trim(),
          contactNumber: contactNumber.trim(),
          email: email.trim(),
          address: address.trim(),
          plantSupervisor: plantSupervisor.trim(),
          factoryManager: factoryManager.trim(),
          registrationNumber: registrationNumber.trim(),
          currency: currency.trim() || 'PKR',
          invoicePrefix: invoicePrefix.trim() || 'INV',
          receiptPrintMode,
        },
        currentUser
      );
      setNotification({ type: 'success', text: 'Business profile information saved successfully.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'Failed to save profile.' });
    }
  };

  // Add Product to Catalog
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.addProduct(
        {
          nameEn: newProdNameEn.trim(),
          nameUr: newProdNameUr.trim(),
          category: newProdCategory,
          type: isFactoryMode ? 'Manufactured Product' : 'Retail Product',
          bagSizes: newProdBagSizes,
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          unit: isFactoryMode ? 'Bag' : 'Piece',
          rate: Number(newProdRate) || 0,
          minStockLevel: Number(newProdMinStock) || 10,
        },
        currentUser
      );
      setNotification({ type: 'success', text: `Product "${newProdNameEn}" added to catalogue.` });
      setIsAddProductOpen(false);
      setNewProdNameEn('');
      setNewProdNameUr('');
      setNewProdRate('');
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'Failed to add product.' });
    }
  };

  // Send Broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;
    try {
      storage.addNotification(
        broadcastTitle.trim(),
        broadcastMsg.trim(),
        currentUser,
        broadcastPriority
      );
      setNotification({ type: 'success', text: 'Notification broadcasted to all active user dashboards.' });
      setBroadcastTitle('');
      setBroadcastMsg('');
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'Failed to send broadcast.' });
    }
  };

  // Export Local Database
  const handleExportLocalDatabase = () => {
    try {
      const serialized = storage.serializeDatabase();
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ST-Manager-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', text: 'Local database backup file downloaded successfully.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: 'Failed to export backup.' });
    }
  };

  // Import Local Database
  const handleImportLocalDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        storage.importDatabase(text, currentUser);
        setNotification({ type: 'success', text: 'Database restored successfully from backup file.' });
      } catch (err: any) {
        setNotification({ type: 'error', text: err?.message || 'Failed to parse database backup file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.settings} (سسٹم سیٹنگز و کنٹرول)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centralized settings for rates, user management, cloud, security locks, business profile, and product catalogue.
          </p>
        </div>

        {selectedSection !== 'overview' && (
          <button
            type="button"
            onClick={() => setSelectedSection('overview')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Settings Options</span>
          </button>
        )}
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

      {/* ========================================================================= */}
      {/* 8-CARD SETTINGS GRID (Requirement 7)                                      */}
      {/* ========================================================================= */}
      {selectedSection === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {settingsCards.map(card => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.key}
                onClick={() => setSelectedSection(card.key)}
                className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${card.bgClass} ${card.colorClass} group-hover:scale-105 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Open Configuration</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: PRICE AND RATE CONTROL                                        */}
      {/* ========================================================================= */}
      {selectedSection === 'price_control' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Price and Rate Control
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control price modifications during invoice creation and standard tax parameters
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Sales Invoicing Price Mode
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPriceLockMode('unlocked')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    priceLockMode === 'unlocked'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold">Unlocked (Editable)</div>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Cashiers/salesmen can adjust unit price per line on invoice
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPriceLockMode('locked')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    priceLockMode === 'locked'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold">Locked (Catalog Rates Only)</div>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Strict catalog price enforcement; price cannot be manually modified
                  </p>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Default General Sales Tax (GST / Tax Rate %)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRateInput}
                onChange={e => setTaxRateInput(e.target.value)}
                placeholder="0"
                className="w-full sm:w-48 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSavePriceControl}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Save Price Settings
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: USER ROLE MANAGEMENT                                          */}
      {/* ========================================================================= */}
      {selectedSection === 'user_roles' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  User Role Management
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Staff accounts assigned to this business workspace
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-4">Name & Username</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">PIN Code</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {db.users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.name} <span className="font-mono text-slate-400 font-normal">(@{u.username})</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {u.role}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      •••• ({u.pinCode})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: GOOGLE DRIVE / CLOUD                                           */}
      {/* ========================================================================= */}
      {selectedSection === 'cloud_drive' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Drive & Cloud Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated continuous snapshot backups to your personal Google Drive account
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Google Drive Connection
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {db.settings.googleDriveConnected
                    ? `Connected to: ${db.settings.googleAccountEmail || 'Authorized Account'}`
                    : 'Not currently connected to Google Drive'}
                </p>
              </div>

              {db.settings.googleDriveConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    disconnectRealGoogleAccount();
                    storage.updateSettings({ googleDriveConnected: false }, currentUser);
                    setNotification({ type: 'success', text: 'Google Drive disconnected.' });
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-300 font-bold cursor-pointer"
                >
                  Disconnect Drive
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isDriveConnecting}
                  onClick={async () => {
                    setIsDriveConnecting(true);
                    try {
                      await connectRealGoogleAccount();
                      storage.updateSettings({ googleDriveConnected: true }, currentUser);
                      setNotification({ type: 'success', text: 'Connected to Google Drive!' });
                    } catch (e: any) {
                      setNotification({ type: 'error', text: e?.message || 'Failed to connect Drive.' });
                    } finally {
                      setIsDriveConnecting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Connect Google Drive
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  storage.performCloudBackup(currentUser);
                  setNotification({ type: 'success', text: 'Cloud backup snapshot queued and executed.' });
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Perform Backup Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: SECURITY PIN AND LOCKS                                        */}
      {/* ========================================================================= */}
      {selectedSection === 'security_pin' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Security PIN and Locks
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure inactivity auto-lock and exit protection
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Auto-Lock Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={autoLockMinutes}
                onChange={e => setAutoLockMinutes(Number(e.target.value))}
                className="w-full sm:w-48 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="close-pin"
                checked={enableClosePin}
                onChange={e => setEnableClosePin(e.target.checked)}
                className="rounded text-blue-600"
              />
              <label htmlFor="close-pin" className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                Require PIN confirmation before exiting the application
              </label>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current User Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={adminPinInput}
                onChange={e => setAdminPinInput(e.target.value)}
                className="w-full sm:w-48 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSecurityPin}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
            >
              Save Lock Settings
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: MILL / BUSINESS PROFILE                                       */}
      {/* ========================================================================= */}
      {selectedSection === 'mill_profile' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isFactoryMode ? 'Mill Profile' : 'Business Profile'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update trade name, address, tax registration, and invoice formatting
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business / Mill Name *
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Premises Address
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={e => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Format
                </label>
                <select
                  value={receiptPrintMode}
                  onChange={e => setReceiptPrintMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
                >
                  <option value="a4">A4 Full Page / Half Page</option>
                  <option value="thermal_80mm">Thermal 80mm Roll</option>
                  <option value="thermal_58mm">Thermal 58mm Roll</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
            >
              Save Profile Details
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 6: MASTER PRODUCT CATALOGUE                                      */}
      {/* ========================================================================= */}
      {selectedSection === 'product_catalog' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Master Product Catalogue
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage inventory items, standard bag weights, and selling rates
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {/* Product Items Table */}
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-4">Product Name (EN / UR)</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Bag Sizes</th>
                  <th className="py-2.5 px-4">Rate (PKR)</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {db.products.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {prod.nameEn}
                      </div>
                      {prod.nameUr && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold" dir="rtl">
                          {prod.nameUr}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {prod.category}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {(prod.bagSizes || []).join(', ')} KG
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      PKR {prod.rate?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {prod.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Product Modal */}
          {isAddProductOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Add Product to Catalogue
                  </h3>
                  <button type="button" onClick={() => setIsAddProductOpen(false)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-3">
                  <div>
                    <label className="block font-bold mb-1">Product Name (English) *</label>
                    <input
                      type="text"
                      value={newProdNameEn}
                      onChange={e => handleEnNameChange(e.target.value)}
                      placeholder="e.g. Fine Flour (Maida)"
                      required
                      className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Product Name (Urdu)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={newProdNameUr}
                      onChange={e => setNewProdNameUr(e.target.value)}
                      placeholder="اردو نام"
                      className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Category</label>
                    <input
                      type="text"
                      value={newProdCategory}
                      onChange={e => setNewProdCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Standard Rate (PKR)</label>
                      <input
                        type="number"
                        value={newProdRate}
                        onChange={e => setNewProdRate(e.target.value)}
                        placeholder="3500"
                        className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Min Stock Level</label>
                      <input
                        type="number"
                        value={newProdMinStock}
                        onChange={e => setNewProdMinStock(e.target.value)}
                        placeholder="20"
                        className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddProductOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                    >
                      Add Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 7: BROADCAST AUDIT                                               */}
      {/* ========================================================================= */}
      {selectedSection === 'broadcast_audit' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Broadcast Audit & System Alerts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send operational alerts to all shifts and inspect notification history
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Broadcast Title *
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Scheduled Wheat Stock Intake at 2:00 PM"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Broadcast Message *
              </label>
              <textarea
                rows={3}
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Enter alert details for shift operators..."
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Priority
                </label>
                <select
                  value={broadcastPriority}
                  onChange={e => setBroadcastPriority(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none font-semibold"
                >
                  <option value="normal">Normal Information</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Warning</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Broadcast</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 8: ADMINISTRATIVE CONTROL CENTRE                                 */}
      {/* ========================================================================= */}
      {selectedSection === 'admin_control' && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Administrative Control Centre
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Database backups, export/import, visual themes, and language preferences
              </p>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* Database JSON Backup & Restore */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Local Database Backup & Restore
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download an offline snapshot file (.json) or restore from an existing backup
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportLocalDatabase}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File (.json)</span>
                </button>

                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Restore from Backup File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportLocalDatabase}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Appearance Theme Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Application Visual Theme
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'ios-colorful', label: 'iOS Colorful' },
                  { key: 'vivid-pro', label: 'Vivid Pro' },
                  { key: 'midnight-dark', label: 'Midnight Dark' },
                  { key: 'flourpro-light', label: 'FlourPro Light' },
                  { key: 'emerald-dark', label: 'Emerald Dark' },
                  { key: 'cobalt-blue', label: 'Cobalt Blue' },
                  { key: 'deskera-plum', label: 'Deskera Plum' },
                  { key: 'deskera-navy', label: 'Deskera Navy' },
                ].map(th => (
                  <button
                    key={th.key}
                    type="button"
                    onClick={() => onThemeChange(th.key as any)}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      theme === th.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Language Preference
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('ur')}
                  className={`px-4 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    language === 'ur'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  اردو (Urdu)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
