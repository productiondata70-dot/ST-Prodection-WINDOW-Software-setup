import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Eye,
  Filter,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { AppDatabase, AppLanguage } from '../types';
import { generateReportPdf, ReportFilterOptions } from '../services/pdfGenerator';
import { translations } from '../services/translations';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';
import { generateThermalReceiptHtml, printHtmlDocument } from '../services/barcodeAndReceipt';

interface PdfCenterViewProps {
  db: AppDatabase;
  language: AppLanguage;
}

export const PdfCenterView: React.FC<PdfCenterViewProps> = ({ db, language }) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';
  const activeMode = normalizeBusinessMode(db.profile?.businessType);
  const modeCfg = getBusinessModeConfig(activeMode);
  const isRetailOrSmallBiz = activeMode !== 'factory';

  const [reportType, setReportType] = useState<ReportFilterOptions['reportType']>('dashboard_summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedSaleId, setSelectedSaleId] = useState<string>(db.sales[0]?.id || '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>('report.pdf');
  const [previewMode, setPreviewMode] = useState<'pdf_engine' | 'document_sheet'>('pdf_engine');
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGeneratePdf = (download = true) => {
    try {
      setGenerationError(null);
      const { doc, filename } = generateReportPdf(db, {
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        productId: selectedProduct !== 'all' ? selectedProduct : undefined,
        selectedRecordId: selectedSaleId || undefined,
      });

      setCurrentFilename(filename);

      if (download) {
        doc.save(filename);
      } else {
        // Generate Blob URL for reliable cross-browser/desktop webview display (Fix Change 1)
        const blob = doc.output('blob');
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        const blobUrl = URL.createObjectURL(blob);
        setPreviewPdfUrl(blobUrl);
        setPreviewOpen(true);
      }
    } catch (err: any) {
      const errorMsg = 'Error generating PDF report: ' + (err.message || 'Unknown error');
      setGenerationError(errorMsg);
      alert(errorMsg);
    }
  };

  const handleTriggerPrint = () => {
    // Attempt printing via preview iframe or window print dialog
    const iframe = document.getElementById('st-pdf-preview-iframe') as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch (e) {
        // Fallback to window print
      }
    }
    window.print();
  };

  const handleOpenInNewWindow = () => {
    if (previewPdfUrl) {
      window.open(previewPdfUrl, '_blank');
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const allReportsList = [
    {
      key: 'dashboard_summary',
      title: `Executive ${modeCfg.shortLabel} Summary`,
      description: isRetailOrSmallBiz
        ? 'Comprehensive overview of available stock, POS sales revenue, purchases, expenses, and customer receivables.'
        : 'Comprehensive overview of production totals, available inventory, and sales dispatch ledger.',
      icon: FileSpreadsheet,
      allowed: true,
    },
    {
      key: 'production_summary',
      title: 'Production Report & Percentages',
      description: 'Shift-wise breakdown, product percentages, bag counts, and machine running duration.',
      icon: FileText,
      allowed: activeMode === 'factory',
    },
    {
      key: 'barcode_catalog',
      title:
        activeMode === 'shopping_mart'
          ? 'Product Catalog & Barcodes PDF'
          : activeMode === 'small_business'
          ? 'Product / Service List PDF'
          : 'Master Product Catalog PDF',
      description: 'Master product list with SKUs, scannable barcode numbers, units, and selling prices.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'stock_summary',
      title:
        activeMode === 'shopping_mart'
          ? 'Stock Summary PDF'
          : activeMode === 'small_business'
          ? 'Stock Report PDF'
          : 'Flour / Grain Stock Report',
      description: isRetailOrSmallBiz
        ? 'Detailed product-wise stock quantities, units, sale rates, and stock health status.'
        : 'Detailed product-wise bag balances, warehouse location, and available kilograms.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'low_stock_alert',
      title: 'Low Stock & Out-of-Stock PDF',
      description: 'Products at or below minimum stock alert threshold requiring immediate reorder.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'stock_valuation',
      title: 'Stock Valuation Report PDF',
      description: 'Inventory valuation comparing purchase cost value, retail sale value, and potential margin.',
      icon: FileSpreadsheet,
      allowed: true,
    },
    {
      key: 'sales_summary',
      title:
        activeMode === 'shopping_mart'
          ? 'POS Sales Report PDF'
          : activeMode === 'small_business'
          ? 'Sales Report PDF'
          : 'Sales Report & Dispatches',
      description: 'Customer invoices, total amounts, sold quantities, payment methods, and receivables balances.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'sales_invoice',
      title:
        activeMode === 'shopping_mart'
          ? 'Invoice / Receipt PDF'
          : activeMode === 'small_business'
          ? 'Customer Invoice PDF'
          : 'Official Sales Invoice',
      description: 'Single customer invoice with scannable barcode, line items, NTN, discounts, and 58mm/80mm thermal print.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'purchases_summary',
      title: isRetailOrSmallBiz ? 'Purchase Report PDF' : 'Mill Purchase Report',
      description: 'Supplier purchase invoices, restocked quantities, unit costs, and supplier payable balances.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'supplier_ledger',
      title: 'Supplier Report & Payables PDF',
      description: 'Complete supplier directory, total supplied volume, payments made, and payable balances.',
      icon: FileText,
      allowed: isRetailOrSmallBiz,
    },
    {
      key: 'customer_supplier_ledger',
      title:
        activeMode === 'small_business'
          ? 'Customer Due Report PDF'
          : 'Customer Ledger & Balances PDF',
      description: 'Complete directory of customer receivables (udhaar / credit dues) and party balances.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'expenses_summary',
      title: 'Expense Report PDF',
      description: 'Categorized expense vouchers, payment methods, and total operating expenditure.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'profit_loss',
      title:
        activeMode === 'shopping_mart'
          ? 'Profit Summary PDF'
          : 'Profit & Loss (P&L) PDF',
      description: 'Gross revenue, discounts, COGS estimate, operating expenses, and net profit/loss.',
      icon: FileSpreadsheet,
      allowed: true,
    },
    {
      key: 'returns_summary',
      title: 'Customer & Supplier Returns PDF',
      description: 'Returned goods register, item condition (usable/damaged), and customer refund totals.',
      icon: FileText,
      allowed: true,
    },
    {
      key: 'stock_ledger',
      title: 'Stock Movements Audit Ledger',
      description: 'Sequential in/out stock movements, audit adjustments, and timestamped user tracking.',
      icon: FileText,
      allowed: true,
    },
  ];
  const reportsList = allReportsList.filter(r => r.allowed);

  const handlePrintThermalSelectedInvoice = async (paperWidthMm: 58 | 80) => {
    const sale = db.sales.find(s => s.id === selectedSaleId) || db.sales[0];
    if (!sale) {
      setGenerationError('No sale invoice available to print.');
      return;
    }
    const html = generateThermalReceiptHtml(sale, db.profile, { paperWidthMm });
    await printHtmlDocument(html, {
      printerName: db.profile?.printerConfig?.printerName,
      silent: db.profile?.printerConfig?.silentPrint,
      paperWidthMm,
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.pdfCenter} (پی ڈی ایف رپورٹس و پرنٹنگ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate formal A4 print-ready reports with business branding, signature lines, and developer credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGeneratePdf(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>{t.preview}</span>
          </button>
          <button
            onClick={() => handleGeneratePdf(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadPdf}</span>
          </button>
          <button
            onClick={handleTriggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{t.print}</span>
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportsList.map(rep => {
          const Icon = rep.icon;
          const isSelected = reportType === rep.key;

          return (
            <button
              key={rep.key}
              onClick={() => setReportType(rep.key as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm ring-2 ring-purple-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">{rep.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {rep.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Report Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span>Report Generation Parameters & Date Bounds</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Filter by Product
            </label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            >
              <option value="all">All Configured Products</option>
              {db.products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nameEn} ({p.nameUr})
                </option>
              ))}
            </select>
          </div>

          {reportType === 'sales_invoice' && (
            <div className="sm:col-span-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Specific Sales Invoice *
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSaleId}
                  onChange={e => setSelectedSaleId(e.target.value)}
                  className="flex-1 min-w-[240px] px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none"
                >
                  {db.sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.invoiceNo} — {s.customerName} ({s.date}) — {currency} {s.grandTotal.toLocaleString()} [{s.paymentStatus.toUpperCase()}]
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handlePrintThermalSelectedInvoice(58)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print 58mm Thermal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintThermalSelectedInvoice(80)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print 80mm Thermal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Printable Preview Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Document Document Template Preview
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Layout: A4 Portrait</span>
          </div>
        </div>

        {/* Formatted Sheet Preview */}
        <div className="max-w-2xl mx-auto p-6 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6 text-xs text-slate-800 dark:text-slate-200">
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {db.profile?.businessName || 'ST Production & Stock Manager'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {db.profile?.address} · Ph: {db.profile?.contactNumber}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Owner: {db.profile?.ownerName} · Manager: {db.profile?.factoryManager}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
              <div>Report: {reportType.toUpperCase().replace('_', ' ')}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {reportType === 'dashboard_summary' && 'EXECUTIVE DASHBOARD OPERATIONAL SUMMARY'}
              {reportType === 'production_summary' && 'PRODUCTION LOG & PRODUCT PERCENTAGES'}
              {reportType === 'stock_summary' && 'CURRENT MILL INVENTORY REGISTER'}
              {reportType === 'sales_summary' && 'SALES INVOICES & DISPATCH REGISTER'}
            </div>
            <p className="text-[11px] text-slate-500">
              Generated from persistent local database ledger. All calculations reflect verified shift entries.
            </p>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[11px] text-slate-500">
            <div>Prepared By: ____________________</div>
            <div>Supervisor: ____________________</div>
            <div>Authorized Sign: ____________________</div>
          </div>

          <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700">
            ST Production and Stock Manager · ST Software & Apps developers Company
          </div>
        </div>
      </div>

      {/* PDF Preview Modal with Direct Object Embed, Print Controls, and Dual-Mode (Change 1) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight">
                    Document Preview: {reportType.toUpperCase().replace('_', ' ')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {currentFilename} · Generated from local verified ledger
                  </div>
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pdf_engine')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    previewMode === 'pdf_engine'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PDF Viewer
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('document_sheet')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    previewMode === 'document_sheet'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Document Sheet
                </button>
              </div>

              <div className="flex items-center gap-2">
                {previewPdfUrl && (
                  <button
                    type="button"
                    onClick={handleOpenInNewWindow}
                    title="Open PDF in a new browser tab or external window"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-300" />
                    <span>Open in Tab</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleGeneratePdf(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print via Windows Dialog</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                  aria-label="Close Preview"
                >
                  <span className="text-sm font-bold">✕</span>
                </button>
              </div>
            </div>

            {/* Document Content / Embedded Object or Sheet */}
            <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
              {previewMode === 'pdf_engine' && previewPdfUrl ? (
                <iframe
                  id="st-pdf-preview-iframe"
                  src={previewPdfUrl}
                  title="PDF Preview"
                  className="w-full flex-1 border-0"
                />
              ) : (
                /* High-fidelity Document Sheet Render */
                <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                  <div className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-xs text-slate-800 dark:text-slate-200">
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                          {db.profile?.businessName || 'ST PRODUCTION AND STOCK MANAGER'}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">
                          {db.profile?.businessType.toUpperCase()} · {db.profile?.address} · Ph: {db.profile?.contactNumber}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Proprietor: {db.profile?.ownerName} · Plant Supervisor: {db.profile?.plantSupervisor}
                        </p>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-500">
                        <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                        <div>Time: {new Date().toLocaleTimeString()}</div>
                        <div className="text-purple-600 font-bold mt-1">A4 Printable Format</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-center text-sm uppercase text-slate-900 dark:text-white">
                      {reportType.toUpperCase().replace('_', ' ')}
                    </div>

                    {/* Operational Table */}
                    {reportType === 'dashboard_summary' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] text-slate-500">Total Production</span>
                            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                              {db.productionSessions.reduce((acc, p) => acc + p.totalWeightKg, 0).toLocaleString()} kg
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {db.productionSessions.reduce((acc, p) => acc + p.totalBags, 0).toLocaleString()} bags
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] text-slate-500">Available Stock in Mill</span>
                            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                              {db.stockBalances.reduce((acc, s) => acc + s.availableWeightKg, 0).toLocaleString()} kg
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {db.stockBalances.reduce((acc, s) => acc + s.availableBags, 0).toLocaleString()} bags
                            </span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Active Products Configured:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{db.products.length} products</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Production Sessions Logged:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{db.productionSessions.length} shifts</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Sales Transactions:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{db.sales.length} invoices</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-600 dark:text-slate-400">Cloud Storage Sync:</span>
                            <span className="font-bold text-emerald-600">
                              {db.settings.googleDriveConnected ? 'Active (Google Drive)' : 'Persistent Local Storage'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === 'production_summary' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                              <th className="py-2">Date</th>
                              <th className="py-2">Shift</th>
                              <th className="py-2">Duration</th>
                              <th className="py-2 text-right">Bags</th>
                              <th className="py-2 text-right">Weight (kg)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {db.productionSessions.map(ps => (
                              <tr key={ps.id}>
                                <td className="py-2 font-mono">{ps.date}</td>
                                <td className="py-2 font-bold">{ps.shiftName} ({ps.recordCode})</td>
                                <td className="py-2 font-mono text-blue-600">{ps.durationFormatted}</td>
                                <td className="py-2 text-right font-mono">{ps.totalBags}</td>
                                <td className="py-2 text-right font-mono font-bold">{ps.totalWeightKg.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {reportType === 'stock_summary' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                              <th className="py-2">Product</th>
                              <th className="py-2">{isRetailOrSmallBiz ? 'Unit' : 'Bag Size'}</th>
                              <th className="py-2 text-right">{isRetailOrSmallBiz ? 'Available Qty' : 'Available Bags'}</th>
                              <th className="py-2 text-right">{isRetailOrSmallBiz ? 'Sale Price' : 'Weight (kg)'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {db.stockBalances.map(sb => {
                              const prod = db.products.find(p => p.id === sb.productId);
                              return (
                                <tr key={`${sb.productId}-${sb.bagSizeKg}`}>
                                  <td className="py-2 font-bold">{prod?.nameEn || 'Item'} ({prod?.nameUr || ''})</td>
                                  <td className="py-2 font-mono">
                                    {isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${sb.bagSizeKg} kg`}
                                  </td>
                                  <td className="py-2 text-right font-mono">{sb.availableBags}</td>
                                  <td className="py-2 text-right font-mono font-bold">
                                    {isRetailOrSmallBiz
                                      ? `${currency} ${(sb.rate || prod?.rate || 0).toLocaleString()}`
                                      : sb.availableWeightKg.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {reportType === 'sales_summary' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                              <th className="py-2">Invoice #</th>
                              <th className="py-2">Date</th>
                              <th className="py-2">Customer</th>
                              <th className="py-2 text-right">{isRetailOrSmallBiz ? 'Qty' : 'Bags'}</th>
                              <th className="py-2 text-right">Amount</th>
                              <th className="py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {db.sales.map(s => (
                              <tr key={s.id}>
                                <td className="py-2 font-mono font-bold">{s.invoiceNo}</td>
                                <td className="py-2 font-mono">{s.date}</td>
                                <td className="py-2 font-medium">{s.customerName}</td>
                                <td className="py-2 text-right font-mono">{s.totalBags}</td>
                                <td className="py-2 text-right font-mono font-bold">{currency} {s.grandTotal.toLocaleString()}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Signatures & Watermark */}
                    <div className="pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[11px] text-slate-500">
                      <div>Prepared By: ____________________</div>
                      <div>Supervisor: ____________________</div>
                      <div>Authorized Signature: ____________________</div>
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700">
                      ST Production and Stock Manager · ST Software & Apps developers Company
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
