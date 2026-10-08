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

interface PdfCenterViewProps {
  db: AppDatabase;
  language: AppLanguage;
}

export const PdfCenterView: React.FC<PdfCenterViewProps> = ({ db, language }) => {
  const t = translations[language] || translations.en;
  const currency = db.profile?.currency || 'PKR';

  const [reportType, setReportType] = useState<ReportFilterOptions['reportType']>('dashboard_summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const handleGeneratePdf = (download = true) => {
    const { doc, filename } = generateReportPdf(db, {
      reportType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      productId: selectedProduct !== 'all' ? selectedProduct : undefined,
    });

    if (download) {
      doc.save(filename);
    } else {
      const blobUrl = doc.output('bloburl');
      setPreviewPdfUrl(blobUrl.toString());
      setPreviewOpen(true);
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const reportsList = [
    {
      key: 'dashboard_summary',
      title: 'Executive Dashboard Summary',
      description: 'Comprehensive overview of production totals, available inventory, and sales dispatch ledger.',
      icon: FileSpreadsheet,
    },
    {
      key: 'production_summary',
      title: 'Shift Production Log & Percentages',
      description: 'Shift-wise breakdown, product percentages, bag counts, and machine running duration.',
      icon: FileText,
    },
    {
      key: 'stock_summary',
      title: 'Stock & Inventory Position',
      description: 'Detailed product-wise bag balances, warehouse location, and available kilograms.',
      icon: FileText,
    },
    {
      key: 'sales_summary',
      title: 'Sales Register & Dispatches',
      description: 'Customer invoices, total amounts, dispatch bags, and receivables balances.',
      icon: FileText,
    },
  ];

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
            ST Production and Stock Manager · Developed by Tanzeel | WhatsApp 03000081849
          </div>
        </div>
      </div>

      {/* PDF Preview Iframe Modal */}
      {previewOpen && previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">PDF Report Preview</span>
              <button
                onClick={() => {
                  setPreviewOpen(false);
                  if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
                }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
              >
                Close Preview
              </button>
            </div>
            <iframe src={previewPdfUrl} className="w-full flex-1 border-0" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
};
