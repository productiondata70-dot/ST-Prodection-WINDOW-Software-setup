import { jsPDF } from 'jspdf';
import {
  AppDatabase,
  BusinessProfile,
  ProductionSession,
  SaleRecord,
  StockMovement,
  ReturnRecord,
  WasteRecord,
} from '../types';

export interface ReportFilterOptions {
  reportType:
    | 'dashboard_summary'
    | 'production_summary'
    | 'production_detail'
    | 'stock_summary'
    | 'stock_ledger'
    | 'sales_summary'
    | 'sales_invoice'
    | 'returns_summary'
    | 'waste_summary'
    | 'business_profile';
  startDate?: string;
  endDate?: string;
  productId?: string;
  shiftName?: string;
  customerName?: string;
  selectedRecordId?: string;
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
    contactNumber: '03000000000',
    ownerName: 'Admin',
    currency: 'PKR',
    plantSupervisor: 'Supervisor',
    factoryManager: 'Manager',
  } as BusinessProfile;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB');
  const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Header styling
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, 210, 36, 'F');

  // Business Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.businessName.toUpperCase(), 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${profile.businessType.toUpperCase().replace('_', ' ')}  |  ${profile.address}  |  Ph: ${profile.contactNumber}`, 14, 22);
  doc.text(`Generated: ${dateFormatted} ${timeFormatted}  |  User: Administrator`, 14, 28);

  // Line separator
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  let currentY = 46;

  // Report Specific Content
  switch (options.reportType) {
    case 'dashboard_summary': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('EXECUTIVE DASHBOARD OPERATIONAL SUMMARY', 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const totalProdWeight = db.productionSessions.reduce((acc, p) => acc + p.totalWeightKg, 0);
      const totalProdBags = db.productionSessions.reduce((acc, p) => acc + p.totalBags, 0);
      const totalStockWeight = db.stockBalances.reduce((acc, s) => acc + s.availableWeightKg, 0);
      const totalStockBags = db.stockBalances.reduce((acc, s) => acc + s.availableBags, 0);
      const totalSalesAmount = db.sales.reduce((acc, s) => (s.status === 'completed' ? acc + s.grandTotal : acc), 0);
      const totalSalesBags = db.sales.reduce((acc, s) => (s.status === 'completed' ? acc + s.totalBags : acc), 0);

      const stats = [
        ['Total Cumulative Production', `${totalProdWeight.toLocaleString()} kg (${totalProdBags.toLocaleString()} bags)`],
        ['Current Stock in Mill', `${totalStockWeight.toLocaleString()} kg (${totalStockBags.toLocaleString()} bags)`],
        ['Total Sales Realized', `${profile.currency} ${totalSalesAmount.toLocaleString()} (${totalSalesBags.toLocaleString()} bags sold)`],
        ['Active Product Lines', `${db.products.filter(p => p.isActive).length} items configured`],
        ['Production Sessions Recorded', `${db.productionSessions.length} shifts logged`],
        ['Sales Invoices Issued', `${db.sales.length} transactions`],
      ];

      stats.forEach(([label, value]) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(label, 18, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 120, currentY + 6);
        currentY += 12;
      });

      break;
    }

    case 'production_summary': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PRODUCTION SESSIONS LOG & SHIFT REPORT', 14, currentY);
      currentY += 8;

      // Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Date', 16, currentY + 5.5);
      doc.text('Shift & Code', 42, currentY + 5.5);
      doc.text('Time / Duration', 90, currentY + 5.5);
      doc.text('Total Bags', 135, currentY + 5.5);
      doc.text('Total Weight (kg)', 160, currentY + 5.5);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      db.productionSessions.slice(0, 18).forEach(ps => {
        doc.text(ps.date, 16, currentY);
        doc.text(`${ps.shiftName} (${ps.recordCode})`, 42, currentY);
        doc.text(`${ps.startTime}-${ps.endTime} (${ps.durationFormatted})`, 90, currentY);
        doc.text(String(ps.totalBags), 140, currentY);
        doc.text(ps.totalWeightKg.toLocaleString(), 165, currentY);
        currentY += 8;
      });

      break;
    }

    case 'stock_summary': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CURRENT STOCK & INVENTORY POSITION', 14, currentY);
      currentY += 8;

      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Product Name', 16, currentY + 5.5);
      doc.text('Bag Size', 75, currentY + 5.5);
      doc.text('Available Bags', 110, currentY + 5.5);
      doc.text('Total Weight (kg)', 150, currentY + 5.5);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      db.stockBalances.forEach(sb => {
        const prod = db.products.find(p => p.id === sb.productId);
        const name = prod ? prod.nameEn : 'Unknown';
        doc.text(name, 16, currentY);
        doc.text(`${sb.bagSizeKg} kg`, 75, currentY);
        doc.text(String(sb.availableBags), 115, currentY);
        doc.text(sb.availableWeightKg.toLocaleString(), 155, currentY);
        currentY += 8;
      });

      break;
    }

    case 'sales_summary': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SALES REGISTER & DISPATCH SUMMARY', 14, currentY);
      currentY += 8;

      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Invoice #', 16, currentY + 5.5);
      doc.text('Date', 40, currentY + 5.5);
      doc.text('Customer', 68, currentY + 5.5);
      doc.text('Bags', 115, currentY + 5.5);
      doc.text('Amount', 135, currentY + 5.5);
      doc.text('Status', 168, currentY + 5.5);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      db.sales.slice(0, 18).forEach(s => {
        doc.text(s.invoiceNo, 16, currentY);
        doc.text(s.date, 40, currentY);
        doc.text(s.customerName.slice(0, 20), 68, currentY);
        doc.text(String(s.totalBags), 118, currentY);
        doc.text(`${profile.currency} ${s.grandTotal.toLocaleString()}`, 135, currentY);
        doc.text(s.status === 'cancelled' ? 'CANCELLED' : s.paymentStatus.toUpperCase(), 168, currentY);
        currentY += 8;
      });

      break;
    }

    default: {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('BUSINESS REPORT & AUDIT SUMMARY', 14, currentY);
      currentY += 10;
      doc.setFont('helvetica', 'normal');
      doc.text('Detailed records generated from persistent database ledger.', 14, currentY);
      break;
    }
  }

  // Footer & Developer Watermark
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);

  doc.text('Signatures:', 14, 281);
  doc.text('Prepared By: __________________', 25, 281);
  doc.text('Plant Supervisor: __________________', 80, 281);
  doc.text('Authorized Signature: __________________', 135, 281);

  doc.setFont('helvetica', 'italic');
  doc.text('ST Production and Stock Manager  |  Developed by Tanzeel | WhatsApp 03000081849', 14, 290);
  doc.text('Page 1 of 1', 180, 290);

  const filename = `ST_${options.reportType}_${now.toISOString().slice(0, 10)}.pdf`;
  return { doc, filename };
}
