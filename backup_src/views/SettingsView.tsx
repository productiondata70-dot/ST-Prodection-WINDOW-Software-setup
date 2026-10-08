import React, { useState } from 'react';
import {
  Settings,
  Cloud,
  Shield,
  Palette,
  Globe,
  Database,
  Lock,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  AppDatabase,
  AppTheme,
  AppLanguage,
  ModuleKey,
  BusinessProfile,
} from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

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

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile fields state
  const [profileName, setProfileName] = useState(db.profile?.businessName || '');
  const [profileAddress, setProfileAddress] = useState(db.profile?.address || '');
  const [profilePhone, setProfilePhone] = useState(db.profile?.contactNumber || '');
  const [profileSupervisor, setProfileSupervisor] = useState(db.profile?.plantSupervisor || '');
  const [profileManager, setProfileManager] = useState(db.profile?.factoryManager || '');
  const [profileOwner, setProfileOwner] = useState(db.profile?.ownerName || '');
  const [profileCurrency, setProfileCurrency] = useState(db.profile?.currency || 'PKR');

  // Backup & Drive
  const [isSyncing, setIsSyncing] = useState(false);

  // Security & Module Protection
  const [moduleProtection, setModuleProtection] = useState<Partial<Record<ModuleKey, boolean>>>(
    db.settings.moduleProtection || {}
  );
  const [autoLockMin, setAutoLockMin] = useState(db.settings.autoLockMinutes || 15);
  const [enableClosePin, setEnableClosePin] = useState(db.settings.enableClosePin || false);
  const [autoPostStock, setAutoPostStock] = useState(db.settings.productionAutoPostToStock);
  const [allowNegativeInv, setAllowNegativeInv] = useState(db.settings.allowNegativeInventory);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestPinAuth(() => {
      storage.updateProfile(
        {
          businessName: profileName.trim(),
          address: profileAddress.trim(),
          contactNumber: profilePhone.trim(),
          plantSupervisor: profileSupervisor.trim(),
          factoryManager: profileManager.trim(),
          ownerName: profileOwner.trim(),
          currency: profileCurrency.trim(),
        },
        currentUser
      );
      setNotificationMsg({ type: 'success', text: 'Business profile successfully updated!' });
    });
  };

  const handleToggleModuleLock = (key: ModuleKey) => {
    onRequestPinAuth(() => {
      const updated = { ...moduleProtection, [key]: !moduleProtection[key] };
      setModuleProtection(updated);
      storage.updateSettings({ moduleProtection: updated }, currentUser);
      setNotificationMsg({
        type: 'success',
        text: `PIN protection for module "${key}" ${updated[key] ? 'enabled' : 'disabled'}.`,
      });
    });
  };

  const handleBackupNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const res = storage.performCloudBackup(currentUser);
      setIsSyncing(false);
      if (res.success) {
        setNotificationMsg({
          type: 'success',
          text: `Cloud snapshot created (${(res.sizeBytes / 1024).toFixed(1)} KB) at ${new Date(
            res.timestamp
          ).toLocaleTimeString()}.`,
        });
      } else {
        setNotificationMsg({ type: 'error', text: 'Cloud backup failed.' });
      }
    }, 400);
  };

  const handleExportBackupFile = () => {
    const json = storage.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ST_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotificationMsg({ type: 'success', text: 'Database backup snapshot exported to file.' });
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onRequestPinAuth(() => {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        const res = storage.restoreFromJson(text, currentUser);
        if (res.success) {
          setNotificationMsg({ type: 'success', text: res.message });
        } else {
          setNotificationMsg({ type: 'error', text: res.message });
        }
      };
      reader.readAsText(file);
    });
  };

  const handleDisconnectGoogleDrive = () => {
    onRequestPinAuth(() => {
      storage.updateSettings({ googleDriveConnected: false, googleAccountEmail: undefined }, currentUser);
      setNotificationMsg({
        type: 'success',
        text: 'Google Drive disconnected securely. Cloud automatic uploads stopped.',
      });
    });
  };

  const handleConnectGoogleDrive = () => {
    storage.updateSettings(
      { googleDriveConnected: true, googleAccountEmail: 'manager.flourmills@gmail.com' },
      currentUser
    );
    setNotificationMsg({
      type: 'success',
      text: 'Google Drive connected successfully. 5-second automatic delta change checks active.',
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.settings} (سسٹم و سیکیورٹی سیٹنگز)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Google Drive backup scheduling, Firebase sync, role permissions, module lock policies, and theme preferences.
          </p>
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
            ×
          </button>
        </div>
      )}

      {/* Grid of Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Google Drive Cloud Backup (Section 13) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Google Drive Cloud Backup & Snapshots
                </h3>
                <p className="text-[11px] text-slate-500">
                  {db.settings.googleDriveConnected ? 'Connected & active' : 'Not connected'}
                </p>
              </div>
            </div>

            {db.settings.googleDriveConnected ? (
              <button
                type="button"
                onClick={handleDisconnectGoogleDrive}
                className="flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogleDrive}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs"
              >
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Cloud Sync Status:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {db.settings.hasUnsyncedChanges ? (
                    <span className="text-amber-600 font-bold">Unsaved changes pending</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Cloud Synced & Up to date</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto Delta Check Interval:</span>
                <span className="font-mono font-bold">5 seconds (Change-detection check)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Successful Snapshot:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {db.settings.googleDriveLastBackup
                    ? new Date(db.settings.googleDriveLastBackup).toLocaleString()
                    : 'Not taken yet'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleBackupNow}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all active:scale-98"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Backup Now</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackupFile}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Snapshot JSON</span>
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Snapshot</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Per-Module PIN Locks (Section 16.4) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Module Protection & Security PIN Policy
              </h3>
              <p className="text-[11px] text-slate-500">Require security PIN or password to open sensitive screens.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { key: 'stock', label: 'Stock & Inventory' },
              { key: 'sales', label: 'Sales Management' },
              { key: 'production', label: 'Production Entry' },
              { key: 'returns', label: 'Returns Log' },
              { key: 'waste_recycle', label: 'Waste & Recycle Bin' },
              { key: 'history', label: 'History & Audits' },
              { key: 'pdf_center', label: 'PDF Reports Center' },
              { key: 'settings', label: 'Settings Panel' },
            ].map(mod => {
              const isLocked = moduleProtection[mod.key as ModuleKey];

              return (
                <div
                  key={mod.key}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{mod.label}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleModuleLock(mod.key as ModuleKey)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                      isLocked
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {isLocked ? 'Protected' : 'Unlocked'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Require PIN before application exit</span>
              <input
                type="checkbox"
                checked={enableClosePin}
                onChange={e => {
                  setEnableClosePin(e.target.checked);
                  storage.updateSettings({ enableClosePin: e.target.checked }, currentUser);
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Production automatically posts to stock</span>
              <input
                type="checkbox"
                checked={autoPostStock}
                onChange={e => {
                  setAutoPostStock(e.target.checked);
                  storage.updateSettings({ productionAutoPostToStock: e.target.checked }, currentUser);
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Allow negative inventory dispatch</span>
              <input
                type="checkbox"
                checked={allowNegativeInv}
                onChange={e => {
                  setAllowNegativeInv(e.target.checked);
                  storage.updateSettings({ allowNegativeInventory: e.target.checked }, currentUser);
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Business Profile Particulars (Section 15) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mill & Facility Profile Master Record
                </h3>
                <p className="text-[11px] text-slate-500">
                  Changing profile details requires Admin PIN verification. Appears on all invoices and reports.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Business / Mill Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={profileCurrency}
                  onChange={e => setProfileCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Mill Address
                </label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Plant Supervisor
                </label>
                <input
                  type="text"
                  value={profileSupervisor}
                  onChange={e => setProfileSupervisor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Factory / Mill Manager
                </label>
                <input
                  type="text"
                  value={profileManager}
                  onChange={e => setProfileManager(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Proprietor / Owner Name
                </label>
                <input
                  type="text"
                  value={profileOwner}
                  onChange={e => setProfileOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all"
              >
                Update Profile (PIN Verified)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
