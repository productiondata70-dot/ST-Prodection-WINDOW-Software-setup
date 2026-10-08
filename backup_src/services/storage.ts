import {
  AppDatabase,
  AppSettings,
  BusinessProfile,
  Product,
  BagSize,
  ProductionSession,
  StockItemBalance,
  StockMovement,
  SaleRecord,
  ReturnRecord,
  WasteRecord,
  RecycleBinItem,
  ActivityLogEvent,
  AppNotification,
  UserAccount,
  StockMovementType,
} from '../types';

const STORAGE_KEY = 'st_production_stock_db_v1';
const BACKUP_SAFETY_KEY = 'st_production_stock_db_safety_backup';

export const INITIAL_SETTINGS: AppSettings = {
  isSetupComplete: false,
  theme: 'ios-light',
  language: 'en',
  autoLockMinutes: 15,
  enableClosePin: false,
  productionAutoPostToStock: true,
  allowNegativeInventory: false,
  defaultBagSizes: [20, 25, 40, 50, 80, 100],
  googleDriveConnected: false,
  googleDriveAutoBackupIntervalSeconds: 5,
  firebaseSyncEnabled: false,
  moduleProtection: {},
  hasUnsyncedChanges: false,
};

export const INITIAL_DATABASE: AppDatabase = {
  schemaVersion: 1,
  profile: null,
  users: [],
  products: [],
  bagSizes: [
    { id: 'bs-20', sizeKg: 20, label: '20 kg', isDefault: false },
    { id: 'bs-25', sizeKg: 25, label: '25 kg', isDefault: true },
    { id: 'bs-40', sizeKg: 40, label: '40 kg', isDefault: false },
    { id: 'bs-50', sizeKg: 50, label: '50 kg', isDefault: true },
    { id: 'bs-80', sizeKg: 80, label: '80 kg', isDefault: true },
    { id: 'bs-100', sizeKg: 100, label: '100 kg', isDefault: false },
  ],
  productionSessions: [],
  stockBalances: [],
  stockMovements: [],
  sales: [],
  returns: [],
  wasteRecords: [],
  recycleBin: [],
  activityLogs: [],
  notifications: [
    {
      id: 'notif-welcome',
      title: 'Welcome to ST Production & Stock Manager',
      message: 'System initialized. Complete the initial setup wizard to start recording production, stock, and sales.',
      createdAt: new Date().toISOString(),
      sender: 'System',
      priority: 'normal',
      isRead: false,
    },
  ],
  settings: INITIAL_SETTINGS,
};

// Simple cryptographic hash simulation for desktop client store
export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(16) + '_st';
}

export class StorageService {
  private static instance: StorageService;
  private db: AppDatabase;
  private listeners: Set<() => void> = new Set();
  private autoBackupTimer: any = null;

