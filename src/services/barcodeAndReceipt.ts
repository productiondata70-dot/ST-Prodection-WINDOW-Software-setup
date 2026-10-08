import jsPDF from 'jspdf';
import { BusinessProfile, Product, SaleRecord } from '../types';

/**
 * Standard Code-128 Bar/Space Width Patterns (Values 0 to 106)
 * Each string of 6 digits represents alternating bar and space module widths (1-4 modules),
 * except Stop (106) which has 7 elements (13 modules).
 */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

/**
 * Encodes an ASCII string into Code-128B binary module bars ('1' = black bar, '0' = white space)
 * including 10-module quiet zones on left and right, Start Code B (104), modulo-103 checksum, and Stop (106).
 */
export function encodeCode128B(rawText: string): string {
  const clean = String(rawText || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '') || '00000000';

  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const codeVal = clean.charCodeAt(i) - 32;
    const safeVal = codeVal >= 0 && codeVal <= 94 ? codeVal : 0;
    codes.push(safeVal);
    checksum += safeVal * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop pattern

  let bits = '0000000000'; // 10-module left quiet zone
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const count = parseInt(pattern[i], 10) || 1;
      const bit = i % 2 === 0 ? '1' : '0';
      bits += bit.repeat(count);
    }
  }
  bits += '0000000000'; // 10-module right quiet zone
  return bits;
}

/**
 * Generates an EAN-13 check digit for a 12-digit numeric string.
 */
export function computeEan13CheckDigit(twelveDigits: string): string {
  const digits = twelveDigits.replace(/\D/g, '').padStart(12, '0').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10) || 0;
    sum += i % 2 === 0 ? d : d * 3;
  }
  const rem = sum % 10;
  return String(rem === 0 ? 0 : 10 - rem);
}

/**
 * Generates a unique, valid 13-digit barcode scoped to the active business's products.
 * Supports both:
 * - generateUniqueBusinessBarcode(existingProducts, businessId, prefix)
 * - generateUniqueBusinessBarcode(businessName, businessId, existingCodesOrProducts, prefix)
 */
export function generateUniqueBusinessBarcode(
  arg1: Product[] | string,
  businessId: string,
  arg3?: string | string[] | Product[],
  arg4?: string
): string {
  let rawPrefix = '896';
  const existingSet = new Set<string>();

  if (Array.isArray(arg1)) {
    rawPrefix = typeof arg3 === 'string' ? arg3 : '896';
    for (const p of arg1) {
      if (!p.businessId || p.businessId === businessId) {
        const bc = (p.barcode || '').trim();
        if (bc) existingSet.add(bc);
      }
    }
  } else {
    rawPrefix = typeof arg4 === 'string' && arg4.trim() ? arg4 : '896';
    if (Array.isArray(arg3)) {
      for (const item of arg3) {
        if (typeof item === 'string') {
          if (item.trim()) existingSet.add(item.trim());
        } else if (item && typeof item === 'object' && 'barcode' in item) {
          const bc = (item.barcode || '').trim();
          if (bc) existingSet.add(bc);
        }
      }
    }
  }

  const cleanPrefix = (rawPrefix || '896').replace(/\D/g, '').slice(0, 3).padEnd(3, '8');

  for (let attempt = 0; attempt < 50; attempt++) {
    const timePart = String(Date.now() + attempt).slice(-6);
    const randPart = String(Math.floor(100 + Math.random() * 900));
    const base12 = (cleanPrefix + timePart + randPart).slice(0, 12);
    const full13 = base12 + computeEan13CheckDigit(base12);
    if (!existingSet.has(full13)) {
      return full13;
    }
  }
  const fallback12 = (cleanPrefix + String(Math.floor(100000000 + Math.random() * 900000000))).slice(0, 12);
  return fallback12 + computeEan13CheckDigit(fallback12);
}

/**
 * Renders a crisp SVG string for a Code-128B barcode.
 */
