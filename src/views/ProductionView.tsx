import React, { useState, useEffect } from 'react';
import {
  Factory,
  Clock,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertCircle,
  Package,
  History,
  Boxes,
  Eye,
  Search,
  X,
  Trash2,
  AlertTriangle,
  Edit3,
  RotateCcw,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  AppDatabase,
  ProductionLineItem,
  ProductionSession,
  AppLanguage,
  Product,
} from '../types';
import { StorageService, groupProductionLinesByProduct } from '../services/storage';
import { translations } from '../services/translations';

interface ProductionViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  language: AppLanguage;
  initialTab?: 'entry' | 'daily' | 'history';
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  db,
  storage,
  currentUser,
  language,
  initialTab = 'entry',
}) => {
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState<'entry' | 'daily' | 'history'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Form Fields
  const [date, setDate] = useState(todayStr);
  const [shiftName, setShiftName] = useState('Morning');
  const [shiftNumber, setShiftNumber] = useState('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [notes, setNotes] = useState('');

  // Single / Primary Product Form inputs
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBagSize, setSelectedBagSize] = useState<number>(50);
  const [customBagSizeInput, setCustomBagSizeInput] = useState<string>('');
  const [bagQuantityInput, setBagQuantityInput] = useState<string>('');

  // Batch items list (for logging multiple products in a single shift)
  const [batchLines, setBatchLines] = useState<ProductionLineItem[]>([]);

  // Feedback Messages
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing existing session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingRecordCode, setEditingRecordCode] = useState<string>('');

  // Daily Production Tab State
  const [dailyDateFilter, setDailyDateFilter] = useState(todayStr);

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyShiftFilter, setHistoryShiftFilter] = useState('all');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ProductionSession | null>(null);

  // Active products in the catalog
  const activeProducts = (db.products || []).filter(p => p.isActive);

  // Set default product when activeProducts load
  useEffect(() => {
    if (activeProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(activeProducts[0].id);
      if (activeProducts[0].bagSizes && activeProducts[0].bagSizes.length > 0) {
        setSelectedBagSize(activeProducts[0].bagSizes[0]);
      }
    }
  }, [activeProducts, selectedProductId]);

  // When selected product changes, adapt default bag size
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = activeProducts.find(p => p.id === prodId);
    if (prod && prod.bagSizes && prod.bagSizes.length > 0) {
      setSelectedBagSize(prod.bagSizes[0]);
    }
  };

  // Duration calculation
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

  // Helper to get available bag sizes for selected product
  const currentProd = activeProducts.find(p => p.id === selectedProductId);
  const availableBagSizes = Array.from(
    new Set<number>([
      ...(currentProd?.bagSizes || []),
      20,
      25,
      40,
      50,
      80,
      100,
    ])
  ).sort((a, b) => a - b);

  // Stepper helper
  const handleStepQuantity = (delta: number) => {
    const current = Number(bagQuantityInput) || 0;
    const nextVal = Math.max(0, current + delta);
    setBagQuantityInput(nextVal > 0 ? String(nextVal) : '');
  };

  // Add Item to Shift Batch
  const handleAddLineToBatch = () => {
    setErrorMsg('');
    if (!currentProd) {
      setErrorMsg('Please select a valid product.');
      return;
    }

    const effectiveBagSize = Number(customBagSizeInput) > 0 ? Number(customBagSizeInput) : selectedBagSize;
    if (isNaN(effectiveBagSize) || effectiveBagSize <= 0) {
      setErrorMsg('Please select or enter a valid positive bag size in KG.');
      return;
    }

    const qty = Number(bagQuantityInput);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid positive bag quantity greater than 0.');
      return;
    }

    const bagCount = Math.round(qty);
    const totalWeightKg = bagCount * effectiveBagSize;

    // Check if already in batch
    const existingIdx = batchLines.findIndex(
      l => l.productId === currentProd.id && l.bagSizeKg === effectiveBagSize
    );

    if (existingIdx !== -1) {
      const updated = [...batchLines];
      updated[existingIdx].bagCount += bagCount;
      updated[existingIdx].totalWeightKg += totalWeightKg;
      setBatchLines(updated);
    } else {
      const newLine: ProductionLineItem = {
        id: `pline-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: currentProd.id,
        productNameEn: currentProd.nameEn,
        productNameUr: currentProd.nameUr,
        bagSizeKg: effectiveBagSize,
        bagCount,
        directWeightKg: 0,
        isDirectWeightOnly: false,
        totalWeightKg,
        percentage: 0,
      };
      setBatchLines(prev => [...prev, newLine]);
    }

    // Reset quantity input
    setBagQuantityInput('');
    setCustomBagSizeInput('');
  };

  // Remove Line from Batch
  const handleRemoveLineFromBatch = (index: number) => {
    setBatchLines(prev => prev.filter((_, i) => i !== index));
  };

  // Master Save / Submit Production Session
  const handleSaveProduction = () => {
    setErrorMsg('');
    setSaveSuccessMsg('');

    let linesToSave: ProductionLineItem[] = [...batchLines];

    // If operator has also entered a valid product & bag count in the current input fields, merge it
    const activeQty = Number(bagQuantityInput);
    if (!isNaN(activeQty) && activeQty > 0 && currentProd) {
      const effectiveBagSize = Number(customBagSizeInput) > 0 ? Number(customBagSizeInput) : selectedBagSize;
      if (!isNaN(effectiveBagSize) && effectiveBagSize > 0) {
        const bagCount = Math.round(activeQty);
        const totalWeightKg = bagCount * effectiveBagSize;

        const existingIdx = linesToSave.findIndex(
          l => l.productId === currentProd.id && l.bagSizeKg === effectiveBagSize
        );

        if (existingIdx !== -1) {
          linesToSave[existingIdx].bagCount += bagCount;
          linesToSave[existingIdx].totalWeightKg += totalWeightKg;
        } else {
          linesToSave.push({
            id: `pline-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            productId: currentProd.id,
            productNameEn: currentProd.nameEn,
            productNameUr: currentProd.nameUr,
            bagSizeKg: effectiveBagSize,
            bagCount,
            directWeightKg: 0,
            isDirectWeightOnly: false,
            totalWeightKg,
            percentage: 0,
          });
        }
      }
    }

    if (linesToSave.length === 0) {
      if (!currentProd) {
        setErrorMsg('Please select a product from the catalog before saving.');
        return;
      }

      const effectiveBagSize = Number(customBagSizeInput) > 0 ? Number(customBagSizeInput) : selectedBagSize;
      if (isNaN(effectiveBagSize) || effectiveBagSize <= 0) {
        setErrorMsg('Please select a valid bag size (KG).');
        return;
      }

      if (isNaN(activeQty) || activeQty <= 0) {
        setErrorMsg('Please enter a valid bag quantity greater than 0.');
        return;
      }
    }

    const finalTotalBags = linesToSave.reduce((acc, l) => acc + l.bagCount, 0);
    const finalTotalWeightKg = linesToSave.reduce((acc, l) => acc + l.totalWeightKg, 0);

    linesToSave.forEach(line => {
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
            lines: linesToSave,
            productEntries: groupProductionLinesByProduct(linesToSave),
            totalWeightKg: finalTotalWeightKg,
            totalBags: finalTotalBags,
          },
          currentUser
        );

        setSaveSuccessMsg(
          `Production Record ${updated.recordCode} updated successfully! (${updated.totalBags} bags, ${updated.totalWeightKg.toLocaleString()} kg). ${
            updated.isStockPosted ? 'Inventory balances reconciled.' : ''
          }`
        );
        setEditingSessionId(null);
        setEditingRecordCode('');
        setBatchLines([]);
        setBagQuantityInput('');
        setCustomBagSizeInput('');
        setDailyDateFilter(date);
        setActiveTab('daily');
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
            lines: linesToSave,
            productEntries: groupProductionLinesByProduct(linesToSave),
            totalWeightKg: finalTotalWeightKg,
            totalBags: finalTotalBags,
            createdBy: currentUser,
          },
          currentUser,
          db.settings.productionAutoPostToStock
        );

        setSaveSuccessMsg(
          `Production Record ${saved.recordCode} saved successfully! (${saved.totalBags} bags, ${saved.totalWeightKg.toLocaleString()} kg). Added to Daily Production report.`
        );

        // Reset inputs
        setBatchLines([]);
        setBagQuantityInput('');
        setCustomBagSizeInput('');
        setNotes('');
        setDailyDateFilter(date);
        setActiveTab('daily');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving production session.');
    }
  };

  // Load existing session into editor
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
    setBatchLines([...session.lines]);
    setActiveTab('entry');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingRecordCode('');
    setBatchLines([]);
    setErrorMsg('');
  };

  // Delete production record
  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to remove this production record? Stock inventory will be safely reversed.')) {
      try {
        storage.archiveProductionSession(sessionId, currentUser, 'Deleted from Production view');
        setSaveSuccessMsg('Production record moved to Recycle Bin and stock reconciled.');
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to delete record.');
      }
    }
  };

  // ==========================================
  // DAILY PRODUCTION CALCULATIONS
  // ==========================================
  const dailySessions = (db.productionSessions || []).filter(s => s.date === dailyDateFilter);
  const dailyTotalBags = dailySessions.reduce((acc, s) => acc + s.totalBags, 0);
  const dailyTotalWeightKg = dailySessions.reduce((acc, s) => acc + s.totalWeightKg, 0);
  const dailyTotalWeightTons = (dailyTotalWeightKg / 1000).toFixed(2);

  // Group daily breakdown product-wise
  const dailyProductMap = new Map<string, {
    productNameEn: string;
    productNameUr?: string;
    bagSizeKg: number;
    totalBags: number;
    totalWeightKg: number;
  }>();

  dailySessions.forEach(session => {
    (session.lines || []).forEach(line => {
      const key = `${line.productId}__${line.bagSizeKg}`;
      const existing = dailyProductMap.get(key);
      if (existing) {
        existing.totalBags += line.bagCount;
        existing.totalWeightKg += line.totalWeightKg;
      } else {
        dailyProductMap.set(key, {
          productNameEn: line.productNameEn,
          productNameUr: line.productNameUr,
          bagSizeKg: line.bagSizeKg,
          totalBags: line.bagCount,
          totalWeightKg: line.totalWeightKg,
        });
      }
    });
  });

  const dailyProductSummary = Array.from(dailyProductMap.values());

  // Filtered Production History Records
  const filteredHistorySessions = (db.productionSessions || []).filter(ps => {
    const q = historySearch.toLowerCase();
    const matchesSearch =
      ps.recordCode.toLowerCase().includes(q) ||
      ps.shiftName.toLowerCase().includes(q) ||
      ps.lines.some(l => l.productNameEn.toLowerCase().includes(q));

    const matchesDate = !historyDateFilter || ps.date === historyDateFilter;
    const matchesShift = historyShiftFilter === 'all' || ps.shiftName === historyShiftFilter;

    return matchesSearch && matchesDate && matchesShift;
  });

  return (
    <div className="space-y-6 pb-12 select-none font-sans">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.production} (روزانہ پروڈکشن اور شفٹ انٹری)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manufacturing shifts, multi-bag weight calculations, daily production logs, and warehouse inventory integration.
          </p>
        </div>

        {/* 3 Main Tabs: New Production vs Daily Production vs Production History */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'entry'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingSessionId ? `Editing ${editingRecordCode}` : 'New Production'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Production ({dailySessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Production History ({db.productionSessions.length})</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className="text-[11px] underline font-bold cursor-pointer hover:text-emerald-950"
            >
              View in Daily Production →
            </button>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg('')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
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

      {/* ========================================================================= */}
      {/* TAB 1: NEW PRODUCTION ENTRY FORM (Requirement 6)                          */}
      {/* ========================================================================= */}
      {activeTab === 'entry' && (
        <div className="space-y-6">
          {/* Editing Mode Banner */}
          {editingSessionId && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">
                  Editing Production Record: {editingRecordCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold border border-amber-300 text-slate-700 dark:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            </div>
          )}

          {/* Shift Schedule Timing Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Shift Timing & Operational Schedule</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Production Date *
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
                  Shift Name *
                </label>
                <select
                  value={shiftName}
                  onChange={e => setShiftName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
                >
                  <option value="Morning">Morning Shift (صبح)</option>
                  <option value="Evening">Evening Shift (شام)</option>
                  <option value="Night">Night Shift (رات)</option>
                  <option value="General">General 24hr Run</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Time *
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
                  End Time *
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
                  Shift Duration
                </label>
                <div className="px-3 py-2 text-xs font-mono font-bold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                  <span>{durationInfo.formatted}</span>
                  {durationInfo.crossesMidnight && (
                    <span className="text-[10px] text-amber-600 font-sans font-medium">
                      +1 Day
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Core Production Entry Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Production Entry — Product, Bag Size & Quantity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select product, pick bag size, and enter bags produced. Weight will be calculated automatically.
              </p>
            </div>

            {/* Input Row: Product, Bag Size, Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Select Product */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleProductChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                >
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} {p.nameUr ? `(${p.nameUr})` : ''} · Rate: PKR {p.rate?.toLocaleString()}
                    </option>
                  ))}
                </select>
                {activeProducts.length === 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                    <p className="font-semibold">No active products found in this business catalog.</p>
                    <button
                      type="button"
                      onClick={() => {
                        storage.seedDefaultProductsForBusiness(storage.getActiveBusinessId());
                        setErrorMsg('');
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      + Auto-Add Standard Products (Atta, Maida, Suji, Chokar)
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Select Bag Size */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Select Bag Size (KG) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableBagSizes.map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setSelectedBagSize(sz);
                        setCustomBagSizeInput('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        selectedBagSize === sz && !customBagSizeInput
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {sz} KG
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Custom KG:</span>
                  <input
                    type="number"
                    min={1}
                    value={customBagSizeInput}
                    onChange={e => setCustomBagSizeInput(e.target.value)}
                    placeholder="Other KG"
                    className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* 3. Enter Quantity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  3. Enter Quantity (Bags) *
                </label>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(-10)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(-1)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={bagQuantityInput}
                    onChange={e => setBagQuantityInput(e.target.value)}
                    placeholder="e.g. 150"
                    className="flex-1 text-center font-mono font-bold text-base bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1 text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(1)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(10)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    +10
                  </button>
                </div>

                {/* Live weight calculation calculation card */}
                {Number(bagQuantityInput) > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <span className="font-semibold">Calculated Total Weight:</span>
                    <strong className="font-mono text-sm">
                      {(Number(bagQuantityInput) * (Number(customBagSizeInput) > 0 ? Number(customBagSizeInput) : selectedBagSize)).toLocaleString()} KG
                      {' '}({((Number(bagQuantityInput) * (Number(customBagSizeInput) > 0 ? Number(customBagSizeInput) : selectedBagSize)) / 1000).toFixed(2)} Tons)
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Shift Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shift Notes / Batch Remarks (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Grain moisture 12.5%, milling line 2 running smoothly..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Action Bar: Save Immediately or Add to Multi-Item Batch */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLineToBatch}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Item to This Shift Batch</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveProduction}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingSessionId ? 'Update Production Record' : 'Save Production Entry (ریکارڈ محفوظ کریں)'}</span>
                </button>
              </div>
            </div>

            {/* Multi-Item Batch Table (if operator added multiple products to the current shift) */}
            {batchLines.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Current Shift Batch Lines ({batchLines.length} items queued)
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Total: {batchLines.reduce((s, l) => s + l.bagCount, 0)} bags ({batchLines.reduce((s, l) => s + l.totalWeightKg, 0).toLocaleString()} KG)
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3">Bag Size</th>
                        <th className="py-2 px-3">Bags Count</th>
                        <th className="py-2 px-3">Total Weight</th>
                        <th className="py-2 px-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {batchLines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {line.productNameEn}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {line.bagSizeKg} KG
                          </td>
                          <td className="py-2 px-3 font-mono font-bold">
                            {line.bagCount} bags
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-600">
                            {line.totalWeightKg.toLocaleString()} KG
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineFromBatch(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY PRODUCTION BREAKDOWN & REPORTS (Requirement 6)               */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Date Filter & Quick Switcher */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Production Summary: {dailyDateFilter}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive daily production report and shift breakdowns
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDailyDateFilter(todayStr)}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                  dailyDateFilter === todayStr
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Today
              </button>

              <input
                type="date"
                value={dailyDateFilter}
                onChange={e => setDailyDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* Daily KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Daily Weight
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {dailyTotalWeightKg.toLocaleString()} <span className="text-sm font-normal text-slate-400">KG</span>
              </div>
              <p className="text-xs text-blue-600 font-semibold">
                {dailyTotalWeightTons} Metric Tons
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Daily Bags
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {dailyTotalBags.toLocaleString()} <span className="text-sm font-normal text-slate-400">Bags</span>
              </div>
              <p className="text-xs text-slate-400">
                Across all active shifts
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Production Shifts Run
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {dailySessions.length} <span className="text-sm font-normal text-slate-400">Shifts</span>
              </div>
              <p className="text-xs text-slate-400">
                Logged for {dailyDateFilter}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Unique Products
              </span>
              <div className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400">
                {dailyProductSummary.length} <span className="text-sm font-normal text-slate-400">Items</span>
              </div>
              <p className="text-xs text-slate-400">
                Manufactured lines
              </p>
            </div>
          </div>

          {/* Daily Shift Sessions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Shift Logs for {dailyDateFilter} ({dailySessions.length} recorded)
              </h3>
            </div>

            {dailySessions.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No production runs recorded for {dailyDateFilter}.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('entry')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Create New Production Entry &rarr;
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">Record Code</th>
                      <th className="py-2.5 px-3">Shift & Timing</th>
                      <th className="py-2.5 px-3">Products & Bag Sizes</th>
                      <th className="py-2.5 px-3">Total Bags</th>
                      <th className="py-2.5 px-3">Total Weight</th>
                      <th className="py-2.5 px-3">Stock Status</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailySessions.map(session => (
                      <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-bold font-mono text-blue-600">
                          {session.recordCode}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {session.shiftName} Shift
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {session.startTime} - {session.endTime} ({session.durationFormatted})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            {session.lines.map((l, i) => (
                              <div key={i} className="text-[11px]">
                                <span className="font-semibold">{l.productNameEn}</span>: {l.bagCount} bags ({l.bagSizeKg} KG)
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {session.totalBags.toLocaleString()} bags
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {session.totalWeightKg.toLocaleString()} KG
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            session.isStockPosted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {session.isStockPosted ? 'Posted to Stock' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {session.createdBy}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditSession(session)}
                              title="Edit Record"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(session.id)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Product-Wise Daily Aggregate Table */}
          {dailyProductSummary.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Product-Wise Aggregated Summary for {dailyDateFilter}
              </h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Bag Size</th>
                      <th className="py-2.5 px-3">Total Bags Produced</th>
                      <th className="py-2.5 px-3">Total Weight (KG)</th>
                      <th className="py-2.5 px-3">Percentage Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyProductSummary.map((item, idx) => {
                      const share = dailyTotalWeightKg > 0
                        ? ((item.totalWeightKg / dailyTotalWeightKg) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {item.productNameEn} {item.productNameUr ? `(${item.productNameUr})` : ''}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {item.bagSizeKg} KG
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.totalBags.toLocaleString()} bags
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">
                            {item.totalWeightKg.toLocaleString()} KG
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-600">
                            {share}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCTION HISTORY ARCHIVE LEDGER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search by PRD code, shift, or product..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* History Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Record Code</th>
                    <th className="py-3 px-4">Date & Shift</th>
                    <th className="py-3 px-4">Manufactured Items</th>
                    <th className="py-3 px-4">Total Bags</th>
                    <th className="py-3 px-4">Total Weight</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistorySessions.map(session => (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold font-mono text-blue-600">
                        {session.recordCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {session.date}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {session.shiftName} ({session.startTime} - {session.endTime})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {session.lines.map((l, i) => (
                            <div key={i} className="text-[11px]">
                              {l.productNameEn}: <strong>{l.bagCount} bags</strong> ({l.bagSizeKg} KG)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {session.totalBags.toLocaleString()} bags
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {session.totalWeightKg.toLocaleString()} KG
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          session.isStockPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {session.isStockPosted ? 'Posted to Stock' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {session.createdBy}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditSession(session)}
                            title="Edit Record"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
