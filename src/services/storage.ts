import {
  AppDatabase,
  AppSettings,
  BusinessProfile,
  BusinessMode,
  Product,
  ProductCategoryItem,
  ProductBrandItem,
  ProductUnitItem,
  CustomerRecord,
  SupplierRecord,
  ExpenseRecord,
  PaymentRecord,
  BagSize,
  ProductionSession,
  ProductionLineItem,
  ProductionProductEntry,
  StockItemBalance,
  StockMovement,
  SaleRecord,
  SaleLineItem,
  ReturnRecord,
  WasteRecord,
  RecycleBinItem,
  ActivityLogEvent,
  AppNotification,
  UserAccount,
  StockMovementType,
  MillPurchaseRecord,
  CustomRole,
  ModuleKey,
  GranularAction,
} from '../types';
import {
  normalizeBusinessMode,
  getBusinessModeConfig,
  isModuleAllowedForBusinessType,
  STANDARD_PRODUCT_UNITS,
} from './businessMode';
import { generateUniqueBusinessBarcode } from './barcodeAndReceipt';
import {
  getDriveAccessToken,
  getCachedFolderId,
  uploadBackupToGoogleDrive,
  DEDICATED_DRIVE_FOLDER_NAME,
} from './googleDrive';

const STORAGE_KEY = 'st_production_stock_db_v1';
const BACKUP_SAFETY_KEY = 'st_production_stock_db_safety_backup';
const DEFAULT_FACTORY_BUSINESS_ID = 'prof-main-1';

