import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  CreditCard,
  Ban,
  ArrowUpRight,
  Eye,
  Printer,
  Download,
  CheckSquare,
  AlertTriangle,
  Lock,
  Unlock,
  RotateCcw,
  Archive,
  PackageCheck,
} from 'lucide-react';
import {
  AppDatabase,
  SaleRecord,
  SaleLineItem,
  PaymentMethod,
  PaymentStatus,
  AppLanguage,
} from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';
import { generateReportPdf } from '../services/pdfGenerator';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';
import {
  printThermalReceipt,
  generateThermalReceiptHtml,
} from '../services/barcodeAndReceipt';

interface SalesViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  initialDraftItem?: { productId: string; bagSizeKg: number; bags: number } | null;
  onClearDraft?: () => void;
  language: AppLanguage;
}

export const SalesView: React.FC<SalesViewProps> = ({
  db,
  storage,
  currentUser,
  initialDraftItem,
  onClearDraft,
  language,
}) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';
  const mode = normalizeBusinessMode(db.profile?.businessType);
  const modeConfig = getBusinessModeConfig(db.profile?.businessType);
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [cashTendered, setCashTendered] = useState('');

  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleRecord | null>(null);
  const [thermalPreviewSale, setThermalPreviewSale] = useState<SaleRecord | null>(null);
  const [thermalPaperWidth, setThermalPaperWidth] = useState<58 | 80>(
    db.profile?.printerConfig?.paperWidthMm ||
      (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80)
  );
  const [cancelModalSale, setCancelModalSale] = useState<SaleRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // TASK 3 & 10: Sales selection-based deletion & destination action state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteDestination, setDeleteDestination] = useState<'returns' | 'recycle_bin' | 'return_stock'>('return_stock');
  const [deleteSalesReason, setDeleteSalesReason] = useState('Manual deletion from sales ledger');

  const handleToggleSelectAll = () => {
    if (selectedSaleIds.length === filteredSales.length) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(filteredSales.map(s => s.id));
    }
  };

  const handleToggleSaleSelect = (id: string) => {
    if (selectedSaleIds.includes(id)) {
      setSelectedSaleIds(selectedSaleIds.filter(i => i !== id));
    } else {
      setSelectedSaleIds([...selectedSaleIds, id]);
    }
  };

  const handleConfirmDeleteSelectedSales = () => {
    if (selectedSaleIds.length === 0) return;
    try {
      let removedCount = 0;
      for (const id of selectedSaleIds) {
        storage.invoiceDestinationAction(id, deleteDestination, deleteSalesReason, currentUser);
        removedCount++;
      }
      const actionName =
        deleteDestination === 'returns'
          ? 'Moved to Returns'
          : deleteDestination === 'recycle_bin'
          ? 'Moved to Recycle Bin'
          : 'Stock Returned to Warehouse';
      setNotificationMsg({
        type: 'success',
        text: `Successfully processed ${removedCount} invoice(s): ${actionName}. Inventory and audit records updated.`,
      });
      setSelectedSaleIds([]);
      setIsSelectionMode(false);
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error processing sales invoice action.' });
    }
  };

  const isPriceLocked = (db.settings.saleInvoicePriceMode || 'unlocked') === 'locked';

  // Helper to automatically retrieve configured product rate from Product Master / Stock Inventory
  const getApplicableRate = (productId: string, bagSizeKg: number): number => {
    return storage.getConfiguredProductRate(productId, bagSizeKg);
  };

  // Form State
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  const [saleLines, setSaleLines] = useState<
    Array<{
      productId: string;
      bagSizeKg: number;
      bags: number;
      unitPrice: number;
      unitPriceInput?: string;
    }>
  >([]);

  // Sync draft lines to configured rate whenever Admin locks price editing
  useEffect(() => {
    if (isPriceLocked) {
      setSaleLines(prev =>
        prev.map(line => {
          const configuredRate = getApplicableRate(line.productId, line.bagSizeKg);
          return {
            ...line,
            unitPrice: configuredRate,
            unitPriceInput: String(configuredRate),
          };
        })
      );
    }
  }, [isPriceLocked, db.products, db.stockBalances]);

  // If opened via "Move Stock to Sales" draft
  useEffect(() => {
    if (initialDraftItem) {
      const autoRate = getApplicableRate(initialDraftItem.productId, initialDraftItem.bagSizeKg);
      setSaleLines([
        {
          productId: initialDraftItem.productId,
          bagSizeKg: initialDraftItem.bagSizeKg,
          bags: initialDraftItem.bags,
          unitPrice: autoRate,
          unitPriceInput: String(autoRate),
        },
      ]);
      setIsNewSaleOpen(true);
      if (onClearDraft) onClearDraft();
    }
  }, [initialDraftItem]);

  const handleAddLine = () => {
    const firstProd = db.products.find(p => p.isActive) || db.products[0];
    if (!firstProd) return;
    const size = mode === 'factory' ? firstProd.bagSizes[0] || 50 : 1;
    const autoRate = getApplicableRate(firstProd.id, size);
    setSaleLines(prev => [
      ...prev,
      {
        productId: firstProd.id,
        bagSizeKg: size,
        bags: mode === 'factory' ? 10 : 1,
        unitPrice: autoRate,
        unitPriceInput: String(autoRate),
      },
    ]);
  };

  const playScannerBeep = () => {
    if (db.profile?.scannerConfig?.playBeepOnScan === false) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore audio context restrictions
    }
  };

  const handleBarcodeScanAdd = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;
    const matchedProd = db.products.find(
      p =>
        p.isActive &&
        ((p.barcode && p.barcode.toLowerCase() === trimmed) ||
          (p.sku && p.sku.toLowerCase() === trimmed) ||
          p.nameEn.toLowerCase() === trimmed)
    );
    if (!matchedProd) {
      setNotificationMsg({
        type: 'error',
        text: `Barcode / SKU "${code.trim()}" not found in ${db.profile?.businessName || 'active business'} catalog.`,
      });
      return;
    }
    const size = matchedProd.bagSizes?.[0] || 1;
    const isService = matchedProd.itemType === 'service';
    const balance = storage.getStockBalance(matchedProd.id, size);
    const available = balance ? balance.availableBags : 0;

    const existingLine = saleLines.find(
      l => l.productId === matchedProd.id && l.bagSizeKg === size
    );
    const nextQty = (existingLine ? existingLine.bags : 0) + 1;

    if (!isService && !db.settings.allowNegativeInventory && available < nextQty) {
      setNotificationMsg({
        type: 'error',
        text: `Out of stock / insufficient quantity for "${matchedProd.nameEn}". Available: ${available} ${matchedProd.unit || 'units'}.`,
      });
      setBarcodeScanInput('');
      return;
    }

    const autoRate = getApplicableRate(matchedProd.id, size);
    setSaleLines(prev => {
      const existingIdx = prev.findIndex(
        l => l.productId === matchedProd.id && l.bagSizeKg === size
      );
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          bags: copy[existingIdx].bags + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          productId: matchedProd.id,
          bagSizeKg: size,
          bags: 1,
          unitPrice: autoRate,
          unitPriceInput: String(autoRate),
        },
      ];
    });
    playScannerBeep();
    setBarcodeScanInput('');
  };

  const handleRemoveLine = (idx: number) => {
    setSaleLines(saleLines.filter((_, i) => i !== idx));
  };

  // Line Calculations
  const calculatedLines: SaleLineItem[] = saleLines.map((line, idx) => {
    const prod = db.products.find(p => p.id === line.productId);
    const configuredRate = getApplicableRate(line.productId, line.bagSizeKg);
    const effectiveUnitPrice = isPriceLocked
      ? configuredRate
      : Number.isFinite(Number(line.unitPrice)) && Number(line.unitPrice) >= 0
      ? Number(line.unitPrice)
      : 0;
    const weightKg = line.bags * line.bagSizeKg;
    const lineTotal = Math.round(line.bags * effectiveUnitPrice * 100) / 100;

    return {
      id: `sline-${idx}`,
      productId: line.productId,
      productNameEn: prod ? prod.nameEn : 'Unknown',
      productNameUr: prod ? prod.nameUr : '',
      bagSizeKg: line.bagSizeKg,
      bags: line.bags,
      weightKg,
      unitPrice: effectiveUnitPrice,
      lineTotal,
    };
  });

  const totalBags = calculatedLines.reduce((acc, l) => acc + l.bags, 0);
  const totalWeightKg = calculatedLines.reduce((acc, l) => acc + l.weightKg, 0);
  const subtotal = calculatedLines.reduce((acc, l) => acc + l.lineTotal, 0);
  const parsedDiscPct = parseFloat(discountPercent);
  const discountVal =
    !isNaN(parsedDiscPct) && parsedDiscPct > 0 && subtotal > 0
      ? Math.round((subtotal * parsedDiscPct) / 100)
      : Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - discountVal);

  const effectivePaidAmount =
    paymentStatus === 'paid' ? grandTotal : paymentStatus === 'credit' ? 0 : Number(paidAmount) || 0;
  const balanceAmount = Math.max(0, grandTotal - effectivePaidAmount);

  // Stats
  const completedSales = db.sales.filter(s => s.status === 'completed');
  const totalSalesRevenue = completedSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalOutstanding = completedSales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const totalBagsSold = completedSales.reduce((acc, s) => acc + s.totalBags, 0);

  const handlePostSale = (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationMsg(null);

    const effectiveCustomerName =
      customerName.trim() || (mode !== 'factory' ? 'Walk-In Customer' : '');

    if (!effectiveCustomerName) {
      setNotificationMsg({ type: 'error', text: 'Customer name is required.' });
      return;
    }

    if (calculatedLines.length === 0) {
      setNotificationMsg({ type: 'error', text: 'Please add at least one product item to the invoice.' });
      return;
    }

    // Verify Stock and Locked Rates before posting
    for (const line of calculatedLines) {
      const prodObj = db.products.find(p => p.id === line.productId);
      const isServiceItem = prodObj?.itemType === 'service';
      const balance = storage.getStockBalance(line.productId, line.bagSizeKg);
      const available = balance ? balance.availableBags : 0;
      if (!isServiceItem && !db.settings.allowNegativeInventory && available < line.bags) {
        setNotificationMsg({
          type: 'error',
          text: `Insufficient stock for ${line.productNameEn}. Available: ${available}, Required: ${line.bags}.`,
        });
        return;
      }

      if (!line.unitPrice || line.unitPrice <= 0) {
        setNotificationMsg({
          type: 'error',
          text: `Cannot post sale: Product rate for ${line.productNameEn} is missing or 0. Set a rate before selling.`,
        });
        return;
      }
    }

    try {
      const sale = storage.addSale(
        {
          date: saleDate,
          customerName: effectiveCustomerName,
          customerPhone: customerPhone.trim(),
          lines: calculatedLines,
          totalBags,
          totalWeightKg,
          subtotal,
          discount: discountVal,
          discountPercent: parseFloat(discountPercent) || (subtotal > 0 && discountVal > 0 ? Number(((discountVal / subtotal) * 100).toFixed(1)) : 0),
          grandTotal,
          paymentMethod,
          paymentStatus,
          paidAmount: effectivePaidAmount,
          balanceAmount,
          referenceNo: referenceNo.trim() || undefined,
          notes: saleNotes.trim(),
          createdBy: currentUser,
        },
        currentUser
      );

      setNotificationMsg({
        type: 'success',
        text: `Invoice ${sale.invoiceNo} successfully generated and posted! Inventory updated.`,
      });
      setIsNewSaleOpen(false);
      setSaleLines([]);
      setCustomerName('');
      setCustomerPhone('');
      setSaleNotes('');
      setDiscount('0');
      setDiscountPercent('');

      if (db.profile?.printerConfig?.autoPrintOnSale) {
        handlePrintThermalReceipt(
          sale,
          db.profile?.printerConfig?.paperWidthMm ||
            (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80)
        );
      } else if (mode !== 'factory') {
        setThermalPaperWidth(
          db.profile?.printerConfig?.paperWidthMm ||
            (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80)
        );
        setThermalPreviewSale(sale);
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error creating sale invoice.' });
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalSale) return;
    try {
      storage.cancelSale(cancelModalSale.id, cancelReason.trim() || 'Customer requested cancellation', currentUser);
      setNotificationMsg({
        type: 'success',
        text: `Invoice ${cancelModalSale.invoiceNo} cancelled and stock inventory reversed.`,
      });
      setCancelModalSale(null);
      setCancelReason('');
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Error cancelling sale.' });
    }
  };

  const handlePrintThermalReceipt = async (sale: SaleRecord, widthMm?: 58 | 80) => {
    const targetWidth =
      widthMm ||
      db.profile?.printerConfig?.paperWidthMm ||
      (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80);
    const tendered = Number(cashTendered) > 0 ? Number(cashTendered) : sale.paidAmount || sale.grandTotal;
    const change = Math.max(0, tendered - sale.grandTotal);

    const res = await printThermalReceipt(sale, db.profile, {
      paperWidthMm: targetWidth,
      printerName: db.profile?.printerConfig?.printerName,
      silent: db.profile?.printerConfig?.silentPrint ?? false,
      cashReceived: tendered,
      changeDue: change,
      cashierName: sale.createdBy || currentUser,
      showBarcode: db.profile?.printerConfig?.showBarcodeOnReceipt ?? true,
      showCustomer: db.profile?.printerConfig?.showCustomerOnReceipt ?? true,
      showTax: db.profile?.printerConfig?.showTaxOnReceipt ?? true,
    });
    if (res.success) {
      setNotificationMsg({
        type: 'success',
        text: `${targetWidth}mm Thermal Receipt for ${sale.invoiceNo} sent to printer.`,
      });
    } else {
      setNotificationMsg({
        type: 'error',
        text: res.error || 'Thermal printer error. Please check printer connection in Settings.',
      });
    }
  };

  // Direct print workflow (Print -> Thermal if configured, else A4 Print Dialog)
  const handleDirectPrintSaleInvoice = (saleId: string) => {
    const saleObj = db.sales.find(s => s.id === saleId);
    if (
      saleObj &&
      (mode === 'shopping_mart' ||
        db.profile?.receiptPrintMode === 'thermal_58mm' ||
        db.profile?.receiptPrintMode === 'thermal_80mm')
    ) {
      setThermalPaperWidth(
        db.profile?.printerConfig?.paperWidthMm ||
          (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80)
      );
      setThermalPreviewSale(saleObj);
      return;
    }
    try {
      const { doc } = generateReportPdf(db, {
        reportType: 'sales_invoice',
        selectedRecordId: saleId,
      });
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const blobUrlStr = typeof blobUrl === 'string' ? blobUrl : (blobUrl as any)?.toString?.() || '';
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrlStr;
      document.body.appendChild(printIframe);
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.open(blobUrlStr, '_blank')?.print();
        }
      };
      setNotificationMsg({ type: 'success', text: 'Invoice sent directly to system printer dialog.' });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'Print error: ' + (err?.message || 'Failed') });
    }
  };

  // PDF download workflow (Download -> PDF download)
  const handleDownloadSaleInvoicePdf = (saleId: string) => {
    try {
      const { doc, filename } = generateReportPdf(db, {
        reportType: 'sales_invoice',
        selectedRecordId: saleId,
      });
      doc.save(filename);
      setNotificationMsg({ type: 'success', text: `Sales Invoice PDF downloaded: ${filename}` });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'Error downloading PDF: ' + (err?.message || 'Failed') });
    }
  };

  const filteredSales = db.sales.filter(s => {
    return (
      s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lines.some(l => l.productNameEn.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'shopping_mart'
                ? 'Shopping Mart POS & Thermal Billing (مارٹ پوائنٹ آف سیل)'
                : mode === 'small_business'
                ? 'Small Business Sales & Invoicing (سیلز اور بلنگ)'
                : `${t.sales} (سیلز رجسٹر و بلنگ)`}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'shopping_mart'
              ? 'Barcode scanner checkout, 58mm/80mm thermal receipts, cash change calculation, and real-time stock deduction.'
              : mode === 'small_business'
              ? 'Quick product & service billing, customer receivables, thermal receipts, and A4 PDF invoices.'
              : 'Dispatch billing, customer receivables, real-time stock deduction, and reversal audits.'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* TASK 3: Select option */}
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedSaleIds([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isSelectionMode
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-indigo-500" />
            <span>{isSelectionMode ? 'Cancel Selection' : 'Select'}</span>
          </button>

          {/* TASK 3: Delete Selected option */}
          {isSelectionMode && selectedSaleIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-98 animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedSaleIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              if (saleLines.length === 0) {
                handleAddLine();
              }
              setIsNewSaleOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>New Sales Invoice</span>
          </button>
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t.totalSalesValue}</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            <span className="text-sm font-bold text-slate-400 mr-1">{currency}</span>
            {totalSalesRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{completedSales.length} completed invoices</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            {mode === 'factory' ? 'Total Bags Dispatched' : 'Total Units / Items Sold'}
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {totalBagsSold.toLocaleString()}{' '}
            <span className="text-xs font-sans text-slate-400">
              {mode === 'factory' ? 'bags' : 'items'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {mode === 'factory' ? 'Total flour & products sold' : 'Total catalog items sold'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Receivables</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            <span className="text-sm font-bold text-slate-400 mr-1">{currency}</span>
            {totalOutstanding.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending credit sales / udhaar</p>
        </div>
      </div>

      {/* Sales Invoices Register */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, customer, phone, product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                {isSelectionMode && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredSales.length > 0 && selectedSaleIds.length === filteredSales.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer accent-indigo-600"
                      title="Select / Deselect All Invoices"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                <th className="py-2.5 px-3 font-semibold">{t.date}</th>
                <th className="py-2.5 px-3 font-semibold">Customer</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.bags}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.weight}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.grandTotal}</th>
                <th className="py-2.5 px-3 font-semibold text-center">Payment</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 10 : 9} className="py-8 text-center text-slate-400 text-xs">
                    No sales invoices found. Click "New Sales Invoice" to dispatch flour.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isCancelled = sale.status === 'cancelled';
                  const isSelected = selectedSaleIds.includes(sale.id);

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''
                      } ${isCancelled ? 'opacity-60 bg-rose-50/20' : ''}`}
                    >
                      {isSelectionMode && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSaleSelect(sale.id)}
                            className="w-4 h-4 rounded text-indigo-600 cursor-pointer accent-indigo-600"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{sale.date}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {sale.totalBags}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {sale.totalWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {currency} {sale.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : sale.paymentStatus === 'partial'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Posted
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          title="View Invoice Details"
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setThermalPaperWidth(
                              db.profile?.printerConfig?.paperWidthMm ||
                                (db.profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80)
                            );
                            setThermalPreviewSale(sale);
                          }}
                          title="58mm / 80mm Thermal Receipt Preview & Print"
                          className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDirectPrintSaleInvoice(sale.id)}
                          title="Print Invoice"
                          className="p-1 text-purple-600 hover:text-purple-800 dark:hover:text-purple-300"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadSaleInvoicePdf(sale.id)}
                          title="Download Invoice PDF"
                          className="p-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => setCancelModalSale(sale)}
                            title="Cancel Invoice & Reverse Stock"
                            className="p-1 text-slate-400 hover:text-amber-600"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSaleIds([sale.id]);
                            setIsDeleteConfirmOpen(true);
                          }}
                          title="Delete & Archive Invoice"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* TASK 3: Sales Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Sales Invoices Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <strong>Data Protection Rule:</strong> Deleting active completed invoices will safely restore allocated flour bags back into stock inventory. All removed invoices are safely preserved in the <strong>Recycle Bin</strong> for audit and recovery.
            </div>

            {/* List of selected invoices */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40">
              {selectedSaleIds.map(id => {
                const sale = db.sales.find(s => s.id === id);
                if (!sale) return null;
                return (
                  <div key={id} className="py-2 px-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{sale.invoiceNo}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-700 dark:text-slate-300">{sale.customerName}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({sale.date})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {currency} {sale.grandTotal.toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1 font-mono">({sale.totalBags} bags)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Destination Selection Options (Task 10 & 11) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                What would you like to do with this invoice? *
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    deleteDestination === 'return_stock'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteDestination"
                    value="return_stock"
                    checked={deleteDestination === 'return_stock'}
                    onChange={() => setDeleteDestination('return_stock')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Option 1 — Return Stock (Cancel & Restore Inventory)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Safely cancels the sale and immediately restores all sold bags ({selectedSaleIds.reduce((acc, id) => acc + (db.sales.find(s => s.id === id)?.totalBags || 0), 0)} bags) back into active warehouse stock.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    deleteDestination === 'returns'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteDestination"
                    value="returns"
                    checked={deleteDestination === 'returns'}
                    onChange={() => setDeleteDestination('returns')}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Option 2 — Move to Returns (Customer Return Workflow)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Transfers the transaction into the Returns section as usable customer returns, generating return audit numbers and re-crediting stock.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    deleteDestination === 'recycle_bin'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteDestination"
                    value="recycle_bin"
                    checked={deleteDestination === 'recycle_bin'}
                    onChange={() => setDeleteDestination('recycle_bin')}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-amber-600" />
                      <span>Option 3 — Move to Recycle Bin (Archive Only)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Archives the invoice into Recycle Bin without altering inventory stock balances (for write-offs or accounting archives).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Invoice Action *
              </label>
              <input
                type="text"
                value={deleteSalesReason}
                onChange={e => setDeleteSalesReason(e.target.value)}
                placeholder="e.g. Invoiced in error, customer cancelled order, duplicate invoice"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelectedSales}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Execute Action ({selectedSaleIds.length} Selected)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Sales Invoice Modal */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handlePostSale}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold">New Sales Dispatch Invoice</h3>
                <p className="text-xs text-slate-300">Inventory will be deducted automatically upon confirmation.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSaleOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* POS Barcode / SKU Quick Scanner Bar for Shopping Mart & Small Business Mode */}
              {mode !== 'factory' && (
                <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={barcodeScanInput}
                      onChange={e => setBarcodeScanInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodeScanAdd(barcodeScanInput);
                        }
                      }}
                      placeholder="Scan Barcode or enter SKU / Product Name and press Enter to add to cart..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 font-mono outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodeScanAdd(barcodeScanInput)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
                  >
                    + Scan / Add Item
                  </button>
                </div>
              )}

              {/* Customer and Sale Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Party Name {mode === 'factory' ? '*' : '(Walk-In or Select)'}
                  </label>
                  <input
                    type="text"
                    list="sales-customers-list"
                    value={customerName}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomerName(val);
                      const matched = (db.customers || []).find(
                        c => c.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched && matched.phone) {
                        setCustomerPhone(matched.phone);
                      }
                    }}
                    placeholder={mode === 'factory' ? 'e.g. Al-Madina Traders' : 'Walk-In Customer'}
                    required={mode === 'factory'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                  <datalist id="sales-customers-list">
                    {(db.customers || []).map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0300-0000000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Product Dispatch Items
                    </label>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isPriceLocked
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isPriceLocked ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>🔒 Price Locked (Read-Only Rate)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>🔓 Price Unlocked (Manual Rate Editable)</span>
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Product Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {saleLines.map((line, idx) => {
                    const prod = db.products.find(p => p.id === line.productId);
                    const sizes = prod?.bagSizes || (mode === 'factory' ? [50] : [1]);
                    const balance = storage.getStockBalance(line.productId, line.bagSizeKg);
                    const available = balance ? balance.availableBags : 0;
                    const isInsufficient =
                      prod?.itemType !== 'service' &&
                      !db.settings.allowNegativeInventory &&
                      available < line.bags;
                    const configuredRate = getApplicableRate(line.productId, line.bagSizeKg);
                    const displayRate = isPriceLocked ? configuredRate : line.unitPrice;
                    const displayRateStr = isPriceLocked
                      ? String(configuredRate)
                      : line.unitPriceInput !== undefined
                      ? line.unitPriceInput
                      : String(line.unitPrice ?? '');

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs grid grid-cols-12 gap-2 items-center ${
                          isInsufficient
                            ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* Product Select (col 4) */}
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] text-slate-400">Product</label>
                          <select
                            value={line.productId}
                            onChange={e => {
                              const newProdId = e.target.value;
                              const p = db.products.find(pr => pr.id === newProdId);
                              const newSize = mode === 'factory' ? p?.bagSizes[0] || 50 : 1;
                              const autoRate = getApplicableRate(newProdId, newSize);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx] = {
                                  ...copy[idx],
                                  productId: newProdId,
                                  bagSizeKg: newSize,
                                  unitPrice: autoRate,
                                  unitPriceInput: String(autoRate),
                                };
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            {db.products
                              .filter(p => p.isActive)
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nameEn} ({p.nameUr})
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Bag Size or Unit (col 2) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-400">
                            {mode === 'factory' ? 'Bag Size' : 'Unit'}
                          </label>
                          {mode === 'factory' ? (
                            <select
                              value={line.bagSizeKg}
                              onChange={e => {
                                const size = Number(e.target.value);
                                const autoRate = getApplicableRate(line.productId, size);
                                setSaleLines(prev => {
                                  const copy = [...prev];
                                  copy[idx] = {
                                    ...copy[idx],
                                    bagSizeKg: size,
                                    unitPrice: autoRate,
                                    unitPriceInput: String(autoRate),
                                  };
                                  return copy;
                                });
                              }}
                              className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                            >
                              {sizes.map(s => (
                                <option key={s} value={s}>
                                  {s} kg
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold truncate">
                              {prod?.unit || 'Piece'}
                            </div>
                          )}
                        </div>

                        {/* Bags / Qty Count (col 2) */}
                        <div className="col-span-4 sm:col-span-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{mode === 'factory' ? 'Bags' : 'Qty'}</span>
                            <span className={isInsufficient ? 'text-rose-600 font-bold' : ''}>
                              {prod?.itemType === 'service' ? '(Service)' : `(Avail: ${available})`}
                            </span>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={line.bags}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx] = {
                                  ...copy[idx],
                                  bags: isNaN(val) ? 0 : Math.max(0, val),
                                };
                                return copy;
                              });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        {/* Unit Price / Product Rate (col 2) - Admin Lock/Unlock Controlled (Requirement 1) */}
                        <div className="col-span-4 sm:col-span-2">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            {isPriceLocked ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span>Locked Rate ({currency})</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-500" />
                                <span>Rate / Bag ({currency})</span>
                              </>
                            )}
                          </div>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            readOnly={isPriceLocked}
                            disabled={isPriceLocked}
                            value={displayRateStr}
                            onChange={e => {
                              if (isPriceLocked) return;
                              const rawVal = e.target.value;
                              if (rawVal === '') {
                                setSaleLines(prev => {
                                  const copy = [...prev];
                                  copy[idx] = {
                                    ...copy[idx],
                                    unitPrice: 0,
                                    unitPriceInput: '',
                                  };
                                  return copy;
                                });
                                return;
                              }
                              const parsed = Number(rawVal);
                              if (isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
                                return;
                              }
                              setSaleLines(prev => {
                                const copy = [...prev];
                                copy[idx] = {
                                  ...copy[idx],
                                  unitPrice: parsed,
                                  unitPriceInput: rawVal,
                                };
                                return copy;
                              });
                            }}
                            className={`w-full p-1.5 rounded-lg border font-mono font-bold outline-none transition-colors ${
                              isPriceLocked
                                ? !displayRate || displayRate <= 0
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 cursor-not-allowed select-none'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-not-allowed select-none'
                                : !displayRate || displayRate <= 0
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-indigo-500'
                                : 'bg-white dark:bg-slate-900 border-emerald-400 dark:border-emerald-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                            }`}
                            title={
                              isPriceLocked
                                ? 'Rate is locked by Administrator in Admin Panel → Price/Rate Control'
                                : 'Price editing is unlocked — you can enter a transaction-specific rate for this invoice'
                            }
                          />
                          {(!displayRate || displayRate <= 0) && (
                            <span className="text-[9px] text-rose-600 font-semibold block">Rate required</span>
                          )}
                          {!isPriceLocked && configuredRate > 0 && displayRate !== configuredRate && (
                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono block">
                              Default: {currency} {configuredRate.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Total & Delete (col 2) */}
                        <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                          <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                            {currency} {(line.bags * (displayRate || 0)).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment & Editable Discount Details (Task 1 & 2) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="cash">Cash (نقد)</option>
                      <option value="bank_transfer">Bank Transfer (بینک)</option>
                      <option value="cheque">Cheque (چیک)</option>
                      <option value="credit">Credit / Udhaar (ادھار)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="partial">Partial Payment</option>
                      <option value="credit">Unpaid / Full Credit</option>
                    </select>
                  </div>

                  {/* Dual Editable Discount: Discount % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={discountPercent}
                      onChange={e => {
                        const val = e.target.value;
                        setDiscountPercent(val);
                        const p = parseFloat(val);
                        if (!isNaN(p) && p > 0 && subtotal > 0) {
                          setDiscount(String(Math.round((subtotal * p) / 100)));
                        } else {
                          setDiscount('0');
                        }
                      }}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>

                  {/* Dual Editable Discount: Discount Amount in PKR */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Discount ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={e => {
                        const val = e.target.value;
                        setDiscount(val);
                        const pkr = parseFloat(val);
                        if (!isNaN(pkr) && pkr > 0 && subtotal > 0) {
                          setDiscountPercent(((pkr / subtotal) * 100).toFixed(1));
                        } else {
                          setDiscountPercent('');
                        }
                      }}
                      placeholder="e.g. 2500"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>

                  {paymentStatus === 'partial' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Paid Amount ({currency}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={grandTotal}
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {mode !== 'factory' && paymentMethod === 'cash' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Cash Received from Customer ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        placeholder={String(grandTotal)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Change to Return:
                      </span>
                      <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                        {currency}{' '}
                        {Math.max(0, (Number(cashTendered) || 0) - grandTotal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Totals Summary Bar */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span>Total {mode === 'factory' ? 'Bags' : 'Items'}: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{totalBags}</strong>
                    {mode === 'factory' && (
                      <>
                        <span className="mx-2 text-slate-300">|</span>
                        <span>Total Weight: </span>
                        <strong className="font-mono text-slate-900 dark:text-white">{totalWeightKg.toLocaleString()} kg</strong>
                      </>
                    )}
                    <span className="mx-2 text-slate-300">|</span>
                    <span>Gross Subtotal: </span>
                    <strong className="font-mono text-slate-900 dark:text-white">{currency} {subtotal.toLocaleString()}</strong>
                    {discountVal > 0 && (
                      <>
                        <span className="mx-2 text-slate-300">|</span>
                        <span>Discount: </span>
                        <strong className="font-mono text-rose-600">
                          - {currency} {discountVal.toLocaleString()} ({discountPercent || ((discountVal/subtotal)*100).toFixed(1)}%)
                        </strong>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Final Net Total</div>
                      <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {currency} {grandTotal.toLocaleString()}
                      </div>
                    </div>
                    {paymentStatus !== 'paid' && (
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Outstanding Balance</div>
                        <div className="text-base font-bold font-mono text-rose-600">
                          {currency} {balanceAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewSaleOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Post Sales Invoice</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Invoice {selectedSaleDetail.invoiceNo}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSaleDetail.customerName} · Date: {selectedSaleDetail.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold uppercase">{selectedSaleDetail.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold uppercase text-indigo-600">{selectedSaleDetail.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {currency} {(selectedSaleDetail.subtotal || selectedSaleDetail.grandTotal).toLocaleString()}
                  </span>
                </div>
                {selectedSaleDetail.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>
                      Discount ({selectedSaleDetail.discountPercent ? `${selectedSaleDetail.discountPercent}%` : `${(((selectedSaleDetail.discount) / (selectedSaleDetail.subtotal || selectedSaleDetail.grandTotal)) * 100).toFixed(1)}%`}):
                    </span>
                    <span className="font-mono font-bold">
                      - {currency} {selectedSaleDetail.discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Final Net Total:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {currency} {selectedSaleDetail.grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold">
                    {currency} {(selectedSaleDetail.paidAmount || 0).toLocaleString()}
                  </span>
                </div>
                {selectedSaleDetail.balanceAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Outstanding Balance:</span>
                    <span className="font-mono">{currency} {selectedSaleDetail.balanceAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-xs font-bold uppercase text-slate-500">Invoice Items</div>
              {selectedSaleDetail.lines.map((l, i) => (
                <div key={i} className="p-2.5 border rounded-xl flex justify-between text-xs">
                  <div>
                    <div className="font-bold">
                      {l.productNameEn}{' '}
                      {mode === 'factory' ? `(${l.bagSizeKg} kg)` : l.unit ? `(${l.unit})` : ''}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {l.bags} {mode === 'factory' ? 'bags' : l.unit || 'units'} @ {currency} {l.unitPrice}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-indigo-600">
                    {currency} {l.lineTotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetSale = selectedSaleDetail;
                    setSelectedSaleDetail(null);
                    setThermalPaperWidth(58);
                    setThermalPreviewSale(targetSale);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all"
                >
                  <Receipt className="w-4 h-4" />
                  <span>58mm / 80mm Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectPrintSaleInvoice(selectedSaleDetail.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-98"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSaleInvoicePdf(selectedSaleDetail.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 58mm / 80mm Thermal Receipt Preview & Direct Print Modal */}
      {thermalPreviewSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thermal POS Receipt ({thermalPaperWidth}mm)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {thermalPreviewSale.invoiceNo} • {db.profile?.businessName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setThermalPaperWidth(58)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    thermalPaperWidth === 58
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setThermalPaperWidth(80)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    thermalPaperWidth === 80
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setThermalPreviewSale(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-950 overflow-y-auto flex-1 flex justify-center">
              <iframe
                title="Thermal Receipt Preview"
                srcDoc={generateThermalReceiptHtml(thermalPreviewSale, db.profile, {
                  paperWidthMm: thermalPaperWidth,
                  cashReceived:
                    Number(cashTendered) > 0
                      ? Number(cashTendered)
                      : thermalPreviewSale.paidAmount || thermalPreviewSale.grandTotal,
                  changeDue: Math.max(
                    0,
                    (Number(cashTendered) > 0
                      ? Number(cashTendered)
                      : thermalPreviewSale.paidAmount || thermalPreviewSale.grandTotal) -
                      thermalPreviewSale.grandTotal
                  ),
                  cashierName: thermalPreviewSale.createdBy || currentUser,
                  showBarcode: db.profile?.printerConfig?.showBarcodeOnReceipt ?? true,
                  showCustomer: db.profile?.printerConfig?.showCustomerOnReceipt ?? true,
                  showTax: db.profile?.printerConfig?.showTaxOnReceipt ?? true,
                })}
                className={`bg-white shadow-md border border-slate-300 rounded ${
                  thermalPaperWidth === 58 ? 'w-[235px]' : 'w-[315px]'
                } min-h-[420px]`}
              />
            </div>

            <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setThermalPreviewSale(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSaleInvoicePdf(thermalPreviewSale.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>A4 PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintThermalReceipt(thermalPreviewSale, thermalPaperWidth)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print {thermalPaperWidth}mm Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel Invoice {cancelModalSale.invoiceNo}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Cancelling this invoice will automatically reverse all stock deductions and log an audit reversal.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Order cancelled by party; incorrect price entered."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalSale(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
