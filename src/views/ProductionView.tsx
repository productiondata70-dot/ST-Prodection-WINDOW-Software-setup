import React, { useState, useEffect } from 'react';
import {
  Factory,
  Clock,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  Package,
  History,
  Boxes,
  Eye,
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import {
  AppDatabase,
  ProductionLineItem,
  ProductionSession,
  AppLanguage,
} from '../types';
import { StorageService, groupProductionLinesByProduct } from '../services/storage';
import { translations } from '../services/translations';

interface ProductionViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  language: AppLanguage;
}

interface SelectedBagSizeInput {
  bagSizeKg: number;
  quantityInput: string;
}

interface ProductEntryState {
  productId: string;
  productNameEn: string;
  productNameUr: string;
  selectedSizes: SelectedBagSizeInput[];
  sizeToAddDropdown: string;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  db,
  storage,
  currentUser,
  language,
}) => {
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [shiftName, setShiftName] = useState('Morning');
  const [shiftNumber, setShiftNumber] = useState('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [notes, setNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing existing production session state (Requirement 14)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingRecordCode, setEditingRecordCode] = useState<string>('');

  // Optional Product focus filter so user can either view all products or focus on a specific product
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');

  // History Tab Filters and Selected Session Modal State
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyShiftFilter, setHistoryShiftFilter] = useState('all');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ProductionSession | null>(null);

  // Selection-based deletion state for Production History
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteProductionReason, setDeleteProductionReason] = useState(
    'Manual deletion from production history'
  );

  // Product-grouped state: each product can have multiple bag sizes selected simultaneously,
  // and each selected bag size has its own independent bag quantity input.
  const [productEntries, setProductEntries] = useState<ProductEntryState[]>([]);

  // Helper to get all available bag sizes for a product
  const getAvailableSizesForProduct = (productId: string): number[] => {
    const prod = db.products.find(p => p.id === productId);
    const sizes = new Set<number>([
      ...(prod?.bagSizes || []),
      ...db.bagSizes.map(b => b.sizeKg),
      20,
      25,
      50,
      80,
    ]);
    return Array.from(sizes)
      .filter(s => typeof s === 'number' && !isNaN(s) && s > 0)
      .sort((a, b) => a - b);
  };

  // Sync productEntries when active products in catalog change
  useEffect(() => {
    const activeProds = db.products.filter(p => p.isActive);
    setProductEntries(prev => {
      return activeProds.map(p => {
        const existing = prev.find(item => item.productId === p.id);
        const avail = getAvailableSizesForProduct(p.id);
        const defaultDropdown = String(avail[0] || 20);
        if (existing) {
          return {
            ...existing,
            productNameEn: p.nameEn,
            productNameUr: p.nameUr,
            sizeToAddDropdown: existing.sizeToAddDropdown || defaultDropdown,
          };
        }
        return {
          productId: p.id,
          productNameEn: p.nameEn,
          productNameUr: p.nameUr,
          selectedSizes: [],
          sizeToAddDropdown: defaultDropdown,
        };
      });
    });
  }, [db.products, db.bagSizes]);

  // Duration calculation (supporting midnight crossing)
  const calculateDuration = () => {
    if (!startTime || !endTime) return { minutes: 0, formatted: '0h 0m', crossesMidnight: false };

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    let crossesMidnight = false;

    if (endTotal < startTotal) {
      endTotal += 24 * 60;
      crossesMidnight = true;
    }

    const diffMinutes = endTotal - startTotal;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return {
      minutes: diffMinutes,
      formatted: `${hours}h ${minutes}m`,
      crossesMidnight,
    };
  };

  const durationInfo = calculateDuration();

  // Compute flat ProductionLineItems from all selected product sizes for live weight & bag totals
  const rawCalculatedLines: ProductionLineItem[] = [];
  productEntries.forEach(prodEntry => {
    prodEntry.selectedSizes.forEach((sizeItem, sIdx) => {
      const parsedQty = Number(sizeItem.quantityInput);
      const validBagCount =
        sizeItem.quantityInput.trim() !== '' && !isNaN(parsedQty) && parsedQty > 0
          ? parsedQty
          : 0;
      const totalWeightKg = validBagCount * sizeItem.bagSizeKg;

      rawCalculatedLines.push({
        id: `pline-${prodEntry.productId}-${sizeItem.bagSizeKg}-${sIdx}`,
        productId: prodEntry.productId,
        productNameEn: prodEntry.productNameEn,
        productNameUr: prodEntry.productNameUr,
        bagSizeKg: sizeItem.bagSizeKg,
        bagCount: validBagCount,
        directWeightKg: 0,
        isDirectWeightOnly: false,
        totalWeightKg,
        percentage: 0,
      });
    });
  });

  const totalProductionWeight = rawCalculatedLines.reduce((acc, l) => acc + l.totalWeightKg, 0);
  const totalProductionBags = rawCalculatedLines.reduce((acc, l) => acc + l.bagCount, 0);

  rawCalculatedLines.forEach(line => {
    line.percentage =
      totalProductionWeight > 0 ? (line.totalWeightKg / totalProductionWeight) * 100 : 0;
  });

  const totalSelectedSizeLinesCount = productEntries.reduce(
    (acc, p) => acc + p.selectedSizes.length,
    0
  );

  // Toggle a bag size for a specific product:
  // - If unselected: adds that bag size to the product's selectedSizes (preserving all other selected sizes).
  // - If already selected: deselects ONLY that specific bag size (preserving all other selected sizes).
  const handleToggleProductBagSize = (productId: string, sizeKg: number) => {
    setErrorMsg('');
    setProductEntries(prev =>
      prev.map(p => {
        if (p.productId !== productId) return p;
        const exists = p.selectedSizes.some(s => s.bagSizeKg === sizeKg);
        if (exists) {
          return {
            ...p,
            selectedSizes: p.selectedSizes.filter(s => s.bagSizeKg !== sizeKg),
          };
        } else {
          const nextSizes = [
            ...p.selectedSizes,
            { bagSizeKg: sizeKg, quantityInput: '' },
          ].sort((a, b) => a.bagSizeKg - b.bagSizeKg);
          return {
            ...p,
            selectedSizes: nextSizes,
          };
        }
      })
    );
  };

  // Explicit "Add Size" handler (Requirement 9 & Test 5):
  // If the size is already selected, do NOT create a duplicate line; keep it selected and focus its quantity input.
  const handleAddSizeFromDropdown = (productId: string, sizeKg: number) => {
    if (!sizeKg || isNaN(sizeKg) || sizeKg <= 0) return;
    setErrorMsg('');

    const prodEntry = productEntries.find(p => p.productId === productId);
    if (!prodEntry) return;

    const alreadySelected = prodEntry.selectedSizes.some(s => s.bagSizeKg === sizeKg);
    if (alreadySelected) {
      // Keep that size selected and focus its existing quantity input without creating a duplicate line
      const inputEl = document.getElementById(`qty-input-${productId}-${sizeKg}`);
      if (inputEl) {
        inputEl.focus();
      }
      setSaveSuccessMsg(
        `${prodEntry.productNameEn} (${sizeKg} KG) is already selected. You can edit its quantity directly.`
      );
      return;
    }

    setProductEntries(prev =>
      prev.map(p => {
        if (p.productId !== productId) return p;
        const nextSizes = [
          ...p.selectedSizes,
          { bagSizeKg: sizeKg, quantityInput: '' },
        ].sort((a, b) => a.bagSizeKg - b.bagSizeKg);
        return {
          ...p,
          selectedSizes: nextSizes,
        };
      })
    );

    setTimeout(() => {
      const inputEl = document.getElementById(`qty-input-${productId}-${sizeKg}`);
      if (inputEl) inputEl.focus();
    }, 30);
  };

  // Select All available bag sizes for a product
  const handleSelectAllSizesForProduct = (productId: string) => {
    setErrorMsg('');
    const avail = getAvailableSizesForProduct(productId);
    setProductEntries(prev =>
      prev.map(p => {
        if (p.productId !== productId) return p;
        const existingMap = new Map<number, string>(
          p.selectedSizes.map(s => [s.bagSizeKg, s.quantityInput] as [number, string])
        );
        const nextSizes: SelectedBagSizeInput[] = avail.map(sizeKg => ({
          bagSizeKg: sizeKg,
          quantityInput: existingMap.get(sizeKg) ?? '',
        }));
        return {
          ...p,
          selectedSizes: nextSizes,
        };
      })
    );
  };

  // Clear all selected bag sizes for a product
  const handleClearSizesForProduct = (productId: string) => {
    setErrorMsg('');
    setProductEntries(prev =>
      prev.map(p => (p.productId === productId ? { ...p, selectedSizes: [] } : p))
    );
  };

  // Update quantity input for a specific product + bagSizeKg
  const handleQuantityInputChange = (productId: string, sizeKg: number, value: string) => {
    setErrorMsg('');
    setProductEntries(prev =>
      prev.map(p => {
        if (p.productId !== productId) return p;
        return {
          ...p,
          selectedSizes: p.selectedSizes.map(s =>
            s.bagSizeKg === sizeKg ? { ...s, quantityInput: value } : s
          ),
        };
      })
    );
  };

  // Stepper (+/-) for a specific product + bagSizeKg
  const handleQuantityStepChange = (productId: string, sizeKg: number, delta: number) => {
    setErrorMsg('');
    setProductEntries(prev =>
      prev.map(p => {
        if (p.productId !== productId) return p;
        return {
          ...p,
          selectedSizes: p.selectedSizes.map(s => {
            if (s.bagSizeKg !== sizeKg) return s;
            const currentVal = parseInt(s.quantityInput, 10);
            const base = isNaN(currentVal) ? 0 : currentVal;
            const nextVal = Math.max(0, base + delta);
            return { ...s, quantityInput: String(nextVal) };
          }),
        };
      })
    );
  };

  // Load an existing ProductionSession into the editor (Requirement 14)
  const handleStartEditSession = (session: ProductionSession) => {
    setErrorMsg('');
    setSaveSuccessMsg('');
    setEditingSessionId(session.id);
    setEditingRecordCode(session.recordCode);
    setDate(session.date);
    setShiftName(session.shiftName);
    setShiftNumber(session.shiftNumber || '1');
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setNotes(session.notes || '');
    setSelectedProductFilter('all');

    const activeProds = db.products.filter(p => p.isActive);
    setProductEntries(
      activeProds.map(p => {
        const prodLines = session.lines.filter(l => l.productId === p.id);
        const avail = getAvailableSizesForProduct(p.id);
        return {
          productId: p.id,
          productNameEn: p.nameEn,
          productNameUr: p.nameUr,
          selectedSizes: prodLines
            .map(l => ({
              bagSizeKg: l.bagSizeKg,
              quantityInput: String(l.bagCount),
            }))
            .sort((a, b) => a.bagSizeKg - b.bagSizeKg),
          sizeToAddDropdown: String(avail[0] || 20),
        };
      })
    );

    setActiveTab('entry');
  };

  const handleCancelEditSession = () => {
    setEditingSessionId(null);
    setEditingRecordCode('');
    setErrorMsg('');
    setSaveSuccessMsg('');
    setProductEntries(prev => prev.map(p => ({ ...p, selectedSizes: [] })));
    setNotes('');
  };

  // Validate and Save / Update Production Entry (Requirements 9, 10, 12, 13, 14)
  const handleSaveProduction = () => {
    setErrorMsg('');
    setSaveSuccessMsg('');

    // 1. Ensure at least one bag size is selected
    const allSelectedItems: Array<{
      productId: string;
      productNameEn: string;
      productNameUr: string;
      bagSizeKg: number;
      quantityInput: string;
    }> = [];

    productEntries.forEach(p => {
      p.selectedSizes.forEach(s => {
        allSelectedItems.push({
          productId: p.productId,
          productNameEn: p.productNameEn,
          productNameUr: p.productNameUr,
          bagSizeKg: s.bagSizeKg,
          quantityInput: s.quantityInput,
        });
      });
    });

    if (allSelectedItems.length === 0) {
      setErrorMsg(
        'Please select at least one bag size for a product and enter its bag quantity before saving.'
      );
      return;
    }

    // 2. Validate every selected bag size (Requirement 9: no empty, zero, negative, non-numeric, or duplicate)
    const seenKeys = new Set<string>();
    const validatedLines: ProductionLineItem[] = [];

    for (let i = 0; i < allSelectedItems.length; i++) {
      const item = allSelectedItems[i];
      const rawQty = item.quantityInput.trim();

      if (rawQty === '') {
        setErrorMsg(
          `Validation Error: Quantity for ${item.productNameEn} (${item.bagSizeKg} KG) cannot be empty. Please enter a valid bag quantity or deselect ${item.bagSizeKg} KG.`
        );
        return;
      }

      const numQty = Number(rawQty);
      if (isNaN(numQty) || !Number.isFinite(numQty) || !/^-?\d+(\.\d+)?$/.test(rawQty)) {
        setErrorMsg(
          `Validation Error: Quantity for ${item.productNameEn} (${item.bagSizeKg} KG) must be a valid numeric value.`
        );
        return;
      }

      if (numQty <= 0) {
        setErrorMsg(
          `Validation Error: Quantity for ${item.productNameEn} (${item.bagSizeKg} KG) must be greater than zero. Zero or negative quantities are not allowed.`
        );
        return;
      }

      const uniqueKey = `${item.productId}__${item.bagSizeKg}`;
      if (seenKeys.has(uniqueKey)) {
        setErrorMsg(
          `Validation Error: Duplicate entry found for ${item.productNameEn} (${item.bagSizeKg} KG) in the same Production Entry.`
        );
        return;
      }
      seenKeys.add(uniqueKey);

      const bagCount = Math.round(numQty);
      const totalWeightKg = bagCount * item.bagSizeKg;

      validatedLines.push({
        id: `pline-${i}`,
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameUr: item.productNameUr,
        bagSizeKg: item.bagSizeKg,
        bagCount,
        directWeightKg: 0,
        isDirectWeightOnly: false,
        totalWeightKg,
        percentage: 0,
      });
    }

    const finalTotalBags = validatedLines.reduce((acc, l) => acc + l.bagCount, 0);
    const finalTotalWeightKg = validatedLines.reduce((acc, l) => acc + l.totalWeightKg, 0);

    validatedLines.forEach(line => {
      line.percentage =
        finalTotalWeightKg > 0 ? (line.totalWeightKg / finalTotalWeightKg) * 100 : 0;
    });

    try {
      if (editingSessionId) {
        const updated = storage.updateProductionSession(
          editingSessionId,
          {
            date,
            shiftName,
            shiftNumber,
            startTime,
            endTime,
            durationMinutes: durationInfo.minutes,
            durationFormatted: durationInfo.formatted,
            notes: notes.trim(),
            lines: validatedLines,
            productEntries: groupProductionLinesByProduct(validatedLines),
            totalWeightKg: finalTotalWeightKg,
            totalBags: finalTotalBags,
          },
          currentUser
        );

        setSaveSuccessMsg(
          `Production Record ${updated.recordCode} updated successfully! (${updated.totalBags} bags, ${updated.totalWeightKg.toLocaleString()} kg). ${
            updated.isStockPosted ? 'Stock & Inventory balances reconciled automatically.' : ''
          }`
        );
        setEditingSessionId(null);
        setEditingRecordCode('');
      } else {
        const saved = storage.addProductionSession(
          {
            date,
            shiftName,
            shiftNumber,
            startTime,
            endTime,
            durationMinutes: durationInfo.minutes,
            durationFormatted: durationInfo.formatted,
            notes: notes.trim(),
            lines: validatedLines,
            productEntries: groupProductionLinesByProduct(validatedLines),
            totalWeightKg: finalTotalWeightKg,
            totalBags: finalTotalBags,
            createdBy: currentUser,
          },
          currentUser,
          db.settings.productionAutoPostToStock
        );

        setSaveSuccessMsg(
          `Production Session ${saved.recordCode} saved successfully (${saved.totalBags} bags, ${saved.totalWeightKg.toLocaleString()} kg)! ${
            saved.isStockPosted
              ? 'All product bag-size quantities have been posted to Stock & Inventory.'
              : 'You can post this record to stock in Production History.'
          }`
        );
      }

      // Reset selections after successful save
      setProductEntries(prev => prev.map(p => ({ ...p, selectedSizes: [] })));
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving production session.');
    }
  };

  // Post to Stock / Inventory handler
  const handlePostToStockAction = (session: ProductionSession) => {
    setErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const res = storage.postProductionToStock(session.id, currentUser);
      setSaveSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post production to stock.');
    }
  };

  // Selection & deletion handlers for Production History
  const handleToggleSelectAllSessions = () => {
    if (selectedSessionIds.length === filteredSessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(filteredSessions.map(s => s.id));
    }
  };

  const handleToggleSessionSelect = (id: string) => {
    if (selectedSessionIds.includes(id)) {
      setSelectedSessionIds(selectedSessionIds.filter(i => i !== id));
    } else {
      setSelectedSessionIds([...selectedSessionIds, id]);
    }
  };

  const handleConfirmDeleteSelectedSessions = () => {
    if (selectedSessionIds.length === 0) return;
    try {
      const removedCount = storage.archiveProductionSessions(
        selectedSessionIds,
        currentUser,
        deleteProductionReason || 'Moved to Recycle Bin from Production History'
      );
      setSelectedSessionIds([]);
      setIsDeleteConfirmOpen(false);
      setSaveSuccessMsg(
        `Successfully moved ${removedCount} production record(s) to the Recycle Bin.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error deleting selected production session(s).');
    }
  };

  const handleDeleteSingleSession = (session: ProductionSession) => {
    setSelectedSessionIds([session.id]);
    setIsDeleteConfirmOpen(true);
  };

  // Filtered Production History Records
  const filteredSessions = db.productionSessions.filter(ps => {
    const matchesSearch =
      ps.recordCode.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.shiftName.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.lines.some(l => l.productNameEn.toLowerCase().includes(historySearch.toLowerCase()));

    const matchesDate = !historyDateFilter || ps.date === historyDateFilter;
    const matchesShift = historyShiftFilter === 'all' || ps.shiftName === historyShiftFilter;

    return matchesSearch && matchesDate && matchesShift;
  });

  // Daily totals for filtered history
  const historyTotalBags = filteredSessions.reduce((acc, s) => acc + s.totalBags, 0);
  const historyTotalWeight = filteredSessions.reduce((acc, s) => acc + s.totalWeightKg, 0);

  // Visible product entries based on optional product filter
  const visibleProductEntries =
    selectedProductFilter === 'all'
      ? productEntries
      : productEntries.filter(p => p.productId === selectedProductFilter);

  // Products that currently have at least one selected bag size (for the summary section)
  const productsWithSelections = productEntries.filter(p => p.selectedSizes.length > 0);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner & Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.production} (روزانہ پروڈکشن و تاریخچہ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Multi-bag size production logging per product, automatic weight & bag calculations, and stock ledger integration.
          </p>
        </div>

        {/* Tab Switcher: Entry Form vs Production History */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingSessionId ? `Editing ${editingRecordCode}` : 'New Shift Entry'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Production History ({db.productionSessions.length})</span>
            </button>
          </div>

          {activeTab === 'entry' && (
            <button
              type="button"
              onClick={handleSaveProduction}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-98 self-start sm:self-auto cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingSessionId ? 'Update Production Entry' : t.saveProduction}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg('')}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: NEW / EDIT PRODUCTION SHIFT ENTRY */}
      {activeTab === 'entry' && (
        <div className="space-y-6">
          {/* Editing Mode Banner */}
          {editingSessionId && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    Editing Production Record: {editingRecordCode}
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Add or remove bag sizes, or update bag quantities for any product. Saving will update this record and reconcile stock without creating duplicates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEditSession}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            </div>
          )}

          {/* Production Header: Date, Shift, Times, Duration */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Shift Schedule & Operational Timing</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.date} *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.shift} Name *
                </label>
                <select
                  value={shiftName}
                  onChange={e => setShiftName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="Morning">Morning Shift (صبح)</option>
                  <option value="Evening">Evening Shift (شام)</option>
                  <option value="Night">Night Shift (رات)</option>
                  <option value="General">General 24hr Run</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.startTime} *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.endTime} *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Calculated {t.duration}
                </label>
                <div className="px-3 py-2 text-xs font-mono font-bold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                  <span>{durationInfo.formatted}</span>
                  {durationInfo.crossesMidnight && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                      +1 Day (Midnight)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product-Wise Production Entry with Multi-Size Selection & Individual Quantities */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Product-Wise Production Entry — Multiple Bag Sizes per Product</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  1. Select a Product · 2. Click multiple Bag Sizes (e.g. 20 KG, 25 KG, 50 KG, 80 KG) · 3. Enter individual bag quantity for each selected size.
                </p>
              </div>

              {/* Product Selector / Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Product:
                </label>
                <select
                  value={selectedProductFilter}
                  onChange={e => setSelectedProductFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="all">All Catalog Products ({productEntries.length})</option>
                  {productEntries.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.productNameEn} {p.productNameUr ? `(${p.productNameUr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Cards List */}
            <div className="space-y-4">
              {visibleProductEntries.map(prodEntry => {
                const availableBagSizes = getAvailableSizesForProduct(prodEntry.productId);
                const selectedSizeNumbers = prodEntry.selectedSizes.map(s => s.bagSizeKg);

                // Calculate product-level totals across all selected bag sizes
                const productTotalBags = prodEntry.selectedSizes.reduce((sum, s) => {
                  const n = Number(s.quantityInput);
                  return sum + (s.quantityInput.trim() !== '' && !isNaN(n) && n > 0 ? Math.round(n) : 0);
                }, 0);

                const productTotalWeightKg = prodEntry.selectedSizes.reduce((sum, s) => {
                  const n = Number(s.quantityInput);
                  const count = s.quantityInput.trim() !== '' && !isNaN(n) && n > 0 ? Math.round(n) : 0;
                  return sum + count * s.bagSizeKg;
                }, 0);

                return (
                  <div
                    key={prodEntry.productId}
                    className={`p-4 rounded-2xl border transition-all space-y-4 ${
                      prodEntry.selectedSizes.length > 0
                        ? 'border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-slate-800/60 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    {/* Top Row: Product Title + Multi-Size Bag Selector Pills */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            {prodEntry.productNameEn}
                          </span>
                          {prodEntry.productNameUr && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span
                                className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                                dir="rtl"
                              >
                                {prodEntry.productNameUr}
                              </span>
                            </>
                          )}
                          {prodEntry.selectedSizes.length > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                              {prodEntry.selectedSizes.length} size
                              {prodEntry.selectedSizes.length > 1 ? 's' : ''} selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Click multiple bag sizes below to select them simultaneously. Click an active size again to deselect only that size.
                        </p>
                      </div>

                      {/* Quick Select All / Clear Sizes for this product */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <select
                            value={prodEntry.sizeToAddDropdown}
                            onChange={e => {
                              const val = e.target.value;
                              setProductEntries(prev =>
                                prev.map(item =>
                                  item.productId === prodEntry.productId
                                    ? { ...item, sizeToAddDropdown: val }
                                    : item
                                )
                              );
                            }}
                            className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {availableBagSizes.map(size => (
                              <option key={size} value={String(size)}>
                                {size} KG
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSizeFromDropdown(
                                prodEntry.productId,
                                Number(prodEntry.sizeToAddDropdown)
                              )
                            }
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Size</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectAllSizesForProduct(prodEntry.productId)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Select All Sizes
                        </button>
                        {prodEntry.selectedSizes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearSizesForProduct(prodEntry.productId)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                          >
                            Clear Sizes
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-Select Bag Sizes Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
                        Bag Sizes:
                      </span>
                      {availableBagSizes.map(size => {
                        const isSelected = selectedSizeNumbers.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleToggleProductBagSize(prodEntry.productId, size)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/30'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            )}
                            <span>{size} KG</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Individual Quantity Inputs for Every Selected Size (Requirement 3) */}
                    {prodEntry.selectedSizes.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          <span>Selected Sizes & Individual Quantities — {prodEntry.productNameEn}</span>
                          <span>
                            Total: {productTotalBags} bags ({productTotalWeightKg.toLocaleString()} KG)
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {prodEntry.selectedSizes.map(sizeItem => {
                            const rawVal = sizeItem.quantityInput.trim();
                            const parsedNum = Number(rawVal);
                            const isValidPositive =
                              rawVal !== '' && !isNaN(parsedNum) && parsedNum > 0;
                            const validCount = isValidPositive ? Math.round(parsedNum) : 0;
                            const lineWeightKg = validCount * sizeItem.bagSizeKg;
                            const linePct =
                              totalProductionWeight > 0
                                ? ((lineWeightKg / totalProductionWeight) * 100).toFixed(1)
                                : '0.0';

                            return (
                              <div
                                key={`${prodEntry.productId}-${sizeItem.bagSizeKg}`}
                                className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                {/* Bag Size Badge */}
                                <div className="flex items-center gap-3 min-w-[140px]">
                                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs">
                                    {sizeItem.bagSizeKg} KG
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {prodEntry.productNameEn}
                                  </span>
                                </div>

                                {/* Independent Quantity Input & Steppers */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-500">
                                    Quantity:
                                  </span>
                                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuantityStepChange(
                                          prodEntry.productId,
                                          sizeItem.bagSizeKg,
                                          -10
                                        )
                                      }
                                      title="-10 bags"
                                      className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                                    >
                                      -10
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuantityStepChange(
                                          prodEntry.productId,
                                          sizeItem.bagSizeKg,
                                          -1
                                        )
                                      }
                                      title="-1 bag"
                                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input
                                      id={`qty-input-${prodEntry.productId}-${sizeItem.bagSizeKg}`}
                                      type="number"
                                      min={1}
                                      value={sizeItem.quantityInput}
                                      placeholder="Enter bags"
                                      onChange={e =>
                                        handleQuantityInputChange(
                                          prodEntry.productId,
                                          sizeItem.bagSizeKg,
                                          e.target.value
                                        )
                                      }
                                      className={`w-24 text-center font-mono font-bold text-sm rounded-lg px-2 py-1 outline-none border ${
                                        rawVal === '' || !isValidPositive
                                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/30 text-slate-900 dark:text-white'
                                          : 'border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuantityStepChange(
                                          prodEntry.productId,
                                          sizeItem.bagSizeKg,
                                          1
                                        )
                                      }
                                      title="+1 bag"
                                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuantityStepChange(
                                          prodEntry.productId,
                                          sizeItem.bagSizeKg,
                                          10
                                        )
                                      }
                                      title="+10 bags"
                                      className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                                    >
                                      +10
                                    </button>
                                  </div>
                                  <span className="text-xs text-slate-500 font-medium">bags</span>
                                </div>

                                {/* Individual Weight Calculation & Deselect Button */}
                                <div className="flex items-center gap-4 justify-between sm:justify-end min-w-[210px]">
                                  <div className="text-right font-mono text-xs">
                                    <span className="text-slate-400">
                                      {sizeItem.bagSizeKg} KG × {validCount} ={' '}
                                    </span>
                                    <strong className="text-blue-600 dark:text-blue-400 text-sm">
                                      {lineWeightKg.toLocaleString()} KG
                                    </strong>
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                                    {linePct}%
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleProductBagSize(
                                        prodEntry.productId,
                                        sizeItem.bagSizeKg
                                      )
                                    }
                                    title={`Deselect ${sizeItem.bagSizeKg} KG`}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Per-Product Summary Footer (Requirements 7 & 8) */}
                        <div className="px-4 py-3 bg-blue-50/60 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {prodEntry.productNameEn} Summary:
                            </span>
                            {prodEntry.selectedSizes.map(s => {
                              const n = Number(s.quantityInput);
                              const count =
                                s.quantityInput.trim() !== '' && !isNaN(n) && n > 0
                                  ? Math.round(n)
                                  : 0;
                              return (
                                <span
                                  key={s.bagSizeKg}
                                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 font-mono font-semibold text-slate-800 dark:text-slate-200"
                                >
                                  {s.bagSizeKg} KG × {count} bags ({(count * s.bagSizeKg).toLocaleString()} KG)
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-4 font-mono font-bold">
                            <span className="text-slate-900 dark:text-white">
                              Total Bags: {productTotalBags}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400">
                              Total Weight: {productTotalWeightKg.toLocaleString()} KG
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Production & Machine Observations / Shift Handover Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Wheat lot #44 processed; roller mill 2 operated smoothly; moisture content at 12.8%."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Live Production Entry Summary (Requirements 7 & 8) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  Live Production Shift Summary
                </h3>
                <p className="text-xs text-slate-300">
                  Review all selected product bag sizes, individual quantities, total bags, and total weight before saving.
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div>
                  Date: <strong className="text-white">{date}</strong> | Shift:{' '}
                  <strong className="text-white">{shiftName}</strong>
                </div>
                <div>
                  Duration: <strong className="text-blue-300 font-mono">{durationInfo.formatted}</strong>
                </div>
              </div>
            </div>

            {/* Detailed Product & Multi-Size Breakdown in Summary */}
            {productsWithSelections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productsWithSelections.map(prodEntry => {
                  const prodBags = prodEntry.selectedSizes.reduce((sum, s) => {
                    const n = Number(s.quantityInput);
                    return sum + (s.quantityInput.trim() !== '' && !isNaN(n) && n > 0 ? Math.round(n) : 0);
                  }, 0);
                  const prodWeight = prodEntry.selectedSizes.reduce((sum, s) => {
                    const n = Number(s.quantityInput);
                    const c = s.quantityInput.trim() !== '' && !isNaN(n) && n > 0 ? Math.round(n) : 0;
                    return sum + c * s.bagSizeKg;
                  }, 0);

                  return (
                    <div
                      key={prodEntry.productId}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="text-xs font-bold text-white">
                          Product: {prodEntry.productNameEn}{' '}
                          {prodEntry.productNameUr ? `(${prodEntry.productNameUr})` : ''}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-300">
                          {prodBags} bags · {prodWeight.toLocaleString()} KG
                        </span>
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {prodEntry.selectedSizes.map(s => {
                          const n = Number(s.quantityInput);
                          const count =
                            s.quantityInput.trim() !== '' && !isNaN(n) && n > 0 ? Math.round(n) : 0;
                          const weight = count * s.bagSizeKg;
                          return (
                            <div
                              key={s.bagSizeKg}
                              className="flex items-center justify-between text-slate-200"
                            >
                              <span>
                                {s.bagSizeKg} KG × {count} bags
                              </span>
                              <span className="text-blue-300 font-bold">
                                {weight.toLocaleString()} KG
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total Bags</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {totalProductionBags.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">Across all selected sizes</span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total Production Weight</span>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {totalProductionWeight.toLocaleString()} <span className="text-sm">KG</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {(totalProductionWeight / 1000).toFixed(2)} Metric Tons
                </span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Selected Size Lines</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {totalSelectedSizeLinesCount}
                </div>
                <span className="text-[10px] text-slate-400">
                  Across {productsWithSelections.length} product(s)
                </span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Stock Auto-Post</span>
                <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{db.settings.productionAutoPostToStock ? 'Auto-Enabled' : 'Manual in History'}</span>
                </div>
                <span className="text-[10px] text-slate-400">Configured in settings</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              {editingSessionId && (
                <button
                  type="button"
                  onClick={handleCancelEditSession}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveProduction}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-98 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {editingSessionId
                    ? `Update Production Record (${editingRecordCode})`
                    : 'Save Production Entry'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED PRODUCTION HISTORY & STOCK POSTING (Requirement 11, 12, 13, 14) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, shift, product name..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAllSessions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {filteredSessions.length > 0 && selectedSessionIds.length === filteredSessions.length
                      ? 'Clear Selection'
                      : 'Select All'}
                  </span>
                </button>

                {selectedSessionIds.length > 0 && (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                      {selectedSessionIds.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSessionIds([])}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-98 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedSessionIds.length})</span>
                    </button>
                  </>
                )}

                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none"
                />
                {historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('')}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear Date
                  </button>
                )}

                <select
                  value={historyShiftFilter}
                  onChange={e => setHistoryShiftFilter(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 border-0 outline-none"
                >
                  <option value="all">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Daily Aggregated Figures Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Filter Scope: </span>
                  <strong className="text-slate-900 dark:text-white">
                    {historyDateFilter ? `Date ${historyDateFilter}` : 'All Recorded Shifts'}
                  </strong>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div>
                  <span className="text-slate-500">Total Bags: </span>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                    {historyTotalBags.toLocaleString()} bags
                  </strong>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div>
                  <span className="text-slate-500">Total Volume: </span>
                  <strong className="font-mono text-blue-600 dark:text-blue-400">
                    {historyTotalWeight.toLocaleString()} kg ({(historyTotalWeight / 1000).toFixed(2)} Tons)
                  </strong>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">
                {filteredSessions.length} sessions listed
              </span>
            </div>

            {/* Sessions Table with Grouped Product & Multi-Size Breakdown (Requirement 11) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredSessions.length > 0 &&
                          selectedSessionIds.length === filteredSessions.length
                        }
                        onChange={handleToggleSelectAllSessions}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                        title="Select / Deselect All Production Sessions"
                      />
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Record Code</th>
                    <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                    <th className="py-2.5 px-3 font-semibold">Shift & Running Time</th>
                    <th className="py-2.5 px-3 font-semibold">Products & Bag Sizes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Stock Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No production records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(session => {
                      const isSelected = selectedSessionIds.includes(session.id);
                      const groupedProducts =
                        session.productEntries && session.productEntries.length > 0
                          ? session.productEntries
                          : groupProductionLinesByProduct(session.lines);

                      return (
                        <tr
                          key={session.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center align-top">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSessionSelect(session.id)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600 mt-1"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white align-top">
                            {session.recordCode}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 align-top">
                            {session.date}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {session.shiftName} Shift
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {session.startTime} - {session.endTime} ({session.durationFormatted})
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="space-y-2">
                              {groupedProducts.map(gp => (
                                <div
                                  key={gp.productId}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70"
                                >
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{gp.productNameEn}</span>
                                    {gp.productNameUr && (
                                      <span className="text-blue-600 dark:text-blue-400" dir="rtl">
                                        ({gp.productNameUr})
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                    {gp.sizes.map(sz => (
                                      <div key={sz.bagSizeKg}>
                                        {sz.bagSizeKg} KG — {sz.bagCount} bags ({sz.totalWeightKg.toLocaleString()} KG)
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white align-top">
                            {session.totalBags} bags
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 align-top">
                            {session.totalWeightKg.toLocaleString()} kg
                          </td>
                          <td className="py-3 px-3 text-center align-top">
                            {session.isStockPosted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Posted to Stock</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Stock Post</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 align-top whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedSessionDetail(session)}
                              title="Inspect Shift Breakdown"
                              className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-semibold text-xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1" />
                              <span>Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditSession(session)}
                              title="Edit Production Record"
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {!session.isStockPosted ? (
                              <button
                                type="button"
                                onClick={() => handlePostToStockAction(session)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Boxes className="w-3 h-3 inline mr-1" />
                                <span>Post to Stock</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold cursor-default"
                              >
                                Posted
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleSession(session)}
                              title="Delete Production Session (Move to Recycle Bin)"
                              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Production Record Detail Modal (Grouped by Product with Multi-Size Details) */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Production Shift Details ({selectedSessionDetail.recordCode})
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {selectedSessionDetail.date} · Shift: {selectedSessionDetail.shiftName} (
                  {selectedSessionDetail.startTime} - {selectedSessionDetail.endTime}, Duration:{' '}
                  {selectedSessionDetail.durationFormatted})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Produced Bags:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {selectedSessionDetail.totalBags} bags
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Produced Weight:</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                    {selectedSessionDetail.totalWeightKg.toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stock Status:</span>
                  <span className="font-bold">
                    {selectedSessionDetail.isStockPosted ? (
                      <span className="text-emerald-600">Posted to inventory ledger</span>
                    ) : (
                      <span className="text-amber-600">Pending post to stock</span>
                    )}
                  </span>
                </div>
                {selectedSessionDetail.notes && (
                  <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Notes: {selectedSessionDetail.notes}
                  </div>
                )}
              </div>

              <div className="pt-1 text-xs font-bold uppercase text-slate-500">
                Products & Bag Size Breakdown
              </div>

              {groupProductionLinesByProduct(selectedSessionDetail.lines).map(prodGroup => (
                <div
                  key={prodGroup.productId}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{prodGroup.productNameEn}</span>
                      {prodGroup.productNameUr && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-blue-600" dir="rtl">
                            {prodGroup.productNameUr}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Total: {prodGroup.totalBags} bags ({prodGroup.totalWeightKg.toLocaleString()} KG)
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {prodGroup.sizes.map(sz => (
                      <div
                        key={sz.bagSizeKg}
                        className="flex items-center justify-between text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {sz.bagSizeKg} KG — {sz.bagCount} bags
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {sz.totalWeightKg.toLocaleString()} KG ({sz.percentage?.toFixed(1) || '0.0'}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSessionDetail;
                    setSelectedSessionDetail(null);
                    handleStartEditSession(target);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>
                {!selectedSessionDetail.isStockPosted && (
                  <button
                    type="button"
                    onClick={() => {
                      handlePostToStockAction(selectedSessionDetail);
                      setSelectedSessionDetail(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Post this Session to Stock Now</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Sessions Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Production Session Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Inventory & Production Safety Notice</span>
              </div>
              <p>
                Are you sure you want to delete the selected production record(s)? They will be moved to the Recycle Bin. If any selected session was already posted to stock inventory, the corresponding product bag balances will be safely reversed.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selected Sessions ({selectedSessionIds.length}):
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedSessionIds.map(id => {
                  const s = db.productionSessions.find(item => item.id === id);
                  if (!s) return null;
                  return (
                    <div
                      key={s.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.recordCode}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.date} · {s.shiftName} Shift ({s.startTime} - {s.endTime})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.totalBags} bags
                        </div>
                        <div className="text-[10px] text-blue-600 font-mono">
                          {s.totalWeightKg.toLocaleString()} kg
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">
                Reason for Removal *
              </label>
              <input
                type="text"
                value={deleteProductionReason}
                onChange={e => setDeleteProductionReason(e.target.value)}
                placeholder="e.g. Data entry duplicate, cancelled shift, audit correction..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelectedSessions}
                className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-98 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete ({selectedSessionIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