export function renderBarcodeSvgString(
  barcodeValue: string,
  options?: {
    width?: number;
    height?: number;
    showText?: boolean;
    moduleWidth?: number;
  }
): string {
  const bits = encodeCode128B(barcodeValue);
  const moduleWidth = options?.moduleWidth || 2;
  const barHeight = options?.height || 52;
  const showText = options?.showText !== false;
  const totalWidth = bits.length * moduleWidth;
  const svgHeight = showText ? barHeight + 20 : barHeight + 6;

  let rects = '';
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '1') {
      let run = 1;
      while (i + run < bits.length && bits[i + run] === '1') {
        run++;
      }
      const x = i * moduleWidth;
      const w = run * moduleWidth;
      rects += `<rect x="${x}" y="3" width="${w}" height="${barHeight}" fill="#000000" />`;
      i += run;
    } else {
      i++;
    }
  }

  const safeLabel = String(barcodeValue || '').replace(/[<>&"']/g, '');
  const textEl = showText
    ? `<text x="${totalWidth / 2}" y="${barHeight + 17}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#000000" letter-spacing="2">${safeLabel}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${options?.width || totalWidth}" height="${svgHeight}" style="background:#ffffff;max-width:100%;height:auto;">
    <rect width="100%" height="100%" fill="#ffffff" />
    ${rects}
    ${textEl}
  </svg>`;
}

/**
 * Renders a high-resolution PNG Data URL of a barcode (suitable for embedding in jsPDF or downloading).
 */
export function generateBarcodePngDataUrl(
  barcodeValue: string,
  options?: {
    barHeight?: number;
    moduleWidth?: number;
    showText?: boolean;
  }
): string {
  if (typeof document === 'undefined') return '';
  const bits = encodeCode128B(barcodeValue);
  const moduleWidth = options?.moduleWidth || 3;
  const barHeight = options?.barHeight || 75;
  const showText = options?.showText !== false;
  const width = bits.length * moduleWidth;
  const height = showText ? barHeight + 30 : barHeight + 12;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      ctx.fillRect(i * moduleWidth, 6, moduleWidth, barHeight);
    }
  }

  if (showText) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(barcodeValue || ''), width / 2, barHeight + 25);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates a complete high-resolution printable Product Barcode Label PNG Data URL
 * containing Business Name, Product Name, Barcode Bars, Barcode Number, SKU, and Sale Price.
 */
export function generateProductLabelPngDataUrl(
  product: Product,
  profile?: BusinessProfile | null
): string {
  if (typeof document === 'undefined') return '';
  const barcodeVal = product.barcode || product.sku || product.id;
  const bits = encodeCode128B(barcodeVal);
  const moduleWidth = 3;
  const barcodeWidth = bits.length * moduleWidth;
  const canvasWidth = Math.max(460, barcodeWidth + 48);
  const canvasHeight = 270;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const currency = profile?.currency || 'PKR';
  const bConfig = profile?.barcodeConfig;
  const showBiz = bConfig?.showBusinessNameOnLabel !== false;
  const showPrice = bConfig?.showPriceOnLabel !== false;
  const showSku = bConfig?.showSkuOnLabel !== false;

  // White background + clean border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);

  let currentY = 28;

  // Business Name
  if (showBiz && profile?.businessName) {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(profile.businessName.toUpperCase().slice(0, 36), canvasWidth / 2, currentY);
    currentY += 24;
  }

  // Product Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(product.nameEn.slice(0, 32), canvasWidth / 2, currentY);
  currentY += 14;

  // Barcode Bars
  const barStartX = Math.floor((canvasWidth - barcodeWidth) / 2);
  const barHeight = 96;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      ctx.fillRect(barStartX + i * moduleWidth, currentY, moduleWidth, barHeight);
    }
  }
  currentY += barHeight + 22;

  // Human-readable barcode digits
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(barcodeVal, canvasWidth / 2, currentY);
  currentY += 28;

  // Bottom row: SKU on left, Price on right
  const metaParts: string[] = [];
  if (showSku && product.sku) {
    metaParts.push(`SKU: ${product.sku}`);
  }
  if (product.unit) {
    metaParts.push(`Unit: ${product.unit}`);
  }
  if (showPrice && product.rate !== undefined && product.rate > 0) {
    metaParts.push(`Price: ${currency} ${product.rate.toLocaleString()}`);
  }

  if (metaParts.length > 0) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(metaParts.join('   |   '), canvasWidth / 2, currentY);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Triggers browser download of a product's physical Barcode Label PNG.
 */
