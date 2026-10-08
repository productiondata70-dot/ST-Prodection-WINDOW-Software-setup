export type BusinessType =
  | 'factory'
  | 'flour_mill'
  | 'mill'
  | 'shopping_mart'
  | 'small_business'
  | 'shop'
  | string;

export type BusinessMode = 'factory' | 'mill' | 'shopping_mart' | 'small_business';

export interface BusinessPrinterConfig {
  printerName?: string;
  paperWidthMm: 58 | 80;
  silentPrint?: boolean;
  autoPrintOnSale?: boolean;
  autoPrintReceipt?: boolean;
  showBarcodeOnReceipt?: boolean;
  showCustomerOnReceipt?: boolean;
  showTaxOnReceipt?: boolean;
  copies?: number;
  lastTestedAt?: string;
  lastTestStatus?: 'passed' | 'failed';
}

export interface BusinessBarcodeConfig {
  format: 'CODE128' | 'EAN13';
  labelSize: '38x25mm' | '50x30mm' | '40x30mm' | '40x25mm' | '58x40mm';
  paperWidthMm?: 58 | 80;
  defaultCopies?: number;
  autoGenerateOnCreate?: boolean;
  autoGenerateOnNewProduct?: boolean;
  showBusinessNameOnLabel: boolean;
  showPriceOnLabel: boolean;
  showSkuOnLabel: boolean;
  showBusinessName?: boolean;
  showPrice?: boolean;
  showUnit?: boolean;
  showCategory?: boolean;
  barcodePrefix?: string;
  prefix?: string;
}

export interface BusinessScannerConfig {
  enabled: boolean;
  autoAddToCartOnScan?: boolean;
  autoAddInPos?: boolean;
  incrementExistingLine?: boolean;
  beepOnScan?: boolean;
  playBeepOnScan?: boolean;
  maxKeystrokeDelayMs?: number;
  minBarcodeLength?: number;
  terminationKey?: 'Enter' | 'Tab' | 'Both';
  lastVerifiedScanCode?: string;
  lastVerifiedAt?: string;
}

export type BusinessAccountStatus = 'active' | 'suspended' | 'trial' | 'expired';
export type BusinessPlanType = 'free' | 'standard' | 'professional' | 'enterprise';

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: BusinessType;
  ownerId?: string;
  ownerEmail?: string;
  address: string;
  contactNumber: string;
  email: string;
  logoUrl?: string;
  plantSupervisor: string;
  factoryManager: string;
  ownerName: string;
  registrationNumber: string;
  ntnNumber?: string;
  currency: string;
  taxRate?: number;
  invoicePrefix?: string;
  receiptPrintMode?: 'a4' | 'thermal_80mm' | 'thermal_58mm';
  receiptFooter?: string;
  printerConfig?: BusinessPrinterConfig;
  barcodeConfig?: BusinessBarcodeConfig;
  scannerConfig?: BusinessScannerConfig;
  accountStatus?: BusinessAccountStatus;
  planType?: BusinessPlanType;
  subscriptionExpiry?: string;
  enabledModules?: ModuleKey[];
  createdAt?: string;
  notes: string;
  updatedAt: string;
}

export type GranularAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'print'
  | 'download'
  | 'manage';

export interface CustomRole {
  id: string;
  businessId?: string;
  name: string;
  description?: string;
  allowedModules: ModuleKey[];
  moduleActions?: Partial<Record<ModuleKey, GranularAction[]>>;
  isSystem?: boolean;
  createdAt: string;
}

export type UserRole =
  | 'admin'
  | 'owner'
  | 'manager'
  | 'salesman'
  | 'inventory_manager'
  | 'cashier'
  | 'accountant'
  | 'operator'
  | 'viewer'
  | string;

