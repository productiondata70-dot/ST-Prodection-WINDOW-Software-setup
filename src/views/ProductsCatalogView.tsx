import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Tag,
  Layers,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  Box,
  Wrench,
  RefreshCw,
  ArrowUpDown,
  Printer,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AppDatabase,
  Product,
  UserAccount,
} from '../types';
import { StorageService } from '../services/storage';
import {
  getBusinessModeConfig,
  normalizeBusinessMode,
  STANDARD_PRODUCT_UNITS,
} from '../services/businessMode';
import { generateReportPdf } from '../services/pdfGenerator';
import {
  generateUniqueBusinessBarcode,
  generateCode128Svg,
  downloadBarcodeLabelPng,
  downloadBarcodeLabelPdf,
  printBarcodeLabels,
} from '../services/barcodeAndReceipt';

interface ProductsCatalogViewProps {
  db: AppDatabase;
  currentUser: UserAccount;
  isDark?: boolean;
}

export const ProductsCatalogView: React.FC<ProductsCatalogViewProps> = ({
  db,
  currentUser,
  isDark = false,
}) => {
  const storage = StorageService.getInstance();
  const mode = normalizeBusinessMode(db.profile?.businessType);
  const modeConfig = getBusinessModeConfig(db.profile?.businessType);
  const currency = db.profile?.currency || 'PKR';

  const canCreate = storage.hasPermission(currentUser, 'products_catalog', 'create') || storage.hasPermission(currentUser, 'stock', 'create');
  const canEdit = storage.hasPermission(currentUser, 'products_catalog', 'edit') || storage.hasPermission(currentUser, 'stock', 'edit');
  const canDelete = storage.hasPermission(currentUser, 'products_catalog', 'delete') || storage.hasPermission(currentUser, 'stock', 'delete');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK'>('ALL');
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'product' | 'service'>('ALL');

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState(mode === 'factory' ? 'Bag' : 'Piece');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingRate, setSellingRate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [openingStockQty, setOpeningStockQty] = useState('0');
  const [selectedBagSizes, setSelectedBagSizes] = useState<number[]>(
    mode === 'factory' ? [20, 50, 80] : [1]
  );
  const [description, setDescription] = useState('');

  // Metadata Manager Modal (Categories, Brands, Units)
  const [showMetaModal, setShowMetaModal] = useState<'categories' | 'brands' | 'units' | null>(null);
  const [newMetaName, setNewMetaName] = useState('');
  const [newMetaSecondary, setNewMetaSecondary] = useState('');

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<
    'add' | 'remove' | 'set' | 'damaged' | 'expired' | 'opening' | 'correction'
  >('add');
  const [adjustBagSize, setAdjustBagSize] = useState<number>(1);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Physical shelf count verification');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Custom Unit inline state inside Add/Edit Product Modal
  const [isCustomUnitMode, setIsCustomUnitMode] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState('');

  // Barcode Label Preview / Download / Print Modal State
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(
    db.profile?.barcodeConfig?.defaultCopies || 1
  );
  const [labelSize, setLabelSize] = useState<'38x25mm' | '50x30mm' | '40x30mm' | '40x25mm' | '58x40mm'>(
    db.profile?.barcodeConfig?.labelSize || '50x30mm'
  );
  const [labelShowBiz, setLabelShowBiz] = useState<boolean>(
    db.profile?.barcodeConfig?.showBusinessName ?? true
  );
  const [labelShowPrice, setLabelShowPrice] = useState<boolean>(
    db.profile?.barcodeConfig?.showPrice ?? true
  );
  const [labelShowUnit, setLabelShowUnit] = useState<boolean>(
    db.profile?.barcodeConfig?.showUnit ?? true
  );
  const [labelShowCategory, setLabelShowCategory] = useState<boolean>(
    db.profile?.barcodeConfig?.showCategory ?? false
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const categoriesList = useMemo(() => {
    const set = new Set<string>(modeConfig.defaultCategories);
    (db.categories || []).forEach(c => set.add(c.name));
    db.products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [db.categories, db.products, modeConfig.defaultCategories]);

  const brandsList = useMemo(() => {
    const set = new Set<string>(modeConfig.defaultBrands);
    (db.brands || []).forEach(b => set.add(b.name));
    db.products.forEach(p => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set);
  }, [db.brands, db.products, modeConfig.defaultBrands]);

  const unitsList = useMemo(() => {
    const map = new Map<string, string>();
    if (mode === 'factory') {
      modeConfig.defaultUnits.forEach(u => map.set(u.name, u.shortName));
    } else {
      STANDARD_PRODUCT_UNITS.forEach(u => map.set(u.name, u.shortName));
    }
    modeConfig.defaultUnits.forEach(u => map.set(u.name, u.shortName));
    (db.units || []).forEach(u => map.set(u.name, u.shortName));
    db.products.forEach(p => {
      if (p.unit && !map.has(p.unit)) {
        map.set(p.unit, p.unit);
      }
    });
    return Array.from(map.entries()).map(([name, shortName]) => ({ name, shortName }));
  }, [db.units, db.products, mode, modeConfig.defaultUnits]);

  const getProductStockTotal = (prod: Product): number => {
    if (prod.itemType === 'service') return 0;
    return db.stockBalances
      .filter(b => b.productId === prod.id)
      .reduce((sum, b) => sum + b.availableBags, 0);
  };

  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;
      if (statusFilter === 'LOW_STOCK') {
        if (p.itemType === 'service') return false;
        const stock = getProductStockTotal(p);
        const min = p.minStockLevel ?? 10;
        if (stock > min) return false;
      }
      if (itemTypeFilter !== 'ALL' && (p.itemType || 'product') !== itemTypeFilter) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedBrand !== 'ALL' && (p.brand || '') !== selectedBrand) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = p.nameEn.toLowerCase().includes(q) || (p.nameUr || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode && !matchCat && !matchBrand) return false;
      }
      return true;
    });
  }, [db.products, db.stockBalances, searchQuery, selectedCategory, selectedBrand, statusFilter, itemTypeFilter]);

  const generateFreshUniqueBarcode = () => {
    const existingCodes = db.products.map(p => p.barcode || '').filter(Boolean);
    return generateUniqueBusinessBarcode(
      db.profile?.businessName || 'Business',
      db.activeBusinessId || db.profile?.id || 'biz',
      existingCodes,
      db.profile?.barcodeConfig?.prefix
    );
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setNameEn('');
    setNameUr('');
    setItemType('product');
    setSku(`SKU-${Date.now().toString().slice(-5)}`);
    setBarcode(generateFreshUniqueBarcode());
    setCategory(categoriesList[0] || 'General');
    setBrand(brandsList[0] || '');
    setUnit(mode === 'factory' ? 'Bag' : 'Piece');
    setIsCustomUnitMode(false);
    setCustomUnitInput('');
    setPurchasePrice('');
    setSellingRate('');
    setDiscountPercent('0');
    setTaxPercent('0');
    setMinStockLevel('10');
    setOpeningStockQty('0');
    setSelectedBagSizes(mode === 'factory' ? [20, 50, 80] : [1]);
    setDescription('');
    setShowProductModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setNameEn(prod.nameEn);
    setNameUr(prod.nameUr || '');
    setItemType(prod.itemType || 'product');
    setSku(prod.sku || '');
    setBarcode(prod.barcode || generateFreshUniqueBarcode());
    setCategory(prod.category || 'General');
    setBrand(prod.brand || '');
    setUnit(prod.unit || (mode === 'factory' ? 'Bag' : 'Piece'));
    setIsCustomUnitMode(false);
    setCustomUnitInput('');
    setPurchasePrice(prod.purchasePrice !== undefined ? String(prod.purchasePrice) : '');
    setSellingRate(prod.rate !== undefined ? String(prod.rate) : '');
    setDiscountPercent(prod.discountPercent !== undefined ? String(prod.discountPercent) : '0');
    setTaxPercent(prod.taxPercent !== undefined ? String(prod.taxPercent) : '0');
    setMinStockLevel(prod.minStockLevel !== undefined ? String(prod.minStockLevel) : '10');
    setOpeningStockQty('0');
    setSelectedBagSizes(prod.bagSizes && prod.bagSizes.length > 0 ? prod.bagSizes : [1]);
    setDescription(prod.description || '');
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedRate = sellingRate.trim() !== '' ? Number(sellingRate) : 0;
      const parsedPurchase = purchasePrice.trim() !== '' ? Number(purchasePrice) : undefined;
      const parsedMinStock = Number(minStockLevel) || 0;
      const effectiveSizes =
        mode === 'factory'
          ? selectedBagSizes.length > 0
            ? selectedBagSizes
            : [20, 50, 80]
          : [1];

      let finalUnit = unit.trim() || (mode === 'factory' ? 'Bag' : 'Piece');
      if (isCustomUnitMode && customUnitInput.trim()) {
        finalUnit = customUnitInput.trim();
        try {
          storage.addUnit(finalUnit, finalUnit, currentUser.name);
        } catch {
          // unit already exists
        }
      }

      if (editingProduct) {
        storage.updateProduct(
          editingProduct.id,
          {
            nameEn: nameEn.trim(),
            nameUr: nameUr.trim(),
            itemType,
            sku: sku.trim() || undefined,
            barcode: barcode.trim() || generateFreshUniqueBarcode(),
            category: category.trim() || 'General',
            brand: brand.trim() || undefined,
            unit: finalUnit,
            purchasePrice: parsedPurchase,
            rate: parsedRate,
            discountPercent: Number(discountPercent) || 0,
            taxPercent: Number(taxPercent) || 0,
            minStockLevel: parsedMinStock,
            bagSizes: effectiveSizes,
            description: description.trim() || undefined,
          },
          currentUser.name
        );
        notify('success', `Updated "${nameEn.trim()}" successfully.`);
      } else {
        const created = storage.addProduct(
          {
            nameEn: nameEn.trim(),
            nameUr: nameUr.trim(),
            type: itemType === 'service' ? 'Service' : mode === 'factory' ? 'Manufactured Product' : 'Retail Product',
            itemType,
            sku: sku.trim() || undefined,
            barcode: barcode.trim() || generateFreshUniqueBarcode(),
            category: category.trim() || 'General',
            brand: brand.trim() || undefined,
            unit: finalUnit,
            purchasePrice: parsedPurchase,
            rate: parsedRate,
            discountPercent: Number(discountPercent) || 0,
            taxPercent: Number(taxPercent) || 0,
            minStockLevel: parsedMinStock,
            bagSizes: effectiveSizes,
            description: description.trim() || undefined,
          },
          currentUser.name
        );

        const openQty = Number(openingStockQty) || 0;
        if (itemType !== 'service' && openQty > 0) {
          const targetSize = effectiveSizes[0] || 1;
          storage.applyStockMovement({
            date: new Date().toISOString().slice(0, 10),
            productId: created.id,
            productNameEn: created.nameEn,
            productNameUr: created.nameUr,
            bagSizeKg: targetSize,
            movementType: 'opening',
            changeBags: openQty,
            changeWeightKg: openQty * targetSize,
            rate: parsedRate,
            referenceType: 'Opening Stock on Product Creation',
            notes: `Initial opening stock (${openQty} ${created.unit || 'units'})`,
            performedBy: currentUser.name,
          });
        }
        notify('success', `Added "${created.nameEn}" with Barcode ${created.barcode} to catalog.`);
      }
      setShowProductModal(false);
    } catch (err: any) {
      notify('error', err.message || 'Failed to save product.');
    }
  };

  const handleQuickStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      const qty = Number(adjustQty);
      if (isNaN(qty)) {
        throw new Error('Please enter a valid numeric quantity.');
      }
      const sizeKg = mode === 'factory' ? adjustBagSize : 1;

      const res = storage.adjustProductStock({
        productId: adjustingProduct.id,
        bagSizeKg: sizeKg,
        adjustmentMode: adjustType,
        quantity: qty,
        reason: adjustReason.trim() || 'Manual stock adjustment',
        notes: adjustNotes.trim() || undefined,
        currentUser: currentUser.name,
      });

      notify(
        'success',
        `Stock updated for "${adjustingProduct.nameEn}": Previous ${res.previousStock} → New ${res.newStock} ${adjustingProduct.unit || 'units'} (${res.delta >= 0 ? '+' : ''}${res.delta}).`
      );
      setAdjustingProduct(null);
      setAdjustQty('');
      setAdjustNotes('');
    } catch (err: any) {
      notify('error', err.message || 'Failed to adjust stock.');
    }
  };

  const handleAddMeta = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showMetaModal === 'categories') {
        storage.addCategory(newMetaName, newMetaSecondary, currentUser.name);
        notify('success', `Category "${newMetaName}" added.`);
      } else if (showMetaModal === 'brands') {
        storage.addBrand(newMetaName, newMetaSecondary, currentUser.name);
        notify('success', `Brand "${newMetaName}" added.`);
      } else if (showMetaModal === 'units') {
        storage.addUnit(newMetaName, newMetaSecondary || newMetaName, currentUser.name);
        notify('success', `Unit "${newMetaName}" added.`);
      }
      setNewMetaName('');
      setNewMetaSecondary('');
    } catch (err: any) {
      notify('error', err.message || 'Failed to add item.');
    }
  };

  const totalCatalogItems = db.products.length;
  const activeItemsCount = db.products.filter(p => p.isActive).length;
  const lowStockCount = db.products.filter(p => {
    if (!p.isActive || p.itemType === 'service') return false;
    return getProductStockTotal(p) <= (p.minStockLevel ?? 10);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  {modeConfig.moduleLabels.products_catalog || 'Products Catalog'}
                </h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {mode === 'shopping_mart'
                    ? 'Manage retail products, barcodes, SKUs, brands, categories, pricing & stock alerts'
                    : mode === 'small_business'
                    ? 'Manage products & services catalog, purchase costs, selling prices & inventory thresholds'
                    : 'Manage manufactured & raw mill products, bag sizes, and default rates'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMetaModal('categories')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Categories ({categoriesList.length})
            </button>
            {modeConfig.supportsBrands && (
              <button
                type="button"
                onClick={() => setShowMetaModal('brands')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                Brands ({brandsList.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMetaModal('units')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-emerald-500" />
              Units ({unitsList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                const { doc, filename } = generateReportPdf(db, { reportType: 'barcode_catalog' });
                doc.save(filename);
                notify('success', `Product Catalog PDF exported (${filename}).`);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'border-purple-700 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300' : 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Catalog PDF
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Add {mode === 'small_business' ? 'Product / Service' : 'New Product'}
              </button>
            )}
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200/80'}`}>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Total Catalog Items</div>
            <div className="text-lg font-bold mt-0.5">{totalCatalogItems}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <div className="text-[11px] font-medium text-emerald-600 uppercase">Active Items</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">{activeItemsCount}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-amber-50/60 border-amber-200'}`}>
            <div className="text-[11px] font-medium text-amber-600 uppercase">Low / Out of Stock</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">{lowStockCount}</div>
          </div>
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/60 border-blue-200'}`}>
            <div className="text-[11px] font-medium text-blue-600 uppercase">Categories & Brands</div>
            <div className="text-lg font-bold text-blue-600 mt-0.5">
              {categoriesList.length} / {brandsList.length}
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
          <button onClick={() => setFeedback(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className={`rounded-2xl p-4 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                mode !== 'factory'
                  ? 'Scan Barcode or search by Product Name, SKU, Brand...'
                  : 'Search by Product Name (English/Urdu) or Category...'
              }
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 focus:bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {modeConfig.supportsBrands && (
            <div className="md:col-span-2">
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">All Brands</option>
                {brandsList.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={modeConfig.supportsBrands ? 'md:col-span-2' : 'md:col-span-4'}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="LOW_STOCK">Low / Out of Stock</option>
              <option value="INACTIVE">Archived / Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-semibold uppercase ${isDark ? 'bg-slate-800/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <th className="py-3 px-4">Item Details</th>
                {mode !== 'factory' && <th className="py-3 px-3">SKU / Barcode</th>}
                <th className="py-3 px-3">Category {modeConfig.supportsBrands ? '& Brand' : ''}</th>
                <th className="py-3 px-3">Unit / Packaging</th>
                <th className="py-3 px-3 text-right">Purchase Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching products found. Click "Add New Product" to populate your catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const stockQty = getProductStockTotal(prod);
                  const minStock = prod.minStockLevel ?? 10;
                  const isService = prod.itemType === 'service';
                  const isLowStock = !isService && stockQty <= minStock;
                  const profitPerUnit =
                    prod.rate !== undefined && prod.purchasePrice !== undefined
                      ? prod.rate - prod.purchasePrice
                      : undefined;

                  return (
                    <tr
                      key={prod.id}
                      className={`transition ${
                        isDark ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isService
                                ? 'bg-purple-500/10 text-purple-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {isService ? <Wrench className="w-4 h-4" /> : prod.nameEn.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              {prod.nameEn}
                              {isService && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 font-semibold">
                                  Service
                                </span>
                              )}
                            </div>
                            {prod.nameUr && (
                              <div className="text-[11px] text-slate-400 font-urdu">{prod.nameUr}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {mode !== 'factory' && (
                        <td className="py-3 px-3">
                          <div className="font-mono text-[11px] font-medium">{prod.sku || '—'}</div>
                          {prod.barcode && (
                            <button
                              type="button"
                              onClick={() => setBarcodeLabelProduct(prod)}
                              title="Click to View, Download, or Print Barcode Label"
                              className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono mt-0.5 cursor-pointer"
                            >
                              <Barcode className="w-3 h-3" />
                              {prod.barcode}
                            </button>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                          {prod.category || 'General'}
                        </span>
                        {prod.brand && (
                          <div className="text-[10px] text-slate-400 mt-1">Brand: {prod.brand}</div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {mode === 'factory' ? (
                          <div className="flex flex-wrap gap-1">
                            {(prod.bagSizes || []).map(sz => (
                              <span
                                key={sz}
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold"
                              >
                                {sz} KG
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-medium">{prod.unit || 'Piece'}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {prod.purchasePrice !== undefined
                          ? `${currency} ${prod.purchasePrice.toLocaleString()}`
                          : '—'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-blue-600">
                          {prod.rate !== undefined ? `${currency} ${prod.rate.toLocaleString()}` : 'Not Set'}
                        </div>
                        {profitPerUnit !== undefined && profitPerUnit > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            Margin: +{currency} {profitPerUnit.toLocaleString()}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isService ? (
                          <span className="text-[11px] text-slate-400">N/A (Service)</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                stockQty <= 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {stockQty.toLocaleString()} {mode === 'factory' ? 'bags' : prod.unit || 'units'}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Min Alert: {minStock}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => storage.toggleProductStatus(prod.id, !prod.isActive, currentUser.name)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
                            prod.isActive
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}
                        >
                          {prod.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBarcodeLabelProduct(prod)}
                            title="Barcode Label Preview, Download & Print"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          {!isService && canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProduct(prod);
                                setAdjustType('add');
                                setAdjustBagSize(prod.bagSizes?.[0] || 1);
                                setAdjustQty('');
                                setAdjustReason('Physical shelf count verification');
                                setAdjustNotes('');
                              }}
                              title="Adjust Stock (+ Add, - Remove, Set Exact, Damaged, Expired)"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const res = storage.deleteProduct(prod.id, currentUser.name);
                                  notify('success', res.message);
                                } catch (err: any) {
                                  notify('error', err.message);
                                }
                              }}
                              title="Delete or Archive Product"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? `Edit ${editingProduct.nameEn}` : 'Add New Catalog Item'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {modeConfig.supportsServices && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setItemType('product')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      itemType === 'product'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    Physical Product (Inventory Tracked)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemType('service');
                      setUnit('Service');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      itemType === 'service'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    Service / Job (Non-Stock Item)
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Product Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="e.g. Dalda Cooking Oil 5L / Super Fine Flour"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Name in Urdu (Optional)
                  </label>
                  <input
                    type="text"
                    value={nameUr}
                    onChange={e => setNameUr(e.target.value)}
                    placeholder="اردو نام"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Product Code / SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="SKU-1001"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Barcode (Auto-Generated / Scannable Code-128)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Auto-generated if left blank or scan with barcode reader"
                      className={`flex-1 px-3 py-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setBarcode(generateFreshUniqueBarcode())}
                      className="px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Auto-Generate
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Visual Barcode Preview inside Add/Edit Modal */}
              {barcode.trim() && (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Live Code-128 Barcode Preview</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Unique to {db.profile?.businessName || 'this business workspace'} • Ready for label printing & USB/wireless scanner
                    </p>
                  </div>
                  <div
                    className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                    dangerouslySetInnerHTML={{
                      __html: generateCode128Svg(barcode.trim(), {
                        height: 36,
                        moduleWidth: 1.5,
                        showText: true,
                        fontSize: 10,
                      }),
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {categoriesList.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {modeConfig.supportsBrands && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Brand / Company
                    </label>
                    <select
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="">No Brand</option>
                      {brandsList.map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase text-slate-400">
                      Unit
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomUnitMode(!isCustomUnitMode)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      {isCustomUnitMode ? 'Select Standard Unit' : '+ Custom Unit'}
                    </button>
                  </div>
                  {isCustomUnitMode ? (
                    <input
                      type="text"
                      value={customUnitInput}
                      onChange={e => setCustomUnitInput(e.target.value)}
                      placeholder="Enter custom unit (e.g. Tray, Crate)"
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  ) : (
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {unitsList.map(u => (
                        <option key={u.name} value={u.name}>
                          {u.name} ({u.shortName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {mode === 'factory' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                    Supported Bag Sizes (KG)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {db.bagSizes.map(bs => {
                      const active = selectedBagSizes.includes(bs.sizeKg);
                      return (
                        <button
                          key={bs.id}
                          type="button"
                          onClick={() =>
                            setSelectedBagSizes(prev =>
                              prev.includes(bs.sizeKg)
                                ? prev.filter(s => s !== bs.sizeKg)
                                : [...prev, bs.sizeKg].sort((a, b) => a - b)
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          {bs.sizeKg} KG
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Purchase Cost ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={sellingRate}
                    onChange={e => setSellingRate(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-bold text-blue-600 ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={itemType === 'service'}
                    value={minStockLevel}
                    onChange={e => setMinStockLevel(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                {!editingProduct && itemType !== 'service' && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-emerald-600 mb-1">
                      Opening Stock Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={openingStockQty}
                      onChange={e => setOpeningStockQty(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Stock Adjustment — {adjustingProduct.nameEn}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Current Stock:{' '}
                  <strong className="text-emerald-600 font-mono">
                    {getProductStockTotal(adjustingProduct)} {adjustingProduct.unit || 'units'}
                  </strong>
                </p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickStockAdjust} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Adjustment Action *
                </label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="add">1. Add Stock (+ Stock In)</option>
                  <option value="remove">2. Remove Stock (- Stock Out)</option>
                  <option value="set">3. Set Exact Stock Quantity (Physical Audit Count)</option>
                  <option value="damaged">4. Damaged Stock (- Deduct)</option>
                  <option value="expired">5. Expired Stock (- Deduct)</option>
                  <option value="opening">6. Opening Stock (+ Initial Count)</option>
                  <option value="correction">7. Manual Count Correction (+/-)</option>
                </select>
              </div>

              {mode === 'factory' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Bag Size (KG)
                  </label>
                  <select
                    value={adjustBagSize}
                    onChange={e => setAdjustBagSize(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {(adjustingProduct.bagSizes || [20, 50, 80]).map(sz => (
                      <option key={sz} value={sz}>
                        {sz} KG
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  {adjustType === 'set'
                    ? `New Exact Stock Quantity (${adjustingProduct.unit || 'Units'}) *`
                    : `Quantity (${mode === 'factory' ? 'Bags' : adjustingProduct.unit || 'Units'}) *`}
                </label>
                <input
                  type="number"
                  min={adjustType === 'set' ? '0' : adjustType === 'correction' ? undefined : '1'}
                  step="any"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  placeholder={
                    adjustType === 'set'
                      ? 'Enter exact physical count on shelf'
                      : 'Enter quantity'
                  }
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Adjustment Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical shelf count verification / Damaged item"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="Optional batch or shelf remarks"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Preview, Download & Print Modal */}
      {barcodeLabelProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm">
                    Product Barcode Label — {barcodeLabelProduct.nameEn}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Code: {barcodeLabelProduct.barcode || barcodeLabelProduct.sku}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeLabelProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Live Printable Label Card Preview */}
              <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <div className="bg-white text-black rounded-xl border-2 border-dashed border-slate-300 px-6 py-4 text-center shadow-sm min-w-[240px]">
                  {labelShowBiz && db.profile?.businessName && (
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 truncate">
                      {db.profile.businessName}
                    </div>
                  )}
                  <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
                    {barcodeLabelProduct.nameEn}
                  </div>
                  {labelShowCategory && barcodeLabelProduct.category && (
                    <div className="text-[10px] text-slate-500">{barcodeLabelProduct.category}</div>
                  )}
                  <div
                    className="my-2 flex justify-center"
                    dangerouslySetInnerHTML={{
                      __html: generateCode128Svg(
                        barcodeLabelProduct.barcode || barcodeLabelProduct.sku || '100001',
                        {
                          height: 44,
                          moduleWidth: 1.7,
                          showText: true,
                          fontSize: 11,
                        }
                      ),
                    }}
                  />
                  {(labelShowPrice || labelShowUnit) && (
                    <div className="text-xs font-extrabold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                      {labelShowPrice && barcodeLabelProduct.rate !== undefined
                        ? `${currency} ${barcodeLabelProduct.rate.toLocaleString()}`
                        : ''}
                      {labelShowPrice && labelShowUnit && barcodeLabelProduct.unit ? ' / ' : ''}
                      {labelShowUnit && barcodeLabelProduct.unit ? barcodeLabelProduct.unit : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Label Options */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Label Size
                  </label>
                  <select
                    value={labelSize}
                    onChange={e => setLabelSize(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="50x30mm">50mm × 30mm (Standard Thermal Label)</option>
                    <option value="40x25mm">40mm × 25mm (Compact Retail Label)</option>
                    <option value="58x40mm">58mm × 40mm (Large Shelf / Roll Label)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Number of Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={labelCopies}
                    onChange={e => setLabelCopies(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labelShowBiz}
                    onChange={e => setLabelShowBiz(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Business Name</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labelShowPrice}
                    onChange={e => setLabelShowPrice(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Selling Price</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labelShowUnit}
                    onChange={e => setLabelShowUnit(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Unit</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labelShowCategory}
                    onChange={e => setLabelShowCategory(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Category</span>
                </label>
              </div>

              {/* Action Buttons: Download PNG, Download PDF, Print Label */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadBarcodeLabelPng(barcodeLabelProduct, db.profile, {
                        showBusinessName: labelShowBiz,
                        showPrice: labelShowPrice,
                        showUnit: labelShowUnit,
                        showCategory: labelShowCategory,
                        labelSize,
                      });
                      notify('success', `Downloaded Barcode Label PNG for "${barcodeLabelProduct.nameEn}".`);
                    } catch (err: any) {
                      notify('error', err.message || 'Failed to download PNG label.');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadBarcodeLabelPdf(barcodeLabelProduct, db.profile, {
                        copies: labelCopies,
                        showBusinessName: labelShowBiz,
                        showPrice: labelShowPrice,
                        showUnit: labelShowUnit,
                        showCategory: labelShowCategory,
                        labelSize,
                      });
                      notify('success', `Downloaded Barcode Label PDF (${labelCopies} copies).`);
                    } catch (err: any) {
                      notify('error', err.message || 'Failed to download PDF labels.');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download PDF ({labelCopies})</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await printBarcodeLabels(barcodeLabelProduct, db.profile, {
                      copies: labelCopies,
                      showBusinessName: labelShowBiz,
                      showPrice: labelShowPrice,
                      showUnit: labelShowUnit,
                      showCategory: labelShowCategory,
                      labelSize,
                      printerName: db.profile?.printerConfig?.printerName,
                    });
                    if (res.success) {
                      notify('success', `Sent ${labelCopies} barcode label(s) to printer.`);
                    } else {
                      notify('error', res.error || 'Failed to print barcode labels.');
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Label ({labelCopies})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories / Brands / Units Manager Modal */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm capitalize">Manage {showMetaModal}</h3>
              <button onClick={() => setShowMetaModal(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <form onSubmit={handleAddMeta} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newMetaName}
                  onChange={e => setNewMetaName(e.target.value)}
                  placeholder={`New ${showMetaModal === 'categories' ? 'Category' : showMetaModal === 'brands' ? 'Brand' : 'Unit'} Name`}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                {showMetaModal === 'units' && (
                  <input
                    type="text"
                    value={newMetaSecondary}
                    onChange={e => setNewMetaSecondary(e.target.value)}
                    placeholder="Short (e.g. Pcs)"
                    className={`w-24 px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                )}
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                >
                  Add
                </button>
              </form>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {showMetaModal === 'categories' &&
                  categoriesList.map(c => {
                    const customObj = (db.categories || []).find(item => item.name === c);
                    return (
                      <div key={c} className="py-2 flex items-center justify-between">
                        <span className="font-medium">{c}</span>
                        {customObj && (
                          <button
                            type="button"
                            onClick={() => storage.deleteCategory(customObj.id, currentUser.name)}
                            className="text-rose-500 hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                {showMetaModal === 'brands' &&
                  brandsList.map(b => {
                    const customObj = (db.brands || []).find(item => item.name === b);
                    return (
                      <div key={b} className="py-2 flex items-center justify-between">
                        <span className="font-medium">{b}</span>
                        {customObj && (
                          <button
                            type="button"
                            onClick={() => storage.deleteBrand(customObj.id, currentUser.name)}
                            className="text-rose-500 hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                {showMetaModal === 'units' &&
                  unitsList.map(u => {
                    const customObj = (db.units || []).find(item => item.name === u.name);
                    return (
                      <div key={u.name} className="py-2 flex items-center justify-between">
                        <span className="font-medium">
                          {u.name} <span className="text-slate-400">({u.shortName})</span>
                        </span>
                        {customObj && (
                          <button
                            type="button"
                            onClick={() => storage.deleteUnit(customObj.id, currentUser.name)}
                            className="text-rose-500 hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