export function downloadProductBarcodeLabel(
  product: Product,
  profile?: BusinessProfile | null
): void {
  const dataUrl = generateProductLabelPngDataUrl(product, profile);
  if (!dataUrl) return;
  const safeName = product.nameEn.replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Barcode_Label_${safeName}_${product.barcode || product.id}.png`;
  a.click();
}

/**
 * Builds printable HTML for one or more product barcode labels.
 */
export function generateBarcodeLabelHtml(
  products: Product[],
  profile?: BusinessProfile | null
): string {
  const currency = profile?.currency || 'PKR';
  const bizName = profile?.businessName || 'Business Store';
  const bConfig = profile?.barcodeConfig;
  const labelSize = bConfig?.labelSize || '50x30mm';
  const widthMm = labelSize === '38x25mm' ? 38 : labelSize === '40x30mm' ? 40 : 50;
  const heightMm = labelSize === '38x25mm' ? 25 : 30;

  const labelsHtml = products
    .map(p => {
      const code = p.barcode || p.sku || p.id;
      const svg = renderBarcodeSvgString(code, { height: 40, moduleWidth: 1.6, showText: true });
      return `
        <div class="label-card">
          ${bConfig?.showBusinessNameOnLabel !== false ? `<div class="biz">${bizName}</div>` : ''}
          <div class="prod">${p.nameEn}</div>
          <div class="svg-wrap">${svg}</div>
          <div class="meta">
            ${bConfig?.showSkuOnLabel !== false && p.sku ? `<span>SKU: ${p.sku}</span>` : ''}
            ${
              bConfig?.showPriceOnLabel !== false && p.rate !== undefined
                ? `<span class="price">${currency} ${p.rate.toLocaleString()} / ${p.unit || 'Unit'}</span>`
                : ''
            }
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels - ${bizName}</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #000000;
    }
    .label-card {
      width: ${widthMm}mm;
      min-height: ${heightMm}mm;
      padding: 1.5mm 2mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      page-break-after: always;
      border: 1px dashed #cbd5e1;
      margin: 0 auto;
    }
    @media print {
      .label-card {
        border: none;
      }
    }
    .biz {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 0.5mm;
    }
    .prod {
      font-size: 8.5pt;
      font-weight: bold;
      line-height: 1.1;
      margin-bottom: 1mm;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .svg-wrap {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .svg-wrap svg {
      max-width: 100%;
      height: 12mm;
    }
    .meta {
      margin-top: 0.5mm;
      font-size: 7.5pt;
      font-weight: bold;
      display: flex;
      gap: 6px;
      justify-content: center;
      align-items: center;
    }
    .price {
      font-size: 8pt;
      font-weight: 800;
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>`;
}

/**
 * Generates precision-formatted 58mm or 80mm Thermal POS Receipt HTML.
 * Uses ONLY the active business's profile and the exact invoice data.
 * Never overflows 58mm (48mm printable width) or 80mm (72mm printable width).
 */
export function generateThermalReceiptHtml(
  sale: SaleRecord,
  profile: BusinessProfile | null,
  options?: {
    paperWidthMm?: 58 | 80;
    cashReceived?: number;
    changeReturned?: number;
    changeDue?: number;
    cashierName?: string;
    showBarcode?: boolean;
    showCustomer?: boolean;
    showTax?: boolean;
  }
): string {
  const paperWidthMm: 58 | 80 =
    options?.paperWidthMm ||
    profile?.printerConfig?.paperWidthMm ||
    (profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80);

  // Printable area inside thermal roll: 48mm for 58mm paper, 72mm for 80mm paper
  const printableWidthMm = paperWidthMm === 58 ? 48 : 72;
  const baseFontPt = paperWidthMm === 58 ? 8 : 9;
  const titleFontPt = paperWidthMm === 58 ? 10.5 : 12;

  const currency = profile?.currency || 'PKR';
  const bizName = profile?.businessName || 'Business Store';
  const address = profile?.address || '';
  const phone = profile?.contactNumber || '';
  const ntn = profile?.ntnNumber || '';
  const footerMsg = profile?.receiptFooter || 'Thank you for your business!';
  const showBarcode = profile?.printerConfig?.showBarcodeOnReceipt !== false;

  const barcodeSvg = showBarcode
    ? renderBarcodeSvgString(sale.invoiceNo, {
        height: 32,
        moduleWidth: paperWidthMm === 58 ? 1.3 : 1.7,
        showText: true,
      })
    : '';

  const createdTime = sale.createdAt
    ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const itemRowsHtml = sale.lines
    .map((line, idx) => {
      const unitLabel = line.unit || (line.bagSizeKg > 1 ? `${line.bagSizeKg}kg` : 'Pcs');
      const discountNote =
        line.discountAmount && line.discountAmount > 0
          ? `<div class="item-disc">Disc: -${currency} ${line.discountAmount.toLocaleString()}</div>`
          : '';
      return `
        <div class="item-block">
          <div class="item-name">${idx + 1}. ${line.productNameEn}</div>
          <div class="item-calc">
            <span>${line.bags} ${unitLabel} x ${line.unitPrice.toLocaleString()}</span>
            <span class="item-total">${line.lineTotal.toLocaleString()}</span>
          </div>
          ${discountNote}
        </div>
      `;
    })
    .join('');

  const effectiveCashReceived =
    options?.cashReceived && options.cashReceived > 0 ? options.cashReceived : sale.paidAmount || 0;
  const effectiveChange =
    options?.changeReturned !== undefined
      ? options.changeReturned
      : Math.max(0, effectiveCashReceived - sale.grandTotal);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${sale.invoiceNo}</title>
  <style>
    @page {
      size: ${paperWidthMm}mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${paperWidthMm}mm;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFontPt}pt;
      line-height: 1.28;
      -webkit-print-color-adjust: exact;
    }
    .receipt-wrapper {
      width: ${printableWidthMm}mm;
      margin: 0 auto;
      padding: 2mm 0 4mm 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .center {
      text-align: center;
    }
    .biz-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${titleFontPt}pt;
      font-weight: 800;
      text-transform: uppercase;
      line-height: 1.15;
      margin-bottom: 1mm;
    }
    .biz-sub {
      font-size: ${baseFontPt - 0.5}pt;
      margin-bottom: 0.5mm;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 1.8mm 0;
    }
    .double-divider {
      border-top: 2px solid #000000;
      margin: 1.8mm 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      font-size: ${baseFontPt - 0.5}pt;
      margin-bottom: 0.5mm;
    }
    .meta-row span:last-child {
      text-align: right;
      font-weight: bold;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: ${baseFontPt - 0.5}pt;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000000;
      margin-bottom: 1.5mm;
    }
    .item-block {
      margin-bottom: 1.6mm;
      padding-bottom: 1mm;
      border-bottom: 1px dotted #94a3b8;
    }
    .item-name {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
      font-size: ${baseFontPt}pt;
      word-break: break-word;
    }
    .item-calc {
      display: flex;
      justify-content: space-between;
      font-size: ${baseFontPt - 0.5}pt;
      margin-top: 0.4mm;
    }
    .item-total {
      font-weight: 800;
    }
    .item-disc {
      font-size: ${baseFontPt - 1}pt;
      text-align: right;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.8mm;
      font-size: ${baseFontPt}pt;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${titleFontPt - 0.5}pt;
      font-weight: 800;
      padding: 1.2mm 0;
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      margin: 1.2mm 0;
    }
    .barcode-box {
      margin-top: 2.5mm;
      text-align: center;
    }
    .barcode-box svg {
      max-width: 100%;
      height: auto;
    }
    .footer {
      margin-top: 2.5mm;
      text-align: center;
      font-size: ${baseFontPt - 0.5}pt;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <div class="center">
      <div class="biz-title">${bizName}</div>
      ${address ? `<div class="biz-sub">${address}</div>` : ''}
      ${phone ? `<div class="biz-sub">Tel: ${phone}</div>` : ''}
      ${ntn ? `<div class="biz-sub">Tax/NTN: ${ntn}</div>` : ''}
    </div>

    <div class="divider"></div>

    <div class="meta-row">
      <span>Invoice #:</span>
      <span>${sale.invoiceNo}</span>
    </div>
    <div class="meta-row">
      <span>Date:</span>
      <span>${sale.date} ${createdTime}</span>
    </div>
    <div class="meta-row">
      <span>Customer:</span>
      <span>${sale.customerName || 'Walk-in Customer'}</span>
    </div>
    ${
      sale.customerPhone
        ? `<div class="meta-row"><span>Phone:</span><span>${sale.customerPhone}</span></div>`
        : ''
    }
    <div class="meta-row">
      <span>Cashier:</span>
      <span>${sale.createdBy || 'POS'}</span>
    </div>
    <div class="meta-row">
      <span>Payment:</span>
      <span>${sale.paymentMethod.toUpperCase().replace('_', ' ')} (${sale.paymentStatus.toUpperCase()})</span>
    </div>

    <div class="divider"></div>

    <div class="items-header">
      <span>ITEM / QTY x RATE</span>
      <span>TOTAL (${currency})</span>
    </div>

    ${itemRowsHtml}

    <div class="totals-row">
      <span>Items / Qty:</span>
      <span>${sale.lines.length} (${sale.totalBags})</span>
    </div>
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${currency} ${sale.subtotal.toLocaleString()}</span>
    </div>
    ${
      sale.discount > 0
        ? `<div class="totals-row"><span>Discount:</span><span>-${currency} ${sale.discount.toLocaleString()}</span></div>`
        : ''
    }
    ${
      sale.taxAmount && sale.taxAmount > 0
        ? `<div class="totals-row"><span>Tax / GST:</span><span>+${currency} ${sale.taxAmount.toLocaleString()}</span></div>`
        : ''
    }

    <div class="grand-total">
      <span>GRAND TOTAL:</span>
      <span>${currency} ${sale.grandTotal.toLocaleString()}</span>
    </div>

    <div class="totals-row">
      <span>Paid / Received:</span>
      <span>${currency} ${effectiveCashReceived.toLocaleString()}</span>
    </div>
    ${
      effectiveChange > 0
        ? `<div class="totals-row" style="font-weight:bold;"><span>Change Returned:</span><span>${currency} ${effectiveChange.toLocaleString()}</span></div>`
        : ''
    }
    ${
      sale.balanceAmount > 0
        ? `<div class="totals-row" style="font-weight:bold;"><span>Balance Due:</span><span>${currency} ${sale.balanceAmount.toLocaleString()}</span></div>`
        : ''
    }

    ${barcodeSvg ? `<div class="barcode-box">${barcodeSvg}</div>` : ''}

    <div class="divider"></div>
    <div class="footer">${footerMsg}</div>
  </div>
</body>
</html>`;
}

/**
 * Queries system printers when running in Electron desktop environment.
 * Never fabricates printers when running in a standard web browser.
 */
export async function listSystemPrinters(): Promise<{
  isDesktopSupported: boolean;
  printers: Array<{
    name: string;
    displayName: string;
    description: string;
    status: number;
    isDefault: boolean;
  }>;
  error?: string;
}> {
  if (typeof window !== 'undefined' && window.desktopAPI?.getPrinters) {
    try {
      const res = await window.desktopAPI.getPrinters();
      return {
        isDesktopSupported: true,
        printers: res.printers || [],
        error: res.error,
      };
    } catch (err: any) {
      return {
        isDesktopSupported: true,
        printers: [],
        error: err?.message || 'Unable to query system printers.',
      };
    }
  }
  return {
    isDesktopSupported: false,
    printers: [],
  };
}

/**
 * Prints HTML content (58mm/80mm thermal receipt or barcode label) via Electron native print IPC
 * or a dedicated isolated browser print iframe.
 * Reports truthful success/failure.
 */
export async function printHtmlDocument(
  htmlContent: string,
  options?: {
    printerName?: string;
    silent?: boolean;
    paperWidthMm?: 58 | 80 | 210;
  }
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Print environment unavailable.' };
  }

  // 1. Electron Desktop native printer path
  if (window.desktopAPI?.printHtml) {
    const res = await window.desktopAPI.printHtml({
      htmlContent,
      deviceName: options?.printerName || undefined,
      silent: Boolean(options?.silent && options?.printerName),
      paperWidthMm: options?.paperWidthMm || 58,
    });
    return res;
  }

  // 2. Standard Browser print dialog via isolated hidden iframe
  return new Promise(resolve => {
    try {
      const existingFrame = document.getElementById('st-thermal-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'st-thermal-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) {
        resolve({ success: false, error: 'Could not initialize print frame.' });
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve({ success: true });
        } catch (err: any) {
          resolve({
            success: false,
            error: err?.message || 'Browser print dialog could not be opened.',
          });
        }
      }, 300);
    } catch (err: any) {
      resolve({
        success: false,
        error: err?.message || 'Failed to execute print command.',
      });
    }
  });
}