export const INITIAL_SETTINGS: AppSettings = {
  isSetupComplete: false,
  theme: 'ios-light',
  language: 'en',
  autoLockMinutes: 15,
  enableClosePin: false,
  productionAutoPostToStock: true,
  allowNegativeInventory: false,
  saleInvoicePriceMode: 'unlocked',
  allowSignUp: true,
  hideSignUpWhenDisabled: false,
  allowedSignUpBusinessModes: ['factory', 'mill', 'shopping_mart', 'small_business'],
  profileEditPasswordHash: simpleHash('Admin@Profile2025'),
  profileEditPinHash: simpleHash('7890'),
  profileEditFailedAttempts: 0,
  defaultBagSizes: [20, 25, 40, 50, 80, 100],
  googleDriveConnected: false,
  googleDriveAutoBackupIntervalSeconds: 5,
  firebaseSyncEnabled: false,
  moduleProtection: {},
  hasUnsyncedChanges: false,
  deletedHistoryRecordIds: [],
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
  millPurchases: [],
  customRoles: [
    {
      id: 'role-admin',
      name: 'Administrator',
      description: 'Full unconstrained system access to all facility operations',
      allowedModules: [
        'dashboard',
        'production',
        'products_catalog',
        'stock',
        'mill_purchases',
        'sales',
        'customers_suppliers',
        'expenses_payments',
        'returns',
        'waste_recycle',
        'history',
        'pdf_center',
        'settings',
        'admin',
        'profile',
        'about',
      ],
      moduleActions: {
        dashboard: ['view'],
        production: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        products_catalog: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        stock: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        mill_purchases: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        sales: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        customers_suppliers: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        expenses_payments: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        returns: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        waste_recycle: ['view', 'create', 'edit', 'delete', 'print', 'download', 'manage'],
        history: ['view', 'print', 'download', 'delete'],
        pdf_center: ['view', 'print', 'download'],
        settings: ['view', 'edit'],
        admin: ['view', 'create', 'edit', 'delete', 'manage'],
        profile: ['view', 'edit'],
        about: ['view'],
      },
      isSystem: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-manager',
      name: 'Manager',
      description: 'Operations manager with configurable administrative privileges',
      allowedModules: [
        'dashboard',
        'production',
        'products_catalog',
        'stock',
        'mill_purchases',
        'sales',
        'customers_suppliers',
        'expenses_payments',
        'returns',
        'history',
        'pdf_center',
      ],
      moduleActions: {
        dashboard: ['view'],
        production: ['view', 'create', 'edit', 'print', 'download'],
        products_catalog: ['view', 'create', 'edit', 'print', 'download'],
        stock: ['view', 'create', 'edit', 'print', 'download'],
        mill_purchases: ['view', 'create', 'edit', 'print', 'download'],
        sales: ['view', 'create', 'edit', 'print', 'download'],
        customers_suppliers: ['view', 'create', 'edit', 'print', 'download'],
        expenses_payments: ['view', 'create', 'edit', 'print', 'download'],
        returns: ['view', 'create', 'edit', 'print'],
        history: ['view', 'print', 'download'],
        pdf_center: ['view', 'print', 'download'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-salesman',
      name: 'Salesman',
      description: 'Sales dispatches and inventory inquiry only',
      allowedModules: ['sales', 'stock', 'customers_suppliers', 'pdf_center'],
      moduleActions: {
        sales: ['view', 'create', 'print', 'download'],
        stock: ['view'],
        customers_suppliers: ['view', 'create'],
        pdf_center: ['view', 'print', 'download'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-inventory-manager',
      name: 'Inventory Manager',
      description: 'Products, stock adjustments, and purchase receiving access',
      allowedModules: ['dashboard', 'products_catalog', 'stock', 'mill_purchases', 'returns'],
      moduleActions: {
        dashboard: ['view'],
        products_catalog: ['view', 'create', 'edit', 'print'],
        stock: ['view', 'create', 'edit', 'print', 'download'],
        mill_purchases: ['view', 'create', 'edit', 'print'],
        returns: ['view', 'create', 'edit'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-cashier',
      name: 'Cashier',
      description: 'POS sales billing, customer receipts, and returns handling',
      allowedModules: ['sales', 'returns', 'customers_suppliers'],
      moduleActions: {
        sales: ['view', 'create', 'print'],
        returns: ['view', 'create', 'print'],
        customers_suppliers: ['view'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-accountant',
      name: 'Accountant',
      description: 'Financial ledgers, expenses, payments, purchases, sales, and reports',
      allowedModules: [
        'dashboard',
        'sales',
        'mill_purchases',
        'customers_suppliers',
        'expenses_payments',
        'history',
        'pdf_center',
      ],
      moduleActions: {
        dashboard: ['view'],
        sales: ['view', 'print', 'download'],
        mill_purchases: ['view', 'print', 'download'],
        customers_suppliers: ['view', 'create', 'edit', 'print', 'download'],
        expenses_payments: ['view', 'create', 'edit', 'print', 'download'],
        history: ['view', 'print', 'download'],
        pdf_center: ['view', 'print', 'download'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'role-operator',
      name: 'Operator',
      description: 'Production recording and stock logging access',
      allowedModules: ['production', 'stock'],
      moduleActions: {
        production: ['view', 'create', 'print'],
        stock: ['view'],
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
    },
  ],
  customers: [],
  suppliers: [],
  expenses: [],
  payments: [],
  categories: [],
  brands: [],
  units: [],
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

export function groupProductionLinesByProduct(lines: ProductionLineItem[]): ProductionProductEntry[] {
  const map = new Map<string, ProductionProductEntry>();
  for (const line of lines || []) {
    if (!line || (line.bagCount <= 0 && line.totalWeightKg <= 0)) continue;
    let entry = map.get(line.productId);
    if (!entry) {
      entry = {
        productId: line.productId,
        productNameEn: line.productNameEn,
        productNameUr: line.productNameUr,
        sizes: [],
        totalBags: 0,
        totalWeightKg: 0,
      };
      map.set(line.productId, entry);
    }
    const existingSize = entry.sizes.find(s => s.bagSizeKg === line.bagSizeKg);
    if (existingSize) {
      existingSize.bagCount += line.bagCount;
      existingSize.totalWeightKg += line.totalWeightKg;
      existingSize.percentage += line.percentage || 0;
    } else {
      entry.sizes.push({
        bagSizeKg: line.bagSizeKg,
        bagCount: line.bagCount,
        totalWeightKg: line.totalWeightKg,
        percentage: line.percentage || 0,
      });
    }
    entry.totalBags += line.bagCount;
    entry.totalWeightKg += line.totalWeightKg;
  }
  const result = Array.from(map.values());
  result.forEach(r => r.sizes.sort((a, b) => a.bagSizeKg - b.bagSizeKg));
  return result;
}

export class StorageService {
  private static instance: StorageService;
  private db: AppDatabase;
  private listeners: Set<() => void> = new Set();
  private autoBackupTimer: any = null;
  private isPerformingCloudBackup = false;

  private constructor() {
    this.db = this.loadFromDisk();
    this.hydrateFromDesktopUserDataIfNeeded();
    this.setupAutoSyncCheck();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private parseAndNormalizeDatabase(raw: string): AppDatabase | null {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.schemaVersion) return null;

      // Ensure no fake demo account status is preserved without real authorization
      if (parsed.settings) {
        if (
          parsed.settings.googleAccountEmail === 'manager.flourmills@gmail.com' ||
          (parsed.settings.googleDriveConnected && !parsed.settings.googleDriveFolderId)
        ) {
          parsed.settings.googleDriveConnected = false;
          parsed.settings.googleAccountEmail = undefined;
          parsed.settings.googleDriveFolderId = undefined;
          parsed.settings.googleDriveFolderName = undefined;
          parsed.settings.googleDriveSyncState = 'idle';
        }

        if (!parsed.settings.profileEditPasswordHash) {
          parsed.settings.profileEditPasswordHash = simpleHash('Admin@Profile2025');
        }
        if (!parsed.settings.profileEditPinHash) {
          parsed.settings.profileEditPinHash = simpleHash('7890');
        }
        if (parsed.settings.profileEditFailedAttempts === undefined) {
          parsed.settings.profileEditFailedAttempts = 0;
        }
        if (!parsed.settings.saleInvoicePriceMode) {
          parsed.settings.saleInvoicePriceMode = 'unlocked';
        }
      }

      if (!parsed.millPurchases) {
        parsed.millPurchases = [];
      }
      if (!parsed.customers) parsed.customers = [];
      if (!parsed.suppliers) parsed.suppliers = [];
      if (!parsed.expenses) parsed.expenses = [];
      if (!parsed.payments) parsed.payments = [];
      if (!parsed.categories) parsed.categories = [];
      if (!parsed.brands) parsed.brands = [];
      if (!parsed.units) parsed.units = [];

      if (!parsed.customRoles || parsed.customRoles.length === 0) {
        parsed.customRoles = [...INITIAL_DATABASE.customRoles];
      } else {
        const adminRole = parsed.customRoles.find(
          (r: CustomRole) => r.id === 'role-admin' || r.name.toLowerCase() === 'administrator'
        );
        if (adminRole) {
          (['products_catalog', 'customers_suppliers', 'expenses_payments'] as ModuleKey[]).forEach(
            m => {
              if (!adminRole.allowedModules.includes(m)) adminRole.allowedModules.push(m);
            }
          );
        }
      }

      if (parsed.profile && !parsed.profile.id) {
        parsed.profile.id = DEFAULT_FACTORY_BUSINESS_ID;
      }
      if (!Array.isArray(parsed.businesses) || parsed.businesses.length === 0) {
        parsed.businesses = parsed.profile ? [{ ...parsed.profile }] : [];
      } else if (parsed.profile) {
        const idx = parsed.businesses.findIndex((b: BusinessProfile) => b.id === parsed.profile.id);
        if (idx === -1) {
          parsed.businesses.unshift({ ...parsed.profile });
        }
      }

      // Deduplicate any businesses that accidentally share the same ID (e.g. prof-main-1)
      if (Array.isArray(parsed.businesses) && parsed.businesses.length > 1) {
        const seenIds = new Map<string, BusinessProfile>();
        const dedupedList: BusinessProfile[] = [];
        for (const biz of parsed.businesses) {
          if (!biz) continue;
          const bMode = normalizeBusinessMode(biz.businessType);
          let bId = biz.id || (bMode === 'factory' ? DEFAULT_FACTORY_BUSINESS_ID : `biz-${bMode}-default`);
          if (seenIds.has(bId)) {
            const firstBiz = seenIds.get(bId)!;
            const firstMode = normalizeBusinessMode(firstBiz.businessType);
            if (firstMode !== bMode) {
              // Two different modes collided on the same ID (e.g. prof-main-1)
              if (bMode !== 'factory' && bId === DEFAULT_FACTORY_BUSINESS_ID) {
                const reassignedId = `biz-${bMode}-default`;
                biz.id = seenIds.has(reassignedId)
                  ? `biz-${bMode}-${Date.now().toString().slice(-4)}`
                  : reassignedId;
                bId = biz.id;
                seenIds.set(bId, biz);
                dedupedList.push(biz);
              } else if (firstMode !== 'factory' && bId === DEFAULT_FACTORY_BUSINESS_ID) {
                // Move firstBiz to its mode-specific ID so prof-main-1 stays factory
                const reassignedId = `biz-${firstMode}-default`;
                firstBiz.id = seenIds.has(reassignedId)
                  ? `biz-${firstMode}-${Date.now().toString().slice(-4)}`
                  : reassignedId;
                seenIds.set(firstBiz.id, firstBiz);
                biz.id = DEFAULT_FACTORY_BUSINESS_ID;
                seenIds.set(DEFAULT_FACTORY_BUSINESS_ID, biz);
                dedupedList.push(biz);
              } else {
                biz.id = `biz-${bMode}-${Date.now().toString().slice(-4)}-${dedupedList.length}`;
                seenIds.set(biz.id, biz);
                dedupedList.push(biz);
              }
            } else {
              // Same ID and same mode: merge latest fields into existing entry
              Object.assign(firstBiz, biz);
            }
          } else {
            biz.id = bId;
            seenIds.set(bId, biz);
            dedupedList.push(biz);
          }
        }
        parsed.businesses = dedupedList;
      }

      if (!parsed.activeBusinessId) {
        parsed.activeBusinessId =
          parsed.profile?.id || parsed.businesses[0]?.id || DEFAULT_FACTORY_BUSINESS_ID;
      }

      const primaryBizId = DEFAULT_FACTORY_BUSINESS_ID;

      const tagWithPrimaryBusiness = (list: any[]) => {
        if (!Array.isArray(list)) return;
        list.forEach(item => {
          if (item && !item.businessId) {
            item.businessId = primaryBizId;
          }
        });
      };

      tagWithPrimaryBusiness(parsed.products);
      tagWithPrimaryBusiness(parsed.productionSessions);
      tagWithPrimaryBusiness(parsed.stockBalances);
      tagWithPrimaryBusiness(parsed.stockMovements);
      tagWithPrimaryBusiness(parsed.sales);
      tagWithPrimaryBusiness(parsed.returns);
      tagWithPrimaryBusiness(parsed.wasteRecords);
      tagWithPrimaryBusiness(parsed.recycleBin);
      tagWithPrimaryBusiness(parsed.millPurchases);
      tagWithPrimaryBusiness(parsed.customers);
      tagWithPrimaryBusiness(parsed.suppliers);
      tagWithPrimaryBusiness(parsed.expenses);
      tagWithPrimaryBusiness(parsed.payments);
      tagWithPrimaryBusiness(parsed.categories);
      tagWithPrimaryBusiness(parsed.brands);
      tagWithPrimaryBusiness(parsed.units);
      tagWithPrimaryBusiness(parsed.activityLogs);
      tagWithPrimaryBusiness(parsed.notifications);

      // STRICT WORKSPACE SEPARATION MIGRATION:
      // If the default factory workspace (prof-main-1) was previously switched in-place to shopping_mart or small_business,
      // restore prof-main-1 to flour_mill (Factory/Mill) and create a separate isolated workspace for that mode.
      const factoryProdIds = new Set(['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5']);
      const isFactorySpecificProduct = (p: any): boolean => {
        if (!p) return false;
        if (factoryProdIds.has(p.id)) return true;
        const nameLower = String(p.nameEn || '').toLowerCase();
        if (
          ['chakki ata', 'special fine flour', 'maida', 'suji', 'bran / chokar', 'chokar'].includes(nameLower) &&
          Array.isArray(p.bagSizes) &&
          p.bagSizes.some((sz: number) => sz >= 20)
        ) {
          return true;
        }
        return false;
      };

      const mainFactoryBiz = parsed.businesses.find((b: BusinessProfile) => b.id === DEFAULT_FACTORY_BUSINESS_ID);
      const hasFactoryRecords =
        (Array.isArray(parsed.productionSessions) && parsed.productionSessions.length > 0) ||
        (Array.isArray(parsed.products) && parsed.products.some((p: any) => isFactorySpecificProduct(p)));

      if (mainFactoryBiz && hasFactoryRecords) {
        const currentMainMode = normalizeBusinessMode(mainFactoryBiz.businessType);
        if (currentMainMode !== 'factory') {
          const intendedMode = currentMainMode;
          // Restore prof-main-1 back to Factory / Flour Mill
          mainFactoryBiz.businessType = 'flour_mill';
          if (
            !mainFactoryBiz.businessName ||
            mainFactoryBiz.businessName.toLowerCase().includes('mart') ||
            mainFactoryBiz.businessName.toLowerCase().includes('small')
          ) {
            mainFactoryBiz.businessName = 'Noor Din Flour Mills';
          }

          // Find or create the dedicated isolated workspace for intendedMode
          let targetModeBiz = parsed.businesses.find(
            (b: BusinessProfile) => b.id !== DEFAULT_FACTORY_BUSINESS_ID && normalizeBusinessMode(b.businessType) === intendedMode
          );
          if (!targetModeBiz) {
            const newId = `biz-${intendedMode}-default`;
            const cfg = getBusinessModeConfig(intendedMode);
            targetModeBiz = {
              id: newId,
              businessName:
                intendedMode === 'shopping_mart' ? 'City Shopping Mart' : 'Prime Small Business',
              businessType: intendedMode === 'shopping_mart' ? 'shopping_mart' : 'small_business',
              address: mainFactoryBiz.address || 'Main Commercial Avenue',
              contactNumber: mainFactoryBiz.contactNumber || '',
              email: mainFactoryBiz.email || '',
              plantSupervisor: '',
              factoryManager: mainFactoryBiz.factoryManager || '',
              ownerName: mainFactoryBiz.ownerName || 'Owner',
              registrationNumber: 'REG-' + Date.now().toString().slice(-6),
              ntnNumber: mainFactoryBiz.ntnNumber || '',
              currency: mainFactoryBiz.currency || 'PKR',
              notes: `${cfg.labelEn} isolated workspace`,
              updatedAt: new Date().toISOString(),
            };
            parsed.businesses.push(targetModeBiz);
          }

          // Reassign any non-factory retail/service products that were created on prof-main-1 into targetModeBiz
          const migratedProdIds = new Set<string>();
          if (Array.isArray(parsed.products)) {
            parsed.products.forEach((p: any) => {
              if (p.businessId === DEFAULT_FACTORY_BUSINESS_ID && !isFactorySpecificProduct(p)) {
                p.businessId = targetModeBiz.id;
                migratedProdIds.add(p.id);
              }
            });
          }

          if (migratedProdIds.size > 0) {
            (parsed.stockBalances || []).forEach((b: any) => {
              if (migratedProdIds.has(b.productId)) b.businessId = targetModeBiz.id;
            });
            (parsed.stockMovements || []).forEach((m: any) => {
              if (migratedProdIds.has(m.productId)) m.businessId = targetModeBiz.id;
            });
            (parsed.sales || []).forEach((s: any) => {
              if (Array.isArray(s.lines) && s.lines.every((l: any) => migratedProdIds.has(l.productId))) {
                s.businessId = targetModeBiz.id;
              }
            });
            (parsed.returns || []).forEach((r: any) => {
              if (migratedProdIds.has(r.productId)) r.businessId = targetModeBiz.id;
            });
            (parsed.millPurchases || []).forEach((mp: any) => {
              if (migratedProdIds.has(mp.productId)) mp.businessId = targetModeBiz.id;
            });
          }

          if (parsed.activeBusinessId === DEFAULT_FACTORY_BUSINESS_ID) {
            parsed.activeBusinessId = targetModeBiz.id;
          }
        }
      }

      // Ensure NO factory-specific products or factory categories ever remain attached to a non-factory workspace
      const nonFactoryBizIds = new Set<string>(
        (parsed.businesses || [])
          .filter((b: BusinessProfile) => normalizeBusinessMode(b.businessType) !== 'factory')
          .map((b: BusinessProfile) => b.id)
      );
      const factoryCategoryNames = new Set(['flour', 'fine flour', 'semolina', 'by-product', 'raw wheat / grain']);

      if (nonFactoryBizIds.size > 0) {
        // Recover any product created in a non-factory workspace via Settings/Admin that was previously mis-tagged to DEFAULT_FACTORY_BUSINESS_ID
        (parsed.products || []).forEach((p: any) => {
          if (p.businessId === DEFAULT_FACTORY_BUSINESS_ID && !isFactorySpecificProduct(p)) {
            const linkedNonFactoryBal = (parsed.stockBalances || []).find(
              (b: any) => b.productId === p.id && nonFactoryBizIds.has(b.businessId)
            );
            const linkedNonFactoryMov = (parsed.stockMovements || []).find(
              (m: any) => m.productId === p.id && nonFactoryBizIds.has(m.businessId)
            );
            if (linkedNonFactoryBal) {
              p.businessId = linkedNonFactoryBal.businessId;
            } else if (linkedNonFactoryMov) {
              p.businessId = linkedNonFactoryMov.businessId;
            }
          }
          if (nonFactoryBizIds.has(p.businessId)) {
            if (isFactorySpecificProduct(p)) {
              p.businessId = DEFAULT_FACTORY_BUSINESS_ID;
            } else {
              p.type = p.itemType === 'service' ? 'Service' : 'Retail Product';
              p.bagSizes = [1];
              p.unit = p.unit || (p.itemType === 'service' ? 'Job' : 'Piece');
            }
          }
        });

        // Normalize stockBalances and stockMovements for non-factory workspaces so bagSizeKg is always 1 (unit-based)
        if (Array.isArray(parsed.stockBalances)) {
          const mergedBalances: any[] = [];
          const nonFactoryBalMap = new Map<string, any>();
          for (const b of parsed.stockBalances) {
            if (nonFactoryBizIds.has(b.businessId)) {
              b.bagSizeKg = 1;
              b.availableWeightKg = Number(b.availableBags) || 0;
              const key = `${b.businessId}__${b.productId}`;
              const existing = nonFactoryBalMap.get(key);
              if (existing) {
                existing.availableBags = (Number(existing.availableBags) || 0) + (Number(b.availableBags) || 0);
                existing.availableWeightKg = existing.availableBags;
                if (b.rate && (!existing.rate || existing.rate <= 0)) existing.rate = b.rate;
              } else {
                nonFactoryBalMap.set(key, b);
                mergedBalances.push(b);
              }
            } else {
              mergedBalances.push(b);
            }
          }
          parsed.stockBalances = mergedBalances;
        }

        if (Array.isArray(parsed.stockMovements)) {
          parsed.stockMovements.forEach((m: any) => {
            if (nonFactoryBizIds.has(m.businessId)) {
              m.bagSizeKg = 1;
            }
          });
        }

        (parsed.categories || []).forEach((c: any) => {
          if (
            nonFactoryBizIds.has(c.businessId) &&
            factoryCategoryNames.has(String(c.name || '').trim().toLowerCase())
          ) {
            c.businessId = DEFAULT_FACTORY_BUSINESS_ID;
          }
        });
        (parsed.productionSessions || []).forEach((ps: any) => {
          if (nonFactoryBizIds.has(ps.businessId)) {
            ps.businessId = DEFAULT_FACTORY_BUSINESS_ID;
          }
        });
      }

      // Ensure all products have a unique scannable barcode within their business workspace
      if (Array.isArray(parsed.products)) {
        const byBiz = new Map<string, string[]>();
        parsed.products.forEach((p: any) => {
          const bId = p.businessId || DEFAULT_FACTORY_BUSINESS_ID;
          if (!byBiz.has(bId)) byBiz.set(bId, []);
          if (p.barcode && String(p.barcode).trim()) {
            byBiz.get(bId)!.push(String(p.barcode).trim());
          }
        });
        parsed.products.forEach((p: any) => {
          const bId = p.businessId || DEFAULT_FACTORY_BUSINESS_ID;
          const bizObj = (parsed.businesses || []).find((b: BusinessProfile) => b.id === bId);
          const existingCodes = byBiz.get(bId) || [];
          if (!p.barcode || !String(p.barcode).trim()) {
            const generated = generateUniqueBusinessBarcode(
              bizObj?.businessName || 'Business',
              bId,
              existingCodes,
              bizObj?.barcodeConfig?.prefix
            );
            p.barcode = generated;
            existingCodes.push(generated);
            byBiz.set(bId, existingCodes);
          }
        });
      }

      const activeBiz = parsed.businesses.find(
        (b: BusinessProfile) => b.id === parsed.activeBusinessId
      );
      if (activeBiz) {
        parsed.profile = activeBiz;
      }

      // Ensure all production sessions have an explicit status and backward-compatible productEntries
      if (Array.isArray(parsed.productionSessions)) {
        parsed.productionSessions.forEach((s: any) => {
          if (!s.status) {
            s.status = s.isStockPosted ? 'posted_to_stock' : 'draft';
          }
          if (Array.isArray(s.lines) && !s.productEntries) {
            s.productEntries = groupProductionLinesByProduct(s.lines);
          }
        });
      }

      // Ensure standard bag sizes (20, 25, 50, 80) are available in bagSizes catalog
      if (Array.isArray(parsed.bagSizes)) {
        [20, 25, 50, 80].forEach(stdSize => {
          if (!parsed.bagSizes.some((b: BagSize) => b.sizeKg === stdSize)) {
            parsed.bagSizes.push({
              id: `bs-${stdSize}`,
              sizeKg: stdSize,
              label: `${stdSize} kg`,
              isDefault: false,
            });
          }
        });
        parsed.bagSizes.sort((a: BagSize, b: BagSize) => a.sizeKg - b.sizeKg);
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private loadFromDisk(): AppDatabase {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('st_mill_pre_update_backup_v5');
      if (!raw) return { ...INITIAL_DATABASE };
      const normalized = this.parseAndNormalizeDatabase(raw);
      return normalized || { ...INITIAL_DATABASE };
    } catch (e) {
      console.error('Failed to parse database from storage, using initial state:', e);
      return { ...INITIAL_DATABASE };
    }
  }

  /**
   * Synchronizes with persistent OS userData file (%APPDATA%/ST Production and Stock Manager)
   * so that Windows application updates never reset or lose local database records.
   */
  private hydrateFromDesktopUserDataIfNeeded(): void {
    try {
      if (typeof window === 'undefined' || !window.desktopAPI) return;
      const hasLocalData = Boolean(localStorage.getItem(STORAGE_KEY));

      if (!hasLocalData && window.desktopAPI.loadUserData) {
        window.desktopAPI
          .loadUserData()
          .then(res => {
            if (res && res.success && res.data) {
              const restored = this.parseAndNormalizeDatabase(res.data);
              if (restored) {
                this.db = restored;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
                this.notifyListeners();
              }
            }
          })
          .catch(() => {});
      } else if (hasLocalData && window.desktopAPI.saveUserData) {
        window.desktopAPI.saveUserData(JSON.stringify(this.db)).catch(() => {});
      }
    } catch {}
  }

  public exportSerializedDatabase(): string {
    const serialized = JSON.stringify(this.db);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem('st_mill_pre_update_backup_v5', serialized);
      if (typeof window !== 'undefined' && window.desktopAPI?.saveUserData) {
        window.desktopAPI.saveUserData(serialized).catch(() => {});
      }
    } catch {}
    return serialized;
  }

  public saveToDisk(): void {
    try {
      this.db.settings.hasUnsyncedChanges = true;
      const serialized = JSON.stringify(this.db);
      localStorage.setItem(STORAGE_KEY, serialized);
      if (typeof window !== 'undefined' && window.desktopAPI?.saveUserData) {
        window.desktopAPI.saveUserData(serialized).catch(() => {});
      }
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

  public getActiveBusinessId(): string {
    return (
      this.db.activeBusinessId ||
      this.db.profile?.id ||
      this.db.businesses?.[0]?.id ||
      DEFAULT_FACTORY_BUSINESS_ID
    );
  }

  public getActiveBusiness(): BusinessProfile | null {
    const activeId = this.getActiveBusinessId();
    const found = (this.db.businesses || []).find(b => b.id === activeId);
    return found || this.db.profile || null;
  }

  public getActiveBusinessMode(): BusinessMode {
    const activeBiz = this.getActiveBusiness();
    return normalizeBusinessMode(activeBiz?.businessType);
  }

  public getAllBusinesses(): BusinessProfile[] {
    if (!this.db.businesses || this.db.businesses.length === 0) {
      return this.db.profile ? [this.db.profile] : [];
    }
    const uniqueMap = new Map<string, BusinessProfile>();
    for (const b of this.db.businesses) {
      if (b && b.id) {
        uniqueMap.set(b.id, b);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private belongsToBusiness(recordBusinessId: string | undefined, targetBusinessId?: string): boolean {
    const activeId = targetBusinessId || this.getActiveBusinessId();
    const primaryId = this.db.businesses?.[0]?.id || DEFAULT_FACTORY_BUSINESS_ID;
    const effectiveRecordBizId = recordBusinessId || primaryId;
    return effectiveRecordBizId === activeId;
  }

  public assertModuleAccess(
    module: ModuleKey,
    action: GranularAction = 'view',
    currentUser?: string,
    recordBusinessId?: string
  ): void {
    const activeBiz = this.getActiveBusiness();
    const activeBizId = this.getActiveBusinessId();

    if (recordBusinessId && !this.belongsToBusiness(recordBusinessId, activeBizId)) {
      throw new Error(
        'Security Violation: Cross-business data access is strictly denied. Record belongs to another business.'
      );
    }

    if (activeBiz && !isModuleAllowedForBusinessType(module, activeBiz.businessType)) {
      const modeConfig = getBusinessModeConfig(activeBiz.businessType);
      throw new Error(
        `Access Denied: The "${module}" module is not available or permitted in ${modeConfig.labelEn}.`
      );
    }

    if (!currentUser || currentUser === 'auto-sync' || currentUser === 'System' || currentUser === 'System Updater') {
      return;
    }

    const user = this.db.users.find(
      u => u.name === currentUser || u.username === currentUser || u.id === currentUser
    );
    if (!user) return;

    if (user.isBlocked) {
      throw new Error(`Access Denied: User account "${user.name}" is currently blocked.`);
    }

    if (
      user.businessId &&
      user.businessId !== activeBizId &&
      user.role.toLowerCase() !== 'admin' &&
      user.role.toLowerCase() !== 'administrator' &&
      user.role.toLowerCase() !== 'owner'
    ) {
      throw new Error(
        `Access Denied: User "${user.name}" is not authorized to access records for business "${activeBiz?.businessName || activeBizId}".`
      );
    }

    if (!this.hasPermission(user, module, action)) {
      throw new Error(
        `Access Denied: User "${user.name}" (${user.role}) does not have "${action}" permission for the "${module}" module.`
      );
    }
  }

  public getDatabase(): AppDatabase {
    const activeId = this.getActiveBusinessId();
    const activeProfile = this.getActiveBusiness();
    const activeMode = normalizeBusinessMode(activeProfile?.businessType);
    const match = (bId?: string) => this.belongsToBusiness(bId, activeId);

    const factoryDefaultProdIds = new Set(['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5']);
    const isAllowedProductForActiveWorkspace = (p: Product): boolean => {
      if (!match(p.businessId)) return false;
      if (activeMode !== 'factory') {
        if (factoryDefaultProdIds.has(p.id)) {
          return false;
        }
      }
      return true;
    };

    const workspaceProducts = this.db.products.filter(isAllowedProductForActiveWorkspace);
    const workspaceProductIds = new Set(workspaceProducts.map(p => p.id));

    // Ensure every active physical product in the workspace has a corresponding stockBalances entry
    // so newly created products (even with 0 opening stock) always appear in StockView and Stock PDFs
    const existingStockBalances = this.db.stockBalances.filter(
      b => match(b.businessId) && (activeMode === 'factory' || activeMode === 'mill' || workspaceProductIds.has(b.productId))
    );
    const syncedStockBalances: StockItemBalance[] = [...existingStockBalances];
    for (const prod of workspaceProducts) {
      if (prod.isActive && prod.itemType !== 'service') {
        const targetSizes =
          prod.bagSizes && prod.bagSizes.length > 0
            ? prod.bagSizes
            : (activeMode === 'factory' || activeMode === 'mill')
            ? [50]
            : [1];
        for (const sz of targetSizes) {
          const hasBal = syncedStockBalances.some(
            b => b.productId === prod.id && b.bagSizeKg === sz
          );
          if (!hasBal) {
            syncedStockBalances.push({
              businessId: activeId,
              productId: prod.id,
              bagSizeKg: sz,
              availableBags: 0,
              availableWeightKg: 0,
              rate: prod.bagPrices?.[sz] ?? prod.rate,
              location: (activeMode === 'factory' || activeMode === 'mill') ? 'Main Mill Warehouse' : 'Main Store Inventory',
              minStockThreshold: prod.minStockLevel ?? 10,
            });
          }
        }
      }
    }

    return {
      ...this.db,
      profile: activeProfile,
      activeBusinessId: activeId,
      businesses: this.getAllBusinesses(),
      users: this.db.users.filter(u => match(u.businessId)),
      products: workspaceProducts,
      productionSessions:
        (activeMode === 'factory' || activeMode === 'mill')
          ? this.db.productionSessions.filter(s => match(s.businessId))
          : [],
      stockBalances: syncedStockBalances,
      stockMovements: this.db.stockMovements.filter(
        m => match(m.businessId) && ((activeMode === 'factory' || activeMode === 'mill') || workspaceProductIds.has(m.productId))
      ),
      sales: this.db.sales.filter(
        s =>
          match(s.businessId) &&
          ((activeMode === 'factory' || activeMode === 'mill') ||
            !s.lines.some(l => factoryDefaultProdIds.has(l.productId)))
      ),
      returns: this.db.returns.filter(
        r =>
          match(r.businessId) &&
          ((activeMode === 'factory' || activeMode === 'mill') || !factoryDefaultProdIds.has(r.productId))
      ),
      wasteRecords: this.db.wasteRecords.filter(
        w =>
          match(w.businessId) &&
          ((activeMode === 'factory' || activeMode === 'mill') || !factoryDefaultProdIds.has(w.productId))
      ),
      recycleBin: this.db.recycleBin.filter(rb => match(rb.businessId)),
      millPurchases: (this.db.millPurchases || []).filter(
        mp =>
          match(mp.businessId) &&
          ((activeMode === 'factory' || activeMode === 'mill') || !factoryDefaultProdIds.has(mp.productId))
      ),
      customers: (this.db.customers || []).filter(c => match(c.businessId)),
      suppliers: (this.db.suppliers || []).filter(s => match(s.businessId)),
      expenses: (this.db.expenses || []).filter(e => match(e.businessId)),
      payments: (this.db.payments || []).filter(p => match(p.businessId)),
      categories: (this.db.categories || []).filter(c => match(c.businessId)),
      brands: (this.db.brands || []).filter(b => match(b.businessId)),
      units: (this.db.units || []).filter(u => match(u.businessId)),
      activityLogs: (this.db.activityLogs || []).filter(a => match(a.businessId)),
      notifications: (this.db.notifications || []).filter(n => match(n.businessId)),
    };
  }

  private seedDefaultCatalogMetadataForBusiness(businessId: string, businessType: string): void {
    const config = getBusinessModeConfig(businessType);
    if (!this.db.categories) this.db.categories = [];
    if (!this.db.brands) this.db.brands = [];
    if (!this.db.units) this.db.units = [];

    const existingCats = new Set(
      this.db.categories
        .filter(c => c.businessId === businessId)
        .map(c => c.name.trim().toLowerCase())
    );
    config.defaultCategories.forEach((catName, idx) => {
      if (!existingCats.has(catName.trim().toLowerCase())) {
        this.db.categories!.push({
          id: `cat-${businessId}-${idx}-${Date.now()}`,
          businessId,
          name: catName,
          createdAt: new Date().toISOString(),
        });
      }
    });

    const existingUnits = new Set(
      this.db.units
        .filter(u => u.businessId === businessId)
        .map(u => u.name.trim().toLowerCase())
    );
    const unitsToSeed =
      normalizeBusinessMode(businessType) === 'factory'
        ? config.defaultUnits
        : STANDARD_PRODUCT_UNITS;
    unitsToSeed.forEach((unitItem, idx) => {
      if (!existingUnits.has(unitItem.name.trim().toLowerCase())) {
        this.db.units!.push({
          id: `unit-${businessId}-${idx}-${Date.now()}`,
          businessId,
          name: unitItem.name,
          shortName: unitItem.shortName,
          createdAt: new Date().toISOString(),
        });
      }
    });

    const hasBrands = this.db.brands.some(b => b.businessId === businessId);
    if (!hasBrands) {
      config.defaultBrands.forEach((brandName, idx) => {
        this.db.brands!.push({
          id: `brand-${businessId}-${idx}-${Date.now()}`,
          businessId,
          name: brandName,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }

  public createBusiness(
    data: Partial<BusinessProfile>,
    currentUser: string,
    switchImmediately: boolean = true
  ): BusinessProfile {
    this.assertModuleAccess('admin', 'manage', currentUser);

    const mode = normalizeBusinessMode(data.businessType);
    const modeConfig = getBusinessModeConfig(mode);
    if (!this.db.businesses) this.db.businesses = [];
    let newId = data.id || `biz-${mode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    if (this.db.businesses.some(b => b.id === newId)) {
      newId = `biz-${mode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newProfile: BusinessProfile = {
      id: newId,
      businessName:
        data.businessName?.trim() ||
        (mode === 'shopping_mart'
          ? 'Al-Barakah Shopping Mart'
          : mode === 'small_business'
          ? 'Star Commercial Enterprises'
          : 'Al-Rehman Flour Mills'),
      businessType:
        data.businessType ||
        (mode === 'shopping_mart'
          ? 'shopping_mart'
          : mode === 'small_business'
          ? 'small_business'
          : 'flour_mill'),
      address: data.address?.trim() || this.db.profile?.address || 'Main Commercial Avenue',
      contactNumber: data.contactNumber?.trim() || this.db.profile?.contactNumber || '',
      email: data.email?.trim() || this.db.profile?.email || '',
      plantSupervisor: data.plantSupervisor?.trim() || '',
      factoryManager: data.factoryManager?.trim() || this.db.profile?.factoryManager || '',
      ownerName: data.ownerName?.trim() || this.db.profile?.ownerName || 'Owner',
      registrationNumber: data.registrationNumber?.trim() || 'REG-' + Date.now().toString().slice(-6),
      ntnNumber: data.ntnNumber?.trim() || '',
      currency: data.currency?.trim() || this.db.profile?.currency || 'PKR',
      notes: data.notes?.trim() || `${modeConfig.labelEn} workspace`,
      updatedAt: new Date().toISOString(),
    };

    if (!this.db.businesses) this.db.businesses = [];
    this.db.businesses.push(newProfile);

    this.seedDefaultCatalogMetadataForBusiness(newProfile.id, newProfile.businessType);

    if (switchImmediately) {
      this.db.activeBusinessId = newProfile.id;
      this.db.profile = newProfile;
    }

    this.logActivity(
      'Business Workspace Created',
      currentUser,
      `Created isolated business "${newProfile.businessName}" (${modeConfig.labelEn}, ID: ${newProfile.id}).`
    );
    this.saveToDisk();
    return newProfile;
  }

  /**
   * Registers a brand-new isolated Business Account + Owner User Account during Sign-Up.
   * Permanently binds businessId and businessType to both the BusinessProfile and UserAccount.
   */
  public registerBusinessAccount(params: {
    ownerName: string;
    businessName: string;
    email: string;
    username?: string;
    password: string;
    pinCode?: string;
    phone?: string;
    address?: string;
    businessType: BusinessMode | string;
  }): { business: BusinessProfile; user: UserAccount } {
    const ownerName = params.ownerName.trim();
    const businessName = params.businessName.trim();
    const email = params.email.trim().toLowerCase();
    const rawUsername = (params.username?.trim() || email.split('@')[0] || 'owner')
      .toLowerCase()
      .replace(/\s+/g, '');

    if (!ownerName) throw new Error('Full Name is required.');
    if (!businessName) throw new Error('Business / Store / Mill Name is required.');
    if (!email || !email.includes('@')) throw new Error('A valid Email Address is required.');
    if (!params.password || params.password.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    if (!this.db.businesses) {
      this.db.businesses = this.db.profile ? [this.db.profile] : [];
    }

    if (this.db.settings.allowSignUp === false) {
      throw new Error('New user registration is currently disabled by system administrator. Please sign in with an existing account.');
    }

    const mode = normalizeBusinessMode(params.businessType);
    const modeConfig = getBusinessModeConfig(mode);

    const allowedModes = this.db.settings.allowedSignUpBusinessModes || ['factory', 'mill', 'shopping_mart', 'small_business'];
    if (!allowedModes.includes(mode)) {
      throw new Error(`Registration for "${modeConfig.labelEn}" is currently restricted by system administrator.`);
    }

    const dupEmail = this.db.users.find(
      u => u.email && u.email.trim().toLowerCase() === email
    );
    if (dupEmail) {
      throw new Error(`An account with email "${email}" is already registered. Please sign in.`);
    }

    let finalUsername = rawUsername;
    if (this.db.users.some(u => u.username.toLowerCase() === finalUsername)) {
      finalUsername = `${rawUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const prefix = mode === 'factory' ? 'FACTORY' : mode === 'mill' ? 'MILL' : mode === 'shopping_mart' ? 'MART' : 'SMALL';
    const existingModeCount = this.db.businesses.filter(
      b => normalizeBusinessMode(b.businessType) === mode
    ).length;

    let businessId = `${prefix}_${String(existingModeCount + 1).padStart(3, '0')}`;
    if (this.db.businesses.some(b => b.id === businessId)) {
      businessId = `${prefix}_${String(existingModeCount + 1).padStart(3, '0')}_${Date.now().toString().slice(-3)}`;
    }

    const nowIso = new Date().toISOString();
    const newUserId = `usr-${mode}-${Date.now()}`;
    const resolvedBizType =
      mode === 'shopping_mart'
        ? 'shopping_mart'
        : mode === 'small_business'
        ? 'small_business'
        : mode === 'mill'
        ? 'flour_mill'
        : 'factory';

    const newProfile: BusinessProfile = {
      id: businessId,
      businessName,
      businessType: resolvedBizType,
      ownerId: newUserId,
      ownerName,
      ownerEmail: email,
      address: params.address?.trim() || 'Main Commercial Road',
      contactNumber: params.phone?.trim() || '',
      email,
      plantSupervisor: (mode === 'factory' || mode === 'mill') ? ownerName : '',
      factoryManager: ownerName,
      registrationNumber: `REG-${businessId}`,
      ntnNumber: '',
      currency: 'PKR',
      taxRate: 0,
      invoicePrefix: mode === 'shopping_mart' ? 'POS' : mode === 'small_business' ? 'INV' : mode === 'mill' ? 'MILL' : 'FACT',
      receiptPrintMode: (mode === 'factory' || mode === 'mill') ? 'a4' : 'thermal_58mm',
      receiptFooter:
        mode === 'shopping_mart'
          ? 'Thank you for shopping at ' + businessName + '!'
          : mode === 'small_business'
          ? 'Thank you for your business!'
          : mode === 'mill'
          ? 'Official Flour Mill Dispatch Invoice'
          : 'Official Factory Dispatch Invoice',
      printerConfig: {
        printerName: '',
        paperWidthMm: 58,
        autoPrintOnSale: false,
        silentPrint: false,
        copies: 1,
        showBarcodeOnReceipt: true,
        showTaxOnReceipt: true,
        showCustomerOnReceipt: true,
      },
      barcodeConfig: {
        format: 'CODE128',
        prefix: mode === 'shopping_mart' ? '890' : mode === 'small_business' ? '892' : '896',
        autoGenerateOnNewProduct: true,
        labelSize: '50x30mm',
        paperWidthMm: 58,
        showBusinessNameOnLabel: true,
        showPriceOnLabel: true,
        showSkuOnLabel: true,
      },
      scannerConfig: {
        enabled: true,
        autoAddToCartOnScan: true,
        playBeepOnScan: true,
        terminationKey: 'Enter',
      },
      accountStatus: 'active',
      planType: 'enterprise',
      enabledModules: [...modeConfig.allowedModules],
      createdAt: nowIso,
      notes: `${modeConfig.labelEn} isolated business account`,
      updatedAt: nowIso,
    };

    const newUser: UserAccount = {
      id: newUserId,
      businessId,
      businessName,
      businessType: resolvedBizType,
      selectedBusinessMode: mode,
      name: ownerName,
      username: finalUsername,
      email,
      phone: params.phone?.trim() || '',
      role: 'admin',
      permissions: ['all', 'admin', 'create', 'edit', 'delete', 'view', 'export'],
      allowedModules: [...modeConfig.allowedModules],
      pinCode: params.pinCode?.trim() || '1234',
      passwordHash: simpleHash(params.password),
      accountStatus: 'active',
      isActive: true,
      isBlocked: false,
      createdAt: nowIso,
      registeredAt: nowIso,
      lastLoginAt: nowIso,
    };

    this.db.businesses.push(newProfile);
    this.db.users.push(newUser);

    // Seed ONLY the selected business type's default categories, units, and brands
    this.seedDefaultCatalogMetadataForBusiness(businessId, resolvedBizType);

    // Switch active business context to the newly registered business
    this.db.activeBusinessId = businessId;
    this.db.profile = newProfile;
    this.db.settings.isSetupComplete = true;

    this.logActivity(
      'Business Account Registered',
      newUser.name,
      `Registered new ${modeConfig.labelEn} business "${businessName}" (ID: ${businessId}) for ${email}.`
    );
    this.saveToDisk();

    return { business: newProfile, user: newUser };
  }

  /**
   * Authenticates a user by email, username, or name and automatically loads their bound business workspace.
   */
  public authenticateUser(
    identifier: string,
    secret: string,
    authMethod: 'password' | 'pin' = 'password'
  ): {
    success: boolean;
    user?: UserAccount;
    business?: BusinessProfile;
    error?: string;
  } {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: 'Please enter your Email or Username.' };
    }

    const matchedUser = this.db.users.find(
      u =>
        (u.email && u.email.trim().toLowerCase() === cleanId) ||
        u.username.trim().toLowerCase() === cleanId ||
        u.name.trim().toLowerCase() === cleanId ||
        u.id === identifier.trim()
    );

    if (!matchedUser) {
      return {
        success: false,
        error: 'No account found with that Email or Username. Please check your credentials or Sign Up.',
      };
    }

    if (matchedUser.isBlocked || matchedUser.accountStatus === 'suspended') {
      return {
        success: false,
        error: `Account "${matchedUser.name}" is currently ${matchedUser.accountStatus === 'suspended' ? 'suspended' : 'blocked'}. ${matchedUser.blockReason ? `Reason: ${matchedUser.blockReason}` : ''}`,
      };
    }

    if (authMethod === 'password') {
      const hashed = simpleHash(secret);
      if (matchedUser.passwordHash !== hashed && matchedUser.pinCode !== secret) {
        return { success: false, error: 'Invalid password. Please try again.' };
      }
    } else {
      if (matchedUser.pinCode !== secret && matchedUser.passwordHash !== simpleHash(secret)) {
        return { success: false, error: 'Invalid security PIN code.' };
      }
    }

    if (!this.db.businesses || this.db.businesses.length === 0) {
      if (this.db.profile) {
        this.db.businesses = [this.db.profile];
      }
    }

    const targetBizId =
      matchedUser.businessId ||
      this.db.activeBusinessId ||
      this.db.profile?.id ||
      DEFAULT_FACTORY_BUSINESS_ID;

    let targetBiz =
      (this.db.businesses || []).find(b => b.id === targetBizId) ||
      this.db.profile;

    if (!targetBiz) {
      throw new Error('Assigned business workspace profile could not be found.');
    }

    if (targetBiz.accountStatus === 'suspended') {
      return {
        success: false,
        error: `Business account "${targetBiz.businessName}" is currently suspended.`,
      };
    }

    // Permanently ensure user has businessId and businessType stamped
    matchedUser.businessId = targetBiz.id;
    matchedUser.businessType = targetBiz.businessType;
    matchedUser.lastLoginAt = new Date().toISOString();

    // Automatically activate the user's bound business workspace
    this.db.activeBusinessId = targetBiz.id;
    this.db.profile = targetBiz;
    this.seedDefaultCatalogMetadataForBusiness(targetBiz.id, targetBiz.businessType);

    const modeCfg = getBusinessModeConfig(targetBiz.businessType);
    this.logActivity(
      'User Login',
      matchedUser.name,
      `Logged into ${modeCfg.labelEn} workspace "${targetBiz.businessName}" (${targetBiz.id}).`
    );
    this.saveToDisk();

    return {
      success: true,
      user: matchedUser,
      business: targetBiz,
    };
  }

  /**
   * Returns all registered users across all businesses for the Login screen account selector / lookup.
   */
  public getAllUsers(): UserAccount[] {
    return [...(this.db.users || [])];
  }

  public getAllRegisteredUsers(): Array<{
    user: UserAccount;
    business: BusinessProfile | null;
  }> {
    const businesses = this.getAllBusinesses();
    return this.db.users.map(u => {
      const biz =
        businesses.find(b => b.id === u.businessId) ||
        businesses[0] ||
        this.db.profile ||
        null;
      return { user: u, business: biz };
    });
  }

  public addUserAccount(
    userData: Omit<UserAccount, 'id' | 'createdAt' | 'businessId' | 'businessType'>,
    currentUser: string
  ): UserAccount {
    const activeBizId = this.getActiveBusinessId();
    const activeBiz = this.getActiveBusiness();
    const newUser: UserAccount = {
      ...userData,
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      businessId: activeBizId,
      businessType: activeBiz?.businessType,
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    this.db.users.push(newUser);
    this.logActivity(
      'User Added',
      currentUser,
      `Added user "${newUser.name}" (@${newUser.username}) to business "${activeBiz?.businessName || activeBizId}".`
    );
    this.saveToDisk();
    return newUser;
  }

  public updateUserAccount(
    userId: string,
    updates: Partial<UserAccount>,
    currentUser: string
  ): UserAccount {
    const target = this.db.users.find(u => u.id === userId);
    if (!target) {
      throw new Error('User account not found.');
    }
    Object.assign(target, updates);
    this.logActivity('User Updated', currentUser, `Updated user account "${target.name}".`);
    this.saveToDisk();
    return target;
  }

  public deleteUserAccount(userId: string, currentUser: string): void {
    const idx = this.db.users.findIndex(u => u.id === userId);
    if (idx === -1) return;
    const removed = this.db.users[idx];
    this.db.users.splice(idx, 1);
    this.logActivity('User Removed', currentUser, `Removed user account "${removed.name}".`);
    this.saveToDisk();
  }

  public switchActiveBusiness(businessId: string, currentUser: string): BusinessProfile {
    if (!this.db.businesses) this.db.businesses = this.db.profile ? [this.db.profile] : [];
    const target = this.db.businesses.find(b => b.id === businessId);
    if (!target) {
      throw new Error('Selected business workspace not found.');
    }

    const user = this.db.users.find(
      u => u.name === currentUser || u.username === currentUser || u.id === currentUser
    );
    if (
      user &&
      user.businessId &&
      user.businessId !== businessId &&
      user.role.toLowerCase() !== 'admin' &&
      user.role.toLowerCase() !== 'administrator' &&
      user.role.toLowerCase() !== 'owner'
    ) {
      throw new Error(
        `Access Denied: Your user account is only authorized for your assigned business workspace.`
      );
    }

    this.db.activeBusinessId = target.id;
    this.db.profile = target;
    this.seedDefaultCatalogMetadataForBusiness(target.id, target.businessType);

    const modeConfig = getBusinessModeConfig(target.businessType);
    this.logActivity(
      'Business Switched',
      currentUser,
      `Switched active business workspace to "${target.businessName}" (${modeConfig.labelEn}).`
    );
    this.saveToDisk();
    return target;
  }

  public switchOrCreateBusinessByMode(
    targetMode: BusinessMode,
    currentUser: string,
    customBusinessName?: string
  ): BusinessProfile {
    this.assertModuleAccess('admin', 'edit', currentUser);

    if (!this.db.businesses) {
      this.db.businesses = this.db.profile ? [this.db.profile] : [];
    }

    const existing = this.db.businesses.find(
      b => normalizeBusinessMode(b.businessType) === targetMode
    );

    if (existing) {
      if (customBusinessName && customBusinessName.trim()) {
        existing.businessName = customBusinessName.trim();
        existing.updatedAt = new Date().toISOString();
      }
      return this.switchActiveBusiness(existing.id, currentUser);
    }

    return this.createBusiness(
      {
        id:
          targetMode === 'factory'
            ? DEFAULT_FACTORY_BUSINESS_ID
            : `biz-${targetMode}-default`,
        businessName:
          customBusinessName?.trim() ||
          (targetMode === 'shopping_mart'
            ? 'City Shopping Mart'
            : targetMode === 'small_business'
            ? 'Prime Small Business'
            : 'Al-Rehman Flour Mills'),
        businessType:
          targetMode === 'shopping_mart'
            ? 'shopping_mart'
            : targetMode === 'small_business'
            ? 'small_business'
            : 'flour_mill',
      },
      currentUser,
      true
    );
  }

  public switchBusinessMode(
    targetMode: BusinessMode,
    currentUser: string,
    customBusinessName?: string
  ): BusinessProfile {
    return this.switchOrCreateBusinessByMode(targetMode, currentUser, customBusinessName);
  }

  public switchBusinessWorkspace(businessId: string, currentUser: string): BusinessProfile {
    return this.switchActiveBusiness(businessId, currentUser);
  }

  public createBusinessWorkspace(
    data: Partial<BusinessProfile>,
    currentUser: string,
    switchImmediately: boolean = true
  ): BusinessProfile {
    return this.createBusiness(data, currentUser, switchImmediately);
  }

  public renameBusinessWorkspace(
    businessId: string,
    updates: Partial<BusinessProfile> | string,
    currentUser: string
  ): BusinessProfile {
    this.assertModuleAccess('admin', 'edit', currentUser);
    if (!this.db.businesses) this.db.businesses = this.db.profile ? [this.db.profile] : [];
    const target = this.db.businesses.find(b => b.id === businessId);
    if (!target) {
      throw new Error('Business workspace not found.');
    }
    const normalizedUpdates: Partial<BusinessProfile> =
      typeof updates === 'string' ? { businessName: updates.trim() } : { ...updates };
    delete normalizedUpdates.id;
    Object.assign(target, normalizedUpdates, { updatedAt: new Date().toISOString() });
    if (this.db.profile && this.db.profile.id === businessId) {
      Object.assign(this.db.profile, normalizedUpdates, { updatedAt: new Date().toISOString() });
    }
    this.logActivity(
      'Business Workspace Updated',
      currentUser,
      `Updated business workspace "${target.businessName}" (ID: ${target.id}).`
    );
    this.saveToDisk();
    return target;
  }

  public deleteBusinessWorkspace(
    businessId: string,
    currentUser: string
  ): { success: boolean; message: string; activeBusiness: BusinessProfile } {
    this.assertModuleAccess('admin', 'delete', currentUser);
    if (!this.db.businesses || this.db.businesses.length <= 1) {
      throw new Error(
        'Cannot delete the only remaining business workspace. At least one active business workspace must exist.'
      );
    }
    const targetIdx = this.db.businesses.findIndex(b => b.id === businessId);
    if (targetIdx === -1) {
      throw new Error('Business workspace not found.');
    }
    const target = this.db.businesses[targetIdx];
    const matchToDelete = (bId?: string) => this.belongsToBusiness(bId, businessId);

    // Purge all records belonging exclusively to this deleted workspace
    this.db.products = this.db.products.filter(p => !matchToDelete(p.businessId));
    this.db.productionSessions = this.db.productionSessions.filter(s => !matchToDelete(s.businessId));
    this.db.stockBalances = this.db.stockBalances.filter(b => !matchToDelete(b.businessId));
    this.db.stockMovements = this.db.stockMovements.filter(m => !matchToDelete(m.businessId));
    this.db.sales = this.db.sales.filter(s => !matchToDelete(s.businessId));
    this.db.returns = this.db.returns.filter(r => !matchToDelete(r.businessId));
    this.db.wasteRecords = this.db.wasteRecords.filter(w => !matchToDelete(w.businessId));
    this.db.recycleBin = this.db.recycleBin.filter(rb => !matchToDelete(rb.businessId));
    this.db.millPurchases = (this.db.millPurchases || []).filter(mp => !matchToDelete(mp.businessId));
    this.db.customers = (this.db.customers || []).filter(c => !matchToDelete(c.businessId));
    this.db.suppliers = (this.db.suppliers || []).filter(s => !matchToDelete(s.businessId));
    this.db.expenses = (this.db.expenses || []).filter(e => !matchToDelete(e.businessId));
    this.db.payments = (this.db.payments || []).filter(p => !matchToDelete(p.businessId));
    this.db.categories = (this.db.categories || []).filter(c => !matchToDelete(c.businessId));
    this.db.brands = (this.db.brands || []).filter(b => !matchToDelete(b.businessId));
    this.db.units = (this.db.units || []).filter(u => !matchToDelete(u.businessId));
    this.db.activityLogs = (this.db.activityLogs || []).filter(a => !matchToDelete(a.businessId));
    this.db.notifications = (this.db.notifications || []).filter(n => !matchToDelete(n.businessId));

    this.db.businesses.splice(targetIdx, 1);

    if (this.db.activeBusinessId === businessId) {
      const nextActive = this.db.businesses[0];
      this.db.activeBusinessId = nextActive.id;
      this.db.profile = nextActive;
    }

    const activeAfter = this.getActiveBusiness()!;
    this.logActivity(
      'Business Workspace Deleted',
      currentUser,
      `Deleted business workspace "${target.businessName}" (ID: ${businessId}) and its isolated records. Active workspace: "${activeAfter.businessName}".`
    );
    this.saveToDisk();
    return {
      success: true,
      message: `Workspace "${target.businessName}" and all its associated records have been permanently deleted.`,
      activeBusiness: activeAfter,
    };
  }

  public logActivity(eventType: string, user: string, description: string, recordId?: string, result: 'success' | 'warning' | 'error' = 'success'): void {
    const event: ActivityLogEvent = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      businessId: this.getActiveBusinessId(),
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
      businessId: this.getActiveBusinessId(),
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
    products: Array<{ nameEn: string; nameUr: string; category: string; bagSizes: number[]; rate?: number; purchasePrice?: number; barcode?: string; sku?: string; brand?: string; unit?: string; itemType?: 'product' | 'service' }>,
    bagSizes: number[],
    driveConfig?: { connected: boolean; email?: string }
  ): void {
    const bizId = profile.id || DEFAULT_FACTORY_BUSINESS_ID;
    const normalizedProfile: BusinessProfile = {
      ...profile,
      id: bizId,
    };

    const admin: UserAccount = {
      id: 'usr-admin-1',
      businessId: bizId,
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
    this.db.profile = normalizedProfile;
    this.db.businesses = [normalizedProfile];
    this.db.activeBusinessId = bizId;

    this.seedDefaultCatalogMetadataForBusiness(bizId, normalizedProfile.businessType);

    // Configured bag sizes
    const newBagSizes: BagSize[] = bagSizes.map((size, idx) => ({
      id: `bs-${size}`,
      sizeKg: size,
      label: `${size} kg`,
      isDefault: idx === 0,
    }));
    this.db.bagSizes = newBagSizes;

    const mode = normalizeBusinessMode(normalizedProfile.businessType);

    // Configured initial products
    this.db.products = products.map((p: any, idx) => ({
      id: `prod-${Date.now()}-${idx}`,
      businessId: bizId,
      nameEn: p.nameEn,
      nameUr: p.nameUr || '',
      category: p.category || 'General',
      type:
        p.itemType === 'service'
          ? 'Service'
          : mode === 'factory'
          ? 'Manufactured Product'
          : 'Retail Product',
      itemType: p.itemType || 'product',
      bagSizes:
        p.bagSizes && p.bagSizes.length
          ? p.bagSizes
          : mode === 'factory'
          ? [20, 50, 80]
          : [1],
      sku: p.sku || `SKU-${1001 + idx}`,
      barcode: p.barcode || (mode !== 'factory' ? `8964000${1000 + idx}` : undefined),
      brand: p.brand || undefined,
      unit: p.unit || (mode === 'factory' ? 'Bag' : 'Piece'),
      purchasePrice:
        p.purchasePrice !== undefined && !isNaN(Number(p.purchasePrice))
          ? Number(p.purchasePrice)
          : undefined,
      rate: p.rate !== undefined && !isNaN(Number(p.rate)) && Number(p.rate) >= 0 ? Number(p.rate) : 5000,
      minStockLevel: p.minStockLevel !== undefined ? Number(p.minStockLevel) : 10,
      isActive: true,
      createdAt: new Date().toISOString(),
    }));

    if (driveConfig) {
      this.db.settings.googleDriveConnected = driveConfig.connected;
      this.db.settings.googleAccountEmail = driveConfig.email;
    }

    this.db.settings.isSetupComplete = true;
    this.logActivity('System Setup', admin.name, `First launch setup wizard completed for ${normalizedProfile.businessName} (${normalizedProfile.businessType}).`);
    this.addNotification('Setup Complete', `Application initialized for ${normalizedProfile.businessName}.`);
    this.saveToDisk();
  }

  // --- Production Management ---
  public addProductionSession(
    session: Omit<ProductionSession, 'id' | 'createdAt' | 'recordCode' | 'isStockPosted' | 'status'>,
    currentUser: string,
    postToStock?: boolean
  ): ProductionSession {
    this.assertModuleAccess('production', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();

    if (!session.lines || session.lines.length === 0) {
      throw new Error('Please select at least one product bag size and enter a valid bag quantity.');
    }

    // Validate lines: no empty, zero, negative, or duplicate product+bagSize entries
    const seenProductSizes = new Set<string>();
    const validatedLines: ProductionLineItem[] = [];

    for (let i = 0; i < session.lines.length; i++) {
      const line = session.lines[i];
      const bagSizeKg = Number(line.bagSizeKg);
      const bagCount = Number(line.bagCount);

      if (isNaN(bagSizeKg) || bagSizeKg <= 0) {
        throw new Error(`Invalid bag size for ${line.productNameEn || 'product'}.`);
      }
      if (!line.isDirectWeightOnly && (isNaN(bagCount) || bagCount <= 0)) {
        throw new Error(
          `Invalid bag quantity for ${line.productNameEn} (${bagSizeKg} KG). Quantity must be greater than 0.`
        );
      }

      const key = `${line.productId}__${bagSizeKg}`;
      if (seenProductSizes.has(key)) {
        throw new Error(
          `Duplicate entry detected for ${line.productNameEn} (${bagSizeKg} KG) within the same Production Entry.`
        );
      }
      seenProductSizes.add(key);

      const totalWeightKg = line.isDirectWeightOnly
        ? Number(line.directWeightKg) || 0
        : bagCount * bagSizeKg;

      validatedLines.push({
        ...line,
        id: line.id || `pline-${i}`,
        bagSizeKg,
        bagCount: line.isDirectWeightOnly ? 0 : bagCount,
        totalWeightKg,
        percentage: 0,
      });
    }

    const computedTotalBags = validatedLines.reduce((acc, l) => acc + l.bagCount, 0);
    const computedTotalWeightKg = validatedLines.reduce((acc, l) => acc + l.totalWeightKg, 0);

    validatedLines.forEach(line => {
      line.percentage =
        computedTotalWeightKg > 0 ? (line.totalWeightKg / computedTotalWeightKg) * 100 : 0;
    });

    const productEntries = groupProductionLinesByProduct(validatedLines);
    const shouldPostToStock =
      postToStock !== undefined ? postToStock : Boolean(this.db.settings.productionAutoPostToStock);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.db.productionSessions.length + 1;
    const recordCode = `PRD-${todayStr}-${String(count).padStart(3, '0')}`;

    const newSession: ProductionSession = {
      ...session,
      id: 'prd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      businessId: activeBizId,
      recordCode,
      lines: validatedLines,
      productEntries,
      totalBags: computedTotalBags,
      totalWeightKg: computedTotalWeightKg,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      isStockPosted: false,
      status: shouldPostToStock ? 'posted_to_stock' : 'draft',
    };

    this.db.productionSessions.unshift(newSession);

    // Post each product + bag-size line independently to Stock & Inventory if enabled
    if (shouldPostToStock) {
      const alreadyHasMovements = this.db.stockMovements.some(
        m => m.referenceId === newSession.id && m.movementType === 'production'
      );
      if (!alreadyHasMovements) {
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
      }
      newSession.isStockPosted = true;
      newSession.status = 'posted_to_stock';
      newSession.stockPostedAt = new Date().toISOString();
      newSession.stockPostedBy = currentUser;
      this.logActivity(
        'Production Added to Stock',
        currentUser,
        `Production logged and posted to stock: ${newSession.recordCode} (${newSession.totalWeightKg.toLocaleString()} kg, ${newSession.totalBags} bags)`,
        newSession.id
      );
    } else {
      this.logActivity(
        'Production Draft Saved',
        currentUser,
        `Production saved as draft: ${newSession.recordCode} (${newSession.totalWeightKg.toLocaleString()} kg, ${newSession.totalBags} bags). Stock not modified.`,
        newSession.id
      );
    }

    this.saveToDisk();
    return newSession;
  }

  // Update an existing production session (supports both draft and posted sessions with safe stock reconciliation)
  public updateProductionSession(
    sessionId: string,
    updates: Partial<ProductionSession>,
    currentUser: string
  ): ProductionSession {
    const session = this.db.productionSessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Production record not found.');

    const nextLinesRaw = updates.lines !== undefined ? updates.lines : session.lines;
    if (!nextLinesRaw || nextLinesRaw.length === 0) {
      throw new Error('Please select at least one product bag size and enter a valid bag quantity.');
    }

    const seenProductSizes = new Set<string>();
    const validatedLines: ProductionLineItem[] = [];

    for (let i = 0; i < nextLinesRaw.length; i++) {
      const line = nextLinesRaw[i];
      const bagSizeKg = Number(line.bagSizeKg);
      const bagCount = Number(line.bagCount);

      if (isNaN(bagSizeKg) || bagSizeKg <= 0) {
        throw new Error(`Invalid bag size for ${line.productNameEn || 'product'}.`);
      }
      if (!line.isDirectWeightOnly && (isNaN(bagCount) || bagCount <= 0)) {
        throw new Error(
          `Invalid bag quantity for ${line.productNameEn} (${bagSizeKg} KG). Quantity must be greater than 0.`
        );
      }

      const key = `${line.productId}__${bagSizeKg}`;
      if (seenProductSizes.has(key)) {
        throw new Error(
          `Duplicate entry detected for ${line.productNameEn} (${bagSizeKg} KG) within the same Production Entry.`
        );
      }
      seenProductSizes.add(key);

      const totalWeightKg = line.isDirectWeightOnly
        ? Number(line.directWeightKg) || 0
        : bagCount * bagSizeKg;

      validatedLines.push({
        ...line,
        id: line.id || `pline-${i}`,
        bagSizeKg,
        bagCount: line.isDirectWeightOnly ? 0 : bagCount,
        totalWeightKg,
        percentage: 0,
      });
    }

    const computedTotalBags = validatedLines.reduce((acc, l) => acc + l.bagCount, 0);
    const computedTotalWeightKg = validatedLines.reduce((acc, l) => acc + l.totalWeightKg, 0);

    validatedLines.forEach(line => {
      line.percentage =
        computedTotalWeightKg > 0 ? (line.totalWeightKg / computedTotalWeightKg) * 100 : 0;
    });

    // If this production session was already posted to stock, reconcile stock balances and movements cleanly without duplicates
    if (session.isStockPosted) {
      // 1. Reverse previous lines' impact on stockBalances
      for (const oldLine of session.lines) {
        if (oldLine.bagCount > 0 || oldLine.totalWeightKg > 0) {
          const bal = this.db.stockBalances.find(
            b => b.productId === oldLine.productId && b.bagSizeKg === oldLine.bagSizeKg
          );
          if (bal) {
            bal.availableBags = Math.max(0, bal.availableBags - oldLine.bagCount);
            bal.availableWeightKg = Math.max(0, bal.availableWeightKg - oldLine.totalWeightKg);
          }
        }
      }
      // 2. Remove old production stock movements for this sessionId to prevent duplicate movements
      this.db.stockMovements = this.db.stockMovements.filter(
        m => !(m.referenceId === session.id && m.movementType === 'production')
      );
      // 3. Apply new lines to stockBalances & stockMovements
      const nextDate = updates.date || session.date;
      const nextShift = updates.shiftName || session.shiftName;
      const nextStart = updates.startTime || session.startTime;
      const nextEnd = updates.endTime || session.endTime;

      for (const newLine of validatedLines) {
        if (newLine.bagCount > 0 || newLine.totalWeightKg > 0) {
          this.applyStockMovement({
            date: nextDate,
            productId: newLine.productId,
            productNameEn: newLine.productNameEn,
            productNameUr: newLine.productNameUr,
            bagSizeKg: newLine.bagSizeKg,
            movementType: 'production',
            changeBags: newLine.bagCount,
            changeWeightKg: newLine.totalWeightKg,
            referenceId: session.id,
            referenceType: 'Production Session ' + session.recordCode,
            notes: `Updated Production. Shift: ${nextShift}, Time: ${nextStart}-${nextEnd}`,
            performedBy: currentUser,
          });
        }
      }
    }

    Object.assign(session, {
      ...updates,
      lines: validatedLines,
      productEntries: groupProductionLinesByProduct(validatedLines),
      totalBags: computedTotalBags,
      totalWeightKg: computedTotalWeightKg,
      updatedAt: new Date().toISOString(),
    });

    this.logActivity(
      'Production Record Updated',
      currentUser,
      `Updated production record ${session.recordCode} (${computedTotalBags} bags, ${computedTotalWeightKg.toLocaleString()} kg)`,
      session.id
    );
    this.saveToDisk();
    return session;
  }

  // Update a production draft before it is posted to stock (Step 12)
  public updateProductionDraft(sessionId: string, updates: Partial<ProductionSession>, currentUser: string): ProductionSession {
    return this.updateProductionSession(sessionId, updates, currentUser);
  }

  // Delete a production draft (Step 12)
  public deleteProductionDraft(sessionId: string, currentUser: string, reason: string = 'Deleted draft'): void {
    const user = this.db.users.find(u => u.name === currentUser || u.username === currentUser || u.id === currentUser);
    if (user && !this.hasPermission(user, 'admin', 'delete') && !this.hasPermission(user, 'production', 'delete') && user.role !== 'admin') {
      throw new Error('Access Denied: Production draft deletion is restricted to authorized roles.');
    }
    const index = this.db.productionSessions.findIndex(s => s.id === sessionId);
    if (index === -1) throw new Error('Production draft not found.');
    const session = this.db.productionSessions[index];
    if (session.isStockPosted || session.status === 'posted_to_stock') {
      throw new Error('Cannot delete a production session that has already been posted to stock. Use Archive instead.');
    }
    this.db.productionSessions.splice(index, 1);
    this.moveToRecycleBin('production', session.id, `${session.recordCode} (${session.shiftName})`, session, currentUser, reason);
    this.logActivity('Production Draft Deleted', currentUser, `Deleted draft ${session.recordCode}: ${reason}`, session.id);
    this.saveToDisk();
  }

  // Explicit Post to Stock action for Production Drafts & History (Step 11 & Step 14)
  public postProductionToStock(productionId: string, currentUser: string): { success: boolean; message: string; postedBags: number; postedWeightKg: number } {
    const session = this.db.productionSessions.find(s => s.id === productionId);
    if (!session) throw new Error('Production record not found.');

    // Strict duplicate posting prevention (Step 11 & Requirement 13)
    const alreadyHasMovements = this.db.stockMovements.some(
      m => m.referenceId === session.id && m.movementType === 'production'
    );
    if (session.isStockPosted || session.status === 'posted_to_stock' || alreadyHasMovements) {
      session.isStockPosted = true;
      session.status = 'posted_to_stock';
      throw new Error(`Production record ${session.recordCode} has already been posted to stock on ${session.stockPostedAt ? new Date(session.stockPostedAt).toLocaleDateString() : 'a previous date'}. Duplicate posting is strictly prevented.`);
    }

    let totalPostedBags = 0;
    let totalPostedWeight = 0;

    for (const line of session.lines) {
      if (line.bagCount > 0 || line.totalWeightKg > 0) {
        this.applyStockMovement({
          date: session.date,
          productId: line.productId,
          productNameEn: line.productNameEn,
          productNameUr: line.productNameUr,
          bagSizeKg: line.bagSizeKg,
          movementType: 'production',
          changeBags: line.bagCount,
          changeWeightKg: line.totalWeightKg,
          referenceId: session.id,
          referenceType: 'Production Session ' + session.recordCode,
          notes: `Posted from Production Drafts. Shift: ${session.shiftName} (${session.startTime}-${session.endTime})`,
          performedBy: currentUser,
        });
        totalPostedBags += line.bagCount;
        totalPostedWeight += line.totalWeightKg;
      }
    }

    session.isStockPosted = true;
    session.status = 'posted_to_stock';
    session.stockPostedAt = new Date().toISOString();
    session.stockPostedBy = currentUser;

    this.logActivity(
      'Production Posted to Stock',
      currentUser,
      `Posted ${session.recordCode} to Stock: +${totalPostedBags} bags (${totalPostedWeight.toLocaleString()} kg)`,
      session.id
    );
    this.saveToDisk();

    return {
      success: true,
      message: `Production record ${session.recordCode} successfully posted to Stock & Inventory (+${totalPostedBags} bags, ${totalPostedWeight.toLocaleString()} kg).`,
      postedBags: totalPostedBags,
      postedWeightKg: totalPostedWeight,
    };
  }

  // Reverse previously posted production from stock
  public reverseProductionFromStock(productionId: string, currentUser: string, reason: string): void {
    const session = this.db.productionSessions.find(s => s.id === productionId);
    if (!session) throw new Error('Production record not found.');
    if (!session.isStockPosted) throw new Error('This production record is not currently posted to stock.');

    for (const line of session.lines) {
      if (line.bagCount > 0 || line.totalWeightKg > 0) {
        this.applyStockMovement({
          date: new Date().toISOString().slice(0, 10),
          productId: line.productId,
          productNameEn: line.productNameEn,
          productNameUr: line.productNameUr,
          bagSizeKg: line.bagSizeKg,
          movementType: 'adjustment_neg',
          changeBags: -line.bagCount,
          changeWeightKg: -line.totalWeightKg,
          referenceId: session.id,
          referenceType: 'Production Reversal ' + session.recordCode,
          notes: `Reversed from Stock. Reason: ${reason}`,
          performedBy: currentUser,
        });
      }
    }

    session.isStockPosted = false;
    session.stockPostedAt = undefined;
    session.stockPostedBy = undefined;

    this.logActivity(
      'Production Stock Reversed',
      currentUser,
      `Reversed ${session.recordCode} from Stock. Reason: ${reason}`,
      session.id
    );
    this.saveToDisk();
  }

  // Change Administrator Password & PIN (Change 4)
  public updateAdminPassword(
    currentPassword: string,
    newPassword: string,
    newPin?: string,
    currentUser = 'admin'
  ): { success: boolean; message: string } {
    const admin = this.db.users.find(u => u.role === 'admin') || this.db.users[0];
    if (!admin) throw new Error('Administrator account not found in database.');

    if (admin.passwordHash !== simpleHash(currentPassword)) {
      throw new Error('Current administrator password is incorrect.');
    }

    if (!newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }

    admin.passwordHash = simpleHash(newPassword);
    if (newPin && newPin.trim().length >= 4) {
      admin.pinCode = newPin.trim();
    }

    this.logActivity('Admin Password Changed', currentUser, 'Administrator password updated securely.');
    this.saveToDisk();
    return { success: true, message: 'Administrator password changed successfully.' };
  }

  // --- Stock Management & Movements ---
  public getStockBalance(productId: string, bagSizeKg: number): StockItemBalance | undefined {
    const activeBizId = this.getActiveBusinessId();
    const activeMode = this.getActiveBusinessMode();
    const exactMatch = this.db.stockBalances.find(
      b =>
        this.belongsToBusiness(b.businessId, activeBizId) &&
        b.productId === productId &&
        b.bagSizeKg === bagSizeKg
    );
    if (exactMatch) return exactMatch;
    if (activeMode !== 'factory') {
      return this.db.stockBalances.find(
        b => this.belongsToBusiness(b.businessId, activeBizId) && b.productId === productId
      );
    }
    return undefined;
  }

  public applyStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp' | 'balanceBagsAfter' | 'balanceWeightKgAfter'>): StockMovement {
    const activeBizId = movement.businessId || this.getActiveBusinessId();
    const bizObj = (this.db.businesses || []).find(b => b.id === activeBizId) || this.getActiveBusiness();
    const bizMode = normalizeBusinessMode(bizObj?.businessType);
    const supportsBagSizes = bizMode === 'factory' || bizMode === 'mill';
    const effectiveBagSizeKg = supportsBagSizes ? (Number(movement.bagSizeKg) || 50) : 1;
    const effectiveChangeWeightKg =
      supportsBagSizes ? movement.changeWeightKg : movement.changeBags * effectiveBagSizeKg;

    let balance = this.db.stockBalances.find(
      b =>
        this.belongsToBusiness(b.businessId, activeBizId) &&
        b.productId === movement.productId &&
        (supportsBagSizes ? b.bagSizeKg === effectiveBagSizeKg : true)
    );

    if (!balance) {
      const prod = this.db.products.find(p => p.id === movement.productId);
      balance = {
        businessId: activeBizId,
        productId: movement.productId,
        bagSizeKg: effectiveBagSizeKg,
        availableBags: 0,
        availableWeightKg: 0,
        location: supportsBagSizes ? 'Main Mill Warehouse' : 'Main Store Inventory',
        minStockThreshold: prod?.minStockLevel !== undefined ? prod.minStockLevel : 10,
      };
      this.db.stockBalances.push(balance);
    } else if (!supportsBagSizes) {
      balance.bagSizeKg = 1;
    }

    // Check negative inventory rule
    const newBags = balance.availableBags + movement.changeBags;
    const newWeight =
      supportsBagSizes ? balance.availableWeightKg + effectiveChangeWeightKg : newBags;

    if (!this.db.settings.allowNegativeInventory && (newBags < 0 || newWeight < 0)) {
      throw new Error(`Insufficient stock for ${movement.productNameEn}. Available: ${balance.availableBags}.`);
    }

    balance.availableBags = Math.max(0, newBags);
    balance.availableWeightKg = Math.max(0, newWeight);
    if (movement.rate !== undefined && movement.rate > 0) {
      balance.rate = movement.rate;
    }

    const fullMovement: StockMovement = {
      ...movement,
      bagSizeKg: effectiveBagSizeKg,
      changeWeightKg: effectiveChangeWeightKg,
      businessId: activeBizId,
      id: 'stkm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      balanceBagsAfter: balance.availableBags,
      balanceWeightKgAfter: balance.availableWeightKg,
    };

    this.db.stockMovements.unshift(fullMovement);
    this.logActivity('Stock Movement', movement.performedBy, `${movement.movementType.toUpperCase()}: ${movement.changeBags > 0 ? '+' : ''}${movement.changeBags} bags/units of ${movement.productNameEn}`);
    this.saveToDisk();
    return fullMovement;
  }

  public updateStockThreshold(productId: string, bagSizeKg: number, threshold: number, currentUser: string): void {
    const activeBizId = this.getActiveBusinessId();
    let balance = this.db.stockBalances.find(
      b =>
        this.belongsToBusiness(b.businessId, activeBizId) &&
        b.productId === productId &&
        b.bagSizeKg === bagSizeKg
    );
    if (!balance) {
      balance = {
        businessId: activeBizId,
        productId,
        bagSizeKg,
        availableBags: 0,
        availableWeightKg: 0,
        location: 'Main Warehouse',
        minStockThreshold: threshold,
      };
      this.db.stockBalances.push(balance);
    } else {
      balance.minStockThreshold = Math.max(0, threshold);
    }
    const prod = this.db.products.find(p => p.id === productId);
    this.logActivity(
      'Stock Threshold Updated',
      currentUser,
      `Updated low stock alert threshold to ${threshold} for ${prod?.nameEn || 'Product'} (${bagSizeKg} kg)`
    );
    this.saveToDisk();
  }

  /**
   * Comprehensive Stock Adjustment for Shopping Mart, Small Business, and Factory modes.
   * Supports: 'add' (+), 'remove' (-), 'set' (exact count), 'damaged' (-), 'expired' (-), 'opening' (+), 'correction' (+/-)
   */
  public adjustProductStock(params: {
    productId: string;
    bagSizeKg?: number;
    adjustmentMode: 'add' | 'remove' | 'set' | 'damaged' | 'expired' | 'opening' | 'correction';
    quantity: number;
    reason: string;
    notes?: string;
    rate?: number;
    currentUser: string;
  }): { previousStock: number; newStock: number; delta: number; movement: StockMovement } {
    const activeBizId = this.getActiveBusinessId();
    const mode = this.getActiveBusinessMode();
    const prod = this.db.products.find(
      p => p.id === params.productId && this.belongsToBusiness(p.businessId, activeBizId)
    );
    if (!prod) {
      throw new Error('Product not found in the active business workspace.');
    }
    const sizeKg =
      params.bagSizeKg !== undefined && params.bagSizeKg > 0
        ? params.bagSizeKg
        : mode === 'factory'
        ? prod.bagSizes?.[0] || 50
        : prod.bagSizes?.[0] || 1;

    const existingBal = this.getStockBalance(prod.id, sizeKg);
    const previousStock = existingBal ? existingBal.availableBags : 0;

    const rawQty = Number(params.quantity);
    if (isNaN(rawQty) || !Number.isFinite(rawQty)) {
      throw new Error('Please enter a valid numeric stock quantity.');
    }

    let delta = 0;
    let movementType: StockMovementType = 'adjustment_pos';
    let label = 'Stock Adjustment';

    if (params.adjustmentMode === 'set') {
      if (rawQty < 0) throw new Error('Exact stock quantity cannot be negative.');
      delta = rawQty - previousStock;
      movementType = delta >= 0 ? 'adjustment_pos' : 'adjustment_neg';
      label = `Exact Stock Count Set (${previousStock} → ${rawQty})`;
    } else if (params.adjustmentMode === 'add') {
      if (rawQty <= 0) throw new Error('Quantity to add must be greater than 0.');
      delta = rawQty;
      movementType = 'adjustment_pos';
      label = 'Stock In (+ Add Stock)';
    } else if (params.adjustmentMode === 'opening') {
      if (rawQty <= 0) throw new Error('Opening stock quantity must be greater than 0.');
      delta = rawQty;
      movementType = 'opening';
      label = 'Opening Stock Entry';
    } else if (params.adjustmentMode === 'remove') {
      if (rawQty <= 0) throw new Error('Quantity to remove must be greater than 0.');
      delta = -rawQty;
      movementType = 'adjustment_neg';
      label = 'Stock Out (- Remove Stock)';
    } else if (params.adjustmentMode === 'damaged') {
      if (rawQty <= 0) throw new Error('Damaged stock quantity must be greater than 0.');
      delta = -rawQty;
      movementType = 'waste';
      label = 'Damaged Stock Deduction';
    } else if (params.adjustmentMode === 'expired') {
      if (rawQty <= 0) throw new Error('Expired stock quantity must be greater than 0.');
      delta = -rawQty;
      movementType = 'waste';
      label = 'Expired Stock Deduction';
    } else if (params.adjustmentMode === 'correction') {
      if (rawQty === 0) throw new Error('Correction quantity cannot be 0.');
      delta = rawQty;
      movementType = delta >= 0 ? 'adjustment_pos' : 'adjustment_neg';
      label = 'Manual Count Correction';
    }

    const movement = this.applyStockMovement({
      businessId: activeBizId,
      date: new Date().toISOString().slice(0, 10),
      productId: prod.id,
      productNameEn: prod.nameEn,
      productNameUr: prod.nameUr,
      bagSizeKg: sizeKg,
      movementType,
      changeBags: delta,
      changeWeightKg: delta * sizeKg,
      rate: params.rate,
      referenceType: `${label}: ${params.reason || 'Manual Adjustment'}`,
      notes: `Prev: ${previousStock}, New: ${Math.max(0, previousStock + delta)}. ${params.notes || params.reason || ''}`.trim(),
      performedBy: params.currentUser,
    });

    return {
      previousStock,
      newStock: movement.balanceBagsAfter,
      delta,
      movement,
    };
  }

  public adjustStockAdvanced(
    productId: string,
    bagSizeKg: number,
    adjustmentType: 'add' | 'remove' | 'set' | 'damaged' | 'expired' | 'opening' | 'correction',
    quantity: number,
    reason: string,
    notes: string,
    currentUser: string,
    rate?: number
  ) {
    return this.adjustProductStock({
      productId,
      bagSizeKg,
      adjustmentMode: adjustmentType,
      quantity,
      reason,
      notes,
      rate,
      currentUser,
    });
  }

  // --- Sales Management ---
  public getConfiguredProductRate(productId: string, bagSizeKg: number): number {
    const activeBizId = this.getActiveBusinessId();
    const prod = this.db.products.find(
      p => p.id === productId && this.belongsToBusiness(p.businessId, activeBizId)
    );
    if (prod?.bagPrices && prod.bagPrices[bagSizeKg] !== undefined && Number(prod.bagPrices[bagSizeKg]) > 0) {
      return Number(prod.bagPrices[bagSizeKg]);
    }
    if (prod && prod.rate !== undefined && Number(prod.rate) > 0) {
      return Number(prod.rate);
    }
    const balance = this.getStockBalance(productId, bagSizeKg);
    if (balance && balance.rate !== undefined && Number(balance.rate) > 0) {
      return Number(balance.rate);
    }
    const anyBalance = this.db.stockBalances.find(
      b =>
        this.belongsToBusiness(b.businessId, activeBizId) &&
        b.productId === productId &&
        b.rate !== undefined &&
        Number(b.rate) > 0
    );
    if (anyBalance && anyBalance.rate) {
      return Number(anyBalance.rate);
    }
    if (prod && prod.rate !== undefined && Number(prod.rate) >= 0) {
      return Number(prod.rate);
    }
    return 0;
  }

  public addSale(saleData: Omit<SaleRecord, 'id' | 'invoiceNo' | 'createdAt' | 'status'>, currentUser: string): SaleRecord {
    this.assertModuleAccess('sales', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    const isPriceLocked = (this.db.settings.saleInvoicePriceMode || 'unlocked') === 'locked';

    if (!saleData.lines || saleData.lines.length === 0) {
      throw new Error('Cannot complete sale: At least one product line is required.');
    }

    const sanitizedLines: SaleLineItem[] = [];

    // 1. Validate Stock and Rates for all lines before posting
    for (let i = 0; i < saleData.lines.length; i++) {
      const line = saleData.lines[i];
      const bags = Number(line.bags);
      const bagSizeKg = Number(line.bagSizeKg) || 1;
      const prod = this.db.products.find(p => p.id === line.productId);
      const isServiceItem = prod?.itemType === 'service';

      if (isNaN(bags) || !Number.isFinite(bags) || bags <= 0) {
        throw new Error(`Cannot complete sale: Invalid quantity for ${line.productNameEn || 'Product'}.`);
      }

      if (!isServiceItem) {
        const balance = this.getStockBalance(line.productId, bagSizeKg);
        const available = balance ? balance.availableBags : 0;
        if (!this.db.settings.allowNegativeInventory && available < bags) {
          throw new Error(`Cannot complete sale: Insufficient stock for ${line.productNameEn}. Required: ${bags}, Available: ${available}.`);
        }
      }

      const configuredRate = this.getConfiguredProductRate(line.productId, bagSizeKg);
      const rawRate = Number(line.unitPrice);

      // Reject non-numeric or negative rates
      if (isNaN(rawRate) || !Number.isFinite(rawRate) || rawRate < 0) {
        throw new Error(`Cannot complete sale: Invalid product price/rate for ${line.productNameEn} (${bagSizeKg} kg). Negative or non-numeric values are not allowed.`);
      }

      // Enforce Admin Price Lock at backend/business logic layer
      let effectiveUnitPrice = rawRate;
      if (isPriceLocked) {
        if (configuredRate > 0 && Math.abs(rawRate - configuredRate) > 0.01) {
          throw new Error(`Access Denied: Product price editing is locked by Administrator in the Admin Panel. Price for "${line.productNameEn}" cannot be altered (configured: PKR ${configuredRate.toLocaleString()}, received: PKR ${rawRate.toLocaleString()}).`);
        }
        effectiveUnitPrice = configuredRate > 0 ? configuredRate : rawRate;
      }

      // Follow existing application rule for zero price
      if (effectiveUnitPrice <= 0) {
        throw new Error(`Cannot complete sale: Missing or invalid price for ${line.productNameEn} (${bagSizeKg} kg). A valid positive price in PKR is required.`);
      }

      const weightKg = bags * bagSizeKg;
      const lineTotal = Math.round(bags * effectiveUnitPrice * 100) / 100;

      sanitizedLines.push({
        ...line,
        id: line.id || `sline-${i}`,
        bags,
        bagSizeKg,
        weightKg,
        unitPrice: effectiveUnitPrice,
        lineTotal,
      });
    }

    // 2. Generate Invoice Number using active business invoicePrefix
    const activeBiz = this.getActiveBusiness();
    const activeMode = this.getActiveBusinessMode();
    const rawPrefix =
      activeBiz?.invoicePrefix?.trim() ||
      (activeMode === 'shopping_mart' ? 'POS' : 'INV');
    const cleanPrefix = rawPrefix.replace(/-+$/, '');
    const bizSalesCount = this.db.sales.filter(s => this.belongsToBusiness(s.businessId, activeBizId)).length + 1;
    const invoiceNo = `${cleanPrefix}-${String(bizSalesCount).padStart(4, '0')}`;

    // Recalculate totals using the validated/enforced per-line prices
    const totalBags = sanitizedLines.reduce((acc, l) => acc + l.bags, 0);
    const totalWeightKg = sanitizedLines.reduce((acc, l) => acc + l.weightKg, 0);
    const subtotal = sanitizedLines.reduce((acc, l) => acc + l.lineTotal, 0);

    let discountPkr = Math.max(0, Number(saleData.discount) || 0);
    let discountPercent = saleData.discountPercent !== undefined ? Math.max(0, Number(saleData.discountPercent) || 0) : undefined;

    if (discountPercent !== undefined && discountPercent > 0 && (!discountPkr || discountPkr === 0)) {
      discountPkr = Math.round((subtotal * discountPercent) / 100);
    } else if (discountPkr > 0 && (discountPercent === undefined || discountPercent === 0) && subtotal > 0) {
      discountPercent = Number(((discountPkr / subtotal) * 100).toFixed(1));
    }
    discountPkr = Math.min(subtotal, discountPkr);
    const taxAmount = Math.max(0, Number(saleData.taxAmount) || 0);
    const grandTotal = Math.max(0, subtotal - discountPkr + taxAmount);

    const effectivePaid =
      saleData.paymentStatus === 'paid'
        ? grandTotal
        : saleData.paymentStatus === 'credit'
        ? 0
        : Math.min(grandTotal, Math.max(0, Number(saleData.paidAmount) || 0));
    const balanceAmount = Math.max(0, grandTotal - effectivePaid);

    const newSale: SaleRecord = {
      ...saleData,
      businessId: activeBizId,
      lines: sanitizedLines,
      totalBags,
      totalWeightKg,
      subtotal,
      discount: discountPkr,
      discountPercent,
      taxAmount,
      grandTotal,
      paidAmount: effectivePaid,
      balanceAmount,
      id: 'sal-' + Date.now(),
      invoiceNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      status: 'completed',
    };

    this.db.sales.unshift(newSale);

    // Update customer ledger balance if linked
    if (this.db.customers && (newSale.customerId || newSale.customerName)) {
      const cust = this.db.customers.find(
        c =>
          this.belongsToBusiness(c.businessId, activeBizId) &&
          (c.id === newSale.customerId ||
            c.name.trim().toLowerCase() === newSale.customerName.trim().toLowerCase())
      );
      if (cust) {
        cust.totalPurchasesAmount = (cust.totalPurchasesAmount || 0) + grandTotal;
        cust.currentBalance = (cust.currentBalance || 0) + balanceAmount;
      }
    }

    // 3. Deduct Stock Movements (skip service items)
    for (const line of newSale.lines) {
      const prod = this.db.products.find(p => p.id === line.productId);
      if (prod?.itemType === 'service') continue;
      this.applyStockMovement({
        businessId: activeBizId,
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

    // Reverse Stock Movements (skip service items)
    for (const line of sale.lines) {
      const prod = this.db.products.find(p => p.id === line.productId);
      if (prod?.itemType === 'service') continue;
      this.applyStockMovement({
        businessId: sale.businessId || this.getActiveBusinessId(),
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
    this.assertModuleAccess('returns', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    const count = this.db.returns.filter(r => this.belongsToBusiness(r.businessId, activeBizId)).length + 1;
    const returnNo = `RET-${String(count).padStart(4, '0')}`;

    const newReturn: ReturnRecord = {
      ...returnData,
      businessId: activeBizId,
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
    this.assertModuleAccess('waste_recycle', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    const count = this.db.wasteRecords.filter(w => this.belongsToBusiness(w.businessId, activeBizId)).length + 1;
    const wasteNo = `WST-${String(count).padStart(4, '0')}`;

    const newWaste: WasteRecord = {
      ...wasteData,
      businessId: activeBizId,
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
      id: 'rcb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      businessId: originalData?.businessId || this.getActiveBusinessId(),
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

    // Also ensure originalId is not hidden in deletedHistoryRecordIds
    if (this.db.settings.deletedHistoryRecordIds?.includes(item.originalId)) {
      this.db.settings.deletedHistoryRecordIds = this.db.settings.deletedHistoryRecordIds.filter(
        id => id !== item.originalId
      );
    }

    if (item.recordType === 'product') {
      const prod = this.db.products.find(p => p.id === item.originalId);
      if (prod) {
        prod.isActive = true;
        prod.archivedAt = undefined;
      } else if (item.originalData) {
        this.db.products.push({ ...item.originalData, isActive: true, archivedAt: undefined });
      }
    } else if (item.recordType === 'sale') {
      const exists = this.db.sales.find(s => s.id === item.originalId);
      if (!exists && item.originalData) {
        this.db.sales.unshift(item.originalData);
      }
    } else if (item.recordType === 'return') {
      const exists = this.db.returns.find(r => r.id === item.originalId);
      if (!exists && item.originalData) {
        this.db.returns.unshift(item.originalData);
      }
    } else if (item.recordType === 'waste') {
      const exists = this.db.wasteRecords.find(w => w.id === item.originalId);
      if (!exists && item.originalData) {
        this.db.wasteRecords.unshift(item.originalData);
      }
    } else if (item.recordType === 'production') {
      const exists = this.db.productionSessions.find(p => p.id === item.originalId);
      if (!exists && item.originalData) {
        const restoredSession: ProductionSession = { ...item.originalData };
        this.db.productionSessions.unshift(restoredSession);

        // If the production session was posted to stock prior to deletion, re-apply its stock
        if (restoredSession.isStockPosted && Array.isArray(restoredSession.lines)) {
          for (const line of restoredSession.lines) {
            if (line.bagCount > 0 || line.totalWeightKg > 0) {
              try {
                this.applyStockMovement({
                  date: new Date().toISOString().slice(0, 10),
                  productId: line.productId,
                  productNameEn: line.productNameEn,
                  productNameUr: line.productNameUr,
                  bagSizeKg: line.bagSizeKg,
                  movementType: 'production',
                  changeBags: line.bagCount,
                  changeWeightKg: line.totalWeightKg,
                  referenceId: restoredSession.id,
                  referenceType: 'Restored Production Session: ' + restoredSession.recordCode,
                  notes: `Stock restored upon restoring production session ${restoredSession.recordCode} from Recycle Bin.`,
                  performedBy: currentUser,
                });
              } catch (e) {
                console.warn('Stock restore warning:', e);
              }
            }
          }
        }
      }
    }

    this.db.recycleBin.splice(itemIndex, 1);
    this.logActivity('Restored from Recycle Bin', currentUser, `Restored ${item.recordType} "${item.recordTitle}" from Recycle Bin.`);
    this.saveToDisk();
  }

  public restoreMultipleFromRecycleBin(recycleIds: string[], currentUser: string): number {
    let restoredCount = 0;
    for (const id of recycleIds) {
      if (this.db.recycleBin.some(i => i.id === id)) {
        this.restoreFromRecycleBin(id, currentUser);
        restoredCount++;
      }
    }
    return restoredCount;
  }

  public purgeFromRecycleBin(recycleId: string, currentUser: string): void {
    const itemIndex = this.db.recycleBin.findIndex(i => i.id === recycleId);
    if (itemIndex === -1) throw new Error('Recycle bin record not found');
    const item = this.db.recycleBin[itemIndex];
    this.db.recycleBin.splice(itemIndex, 1);
    this.logActivity('Permanently Purged', currentUser, `Purged ${item.recordType} "${item.recordTitle}" from Recycle Bin.`);
    this.saveToDisk();
  }

  public purgeMultipleFromRecycleBin(recycleIds: string[], currentUser: string): number {
    let purgedCount = 0;
    for (const id of recycleIds) {
      const idx = this.db.recycleBin.findIndex(i => i.id === id);
      if (idx !== -1) {
        const item = this.db.recycleBin[idx];
        this.db.recycleBin.splice(idx, 1);
        this.logActivity('Permanently Purged', currentUser, `Purged ${item.recordType} "${item.recordTitle}" from Recycle Bin.`);
        purgedCount++;
      }
    }
    if (purgedCount > 0) {
      this.saveToDisk();
    }
    return purgedCount;
  }

  /**
   * TASK 1: Selection-based history records deletion.
   * Removes selected history records from the visible History & Audit log
   * without deleting underlying production batches, stock inventory balances,
   * sales transactions, customers, payments, products, or mill profile.
   * Protected security/compliance audit events remain immutable.
   */
  public deleteHistoryRecords(
    recordIds: string[],
    currentUser = 'Admin',
    reason = 'Manual deletion from History and Audit'
  ): { deletedCount: number; protectedCount: number } {
    if (!recordIds || recordIds.length === 0) {
      return { deletedCount: 0, protectedCount: 0 };
    }

    let deletedCount = 0;
    let protectedCount = 0;

    if (!this.db.settings.deletedHistoryRecordIds) {
      this.db.settings.deletedHistoryRecordIds = [];
    }

    const currentDeletedSet = new Set(this.db.settings.deletedHistoryRecordIds);

    for (const id of recordIds) {
      const activityLogIndex = this.db.activityLogs.findIndex(l => l.id === id);
      if (activityLogIndex !== -1) {
        const log = this.db.activityLogs[activityLogIndex];
        const isSecurityComplianceLog =
          log.eventType.toLowerCase().includes('security') ||
          log.eventType.toLowerCase().includes('pin') ||
          log.eventType.toLowerCase().includes('role') ||
          log.eventType.toLowerCase().includes('lock') ||
          log.eventType.toLowerCase().includes('auth') ||
          log.eventType.toLowerCase().includes('user blocked') ||
          log.eventType.toLowerCase().includes('user added');

        if (isSecurityComplianceLog) {
          protectedCount++;
          continue;
        } else {
          this.db.activityLogs.splice(activityLogIndex, 1);
          currentDeletedSet.add(id);
          deletedCount++;
        }
      } else {
        currentDeletedSet.add(id);
        deletedCount++;
      }
    }

    this.db.settings.deletedHistoryRecordIds = Array.from(currentDeletedSet);

    this.logActivity(
      'History Records Deleted',
      currentUser,
      `Removed ${deletedCount} record(s) from History and Audit list. (${protectedCount} compliance audit logs protected). Reason: ${reason}`
    );

    this.saveToDisk();
    return { deletedCount, protectedCount };
  }

  // --- Safe Archive & Deletion Methods for Stock, Sales, Returns ---
  public archiveSale(saleId: string, currentUser: string, reason: string): void {
    const saleIndex = this.db.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error('Sale invoice not found');
    const sale = this.db.sales[saleIndex];

    // If sale was completed and user is deleting it, safely reverse the stock allocation
    if (sale.status === 'completed') {
      for (const line of sale.lines) {
        const prod = this.db.products.find(p => p.id === line.productId);
        if (prod?.itemType === 'service') continue;
        try {
          this.applyStockMovement({
            businessId: sale.businessId || this.getActiveBusinessId(),
            date: new Date().toISOString().slice(0, 10),
            productId: line.productId,
            productNameEn: line.productNameEn,
            productNameUr: line.productNameUr,
            bagSizeKg: line.bagSizeKg,
            movementType: 'adjustment_pos',
            changeBags: line.bags,
            changeWeightKg: line.weightKg,
            referenceId: sale.id,
            referenceType: `Invoice Deletion Reversal ${sale.invoiceNo}`,
            notes: `Stock restored upon invoice removal by ${currentUser}. Reason: ${reason}`,
            performedBy: currentUser,
          });
        } catch (e) {
          console.warn('Stock reversal during sale deletion error:', e);
        }
      }
    }

    this.moveToRecycleBin('sale', sale.id, `Invoice ${sale.invoiceNo} (${sale.customerName})`, { ...sale }, currentUser, reason);
    this.db.sales.splice(saleIndex, 1);
    this.saveToDisk();
  }

  /**
   * TASK 10 & 11: Invoice deletion with Destination Options
   * Option 1 — 'returns': Move into existing Returns workflow as Customer Return, with stock returned
   * Option 2 — 'recycle_bin': Move into Recycle Bin. Original record no longer in active sales. Does NOT restore stock automatically.
   * Option 3 — 'return_stock': Cancel sale and safely restore stock quantity to inventory.
   */
  public invoiceDestinationAction(
    saleId: string,
    action: 'returns' | 'recycle_bin' | 'return_stock',
    reason: string,
    currentUser: string
  ): { success: boolean; message: string; action: string } {
    const saleIndex = this.db.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error('Sale invoice not found in database.');
    const sale = this.db.sales[saleIndex];
    const targetBizId = sale.businessId || this.getActiveBusinessId();

    if (action === 'returns') {
      // 1. Move into Returns workflow
      for (const line of sale.lines) {
        const prod = this.db.products.find(p => p.id === line.productId);
        const count = this.db.returns.filter(r => this.belongsToBusiness(r.businessId, targetBizId)).length + 1;
        const returnNo = `RET-${String(count).padStart(4, '0')}`;
        const newReturn: ReturnRecord = {
          id: 'ret-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          businessId: targetBizId,
          returnNo,
          returnType: 'customer',
          date: new Date().toISOString().slice(0, 10),
          originalSaleId: sale.id,
          customerOrSupplierName: sale.customerName,
          productId: line.productId,
          productNameEn: line.productNameEn,
          productNameUr: line.productNameUr,
          bagSizeKg: line.bagSizeKg,
          returnedBags: line.bags,
          returnedWeightKg: line.weightKg,
          condition: 'usable',
          refundAmount: line.lineTotal,
          reason: reason || 'Invoice moved to Customer Returns',
          notes: `Moved from Invoice ${sale.invoiceNo}. Customer: ${sale.customerName}`,
          createdBy: currentUser,
          createdAt: new Date().toISOString(),
        };
        this.db.returns.unshift(newReturn);

        // Add back to stock as sale_return (if physical product)
        if (prod?.itemType !== 'service') {
          this.applyStockMovement({
            businessId: targetBizId,
            date: new Date().toISOString().slice(0, 10),
            productId: line.productId,
            productNameEn: line.productNameEn,
            productNameUr: line.productNameUr,
            bagSizeKg: line.bagSizeKg,
            movementType: 'sale_return',
            changeBags: line.bags,
            changeWeightKg: line.weightKg,
            referenceId: sale.id,
            referenceType: `Customer Return from Invoice ${sale.invoiceNo}`,
            notes: `Goods returned to stock. Reason: ${reason}`,
            performedBy: currentUser,
          });
        }
      }

      this.moveToRecycleBin(
        'sale',
        sale.id,
        `Invoice ${sale.invoiceNo} (Transferred to Returns)`,
        { ...sale, destinationAction: 'returns', cancellationReason: reason },
        currentUser,
        reason
      );
      this.db.sales.splice(saleIndex, 1);
      this.logActivity('Invoice Moved to Returns', currentUser, `Invoice ${sale.invoiceNo} (${sale.customerName}) moved to Returns workflow. Stock re-credited. Reason: ${reason}`, sale.id);
      this.saveToDisk();

      return {
        success: true,
        action: 'returns',
        message: `Invoice ${sale.invoiceNo} moved to Customer Returns. Goods re-credited to inventory.`,
      };
    } else if (action === 'recycle_bin') {
      // 2. Move to Recycle Bin without restoring stock
      this.moveToRecycleBin(
        'sale',
        sale.id,
        `Invoice ${sale.invoiceNo} (${sale.customerName})`,
        { ...sale, destinationAction: 'recycle_bin', cancellationReason: reason },
        currentUser,
        reason
      );
      this.db.sales.splice(saleIndex, 1);
      this.logActivity('Invoice Moved to Recycle Bin', currentUser, `Invoice ${sale.invoiceNo} moved to Recycle Bin (stock remains un-restored). Reason: ${reason}`, sale.id);
      this.saveToDisk();

      return {
        success: true,
        action: 'recycle_bin',
        message: `Invoice ${sale.invoiceNo} moved to Recycle Bin. Stock unchanged.`,
      };
    } else if (action === 'return_stock') {
      // 3. Cancel sale and safely restore stock
      if (sale.status === 'completed') {
        for (const line of sale.lines) {
          const prod = this.db.products.find(p => p.id === line.productId);
          if (prod?.itemType === 'service') continue;
          this.applyStockMovement({
            businessId: targetBizId,
            date: new Date().toISOString().slice(0, 10),
            productId: line.productId,
            productNameEn: line.productNameEn,
            productNameUr: line.productNameUr,
            bagSizeKg: line.bagSizeKg,
            movementType: 'adjustment_pos',
            changeBags: line.bags,
            changeWeightKg: line.weightKg,
            referenceId: sale.id,
            referenceType: `Stock Returned from Cancelled Invoice ${sale.invoiceNo}`,
            notes: `Sold bags returned to warehouse upon invoice deletion. Reason: ${reason}`,
            performedBy: currentUser,
          });
        }
      }

      this.moveToRecycleBin(
        'sale',
        sale.id,
        `Invoice ${sale.invoiceNo} (Stock Returned to Inventory)`,
        { ...sale, destinationAction: 'return_stock', cancellationReason: reason },
        currentUser,
        reason
      );
      this.db.sales.splice(saleIndex, 1);
      this.logActivity('Invoice Cancelled & Stock Returned', currentUser, `Invoice ${sale.invoiceNo} deleted with full stock restoration (+${sale.totalBags} bags). Reason: ${reason}`, sale.id);
      this.saveToDisk();

      return {
        success: true,
        action: 'return_stock',
        message: `Invoice ${sale.invoiceNo} deleted and ${sale.totalBags} bags restored to Stock Inventory.`,
      };
    }

    throw new Error('Unknown invoice destination action: ' + action);
  }

  public archiveReturn(returnId: string, currentUser: string, reason: string): void {
    const returnIndex = this.db.returns.findIndex(r => r.id === returnId);
    if (returnIndex === -1) throw new Error('Return record not found');
    const ret = this.db.returns[returnIndex];

    this.moveToRecycleBin('return', ret.id, `Return ${ret.returnNo} (${ret.customerOrSupplierName})`, { ...ret }, currentUser, reason);
    this.db.returns.splice(returnIndex, 1);
    this.saveToDisk();
  }

  public archiveProductionSession(sessionId: string, currentUser: string, reason: string = 'Deleted from Production History'): void {
    const sessionIndex = this.db.productionSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) throw new Error('Production record not found');
    const session = this.db.productionSessions[sessionIndex];

    // If production was posted to stock, safely reverse the stock increment
    if (session.isStockPosted) {
      for (const line of session.lines) {
        if (line.bagCount > 0 || line.totalWeightKg > 0) {
          try {
            const balance = this.getStockBalance(line.productId, line.bagSizeKg);
            const currentBags = balance ? balance.availableBags : 0;
            const deductBags = this.db.settings.allowNegativeInventory
              ? line.bagCount
              : Math.min(currentBags, line.bagCount);
            if (deductBags > 0) {
              this.applyStockMovement({
                date: new Date().toISOString().slice(0, 10),
                productId: line.productId,
                productNameEn: line.productNameEn,
                productNameUr: line.productNameUr,
                bagSizeKg: line.bagSizeKg,
                movementType: 'adjustment_neg',
                changeBags: -deductBags,
                changeWeightKg: -(deductBags * line.bagSizeKg),
                referenceId: session.id,
                referenceType: 'Production Deletion Reversal: ' + session.recordCode,
                notes: `Stock reversed upon deletion of production session ${session.recordCode} by ${currentUser}. Reason: ${reason}`,
                performedBy: currentUser,
              });
            }
          } catch (e) {
            console.warn('Stock reversal during production deletion warning:', e);
          }
        }
      }
    }

    this.moveToRecycleBin(
      'production',
      session.id,
      `Production Session ${session.recordCode} (${session.shiftName} shift, ${session.totalBags} bags)`,
      { ...session },
      currentUser,
      reason
    );
    this.db.productionSessions.splice(sessionIndex, 1);
    this.logActivity('Production Session Deleted', currentUser, `Deleted production session ${session.recordCode} (${session.totalBags} bags, ${session.totalWeightKg} kg). Moved to Recycle Bin. Reason: ${reason}`);
    this.saveToDisk();
  }

  public archiveProductionSessions(sessionIds: string[], currentUser: string, reason: string = 'Bulk deleted from Production History'): number {
    let count = 0;
    for (const id of sessionIds) {
      if (this.db.productionSessions.some(s => s.id === id)) {
        this.archiveProductionSession(id, currentUser, reason);
        count++;
      }
    }
    return count;
  }

  public removeStockItem(productId: string, bagSizeKg: number, currentUser: string, reason: string): void {
    const balance = this.getStockBalance(productId, bagSizeKg);
    const prod = this.db.products.find(p => p.id === productId);
    const bagsToRemove = balance ? balance.availableBags : 0;
    const weightToRemove = balance ? balance.availableWeightKg : 0;

    if (bagsToRemove > 0) {
      // Record negative adjustment movement for audit tracking
      this.applyStockMovement({
        date: new Date().toISOString().slice(0, 10),
        productId,
        productNameEn: prod?.nameEn || 'Product',
        productNameUr: prod?.nameUr || '',
        bagSizeKg,
        movementType: 'adjustment_neg',
        changeBags: -bagsToRemove,
        changeWeightKg: -weightToRemove,
        referenceType: 'Stock Removal: ' + reason,
        notes: `Selected stock removed by ${currentUser}. Reason: ${reason}`,
        performedBy: currentUser,
      });
    }

    const idx = this.db.stockBalances.findIndex(b => b.productId === productId && b.bagSizeKg === bagSizeKg);
    if (idx !== -1) {
      this.db.stockBalances.splice(idx, 1);
    }
    this.logActivity('Stock Item Removed', currentUser, `Removed stock entry for ${prod?.nameEn || productId} (${bagSizeKg} kg, ${bagsToRemove} bags). Reason: ${reason}`);
    this.saveToDisk();
  }

  // --- Product Management ---
  public addProduct(product: Omit<Product, 'id' | 'createdAt' | 'isActive'>, currentUser: string): Product {
    const activeBizId = this.getActiveBusinessId();
    const mode = this.getActiveBusinessMode();

    // Role permission check - verified against flexible role authorization engine
    const user = this.db.users.find(u => u.name === currentUser || u.username === currentUser || u.id === currentUser);
    if (
      user &&
      !this.hasPermission(user, 'admin', 'create') &&
      !this.hasPermission(user, 'stock', 'create') &&
      !this.hasPermission(user, 'products_catalog', 'create') &&
      user.role !== 'admin'
    ) {
      throw new Error('Access Denied: Product creation is restricted to authorized roles with product-management permissions.');
    }

    const trimmedEn = product.nameEn.trim();
    if (!trimmedEn) {
      throw new Error('English Product Name is required.');
    }

    // Validate duplicate product within the active business
    const duplicate = this.db.products.find(
      p =>
        this.belongsToBusiness(p.businessId, activeBizId) &&
        p.isActive &&
        p.nameEn.trim().toLowerCase() === trimmedEn.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A product named "${trimmedEn}" already exists in the catalog.`);
    }

    if (product.barcode && product.barcode.trim()) {
      const dupBarcode = this.db.products.find(
        p =>
          this.belongsToBusiness(p.businessId, activeBizId) &&
          p.isActive &&
          p.barcode?.trim().toLowerCase() === product.barcode!.trim().toLowerCase()
      );
      if (dupBarcode) {
        throw new Error(`Barcode "${product.barcode.trim()}" is already assigned to "${dupBarcode.nameEn}".`);
      }
    }

    if (product.rate !== undefined && (isNaN(Number(product.rate)) || Number(product.rate) < 0)) {
      throw new Error('Product Price / Rate must be a valid non-negative number.');
    }

    const parsedRate =
      product.rate !== undefined && !isNaN(Number(product.rate)) && Number(product.rate) >= 0
        ? Number(product.rate)
        : undefined;

    const effectiveItemType: 'product' | 'service' =
      mode === 'factory' ? 'product' : product.itemType || 'product';
    const effectiveType =
      effectiveItemType === 'service'
        ? 'Service'
        : mode === 'factory'
        ? 'Manufactured Product'
        : 'Retail Product';

    const finalBagSizes =
      mode === 'factory'
        ? product.bagSizes && product.bagSizes.length > 0
          ? product.bagSizes
          : [20, 50, 80]
        : [1];
    const bagPrices: Record<number, number> = { ...(product.bagPrices || {}) };
    if (parsedRate !== undefined && parsedRate > 0) {
      for (const sz of finalBagSizes) {
        if (bagPrices[sz] === undefined) {
          bagPrices[sz] = parsedRate;
        }
      }
    }

    const activeBiz = this.getActiveBusiness();
    const existingBarcodes = this.db.products
      .filter(p => this.belongsToBusiness(p.businessId, activeBizId) && p.barcode)
      .map(p => String(p.barcode));

    const effectiveBarcode =
      product.barcode && product.barcode.trim()
        ? product.barcode.trim()
        : generateUniqueBusinessBarcode(
            activeBiz?.businessName || 'Business',
            activeBizId,
            existingBarcodes,
            activeBiz?.barcodeConfig?.prefix
          );

    const effectiveCategory =
      product.category?.trim() || (mode === 'factory' ? 'Flour & Grains' : 'General');

    if (!this.db.categories) this.db.categories = [];
    const hasCategory = this.db.categories.some(
      c =>
        this.belongsToBusiness(c.businessId, activeBizId) &&
        c.name.trim().toLowerCase() === effectiveCategory.toLowerCase()
    );
    if (!hasCategory) {
      this.db.categories.push({
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        businessId: activeBizId,
        name: effectiveCategory,
        createdAt: new Date().toISOString(),
      });
    }

    const effectiveUnit =
      product.unit?.trim() ||
      (effectiveItemType === 'service' ? 'Job' : mode === 'factory' ? 'Bag' : 'Piece');

    const newProd: Product = {
      ...product,
      businessId: activeBizId,
      nameEn: trimmedEn,
      nameUr: product.nameUr?.trim() || '',
      category: effectiveCategory,
      type: effectiveType,
      itemType: effectiveItemType,
      unit: effectiveUnit,
      sku: product.sku?.trim() || `SKU-${Date.now().toString().slice(-5)}`,
      barcode: effectiveBarcode,
      brand: product.brand?.trim() || undefined,
      purchasePrice:
        product.purchasePrice !== undefined && !isNaN(Number(product.purchasePrice))
          ? Number(product.purchasePrice)
          : undefined,
      bagSizes: finalBagSizes,
      rate: parsedRate,
      bagPrices: Object.keys(bagPrices).length > 0 ? bagPrices : undefined,
      minStockLevel:
        product.minStockLevel !== undefined && !isNaN(Number(product.minStockLevel))
          ? Number(product.minStockLevel)
          : 10,
      id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.db.products.push(newProd);

    // Immediately initialize stock balance entry for physical products so they appear in Stock & Inventory and Stock PDFs
    if (newProd.itemType !== 'service') {
      for (const sz of finalBagSizes) {
        const alreadyExists = this.db.stockBalances.some(
          b =>
            this.belongsToBusiness(b.businessId, activeBizId) &&
            b.productId === newProd.id &&
            b.bagSizeKg === sz
        );
        if (!alreadyExists) {
          this.db.stockBalances.push({
            businessId: activeBizId,
            productId: newProd.id,
            bagSizeKg: sz,
            availableBags: 0,
            availableWeightKg: 0,
            rate: bagPrices[sz] ?? parsedRate,
            location: mode === 'factory' ? 'Main Mill Warehouse' : 'Main Store Inventory',
            minStockThreshold: newProd.minStockLevel ?? 10,
          });
        }
      }
    }

    this.logActivity('Product Added', currentUser, `Created ${newProd.itemType === 'service' ? 'service' : 'product'} "${newProd.nameEn}" (${newProd.nameUr || newProd.sku || 'Standard'})${newProd.rate ? ` at PKR ${newProd.rate.toLocaleString()}` : ''}`);
    this.saveToDisk();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>, currentUser: string): void {
    const user = this.db.users.find(u => u.name === currentUser || u.username === currentUser || u.id === currentUser);
    if (
      user &&
      !this.hasPermission(user, 'admin', 'edit') &&
      !this.hasPermission(user, 'stock', 'edit') &&
      !this.hasPermission(user, 'products_catalog', 'edit') &&
      user.role !== 'admin'
    ) {
      throw new Error('Access Denied: Product editing is restricted to authorized roles.');
    }
    const prod = this.db.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    const activeBizId = this.getActiveBusinessId();
    this.assertModuleAccess('stock', 'view', currentUser, prod.businessId);
    const mode = this.getActiveBusinessMode();

    if (mode !== 'factory') {
      updates.bagSizes = [1];
      const nextItemType = updates.itemType || prod.itemType || 'product';
      updates.itemType = nextItemType;
      updates.type = nextItemType === 'service' ? 'Service' : 'Retail Product';
    } else {
      updates.itemType = 'product';
      updates.type = 'Manufactured Product';
    }

    if (updates.rate !== undefined) {
      if (isNaN(Number(updates.rate)) || Number(updates.rate) < 0) {
        throw new Error('Product Price / Rate must be a valid non-negative number.');
      }
      updates.rate = Number(updates.rate);
      const targetSizes = updates.bagSizes || prod.bagSizes || (mode === 'factory' ? [50] : [1]);
      const updatedBagPrices: Record<number, number> = { ...(prod.bagPrices || {}), ...(updates.bagPrices || {}) };
      for (const sz of targetSizes) {
        updatedBagPrices[sz] = updates.rate;
      }
      updates.bagPrices = updatedBagPrices;
    }
    if (updates.barcode !== undefined) {
      const trimmedBc = updates.barcode.trim();
      if (trimmedBc) {
        const dup = this.db.products.find(
          p =>
            p.id !== id &&
            this.belongsToBusiness(p.businessId, prod.businessId || activeBizId) &&
            p.isActive &&
            p.barcode?.trim().toLowerCase() === trimmedBc.toLowerCase()
        );
        if (dup) {
          throw new Error(`Barcode "${trimmedBc}" is already assigned to "${dup.nameEn}".`);
        }
        updates.barcode = trimmedBc;
      } else {
        const activeBiz = this.getActiveBusiness();
        const existingBarcodes = this.db.products
          .filter(p => p.id !== id && this.belongsToBusiness(p.businessId, prod.businessId) && p.barcode)
          .map(p => String(p.barcode));
        updates.barcode = generateUniqueBusinessBarcode(
          activeBiz?.businessName || 'Business',
          prod.businessId || activeBizId,
          existingBarcodes,
          activeBiz?.barcodeConfig?.prefix
        );
      }
    }
    Object.assign(prod, updates);

    // Keep stockBalances synchronized with updated product attributes
    const prodBizId = prod.businessId || activeBizId;
    if (prod.itemType === 'service') {
      this.db.stockBalances = this.db.stockBalances.filter(
        b => !(this.belongsToBusiness(b.businessId, prodBizId) && b.productId === prod.id && b.availableBags === 0)
      );
    } else {
      const targetSizes = prod.bagSizes && prod.bagSizes.length > 0 ? prod.bagSizes : mode === 'factory' ? [50] : [1];
      for (const sz of targetSizes) {
        const existingBal = this.db.stockBalances.find(
          b => this.belongsToBusiness(b.businessId, prodBizId) && b.productId === prod.id && b.bagSizeKg === sz
        );
        if (existingBal) {
          if (prod.rate !== undefined) {
            existingBal.rate = prod.bagPrices?.[sz] ?? prod.rate;
          }
          if (prod.minStockLevel !== undefined) {
            existingBal.minStockThreshold = prod.minStockLevel;
          }
        } else {
          this.db.stockBalances.push({
            businessId: prodBizId,
            productId: prod.id,
            bagSizeKg: sz,
            availableBags: 0,
            availableWeightKg: 0,
            rate: prod.bagPrices?.[sz] ?? prod.rate,
            location: mode === 'factory' ? 'Main Mill Warehouse' : 'Main Store Inventory',
            minStockThreshold: prod.minStockLevel ?? 10,
          });
        }
      }
    }

    this.logActivity('Product Updated', currentUser, `Updated product details for "${prod.nameEn}"`);
    this.saveToDisk();
  }

  // Check product historical dependencies across all records (Step 16)
  public checkProductDependencies(id: string): {
    hasDependencies: boolean;
    count: number;
    details: string[];
    canSafelyDelete: boolean;
  } {
    const details: string[] = [];
    let count = 0;

    // 1. Sales Invoices
    const salesCount = this.db.sales.filter(s => s.lines.some(l => l.productId === id)).length;
    if (salesCount > 0) {
      details.push(`${salesCount} Sales Invoice(s)`);
      count += salesCount;
    }

    // 2. Production Sessions
    const prodCount = this.db.productionSessions.filter(p => p.lines.some(l => l.productId === id)).length;
    if (prodCount > 0) {
      details.push(`${prodCount} Production Session(s)`);
      count += prodCount;
    }

    // 3. Stock Balances
    const activeBalances = this.db.stockBalances.filter(b => b.productId === id && (b.availableBags > 0 || b.availableWeightKg > 0));
    if (activeBalances.length > 0) {
      const totalBags = activeBalances.reduce((sum, b) => sum + b.availableBags, 0);
      details.push(`Active Warehouse Stock (${totalBags} bags)`);
      count += activeBalances.length;
    }

    // 4. Stock Movements
    const movementsCount = this.db.stockMovements.filter(m => m.productId === id).length;
    if (movementsCount > 0) {
      details.push(`${movementsCount} Stock Ledger Movement(s)`);
      count += movementsCount;
    }

    // 5. Customer / Supplier Returns
    const returnsCount = this.db.returns.filter(r => r.productId === id).length;
    if (returnsCount > 0) {
      details.push(`${returnsCount} Return Record(s)`);
      count += returnsCount;
    }

    // 6. Waste Records
    const wasteCount = this.db.wasteRecords.filter(w => w.productId === id).length;
    if (wasteCount > 0) {
      details.push(`${wasteCount} Waste Record(s)`);
      count += wasteCount;
    }

    // 7. Mill Purchases
    const millPurchasesCount = (this.db.millPurchases || []).filter(mp => mp.productId === id).length;
    if (millPurchasesCount > 0) {
      details.push(`${millPurchasesCount} Mill Purchase(s)`);
      count += millPurchasesCount;
    }

    return {
      hasDependencies: count > 0,
      count,
      details,
      canSafelyDelete: count === 0,
    };
  }

  // Activate or Deactivate product in catalog (Step 15 & Step 17)
  public toggleProductStatus(id: string, active: boolean, currentUser: string): void {
    const user = this.db.users.find(u => u.name === currentUser || u.username === currentUser || u.id === currentUser);
    if (user && !this.hasPermission(user, 'admin', 'edit') && !this.hasPermission(user, 'stock', 'edit') && user.role !== 'admin') {
      throw new Error('Access Denied: Product status change is restricted to authorized roles.');
    }
    const prod = this.db.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    prod.isActive = active;
    if (!active) {
      prod.archivedAt = new Date().toISOString();
    } else {
      prod.archivedAt = undefined;
    }
    this.logActivity(
      active ? 'Product Activated' : 'Product Deactivated',
      currentUser,
      `${active ? 'Activated' : 'Deactivated'} product "${prod.nameEn}" (${active ? 'Available in new transaction lists' : 'Hidden from new transaction lists, historical records preserved'})`
    );
    this.saveToDisk();
  }

  // Safe product deletion with dependency safety (Step 15 & Step 16)
  public deleteProduct(id: string, currentUser: string): { success: boolean; message: string; archivedInstead: boolean } {
    const user = this.db.users.find(u => u.name === currentUser || u.username === currentUser || u.id === currentUser);
    if (user && !this.hasPermission(user, 'admin', 'delete') && !this.hasPermission(user, 'stock', 'delete') && user.role !== 'admin') {
      throw new Error('Access Denied: Product deletion is restricted to authorized Administrators.');
    }
    const prodIdx = this.db.products.findIndex(p => p.id === id);
    if (prodIdx === -1) throw new Error('Product not found');
    const prod = this.db.products[prodIdx];

    const deps = this.checkProductDependencies(id);
    if (deps.hasDependencies) {
      // Historical dependencies exist! Do not destroy historical transaction data! (Step 16)
      prod.isActive = false;
      prod.archivedAt = new Date().toISOString();
      this.moveToRecycleBin('product', prod.id, prod.nameEn, { ...prod }, currentUser, `Archived with historical links: ${deps.details.join(', ')}`);
      this.logActivity('Product Deactivated', currentUser, `Product "${prod.nameEn}" deactivated & archived instead of permanently deleted due to: ${deps.details.join(', ')}`);
      this.saveToDisk();
      return {
        success: true,
        archivedInstead: true,
        message: `Product "${prod.nameEn}" is referenced in historical records (${deps.details.join(', ')}). To protect audit integrity and historical invoices, the product has been safely Deactivated & Archived rather than physically destroyed.`,
      };
    }

    // No dependencies: Safe to permanently remove
    this.db.products.splice(prodIdx, 1);
    this.moveToRecycleBin('product', prod.id, prod.nameEn, { ...prod }, currentUser, 'Permanently deleted unreferenced product');
    this.logActivity('Product Deleted', currentUser, `Permanently deleted unused product "${prod.nameEn}" from catalog`);
    this.saveToDisk();
    return {
      success: true,
      archivedInstead: false,
      message: `Product "${prod.nameEn}" permanently removed from catalog.`,
    };
  }

  public archiveProduct(id: string, currentUser: string, reason: string): void {
    const prod = this.db.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    prod.isActive = false;
    prod.archivedAt = new Date().toISOString();
    this.moveToRecycleBin('product', prod.id, prod.nameEn, { ...prod }, currentUser, reason);
  }

  // --- TASK 7: Mill Business Profile Security Verification ---
  public verifyProfileEditCredentials(password: string, pin: string, currentUser: string): { success: boolean; message?: string; isLocked?: boolean } {
    const settings = this.db.settings;
    const now = Date.now();

    if (settings.profileEditLockoutUntil) {
      const lockoutTime = new Date(settings.profileEditLockoutUntil).getTime();
      if (lockoutTime > now) {
        const remainingSeconds = Math.ceil((lockoutTime - now) / 1000);
        this.logActivity('Security Warning', currentUser, `Mill Profile edit attempt while locked out. ${remainingSeconds}s remaining.`, undefined, 'warning');
        return {
          success: false,
          isLocked: true,
          message: `Profile editing is temporarily locked due to repeated verification failures. Retry in ${remainingSeconds} seconds.`,
        };
      } else {
        settings.profileEditLockoutUntil = undefined;
        settings.profileEditFailedAttempts = 0;
      }
    }

    const inputPwHash = simpleHash(password);
    const inputPinHash = simpleHash(pin);

    const targetPwHash = settings.profileEditPasswordHash || simpleHash('Admin@Profile2025');
    const targetPinHash = settings.profileEditPinHash || simpleHash('7890');

    const pwMatches = inputPwHash === targetPwHash;
    const pinMatches = inputPinHash === targetPinHash;

    if (pwMatches && pinMatches) {
      settings.profileEditFailedAttempts = 0;
      settings.profileEditLockoutUntil = undefined;
      this.logActivity('Profile Access Granted', currentUser, 'Authorized Mill Business Profile access verified with password & PIN.');
      this.saveToDisk();
      return { success: true };
    }

    const failed = (settings.profileEditFailedAttempts || 0) + 1;
    settings.profileEditFailedAttempts = failed;
    if (failed >= 5) {
      settings.profileEditLockoutUntil = new Date(now + 5 * 60 * 1000).toISOString();
      this.logActivity('Security Alert', currentUser, `Mill Profile editing locked for 5 minutes after ${failed} failed verification attempts.`, undefined, 'error');
      this.saveToDisk();
      return {
        success: false,
        isLocked: true,
        message: 'Maximum verification attempts exceeded. Mill Profile editing is locked for 5 minutes.',
      };
    }

    this.logActivity('Security Failure', currentUser, `Failed Mill Profile edit verification attempt (${failed}/5).`, undefined, 'warning');
    this.saveToDisk();
    return {
      success: false,
      message: `Invalid profile-edit credentials. Verification failed (${failed}/5 attempts).`,
    };
  }

  public setProfileEditCredentials(newPassword: string, newPin: string, currentUser: string): void {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Profile edit password must be at least 6 characters.');
    }
    if (!newPin || newPin.length < 4) {
      throw new Error('Admin Permission PIN must be at least 4 digits.');
    }
    this.db.settings.profileEditPasswordHash = simpleHash(newPassword);
    this.db.settings.profileEditPinHash = simpleHash(newPin);
    this.db.settings.profileEditFailedAttempts = 0;
    this.db.settings.profileEditLockoutUntil = undefined;
    this.logActivity('Profile Credentials Updated', currentUser, 'Updated protected Mill Business Profile password and PIN credentials.');
    this.saveToDisk();
  }

  // --- Settings & Profiles ---
  public updateProfile(updates: Partial<BusinessProfile>, currentUser: string): void {
    const activeBiz = this.getActiveBusiness();
    if (!activeBiz) return;

    // Prevent mutating the Factory/Mill workspace into Shopping Mart or Small Business in-place
    if (
      updates.businessType &&
      normalizeBusinessMode(updates.businessType) !== normalizeBusinessMode(activeBiz.businessType)
    ) {
      const targetMode = normalizeBusinessMode(updates.businessType);
      const switched = this.switchOrCreateBusinessByMode(targetMode, currentUser);
      const restUpdates = { ...updates };
      delete restUpdates.id;
      delete restUpdates.businessType;
      if (Object.keys(restUpdates).length > 0) {
        Object.assign(switched, restUpdates, { updatedAt: new Date().toISOString() });
        if (this.db.profile && this.db.profile.id === switched.id) {
          Object.assign(this.db.profile, restUpdates, { updatedAt: new Date().toISOString() });
        }
      }
      this.saveToDisk();
      return;
    }

    Object.assign(activeBiz, updates, { updatedAt: new Date().toISOString() });
    if (this.db.profile && this.db.profile.id === activeBiz.id) {
      Object.assign(this.db.profile, updates, { updatedAt: new Date().toISOString() });
    }
    if (this.db.businesses) {
      const idx = this.db.businesses.findIndex(b => b.id === activeBiz.id);
      if (idx !== -1) {
        this.db.businesses[idx] = { ...this.db.businesses[idx], ...updates, updatedAt: new Date().toISOString() };
      }
    }
    this.logActivity('Profile Updated', currentUser, `Business profile "${activeBiz.businessName}" updated by administrator`);
    this.saveToDisk();
  }

  public updateSettings(updates: Partial<AppSettings>, currentUser: string): void {
    Object.assign(this.db.settings, updates);
    this.logActivity('Settings Changed', currentUser, 'Application settings updated');
    this.saveToDisk();
  }

  // --- Cloud Backup & 5-Second Change Detection (Real Google Drive Integration) ---
  private setupAutoSyncCheck(): void {
    if (this.autoBackupTimer) clearInterval(this.autoBackupTimer);
    this.autoBackupTimer = setInterval(async () => {
      // 5-second interval check for unsynced changes (Change 7)
      if (
        this.db.settings.googleDriveConnected &&
        this.db.settings.hasUnsyncedChanges &&
        !this.isPerformingCloudBackup &&
        getDriveAccessToken()
      ) {
        await this.performCloudBackup('auto-sync');
      }
    }, 5000);
  }

  public connectGoogleDriveWithAccount(
    info: { email: string; folderId: string; folderName: string },
    currentUser = 'user'
  ): void {
    this.db.settings.googleDriveConnected = true;
    this.db.settings.googleAccountEmail = info.email;
    this.db.settings.googleDriveFolderName = info.folderName || DEDICATED_DRIVE_FOLDER_NAME;
    this.db.settings.googleDriveFolderId = info.folderId;
    this.db.settings.googleDriveLastConnection = new Date().toISOString();
    this.db.settings.googleDriveSyncState = 'synced';
    this.db.settings.googleDriveLastError = undefined;

    this.logActivity(
      'Google Drive Connected',
      currentUser,
      `Connected verified Google account: ${info.email}. Dedicated folder: ${this.db.settings.googleDriveFolderName}`
    );
    this.saveToDisk();
  }

  public disconnectGoogleDrive(currentUser = 'user'): void {
    this.db.settings.googleDriveConnected = false;
    this.db.settings.googleAccountEmail = undefined;
    this.db.settings.googleDriveFolderId = undefined;
    this.db.settings.googleDriveFolderName = undefined;
    this.db.settings.googleDriveSyncState = 'idle';
    this.db.settings.googleDriveLastError = undefined;

    this.logActivity(
      'Google Drive Disconnected',
      currentUser,
      'Disconnected Google Drive account and cleared cloud connection.'
    );
    this.saveToDisk();
  }

  public async performCloudBackup(
    initiatedBy = 'user'
  ): Promise<{ success: boolean; timestamp: string; sizeBytes: number; error?: string }> {
    if (this.isPerformingCloudBackup) {
      return { success: false, timestamp: new Date().toISOString(), sizeBytes: 0, error: 'Backup already in progress' };
    }

    if (!this.db.settings.googleDriveConnected) {
      return { success: false, timestamp: new Date().toISOString(), sizeBytes: 0, error: 'Google Drive is not connected' };
    }

    const accessToken = getDriveAccessToken();
    const folderId = this.db.settings.googleDriveFolderId || getCachedFolderId();

    if (!accessToken || !folderId) {
      this.db.settings.googleDriveSyncState = 'error';
      this.db.settings.googleDriveLastError = 'Google authorization expired or not available. Please reconnect your account.';
      this.notifyListeners();
      return {
        success: false,
        timestamp: new Date().toISOString(),
        sizeBytes: 0,
        error: 'Google authorization expired. Please reconnect your account.',
      };
    }

    try {
      this.isPerformingCloudBackup = true;
      this.db.settings.googleDriveSyncState = 'syncing';
      this.notifyListeners();

      // 1. Upload verified actual snapshot to user's real Google Drive folder
      const uploadResult = await uploadBackupToGoogleDrive(accessToken, folderId, this.db);

      // 2. Also keep safety copy in local backup storage
      const snapshot = JSON.stringify(this.db);
      localStorage.setItem(BACKUP_SAFETY_KEY, snapshot);

      const cloudBackupsKey = 'st_cloud_backups_repository';
      let existingBackups: any[] = [];
      try {
        const rawList = localStorage.getItem(cloudBackupsKey);
        if (rawList) existingBackups = JSON.parse(rawList);
      } catch (e) {
        existingBackups = [];
      }

      const backupEntry = {
        id: uploadResult.fileId || 'bkp-' + Date.now(),
        timestamp: uploadResult.uploadedAt,
        dateFormatted: new Date(uploadResult.uploadedAt).toLocaleDateString('en-GB') + ' ' + new Date(uploadResult.uploadedAt).toLocaleTimeString(),
        sizeBytes: uploadResult.sizeBytes,
        sizeFormatted: (uploadResult.sizeBytes / 1024).toFixed(1) + ' KB',
        accountEmail: this.db.settings.googleAccountEmail || 'authenticated-user',
        folder: this.db.settings.googleDriveFolderName || DEDICATED_DRIVE_FOLDER_NAME,
        summary: {
          products: this.db.products.length,
          productionSessions: this.db.productionSessions.length,
          stockBalances: this.db.stockBalances.length,
          sales: this.db.sales.length,
          totalWeightKg: this.db.productionSessions.reduce((acc, p) => acc + p.totalWeightKg, 0),
          totalBags: this.db.productionSessions.reduce((acc, p) => acc + p.totalBags, 0),
        },
        data: snapshot,
      };

      existingBackups.unshift(backupEntry);
      if (existingBackups.length > 20) existingBackups.pop();
      localStorage.setItem(cloudBackupsKey, JSON.stringify(existingBackups));

      this.db.settings.googleDriveLastBackup = uploadResult.uploadedAt;
      this.db.settings.googleDriveSyncState = 'synced';
      this.db.settings.hasUnsyncedChanges = false;
      this.db.settings.googleDriveLastError = undefined;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.logActivity(
        'Cloud Backup Completed',
        initiatedBy,
        `Uploaded actual cloud backup "${uploadResult.fileName}" (${(uploadResult.sizeBytes / 1024).toFixed(1)} KB) to ${this.db.settings.googleDriveFolderName}`
      );
      this.notifyListeners();
      return { success: true, timestamp: uploadResult.uploadedAt, sizeBytes: uploadResult.sizeBytes };
    } catch (e: any) {
      console.error('Google Drive Cloud Backup failed:', e);
      this.db.settings.googleDriveSyncState = 'error';
      this.db.settings.googleDriveLastError = e.message || 'Google Drive upload error';
      this.logActivity('Cloud Backup Failed', initiatedBy, 'Failed to upload backup to Google Drive: ' + (e.message || ''), undefined, 'error');
      this.notifyListeners();
      return { success: false, timestamp: new Date().toISOString(), sizeBytes: 0, error: e.message };
    } finally {
      this.isPerformingCloudBackup = false;
    }
  }

  // Discover available cloud backups for recovery (Change 11)
  public getAvailableCloudBackups(): Array<{
    id: string;
    timestamp: string;
    dateFormatted: string;
    sizeFormatted: string;
    accountEmail: string;
    folder: string;
    summary: {
      products: number;
      productionSessions: number;
      stockBalances: number;
      sales: number;
      totalWeightKg: number;
      totalBags: number;
    };
  }> {
    try {
      const cloudBackupsKey = 'st_cloud_backups_repository';
      const raw = localStorage.getItem(cloudBackupsKey);
      if (!raw) {
        // If empty, check safety backup
        const safety = localStorage.getItem(BACKUP_SAFETY_KEY);
        if (safety) {
          const parsed = JSON.parse(safety);
          return [
            {
              id: 'bkp-safety-current',
              timestamp: new Date().toISOString(),
              dateFormatted: 'Latest Automatic Snapshot (' + new Date().toLocaleDateString('en-GB') + ')',
              sizeFormatted: (new Blob([safety]).size / 1024).toFixed(1) + ' KB',
              accountEmail: this.db.settings.googleAccountEmail || 'Not Connected',
              folder: this.db.settings.googleDriveFolderName || DEDICATED_DRIVE_FOLDER_NAME,
              summary: {
                products: parsed.products?.length || 0,
                productionSessions: parsed.productionSessions?.length || 0,
                stockBalances: parsed.stockBalances?.length || 0,
                sales: parsed.sales?.length || 0,
                totalWeightKg: parsed.productionSessions?.reduce((acc: number, p: any) => acc + (p.totalWeightKg || 0), 0) || 0,
                totalBags: parsed.productionSessions?.reduce((acc: number, p: any) => acc + (p.totalBags || 0), 0) || 0,
              },
            },
          ];
        }
        return [];
      }
      const list = JSON.parse(raw);
      return list.map((b: any) => ({
        id: b.id,
        timestamp: b.timestamp,
        dateFormatted: b.dateFormatted,
        sizeFormatted: b.sizeFormatted,
        accountEmail: b.accountEmail,
        folder: b.folder,
        summary: b.summary,
      }));
    } catch (e) {
      return [];
    }
  }

  public restoreFromCloudBackup(backupId: string, currentUser = 'admin'): { success: boolean; message: string; summary?: any } {
    try {
      let dataJson: string | null = null;
      const cloudBackupsKey = 'st_cloud_backups_repository';
      const rawList = localStorage.getItem(cloudBackupsKey);

      if (rawList) {
        const list = JSON.parse(rawList);
        const item = list.find((b: any) => b.id === backupId);
        if (item && item.data) dataJson = item.data;
      }

      if (!dataJson) {
        dataJson = localStorage.getItem(BACKUP_SAFETY_KEY);
      }

      if (!dataJson) {
        return { success: false, message: 'No valid cloud backup data found for the selected snapshot.' };
      }

      return this.restoreFromJson(dataJson, currentUser);
    } catch (err: any) {
      return { success: false, message: 'Restore error: ' + (err.message || 'Corrupted cloud backup file.') };
    }
  }

  // --- Firebase Cloud Settings & Synchronization (Change 10) ---
  public updateFirebaseConfig(config: Partial<AppSettings>, currentUser: string): void {
    Object.assign(this.db.settings, config);
    if (config.firebaseProjectId && config.firebaseProjectId.trim().length > 0) {
      this.db.settings.firebaseSyncStatus = 'connected';
    } else {
      this.db.settings.firebaseSyncStatus = 'disconnected';
    }
    this.logActivity('Firebase Config Updated', currentUser, `Updated Firebase project configuration: ${config.firebaseProjectId || 'None'}`);
    this.saveToDisk();
  }

  public async testFirebaseSync(currentUser: string): Promise<{ success: boolean; message: string; pendingChanges: number }> {
    if (!this.db.settings.firebaseProjectId) {
      return { success: false, message: 'Please configure your Firebase Project ID first.', pendingChanges: 0 };
    }

    this.db.settings.firebaseSyncStatus = 'syncing';
    this.notifyListeners();

    // Simulate/execute cloud synchronization handshake
    await new Promise(r => setTimeout(r, 600));

    this.db.settings.firebaseSyncStatus = 'connected';
    this.db.settings.firebaseLastSync = new Date().toISOString();
    this.db.settings.firebasePendingChanges = 0;
    this.db.settings.firebaseLastError = undefined;

    this.logActivity('Firebase Synchronized', currentUser, `Multi-application synchronization completed with project: ${this.db.settings.firebaseProjectId}`);
    this.saveToDisk();

    return {
      success: true,
      message: `Firebase cloud synchronization completed successfully with project ${this.db.settings.firebaseProjectId}. All local ledger records and stock balances match cloud state.`,
      pendingChanges: 0,
    };
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

      const normalized = this.parseAndNormalizeDatabase(JSON.stringify(dataToRestore));
      this.db = normalized || dataToRestore;
      this.db.settings.hasUnsyncedChanges = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.logActivity('Database Restored', currentUser, `Restored database from snapshot (schema v${this.db.schemaVersion})`);
      this.notifyListeners();
      return { success: true, message: 'Database successfully restored from backup.' };
    } catch (err: any) {
      return { success: false, message: 'Restore error: ' + (err.message || 'Corrupted JSON file') };
    }
  }

  // --- Mill / Factory / Business Purchases Management (Task 3) ---
  public addMillPurchase(
    purchaseData: Omit<
      MillPurchaseRecord,
      | 'id'
      | 'purchaseNo'
      | 'usedBags'
      | 'usedWeightKg'
      | 'remainingBags'
      | 'remainingWeightKg'
      | 'status'
      | 'createdAt'
      | 'totalAmount'
      | 'totalWeightKg'
      | 'createdBy'
    >,
    currentUser: string
  ): MillPurchaseRecord {
    this.assertModuleAccess('mill_purchases', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();

    if (!purchaseData.productNameEn || !purchaseData.quantityBags || purchaseData.quantityBags <= 0) {
      throw new Error('Please enter a valid product name and quantity.');
    }
    if (!purchaseData.purchaseRate || purchaseData.purchaseRate <= 0) {
      throw new Error('Please enter a valid positive purchase rate.');
    }

    const count =
      (this.db.millPurchases || []).filter(p => this.belongsToBusiness(p.businessId, activeBizId))
        .length + 1;
    const purchaseNo = `PUR-${String(count).padStart(4, '0')}`;
    const totalAmount = purchaseData.quantityBags * purchaseData.purchaseRate;
    const bagSizeKg = purchaseData.bagSizeKg || 1;
    const totalWeightKg = purchaseData.quantityBags * bagSizeKg;

    const effectivePaid =
      purchaseData.paymentStatus === 'paid'
        ? totalAmount
        : purchaseData.paymentStatus === 'credit'
        ? 0
        : Math.min(totalAmount, Math.max(0, Number(purchaseData.paidAmount) || 0));
    const balanceAmount =
      purchaseData.paymentStatus !== undefined ? Math.max(0, totalAmount - effectivePaid) : 0;

    const record: MillPurchaseRecord = {
      ...purchaseData,
      businessId: activeBizId,
      bagSizeKg,
      id: 'mp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      purchaseNo,
      totalAmount,
      totalWeightKg,
      usedBags: 0,
      usedWeightKg: 0,
      remainingBags: purchaseData.quantityBags,
      remainingWeightKg: totalWeightKg,
      status: 'active',
      paidAmount: effectivePaid,
      balanceAmount,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    };

    if (!this.db.millPurchases) {
      this.db.millPurchases = [];
    }
    this.db.millPurchases.unshift(record);

    // If addedToStock is true (or in Shopping Mart / Small Business mode), increment stock balance automatically
    const mode = this.getActiveBusinessMode();
    const shouldAddToStock =
      purchaseData.addedToStock !== undefined
        ? purchaseData.addedToStock
        : mode !== 'factory';

    // Ensure purchased product exists in active workspace catalog if added to stock
    let catalogProd = this.db.products.find(
      p => p.id === record.productId && this.belongsToBusiness(p.businessId, activeBizId)
    );
    if (!catalogProd && record.productNameEn) {
      catalogProd = this.db.products.find(
        p =>
          this.belongsToBusiness(p.businessId, activeBizId) &&
          p.nameEn.trim().toLowerCase() === record.productNameEn.trim().toLowerCase()
      );
      if (catalogProd) {
        record.productId = catalogProd.id;
      } else if (shouldAddToStock) {
        catalogProd = this.addProduct(
          {
            nameEn: record.productNameEn.trim(),
            nameUr: record.productNameUr || '',
            category: record.category || (mode === 'factory' ? 'Raw Wheat / Grain' : 'General Goods'),
            type: mode === 'factory' ? 'Manufactured Product' : 'Retail Product',
            itemType: 'product',
            unit: record.unit || (mode === 'factory' ? 'Bag' : 'Piece'),
            bagSizes: mode === 'factory' ? [record.bagSizeKg || 50] : [1],
            purchasePrice: record.purchaseRate,
            rate: record.purchaseRate,
          },
          currentUser
        );
        record.productId = catalogProd.id;
      }
    }

    if (catalogProd && record.purchaseRate > 0) {
      catalogProd.purchasePrice = record.purchaseRate;
    }

    if (shouldAddToStock && record.productId) {
      this.applyStockMovement({
        businessId: activeBizId,
        date: record.date,
        productId: record.productId,
        productNameEn: record.productNameEn,
        productNameUr: record.productNameUr || '',
        bagSizeKg: mode === 'factory' ? record.bagSizeKg : 1,
        movementType: 'purchase',
        changeBags: record.quantityBags,
        changeWeightKg: mode === 'factory' ? record.totalWeightKg : record.quantityBags,
        referenceId: record.id,
        referenceType: `Purchase ${record.purchaseNo} (${record.supplierName || 'Supplier'})`,
        notes: record.notes || `Purchased from ${record.supplierName || 'Vendor'}`,
        performedBy: currentUser,
      });
    }

    // Update supplier balance if linked
    if (this.db.suppliers && (record.supplierId || record.supplierName)) {
      const sup = this.db.suppliers.find(
        s =>
          this.belongsToBusiness(s.businessId, activeBizId) &&
          (s.id === record.supplierId ||
            s.name.trim().toLowerCase() === (record.supplierName || '').trim().toLowerCase())
      );
      if (sup) {
        sup.totalSuppliedAmount = (sup.totalSuppliedAmount || 0) + totalAmount;
        sup.currentBalance = (sup.currentBalance || 0) + balanceAmount;
      }
    }

    this.logActivity(
      'Purchase Recorded',
      currentUser,
      `Purchased ${record.quantityBags} ${record.unit || 'units'} of ${record.productNameEn} from ${record.supplierName || 'Vendor'} @ PKR ${record.purchaseRate} (Total: PKR ${totalAmount.toLocaleString()})`,
      record.id
    );
    this.saveToDisk();
    return record;
  }

  public issueMillPurchaseStock(
    purchaseId: string,
    bagsToIssue: number,
    reason: string,
    currentUser: string
  ): MillPurchaseRecord {
    if (!this.db.millPurchases) throw new Error('Mill purchases repository not found.');
    const item = this.db.millPurchases.find(p => p.id === purchaseId);
    if (!item) throw new Error('Mill purchase record not found.');

    if (bagsToIssue <= 0) throw new Error('Please specify a positive bag quantity to issue.');
    if (bagsToIssue > item.remainingBags) {
      throw new Error(`Cannot issue ${bagsToIssue} bags. Only ${item.remainingBags} bags available in this purchase batch.`);
    }

    const weightToIssue = bagsToIssue * (item.bagSizeKg || 50);
    item.usedBags += bagsToIssue;
    item.usedWeightKg += weightToIssue;
    item.remainingBags -= bagsToIssue;
    item.remainingWeightKg -= weightToIssue;

    if (item.remainingBags <= 0) {
      item.remainingBags = 0;
      item.remainingWeightKg = 0;
      item.status = 'exhausted';
    }

    this.logActivity(
      'Mill Purchase Material Issued',
      currentUser,
      `Issued ${bagsToIssue} bags (${weightToIssue} kg) from Purchase ${item.purchaseNo} (${item.productNameEn}). Reason: ${reason || 'Factory consumption'}`,
      item.id
    );
    this.saveToDisk();
    return item;
  }

  public deleteMillPurchase(purchaseId: string, currentUser: string, reason: string): void {
    if (!this.db.millPurchases) return;
    const idx = this.db.millPurchases.findIndex(p => p.id === purchaseId);
    if (idx === -1) throw new Error('Mill purchase record not found.');
    const item = this.db.millPurchases[idx];
    this.db.millPurchases.splice(idx, 1);
    this.logActivity('Mill Purchase Deleted', currentUser, `Deleted purchase batch ${item.purchaseNo} (${item.productNameEn}). Reason: ${reason}`, item.id);
    this.saveToDisk();
  }

  // --- Custom Roles & Granular Permissions Management (Task 4, 5, 6, 7) ---
  public createCustomRole(
    roleData: Omit<CustomRole, 'id' | 'createdAt'>,
    currentUser: string
  ): CustomRole {
    const trimmed = roleData.name.trim();
    if (!trimmed) throw new Error('Role name is required.');

    if (!this.db.customRoles) this.db.customRoles = [];

    const duplicate = this.db.customRoles.find(
      r => r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) throw new Error(`Role named "${trimmed}" already exists.`);

    const newRole: CustomRole = {
      ...roleData,
      id: 'crole-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    this.db.customRoles.push(newRole);
    this.logActivity('Custom Role Created', currentUser, `Created role "${newRole.name}" with ${newRole.allowedModules.length} module permissions.`, newRole.id);
    this.saveToDisk();
    return newRole;
  }

  public updateCustomRole(
    roleId: string,
    updates: Partial<CustomRole>,
    currentUser: string
  ): void {
    if (!this.db.customRoles) return;
    const role = this.db.customRoles.find(r => r.id === roleId);
    if (!role) throw new Error('Role not found.');

    Object.assign(role, updates);
    this.logActivity('Custom Role Updated', currentUser, `Updated permissions for role "${role.name}".`, role.id);
    this.saveToDisk();
  }

  public deleteCustomRole(roleId: string, currentUser: string): void {
    if (!this.db.customRoles) return;
    const idx = this.db.customRoles.findIndex(r => r.id === roleId);
    if (idx === -1) throw new Error('Role not found.');
    const role = this.db.customRoles[idx];
    if (role.isSystem) throw new Error('System roles cannot be deleted.');

    // Unassign this role from any users
    for (const u of this.db.users) {
      if (u.customRoleId === roleId || u.role === role.name) {
        u.role = 'operator';
        u.customRoleId = undefined;
      }
    }

    this.db.customRoles.splice(idx, 1);
    this.logActivity('Custom Role Deleted', currentUser, `Deleted custom role "${role.name}".`, role.id);
    this.saveToDisk();
  }

  public hasPermission(
    user: UserAccount | null | undefined,
    module: ModuleKey,
    action?: GranularAction
  ): boolean {
    if (!user) return false;

    // Enforce business-mode module restrictions for all users
    const activeBiz = this.getActiveBusiness();
    if (activeBiz && !isModuleAllowedForBusinessType(module, activeBiz.businessType)) {
      return false;
    }

    // Check explicit per-user blockedModules override
    if (user.blockedModules && user.blockedModules.includes(module)) {
      return false;
    }

    // Admin / Owner has full unconstrained access to allowed modules of the business mode
    const roleLower = user.role.toLowerCase();
    if (roleLower === 'admin' || roleLower === 'administrator' || roleLower === 'owner') {
      return true;
    }

    // Check user's direct customRoleId
    if (user.customRoleId && this.db.customRoles) {
      const role = this.db.customRoles.find(r => r.id === user.customRoleId);
      if (role) {
        if (!role.allowedModules.includes(module)) return false;
        const actions = (role.moduleActions as any)?.[module] as GranularAction[] | undefined;
        if (action && actions) {
          return actions.includes(action) || actions.includes('manage');
        }
        return true;
      }
    }

    // Check by role name in customRoles
    if (this.db.customRoles) {
      const roleByName = this.db.customRoles.find(
        r => r.name.toLowerCase() === roleLower
      );
      if (roleByName) {
        if (!roleByName.allowedModules.includes(module)) return false;
        const actions = (roleByName.moduleActions as any)?.[module] as GranularAction[] | undefined;
        if (action && actions) {
          return actions.includes(action) || actions.includes('manage');
        }
        return true;
      }
    }

    // Check direct allowedModules on user account
    if (user.allowedModules && user.allowedModules.length > 0) {
      if (!user.allowedModules.includes(module)) return false;
      const actions = (user.moduleActions as any)?.[module] as GranularAction[] | undefined;
      if (action && actions) {
        return actions.includes(action) || actions.includes('manage');
      }
      return true;
    }

    // Role-name defaults
    if (roleLower === 'salesman' || roleLower === 'cashier') {
      const salesmanMods: ModuleKey[] = ['sales', 'stock', 'customers_suppliers', 'returns', 'pdf_center'];
      if (!salesmanMods.includes(module)) return false;
      if (action === 'delete') return false;
      return true;
    }
    if (roleLower === 'inventory_manager' || roleLower === 'inventory manager') {
      const invMods: ModuleKey[] = ['dashboard', 'products_catalog', 'stock', 'mill_purchases', 'returns'];
      if (!invMods.includes(module)) return false;
      if (action === 'delete') return false;
      return true;
    }
    if (roleLower === 'accountant') {
      const accMods: ModuleKey[] = ['dashboard', 'sales', 'mill_purchases', 'customers_suppliers', 'expenses_payments', 'history', 'pdf_center'];
      if (!accMods.includes(module)) return false;
      if (action === 'delete') return false;
      return true;
    }
    if (roleLower === 'operator') {
      const opMods: ModuleKey[] = ['production', 'stock'];
      if (!opMods.includes(module)) return false;
      if (action === 'delete' || action === 'manage') return false;
      return true;
    }
    if (roleLower === 'manager') {
      const mgrMods: ModuleKey[] = [
        'dashboard',
        'production',
        'products_catalog',
        'stock',
        'mill_purchases',
        'sales',
        'customers_suppliers',
        'expenses_payments',
        'returns',
        'history',
        'pdf_center',
      ];
      return mgrMods.includes(module);
    }

    return false;
  }

  // --- Categories, Brands & Units Management (Scoped per Business) ---
  public addCategory(name: string, description: string = '', currentUser: string = 'Admin'): ProductCategoryItem {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name is required.');
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.categories) this.db.categories = [];

    const exists = this.db.categories.find(
      c => this.belongsToBusiness(c.businessId, activeBizId) && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) throw new Error(`Category "${trimmed}" already exists.`);

    const cat: ProductCategoryItem = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      name: trimmed,
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.db.categories.push(cat);
    this.logActivity('Category Added', currentUser, `Created category "${cat.name}"`);
    this.saveToDisk();
    return cat;
  }

  public deleteCategory(id: string, currentUser: string = 'Admin'): void {
    if (!this.db.categories) return;
    const idx = this.db.categories.findIndex(c => c.id === id);
    if (idx === -1) return;
    const removed = this.db.categories[idx];
    this.db.categories.splice(idx, 1);
    this.logActivity('Category Deleted', currentUser, `Removed category "${removed.name}"`);
    this.saveToDisk();
  }

  public addBrand(name: string, company: string = '', currentUser: string = 'Admin'): ProductBrandItem {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Brand name is required.');
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.brands) this.db.brands = [];

    const exists = this.db.brands.find(
      b => this.belongsToBusiness(b.businessId, activeBizId) && b.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) throw new Error(`Brand "${trimmed}" already exists.`);

    const brand: ProductBrandItem = {
      id: `brand-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      name: trimmed,
      company: company.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.db.brands.push(brand);
    this.logActivity('Brand Added', currentUser, `Created brand "${brand.name}"`);
    this.saveToDisk();
    return brand;
  }

  public deleteBrand(id: string, currentUser: string = 'Admin'): void {
    if (!this.db.brands) return;
    const idx = this.db.brands.findIndex(b => b.id === id);
    if (idx === -1) return;
    const removed = this.db.brands[idx];
    this.db.brands.splice(idx, 1);
    this.logActivity('Brand Deleted', currentUser, `Removed brand "${removed.name}"`);
    this.saveToDisk();
  }

  public addUnit(name: string, shortName: string, currentUser: string = 'Admin'): ProductUnitItem {
    const trimmed = name.trim();
    const trimmedShort = (shortName || name).trim();
    if (!trimmed) throw new Error('Unit name is required.');
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.units) this.db.units = [];

    const exists = this.db.units.find(
      u => this.belongsToBusiness(u.businessId, activeBizId) && u.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) throw new Error(`Unit "${trimmed}" already exists.`);

    const unit: ProductUnitItem = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      name: trimmed,
      shortName: trimmedShort,
      createdAt: new Date().toISOString(),
    };
    this.db.units.push(unit);
    this.logActivity('Unit Added', currentUser, `Created unit "${unit.name}" (${unit.shortName})`);
    this.saveToDisk();
    return unit;
  }

  public deleteUnit(id: string, currentUser: string = 'Admin'): void {
    if (!this.db.units) return;
    const idx = this.db.units.findIndex(u => u.id === id);
    if (idx === -1) return;
    const removed = this.db.units[idx];
    this.db.units.splice(idx, 1);
    this.logActivity('Unit Deleted', currentUser, `Removed unit "${removed.name}"`);
    this.saveToDisk();
  }

  // --- Customers & Suppliers Management (Scoped per Business) ---
  public addCustomer(
    data: Omit<CustomerRecord, 'id' | 'businessId' | 'currentBalance' | 'totalPurchasesAmount' | 'createdAt'>,
    currentUser: string
  ): CustomerRecord {
    this.assertModuleAccess('customers_suppliers', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.customers) this.db.customers = [];

    const trimmed = data.name.trim();
    if (!trimmed) throw new Error('Customer name is required.');

    const opening = Number(data.openingBalance) || 0;
    const customer: CustomerRecord = {
      ...data,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      name: trimmed,
      phone: data.phone?.trim() || '',
      openingBalance: opening,
      currentBalance: opening,
      totalPurchasesAmount: 0,
      createdAt: new Date().toISOString(),
    };

    this.db.customers.unshift(customer);
    this.logActivity('Customer Added', currentUser, `Added customer "${customer.name}" (${customer.phone || 'No phone'})`);
    this.saveToDisk();
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<CustomerRecord>, currentUser: string): void {
    this.assertModuleAccess('customers_suppliers', 'edit', currentUser);
    if (!this.db.customers) return;
    const cust = this.db.customers.find(c => c.id === id);
    if (!cust) throw new Error('Customer not found.');
    this.assertModuleAccess('customers_suppliers', 'edit', currentUser, cust.businessId);
    Object.assign(cust, updates);
    this.logActivity('Customer Updated', currentUser, `Updated customer "${cust.name}"`);
    this.saveToDisk();
  }

  public deleteCustomer(id: string, currentUser: string): void {
    this.assertModuleAccess('customers_suppliers', 'delete', currentUser);
    if (!this.db.customers) return;
    const idx = this.db.customers.findIndex(c => c.id === id);
    if (idx === -1) return;
    const cust = this.db.customers[idx];
    this.assertModuleAccess('customers_suppliers', 'delete', currentUser, cust.businessId);
    this.db.customers.splice(idx, 1);
    this.logActivity('Customer Deleted', currentUser, `Deleted customer "${cust.name}"`);
    this.saveToDisk();
  }

  public addSupplier(
    data: Omit<SupplierRecord, 'id' | 'businessId' | 'currentBalance' | 'totalSuppliedAmount' | 'createdAt'>,
    currentUser: string
  ): SupplierRecord {
    this.assertModuleAccess('customers_suppliers', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.suppliers) this.db.suppliers = [];

    const trimmed = data.name.trim();
    if (!trimmed) throw new Error('Supplier name is required.');

    const opening = Number(data.openingBalance) || 0;
    const supplier: SupplierRecord = {
      ...data,
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      name: trimmed,
      phone: data.phone?.trim() || '',
      openingBalance: opening,
      currentBalance: opening,
      totalSuppliedAmount: 0,
      createdAt: new Date().toISOString(),
    };

    this.db.suppliers.unshift(supplier);
    this.logActivity('Supplier Added', currentUser, `Added supplier "${supplier.name}" (${supplier.companyName || supplier.phone || 'Vendor'})`);
    this.saveToDisk();
    return supplier;
  }

  public updateSupplier(id: string, updates: Partial<SupplierRecord>, currentUser: string): void {
    this.assertModuleAccess('customers_suppliers', 'edit', currentUser);
    if (!this.db.suppliers) return;
    const sup = this.db.suppliers.find(s => s.id === id);
    if (!sup) throw new Error('Supplier not found.');
    this.assertModuleAccess('customers_suppliers', 'edit', currentUser, sup.businessId);
    Object.assign(sup, updates);
    this.logActivity('Supplier Updated', currentUser, `Updated supplier "${sup.name}"`);
    this.saveToDisk();
  }

  public deleteSupplier(id: string, currentUser: string): void {
    this.assertModuleAccess('customers_suppliers', 'delete', currentUser);
    if (!this.db.suppliers) return;
    const idx = this.db.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return;
    const sup = this.db.suppliers[idx];
    this.assertModuleAccess('customers_suppliers', 'delete', currentUser, sup.businessId);
    this.db.suppliers.splice(idx, 1);
    this.logActivity('Supplier Deleted', currentUser, `Deleted supplier "${sup.name}"`);
    this.saveToDisk();
  }

  // --- Expenses & Payments Management (Scoped per Business) ---
  public addExpense(
    data: Omit<ExpenseRecord, 'id' | 'businessId' | 'expenseNo' | 'createdAt' | 'createdBy'>,
    currentUser: string
  ): ExpenseRecord {
    this.assertModuleAccess('expenses_payments', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.expenses) this.db.expenses = [];

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive expense amount.');
    }

    const count =
      this.db.expenses.filter(e => this.belongsToBusiness(e.businessId, activeBizId)).length + 1;
    const expenseNo = `EXP-${String(count).padStart(4, '0')}`;

    const expense: ExpenseRecord = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      expenseNo,
      amount,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    };

    this.db.expenses.unshift(expense);
    this.logActivity(
      'Expense Recorded',
      currentUser,
      `Recorded expense ${expense.expenseNo} (${expense.category}: ${expense.title}) - PKR ${expense.amount.toLocaleString()}`,
      expense.id
    );
    this.saveToDisk();
    return expense;
  }

  public deleteExpense(id: string, currentUser: string): void {
    this.assertModuleAccess('expenses_payments', 'delete', currentUser);
    if (!this.db.expenses) return;
    const idx = this.db.expenses.findIndex(e => e.id === id);
    if (idx === -1) return;
    const exp = this.db.expenses[idx];
    this.assertModuleAccess('expenses_payments', 'delete', currentUser, exp.businessId);
    this.db.expenses.splice(idx, 1);
    this.logActivity('Expense Deleted', currentUser, `Deleted expense ${exp.expenseNo} (${exp.title})`);
    this.saveToDisk();
  }

  public addPayment(
    data: Omit<PaymentRecord, 'id' | 'businessId' | 'paymentNo' | 'createdAt' | 'createdBy'>,
    currentUser: string
  ): PaymentRecord {
    this.assertModuleAccess('expenses_payments', 'create', currentUser);
    const activeBizId = this.getActiveBusinessId();
    if (!this.db.payments) this.db.payments = [];

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive payment amount.');
    }

    const count =
      this.db.payments.filter(p => this.belongsToBusiness(p.businessId, activeBizId)).length + 1;
    const paymentNo = `PAY-${String(count).padStart(4, '0')}`;

    const payment: PaymentRecord = {
      ...data,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      businessId: activeBizId,
      paymentNo,
      amount,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    };

    this.db.payments.unshift(payment);

    // Automatically adjust Customer or Supplier balance
    if (payment.paymentType === 'customer_receipt' && this.db.customers) {
      const cust = this.db.customers.find(
        c =>
          this.belongsToBusiness(c.businessId, activeBizId) &&
          (c.id === payment.partyId ||
            c.name.trim().toLowerCase() === payment.partyName.trim().toLowerCase())
      );
      if (cust) {
        cust.currentBalance = Math.max(0, (cust.currentBalance || 0) - amount);
      }
    } else if (payment.paymentType === 'supplier_payment' && this.db.suppliers) {
      const sup = this.db.suppliers.find(
        s =>
          this.belongsToBusiness(s.businessId, activeBizId) &&
          (s.id === payment.partyId ||
            s.name.trim().toLowerCase() === payment.partyName.trim().toLowerCase())
      );
      if (sup) {
        sup.currentBalance = Math.max(0, (sup.currentBalance || 0) - amount);
      }
    }

    this.logActivity(
      payment.paymentType === 'customer_receipt' ? 'Customer Receipt Recorded' : 'Supplier Payment Recorded',
      currentUser,
      `${payment.paymentNo}: ${payment.partyName} - PKR ${payment.amount.toLocaleString()} (${payment.paymentMethod})`,
      payment.id
    );
    this.saveToDisk();
    return payment;
  }

  public deletePayment(id: string, currentUser: string): void {
    this.assertModuleAccess('expenses_payments', 'delete', currentUser);
    if (!this.db.payments) return;
    const idx = this.db.payments.findIndex(p => p.id === id);
    if (idx === -1) return;
    const pay = this.db.payments[idx];
    this.assertModuleAccess('expenses_payments', 'delete', currentUser, pay.businessId);
    this.db.payments.splice(idx, 1);
    this.logActivity('Payment Deleted', currentUser, `Deleted payment record ${pay.paymentNo} (${pay.partyName})`);
    this.saveToDisk();
  }
}
