import React, { useState, useEffect } from 'react';
import {
  Factory,
  Clock,
  Calendar,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Info,
  Scale,
  Package,
} from 'lucide-react';
import { AppDatabase, Product, ProductionLineItem, AppLanguage } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';

interface ProductionViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  language: AppLanguage;
}

export const ProductionView: React.FC<ProductionViewProps> = ({ db, storage, currentUser, language }) => {
  const t = translations[language] || translations.en;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [shiftName, setShiftName] = useState('Morning');
  const [shiftNumber, setShiftNumber] = useState('1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [notes, setNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Product entries matrix: for each active product, track bag size, count, direct weight
  const [lineEntries, setLineEntries] = useState<
    Array<{
      productId: string;
      productNameEn: string;
      productNameUr: string;
      selectedBagSize: number;
      bagCount: number;
      directWeight: number;
      isDirectWeight: boolean;
    }>
  >([]);

  // Initialize product lines when active products change
  useEffect(() => {
    const activeProds = db.products.filter(p => p.isActive);
    setLineEntries(
      activeProds.map(p => ({
        productId: p.id,
        productNameEn: p.nameEn,
        productNameUr: p.nameUr,
        selectedBagSize: p.bagSizes[0] || (db.bagSizes[0] ? db.bagSizes[0].sizeKg : 50),
        bagCount: 0,
        directWeight: 0,
        isDirectWeight: false,
      }))
    );
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
      // Crosses midnight (e.g. 22:00 to 06:00)
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

  // Weight calculations
  const calculatedLines: ProductionLineItem[] = lineEntries.map((line, idx) => {
    const totalWeightKg = line.isDirectWeight
      ? Number(line.directWeight) || 0
      : (Number(line.bagCount) || 0) * line.selectedBagSize;

    return {
      id: `pline-${idx}`,
      productId: line.productId,
      productNameEn: line.productNameEn,
      productNameUr: line.productNameUr,
      bagSizeKg: line.selectedBagSize,
      bagCount: line.isDirectWeight ? 0 : Number(line.bagCount) || 0,
      directWeightKg: line.isDirectWeight ? Number(line.directWeight) || 0 : 0,
      isDirectWeightOnly: line.isDirectWeight,
      totalWeightKg,
      percentage: 0, // Will be computed once total is known
    };
  });

  const totalProductionWeight = calculatedLines.reduce((acc, l) => acc + l.totalWeightKg, 0);
  const totalProductionBags = calculatedLines.reduce((acc, l) => acc + l.bagCount, 0);

  // Compute percentages
  calculatedLines.forEach(line => {
    line.percentage = totalProductionWeight > 0 ? (line.totalWeightKg / totalProductionWeight) * 100 : 0;
  });

  const handleBagCountChange = (index: number, delta: number) => {
    setLineEntries(prev => {
      const copy = [...prev];
      const cur = copy[index].bagCount || 0;
      copy[index].bagCount = Math.max(0, cur + delta);
      return copy;
    });
  };

  const handleManualBagCount = (index: number, val: string) => {
    const num = parseInt(val, 10);
    setLineEntries(prev => {
      const copy = [...prev];
      copy[index].bagCount = isNaN(num) ? 0 : Math.max(0, num);
      return copy;
    });
  };

  const handleBagSizeChange = (index: number, sizeKg: number) => {
    setLineEntries(prev => {
      const copy = [...prev];
      copy[index].selectedBagSize = sizeKg;
      return copy;
    });
  };

  const handleSaveProduction = () => {
    setErrorMsg('');
    setSaveSuccessMsg('');

    if (totalProductionWeight === 0 && totalProductionBags === 0) {
      setErrorMsg('Please enter at least one product quantity or weight before saving.');
      return;
    }

    try {
      const validLines = calculatedLines.filter(l => l.totalWeightKg > 0 || l.bagCount > 0);

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
          lines: validLines,
          totalWeightKg: totalProductionWeight,
          totalBags: totalProductionBags,
          createdBy: currentUser,
        },
        currentUser
      );

      setSaveSuccessMsg(
        `Production Session ${saved.recordCode} saved successfully! ${
          db.settings.productionAutoPostToStock ? 'Stock has been updated automatically.' : ''
        }`
      );

      // Reset quantities for fresh entry
      setLineEntries(prev =>
        prev.map(l => ({ ...l, bagCount: 0, directWeight: 0 }))
      );
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving production session.');
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.production} (روزانہ پروڈکشن اندراج)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatic time duration calculation, bag multipliers, production percentage shares, and instant stock posting.
          </p>
        </div>

        <button
          onClick={handleSaveProduction}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-98 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{t.saveProduction}</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Production Header: Date, Shift, Times, Duration (Section 6.1 & 6.2) */}
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

      {/* Product Entry Grid (Section 6.3 & 6.4) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Product-Wise Production Entry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select bag sizes, use plus/minus buttons or direct keyboard entry. Weight and percentages calculate automatically.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {lineEntries.map((line, idx) => {
            const prod = db.products.find(p => p.id === line.productId);
            const availableBagSizes = prod ? prod.bagSizes : [50];
            const lineWeight = line.isDirectWeight
              ? line.directWeight
              : line.bagCount * line.selectedBagSize;
            const linePct =
              totalProductionWeight > 0 ? ((lineWeight / totalProductionWeight) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={line.productId}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Left: Product Name & Bag Size Select */}
                <div className="min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{line.productNameEn}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400" dir="rtl">
                      {line.productNameUr}
                    </span>
                  </div>

                  {/* Bag Size options pills */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-semibold text-slate-500">Size:</span>
                    {availableBagSizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleBagSizeChange(idx, size)}
                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold transition-all ${
                          line.selectedBagSize === size
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {size} kg
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center: Bag Counter Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleBagCountChange(idx, -10)}
                      title="-10 bags"
                      className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBagCountChange(idx, -1)}
                      title="-1 bag"
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={line.bagCount === 0 ? '' : line.bagCount}
                      placeholder="0"
                      onChange={e => handleManualBagCount(idx, e.target.value)}
                      className="w-20 text-center font-mono font-bold text-sm text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleBagCountChange(idx, 1)}
                      title="+1 bag"
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBagCountChange(idx, 10)}
                      title="+10 bags"
                      className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      +10
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Bags</span>
                </div>

                {/* Right: Calculated Weight & Percentage Share */}
                <div className="flex items-center gap-6 min-w-[200px] justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-500">Calculated Weight</div>
                    <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      {lineWeight.toLocaleString()} kg
                    </div>
                  </div>
                  <div className="text-right min-w-[65px]">
                    <div className="text-xs font-semibold text-slate-500">Share</div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                      {linePct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes input */}
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

      {/* Live Production Summary (Section 6.7) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">
              Live Production Shift Summary
            </h3>
            <p className="text-xs text-slate-300">
              Verified total production figures before committing to database ledger.
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total Bags</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalProductionBags.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Total counted units</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total Production</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {totalProductionWeight.toLocaleString()} <span className="text-sm">kg</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {(totalProductionWeight / 1000).toFixed(2)} Metric Tons
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Active Lines</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {calculatedLines.filter(l => l.totalWeightKg > 0).length} / {calculatedLines.length}
            </div>
            <span className="text-[10px] text-slate-400">Products in this shift</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Stock Auto-Post</span>
            <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{db.settings.productionAutoPostToStock ? 'Enabled' : 'Manual'}</span>
            </div>
            <span className="text-[10px] text-slate-400">Configured in settings</span>
          </div>
        </div>

        {/* Save CTA */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveProduction}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Confirm & Commit Production Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