/**
 * Generates and prints a Test Thermal Receipt (58mm or 80mm) for the active business.
 */
export async function printTestThermalReceipt(
  profile: BusinessProfile | null,
  paperWidthMm: 58 | 80 = 58,
  printerName?: string,
  silent?: boolean
): Promise<{ success: boolean; error?: string; htmlContent: string }> {
  const dummySale: SaleRecord = {
    id: 'test-receipt',
    businessId: profile?.id,
    invoiceNo: `${profile?.invoicePrefix || 'POS'}-TEST-001`,
    date: new Date().toISOString().slice(0, 10),
    customerName: 'Test Walk-in Customer',
    customerPhone: '',
    lines: [
      {
        id: 'tl-1',
        productId: 'test-1',
        productNameEn: `Sample ${paperWidthMm}mm Thermal Item A`,
        productNameUr: '',
        bagSizeKg: 1,
        unit: 'Piece',
        bags: 2,
        weightKg: 2,
        unitPrice: 250,
        lineTotal: 500,
      },
      {
        id: 'tl-2',
        productId: 'test-2',
        productNameEn: `Sample ${paperWidthMm}mm Thermal Item B`,
        productNameUr: '',
        bagSizeKg: 1,
        unit: 'Pack',
        bags: 1,
        weightKg: 1,
        unitPrice: 350,
        lineTotal: 350,
      },
    ],
    totalBags: 3,
    totalWeightKg: 3,
    subtotal: 850,
    discount: 50,
    taxAmount: 0,
    grandTotal: 800,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    paidAmount: 1000,
    balanceAmount: 0,
    createdBy: 'Printer Test',
    createdAt: new Date().toISOString(),
    status: 'completed',
  };

  const htmlContent = generateThermalReceiptHtml(dummySale, profile, {
    paperWidthMm,
    cashReceived: 1000,
    changeReturned: 200,
  });

  const res = await printHtmlDocument(htmlContent, {
    printerName,
    silent,
    paperWidthMm,
  });

  return {
    ...res,
    htmlContent,
  };
}