export interface UserAccount {
  id: string;
  businessId?: string;
  businessName?: string;
  businessType?: BusinessType;
  selectedBusinessMode?: 'factory' | 'mill' | 'shopping_mart' | 'small_business' | string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  customRoleId?: string;
  permissions?: string[];
  allowedModules?: ModuleKey[];
  blockedModules?: ModuleKey[];
  moduleActions?: Partial<Record<ModuleKey, GranularAction[]>>;
  pinCode: string;
  passwordHash: string;
  accountStatus?: 'active' | 'disabled' | 'suspended';
  isActive?: boolean;
  isBlocked: boolean;
  blockReason?: string;
  blockExpiresAt?: string;
  createdAt: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

export interface BagSize {
  id: string;
  sizeKg: number;
  label: string;
  isDefault: boolean;
}

export interface Product {
  id: string;
  businessId?: string;
  nameEn: string;
  nameUr: string;
  category: string;
  type: string;
  itemType?: 'product' | 'service';
  bagSizes: number[]; // bag sizes in kg available for this product (or [1] for unit-based retail/small business items)
  sku?: string;
  barcode?: string;
  brand?: string;
  unit?: string; // e.g. 'Bag', 'Piece', 'Bottle', 'Pack', 'Box', 'KG', 'Liter', 'Service'
  purchasePrice?: number;
  rate?: number; // default stock/selling rate
  bagPrices?: Record<number, number>; // optional per-bag-size rate override
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  minStockLevel?: number;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  archivedAt?: string;
}

export interface ProductCategoryItem {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ProductBrandItem {
  id: string;
  businessId: string;
  name: string;
  company?: string;
  createdAt: string;
}

export interface ProductUnitItem {
  id: string;
  businessId: string;
  name: string;
  shortName: string;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number;
  totalPurchasesAmount: number;
  notes?: string;
  createdAt: string;
}

export interface SupplierRecord {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;
  openingBalance: number;
  currentBalance: number;
  totalSuppliedAmount: number;
  notes?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  businessId: string;
  expenseNo: string;
  date: string;
  category: string;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  businessId: string;
  paymentNo: string;
  date: string;
  paymentType: 'customer_receipt' | 'supplier_payment';
  partyId?: string;
  partyName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ProductionLineItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  bagCount: number;
  directWeightKg: number;
  isDirectWeightOnly?: boolean;
  totalWeightKg: number;
  percentage: number;
}

export interface ProductionProductSizeDetail {
  bagSizeKg: number;
  bagCount: number;
  totalWeightKg: number;
  percentage: number;
}

export interface ProductionProductEntry {
  productId: string;
  productNameEn: string;
  productNameUr: string;
  sizes: ProductionProductSizeDetail[];
  totalBags: number;
  totalWeightKg: number;
}

export interface ProductionSession {
  id: string;
  businessId?: string;
  recordCode: string;
  date: string;
  shiftName: string; // Morning, Evening, Night, General
  shiftNumber: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationFormatted: string;
  notes: string;
  lines: ProductionLineItem[];
  productEntries?: ProductionProductEntry[];
  totalWeightKg: number;
  totalBags: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isStockPosted: boolean;
  stockPostedAt?: string;
  stockPostedBy?: string;
  status: 'draft' | 'posted_to_stock';
}

export type StockMovementType =
  | 'opening'
  | 'production'
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'supplier_return'
  | 'waste'
  | 'adjustment_pos'
  | 'adjustment_neg';

export interface StockMovement {
  id: string;
  businessId?: string;
  date: string;
  timestamp: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  movementType: StockMovementType;
  changeBags: number;
  changeWeightKg: number;
  balanceBagsAfter: number;
  balanceWeightKgAfter: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  rate?: number; // applicable rate stored with movement
  performedBy: string;
}

export interface StockItemBalance {
  businessId?: string;
  productId: string;
  bagSizeKg: number;
  availableBags: number;
  availableWeightKg: number;
  location: string;
  minStockThreshold: number;
  rate?: number; // selling/stock rate in PKR per bag/unit
  unitCost?: number;
}

export interface SaleLineItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  unit?: string;
  bags: number;
  weightKg: number;
  unitPrice: number; // system-retrieved or manual rate
  discountPercent?: number; // discount percentage
  discountAmount?: number; // discount in PKR
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit';
export type PaymentStatus = 'paid' | 'partial' | 'credit';

export interface SaleRecord {
  id: string;
  businessId?: string;
  invoiceNo: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  lines: SaleLineItem[];
  totalBags: number;
  totalWeightKg: number;
  subtotal: number;
  discount: number; // discount in PKR
  discountPercent?: number; // discount in percentage
  taxAmount?: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  balanceAmount: number;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  status: 'completed' | 'cancelled' | 'returned';
  destinationAction?: 'returns' | 'recycle_bin' | 'return_stock';
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface ReturnRecord {
  id: string;
  businessId?: string;
  returnNo: string;
  returnType: 'customer' | 'supplier';
  date: string;
  originalSaleId?: string;
  customerOrSupplierName: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  returnedBags: number;
  returnedWeightKg: number;
  condition: 'usable' | 'damaged' | 'rejected';
  refundAmount?: number;
  reason: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface WasteRecord {
  id: string;
  businessId?: string;
  wasteNo: string;
  date: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  bags: number;
  weightKg: number;
  category: 'spillage' | 'damaged_bag' | 'contamination' | 'machine_jam' | 'quality_rejected' | 'other';
  reason: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface RecycleBinItem {
  id: string;
  businessId?: string;
  originalId: string;
  recordType: 'production' | 'sale' | 'return' | 'waste' | 'product';
  recordTitle: string;
  originalData: any;
  removedAt: string;
  removedBy: string;
  reason: string;
}

export interface MillPurchaseRecord {
  id: string;
  businessId?: string;
  purchaseNo: string;
  date: string;
  productId: string;
  productNameEn: string;
  productNameUr?: string;
  category: string;
  supplierId?: string;
  supplierName: string;
  unit?: string;
  quantityBags: number;
  bagSizeKg: number;
  totalWeightKg: number;
  purchaseRate: number; // Purchase rate per bag or unit
  totalAmount: number;
  usedBags: number;
  usedWeightKg: number;
  remainingBags: number;
  remainingWeightKg: number;
  status: 'active' | 'exhausted';
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  balanceAmount?: number;
  addedToStock?: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ActivityLogEvent {
  id: string;
  businessId?: string;
  timestamp: string;
  eventType: string;
  user: string;
  recordId?: string;
  description: string;
  result: 'success' | 'warning' | 'error';
}

export interface AppNotification {
  id: string;
  businessId?: string;
  title: string;
  message: string;
  createdAt: string;
  sender: string;
  priority: 'normal' | 'high' | 'urgent';
  isRead: boolean;
}

export type ModuleKey =
  | 'dashboard'
  | 'production'
  | 'products_catalog'
  | 'stock'
  | 'mill_purchases'
  | 'sales'
  | 'customers_suppliers'
  | 'expenses_payments'
  | 'returns'
  | 'waste_recycle'
  | 'history'
  | 'pdf_center'
  | 'settings'
  | 'admin'
  | 'profile'
  | 'about';

export type AppTheme =
  | 'ios-light'
  | 'ios-colorful'
  | 'midnight-dark'
  | 'emerald-dark'
  | 'cobalt-blue'
  | 'flourpro-light';
export type AppLanguage = 'en' | 'ur' | 'hi';

export interface AppSettings {
  isSetupComplete: boolean;
  theme: AppTheme;
  language: AppLanguage;
  autoLockMinutes: number;
  enableClosePin: boolean;
  productionAutoPostToStock: boolean;
  allowNegativeInventory: boolean;
  saleInvoicePriceMode?: 'unlocked' | 'locked';
  allowSignUp?: boolean;
  hideSignUpWhenDisabled?: boolean;
  allowedSignUpBusinessModes?: string[];
  adminPin?: string;
  profileEditPasswordHash?: string;
  profileEditPinHash?: string;
  profileEditFailedAttempts?: number;
  profileEditLockoutUntil?: string;
  defaultBagSizes: number[];
  googleDriveConnected: boolean;
  googleAccountEmail?: string;
  googleDriveFolderId?: string;
  googleDriveFolderName?: string;
  googleDriveLastConnection?: string;
  googleDriveLastBackup?: string;
  googleDriveAutoBackupIntervalSeconds: number;
  googleDriveSyncState?: 'idle' | 'syncing' | 'synced' | 'error' | 'pending';
  googleDriveLastError?: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseCollection?: string;
  firebaseSyncEnabled: boolean;
  firebaseLastSync?: string;
  firebaseSyncStatus?: 'disconnected' | 'connected' | 'syncing' | 'error';
  firebasePendingChanges?: number;
  firebaseLastError?: string;
  moduleProtection: Partial<Record<ModuleKey, boolean>>;
  hasUnsyncedChanges: boolean;
  deletedHistoryRecordIds?: string[];
}

export interface AppDatabase {
  schemaVersion: number;
  profile: BusinessProfile | null;
  businesses?: BusinessProfile[];
  activeBusinessId?: string;
  users: UserAccount[];
  products: Product[];
  bagSizes: BagSize[];
  productionSessions: ProductionSession[];
  stockBalances: StockItemBalance[];
  stockMovements: StockMovement[];
  sales: SaleRecord[];
  returns: ReturnRecord[];
  wasteRecords: WasteRecord[];
  recycleBin: RecycleBinItem[];
  activityLogs: ActivityLogEvent[];
  notifications: AppNotification[];
  millPurchases: MillPurchaseRecord[];
  customRoles: CustomRole[];
  customers?: CustomerRecord[];
  suppliers?: SupplierRecord[];
  expenses?: ExpenseRecord[];
  payments?: PaymentRecord[];
  categories?: ProductCategoryItem[];
  brands?: ProductBrandItem[];
  units?: ProductUnitItem[];
  settings: AppSettings;
}
