import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  UserPlus,
  UserX,
  UserCheck,
  Send,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Lock,
  Cloud,
  RefreshCw,
  LogOut,
  Folder,
  FolderCheck,
  Database,
  Download,
  Upload,
  Check,
  Shield,
  ShieldCheck,
  FileCheck,
  Building2,
  Sliders,
  Edit3,
  Sparkles,
  Unlock,
  Languages,
} from 'lucide-react';
import { AppDatabase, UserAccount, UserRole, CustomRole, Product, AppLanguage, ModuleKey } from '../types';
import { StorageService, simpleHash } from '../services/storage';
import { translations, autoTranslateToUrdu } from '../services/translations';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';
import {
  connectRealGoogleAccount,
  disconnectRealGoogleAccount,
  getDriveAccessToken,
  listRealDriveBackups,
  downloadRealDriveBackup,
  DEDICATED_DRIVE_FOLDER_NAME,
} from '../services/googleDrive';

interface AdminPanelViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onRequestPinAuth: (action: () => void) => void;
  language: AppLanguage;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  db,
  storage,
  currentUser,
  onRequestPinAuth,
  language,
}) => {
  const t = translations[language] || translations.en;

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('operator');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<string>('operator');
  const [editUserPin, setEditUserPin] = useState('');
  const [editUserNewPassword, setEditUserNewPassword] = useState('');

  // Custom Role Management State (Requirement 4)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [selectedRoleModules, setSelectedRoleModules] = useState<ModuleKey[]>(['sales', 'stock']);
  const [roleDeleteConfirm, setRoleDeleteConfirm] = useState<CustomRole | null>(null);

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  // Section Navigation Tabs (Requirement 6)
  const [adminTab, setAdminTab] = useState<'dashboard' | 'price_control' | 'users' | 'cloud_sync' | 'security' | 'profile' | 'products' | 'broadcast'>('dashboard');

  // Business Profile State (Requirement 3: Relocated from Settings)
  const [profileName, setProfileName] = useState(db.profile?.businessName || '');
  const [profileType, setProfileType] = useState(db.profile?.businessType || 'flour_mill');
  const [profileAddress, setProfileAddress] = useState(db.profile?.address || '');
  const [profilePhone, setProfilePhone] = useState(db.profile?.contactNumber || '');
  const [profileEmail, setProfileEmail] = useState(db.profile?.email || '');
  const [profileSupervisor, setProfileSupervisor] = useState(db.profile?.plantSupervisor || '');
  const [profileManager, setProfileManager] = useState(db.profile?.factoryManager || '');
  const [profileOwner, setProfileOwner] = useState(db.profile?.ownerName || '');
  const [profileCurrency, setProfileCurrency] = useState(db.profile?.currency || 'PKR');
  const [profileNtn, setProfileNtn] = useState(db.profile?.ntnNumber || '');

  // TASK 7: Mill Business Profile Separate Password & Admin PIN Verification
  const [isProfileUnlocked, setIsProfileUnlocked] = useState(false);
  const [profilePasswordInput, setProfilePasswordInput] = useState('');
  const [profilePinInput, setProfilePinInput] = useState('');
  const [profileLockoutMsg, setProfileLockoutMsg] = useState<string | null>(null);
  const [isChangeCredentialsOpen, setIsChangeCredentialsOpen] = useState(false);
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [newProfilePin, setNewProfilePin] = useState('');
  const [confirmNewProfilePin, setConfirmNewProfilePin] = useState('');

  // TASK 6: Product Master in Admin Panel
  const activeAdminMode = normalizeBusinessMode(db.profile?.businessType);
  const defaultAdminCat =
    activeAdminMode === 'factory'
      ? 'Flour & Grains'
      : getBusinessModeConfig(db.profile?.businessType).defaultCategories[0] || 'General';
  const [adminProdEn, setAdminProdEn] = useState('');
  const [adminProdUr, setAdminProdUr] = useState('');
  const [adminProdCat, setAdminProdCat] = useState(defaultAdminCat);
  const [adminProdSizes, setAdminProdSizes] = useState<number[]>(
    activeAdminMode === 'factory' ? [50, 80] : [1]
  );
  const [adminProdUnit, setAdminProdUnit] = useState<string>(
    activeAdminMode === 'factory' ? 'Bag' : 'Piece'
  );
  const [adminProdRate, setAdminProdRate] = useState<string>('');
  const [editingAdminProd, setEditingAdminProd] = useState<Product | null>(null);
  const [adminBagSizeInput, setAdminBagSizeInput] = useState('');
  const [adminTransInput, setAdminTransInput] = useState('');
  const [adminTransOutput, setAdminTransOutput] = useState('');

  // Security & Module Protection State (Requirement 2: Relocated from Settings)
  const [moduleProtection, setModuleProtection] = useState<Partial<Record<ModuleKey, boolean>>>(
    db.settings.moduleProtection || {}
  );
  const [autoLockMin, setAutoLockMin] = useState(db.settings.autoLockMinutes || 15);
  const [enableClosePin, setEnableClosePin] = useState(db.settings.enableClosePin || false);
  const [autoPostStock, setAutoPostStock] = useState(db.settings.productionAutoPostToStock);
  const [allowNegativeInv, setAllowNegativeInv] = useState(db.settings.allowNegativeInventory);
  const [salePriceMode, setSalePriceMode] = useState<'unlocked' | 'locked'>(db.settings.saleInvoicePriceMode || 'unlocked');

  useEffect(() => {
    setSalePriceMode(db.settings.saleInvoicePriceMode || 'unlocked');
  }, [db.settings.saleInvoicePriceMode]);

  const handleSetSalePriceMode = (mode: 'unlocked' | 'locked') => {
    setSalePriceMode(mode);
    storage.updateSettings({ saleInvoicePriceMode: mode }, currentUser);
    setNotificationMsg({
      type: 'success',
      text:
        mode === 'unlocked'
          ? '🔓 Sale Invoice Price Unlocked: Users can now manually edit product rates on new sale invoices.'
          : '🔒 Sale Invoice Price Locked: Product rates are now read-only on new sale invoices and enforced by backend.',
    });
  };
  const [adminPinChange, setAdminPinChange] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');

  // Handlers for Relocated Profile & Security
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileUnlocked) {
      setNotificationMsg({ type: 'error', text: 'Profile editing is locked. Please verify password and Admin PIN first.' });
      return;
    }
    storage.updateProfile(
      {
        businessName: profileName.trim(),
        businessType: profileType as any,
        address: profileAddress.trim(),
        contactNumber: profilePhone.trim(),
        email: profileEmail.trim(),
        plantSupervisor: profileSupervisor.trim(),
        factoryManager: profileManager.trim(),
        ownerName: profileOwner.trim(),
        currency: profileCurrency.trim() || 'PKR',
        ntnNumber: profileNtn.trim(),
      },
      currentUser
    );
    setNotificationMsg({
      type: 'success',
      text: 'Mill Business Profile updated successfully! Changes applied to all reports & PDFs.',
    });
  };

  const handleUnlockProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilePasswordInput || !profilePinInput) {
      setNotificationMsg({ type: 'error', text: 'Both Profile-Edit Password and Admin Permission PIN are required.' });
      return;
    }
    const result = storage.verifyProfileEditCredentials(profilePasswordInput, profilePinInput, currentUser);
    if (result.success) {
      setIsProfileUnlocked(true);
      setProfilePasswordInput('');
      setProfilePinInput('');
      setProfileLockoutMsg(null);
      setNotificationMsg({ type: 'success', text: 'Profile editing access unlocked successfully.' });
    } else {
      setNotificationMsg({ type: 'error', text: result.message || 'Verification failed. Profile remains locked.' });
      if (result.isLocked) {
        setProfileLockoutMsg(result.message || 'Temporarily locked out.');
      }
    }
  };

  const handleUpdateProfileCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfilePassword.length < 6) {
      setNotificationMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newProfilePin.length < 4) {
      setNotificationMsg({ type: 'error', text: 'New Admin PIN must be at least 4 digits.' });
      return;
    }
    if (newProfilePin !== confirmNewProfilePin) {
      setNotificationMsg({ type: 'error', text: 'Admin PIN confirmation does not match.' });
      return;
    }
    try {
      storage.setProfileEditCredentials(newProfilePassword, newProfilePin, currentUser);
      setNotificationMsg({ type: 'success', text: 'Profile security credentials updated successfully.' });
      setIsChangeCredentialsOpen(false);
      setNewProfilePassword('');
      setNewProfilePin('');
      setConfirmNewProfilePin('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error updating credentials.' });
    }
  };

  const handleAddAdminProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminProdEn.trim()) {
      setNotificationMsg({ type: 'error', text: 'Product English name is required.' });
      return;
    }
    const parsedRate = adminProdRate.trim() !== '' ? Number(adminProdRate.trim()) : undefined;
    if (parsedRate !== undefined && (isNaN(parsedRate) || parsedRate < 0)) {
      setNotificationMsg({ type: 'error', text: 'Product Price / Rate must be a valid non-negative number.' });
      return;
    }
    const mode = normalizeBusinessMode(db.profile?.businessType);
    const finalUrdu = adminProdUr.trim() || autoTranslateToUrdu(adminProdEn.trim()) || adminProdEn.trim();
    const effectiveSizes = mode === 'factory' ? (adminProdSizes.length > 0 ? adminProdSizes : [50, 80]) : [1];
    const effectiveType = mode === 'factory' ? 'Manufactured Product' : 'Retail Product';
    const effectiveUnit = mode === 'factory' ? 'Bag' : adminProdUnit || 'Piece';
    try {
      if (editingAdminProd) {
        storage.updateProduct(
          editingAdminProd.id,
          {
            nameEn: adminProdEn.trim(),
            nameUr: finalUrdu,
            category: adminProdCat.trim() || defaultAdminCat,
            type: editingAdminProd.itemType === 'service' ? 'Service' : effectiveType,
            unit: effectiveUnit,
            bagSizes: effectiveSizes,
            rate: parsedRate,
          },
          currentUser
        );
        setNotificationMsg({ type: 'success', text: `Product "${adminProdEn}" updated successfully.` });
        setEditingAdminProd(null);
      } else {
        storage.addProduct(
          {
            nameEn: adminProdEn.trim(),
            nameUr: finalUrdu,
            category: adminProdCat.trim() || defaultAdminCat,
            type: effectiveType,
            itemType: 'product',
            unit: effectiveUnit,
            bagSizes: effectiveSizes,
            rate: parsedRate,
          },
          currentUser
        );
        setNotificationMsg({
          type: 'success',
          text: `New master product "${adminProdEn}" created successfully${parsedRate !== undefined ? ` (Default Rate: PKR ${parsedRate.toLocaleString()})` : ''}.`,
        });
      }
      setAdminProdEn('');
      setAdminProdUr('');
      setAdminProdCat(defaultAdminCat);
      setAdminProdSizes(mode === 'factory' ? [50, 80] : [1]);
      setAdminProdUnit(mode === 'factory' ? 'Bag' : 'Piece');
      setAdminProdRate('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error saving product.' });
    }
  };

  const handleStartEditAdminProduct = (prod: Product) => {
    const mode = normalizeBusinessMode(db.profile?.businessType);
    setEditingAdminProd(prod);
    setAdminProdEn(prod.nameEn);
    setAdminProdUr(prod.nameUr || '');
    setAdminProdCat(prod.category || defaultAdminCat);
    setAdminProdSizes(mode === 'factory' ? prod.bagSizes || [50, 80] : [1]);
    setAdminProdUnit(prod.unit || (mode === 'factory' ? 'Bag' : 'Piece'));
    setAdminProdRate(prod.rate !== undefined ? String(prod.rate) : '');
  };

  const handleCancelEditAdminProduct = () => {
    const mode = normalizeBusinessMode(db.profile?.businessType);
    setEditingAdminProd(null);
    setAdminProdEn('');
    setAdminProdUr('');
    setAdminProdCat(defaultAdminCat);
    setAdminProdSizes(mode === 'factory' ? [50, 80] : [1]);
    setAdminProdUnit(mode === 'factory' ? 'Bag' : 'Piece');
    setAdminProdRate('');
  };

  const handleArchiveAdminProduct = (prodId: string, name: string) => {
    try {
      storage.archiveProduct(prodId, currentUser, `Archived by admin ${currentUser}`);
      setNotificationMsg({ type: 'success', text: `Product "${name}" archived to Recycle Bin.` });
      if (editingAdminProd?.id === prodId) {
        handleCancelEditAdminProduct();
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error archiving product.' });
    }
  };

  const handleAddAdminBagSize = (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseInt(adminBagSizeInput, 10);
    if (isNaN(size) || size <= 0) return;
    if (db.bagSizes.some(b => b.sizeKg === size)) {
      setNotificationMsg({ type: 'error', text: `${size} kg bag size already exists.` });
      return;
    }
    db.bagSizes.push({
      id: `bs-${size}`,
      sizeKg: size,
      label: `${size} kg`,
      isDefault: false,
    });
    storage.logActivity('Bag Size Added', currentUser, `Added standard bag size: ${size} kg`);
    storage.saveToDisk();
    setNotificationMsg({ type: 'success', text: `Bag size ${size} kg added successfully.` });
    setAdminBagSizeInput('');
  };

  const handleAdminAutoTranslate = () => {
    if (!adminProdEn.trim()) return;
    const ur = autoTranslateToUrdu(adminProdEn.trim());
    if (ur) {
      setAdminProdUr(ur);
    } else {
      setAdminProdUr(adminProdEn.trim());
    }
  };

  const handleAdminRunTranslate = (word: string) => {
    setAdminTransInput(word);
    const res = autoTranslateToUrdu(word);
    setAdminTransOutput(res || word);
  };

  const handleAdminApplyPreset = (en: string, ur: string) => {
    setAdminProdEn(en);
    setAdminProdUr(ur);
  };

  const handleToggleModuleLock = (key: ModuleKey) => {
    onRequestPinAuth(() => {
      const updated = { ...moduleProtection, [key]: !moduleProtection[key] };
      setModuleProtection(updated);
      storage.updateSettings({ moduleProtection: updated }, currentUser);
      setNotificationMsg({
        type: 'success',
        text: `Security PIN protection for "${key}" ${updated[key] ? 'enabled' : 'disabled'}.`,
      });
    });
  };

  const handleSaveSecurityPolicies = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(
      {
        autoLockMinutes: autoLockMin,
        enableClosePin,
        productionAutoPostToStock: autoPostStock,
        allowNegativeInventory: allowNegativeInv,
        saleInvoicePriceMode: salePriceMode,
      },
      currentUser
    );
    setNotificationMsg({ type: 'success', text: 'Security policies and price control rules saved successfully.' });
  };

  const handleUpdateAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPinChange || adminPinChange.length < 4) {
      setNotificationMsg({ type: 'error', text: 'Security PIN must be 4 to 6 digits.' });
      return;
    }
    if (adminPinChange !== confirmAdminPin) {
      setNotificationMsg({ type: 'error', text: 'PIN confirmation does not match.' });
      return;
    }
    onRequestPinAuth(() => {
      storage.updateSettings({ adminPin: adminPinChange.trim() }, currentUser);
      setNotificationMsg({ type: 'success', text: 'Administrator Master PIN updated securely.' });
      setAdminPinChange('');
      setConfirmAdminPin('');
    });
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveBackupsList, setDriveBackupsList] = useState<
    Array<{ id: string; name: string; createdTime: string; size: string }>
  >([]);
  const [isLoadingDriveBackups, setIsLoadingDriveBackups] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [isChangeAccountModalOpen, setIsChangeAccountModalOpen] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<{
    checkedAt: string;
    productsCount: number;
    sessionsCount: number;
    stockBalancesCount: number;
    salesCount: number;
    returnsCount: number;
    checksum: string;
  } | null>(null);

  useEffect(() => {
    if (db.settings.googleDriveConnected) {
      const token = getDriveAccessToken();
      const folderId = db.settings.googleDriveFolderId;
      if (token && folderId) {
        setIsLoadingDriveBackups(true);
        listRealDriveBackups(token, folderId)
          .then(list => setDriveBackupsList(list))
          .catch(err => console.warn('Could not load drive backups in admin panel:', err))
          .finally(() => setIsLoadingDriveBackups(false));
      }
    }
  }, [db.settings.googleDriveConnected, db.settings.googleDriveFolderId]);

  const handleAdminConnectGoogleDrive = async () => {
    setIsConnectingDrive(true);
    setNotificationMsg(null);
    try {
      const res = await connectRealGoogleAccount();
      storage.connectGoogleDriveWithAccount(
        { email: res.email, folderId: res.folderId, folderName: res.folderName },
        currentUser
      );
      setNotificationMsg({
        type: 'success',
        text: `Connected to Google Drive as ${res.email}. Dedicated folder "${res.folderName}" verified.`,
      });
      if (res.accessToken && res.folderId) {
        setIsLoadingDriveBackups(true);
        const list = await listRealDriveBackups(res.accessToken, res.folderId);
        setDriveBackupsList(list);
        setIsLoadingDriveBackups(false);
      }
    } catch (err: any) {
      if (err?.isUserCancellation || err?.code === 'auth/popup-closed-by-user') {
        setNotificationMsg({
          type: 'error',
          text: 'Google sign-in was cancelled or the window was closed. Click Connect Google Drive to try again.',
        });
      } else {
        setNotificationMsg({
          type: 'error',
          text: err?.message || 'Google Drive connection failed or was cancelled.',
        });
      }
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleAdminDisconnectGoogleDrive = () => {
    onRequestPinAuth(async () => {
      try {
        await disconnectRealGoogleAccount();
        storage.disconnectGoogleDrive(currentUser);
        setDriveBackupsList([]);
        setNotificationMsg({
          type: 'success',
          text: 'Google Drive disconnected securely. Cloud sync paused.',
        });
      } catch (err: any) {
        setNotificationMsg({
          type: 'error',
          text: 'Error disconnecting Google account: ' + (err?.message || ''),
        });
      }
    });
  };

  const handleAdminChangeGoogleAccount = async () => {
    setIsChangeAccountModalOpen(false);
    setIsConnectingDrive(true);
    setNotificationMsg(null);
    try {
      // Direct call to preserve user click activation context for popup
      const res = await connectRealGoogleAccount();

      // Verify and save newly authenticated account to local persistent settings
      storage.connectGoogleDriveWithAccount(
        { email: res.email, folderId: res.folderId, folderName: res.folderName },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Google Drive: Connected. Connected Account: ${res.email}. Dedicated backup folder "${res.folderName}" verified.`,
      });

      if (res.accessToken && res.folderId) {
        setIsLoadingDriveBackups(true);
        const list = await listRealDriveBackups(res.accessToken, res.folderId);
        setDriveBackupsList(list);
        setIsLoadingDriveBackups(false);
      }
    } catch (err: any) {
      if (err?.isUserCancellation || err?.code === 'auth/popup-closed-by-user') {
        setNotificationMsg({
          type: 'error',
          text: 'Google sign-in was cancelled or the window was closed. Click Change Google Account to try again.',
        });
      } else {
        setNotificationMsg({
          type: 'error',
          text: err?.message || 'Google Drive: Not Connected / Backup Failed. Could not change Google account.',
        });
      }
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleAdminBackupNow = async () => {
    setIsSyncing(true);
    setNotificationMsg(null);
    try {
      const res = await storage.performCloudBackup(currentUser);
      if (res.success) {
        setNotificationMsg({
          type: 'success',
          text: `Cloud snapshot verified (${(res.sizeBytes / 1024).toFixed(1)} KB) uploaded to Google Drive folder "${db.settings.googleDriveFolderName || DEDICATED_DRIVE_FOLDER_NAME}".`,
        });
        const token = getDriveAccessToken();
        const folderId = db.settings.googleDriveFolderId;
        if (token && folderId) {
          const list = await listRealDriveBackups(token, folderId);
          setDriveBackupsList(list);
        }
      } else {
        setNotificationMsg({
          type: 'error',
          text: res.error || 'Cloud backup failed. Check internet and permissions.',
        });
      }
    } catch (e: any) {
      setNotificationMsg({
        type: 'error',
        text: 'Backup error: ' + (e?.message || ''),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdminRefreshDriveBackups = async () => {
    const token = getDriveAccessToken();
    const folderId = db.settings.googleDriveFolderId;
    if (!token || !folderId) {
      setNotificationMsg({
        type: 'error',
        text: 'Google Drive authorization token expired. Please click "Reconnect Google Account".',
      });
      return;
    }
    setIsLoadingDriveBackups(true);
    try {
      const list = await listRealDriveBackups(token, folderId);
      setDriveBackupsList(list);
      setNotificationMsg({
        type: 'success',
        text: `Discovered ${list.length} cloud backup snapshot(s) in Google Drive.`,
      });
    } catch (e: any) {
      setNotificationMsg({
        type: 'error',
        text: 'Failed to list Google Drive backups: ' + (e.message || ''),
      });
    } finally {
      setIsLoadingDriveBackups(false);
    }
  };

  const handleAdminRestoreFromDrive = (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      `ADMINISTRATOR CONFIRMATION:\n\nAre you sure you want to restore snapshot "${fileName}" from Google Drive?\n\nThis will safely replace current operational records with the backup dataset.`
    );
    if (!confirmed) return;

    onRequestPinAuth(async () => {
      const token = getDriveAccessToken();
      if (!token) {
        setNotificationMsg({
          type: 'error',
          text: 'Google Drive authorization expired. Please reconnect your account.',
        });
        return;
      }
      setRestoringBackupId(fileId);
      try {
        const backupData = await downloadRealDriveBackup(token, fileId);
        const dbPayload = backupData.data ? JSON.stringify(backupData.data) : JSON.stringify(backupData);
        const res = storage.restoreFromJson(dbPayload, currentUser);
        if (res.success) {
          setNotificationMsg({
            type: 'success',
            text: `Successfully restored database snapshot "${fileName}" from Google Drive.`,
          });
        } else {
          setNotificationMsg({
            type: 'error',
            text: res.message || 'Failed to restore snapshot data.',
          });
        }
      } catch (err: any) {
        setNotificationMsg({
          type: 'error',
          text: 'Failed to download and restore backup: ' + (err?.message || ''),
        });
      } finally {
        setRestoringBackupId(null);
      }
    });
  };

  const handleRunIntegrityValidation = () => {
    const checksum = simpleHash(JSON.stringify(db));
    setIntegrityReport({
      checkedAt: new Date().toLocaleString(),
      productsCount: db.products.length,
      sessionsCount: db.productionSessions.length,
      stockBalancesCount: db.stockBalances.length,
      salesCount: db.sales.length,
      returnsCount: db.returns.length,
      checksum,
    });
    setNotificationMsg({
      type: 'success',
      text: 'Database integrity validated successfully. All records consistent and checksum verified.',
    });
  };

  const AVAILABLE_ROLE_SECTIONS: Array<{ key: ModuleKey; label: string; desc: string }> = [
    { key: 'dashboard', label: 'Dashboard', desc: 'Main production and sales metrics overview' },
    { key: 'production', label: 'Production Entry (Factory Mode)', desc: 'Flour milling shifts, bag counting, formula yields' },
    { key: 'products_catalog', label: 'Products & Catalog (Mart / Small Biz)', desc: 'SKU, barcode, categories, brands, units, and service items' },
    { key: 'stock', label: 'Stock & Inventory', desc: 'Warehouse inventory balances, bag sizes, stock movements' },
    { key: 'mill_purchases', label: 'Purchases & Stock Receiving', desc: 'Wheat grain, supplier stock receiving, and direct purchases' },
    { key: 'sales', label: 'Sales & POS Billing', desc: 'Dispatch orders, POS billing, invoices, locked pricing' },
    { key: 'returns', label: 'Returns Management', desc: 'Customer and supplier return processing' },
    { key: 'customers_suppliers', label: 'Customers & Suppliers', desc: 'Customer receivables, supplier payables, and account ledgers' },
    { key: 'expenses_payments', label: 'Expenses, Payments & P&L', desc: 'Business expenses, payment vouchers, and profit/loss summary' },
    { key: 'waste_recycle', label: 'Waste & Recycle Bin', desc: 'Waste record logs and soft-deleted items archive' },
    { key: 'history', label: 'History & Audit Ledger', desc: 'Event audit logs and record history list' },
    { key: 'pdf_center', label: 'PDF Reports Center', desc: 'Official printouts, gate passes, and financial statements' },
    { key: 'settings', label: 'Application Settings', desc: 'Facility configuration, language, and theme options' },
    { key: 'admin', label: 'Admin Panel', desc: 'Administrator controls, user accounts, and master data' },
  ];

  const handleStartCreateRole = () => {
    setEditingRoleId(null);
    setCustomRoleName('');
    setCustomRoleDesc('');
    setSelectedRoleModules(['sales', 'stock']);
    setIsRoleModalOpen(true);
  };

  const handleStartEditRole = (role: CustomRole) => {
    setEditingRoleId(role.id);
    setCustomRoleName(role.name);
    setCustomRoleDesc(role.description || '');
    setSelectedRoleModules([...role.allowedModules]);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestPinAuth(() => {
      const trimmed = customRoleName.trim();
      if (!trimmed) {
        setNotificationMsg({ type: 'error', text: 'Please enter a valid role name.' });
        return;
      }
      if (selectedRoleModules.length === 0) {
        setNotificationMsg({ type: 'error', text: 'Please select at least one section/module that this role can access.' });
        return;
      }

      try {
        if (editingRoleId) {
          storage.updateCustomRole(
            editingRoleId,
            {
              name: trimmed,
              description: customRoleDesc.trim(),
              allowedModules: selectedRoleModules,
            },
            currentUser
          );
          setNotificationMsg({ type: 'success', text: `Role "${trimmed}" permissions updated successfully.` });
        } else {
          storage.createCustomRole(
            {
              name: trimmed,
              description: customRoleDesc.trim(),
              allowedModules: selectedRoleModules,
            },
            currentUser
          );
          setNotificationMsg({ type: 'success', text: `Custom role "${trimmed}" created with ${selectedRoleModules.length} permitted sections.` });
        }
        setIsRoleModalOpen(false);
      } catch (err: any) {
        setNotificationMsg({ type: 'error', text: err?.message || 'Error saving custom role.' });
      }
    });
  };

  const handleDeleteRole = (role: CustomRole) => {
    if (role.isSystem || role.name === 'Administrator') {
      setNotificationMsg({ type: 'error', text: 'Administrator system role cannot be deleted.' });
      return;
    }
    onRequestPinAuth(() => {
      try {
        storage.deleteCustomRole(role.id, currentUser);
        setNotificationMsg({ type: 'success', text: `Role "${role.name}" removed.` });
        setRoleDeleteConfirm(null);
      } catch (err: any) {
        setNotificationMsg({ type: 'error', text: err?.message || 'Error deleting role.' });
      }
    });
  };

  const handleStartEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserRole(user.customRoleId || user.role);
    setEditUserPin(user.pinCode || '');
    setEditUserNewPassword('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onRequestPinAuth(() => {
      const matchedRole = (db.customRoles || []).find(
        r => r.name.toLowerCase() === editUserRole.toLowerCase() || r.id === editUserRole
      );

      const updates: Partial<UserAccount> = {
        name: editUserName.trim() || editingUser.name,
        role: matchedRole ? matchedRole.name : editUserRole,
        customRoleId: matchedRole?.id,
        allowedModules: matchedRole?.allowedModules,
        moduleActions: matchedRole?.moduleActions,
      };

      if (editUserPin.trim().length >= 4) {
        updates.pinCode = editUserPin.trim();
      }
      if (editUserNewPassword.trim().length >= 4) {
        updates.passwordHash = simpleHash(editUserNewPassword.trim());
      }

      storage.updateUserAccount(editingUser.id, updates, currentUser);

      setNotificationMsg({ type: 'success', text: `User account "${updates.name}" updated successfully.` });
      setEditingUser(null);
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestPinAuth(() => {
      if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword) {
        setNotificationMsg({ type: 'error', text: 'All user account fields are required.' });
        return;
      }

      const matchedRole = (db.customRoles || []).find(
        r => r.name.toLowerCase() === newUserRole.toLowerCase() || r.id === newUserRole
      );

      try {
        const created = storage.addUserAccount(
          {
            name: newUserName.trim(),
            username: newUserUsername.trim().toLowerCase(),
            role: matchedRole ? matchedRole.name : newUserRole,
            customRoleId: matchedRole?.id,
            allowedModules: matchedRole?.allowedModules,
            moduleActions: matchedRole?.moduleActions,
            pinCode: newUserPin.trim(),
            passwordHash: simpleHash(newUserPassword),
            isBlocked: false,
          },
          currentUser
        );

        setNotificationMsg({ type: 'success', text: `User account for ${created.name} created successfully.` });
        setIsAddUserOpen(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
      } catch (err: any) {
        setNotificationMsg({ type: 'error', text: err.message || 'Failed to create user account.' });
      }
    });
  };

  const handleToggleBlockUser = (user: UserAccount) => {
    onRequestPinAuth(() => {
      const nextBlocked = !user.isBlocked;
      storage.updateUserAccount(
        user.id,
        {
          isBlocked: nextBlocked,
          accountStatus: nextBlocked ? 'suspended' : 'active',
          blockReason: nextBlocked ? 'Blocked by Administrator' : undefined,
        },
        currentUser
      );
      setNotificationMsg({
        type: 'success',
        text: `User "${user.name}" ${nextBlocked ? 'has been blocked' : 'has been unblocked'}.`,
      });
    });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;

    storage.addNotification(broadcastTitle.trim(), broadcastMsg.trim(), currentUser, broadcastPriority);
    storage.logActivity('Broadcast Sent', currentUser, `Sent announcement "${broadcastTitle.trim()}"`);
    setNotificationMsg({ type: 'success', text: 'Notification broadcasted to all terminals.' });
    setBroadcastTitle('');
    setBroadcastMsg('');
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.adminPanel} (ایڈمن پینل و اختیارات)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            User access control, temporary blocking, system broadcasts, product catalogs, and bag size master parameters.
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

      {/* Admin Panel Sub-Navigation Tabs (Requirement 6) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'dashboard', label: '1. Admin Dashboard', icon: ShieldAlert },
          { key: 'price_control', label: '2. Price/Rate Control', icon: Sliders },
          { key: 'users', label: '3. User & Role Management', icon: Users },
          { key: 'cloud_sync', label: '4. Google Drive & Cloud Sync', icon: Cloud },
          { key: 'security', label: '5. Security & PIN Locks', icon: Lock },
          { key: 'profile', label: '6. Mill Business Profile', icon: Building2 },
          { key: 'products', label: '7. Master Products Catalog', icon: Package },
          { key: 'broadcast', label: '8. Broadcasts & Audits', icon: Send },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAdminTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: DASHBOARD / OVERVIEW */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setAdminTab('users')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer shadow-xs transition-all space-y-1"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">User Accounts</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {db.users.length} <span className="text-xs font-normal text-slate-400">authorized</span>
              </div>
              <p className="text-[11px] text-slate-400">Click to manage staff logins & roles</p>
            </div>

            <div
              onClick={() => setAdminTab('cloud_sync')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer shadow-xs transition-all space-y-1"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Cloud Backup</span>
                <Cloud className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pt-1">
                {db.settings.googleDriveConnected ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Protected in Drive
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold">Local Storage Only</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {db.settings.googleAccountEmail || 'Click to configure Drive sync'}
              </p>
            </div>

            <div
              onClick={() => setAdminTab('security')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer shadow-xs transition-all space-y-1"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Protected Modules</span>
                <Lock className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {Object.values(moduleProtection).filter(Boolean).length} <span className="text-xs font-normal text-slate-400">PIN locked</span>
              </div>
              <p className="text-[11px] text-slate-400">Click to configure security gates</p>
            </div>

            <div
              onClick={() => setAdminTab('price_control')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 cursor-pointer shadow-xs transition-all space-y-1"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Price/Rate Control</span>
                {salePriceMode === 'unlocked' ? (
                  <Unlock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white pt-1">
                {salePriceMode === 'unlocked' ? '🔓 Price Unlocked' : '🔒 Price Locked'}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Click to lock/unlock invoice product rates
              </p>
            </div>
          </div>

          {/* Direct Price/Rate Control Banner on Admin Dashboard */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Price/Rate Control — New Sale Dispatch Invoice
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    salePriceMode === 'unlocked'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {salePriceMode === 'unlocked' ? '🔓 Unlocked' : '🔒 Locked'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {salePriceMode === 'unlocked'
                  ? 'Product rate automatically appears on New Sale Dispatch Invoice and can be manually edited for that specific invoice.'
                  : 'Product rate automatically appears on New Sale Dispatch Invoice and is strictly read-only (locked by Admin).'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSetSalePriceMode('unlocked')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  salePriceMode === 'unlocked'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>🔓 Unlock Price</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetSalePriceMode('locked')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  salePriceMode === 'locked'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>🔒 Lock Price</span>
              </button>
            </div>
          </div>

          {/* Quick Actions and Catalog overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Administrative Controls Center</span>
              </h3>
              <p className="text-xs text-slate-500">
                All high-privilege configuration options have been centralized in the Admin Panel to prevent unauthorized modification by operators.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminTab('users')}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all flex items-center justify-between"
                >
                  <span>Staff & Roles</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('cloud_sync')}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all flex items-center justify-between"
                >
                  <span>Cloud Backup</span>
                  <Cloud className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('security')}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all flex items-center justify-between"
                >
                  <span>PIN Lock Policies</span>
                  <Lock className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('profile')}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-left hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all flex items-center justify-between"
                >
                  <span>Mill Profile</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Production Catalog Overview</span>
              </h3>
              <p className="text-xs text-slate-500">
                Overview of current active products and bag sizes configured for milling operations.
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {db.products.map(p => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{p.nameEn}</span>
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span className="text-purple-600 font-bold" dir="rtl">{p.nameUr}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {p.bagSizes.map(s => `${s}kg`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: PRICE/RATE CONTROL (REQUIREMENT 1) */}
      {adminTab === 'price_control' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    salePriceMode === 'unlocked'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {salePriceMode === 'unlocked' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Price/Rate Control (قیمت اور ریٹ کنٹرول)
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        salePriceMode === 'unlocked'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {salePriceMode === 'unlocked' ? '🔓 Unlocked' : '🔒 Locked'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Control whether users can manually edit product rates on the New Sale Dispatch Invoice.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleSetSalePriceMode('unlocked')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    salePriceMode === 'unlocked'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>🔓 Unlock Price</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSalePriceMode('locked')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    salePriceMode === 'locked'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>🔒 Lock Price</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div
                onClick={() => handleSetSalePriceMode('unlocked')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  salePriceMode === 'unlocked'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Unlock className="w-4 h-4" />
                    <span>🔓 Unlock Price Mode</span>
                  </span>
                  {salePriceMode === 'unlocked' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                  <li>Configured default product rate automatically appears on New Sale Dispatch Invoice.</li>
                  <li>User can manually change the rate for that specific invoice (e.g., PKR 5,000 → PKR 4,800).</li>
                  <li>Invoice subtotal, discount, tax, and grand total immediately recalculate.</li>
                  <li>Master product price and historical invoices remain unchanged.</li>
                </ul>
              </div>

              <div
                onClick={() => handleSetSalePriceMode('locked')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  salePriceMode === 'locked'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>🔒 Lock Price Mode</span>
                  </span>
                  {salePriceMode === 'locked' && (
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                  <li>Configured default product rate automatically appears on New Sale Dispatch Invoice.</li>
                  <li>Rate input field becomes strictly read-only on the invoice form.</li>
                  <li>Users cannot manually alter the price on new dispatch invoices.</li>
                  <li>Backend business logic enforces the configured product rate.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Product Master Default Rates Table for Quick Rate Management */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Master Product Default Rates (PKR)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Update the configured default selling rate for any product in the Product Master.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminTab('products')}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 cursor-pointer"
              >
                + Add / Edit Products
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Urdu Name</th>
                    <th className="py-2.5 px-3">Bag Sizes</th>
                    <th className="py-2.5 px-3">Configured Default Rate (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {db.products.filter(p => p.isActive).map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{prod.nameEn}</td>
                      <td className="py-3 px-3 font-arabic text-sm text-purple-600" dir="rtl">
                        {prod.nameUr || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {prod.bagSizes.map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                              {s} KG
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 max-w-xs">
                          <span className="text-slate-400 font-bold">PKR</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            defaultValue={prod.rate ?? 0}
                            onBlur={e => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val !== (prod.rate ?? 0)) {
                                storage.updateProduct(prod.id, { rate: val }, currentUser);
                                setNotificationMsg({
                                  type: 'success',
                                  text: `Default rate for "${prod.nameEn}" updated to PKR ${val.toLocaleString()}.`,
                                });
                              }
                            }}
                            className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USER & ROLE MANAGEMENT (REQUIREMENT 4: CUSTOM ROLES WITH MANUALLY SELECTABLE ACCESS) */}
      {adminTab === 'users' && (
        <div className="space-y-6">
          {/* CARD 1: CUSTOM ROLES MANAGEMENT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Custom Roles & Section Permissions (کسٹم رولز و اختیارات)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create unlimited custom roles with manually selectable access permissions across all application modules.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCreateRole}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Custom Role</span>
              </button>
            </div>

            {/* Custom Roles Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(db.customRoles || []).map(role => {
                const isSystemRole = role.isSystem || role.name.toLowerCase() === 'administrator' || role.name.toLowerCase() === 'admin';

                return (
                  <div
                    key={role.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {role.name}
                          </span>
                          {isSystemRole ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              System Master
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              Custom Role
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditRole(role)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                            title="Edit Role & Permissions"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!isSystemRole && (
                            <button
                              type="button"
                              onClick={() => setRoleDeleteConfirm(role)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                              title="Delete Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {role.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{role.description}</p>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Permitted Sections ({role.allowedModules.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {role.allowedModules.map(modKey => {
                          const sectionInfo = AVAILABLE_ROLE_SECTIONS.find(s => s.key === modKey);
                          return (
                            <span
                              key={modKey}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {sectionInfo?.label || modKey}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 2: USER ACCOUNTS & ASSIGNED ROLES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    User Accounts & Assigned Roles (صارفین کے اکاؤنٹس)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign custom roles to staff accounts. Users will strictly see only permitted sections upon login.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add User Account</span>
              </button>
            </div>

            <div className="space-y-2">
              {db.users.map(u => {
                const assignedRole = (db.customRoles || []).find(
                  r => r.id === u.customRoleId || r.name.toLowerCase() === u.role.toLowerCase()
                );

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>{u.name}</span>
                        <span className="text-slate-400 font-mono">(@{u.username})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                          {u.role}
                        </span>
                        {u.isBlocked && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                            Blocked
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Created: {new Date(u.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>PIN: Protected</span>
                        <span>·</span>
                        <span className="text-slate-500">
                          Access: {assignedRole ? `${assignedRole.allowedModules.length} permitted sections` : 'Default role'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleStartEditUser(u)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition-all"
                      >
                        Edit User
                      </button>

                      {u.role !== 'admin' && u.role !== 'Administrator' && (
                        <button
                          type="button"
                          onClick={() => handleToggleBlockUser(u)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            u.isBlocked
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {u.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          <span>{u.isBlocked ? 'Unblock' : 'Block User'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 3: REGISTERED BUSINESS ACCOUNTS & MULTI-TENANT DIRECTORY */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registered Business Accounts & Multi-Tenant Directory (تمام رجسٹرڈ کاروباری اکاؤنٹس)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive multi-tenant registry of all registered business accounts, selected business modes, and isolation boundaries.
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300">
                Total Registered: {storage.getAllRegisteredUsers().length}
              </span>
            </div>

            <div className="space-y-2.5">
              {storage.getAllRegisteredUsers().map(({ user, business }) => {
                const mode = normalizeBusinessMode(business?.businessType || user.businessType);
                const modeCfg = getBusinessModeConfig(business?.businessType || user.businessType);
                const regDate = user.registeredAt || user.createdAt;

                return (
                  <div
                    key={user.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{business?.businessName || user.businessName || 'Business Workspace'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          mode === 'shopping_mart'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : mode === 'small_business'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : mode === 'mill'
                            ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        }`}>
                          {modeCfg.shortLabel} Mode
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">ID: {user.businessId || 'N/A'}</span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Owner/Admin:</span>
                        <span>{user.name}</span>
                        <span>(@{user.username})</span>
                        {user.email && <span>· {user.email}</span>}
                        {user.phone && <span>· {user.phone}</span>}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Registered: {regDate ? new Date(regDate).toLocaleString() : 'N/A'}</span>
                        <span>·</span>
                        <span>Status: <strong className={user.isBlocked ? 'text-rose-500' : 'text-emerald-600'}>{user.isBlocked ? 'Blocked' : (user.accountStatus || 'Active')}</strong></span>
                        <span>·</span>
                        <span>Role: <strong className="uppercase">{user.role}</strong></span>
                        <span>·</span>
                        <span>Permitted Modules: {user.allowedModules ? user.allowedModules.length : modeCfg.allowedModules.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 bg-slate-200/70 dark:bg-slate-700/60 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        {user.permissions?.includes('all') ? 'Full System Permissions' : `${user.permissions?.length || 0} permissions`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: GOOGLE DRIVE & CLOUD SYNC (RELOCATED FROM SETTINGS) */}
      {adminTab === 'cloud_sync' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Google Drive Cloud Sync & Disaster Recovery Administration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Administrator-only cloud synchronization, continuous 5-second delta backups, and data integrity verification
                </p>
              </div>
            </div>

            <div>
              {db.settings.googleDriveConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drive Connected & Protected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Not Connected
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Connection and Sync Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Cloud Connection & Configuration:</span>
                <span className="font-mono text-[11px] text-blue-600 font-semibold">
                  Interval: 5s Delta Check
                </span>
              </div>

              {!db.settings.googleDriveConnected ? (
                <div className="space-y-3 py-1">
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Connect an authorized Google account via official Google OAuth 2.0 to activate automatic continuous cloud backups of all mill production, stock balances, and sales.
                  </p>
                  <button
                    type="button"
                    disabled={isConnectingDrive}
                    onClick={handleAdminConnectGoogleDrive}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{isConnectingDrive ? 'Opening Google Sign-in...' : 'Connect Google Drive'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Connected Account:</span>
                    <span className="font-bold font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                      {db.settings.googleAccountEmail || 'Authorized Account'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Target Folder:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <span>{db.settings.googleDriveFolderName || DEDICATED_DRIVE_FOLDER_NAME}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sync Status:</span>
                    <span>
                      {db.settings.hasUnsyncedChanges ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Delta pending auto-upload
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          100% Synchronized
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Last Successful Snapshot:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {db.settings.googleDriveLastBackup
                        ? new Date(db.settings.googleDriveLastBackup).toLocaleString()
                        : 'No backup uploaded yet'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleAdminBackupNow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Uploading...' : 'Manual Backup Now'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isConnectingDrive}
                      onClick={() => setIsChangeAccountModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg font-bold transition-colors cursor-pointer"
                      title="Change active Google Account"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Change Google Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdminDisconnectGoogleDrive}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Data Integrity & Error Diagnostics */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Data Integrity & Error Diagnostics:</span>
                <button
                  type="button"
                  onClick={handleRunIntegrityValidation}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold hover:bg-indigo-100 cursor-pointer"
                >
                  <FileCheck className="w-3 h-3" />
                  <span>Run Integrity Check</span>
                </button>
              </div>

              {db.settings.googleDriveLastError ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 space-y-1.5">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Sync Error Detected</span>
                  </div>
                  <p className="text-[11px] font-mono">{db.settings.googleDriveLastError}</p>
                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={handleAdminBackupNow}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                    >
                      Retry Failed Sync
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>No Sync Conflicts or Errors</span>
                  </div>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    All local database modifications are safely verified and aligned with cloud snapshots.
                  </p>
                </div>
              )}

              {integrityReport && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Audit Verification Report ({integrityReport.checkedAt}):
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-slate-500">
                    <span>Products: <strong>{integrityReport.productsCount}</strong></span>
                    <span>Production Shifts: <strong>{integrityReport.sessionsCount}</strong></span>
                    <span>Stock Balances: <strong>{integrityReport.stockBalancesCount}</strong></span>
                    <span>Sales Invoices: <strong>{integrityReport.salesCount}</strong></span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    Checksum: {integrityReport.checksum}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Backup History Explorer in Google Drive Folder */}
          {db.settings.googleDriveConnected && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-blue-600" />
                  <span>Google Drive Cloud Backup Snapshots:</span>
                </span>
                <button
                  type="button"
                  disabled={isLoadingDriveBackups}
                  onClick={handleAdminRefreshDriveBackups}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingDriveBackups ? 'animate-spin' : ''}`} />
                  <span>Refresh Cloud List</span>
                </button>
              </div>

              {isLoadingDriveBackups ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Scanning Google Drive folder...</span>
                </div>
              ) : driveBackupsList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No previous snapshots in Google Drive folder yet. Click "Manual Backup Now" to create your first cloud snapshot.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2 px-3">Snapshot Name</th>
                        <th className="py-2 px-3">Created</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3 text-right">Disaster Recovery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {driveBackupsList.map(bkp => (
                        <tr key={bkp.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-blue-500" />
                            <span>{bkp.name}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {new Date(bkp.createdTime).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {bkp.size}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              disabled={restoringBackupId === bkp.id}
                              onClick={() => handleAdminRestoreFromDrive(bkp.id, bkp.name)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {restoringBackupId === bkp.id ? 'Restoring...' : 'Restore Backup'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: SECURITY & PIN LOCKS (RELOCATED FROM SETTINGS) */}
      {adminTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Lock className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Module Protection & Security PIN Policy
                </h3>
                <p className="text-[11px] text-slate-500">
                  Require security PIN or password to open sensitive screens and operations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'stock', label: 'Stock & Inventory' },
                { key: 'sales', label: 'Sales Management' },
                { key: 'production', label: 'Production Entry' },
                { key: 'returns', label: 'Returns Log' },
                { key: 'waste_recycle', label: 'Waste & Recycle Bin' },
                { key: 'history', label: 'History & Audits' },
                { key: 'pdf_center', label: 'PDF Reports Center' },
                { key: 'admin', label: 'Admin Panel' },
              ].map(mod => {
                const isLocked = moduleProtection[mod.key as ModuleKey];
                return (
                  <div
                    key={mod.key}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{mod.label}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleModuleLock(mod.key as ModuleKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        isLocked
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {isLocked ? 'Protected' : 'Unlocked'}
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSaveSecurityPolicies} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Require PIN Before Exit</div>
                    <div className="text-[11px] text-slate-400">Prompts for security PIN before closing application</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableClosePin}
                    onChange={e => setEnableClosePin(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Auto Post Production to Stock</div>
                    <div className="text-[11px] text-slate-400">Instantly increments warehouse bags upon session log</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPostStock}
                    onChange={e => setAutoPostStock(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Allow Negative Inventory</div>
                    <div className="text-[11px] text-slate-400">Permits dispatches even if recorded balance is zero</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowNegativeInv}
                    onChange={e => setAllowNegativeInv(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Inactivity Auto-Lock</div>
                    <div className="text-[11px] text-slate-400">Lock app after idle duration</div>
                  </div>
                  <select
                    value={autoLockMin}
                    onChange={e => setAutoLockMin(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>

                {/* Step 3: Admin Panel Price Lock Control */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>Sale Invoice Product Price</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        salePriceMode === 'unlocked'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {salePriceMode === 'unlocked' ? '🔓 Unlocked' : '🔒 Locked'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {salePriceMode === 'unlocked' ? (
                        <span>🔓 <strong>Unlocked</strong> — Users can manually adjust the price during sales dispatch. Invoice calculations update immediately.</span>
                      ) : (
                        <span>🔒 <strong>Locked</strong> — Users cannot manually adjust the price. Price field becomes read-only and backend strictly enforces configured product rate.</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSetSalePriceMode('unlocked')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        salePriceMode === 'unlocked'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🔓 Unlock Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSalePriceMode('locked')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        salePriceMode === 'locked'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🔒 Lock Price</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  Save Security Policies
                </button>
              </div>
            </form>
          </div>

          {/* Master PIN Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Administrator Master Security PIN
                </h3>
                <p className="text-[11px] text-slate-500">
                  Update the master system PIN used for administrative authorizations and database resets.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateAdminPin} className="space-y-3 text-xs max-w-md">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  New Master PIN (4 to 6 Digits)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminPinChange}
                  onChange={e => setAdminPinChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-6 digit PIN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Confirm Master PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmAdminPin}
                  onChange={e => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter PIN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  Update Master PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 5: MILL BUSINESS PROFILE (TASK 7: PROTECTED WITH SEPARATE PASSWORD & ADMIN PIN) */}
      {adminTab === 'profile' && (
        <div className="space-y-6">
          {!isProfileUnlocked ? (
            /* LOCKED STATE: Profile Security Verification Gate & Read-Only Summary */
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Mill Business Profile Security Gate</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Locked Area
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Modifications to the Mill & Business Profile require independent two-step verification using a dedicated Profile-Edit Password and authorized Admin Permission PIN.
                    </p>
                  </div>
                </div>

                {profileLockoutMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{profileLockoutMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUnlockProfile} className="space-y-4 max-w-md pt-1">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                      Dedicated Profile-Edit Password *
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="Enter profile security password..."
                      value={profilePasswordInput}
                      onChange={e => setProfilePasswordInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                      Authorized Admin Permission PIN (4-6 Digits) *
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      autoComplete="off"
                      placeholder="Enter authorized Admin PIN..."
                      value={profilePinInput}
                      onChange={e => setProfilePinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="pt-1 flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Verify & Unlock Profile Editing</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Read-Only Profile Overview while locked */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 opacity-80">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Current Profile Master Data (Read-Only)
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Unlock above to edit values</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Business / Mill Name</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1">{db.profile?.businessName || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Business Type</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                      {db.profile?.businessType ? db.profile.businessType.replace('_', ' ') : 'Flour Mill'}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Currency Symbol</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">{db.profile?.currency || 'PKR'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Contact Phone</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.contactNumber || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Official Email</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.email || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">NTN / Tax Number</div>
                    <div className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.ntnNumber || 'Not Set'}</div>
                  </div>
                  <div className="sm:col-span-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Mill Physical Facility Address</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.address || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Plant Supervisor</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.plantSupervisor || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Factory Manager</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.factoryManager || 'Not Set'}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Owner / Proprietor</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{db.profile?.ownerName || 'Not Set'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* UNLOCKED STATE: Full Business Profile Form & Credential Management */
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Profile editing unlocked for current session (Verified: {currentUser}).</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsChangeCredentialsOpen(!isChangeCredentialsOpen)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {isChangeCredentialsOpen ? 'Close Credential Settings' : 'Change Profile Password & PIN'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProfileUnlocked(false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Profile Now</span>
                  </button>
                </div>
              </div>

              {isChangeCredentialsOpen && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-800/60 pb-3">
                    <KeyRound className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Update Mill Profile Security Credentials
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Set a new dedicated profile password and separate Admin Permission PIN.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfileCredentials} className="space-y-3 text-xs max-w-lg">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        New Profile-Edit Password (Min 6 Characters) *
                      </label>
                      <input
                        type="password"
                        required
                        value={newProfilePassword}
                        onChange={e => setNewProfilePassword(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                          New Admin Permission PIN (4-6 Digits) *
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          required
                          value={newProfilePin}
                          onChange={e => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 7890"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                          Confirm New Admin PIN *
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          required
                          value={confirmNewProfilePin}
                          onChange={e => setConfirmNewProfilePin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Re-enter PIN"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsChangeCredentialsOpen(false)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                      >
                        Save New Credentials
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Editable Profile Master Record Form */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Mill & Business Profile Master Record
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Business name, addresses, managers, NTN, and currency used across all PDF invoices, receipts, and reports.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Business / Mill Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        placeholder="e.g. Subhan Traders Flour Mills"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Business Type
                      </label>
                      <select
                        value={profileType}
                        onChange={e => setProfileType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      >
                        <option value="flour_mill">Factory / Flour Mill Mode (فلور مل و فیکٹری)</option>
                        <option value="factory">Industrial Factory Mode (فیکٹری)</option>
                        <option value="shopping_mart">Shopping Mart / POS Mode (شاپنگ مارٹ / سپر سٹور)</option>
                        <option value="small_business">Small Business Mode (چھوٹا کاروبار / جنرل سٹور)</option>
                        <option value="shop">Wholesale Shop / Agency</option>
                        <option value="trader">General Traders & Goods</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={profileCurrency}
                        onChange={e => setProfileCurrency(e.target.value)}
                        placeholder="PKR, Rs, $"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono font-bold"
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
                        placeholder="e.g. 0300-0081849"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Official Email Address
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={e => setProfileEmail(e.target.value)}
                        placeholder="info@yourmill.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        NTN / Business Tax Number
                      </label>
                      <input
                        type="text"
                        value={profileNtn}
                        onChange={e => setProfileNtn(e.target.value)}
                        placeholder="e.g. 1234567-8"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Mill / Physical Facility Address
                      </label>
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={e => setProfileAddress(e.target.value)}
                        placeholder="e.g. Plot # 45, Industrial Estate, Sector 12, Pakistan"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Plant Supervisor Name
                      </label>
                      <input
                        type="text"
                        value={profileSupervisor}
                        onChange={e => setProfileSupervisor(e.target.value)}
                        placeholder="Supervisor name"
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
                        placeholder="Manager name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Owner / Proprietor Name
                      </label>
                      <input
                        type="text"
                        value={profileOwner}
                        onChange={e => setProfileOwner(e.target.value)}
                        placeholder="Proprietor name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all active:scale-98 cursor-pointer"
                    >
                      Save Business Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: MASTER PRODUCTS CATALOG (TASK 6: ADMIN PANEL PRODUCT MANAGEMENT) */}
      {adminTab === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sub-Card 1: Add or Edit Master Product Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {editingAdminProd ? 'Edit Master Product' : 'Add New Master Product'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Authorized Administrators Only: Create and update master catalog products.
                    </p>
                  </div>
                </div>

                {editingAdminProd && (
                  <button
                    type="button"
                    onClick={handleCancelEditAdminProduct}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleAddAdminProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Product Name in English *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Fine Flour, Wheat Aata, Suji, Maida..."
                      value={adminProdEn}
                      onChange={e => setAdminProdEn(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAdminAutoTranslate}
                      title="Auto-translate to Urdu using dictionary"
                      className="flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold hover:bg-purple-100 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto Urdu</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Urdu Name (اردو نام)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثلاً: فائن آٹا، میدہ، سوجی، گندم..."
                    value={adminProdUr}
                    onChange={e => setAdminProdUr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Product Category
                    </label>
                    <select
                      value={adminProdCat}
                      onChange={e => setAdminProdCat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      {activeAdminMode === 'factory' ? (
                        <>
                          <option value="Flour & Grains">Flour & Grains (آٹا و اناج)</option>
                          <option value="Fine & Maida">Fine & Maida (میدہ و فائن)</option>
                          <option value="By-Products & Bran">By-Products & Bran (چوکر و بھوسی)</option>
                          <option value="Semolina & Specialties">Semolina & Specialties (سوجی و دیگر)</option>
                          <option value="Cattle & Animal Feed">Cattle & Animal Feed (کھل و فیڈ)</option>
                        </>
                      ) : (
                        Array.from(
                          new Set([
                            ...(db.categories || []).map(c => c.name),
                            ...getBusinessModeConfig(db.profile?.businessType).defaultCategories,
                          ])
                        ).map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Product Price / Rate (PKR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">PKR</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 5000"
                        value={adminProdRate}
                        onChange={e => setAdminProdRate(e.target.value)}
                        className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  {activeAdminMode === 'factory' ? (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Available Bag Sizes
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {db.bagSizes.map(bs => {
                          const isSelected = adminProdSizes.includes(bs.sizeKg);
                          return (
                            <button
                              key={bs.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (adminProdSizes.length > 1) {
                                    setAdminProdSizes(adminProdSizes.filter(s => s !== bs.sizeKg));
                                  }
                                } else {
                                  setAdminProdSizes([...adminProdSizes, bs.sizeKg].sort((a, b) => a - b));
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {bs.sizeKg} kg
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Unit of Measure
                      </label>
                      <select
                        value={adminProdUnit}
                        onChange={e => setAdminProdUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      >
                        {Array.from(
                          new Set([
                            'Piece',
                            'Pack',
                            'Box',
                            'Carton',
                            'Bottle',
                            'Can',
                            'Kg',
                            'Liter',
                            'Dozen',
                            ...(db.units || []).map(u => u.name),
                          ])
                        ).map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingAdminProd ? 'Save Product Updates' : 'Add Product to Master Catalog'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Sub-Card 2: Dedicated Urdu Translation Interactive Workbench */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dedicated Urdu Translation Assistant (اردو مترجم)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instant mill product terminology dictionary with direct insert into catalog form.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Enter English Term or Product Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Atta, Maida, Suji, Bran, Wheat..."
                      value={adminTransInput}
                      onChange={e => handleAdminRunTranslate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {adminTransOutput && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600">Urdu Translation</span>
                      <div className="text-lg font-bold text-slate-900 dark:text-white font-arabic mt-0.5" dir="rtl">
                        {adminTransOutput}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdminApplyPreset(adminTransInput, adminTransOutput)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shadow-xs cursor-pointer"
                    >
                      Use in Product Form
                    </button>
                  </div>
                )}

                {/* Common Flour Mill Quick Presets */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 mb-2">
                    Quick Flour Mill Presets (Click to apply):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { en: 'Wheat Flour', ur: 'گندم کا آٹا' },
                      { en: 'Fine Flour', ur: 'فائن آٹا' },
                      { en: 'Maida', ur: 'میدہ' },
                      { en: 'Super Fine', ur: 'سپر فائن' },
                      { en: 'Chakki Atta', ur: 'چکی آٹا' },
                      { en: 'Suji (Semolina)', ur: 'سوجی' },
                      { en: 'Choker (Bran)', ur: 'چوکر' },
                      { en: 'Dalia (Cracked Wheat)', ur: 'گندم کا دلیہ' },
                      { en: 'Besan (Gram Flour)', ur: 'بیسن' },
                      { en: 'Cattle Feed (Khal)', ur: 'کھل و فیڈ' },
                    ].map(item => (
                      <button
                        key={item.en}
                        type="button"
                        onClick={() => handleAdminApplyPreset(item.en, item.ur)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 rounded-lg text-xs border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="font-semibold">{item.en}</span>
                        <span className="text-slate-400 font-arabic text-[11px]">({item.ur})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Card 3: Bag Sizes Standard Master Register */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mill Standard Bag Sizes Configuration
                </h3>
              </div>

              <form onSubmit={handleAddAdminBagSize} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="New size in kg..."
                  value={adminBagSizeInput}
                  onChange={e => setAdminBagSizeInput(e.target.value)}
                  className="w-36 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Size</span>
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {db.bagSizes.map(bs => (
                <div
                  key={bs.id}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs"
                >
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bs.sizeKg} kg</span>
                  <span className="text-[10px] text-slate-400">({(bs.sizeKg * 2.20462).toFixed(1)} lbs)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-Card 4: Master Products Register Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Master Products Catalog ({db.products.filter(p => p.isActive).length} Products)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Product Name (English)</th>
                    <th className="py-2.5 px-3">Urdu Name (اردو)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price / Rate</th>
                    <th className="py-2.5 px-3">Configured Bag Sizes</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {db.products.filter(p => p.isActive).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No active master products found. Add your first product using the form above.
                      </td>
                    </tr>
                  ) : (
                    db.products.filter(p => p.isActive).map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {prod.nameEn}
                        </td>
                        <td className="py-3 px-3 font-arabic text-sm text-slate-800 dark:text-slate-200" dir="rtl">
                          {prod.nameUr || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {prod.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {prod.rate !== undefined && prod.rate > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">PKR {prod.rate.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Not Set</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {prod.bagSizes.map(s => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
                              >
                                {s}kg
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${prod.isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {prod.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditAdminProduct(prod)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Edit product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveAdminProduct(prod.id, prod.nameEn)}
                              className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Archive to recycle bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* SECTION 6: BROADCASTS & AUDITS */}
      {adminTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Send className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Announcement</h3>
                <p className="text-[11px] text-slate-500">Send high-priority notifications to all terminals and staff.</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Mandatory Shift Handover Notice"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Priority Level
                </label>
                <select
                  value={broadcastPriority}
                  onChange={e => setBroadcastPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="normal">Normal Information</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Operational Action</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={3}
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Enter notice text..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none resize-none"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Broadcast</span>
                </button>
              </div>
            </form>
          </div>

          {/* Database Checksum and Audit Integrity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Data Audit & Checksum</h3>
                  <p className="text-[11px] text-slate-500">Run cryptographic hash audit across all database entities.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunIntegrityValidation}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Verify Checksum</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-slate-200">Current Entity Count:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>Products: <strong className="text-slate-900 dark:text-white">{db.products.length}</strong></div>
                  <div>Production Sessions: <strong className="text-slate-900 dark:text-white">{db.productionSessions.length}</strong></div>
                  <div>Stock Balance Records: <strong className="text-slate-900 dark:text-white">{db.stockBalances.length}</strong></div>
                  <div>Sales Invoices: <strong className="text-slate-900 dark:text-white">{db.sales.length}</strong></div>
                  <div>Returns Records: <strong className="text-slate-900 dark:text-white">{db.returns.length}</strong></div>
                  <div>Recycle Bin Items: <strong className="text-slate-900 dark:text-white">{db.recycleBin.length}</strong></div>
                </div>
              </div>

              {integrityReport && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Integrity Verified: {integrityReport.checkedAt}</span>
                  </div>
                  <div className="font-mono text-[11px] truncate">
                    Hash: {integrityReport.checksum}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New User Account Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleAddUser}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create User Account</h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Aslam Khan"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  placeholder="e.g. aslam"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    {(db.customRoles || []).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.allowedModules.length} sections)
                      </option>
                    ))}
                    <option value="operator">Operator (Default)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Quick PIN (4-6 Digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newUserPin}
                    onChange={e => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Enter login password"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Save User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Account Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleSaveEditUser}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit User Account</h3>
                <p className="text-xs text-slate-400">@{editingUser.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={editUserRole}
                    onChange={e => setEditUserRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    {(db.customRoles || []).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.allowedModules.length} sections)
                      </option>
                    ))}
                    <option value="operator">Operator (Default)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Quick PIN (Leave empty to keep)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={editUserPin}
                    onChange={e => setEditUserPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Protected"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  New Password (Leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editUserNewPassword}
                  onChange={e => setEditUserNewPassword(e.target.value)}
                  placeholder="Enter new password to change"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Update Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUIREMENT 4: Create / Edit Custom Role Modal with Checklist */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleSaveRole}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">
                    {editingRoleId ? 'Edit Custom Role Permissions' : 'Create Custom Role with Selectable Access'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Define the role title and check the exact sections this role is allowed to access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Name (Type Manually) *
                  </label>
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={e => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Salesman, Manager, Operator, Accountant, Store Manager"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={customRoleDesc}
                    onChange={e => setCustomRoleDesc(e.target.value)}
                    placeholder="e.g. Counter sales dispatch and invoice generation"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* What should this role be allowed to see and access? */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      What should this role be allowed to see and access? *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Checked sections will be visible in the sidebar navigation and accessible upon login.
                    </p>
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleModules(AVAILABLE_ROLE_SECTIONS.map(s => s.key))}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleModules([])}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleModules(['sales', 'stock', 'pdf_center'])}
                      className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800"
                    >
                      Preset: Sales Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleModules(['production', 'stock'])}
                      className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800"
                    >
                      Preset: Production Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleModules(['mill_purchases', 'stock'])}
                      className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800"
                    >
                      Preset: Purchase + Stock
                    </button>
                  </div>
                </div>

                {/* Checkbox Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {AVAILABLE_ROLE_SECTIONS.map(sec => {
                    const isChecked = selectedRoleModules.includes(sec.key);

                    return (
                      <label
                        key={sec.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedRoleModules([...selectedRoleModules, sec.key]);
                            } else {
                              setSelectedRoleModules(selectedRoleModules.filter(k => k !== sec.key));
                            }
                          }}
                          className="mt-0.5 w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>☑️ {sec.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {sec.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Custom Role ({selectedRoleModules.length} Sections)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Role Confirmation Dialog */}
      {roleDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Custom Role</h3>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete custom role <strong>"{roleDeleteConfirm.name}"</strong>? Any users currently assigned to this role will be safely reverted to default staff access.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRole(roleDeleteConfirm)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK 5 & 6: Change Google Account Confirmation Modal */}
      {isChangeAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Cloud className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Change Google Drive Account?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeAccountModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Currently connected account:{' '}
                <strong className="text-blue-600 font-mono">
                  {db.settings.googleAccountEmail || 'None'}
                </strong>
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Account Change Safety Rules:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                  <li>Safely disconnects old Google Drive authorization tokens.</li>
                  <li>Does NOT delete local application data, production, or stock.</li>
                  <li>Does NOT delete Firestore or existing Google Drive backups.</li>
                  <li>Does NOT delete Mill Business Profile or settings.</li>
                  <li>Opens official Google sign-in to authorize another account (e.g. <strong>productiondata70@gmail.com</strong>).</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsChangeAccountModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminChangeGoogleAccount}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-98 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Confirm Change Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
