import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Globe,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Package,
  Plus,
  Trash2,
  Edit3,
  Languages,
  Sparkles,
  Sliders,
  Check,
  Shield,
  Lock,
  Power,
  AlertTriangle,
  X,
  Printer,
  Barcode,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  AppDatabase,
  AppTheme,
  AppLanguage,
  Product,
  BusinessType,
} from '../types';
import { StorageService } from '../services/storage';
import { translations, autoTranslateToUrdu, productUrduDict } from '../services/translations';
import { normalizeBusinessMode, getBusinessModeConfig, BUSINESS_MODE_CONFIGS } from '../services/businessMode';
import {
  listSystemPrinters,
  printTestThermalReceipt,
} from '../services/barcodeAndReceipt';

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

  const currentUserAccount = db.users.find(
    u => u.name === currentUser || u.username === currentUser || u.id === currentUser
  );
  const isAdmin =
    !currentUserAccount ||
    currentUserAccount.role.toLowerCase() === 'admin' ||
    currentUserAccount.role.toLowerCase() === 'administrator' ||
    (currentUserAccount.allowedModules || []).includes('settings') ||
    (currentUserAccount.allowedModules || []).includes('admin');

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'products' | 'business_mode' | 'appearance' | 'language' | 'local_backup'>('products');

  // New Workspace Creation & Management state
  const [newWsName, setNewWsName] = useState('');
  const [newWsType, setNewWsType] = useState<BusinessType>('shopping_mart');
  const [newWsPhone, setNewWsPhone] = useState('');
  const [newWsAddress, setNewWsAddress] = useState('');
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null);
  const [renamingWsValue, setRenamingWsValue] = useState('');
  const [deletingWsId, setDeletingWsId] = useState<string | null>(null);

  // Invoice, Thermal Printer & Barcode Config state
  const [taxRateInput, setTaxRateInput] = useState(String(db.profile?.taxRate ?? 0));
  const [invoicePrefixInput, setInvoicePrefixInput] = useState(db.profile?.invoicePrefix || 'INV');
  const [receiptPrintModeInput, setReceiptPrintModeInput] = useState<'a4' | 'thermal_80mm' | 'thermal_58mm'>(
    db.profile?.receiptPrintMode || 'thermal_58mm'
  );
  const [receiptFooterInput, setReceiptFooterInput] = useState(
    db.profile?.receiptFooter || 'Thank you for your business!'
  );
  const [printerNameInput, setPrinterNameInput] = useState(db.profile?.printerConfig?.printerName || '');
  const [paperWidthInput, setPaperWidthInput] = useState<58 | 80>(
    db.profile?.printerConfig?.paperWidthMm || (db.profile?.receiptPrintMode === 'thermal_80mm' ? 80 : 58)
  );
  const [autoPrintReceiptInput, setAutoPrintReceiptInput] = useState(
    Boolean(db.profile?.printerConfig?.autoPrintReceipt)
  );
  const [silentPrintInput, setSilentPrintInput] = useState(
    Boolean(db.profile?.printerConfig?.silentPrint)
  );
  const [showBarcodeOnReceiptInput, setShowBarcodeOnReceiptInput] = useState(
    db.profile?.printerConfig?.showBarcodeOnReceipt !== false
  );
  const [barcodePrefixInput, setBarcodePrefixInput] = useState(
    db.profile?.barcodeConfig?.prefix || '896'
  );
  const [autoGenerateBarcodeInput, setAutoGenerateBarcodeInput] = useState(
    db.profile?.barcodeConfig?.autoGenerateOnNewProduct !== false
  );
  const [labelSizeInput, setLabelSizeInput] = useState<'38x25mm' | '50x30mm' | '40x30mm' | '40x25mm' | '58x40mm'>(
    db.profile?.barcodeConfig?.labelSize || '50x30mm'
  );
  const [scannerBeepInput, setScannerBeepInput] = useState(
    db.profile?.scannerConfig?.beepOnScan !== false
  );

  // Detected System Printers & Test Receipt Preview state
  const [systemPrinters, setSystemPrinters] = useState<
    Array<{ name: string; displayName: string; isDefault: boolean }>
  >([]);
  const [isDesktopPrintEnv, setIsDesktopPrintEnv] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [testReceiptHtmlPreview, setTestReceiptHtmlPreview] = useState<{
    paperWidthMm: 58 | 80;
    html: string;
  } | null>(null);

  const handleRefreshSystemPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      const res = await listSystemPrinters();
      setIsDesktopPrintEnv(res.isDesktopSupported);
      setSystemPrinters(res.printers || []);
      if (res.error) {
        setNotificationMsg({ type: 'error', text: res.error });
      }
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'business_mode') {
      handleRefreshSystemPrinters();
    }
  }, [activeTab]);

  React.useEffect(() => {
    setTaxRateInput(String(db.profile?.taxRate ?? 0));
    setInvoicePrefixInput(db.profile?.invoicePrefix || 'INV');
    setReceiptPrintModeInput(db.profile?.receiptPrintMode || 'thermal_58mm');
    setReceiptFooterInput(db.profile?.receiptFooter || 'Thank you for your business!');
    setPrinterNameInput(db.profile?.printerConfig?.printerName || '');
    setPaperWidthInput(
      db.profile?.printerConfig?.paperWidthMm || (db.profile?.receiptPrintMode === 'thermal_80mm' ? 80 : 58)
    );
    setAutoPrintReceiptInput(Boolean(db.profile?.printerConfig?.autoPrintReceipt));
    setSilentPrintInput(Boolean(db.profile?.printerConfig?.silentPrint));
    setShowBarcodeOnReceiptInput(db.profile?.printerConfig?.showBarcodeOnReceipt !== false);
    setBarcodePrefixInput(db.profile?.barcodeConfig?.prefix || '896');
    setAutoGenerateBarcodeInput(db.profile?.barcodeConfig?.autoGenerateOnNewProduct !== false);
    setLabelSizeInput(db.profile?.barcodeConfig?.labelSize || '50x30mm');
    setScannerBeepInput(db.profile?.scannerConfig?.beepOnScan !== false);
  }, [db.activeBusinessId, db.profile?.id]);

  // Master Product Form State
  const activeSettingsMode = normalizeBusinessMode(db.profile?.businessType);
  const defaultSettingsCat =
    activeSettingsMode === 'factory'
      ? 'Flour & Grains'
      : getBusinessModeConfig(db.profile?.businessType).defaultCategories[0] || 'General';
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodNameUr, setProdNameUr] = useState('');
  const [prodCategory, setProdCategory] = useState(defaultSettingsCat);
  const [prodBagSizes, setProdBagSizes] = useState<number[]>(
    activeSettingsMode === 'factory' ? [50, 80] : [1]
  );
  const [prodUnit, setProdUnit] = useState<string>(
    activeSettingsMode === 'factory' ? 'Bag' : 'Piece'
  );
  const [prodItemType, setProdItemType] = useState<'product' | 'service'>('product');
  const [prodRate, setProdRate] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  React.useEffect(() => {
    const mode = normalizeBusinessMode(db.profile?.businessType);
    const defaultCat =
      mode === 'factory'
        ? 'Flour & Grains'
        : db.categories?.[0]?.name ||
          getBusinessModeConfig(db.profile?.businessType).defaultCategories[0] ||
          'General';
    setEditingProduct(null);
    setProdNameEn('');
    setProdNameUr('');
    setProdCategory(defaultCat);
    setProdBagSizes(mode === 'factory' ? [50, 80] : [1]);
    setProdUnit(mode === 'factory' ? 'Bag' : 'Piece');
    setProdItemType('product');
    setProdRate('');
  }, [db.activeBusinessId, db.profile?.businessType]);

  // Deletion and dependency check modal states (Step 15 & 16)
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [productDepsInfo, setProductDepsInfo] = useState<{ hasDependencies: boolean; count: number; details: string[]; canSafelyDelete: boolean } | null>(null);

  // Urdu Translation interactive workbench state
  const [transInput, setTransInput] = useState('');
  const [transOutput, setTransOutput] = useState('');

  // Bag Size Management state
  const [newBagSizeKg, setNewBagSizeKg] = useState('');

  // --- Handlers for Product Management ---
  const handleAddOrUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setNotificationMsg({ type: 'error', text: 'Access Denied: Product creation is restricted to authorized Administrators only.' });
      return;
    }
    if (!prodNameEn.trim()) {
      setNotificationMsg({ type: 'error', text: 'Product English name is required.' });
      return;
    }

    const mode = normalizeBusinessMode(db.profile?.businessType);
    const finalUrdu = prodNameUr.trim() || autoTranslateToUrdu(prodNameEn.trim()) || prodNameEn.trim();
    const finalSizes = mode === 'factory' ? (prodBagSizes.length > 0 ? prodBagSizes : [50]) : [1];
    const effectiveItemType: 'product' | 'service' =
      mode === 'small_business' ? prodItemType : 'product';
    const effectiveType =
      effectiveItemType === 'service'
        ? 'Service'
        : mode === 'factory'
        ? 'Manufactured Product'
        : 'Retail Product';
    const effectiveUnit =
      mode === 'factory'
        ? 'Bag'
        : effectiveItemType === 'service' && prodUnit === 'Piece'
        ? 'Job'
        : prodUnit || 'Piece';
    const effectiveCat =
      prodCategory.trim() ||
      (mode === 'factory'
        ? 'Flour & Grains'
        : getBusinessModeConfig(db.profile?.businessType).defaultCategories[0] || 'General');
    const trimmedRate = prodRate.trim();
    const rateVal = trimmedRate !== '' ? Number(trimmedRate) : undefined;

    if (rateVal !== undefined && (isNaN(rateVal) || rateVal < 0)) {
      setNotificationMsg({ type: 'error', text: 'Product Price / Rate must be a valid non-negative number.' });
      return;
    }

    if (editingProduct) {
      storage.updateProduct(
        editingProduct.id,
        {
          nameEn: prodNameEn.trim(),
          nameUr: finalUrdu,
          category: effectiveCat,
          type: effectiveType,
          itemType: effectiveItemType,
          unit: effectiveUnit,
          bagSizes: finalSizes,
          rate: rateVal,
        },
        currentUser
      );
      setNotificationMsg({
        type: 'success',
        text: `Product "${prodNameEn.trim()}" updated successfully${rateVal !== undefined ? ` (Product Price: PKR ${rateVal.toLocaleString()})` : ''}.`,
      });
      setEditingProduct(null);
    } else {
      storage.addProduct(
        {
          nameEn: prodNameEn.trim(),
          nameUr: finalUrdu,
          category: effectiveCat,
          type: effectiveType,
          itemType: effectiveItemType,
          unit: effectiveUnit,
          bagSizes: finalSizes,
          rate: rateVal,
        },
        currentUser
      );
      setNotificationMsg({
        type: 'success',
        text: `Product "${prodNameEn.trim()}" added to Product Master${rateVal !== undefined ? ` (Product Price: PKR ${rateVal.toLocaleString()})` : ''}.`,
      });
    }

    setProdNameEn('');
    setProdNameUr('');
    setProdCategory(defaultSettingsCat);
    setProdBagSizes(mode === 'factory' ? [50, 80] : [1]);
    setProdUnit(mode === 'factory' ? 'Bag' : 'Piece');
    setProdItemType('product');
    setProdRate('');
  };

  const handleStartEditProduct = (prod: Product) => {
    const mode = normalizeBusinessMode(db.profile?.businessType);
    setEditingProduct(prod);
    setProdNameEn(prod.nameEn);
    setProdNameUr(prod.nameUr || '');
    setProdCategory(prod.category || defaultSettingsCat);
    setProdBagSizes(mode === 'factory' ? prod.bagSizes || [50] : [1]);
    setProdUnit(prod.unit || (mode === 'factory' ? 'Bag' : 'Piece'));
    setProdItemType(prod.itemType || 'product');
    setProdRate(prod.rate !== undefined ? String(prod.rate) : '');
  };

  const handleCancelEdit = () => {
    const mode = normalizeBusinessMode(db.profile?.businessType);
    setEditingProduct(null);
    setProdNameEn('');
    setProdNameUr('');
    setProdCategory(defaultSettingsCat);
    setProdBagSizes(mode === 'factory' ? [50, 80] : [1]);
    setProdUnit(mode === 'factory' ? 'Bag' : 'Piece');
    setProdItemType('product');
    setProdRate('');
  };

  const handleToggleProductStatus = (prod: Product) => {
    try {
      storage.toggleProductStatus(prod.id, !prod.isActive, currentUser);
      setNotificationMsg({
        type: 'success',
        text: `Product "${prod.nameEn}" is now ${!prod.isActive ? 'Active (selectable in new transactions)' : 'Inactive (hidden from new transactions, historical data safe)'}.`,
      });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to update product status.' });
    }
  };

  const handleRequestDeleteProduct = (prod: Product) => {
    const deps = storage.checkProductDependencies(prod.id);
    setProductDepsInfo(deps);
    setDeleteConfirmProduct(prod);
  };

  const handleConfirmDeleteProduct = () => {
    if (!deleteConfirmProduct) return;
    try {
      const res = storage.deleteProduct(deleteConfirmProduct.id, currentUser);
      setNotificationMsg({ type: 'success', text: res.message });
      setDeleteConfirmProduct(null);
      setProductDepsInfo(null);
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to delete product.' });
    }
  };

  const handleArchiveProduct = (id: string, name: string) => {
    storage.archiveProduct(id, currentUser, 'Archived via User Settings Product Management');
    setNotificationMsg({ type: 'success', text: `Product "${name}" archived to Recycle Bin.` });
  };

  const handleAutoTranslateName = () => {
    if (!prodNameEn.trim()) return;
    const ur = autoTranslateToUrdu(prodNameEn.trim());
    if (ur) {
      setProdNameUr(ur);
    } else {
      setProdNameUr(prodNameEn.trim());
    }
  };

  const handleAddBagSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setNotificationMsg({ type: 'error', text: 'Access Denied: Bag size configuration is restricted to Administrators.' });
      return;
    }
    const size = parseInt(newBagSizeKg, 10);
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
    setNewBagSizeKg('');
  };

  const handleRunTranslateTool = (word: string) => {
    setTransInput(word);
    const res = autoTranslateToUrdu(word);
    setTransOutput(res || word);
  };

  const handleApplyPresetToForm = (en: string, ur: string) => {
    setProdNameEn(en);
    setProdNameUr(ur);
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

      {/* Settings Sub-Navigation Tabs (Tasks 1, 2, 3: Cloud Sync, Security & Profile moved to Admin Panel) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'products', label: '1. Add New Product & Master Catalog', icon: Package },
          { key: 'business_mode', label: '2. Business Mode & Multi-Business Workspaces', icon: Sliders },
          { key: 'appearance', label: '3. Themes & Color Appearance', icon: Palette },
          { key: 'language', label: '4. System Language (زبان)', icon: Globe },
          { key: 'local_backup', label: '5. Offline Database Snapshot', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
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

      {/* TAB 1: MASTER PRODUCT CATALOG (TASK 6: Restricted Product Creation) */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sub-Card 1: Add or Edit Product Master Form (Admins Only) / View Only Card (Normal Users) */}
            {isAdmin ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {editingProduct ? 'Edit Product (Product Master)' : 'Add New Product'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Configure product name, bag sizes, and default Product Price / Rate (PKR) for invoices.
                      </p>
                    </div>
                  </div>

                  {editingProduct && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddOrUpdateProduct} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Product Name in English *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Fine Flour, Wheat Aata, Suji, Maida..."
                        value={prodNameEn}
                        onChange={e => setProdNameEn(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAutoTranslateName}
                        title="Auto-translate to Urdu using dictionary"
                        className="flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold hover:bg-purple-100"
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
                      value={prodNameUr}
                      onChange={e => setProdNameUr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Product Category
                      </label>
                      <select
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      >
                        {normalizeBusinessMode(db.profile?.businessType) === 'factory' ? (
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
                        {normalizeBusinessMode(db.profile?.businessType) === 'factory'
                          ? 'Product Price / Rate (فی بوری قیمت)'
                          : 'Selling Price / Rate (PKR)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">PKR</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 500"
                          value={prodRate}
                          onChange={e => setProdRate(e.target.value)}
                          className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono font-bold"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Default invoice rate in PKR
                      </span>
                    </div>

                    {normalizeBusinessMode(db.profile?.businessType) === 'factory' ? (
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Available Bag Sizes
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {db.bagSizes.map(bs => {
                            const isSelected = prodBagSizes.includes(bs.sizeKg);
                            return (
                              <button
                                key={bs.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (prodBagSizes.length > 1) {
                                      setProdBagSizes(prodBagSizes.filter(s => s !== bs.sizeKg));
                                    }
                                  } else {
                                    setProdBagSizes([...prodBagSizes, bs.sizeKg].sort((a, b) => a - b));
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
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
                      <div className="space-y-2">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Unit of Measure
                          </label>
                          <select
                            value={prodUnit}
                            onChange={e => setProdUnit(e.target.value)}
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
                                'Gram',
                                'Liter',
                                'Dozen',
                                'Bundle',
                                ...(normalizeBusinessMode(db.profile?.businessType) === 'small_business'
                                  ? ['Job', 'Service', 'Hour']
                                  : []),
                                ...(db.units || []).map(u => u.name),
                              ])
                            ).map(u => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                        {normalizeBusinessMode(db.profile?.businessType) === 'small_business' && (
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Item Type
                            </label>
                            <select
                              value={prodItemType}
                              onChange={e => {
                                const val = e.target.value as 'product' | 'service';
                                setProdItemType(val);
                                if (val === 'service' && prodUnit === 'Piece') {
                                  setProdUnit('Job');
                                } else if (val === 'product' && prodUnit === 'Job') {
                                  setProdUnit('Piece');
                                }
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                            >
                              <option value="product">Physical Product (Stock Tracked)</option>
                              <option value="service">Service / Labor (Non-Stock)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingProduct ? 'Save Product Updates' : 'Add Product to Master Catalog'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Authorized Products Catalog (View Only)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Standard mill products authorized for daily production shifts, inventory balances, and sales invoicing.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    <span>Product Creation Restricted to Authorized Administrators</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Normal user accounts cannot add, edit, or delete master products. You can view authorized products below and use them freely in Production, Stock, and Sales workflows. To register new product types, please contact an authorized administrator via the Admin Panel.
                  </p>
                </div>
              </div>
            )}

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
                      value={transInput}
                      onChange={e => handleRunTranslateTool(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRunTranslateTool(transInput)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs"
                    >
                      Translate
                    </button>
                  </div>
                </div>

                {transOutput && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600">Urdu Translation</span>
                      <div className="text-lg font-bold text-slate-900 dark:text-white font-arabic mt-0.5" dir="rtl">
                        {transOutput}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetToForm(transInput, transOutput)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shadow-xs"
                    >
                      Use in Product Form
                    </button>
                  </div>
                )}

                {/* Common Quick Presets (Filtered by Active Business Type) */}
                {normalizeBusinessMode(db.profile?.businessType) === 'factory' && (
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
                          onClick={() => handleApplyPresetToForm(item.en, item.ur)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 rounded-lg text-xs border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                        >
                          <span className="font-semibold">{item.en}</span>
                          <span className="text-slate-400 font-arabic text-[11px]">({item.ur})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Card 3: Bag Sizes Standard Master Register (Factory Only) */}
          {normalizeBusinessMode(db.profile?.businessType) === 'factory' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mill Standard Bag Sizes Configuration
                  </h3>
                </div>

                {isAdmin && (
                  <form onSubmit={handleAddBagSize} className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="New size in kg..."
                      value={newBagSizeKg}
                      onChange={e => setNewBagSizeKg(e.target.value)}
                      className="w-36 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      Add Bag Size
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {db.bagSizes.map(bs => (
                  <div
                    key={bs.id}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs"
                  >
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{bs.sizeKg} kg</span>
                    <span className="text-[10px] text-slate-400">({(bs.sizeKg / 40).toFixed(2)} maund)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Product Catalog List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Configured Master Products Catalog ({db.products.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Products active across daily shift production, stock balances, and customer dispatch invoices.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 font-semibold">Product Name (EN)</th>
                    <th className="py-2.5 px-3 font-semibold">Urdu Name (اردو)</th>
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Price / Rate</th>
                    <th className="py-2.5 px-3 font-semibold">
                      {normalizeBusinessMode(db.profile?.businessType) === 'factory' ? 'Bag Sizes' : 'Unit / SKU'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    {isAdmin && <th className="py-2.5 px-3 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {db.products.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400">
                        No products added yet.
                      </td>
                    </tr>
                  ) : (
                    db.products.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{prod.nameEn}</td>
                        <td className="py-3 px-3 font-bold text-purple-600 font-arabic text-sm">{prod.nameUr || '—'}</td>
                        <td className="py-3 px-3 text-slate-500">{prod.category}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {prod.rate !== undefined && prod.rate > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">PKR {prod.rate.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Not Set</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {normalizeBusinessMode(db.profile?.businessType) === 'factory' ? (
                            <div className="flex flex-wrap gap-1">
                              {prod.bagSizes.map(sz => (
                                <span key={sz} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold">
                                  {sz}kg
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold">
                              {prod.unit || 'Piece'} {prod.sku ? `· ${prod.sku}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            prod.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prod.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {prod.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Activate / Deactivate Toggle (Step 15 & 17) */}
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(prod)}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  prod.isActive
                                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                                title={prod.isActive ? 'Deactivate product (hide from new transactions, keep historical data)' : 'Activate product (make selectable in new transactions)'}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline text-[11px]">{prod.isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>

                              {/* Edit Product (Step 1) */}
                              <button
                                type="button"
                                onClick={() => handleStartEditProduct(prod)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                                title="Edit product & price"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Product with Historical Check (Step 15 & 16) */}
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteProduct(prod)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                                title="Delete product (checks historical dependencies first)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Product Deletion & Historical Dependency Modal (Step 15 & Step 16) */}
            {deleteConfirmProduct && productDepsInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      productDepsInfo.hasDependencies ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {productDepsInfo.hasDependencies ? 'Historical Dependencies Found' : 'Delete Master Product'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Product: <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmProduct.nameEn}</strong> ({deleteConfirmProduct.nameUr || 'No Urdu'})
                      </p>
                    </div>
                  </div>

                  {productDepsInfo.hasDependencies ? (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-2">
                        <div className="font-semibold text-amber-900 dark:text-amber-200">
                          This product is linked to existing business records:
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-amber-800 dark:text-amber-300 text-[11px]">
                          {productDepsInfo.details.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-amber-900 dark:text-amber-200 pt-1 font-medium">
                          Permanent physical deletion would break historical invoices and sales records. To protect your accounting, the product will be <strong>safely Deactivated & Archived</strong> instead.
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmProduct(null);
                            setProductDepsInfo(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteProduct}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Deactivate & Archive Safely
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        This product has no historical dependencies in sales, production, or stock. Are you sure you want to permanently remove it from the master catalog?
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmProduct(null);
                            setProductDepsInfo(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteProduct}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: BUSINESS MODE & MULTI-BUSINESS WORKSPACES */}
      {activeTab === 'business_mode' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bound Business Workspace & Account Architecture (کاروباری شناخت اور کھاتہ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your business type is permanently bound to this account's unique <code className="font-mono">businessId</code>. All products, stock, sales, purchases, customers, suppliers, expenses, and PDF reports are strictly isolated to this workspace.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Bound Type: {getBusinessModeConfig(db.profile?.businessType).label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase text-slate-400">Business ID</div>
                <div className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {db.profile?.id || db.activeBusinessId || 'FACTORY_001'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase text-slate-400">Business Name</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {db.profile?.businessName || 'Workspace'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase text-slate-400">Business Type</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {getBusinessModeConfig(db.profile?.businessType).labelEn}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase text-slate-400">Account Status & Plan</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white uppercase mt-0.5">
                  {db.profile?.accountStatus || 'active'} · {db.profile?.planType || 'professional'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase text-slate-400">Owner / Manager</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {db.profile?.ownerName || currentUser}
                </div>
              </div>
            </div>
          </div>

          {/* Thermal Printer, 58mm / 80mm Receipt & Barcode Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thermal Printer (58mm / 80mm), POS Receipt & Barcode Configuration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure USB/Network thermal receipt printers, 58mm/80mm roll width, barcode label sizes, and test print receipts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshSystemPrinters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                  <span>Detect Printers</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await printTestThermalReceipt(
                      db.profile,
                      58,
                      printerNameInput || undefined,
                      silentPrintInput
                    );
                    setTestReceiptHtmlPreview({ paperWidthMm: 58, html: res.htmlContent });
                    if (res.success) {
                      setNotificationMsg({
                        type: 'success',
                        text: '58mm Thermal Test Receipt generated and sent to print!',
                      });
                    } else {
                      setNotificationMsg({
                        type: 'error',
                        text: res.error || 'Could not print to thermal printer. Preview opened below.',
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Test 58mm Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await printTestThermalReceipt(
                      db.profile,
                      80,
                      printerNameInput || undefined,
                      silentPrintInput
                    );
                    setTestReceiptHtmlPreview({ paperWidthMm: 80, html: res.htmlContent });
                    if (res.success) {
                      setNotificationMsg({
                        type: 'success',
                        text: '80mm Thermal Test Receipt generated and sent to print!',
                      });
                    } else {
                      setNotificationMsg({
                        type: 'error',
                        text: res.error || 'Could not print to thermal printer. Preview opened below.',
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Test 80mm Receipt</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  System Thermal Printer
                </label>
                {systemPrinters.length > 0 ? (
                  <select
                    value={printerNameInput}
                    onChange={e => setPrinterNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">System Default / Print Dialog</option>
                    {systemPrinters.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.displayName} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={printerNameInput}
                    onChange={e => setPrinterNameInput(e.target.value)}
                    placeholder={isDesktopPrintEnv ? 'No printer detected (uses Print Dialog)' : 'Browser Print Dialog (or enter printer name)'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Thermal Paper Width (58mm / 80mm)
                </label>
                <select
                  value={paperWidthInput}
                  onChange={e => {
                    const w = Number(e.target.value) === 80 ? 80 : 58;
                    setPaperWidthInput(w);
                    setReceiptPrintModeInput(w === 58 ? 'thermal_58mm' : 'thermal_80mm');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value={58}>58mm Thermal Roll (48mm printable)</option>
                  <option value={80}>80mm Thermal Roll (72mm printable)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Default Invoice Print Mode
                </label>
                <select
                  value={receiptPrintModeInput}
                  onChange={e => {
                    const val = e.target.value as 'a4' | 'thermal_80mm' | 'thermal_58mm';
                    setReceiptPrintModeInput(val);
                    if (val === 'thermal_58mm') setPaperWidthInput(58);
                    if (val === 'thermal_80mm') setPaperWidthInput(80);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="thermal_58mm">Compact Thermal Receipt (58mm)</option>
                  <option value="thermal_80mm">Thermal POS Receipt (80mm)</option>
                  <option value="a4">Standard A4 Invoice</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Invoice Prefix & Default Tax (%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoicePrefixInput}
                    onChange={e => setInvoicePrefixInput(e.target.value)}
                    placeholder="POS / INV"
                    className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={taxRateInput}
                    onChange={e => setTaxRateInput(e.target.value)}
                    placeholder="Tax %"
                    className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Barcode Prefix (EAN-13 / Code-128)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={barcodePrefixInput}
                  onChange={e => setBarcodePrefixInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="896"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Barcode Sticker Label Size
                </label>
                <select
                  value={labelSizeInput}
                  onChange={e => setLabelSizeInput(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="50x30mm">50mm x 30mm (Standard Retail Sticker)</option>
                  <option value="40x30mm">40mm x 30mm (Medium Sticker)</option>
                  <option value="38x25mm">38mm x 25mm (Compact Sticker)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Receipt Footer Message
                </label>
                <input
                  type="text"
                  value={receiptFooterInput}
                  onChange={e => setReceiptFooterInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrintReceiptInput}
                    onChange={e => setAutoPrintReceiptInput(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Auto-Print Receipt After POS Sale
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcodeOnReceiptInput}
                    onChange={e => setShowBarcodeOnReceiptInput(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Print Scannable Barcode on Receipt
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateBarcodeInput}
                    onChange={e => setAutoGenerateBarcodeInput(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Auto-Generate Barcode on New Product
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scannerBeepInput}
                    onChange={e => setScannerBeepInput(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Scanner Beep Sound on Barcode Match
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  storage.updateProfile(
                    {
                      taxRate: Math.max(0, Number(taxRateInput) || 0),
                      invoicePrefix: invoicePrefixInput.trim() || 'INV',
                      receiptPrintMode: receiptPrintModeInput,
                      receiptFooter: receiptFooterInput.trim(),
                      printerConfig: {
                        printerName: printerNameInput.trim(),
                        paperWidthMm: paperWidthInput,
                        autoPrintReceipt: autoPrintReceiptInput,
                        silentPrint: silentPrintInput,
                        showBarcodeOnReceipt: showBarcodeOnReceiptInput,
                        copies: 1,
                      },
                      barcodeConfig: {
                        format: 'CODE128',
                        prefix: barcodePrefixInput.trim() || '896',
                        autoGenerateOnNewProduct: autoGenerateBarcodeInput,
                        showPriceOnLabel: true,
                        showBusinessNameOnLabel: true,
                        showSkuOnLabel: true,
                        labelSize: labelSizeInput,
                      },
                      scannerConfig: {
                        enabled: true,
                        autoAddInPos: true,
                        incrementExistingLine: true,
                        beepOnScan: scannerBeepInput,
                      },
                    },
                    currentUser
                  );
                  setNotificationMsg({
                    type: 'success',
                    text: 'Thermal printer (58mm/80mm), POS receipt, barcode, and scanner settings saved for this workspace.',
                  });
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Printer, Receipt & Barcode Settings
              </button>
            </div>

            {testReceiptHtmlPreview && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live {testReceiptHtmlPreview.paperWidthMm}mm Thermal Receipt Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setTestReceiptHtmlPreview(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Close Preview ✕
                  </button>
                </div>
                <div className="flex justify-center">
                  <iframe
                    title="Thermal Receipt Preview"
                    srcDoc={testReceiptHtmlPreview.html}
                    className="bg-white rounded-lg shadow-md border border-slate-300"
                    style={{
                      width: testReceiptHtmlPreview.paperWidthMm === 58 ? '235px' : '315px',
                      height: '440px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Multi-Business Isolated Workspaces */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Business Isolated Workspaces (الگ کاروباری کھاتے)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each business workspace has its own strictly isolated `businessId` for products, stock, sales, purchases, customers, suppliers, expenses, and reports. Factory/Mill data never leaks into Shopping Mart or Small Business workspaces.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(db.businesses || (db.profile ? [db.profile] : [])).map(ws => {
                const isCurrent = (db.activeBusinessId || db.profile?.id) === ws.id;
                const cfg = getBusinessModeConfig(ws.businessType);
                const isRenaming = renamingWsId === ws.id;
                return (
                  <div
                    key={ws.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renamingWsValue}
                              onChange={e => setRenamingWsValue(e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-blue-400 bg-white dark:bg-slate-900 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  storage.renameBusinessWorkspace(ws.id, renamingWsValue, currentUser);
                                  setRenamingWsId(null);
                                  setNotificationMsg({
                                    type: 'success',
                                    text: `Workspace renamed to "${renamingWsValue}".`,
                                  });
                                } catch (err: any) {
                                  setNotificationMsg({ type: 'error', text: err.message });
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingWsId(null)}
                              className="px-2 py-1 text-slate-500 text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{ws.businessName}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {cfg.label}
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1">
                          ID: <span className="font-mono">{ws.id}</span> · {ws.address || 'No address'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingWsId(ws.id);
                            setRenamingWsValue(ws.businessName);
                          }}
                          title="Rename Workspace"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => setDeletingWsId(ws.id)}
                            title="Delete Workspace"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Receipt: {ws.receiptPrintMode || 'thermal_58mm'} · Prefix: {ws.invoicePrefix || 'INV'}
                      </span>
                      {isCurrent ? (
                        <span className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white">
                          Active Workspace
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            storage.switchBusinessWorkspace(ws.id, currentUser);
                            setNotificationMsg({
                              type: 'success',
                              text: `Switched active workspace to "${ws.businessName}" (${cfg.label}).`,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 dark:bg-slate-700 text-white hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          Switch Workspace
                        </button>
                      )}
                    </div>

                    {deletingWsId === ws.id && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs space-y-2">
                        <div className="font-bold text-rose-800 dark:text-rose-200">
                          Permanently delete workspace "{ws.businessName}" and all its isolated records?
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDeletingWsId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const res = storage.deleteBusinessWorkspace(ws.id, currentUser);
                                setDeletingWsId(null);
                                setNotificationMsg({ type: 'success', text: res.message });
                              } catch (err: any) {
                                setNotificationMsg({ type: 'error', text: err.message });
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Create New Isolated Business Workspace */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                + Create Separate Business Workspace (New Isolated Business ID)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Business Name (e.g. Al-Barakah Super Mart)"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <select
                  value={newWsType}
                  onChange={e => setNewWsType(e.target.value as BusinessType)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="shopping_mart">Shopping Mart / Mart POS Mode</option>
                  <option value="small_business">Small Business Mode</option>
                  <option value="flour_mill">Factory / Flour Mill Mode</option>
                </select>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newWsPhone}
                  onChange={e => setNewWsPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Address"
                    value={newWsAddress}
                    onChange={e => setNewWsAddress(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newWsName.trim()) {
                        setNotificationMsg({ type: 'error', text: 'Please enter a business name.' });
                        return;
                      }
                      const created = storage.createBusinessWorkspace(
                        {
                          businessName: newWsName.trim(),
                          businessType: newWsType,
                          contactNumber: newWsPhone.trim(),
                          address: newWsAddress.trim(),
                        },
                        currentUser
                      );
                      setNewWsName('');
                      setNewWsPhone('');
                      setNewWsAddress('');
                      setNotificationMsg({
                        type: 'success',
                        text: `Created & switched to new isolated business workspace "${created.businessName}".`,
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shrink-0 cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPEARANCE & THEMES */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Appearance & Color Themes (تھیمز و رنگ)
                </h3>
                <p className="text-xs text-slate-500">
                  Select your preferred color scheme for mobile screens, industrial tablets, and desktop workstations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                {
                  id: 'ios-light',
                  name: 'iOS Clean Light',
                  desc: 'Soft gray background with crisp white surfaces and slate typography.',
                  primary: 'bg-blue-600',
                  surface: 'bg-slate-100 border-slate-300',
                  badge: 'Light',
                },
                {
                  id: 'ios-colorful',
                  name: 'iOS Colorful (New)',
                  desc: 'Vibrant Apple iOS-inspired colorful cards, high-contrast typography, and smooth glass surfaces across all business modes.',
                  primary: 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-rose-500',
                  surface: 'bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-indigo-200 text-slate-800',
                  badge: 'iOS Colorful',
                },
                {
                  id: 'midnight-dark',
                  name: 'Midnight Dark',
                  desc: 'Deep slate 900 OLED-friendly dark palette with high-contrast elements.',
                  primary: 'bg-indigo-500',
                  surface: 'bg-slate-900 border-slate-700 text-white',
                  badge: 'Dark',
                },
                {
                  id: 'emerald-dark',
                  name: 'Emerald Dark (مل تھیم)',
                  desc: 'Industrial flour mill green with dark emerald tones and amber badges.',
                  primary: 'bg-emerald-500',
                  surface: 'bg-emerald-950 border-emerald-800 text-white',
                  badge: 'Mill Green',
                },
                {
                  id: 'cobalt-blue',
                  name: 'Cobalt Blue',
                  desc: 'Deep corporate navy and vivid blue accents for clear visibility in daylight.',
                  primary: 'bg-blue-500',
                  surface: 'bg-slate-950 border-blue-900 text-white',
                  badge: 'Navy',
                },
                {
                  id: 'flourpro-light',
                  name: 'FlourPro Light',
                  desc: 'Warm milling aesthetic with clean parchment neutrals and amber highlights.',
                  primary: 'bg-amber-600',
                  surface: 'bg-amber-50/50 border-amber-200',
                  badge: 'Flour Mill',
                },
              ].map(th => {
                const isSelected = theme === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      onThemeChange(th.id as AppTheme);
                      storage.updateSettings({ theme: th.id as AppTheme }, currentUser);
                      setNotificationMsg({ type: 'success', text: `Theme changed to ${th.name}.` });
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{th.name}</span>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {th.badge}
                        </span>
                      )}
                    </div>

                    <div className={`h-12 rounded-xl border flex items-center justify-between px-3 ${th.surface}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full ${th.primary}`} />
                        <span className="text-[10px] font-semibold">Preview</span>
                      </div>
                      <div className="text-[10px] font-mono opacity-70">A4 Mill</div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">{th.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM LANGUAGE */}
      {activeTab === 'language' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Application Language (زبان کا انتخاب)
                </h3>
                <p className="text-xs text-slate-500">
                  Switch the entire interface and PDF report labels between English, Urdu, and Hindi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                {
                  code: 'ur' as AppLanguage,
                  name: 'اردو (Urdu)',
                  native: 'اردو زبان — دائیں سے بائیں',
                  dir: 'rtl',
                  desc: 'مکمل اردو انٹرفیس مع نستعلیق و معیاری املا برائے فلور ملز و اسٹاک مینجمنٹ۔',
                },
                {
                  code: 'en' as AppLanguage,
                  name: 'English',
                  native: 'English (UK / US)',
                  dir: 'ltr',
                  desc: 'Standard international English for operations, production tracking, and invoicing.',
                },
                {
                  code: 'hi' as AppLanguage,
                  name: 'हिन्दी (Hindi)',
                  native: 'हिन्दी भाषा',
                  dir: 'ltr',
                  desc: 'व्यापक उत्पादन, इन्वेंट्री और बिलिंग के लिए सम्पूर्ण हिन्दी इंटरफ़ेस।',
                },
              ].map(lang => {
                const isSelected = language === lang.code;
                return (
                  <div
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      storage.updateSettings({ language: lang.code }, currentUser);
                      setNotificationMsg({ type: 'success', text: `Language switched to ${lang.name}.` });
                    }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white">{lang.name}</span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lang.native}</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{lang.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFLINE DATABASE SNAPSHOT */}
      {activeTab === 'local_backup' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Offline Database Snapshot & Restore (مقامی ڈیٹا بیک اپ)
                </h3>
                <p className="text-xs text-slate-500">
                  Export complete operational records (production, inventory, sales, catalog) to an offline JSON file or restore a previous snapshot.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Export Local Snapshot</span>
                </div>
                <p className="text-xs text-slate-500">
                  Save all current products, production records, stock movements, and customer ledger to your local device.
                </p>
                <button
                  type="button"
                  onClick={handleExportBackupFile}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Restore from Backup File</span>
                </div>
                <p className="text-xs text-slate-500">
                  Upload a previously saved JSON backup file. Administrator PIN authorization is required before restoration.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all cursor-pointer active:scale-98">
                  <Upload className="w-4 h-4" />
                  <span>Select JSON File to Restore</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
              <strong>Notice:</strong> Google Drive Cloud Sync, Module PIN Locks, and Mill Business Profile have been moved to the <strong>Admin Panel</strong> for enhanced enterprise security and administrative access control.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