/**
 * Generates and prints an official 58mm or 80mm thermal receipt for a real SaleRecord.
 */
export async function printThermalReceipt(
  sale: SaleRecord,
  profile: BusinessProfile | null,
  options?: {
    paperWidthMm?: 58 | 80;
    cashReceived?: number;
    changeReturned?: number;
    changeDue?: number;
    cashierName?: string;
    showBarcode?: boolean;
    showCustomer?: boolean;
    showTax?: boolean;
    printerName?: string;
    silent?: boolean;
  }
): Promise<{ success: boolean; error?: string; htmlContent: string }> {
  const paperWidthMm: 58 | 80 =
    options?.paperWidthMm ||
    profile?.printerConfig?.paperWidthMm ||
    (profile?.receiptPrintMode === 'thermal_58mm' ? 58 : 80);

  const htmlContent = generateThermalReceiptHtml(sale, profile, {
    paperWidthMm,
    cashReceived: options?.cashReceived,
    changeReturned: options?.changeReturned ?? options?.changeDue,
    cashierName: options?.cashierName,
    showBarcode: options?.showBarcode,
    showCustomer: options?.showCustomer,
    showTax: options?.showTax,
  });

  const res = await printHtmlDocument(htmlContent, {
    printerName: options?.printerName ?? profile?.printerConfig?.printerName,
    silent: options?.silent ?? profile?.printerConfig?.silentPrint,
    paperWidthMm,
  });

  return {
    ...res,
    htmlContent,
  };
}

