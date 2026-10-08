import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AppDatabase,
  BusinessProfile,
  ProductionSession,
  SaleRecord,
  StockMovement,
  ReturnRecord,
  WasteRecord,
} from '../types';
import { normalizeBusinessMode, getBusinessModeConfig } from './businessMode';
import { generateBarcodePngDataUrl } from './barcodeAndReceipt';

export interface ReportFilterOptions {
  reportType:
    | 'dashboard_summary'
    | 'production_summary'
    | 'production_detail'
    | 'stock_summary'
    | 'stock_valuation'
    | 'low_stock_alert'
    | 'stock_ledger'
    | 'sales_summary'
    | 'sales_invoice'
    | 'purchases_summary'
    | 'returns_summary'
    | 'expenses_summary'
    | 'profit_loss'
    | 'customer_supplier_ledger'
    | 'supplier_ledger'
    | 'barcode_catalog'
    | 'waste_summary'
    | 'business_profile';
  startDate?: string;
  endDate?: string;
  productId?: string;
  shiftName?: string;
  customerName?: string;
  selectedRecordId?: string;
}

// Clean helper for standard PDF Latin-1 fonts
export function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  // Clean string safely without destroying text characters
  return String(text).trim();
}

export function generateReportPdf(
  db: AppDatabase,
  options: ReportFilterOptions
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const profile = db.profile || {
    businessName: 'ST Production & Stock Manager',
    businessType: 'flour_mill',
    address: 'Industrial Area',
    contactNumber: '',
    email: 'info@millmanager.com',
    ownerName: 'Proprietor',
    currency: 'PKR',
    plantSupervisor: 'Plant Supervisor',
    factoryManager: 'Factory Manager',
    registrationNumber: 'REG-MILL-001',
    ntnNumber: '1234567-8',
  } as BusinessProfile;

  const activeMode = normalizeBusinessMode(profile.businessType);
  const modeCfg = getBusinessModeConfig(activeMode);
  const isRetailOrSmallBiz = activeMode === 'shopping_mart' || activeMode === 'small_business';
  const unitHeaderLabel = isRetailOrSmallBiz ? 'Unit' : 'Bag Size';
  const qtyHeaderLabel = isRetailOrSmallBiz ? 'Qty' : 'Bags';

  const currency = profile.currency || 'PKR';
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB');
  const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Common Header Drawer for all pages
  const drawPageHeader = (pageTitle: string, subTitle?: string) => {
    // Top banner color band
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 28, 'F');

    // Accent line
    doc.setFillColor(37, 99, 235); // Blue 600
    doc.rect(0, 28, 210, 1.5, 'F');

    // Business Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    const bizName = profile.businessName || modeCfg.label;
    doc.text(bizName.toUpperCase(), 14, 11);

    // Business Meta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // Slate 300
    const metaParts = [
      modeCfg.shortLabel.toUpperCase(),
      profile.address || 'Main Commercial Area',
    ];
    if (profile.contactNumber) metaParts.push(`Ph: ${profile.contactNumber}`);
    if (profile.ntnNumber) metaParts.push(`NTN/GST: ${profile.ntnNumber}`);
    doc.text(metaParts.join('  |  '), 14, 18);

    // Report Title badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(191, 219, 254); // Blue 200
    doc.text(pageTitle.toUpperCase(), 14, 24);

    // Right-aligned Generation Date / Time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    doc.text(`Printed: ${dateFormatted} ${timeFormatted}`, 196, 11, { align: 'right' });
    if (subTitle) {
      doc.text(subTitle, 196, 18, { align: 'right' });
    }
  };

  // Common Footer Drawer for all pages
  const drawPageFooter = (data: { pageNumber: number; pageCount?: number }) => {
    const pageY = 282;

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageY, 196, pageY);

    // Signatures
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By: __________________', 14, pageY + 5);
    doc.text(
      isRetailOrSmallBiz ? 'Store Manager: __________________' : 'Plant Supervisor: __________________',
      80,
      pageY + 5
    );
    doc.text('Authorized Sign: __________________', 146, pageY + 5);

    // Bottom branding line
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ST Production & Stock Manager  |  ST Software & Apps developers Company',
      14,
      pageY + 10
    );
    doc.text(`Page ${data.pageNumber}`, 196, pageY + 10, { align: 'right' });
  };

  let reportTitle = 'BUSINESS REPORT';
  let reportSubtitle = '';

  switch (options.reportType) {
    case 'dashboard_summary': {
      reportTitle = `Executive ${modeCfg.shortLabel} Summary`;
      reportSubtitle = `${profile.businessName || modeCfg.label} — Key Performance Indicators`;
      drawPageHeader(reportTitle, reportSubtitle);

      const totalProdWeight = db.productionSessions.reduce((acc, p) => acc + p.totalWeightKg, 0);
      const totalProdBags = db.productionSessions.reduce((acc, p) => acc + p.totalBags, 0);
      const totalStockWeight = db.stockBalances.reduce((acc, s) => acc + s.availableWeightKg, 0);
      const totalStockBags = db.stockBalances.reduce((acc, s) => acc + s.availableBags, 0);
      const totalSalesAmount = db.sales.reduce(
        (acc, s) => (s.status === 'completed' ? acc + s.grandTotal : acc),
        0
      );
      const totalSalesBags = db.sales.reduce(
        (acc, s) => (s.status === 'completed' ? acc + s.totalBags : acc),
        0
      );
      const totalPaidAmount = db.sales.reduce(
        (acc, s) => (s.status === 'completed' ? acc + (s.paidAmount || 0) : acc),
        0
      );
      const totalOutstanding = db.sales.reduce(
        (acc, s) => (s.status === 'completed' ? acc + (s.balanceAmount || 0) : acc),
        0
      );
      const totalPurchasesVal = (db.millPurchases || []).reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      const totalExpensesVal = (db.expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);

      const statsRows = isRetailOrSmallBiz
        ? [
            ['Active Business Mode & Workspace', modeCfg.label, profile.businessName || modeCfg.label],
            ['Total Available Stock Quantity', `${totalStockBags.toLocaleString()} units`, `${db.stockBalances.filter(s => s.availableBags > 0).length} active SKUs`],
            ['Total Sales Revenue (Completed)', `${totalSalesBags.toLocaleString()} units sold`, `${currency} ${totalSalesAmount.toLocaleString()}`],
            ['Total Cash / Bank Collected', `${db.sales.filter(s => s.status === 'completed').length} invoices`, `${currency} ${totalPaidAmount.toLocaleString()}`],
            ['Customer Receivables (Credit Due)', `${(db.customers || []).length} registered customers`, `${currency} ${totalOutstanding.toLocaleString()}`],
            ['Total Supplier Purchases', `${(db.millPurchases || []).length} purchase batches`, `${currency} ${totalPurchasesVal.toLocaleString()}`],
            ['Total Operating Expenses', `${(db.expenses || []).length} expense vouchers`, `${currency} ${totalExpensesVal.toLocaleString()}`],
            ['Configured Catalog Products', `${db.products.filter(p => p.isActive).length} active items`, `${db.products.length} total catalog items`],
            ['Owner & Management', `Owner: ${profile.ownerName || 'Proprietor'}`, `Manager: ${profile.factoryManager || 'Manager'}`],
          ]
        : [
            ['Total Cumulative Production', `${totalProdBags.toLocaleString()} bags`, `${totalProdWeight.toLocaleString()} kg (${(totalProdWeight / 1000).toFixed(2)} MT)`],
            ['Current In-Mill Available Inventory', `${totalStockBags.toLocaleString()} bags`, `${totalStockWeight.toLocaleString()} kg (${(totalStockWeight / 1000).toFixed(2)} MT)`],
            ['Total Flour Dispatched to Customers', `${totalSalesBags.toLocaleString()} bags`, `${currency} ${totalSalesAmount.toLocaleString()}`],
            ['Total Payments Recovered (Cash & Bank)', `${db.sales.filter(s => s.status === 'completed').length} invoices`, `${currency} ${totalPaidAmount.toLocaleString()}`],
            ['Outstanding Receivables (Udhaar / Credit)', 'Pending Ledger Balances', `${currency} ${totalOutstanding.toLocaleString()}`],
            ['Active Master Products Configured', `${db.products.filter(p => p.isActive).length} items active`, `${db.products.length} catalog total`],
            ['Total Production Sessions Logged', `${db.productionSessions.length} shifts recorded`, 'All verified'],
            ['Total Sales Transactions Issued', `${db.sales.length} invoices`, `${db.sales.filter(s => s.paymentStatus === 'paid').length} fully settled`],
            ['Cloud Synchronization Security', db.settings.googleDriveConnected ? 'Active (Connected to Google Drive)' : 'Local Encrypted Storage', db.settings.googleAccountEmail || 'Dedicated Folder'],
            ['Proprietor & Factory Management', `Proprietor: ${profile.ownerName || 'Factory Proprietor'}`, `Supervisor: ${profile.plantSupervisor || 'Manager'}`],
          ];

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Operational Metric & Parameter', 'Volume / Units', 'Financial & Weight Position']],
        body: statsRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
        },
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 50 },
          2: { cellWidth: 52, fontStyle: 'bold', halign: 'right' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'production_summary': {
      reportTitle = 'Daily Shift Production Log';
      reportSubtitle = `Shift Records & Manufactured Flour Yields`;
      drawPageHeader(reportTitle, reportSubtitle);

      let sessions = [...db.productionSessions];
      if (options.startDate) {
        sessions = sessions.filter(s => s.date >= options.startDate!);
      }
      if (options.endDate) {
        sessions = sessions.filter(s => s.date <= options.endDate!);
      }

      const totalBags = sessions.reduce((acc, s) => acc + s.totalBags, 0);
      const totalWeight = sessions.reduce((acc, s) => acc + s.totalWeightKg, 0);

      const tableRows = sessions.map(ps => {
        const prodNames = ps.lines.map(l => `${l.productNameEn} (${l.bagSizeKg}kg: ${l.bagCount})`).join(', ');
        return [
          ps.date,
          `${ps.shiftName}\n(${ps.recordCode})`,
          `${ps.startTime} - ${ps.endTime}\n(${ps.durationFormatted})`,
          prodNames || 'Flour Lines',
          String(ps.totalBags),
          ps.totalWeightKg.toLocaleString(),
          ps.isStockPosted ? 'POSTED' : 'PENDING',
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Date', 'Shift / Code', 'Time / Duration', 'Manufactured Products Breakdown', 'Bags', 'Weight (kg)', 'Stock']],
        body: tableRows,
        foot: [['TOTALS', '', '', `${sessions.length} shifts recorded`, totalBags.toLocaleString(), `${totalWeight.toLocaleString()} kg`, '']],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 26 },
          3: { cellWidth: 62 },
          4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'stock_summary': {
      reportTitle = isRetailOrSmallBiz
        ? 'Current Store Stock & Inventory Summary'
        : 'Current Stock & Inventory Position';
      reportSubtitle = isRetailOrSmallBiz
        ? `${profile.businessName || modeCfg.label} — Available Quantities, Units & Stock Status`
        : `Perpetual Warehouse Stock & Maund Equivalents`;
      drawPageHeader(reportTitle, reportSubtitle);

      const balances = db.stockBalances.filter(sb => {
        if (options.productId && options.productId !== 'all') {
          return sb.productId === options.productId;
        }
        return true;
      });

      const totalBags = balances.reduce((acc, s) => acc + s.availableBags, 0);
      const totalWeight = balances.reduce((acc, s) => acc + s.availableWeightKg, 0);

      if (isRetailOrSmallBiz) {
        let totalRetailVal = 0;
        const retailRows = balances.map(sb => {
          const prod = db.products.find(p => p.id === sb.productId);
          const name = prod ? prod.nameEn : 'Product';
          const rate = sb.rate || prod?.rate || 0;
          const val = sb.availableBags * rate;
          totalRetailVal += val;
          const isLow = sb.availableBags <= (sb.minStockThreshold || 10);
          return [
            name,
            prod?.sku || prod?.barcode || '-',
            prod?.category || 'General',
            prod?.unit || 'Piece',
            sb.availableBags.toLocaleString(),
            `${currency} ${rate.toLocaleString()}`,
            `${currency} ${val.toLocaleString()}`,
            sb.availableBags <= 0 ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK',
          ];
        });

        autoTable(doc, {
          startY: 34,
          margin: { left: 14, right: 14, bottom: 22 },
          head: [['Product Name', 'SKU / Barcode', 'Category', 'Unit', 'Available Qty', 'Sale Price', 'Stock Value', 'Status']],
          body: retailRows,
          foot: [['TOTAL INVENTORY', '', '', '', totalBags.toLocaleString(), '', `${currency} ${totalRetailVal.toLocaleString()}`, '']],
          showHead: 'everyPage',
          showFoot: 'lastPage',
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          footStyles: { fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold', fontSize: 8.5 },
          styles: { fontSize: 7.5, cellPadding: 2.5, valign: 'middle' },
          didDrawPage: data => drawPageFooter(data),
        });
      } else {
        const rows = balances.map(sb => {
          const prod = db.products.find(p => p.id === sb.productId);
          const name = prod ? prod.nameEn : 'Product';
          const maunds = (sb.availableWeightKg / 40).toFixed(1);
          const isLow = sb.availableBags <= sb.minStockThreshold;

          return [
            name,
            prod?.category || 'Flour',
            `${sb.bagSizeKg} kg`,
            `${maunds} mnd`,
            sb.availableBags.toLocaleString(),
            sb.availableWeightKg.toLocaleString(),
            String(sb.minStockThreshold || 10),
            isLow ? 'LOW STOCK' : 'OPTIMAL',
          ];
        });

        autoTable(doc, {
          startY: 34,
          margin: { left: 14, right: 14, bottom: 22 },
          head: [['Product Name', 'Category', 'Bag Size', 'Maund (40kg)', 'Available Bags', 'Available Weight (kg)', 'Min Alert', 'Status']],
          body: rows,
          foot: [['TOTAL INVENTORY', '', '', `${(totalWeight / 40).toFixed(1)} mnd`, totalBags.toLocaleString(), `${totalWeight.toLocaleString()} kg`, '', '']],
          showHead: 'everyPage',
          showFoot: 'lastPage',
          theme: 'grid',
          headStyles: {
            fillColor: [16, 185, 129], // Emerald 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
          },
          footStyles: {
            fillColor: [236, 253, 245],
            textColor: [6, 95, 70],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 42, fontStyle: 'bold' },
            1: { cellWidth: 26 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
            6: { cellWidth: 12, halign: 'center' },
            7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          didDrawPage: data => drawPageFooter(data),
        });
      }
      break;
    }

    case 'stock_valuation': {
      reportTitle = 'Inventory Stock Valuation & Margin Report';
      reportSubtitle = `${profile.businessName || modeCfg.label} — Cost Valuation, Retail Value & Potential Margin`;
      drawPageHeader(reportTitle, reportSubtitle);

      const balances = db.stockBalances.filter(sb => {
        if (options.productId && options.productId !== 'all') {
          return sb.productId === options.productId;
        }
        return true;
      });

      let totalQty = 0;
      let totalCostVal = 0;
      let totalSaleVal = 0;

      const valRows = balances.map(sb => {
        const prod = db.products.find(p => p.id === sb.productId);
        const qty = sb.availableBags;
        const salePrice = sb.rate || prod?.rate || 0;
        const costPrice = prod?.purchasePrice || Math.round(salePrice * 0.8);
        const costVal = qty * costPrice;
        const saleVal = qty * salePrice;
        const marginVal = saleVal - costVal;
        totalQty += qty;
        totalCostVal += costVal;
        totalSaleVal += saleVal;

        return [
          prod?.nameEn || 'Product',
          prod?.sku || prod?.barcode || '-',
          isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${sb.bagSizeKg} kg`,
          qty.toLocaleString(),
          `${currency} ${costPrice.toLocaleString()}`,
          `${currency} ${salePrice.toLocaleString()}`,
          `${currency} ${costVal.toLocaleString()}`,
          `${currency} ${saleVal.toLocaleString()}`,
          `${currency} ${marginVal.toLocaleString()}`,
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Product', 'SKU', unitHeaderLabel, qtyHeaderLabel, 'Cost Rate', 'Sale Rate', 'Cost Value', 'Retail Value', 'Margin']],
        body: valRows,
        foot: [[
          'TOTAL VALUATION',
          '',
          '',
          totalQty.toLocaleString(),
          '',
          '',
          `${currency} ${totalCostVal.toLocaleString()}`,
          `${currency} ${totalSaleVal.toLocaleString()}`,
          `${currency} ${(totalSaleVal - totalCostVal).toLocaleString()}`,
        ]],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'sales_summary': {
      reportTitle = 'Sales Register & Dispatch Ledger';
      reportSubtitle = `Customer Invoices, Recovery Collections & Receivables`;
      drawPageHeader(reportTitle, reportSubtitle);

      let salesList = db.sales.filter(s => s.status === 'completed');
      if (options.startDate) salesList = salesList.filter(s => s.date >= options.startDate!);
      if (options.endDate) salesList = salesList.filter(s => s.date <= options.endDate!);

      const totalBags = salesList.reduce((acc, s) => acc + s.totalBags, 0);
      const totalAmount = salesList.reduce((acc, s) => acc + s.grandTotal, 0);
      const totalPaid = salesList.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
      const totalBalance = salesList.reduce((acc, s) => acc + (s.balanceAmount || 0), 0);

      const rows = salesList.map(s => {
        return [
          s.invoiceNo,
          s.date,
          s.customerName,
          String(s.totalBags),
          isRetailOrSmallBiz ? `${currency} ${(s.discount || 0).toLocaleString()}` : s.totalWeightKg.toLocaleString(),
          `${currency} ${s.grandTotal.toLocaleString()}`,
          `${currency} ${(s.paidAmount || 0).toLocaleString()}`,
          `${currency} ${(s.balanceAmount || 0).toLocaleString()}`,
          s.paymentMethod.toUpperCase().replace('_', ' '),
          s.paymentStatus.toUpperCase(),
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [[
          'Invoice #',
          'Date',
          'Customer Name',
          qtyHeaderLabel,
          isRetailOrSmallBiz ? 'Discount' : 'Weight',
          'Grand Total',
          'Paid',
          'Balance',
          'Method',
          'Status',
        ]],
        body: rows,
        foot: [[
          'TOTALS',
          '',
          `${salesList.length} invoices`,
          totalBags.toLocaleString(),
          '',
          `${currency} ${totalAmount.toLocaleString()}`,
          `${currency} ${totalPaid.toLocaleString()}`,
          `${currency} ${totalBalance.toLocaleString()}`,
          '',
          '',
        ]],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 16 },
          2: { cellWidth: 32, fontStyle: 'bold' },
          3: { cellWidth: 14, halign: 'right' },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 14, halign: 'center' },
          9: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'sales_invoice': {
      // Single Sales Invoice A4 Document
      const sale = db.sales.find(s => s.id === options.selectedRecordId) || db.sales[0];
      reportTitle = `Sales Invoice ${sale ? sale.invoiceNo : ''}`;
      reportSubtitle = `Customer Copy & Goods Dispatch Note`;
      drawPageHeader(reportTitle, reportSubtitle);

      if (!sale) {
        doc.setFontSize(10);
        doc.text('No invoice selected.', 14, 45);
        break;
      }

      // Customer Info Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 33, 182, 24, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 33, 182, 24, 2, 2, 'D');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('BILLED TO CUSTOMER:', 18, 40);

      doc.setFontSize(10);
      doc.text(sale.customerName.toUpperCase(), 18, 46);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      if (sale.customerPhone) doc.text(`Contact: ${sale.customerPhone}`, 18, 51);

      // Invoice Meta Right Box
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`INVOICE NO:`, 130, 40);
      doc.setTextColor(37, 99, 235);
      doc.text(sale.invoiceNo, 160, 40);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice Date:`, 130, 46);
      doc.setTextColor(15, 23, 42);
      doc.text(sale.date, 160, 46);

      doc.setTextColor(100, 116, 139);
      doc.text(`Payment:`, 130, 51);
      doc.setTextColor(15, 23, 42);
      doc.text(`${sale.paymentMethod.toUpperCase()} (${sale.paymentStatus.toUpperCase()})`, 160, 51);

      const invoiceLines = sale.lines.map((l, idx) => [
        String(idx + 1),
        l.productNameEn,
        isRetailOrSmallBiz ? l.unit || 'Piece' : `${l.bagSizeKg} kg`,
        String(l.bags),
        isRetailOrSmallBiz ? `${currency} ${(l.discountAmount || 0).toLocaleString()}` : `${l.weightKg.toLocaleString()} kg`,
        `${currency} ${l.unitPrice.toLocaleString()}`,
        `${currency} ${l.lineTotal.toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 61,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [[
          '#',
          'Product Description',
          unitHeaderLabel,
          qtyHeaderLabel,
          isRetailOrSmallBiz ? 'Item Disc' : 'Total Weight',
          `Rate / ${unitHeaderLabel}`,
          'Line Total',
        ]],
        body: invoiceLines,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 68, fontStyle: 'bold' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => drawPageFooter(data),
      });

      // Financial Calculation Summary Box
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 140;

      // Terms on the left
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('TERMS & CONDITIONS:', 14, finalY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('1. Goods once dispatched in sound condition cannot be returned.', 14, finalY + 9);
      doc.text('2. Please inspect bag counts and weights before vehicle dispatch.', 14, finalY + 14);
      doc.text('3. In case of credit sale, balance must be settled within the agreed credit term.', 14, finalY + 19);

      // Financial Summary Box on the right
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      doc.text('Subtotal:', 124, finalY + 6);
      doc.text(`${currency} ${sale.subtotal.toLocaleString()}`, 192, finalY + 6, { align: 'right' });

      if (sale.discount > 0) {
        const discountPctStr =
          sale.discountPercent !== undefined && sale.discountPercent > 0
            ? `${sale.discountPercent}%`
            : sale.subtotal > 0
            ? `${((sale.discount / sale.subtotal) * 100).toFixed(1)}%`
            : '';
        doc.text(`Discount (${discountPctStr}):`, 124, finalY + 12);
        doc.setTextColor(225, 29, 72);
        doc.text(`- ${currency} ${sale.discount.toLocaleString()}`, 192, finalY + 12, { align: 'right' });
        doc.setTextColor(100, 116, 139);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Grand Total:', 124, finalY + 18);
      doc.text(`${currency} ${sale.grandTotal.toLocaleString()}`, 192, finalY + 18, { align: 'right' });

      doc.setFontSize(7.5);
      doc.setTextColor(5, 150, 105);
      doc.text('Amount Received:', 124, finalY + 24);
      doc.text(`${currency} ${(sale.paidAmount || 0).toLocaleString()}`, 192, finalY + 24, { align: 'right' });

      if (sale.balanceAmount > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(225, 29, 72);
        doc.text('Outstanding Balance:', 124, finalY + 29);
        doc.text(`${currency} ${sale.balanceAmount.toLocaleString()}`, 192, finalY + 29, { align: 'right' });
      }

      // Embed scannable invoice barcode below terms
      try {
        const barcodePng = generateBarcodePngDataUrl(sale.invoiceNo, {
          barHeight: 45,
          moduleWidth: 2,
          showText: true,
        });
        if (barcodePng) {
          doc.addImage(barcodePng, 'PNG', 14, finalY + 23, 55, 16);
        }
      } catch {
        // Ignore if canvas unavailable
      }

      break;
    }

    case 'low_stock_alert': {
      reportTitle = 'Low Stock & Out-of-Stock Alert Report';
      reportSubtitle = `Items Requiring Immediate Restock or Purchase Order`;
      drawPageHeader(reportTitle, reportSubtitle);

      const lowBalances = db.stockBalances.filter(sb => sb.availableBags <= (sb.minStockThreshold || 10));
      const rows = lowBalances.map(sb => {
        const prod = db.products.find(p => p.id === sb.productId);
        return [
          prod?.nameEn || 'Product',
          prod?.sku || prod?.barcode || '-',
          prod?.category || 'General',
          isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${sb.bagSizeKg} kg`,
          String(sb.availableBags),
          String(sb.minStockThreshold || 10),
          sb.availableBags <= 0 ? 'OUT OF STOCK' : 'LOW STOCK',
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Product Name', 'SKU / Barcode', 'Category', unitHeaderLabel, 'Available Qty', 'Min Alert', 'Status']],
        body: rows.length > 0 ? rows : [['All products have healthy stock levels', '-', '-', '-', '-', '-', 'OPTIMAL']],
        showHead: 'everyPage',
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'purchases_summary': {
      reportTitle = isRetailOrSmallBiz ? 'Supplier Purchases & Restock Register' : 'Mill Raw Material Purchases Register';
      reportSubtitle = `Supplier Invoices, Purchased Quantities & Payables`;
      drawPageHeader(reportTitle, reportSubtitle);

      let purchases = [...(db.millPurchases || [])];
      if (options.startDate) purchases = purchases.filter(p => p.date >= options.startDate!);
      if (options.endDate) purchases = purchases.filter(p => p.date <= options.endDate!);

      const totalAmt = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      const totalPaid = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
      const totalBal = purchases.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);

      const rows = purchases.map(p => [
        p.purchaseNo,
        p.date,
        p.supplierName,
        p.productNameEn,
        String(p.quantityBags),
        `${currency} ${p.purchaseRate.toLocaleString()}`,
        `${currency} ${p.totalAmount.toLocaleString()}`,
        `${currency} ${(p.paidAmount || 0).toLocaleString()}`,
        `${currency} ${(p.balanceAmount || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Purchase #', 'Date', 'Supplier', 'Product', qtyHeaderLabel, 'Unit Cost', 'Total', 'Paid', 'Balance']],
        body: rows,
        foot: [['TOTALS', '', `${purchases.length} records`, '', '', '', `${currency} ${totalAmt.toLocaleString()}`, `${currency} ${totalPaid.toLocaleString()}`, `${currency} ${totalBal.toLocaleString()}`]],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        footStyles: { fillColor: [238, 242, 255], textColor: [30, 27, 75], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'returns_summary': {
      reportTitle = 'Customer & Supplier Returns Register';
      reportSubtitle = `Returned Goods, Condition & Refund Summary`;
      drawPageHeader(reportTitle, reportSubtitle);

      let returnsList = [...(db.returns || [])];
      if (options.startDate) returnsList = returnsList.filter(r => r.date >= options.startDate!);
      if (options.endDate) returnsList = returnsList.filter(r => r.date <= options.endDate!);

      const totalRefund = returnsList.reduce((acc, r) => acc + (r.refundAmount || 0), 0);
      const rows = returnsList.map(r => [
        r.returnNo,
        r.date,
        r.returnType.toUpperCase(),
        r.customerOrSupplierName,
        r.productNameEn,
        String(r.returnedBags),
        r.condition.toUpperCase(),
        `${currency} ${(r.refundAmount || 0).toLocaleString()}`,
        r.reason || '-',
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Return #', 'Date', 'Type', 'Party Name', 'Product', qtyHeaderLabel, 'Condition', 'Refund', 'Reason']],
        body: rows,
        foot: [['TOTALS', '', '', `${returnsList.length} returns`, '', '', '', `${currency} ${totalRefund.toLocaleString()}`, '']],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7, cellPadding: 2.2 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'expenses_summary': {
      reportTitle = 'Operating Expenses & Costs Register';
      reportSubtitle = `Categorized Business Expenses & Vouchers`;
      drawPageHeader(reportTitle, reportSubtitle);

      let expensesList = [...(db.expenses || [])];
      if (options.startDate) expensesList = expensesList.filter(e => e.date >= options.startDate!);
      if (options.endDate) expensesList = expensesList.filter(e => e.date <= options.endDate!);

      const totalExp = expensesList.reduce((acc, e) => acc + (e.amount || 0), 0);
      const rows = expensesList.map(e => [
        e.expenseNo,
        e.date,
        e.category,
        e.title,
        e.referenceNo || '-',
        e.paymentMethod.toUpperCase(),
        `${currency} ${e.amount.toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Voucher #', 'Date', 'Category', 'Expense Description', 'Ref #', 'Method', 'Amount']],
        body: rows,
        foot: [['TOTAL EXPENSES', '', '', `${expensesList.length} vouchers`, '', '', `${currency} ${totalExp.toLocaleString()}`]],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [255, 241, 242], textColor: [136, 19, 55], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'profit_loss': {
      reportTitle = 'Profit & Loss Financial Statement';
      reportSubtitle = `Revenue, Cost of Goods Sold, Operating Expenses & Net Profit`;
      drawPageHeader(reportTitle, reportSubtitle);

      let salesList = db.sales.filter(s => s.status === 'completed');
      let purchasesList = [...(db.millPurchases || [])];
      let expensesList = [...(db.expenses || [])];
      let returnsList = [...(db.returns || [])];

      if (options.startDate) {
        salesList = salesList.filter(s => s.date >= options.startDate!);
        purchasesList = purchasesList.filter(p => p.date >= options.startDate!);
        expensesList = expensesList.filter(e => e.date >= options.startDate!);
        returnsList = returnsList.filter(r => r.date >= options.startDate!);
      }
      if (options.endDate) {
        salesList = salesList.filter(s => s.date <= options.endDate!);
        purchasesList = purchasesList.filter(p => p.date <= options.endDate!);
        expensesList = expensesList.filter(e => e.date <= options.endDate!);
        returnsList = returnsList.filter(r => r.date <= options.endDate!);
      }

      const grossSales = salesList.reduce((acc, s) => acc + s.subtotal, 0);
      const totalDiscounts = salesList.reduce((acc, s) => acc + (s.discount || 0), 0);
      const netSalesRevenue = salesList.reduce((acc, s) => acc + s.grandTotal, 0);
      const customerRefunds = returnsList
        .filter(r => r.returnType === 'customer')
        .reduce((acc, r) => acc + (r.refundAmount || 0), 0);

      let estimatedCogs = 0;
      for (const s of salesList) {
        for (const l of s.lines) {
          const prod = db.products.find(p => p.id === l.productId);
          const unitCost = prod?.purchasePrice || l.unitPrice * 0.8;
          estimatedCogs += unitCost * l.bags;
        }
      }
      const totalPurchasesSpend = purchasesList.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      const totalOperatingExpenses = expensesList.reduce((acc, e) => acc + (e.amount || 0), 0);
      const grossProfit = netSalesRevenue - customerRefunds - estimatedCogs;
      const netProfit = grossProfit - totalOperatingExpenses;

      const pnlRows = [
        ['1. Gross Sales Revenue', `${salesList.length} completed invoices`, `${currency} ${grossSales.toLocaleString()}`],
        ['2. Less: Sales Discounts Granted', 'Invoice & line discounts', `- ${currency} ${totalDiscounts.toLocaleString()}`],
        ['3. Net Sales Revenue', 'After discounts', `${currency} ${netSalesRevenue.toLocaleString()}`],
        ['4. Less: Customer Returns & Refunds', `${returnsList.filter(r => r.returnType === 'customer').length} customer returns`, `- ${currency} ${customerRefunds.toLocaleString()}`],
        ['5. Estimated Cost of Goods Sold (COGS)', 'Based on product cost prices', `- ${currency} ${Math.round(estimatedCogs).toLocaleString()}`],
        ['6. GROSS PROFIT / MARGIN', 'Net Revenue minus COGS', `${currency} ${Math.round(grossProfit).toLocaleString()}`],
        ['7. Less: Operating Expenses', `${expensesList.length} expense vouchers`, `- ${currency} ${totalOperatingExpenses.toLocaleString()}`],
        ['8. NET PROFIT / (LOSS)', netProfit >= 0 ? 'PROFITABLE PERIOD' : 'NET DEFICIT', `${currency} ${Math.round(netProfit).toLocaleString()}`],
        ['Memo: Total Supplier Purchases Logged', `${purchasesList.length} purchase batches`, `${currency} ${totalPurchasesSpend.toLocaleString()}`],
      ];

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Financial Line Item', 'Basis / Notes', 'Amount']],
        body: pnlRows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 47, halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'customer_supplier_ledger': {
      reportTitle = 'Customer Receivables & Supplier Payables Ledger';
      reportSubtitle = `Party Directory, Total Volume & Outstanding Balances`;
      drawPageHeader(reportTitle, reportSubtitle);

      const custRows = (db.customers || []).map(c => [
        'CUSTOMER',
        c.name,
        c.phone || '-',
        `${currency} ${(c.totalPurchasesAmount || 0).toLocaleString()}`,
        `${currency} ${Math.max(0, (c.totalPurchasesAmount || 0) - (c.currentBalance || 0)).toLocaleString()}`,
        `${currency} ${(c.currentBalance || 0).toLocaleString()}`,
      ]);
      const supRows = (db.suppliers || []).map(s => [
        'SUPPLIER',
        s.name,
        s.phone || '-',
        `${currency} ${(s.totalSuppliedAmount || 0).toLocaleString()}`,
        `${currency} ${Math.max(0, (s.totalSuppliedAmount || 0) - (s.currentBalance || 0)).toLocaleString()}`,
        `${currency} ${(s.currentBalance || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Party Type', 'Name', 'Phone', 'Total Volume', 'Total Settled', 'Outstanding Balance']],
        body: [...custRows, ...supRows],
        showHead: 'everyPage',
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'supplier_ledger': {
      reportTitle = 'Supplier Directory & Payables Report';
      reportSubtitle = `${profile.businessName || modeCfg.label} — Supplier Accounts, Purchases & Payable Balances`;
      drawPageHeader(reportTitle, reportSubtitle);

      const supRows = (db.suppliers || []).map((s, idx) => [
        String(idx + 1),
        s.name,
        s.contactPerson || '-',
        s.phone || '-',
        `${currency} ${(s.totalSuppliedAmount || 0).toLocaleString()}`,
        `${currency} ${Math.max(0, (s.totalSuppliedAmount || 0) - (s.currentBalance || 0)).toLocaleString()}`,
        `${currency} ${(s.currentBalance || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['#', 'Supplier Name', 'Contact Person', 'Phone', 'Total Supplied', 'Amount Paid', 'Payable Balance']],
        body: supRows.length > 0 ? supRows : [['-', 'No suppliers registered in this workspace', '-', '-', '-', '-', '-']],
        showHead: 'everyPage',
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'barcode_catalog': {
      reportTitle = 'Product Barcode & Price Master Catalog';
      reportSubtitle = `${profile.businessName || modeCfg.label} — Scannable Product Barcodes & Rates`;
      drawPageHeader(reportTitle, reportSubtitle);

      const rows = db.products.map((p, idx) => [
        String(idx + 1),
        p.nameEn,
        p.sku || '-',
        p.barcode || p.id,
        p.category,
        p.unit || (isRetailOrSmallBiz ? 'Piece' : 'Bag'),
        `${currency} ${(p.rate || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['#', 'Product Name', 'SKU', 'Barcode Number', 'Category', 'Unit', 'Sale Price']],
        body: rows,
        showHead: 'everyPage',
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.8 },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    case 'stock_ledger': {
      reportTitle = 'Stock Movements Audit Ledger';
      reportSubtitle = `Sequential In/Out Ledger Movements`;
      drawPageHeader(reportTitle, reportSubtitle);

      let movements = [...db.stockMovements];
      if (options.productId && options.productId !== 'all') {
        movements = movements.filter(m => m.productId === options.productId);
      }

      const rows = movements.slice(0, 100).map(m => {
        const prod = db.products.find(p => p.id === m.productId);
        return [
          m.date,
          m.productNameEn,
          isRetailOrSmallBiz ? prod?.unit || 'Piece' : `${m.bagSizeKg} kg`,
          m.movementType.toUpperCase().replace('_', ' '),
          m.changeBags > 0 ? `+${m.changeBags}` : String(m.changeBags),
          String(m.balanceBagsAfter),
          m.referenceType || 'Manual Movement',
          m.performedBy,
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: 14, right: 14, bottom: 22 },
        head: [['Date', 'Product', unitHeaderLabel, 'Movement Type', 'Change', 'Balance After', 'Reference / Party', 'User']],
        body: rows,
        showHead: 'everyPage',
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        styles: {
          fontSize: 7,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 24, fontStyle: 'bold' },
          4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 34 },
          7: { cellWidth: 16 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: data => drawPageFooter(data),
      });
      break;
    }

    default: {
      reportTitle = 'Executive Operational Summary';
      drawPageHeader(reportTitle);
      break;
    }
  }

  const filename = `ST_${options.reportType}_${now.toISOString().slice(0, 10)}.pdf`;
  return { doc, filename };
}
