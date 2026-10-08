export type BusinessType = 'factory' | 'flour_mill' | 'shop';

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: BusinessType;
  address: string;
  contactNumber: string;
  email: string;
  logoUrl?: string;
  plantSupervisor: string;
  factoryManager: string;
  ownerName: string;
  registrationNumber: string;
  currency: string;
  notes: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pinCode: string;
  passwordHash: string;
  isBlocked: boolean;
  blockReason?: string;
  blockExpiresAt?: string;
  createdAt: string;
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
  nameEn: string;
  nameUr: string;
  category: string;
  type: string;
  bagSizes: number[]; // bag sizes in kg available for this product
  sku?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  archivedAt?: string;
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

export interface ProductionSession {
  id: string;
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
  totalWeightKg: number;
  totalBags: number;
  createdBy: string;
  createdAt: string;
  isStockPosted: boolean;
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
  performedBy: string;
}

export interface StockItemBalance {
  productId: string;
  bagSizeKg: number;
  availableBags: number;
  availableWeightKg: number;
  location: string;
  minStockThreshold: number;
  unitCost?: number;
}

export interface SaleLineItem {
  id: string;
  productId: string;
  productNameEn: string;
  productNameUr: string;
  bagSizeKg: number;
  bags: number;
  weightKg: number;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit';
export type PaymentStatus = 'paid' | 'partial' | 'credit';

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  lines: SaleLineItem[];
  totalBags: number;
  totalWeightKg: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  balanceAmount: number;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface ReturnRecord {
  id: string;
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
  originalId: string;
  recordType: 'production' | 'sale' | 'return' | 'waste' | 'product';
  recordTitle: string;
  originalData: any;
  removedAt: string;
  removedBy: string;
  reason: string;
}

export interface ActivityLogEvent {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  recordId?: string;
  description: string;
  result: 'success' | 'warning' | 'error';
}

export interface AppNotification {
  id: string;
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
  | 'stock'
  | 'sales'
  | 'returns'
  | 'waste_recycle'
  | 'history'
  | 'pdf_center'
  | 'settings'
  | 'admin'
  | 'profile'
  | 'about';

export type AppTheme = 'ios-light' | 'midnight-dark' | 'emerald-dark' | 'cobalt-blue';
export type AppLanguage = 'en' | 'ur' | 'hi';

export interface AppSettings {
  isSetupComplete: boolean;
  theme: AppTheme;
  language: AppLanguage;
  autoLockMinutes: number;
  enableClosePin: boolean;
  productionAutoPostToStock: boolean;
  allowNegativeInventory: boolean;
  defaultBagSizes: number[];
  googleDriveConnected: boolean;
  googleAccountEmail?: string;
  googleDriveLastBackup?: string;
  googleDriveAutoBackupIntervalSeconds: number;
  firebaseProjectId?: string;
  firebaseSyncEnabled: boolean;
  firebaseLastSync?: string;
  moduleProtection: Partial<Record<ModuleKey, boolean>>;
  hasUnsyncedChanges: boolean;
}

export interface AppDatabase {
  schemaVersion: number;
  profile: BusinessProfile | null;
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
  settings: AppSettings;
}