/**
 * Alias for renderBarcodeSvgString used by ProductsCatalogView.
 */
export function generateCode128Svg(
  value: string,
  options?: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
  }
): string {
  return renderBarcodeSvgString(value, options);
}

export interface BarcodeLabelRenderOptions {
  copies?: number;
  showBusinessName?: boolean;
  showPrice?: boolean;
  showUnit?: boolean;
  showCategory?: boolean;
  labelSize?: string;
  printerName?: string;
  silent?: boolean;
}

/**
 * Downloads a high-resolution PNG barcode label for a product with custom label options.
 */
export async function downloadBarcodeLabelPng(
  product: Product,
  profile?: BusinessProfile | null,
  options?: BarcodeLabelRenderOptions
): Promise<void> {
  const customProfile: BusinessProfile | null = profile
    ? {
        ...profile,
        barcodeConfig: {
          format: profile.barcodeConfig?.format || 'CODE128',
          paperWidthMm: profile.barcodeConfig?.paperWidthMm || 58,
          showSkuOnLabel: profile.barcodeConfig?.showSkuOnLabel ?? true,
          ...profile.barcodeConfig,
          showBusinessNameOnLabel: options?.showBusinessName ?? true,
          showPriceOnLabel: options?.showPrice ?? true,
          labelSize: (options?.labelSize as any) || profile.barcodeConfig?.labelSize || '50x30mm',
        },
      }
    : null;
  downloadProductBarcodeLabel(product, customProfile);
}