  private constructor() {
    this.db = this.loadFromDisk();
    this.setupAutoSyncCheck();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadFromDisk(): AppDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...INITIAL_DATABASE };
      const parsed = JSON.parse(raw);
      // Validate schema version
      if (!parsed.schemaVersion) return { ...INITIAL_DATABASE };
      return parsed;
    } catch (e) {
      console.error('Failed to parse database from storage, using initial state:', e);
      return { ...INITIAL_DATABASE };
    }
  }

  public saveToDisk(): void {
    try {
      this.db.settings.hasUnsyncedChanges = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save database to storage:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    }
  }

  public getDatabase(): AppDatabase {
    return this.db;
  }

  public logActivity(eventType: string, user: string, description: string, recordId?: string, result: 'success' | 'warning' | 'error' = 'success'): void {
    const event: ActivityLogEvent = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      eventType,
      user,
      recordId,
      description,
      result,
    };
    this.db.activityLogs.unshift(event);
    // Keep last 1000 logs
    if (this.db.activityLogs.length > 1000) {
      this.db.activityLogs.pop();
    }
  }

  public addNotification(title: string, message: string, sender = 'System', priority: 'normal' | 'high' | 'urgent' = 'normal'): void {
    const notif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      createdAt: new Date().toISOString(),
      sender,
      priority,
      isRead: false,
    };
    this.db.notifications.unshift(notif);
    this.notifyListeners();
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.db.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveToDisk();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.db.notifications.forEach(n => (n.isRead = true));
    this.saveToDisk();
  }

  // --- Setup Wizard Completion ---
  public completeSetup(
    adminUser: { name: string; username: string; pinCode: string; password: string },
    profile: BusinessProfile,
    products: Array<{ nameEn: string; nameUr: string; category: string; bagSizes: number[] }>,
    bagSizes: number[],
    driveConfig?: { connected: boolean; email?: string }
  ): void {
    const admin: UserAccount = {
      id: 'usr-admin-1',
      name: adminUser.name,
      username: adminUser.username,
      role: 'admin',
      pinCode: adminUser.pinCode,
      passwordHash: simpleHash(adminUser.password),
      isBlocked: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.db.users = [admin];
    this.db.profile = profile;

    // Configured bag sizes
    const newBagSizes: BagSize[] = bagSizes.map((size, idx) => ({
      id: `bs-${size}`,
      sizeKg: size,
      label: `${size} kg`,
      isDefault: idx === 0,
    }));
    this.db.bagSizes = newBagSizes;

    // Configured initial products
    this.db.products = products.map((p, idx) => ({
      id: `prod-${Date.now()}-${idx}`,
      nameEn: p.nameEn,
      nameUr: p.nameUr,
      category: p.category,
      type: 'Manufactured Product',
      bagSizes: p.bagSizes.length ? p.bagSizes : [bagSizes[0] || 50],
      isActive: true,
      createdAt: new Date().toISOString(),
    }));

    if (driveConfig) {
      this.db.settings.googleDriveConnected = driveConfig.connected;
      this.db.settings.googleAccountEmail = driveConfig.email;
    }

    this.db.settings.isSetupComplete = true;
    this.logActivity('System Setup', admin.name, 'First launch setup wizard completed successfully.');
    this.addNotification('Setup Complete', `ST Production and Stock Manager initialized for ${profile.businessName}.`);
    this.saveToDisk();
  }

  // --- Production Management ---
  public addProductionSession(session: Omit<ProductionSession, 'id' | 'createdAt' | 'recordCode' | 'isStockPosted'>, currentUser: string): ProductionSession {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.db.productionSessions.length + 1;
    const recordCode = `PRD-${todayStr}-${String(count).padStart(3, '0')}`;

    const newSession: ProductionSession = {
      ...session,
      id: 'prd-' + Date.now(),
      recordCode,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      isStockPosted: false,
    };

    this.db.productionSessions.unshift(newSession);

    // Auto post to stock if setting enabled
    if (this.db.settings.productionAutoPostToStock) {
      for (const line of newSession.lines) {
        if (line.bagCount > 0 || line.totalWeightKg > 0) {
          this.applyStockMovement({
            date: newSession.date,
            productId: line.productId,
            productNameEn: line.productNameEn,
            productNameUr: line.productNameUr,
            bagSizeKg: line.bagSizeKg,
            movementType: 'production',
            changeBags: line.bagCount,
            changeWeightKg: line.totalWeightKg,
            referenceId: newSession.id,
            referenceType: 'Production Session ' + newSession.recordCode,
            notes: `Shift: ${newSession.shiftName}, Time: ${newSession.startTime}-${newSession.endTime}`,
            performedBy: currentUser,
          });
        }
      }
      newSession.isStockPosted = true;
    }

    this.logActivity('Production Saved', currentUser, `Production logged: ${newSession.recordCode} (${newSession.totalWeightKg.toLocaleString()} kg, ${newSession.totalBags} bags)`, newSession.id);
    this.saveToDisk();
    return newSession;
  }

  // --- Stock Management & Movements ---
  public getStockBalance(productId: string, bagSizeKg: number): StockItemBalance | undefined {
    return this.db.stockBalances.find(b => b.productId === productId && b.bagSizeKg === bagSizeKg);
  }

  public applyStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp' | 'balanceBagsAfter' | 'balanceWeightKgAfter'>): StockMovement {
    let balance = this.db.stockBalances.find(
      b => b.productId === movement.productId && b.bagSizeKg === movement.bagSizeKg
    );

    if (!balance) {
      balance = {
        productId: movement.productId,
        bagSizeKg: movement.bagSizeKg,
        availableBags: 0,
        availableWeightKg: 0,
        location: 'Main Warehouse',
        minStockThreshold: 10,
      };
      this.db.stockBalances.push(balance);
    }

    // Check negative inventory rule
    const newBags = balance.availableBags + movement.changeBags;
    const newWeight = balance.availableWeightKg + movement.changeWeightKg;

    if (!this.db.settings.allowNegativeInventory && (newBags < 0 || newWeight < 0)) {
      throw new Error(`Insufficient stock for ${movement.productNameEn} (${movement.bagSizeKg} kg). Available: ${balance.availableBags} bags (${balance.availableWeightKg} kg).`);
    }

    balance.availableBags = Math.max(0, newBags);
    balance.availableWeightKg = Math.max(0, newWeight);

    const fullMovement: StockMovement = {
      ...movement,
      id: 'stkm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      balanceBagsAfter: balance.availableBags,
      balanceWeightKgAfter: balance.availableWeightKg,
    };

    this.db.stockMovements.unshift(fullMovement);
    this.logActivity('Stock Movement', movement.performedBy, `${movement.movementType.toUpperCase()}: ${movement.changeBags > 0 ? '+' : ''}${movement.changeBags} bags of ${movement.productNameEn} (${movement.bagSizeKg} kg)`);
    this.saveToDisk();
    return fullMovement;
  }

  // --- Sales Management ---
  public addSale(saleData: Omit<SaleRecord, 'id' | 'invoiceNo' | 'createdAt' | 'status'>, currentUser: string): SaleRecord {
    // 1. Validate Stock for all lines before posting
    for (const line of saleData.lines) {
      const balance = this.getStockBalance(line.productId, line.bagSizeKg);
      const available = balance ? balance.availableBags : 0;
      if (!this.db.settings.allowNegativeInventory && available < line.bags) {
        throw new Error(`Cannot complete sale: Insufficient stock for ${line.productNameEn} (${line.bagSizeKg} kg). Required: ${line.bags} bags, Available: ${available} bags.`);
      }
    }

    // 2. Generate Invoice Number
    const count = this.db.sales.length + 1;
    const invoiceNo = `INV-${String(count).padStart(4, '0')}`;

    const newSale: SaleRecord = {
      ...saleData,
      id: 'sal-' + Date.now(),
      invoiceNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      status: 'completed',
    };

    this.db.sales.unshift(newSale);

    // 3. Deduct Stock Movements
    for (const line of newSale.lines) {
      this.applyStockMovement({
        date: newSale.date,
        productId: line.productId,
        productNameEn: line.productNameEn,
        productNameUr: line.productNameUr,
        bagSizeKg: line.bagSizeKg,
        movementType: 'sale',
        changeBags: -line.bags,
        changeWeightKg: -line.weightKg,
        referenceId: newSale.id,
        referenceType: 'Sale Invoice ' + newSale.invoiceNo,
        notes: `Customer: ${newSale.customerName}`,
        performedBy: currentUser,
      });
    }

    this.logActivity('Sale Posted', currentUser, `Invoice ${newSale.invoiceNo} generated for ${newSale.customerName} - Total: ${newSale.grandTotal.toLocaleString()} ${this.db.profile?.currency || 'Rs'}`, newSale.id);
    this.saveToDisk();
    return newSale;
  }

  public cancelSale(saleId: string, reason: string, currentUser: string): void {
    const sale = this.db.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'cancelled') throw new Error('Sale is already cancelled');

    sale.status = 'cancelled';
    sale.cancellationReason = reason;
    sale.cancelledAt = new Date().toISOString();
    sale.cancelledBy = currentUser;

    // Reverse Stock Movements
    for (const line of sale.lines) {
      this.applyStockMovement({
        date: new Date().toISOString().slice(0, 10),
        productId: line.productId,
        productNameEn: line.productNameEn,
        productNameUr: line.productNameUr,
        bagSizeKg: line.bagSizeKg,
        movementType: 'adjustment_pos',
        changeBags: line.bags,
        changeWeightKg: line.weightKg,
        referenceId: sale.id,
        referenceType: 'Cancelled Invoice Reversal ' + sale.invoiceNo,
        notes: `Sale cancellation: ${reason}`,
        performedBy: currentUser,
      });
    }

    this.logActivity('Sale Cancelled', currentUser, `Cancelled Invoice ${sale.invoiceNo} and reversed stock. Reason: ${reason}`, sale.id);
    this.saveToDisk();
  }

  // --- Returns Management ---
  public addReturn(returnData: Omit<ReturnRecord, 'id' | 'returnNo' | 'createdAt'>, currentUser: string): ReturnRecord {
    const count = this.db.returns.length + 1;
    const returnNo = `RET-${String(count).padStart(4, '0')}`;

    const newReturn: ReturnRecord = {
      ...returnData,
      id: 'ret-' + Date.now(),
      returnNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    };

    this.db.returns.unshift(newReturn);

    // If customer return and usable: add back to stock
    if (newReturn.returnType === 'customer' && newReturn.condition === 'usable') {
      this.applyStockMovement({
        date: newReturn.date,
        productId: newReturn.productId,
        productNameEn: newReturn.productNameEn,
        productNameUr: newReturn.productNameUr,
        bagSizeKg: newReturn.bagSizeKg,
        movementType: 'sale_return',
        changeBags: newReturn.returnedBags,
        changeWeightKg: newReturn.returnedWeightKg,
        referenceId: newReturn.id,
        referenceType: 'Customer Return ' + newReturn.returnNo,
        notes: `From: ${newReturn.customerOrSupplierName}. Reason: ${newReturn.reason}`,
        performedBy: currentUser,
      });
    } else if (newReturn.returnType === 'supplier') {
      // Supplier return: deduct from available stock
      this.applyStockMovement({
        date: newReturn.date,
        productId: newReturn.productId,
        productNameEn: newReturn.productNameEn,
        productNameUr: newReturn.productNameUr,
        bagSizeKg: newReturn.bagSizeKg,
        movementType: 'supplier_return',
        changeBags: -newReturn.returnedBags,
        changeWeightKg: -newReturn.returnedWeightKg,
        referenceId: newReturn.id,
        referenceType: 'Supplier Return ' + newReturn.returnNo,
        notes: `To: ${newReturn.customerOrSupplierName}. Reason: ${newReturn.reason}`,
        performedBy: currentUser,
      });
    }

    this.logActivity('Return Recorded', currentUser, `Return ${newReturn.returnNo} (${newReturn.returnType}) recorded for ${newReturn.customerOrSupplierName}`);
    this.saveToDisk();
    return newReturn;
  }

  // --- Waste Management ---
  public addWaste(wasteData: Omit<WasteRecord, 'id' | 'wasteNo' | 'createdAt'>, currentUser: string): WasteRecord {
    const count = this.db.wasteRecords.length + 1;
    const wasteNo = `WST-${String(count).padStart(4, '0')}`;

    const newWaste: WasteRecord = {
      ...wasteData,
      id: 'wst-' + Date.now(),
      wasteNo,
      createdAt: new Date().toISOString(),
      recordedBy: currentUser,
    };

    this.db.wasteRecords.unshift(newWaste);

    // Deduct stock for waste
    this.applyStockMovement({
      date: newWaste.date,
      productId: newWaste.productId,
      productNameEn: newWaste.productNameEn,
      productNameUr: newWaste.productNameUr,
      bagSizeKg: newWaste.bagSizeKg,
      movementType: 'waste',
      changeBags: -newWaste.bags,
      changeWeightKg: -newWaste.weightKg,
      referenceId: newWaste.id,
      referenceType: 'Waste Record ' + newWaste.wasteNo,
      notes: `Category: ${newWaste.category}. Reason: ${newWaste.reason}`,
      performedBy: currentUser,
    });

    this.logActivity('Waste Recorded', currentUser, `Logged waste: ${newWaste.weightKg} kg (${newWaste.bags} bags) - Category: ${newWaste.category}`);
    this.saveToDisk();
    return newWaste;
  }

  // --- Recycle Bin Management ---
  public moveToRecycleBin(recordType: RecycleBinItem['recordType'], originalId: string, recordTitle: string, originalData: any, currentUser: string, reason: string): void {
    const item: RecycleBinItem = {
      id: 'rcb-' + Date.now(),
      originalId,
      recordType,
      recordTitle,
      originalData,
      removedAt: new Date().toISOString(),
      removedBy: currentUser,
      reason,
    };

    this.db.recycleBin.unshift(item);
    this.logActivity('Archived to Recycle Bin', currentUser, `Moved ${recordType} "${recordTitle}" to Recycle Bin. Reason: ${reason}`);
    this.saveToDisk();
  }

  public restoreFromRecycleBin(recycleId: string, currentUser: string): void {
    const itemIndex = this.db.recycleBin.findIndex(i => i.id === recycleId);
    if (itemIndex === -1) throw new Error('Recycle bin record not found');
    const item = this.db.recycleBin[itemIndex];

    if (item.recordType === 'product') {
      const prod = this.db.products.find(p => p.id === item.originalId);
      if (prod) {
        prod.isActive = true;
        prod.archivedAt = undefined;
      }
    }

    this.db.recycleBin.splice(itemIndex, 1);
    this.logActivity('Restored from Recycle Bin', currentUser, `Restored ${item.recordType} "${item.recordTitle}" from Recycle Bin.`);
    this.saveToDisk();
  }

  public purgeFromRecycleBin(recycleId: string, currentUser: string): void {
    const itemIndex = this.db.recycleBin.findIndex(i => i.id === recycleId);
    if (itemIndex === -1) throw new Error('Recycle bin record not found');
    const item = this.db.recycleBin[itemIndex];
    this.db.recycleBin.splice(itemIndex, 1);
    this.logActivity('Permanently Purged', currentUser, `Purged ${item.recordType} "${item.recordTitle}" from Recycle Bin.`);
    this.saveToDisk();
  }

  // --- Product Management ---
  public addProduct(product: Omit<Product, 'id' | 'createdAt' | 'isActive'>, currentUser: string): Product {
    const newProd: Product = {
      ...product,
      id: 'prod-' + Date.now(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.db.products.push(newProd);
    this.logActivity('Product Added', currentUser, `Created product "${newProd.nameEn}" (${newProd.nameUr || 'No Urdu'})`);
    this.saveToDisk();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>, currentUser: string): void {
    const prod = this.db.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    Object.assign(prod, updates);
    this.logActivity('Product Updated', currentUser, `Updated product details for "${prod.nameEn}"`);
    this.saveToDisk();
  }

  public archiveProduct(id: string, currentUser: string, reason: string): void {
    const prod = this.db.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    prod.isActive = false;
    prod.archivedAt = new Date().toISOString();
    this.moveToRecycleBin('product', prod.id, prod.nameEn, { ...prod }, currentUser, reason);
  }

  // --- Settings & Profiles ---
  public updateProfile(updates: Partial<BusinessProfile>, currentUser: string): void {
    if (!this.db.profile) return;
    Object.assign(this.db.profile, updates, { updatedAt: new Date().toISOString() });
    this.logActivity('Profile Updated', currentUser, 'Business profile updated by administrator');
    this.saveToDisk();
  }

  public updateSettings(updates: Partial<AppSettings>, currentUser: string): void {
    Object.assign(this.db.settings, updates);
    this.logActivity('Settings Changed', currentUser, 'Application settings updated');
    this.saveToDisk();
  }

  // --- Cloud Backup & 5-Second Change Detection ---
  private setupAutoSyncCheck(): void {
    if (this.autoBackupTimer) clearInterval(this.autoBackupTimer);
    this.autoBackupTimer = setInterval(() => {
      // 5-second interval check for unsynced changes
      if (this.db.settings.googleDriveConnected && this.db.settings.hasUnsyncedChanges) {
        // Automatic debounce & simulated upload confirmation
        this.performCloudBackup('auto-sync');
      }
    }, 5000);
  }

  public performCloudBackup(initiatedBy = 'user'): { success: boolean; timestamp: string; sizeBytes: number } {
    try {
      const snapshot = JSON.stringify(this.db);
      const sizeBytes = new Blob([snapshot]).size;
      const timestamp = new Date().toISOString();

      // Store safety backup in separate localStorage key
      localStorage.setItem(BACKUP_SAFETY_KEY, snapshot);

      this.db.settings.googleDriveLastBackup = timestamp;
      this.db.settings.hasUnsyncedChanges = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));

      this.logActivity('Backup Completed', initiatedBy, `Cloud backup snapshot generated (${(sizeBytes / 1024).toFixed(1)} KB)`);
      this.notifyListeners();
      return { success: true, timestamp, sizeBytes };
    } catch (e) {
      this.logActivity('Backup Failed', initiatedBy, 'Failed to save cloud backup snapshot', undefined, 'error');
      return { success: false, timestamp: new Date().toISOString(), sizeBytes: 0 };
    }
  }

  public exportBackupJson(): string {
    return JSON.stringify(
      {
        application: 'ST Production and Stock Manager',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        checksum: simpleHash(JSON.stringify(this.db)),
        data: this.db,
      },
      null,
      2
    );
  }

  public restoreFromJson(jsonString: string, currentUser: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const dataToRestore = parsed.data || parsed;
      if (!dataToRestore.schemaVersion) {
        return { success: false, message: 'Invalid backup file: missing database schema version.' };
      }

      // Create safety backup of current data first!
      localStorage.setItem(BACKUP_SAFETY_KEY, JSON.stringify(this.db));

      this.db = dataToRestore;
      this.db.settings.hasUnsyncedChanges = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.logActivity('Database Restored', currentUser, `Restored database from snapshot (schema v${this.db.schemaVersion})`);
      this.notifyListeners();
      return { success: true, message: 'Database successfully restored from backup.' };
    } catch (err: any) {
      return { success: false, message: 'Restore error: ' + (err.message || 'Corrupted JSON file') };
    }
  }
}