/**
 * Generates and downloads a multi-label or single-label PDF for a product barcode.
 */
export async function downloadBarcodeLabelPdf(
  product: Product,
  profile?: BusinessProfile | null,
  options?: BarcodeLabelRenderOptions
): Promise<void> {
  const copies = Math.max(1, Math.min(100, options?.copies || 1));
  const labelSize = options?.labelSize || profile?.barcodeConfig?.labelSize || '50x30mm';
  const widthMm = labelSize.startsWith('40') ? 40 : labelSize.startsWith('58') ? 58 : 50;
  const heightMm = labelSize.endsWith('25mm') ? 25 : labelSize.endsWith('40mm') ? 40 : 30;

  const customProfile: BusinessProfile | null = profile
    ? {
        ...profile,
        barcodeConfig: {
          format: profile.barcodeConfig?.format || 'CODE128',
          paperWidthMm: profile.barcodeConfig?.paperWidthMm || 58,
          showSkuOnLabel: profile.barcodeConfig?.showSkuOnLabel ?? true,
          ...profile.barcodeConfig,
          showBusinessNameOnLabel: options?.showBusinessName ?? true,
          showPriceOnLabel: options?.showPrice ?? true,
          labelSize: labelSize as any,
        },
      }
    : null;

  const pngDataUrl = generateProductLabelPngDataUrl(product, customProfile);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  for (let i = 0; i < copies; i++) {
    if (i > 0) {
      doc.addPage([widthMm, heightMm], 'landscape');
    }
    if (pngDataUrl) {
      doc.addImage(pngDataUrl, 'PNG', 1, 1, widthMm - 2, heightMm - 2);
    }
  }

  const safeName = product.nameEn.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Barcode_Labels_${safeName}_${product.barcode || product.id}.pdf`);
}

/**
 * Prints 1 or more copies of a product barcode label on the configured thermal/label printer.
 */
export async function printBarcodeLabels(
  product: Product,
  profile?: BusinessProfile | null,
  options?: BarcodeLabelRenderOptions
): Promise<{ success: boolean; error?: string }> {
  const copies = Math.max(1, Math.min(100, options?.copies || 1));
  const items: Product[] = Array.from({ length: copies }, () => product);
  const customProfile: BusinessProfile | null = profile
    ? {
        ...profile,
        barcodeConfig: {
          format: profile.barcodeConfig?.format || 'CODE128',
          paperWidthMm: profile.barcodeConfig?.paperWidthMm || 58,
          showSkuOnLabel: profile.barcodeConfig?.showSkuOnLabel ?? true,
          ...profile.barcodeConfig,
          showBusinessNameOnLabel: options?.showBusinessName ?? true,
          showPriceOnLabel: options?.showPrice ?? true,
          labelSize: (options?.labelSize as any) || profile.barcodeConfig?.labelSize || '50x30mm',
        },
      }
    : null;

  const html = generateBarcodeLabelHtml(items, customProfile);
  return printHtmlDocument(html, {
    printerName: options?.printerName ?? profile?.printerConfig?.printerName,
    silent: options?.silent ?? profile?.printerConfig?.silentPrint,
    paperWidthMm: 58,
  });
}

