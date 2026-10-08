import { BusinessMode, BusinessType, ModuleKey } from '../types';

export interface BusinessModeConfig {
  mode: BusinessMode;
  label: string;
  shortLabel: string;
  labelEn: string;
  labelUr: string;
  description: string;
  subtitle: string;
  appTitle: string;
  posTitle: string;
  purchasesTitle: string;
  allowedModules: ModuleKey[];
  supportsProduction: boolean;
  supportsBagSizes: boolean;
  supportsBarcodes: boolean;
  supportsBrands: boolean;
  supportsServices: boolean;
  defaultCategories: string[];
  defaultUnits: Array<{ name: string; shortName: string }>;
  defaultBrands: string[];
  moduleLabels: Partial<Record<ModuleKey, string>>;
}

/**
 * Normalizes any stored BusinessType value into one of the four core BusinessModes:
 * Factory, Mill, Mart POS / Shopping Mart, or Small Business.
 */
export function normalizeBusinessMode(businessType?: BusinessType | null): BusinessMode {
  if (!businessType) return 'factory';
  const normalized = String(businessType).trim().toLowerCase();
  if (normalized === 'shopping_mart' || normalized === 'mart' || normalized === 'supermarket' || normalized === 'retail') {
    return 'shopping_mart';
  }
  if (
    normalized === 'small_business' ||
    normalized === 'shop' ||
    normalized === 'general_business' ||
    normalized === 'service_business'
  ) {
    return 'small_business';
  }
  if (normalized === 'mill' || normalized === 'flour_mill') {
    return 'mill';
  }
  return 'factory';
}

export const STANDARD_PRODUCT_UNITS: Array<{ name: string; shortName: string }> = [
  { name: 'Piece', shortName: 'Piece' },
  { name: 'Bottle', shortName: 'Bottle' },
  { name: 'Pack', shortName: 'Pack' },
  { name: 'Box', shortName: 'Box' },
  { name: 'Carton', shortName: 'Carton' },
  { name: 'Packet', shortName: 'Packet' },
  { name: 'Dozen', shortName: 'Dozen' },
  { name: 'Pair', shortName: 'Pair' },
  { name: 'Set', shortName: 'Set' },
  { name: 'Kg', shortName: 'Kg' },
  { name: 'Gram', shortName: 'Gram' },
  { name: 'Liter', shortName: 'Liter' },
  { name: 'Meter', shortName: 'Meter' },
  { name: 'Tray', shortName: 'Tray' },
  { name: 'Bundle', shortName: 'Bundle' },
  { name: 'Roll', shortName: 'Roll' },
  { name: 'Sack', shortName: 'Sack' },
  { name: 'Jar', shortName: 'Jar' },
  { name: 'Tube', shortName: 'Tube' },
  { name: 'Case', shortName: 'Case' },
];

export const BUSINESS_MODE_CONFIGS: Record<BusinessMode, BusinessModeConfig> = {
  factory: {
    mode: 'factory',
    label: 'Factory Workspace',
    shortLabel: 'Factory',
    labelEn: 'Factory Workspace',
    labelUr: 'فیکٹری ورک اسپیس',
    description: 'Industrial manufacturing, production shifts, formulas, batch stock, sales dispatches & factory purchases',
    subtitle: 'Industrial manufacturing, production shifts, formulas, batch stock, sales dispatches & factory purchases',
    appTitle: 'ST Factory Production and Stock Manager',
    posTitle: 'Sales & Dispatches',
    purchasesTitle: 'Factory Purchases',
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
    supportsProduction: true,
    supportsBagSizes: true,
    supportsBarcodes: false,
    supportsBrands: false,
    supportsServices: false,
    defaultCategories: ['Raw Material', 'Manufactured Goods', 'Packaging', 'Processed Items', 'WIP'],
    defaultUnits: [
      { name: 'Bag', shortName: 'Bag' },
      { name: 'Kilogram', shortName: 'KG' },
      { name: 'Metric Ton', shortName: 'Ton' },
    ],
    defaultBrands: ['Factory Standard'],
    moduleLabels: {
      dashboard: 'Factory Dashboard',
      production: 'Production Entry',
      products_catalog: 'Factory Products Catalog',
      stock: 'Stock & Inventory',
      mill_purchases: 'Factory Purchases',
      sales: 'Sales & Dispatches',
      customers_suppliers: 'Customers & Suppliers',
      expenses_payments: 'Expenses & Payments',
      returns: 'Returns',
      waste_recycle: 'Waste & Scrap',
      history: 'Production & Sales History',
      pdf_center: 'PDF Center',
      settings: 'Settings',
      admin: 'Admin Panel',
      about: 'About',
    },
  },

  mill: {
    mode: 'mill',
    label: 'Flour Mill Workspace',
    shortLabel: 'Mill',
    labelEn: 'Flour Mill Workspace',
    labelUr: 'فلور مل ورک اسپیس',
    description: 'Grain processing, flour production shifts, multi-bag-size stock, mill purchases, and grain dispatches',
    subtitle: 'Grain processing, flour production shifts, multi-bag-size stock, mill purchases, and grain dispatches',
    appTitle: 'ST Flour Mill Production and Stock Manager',
    posTitle: 'Mill Sales & Dispatches',
    purchasesTitle: 'Mill Purchases',
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
    supportsProduction: true,
    supportsBagSizes: true,
    supportsBarcodes: false,
    supportsBrands: false,
    supportsServices: false,
    defaultCategories: ['Atta / Flour', 'Maida', 'Whole Wheat', 'Suji', 'Bran', 'Raw Wheat / Grain'],
    defaultUnits: [
      { name: 'Bag', shortName: 'Bag' },
      { name: 'Kilogram', shortName: 'KG' },
      { name: 'Metric Ton', shortName: 'Ton' },
    ],
    defaultBrands: ['Mill Standard'],
    moduleLabels: {
      dashboard: 'Mill Dashboard',
      production: 'Production Entry',
      products_catalog: 'Mill Products Catalog',
      stock: 'Stock & Inventory',
      mill_purchases: 'Mill Purchases',
      sales: 'Sales & Dispatches',
      customers_suppliers: 'Customers & Suppliers',
      expenses_payments: 'Expenses & Payments',
      returns: 'Returns',
      waste_recycle: 'Waste & Recycle',
      history: 'Milling Shift & Sales History',
      pdf_center: 'PDF Center',
      settings: 'Settings',
      admin: 'Admin Panel',
      about: 'About',
    },
  },

  shopping_mart: {
    mode: 'shopping_mart',
    label: 'Shopping Mart / Mart POS',
    shortLabel: 'Shopping Mart',
    labelEn: 'Shopping Mart Workspace',
    labelUr: 'شاپنگ مارٹ / سپر مارکیٹ',
    description: 'Retail POS billing, barcode management, brands, categories, stock & profit reports',
    subtitle: 'Retail POS billing, barcode management, brands, categories, stock & profit reports',
    appTitle: 'ST Shopping Mart & POS Manager',
    posTitle: 'Mart POS & Billing',
    purchasesTitle: 'Mart Supplier Purchases',
    allowedModules: [
      'dashboard',
      'sales',
      'products_catalog',
      'stock',
      'mill_purchases',
      'customers_suppliers',
      'returns',
      'expenses_payments',
      'history',
      'pdf_center',
      'settings',
      'admin',
      'profile',
      'about',
    ],
    supportsProduction: false,
    supportsBagSizes: false,
    supportsBarcodes: true,
    supportsBrands: true,
    supportsServices: false,
    defaultCategories: [
      'Beverages & Drinks',
      'Cooking Oil & Ghee',
      'Grocery & Staples',
      'Snacks & Biscuits',
      'Dairy & Bakery',
      'Personal Care',
      'Household & Cleaning',
      'Frozen & Chilled',
    ],
    defaultUnits: [
      { name: 'Piece', shortName: 'Piece' },
      { name: 'Bottle', shortName: 'Bottle' },
      { name: 'Pack', shortName: 'Pack' },
      { name: 'Box', shortName: 'Box' },
      { name: 'Carton', shortName: 'Carton' },
      { name: 'Packet', shortName: 'Packet' },
      { name: 'Dozen', shortName: 'Dozen' },
      { name: 'Pair', shortName: 'Pair' },
      { name: 'Set', shortName: 'Set' },
      { name: 'Kg', shortName: 'Kg' },
      { name: 'Gram', shortName: 'Gram' },
      { name: 'Liter', shortName: 'Liter' },
      { name: 'Meter', shortName: 'Meter' },
    ],
    defaultBrands: [
      'Coca-Cola',
      'Pepsi',
      'Nestle',
      'Unilever',
      'Dalda',
      'Shan',
      'National',
      'Tapal',
      'LU Continental',
    ],
    moduleLabels: {
      dashboard: 'Mart Dashboard',
      sales: 'Mart POS / Sales',
      products_catalog: 'Products & Barcodes',
      stock: 'Stock & Adjustment',
      mill_purchases: 'Shopping Mart Purchases',
      customers_suppliers: 'Customers & Suppliers',
      returns: 'Returns',
      expenses_payments: 'Expenses & Costs',
      history: 'Sales & Purchase History',
      pdf_center: 'PDF Center',
      settings: 'Settings',
      admin: 'Admin Panel',
      about: 'About',
    },
  },

  small_business: {
    mode: 'small_business',
    label: 'Small Business Workspace',
    shortLabel: 'Small Business',
    labelEn: 'Small Business Workspace',
    labelUr: 'سمال بزنس / کاروبار',
    description: 'Products & services catalog, invoicing, purchases, expenses, receivables & profit tracking',
    subtitle: 'Products & services catalog, invoicing, purchases, expenses, receivables & profit tracking',
    appTitle: 'ST Small Business Manager',
    posTitle: 'Sales & Invoicing',
    purchasesTitle: 'Supplier Purchases & Stock In',
    allowedModules: [
      'dashboard',
      'sales',
      'products_catalog',
      'stock',
      'mill_purchases',
      'customers_suppliers',
      'returns',
      'expenses_payments',
      'history',
      'pdf_center',
      'settings',
      'admin',
      'profile',
      'about',
    ],
    supportsProduction: false,
    supportsBagSizes: false,
    supportsBarcodes: true,
    supportsBrands: true,
    supportsServices: true,
    defaultCategories: [
      'General Products',
      'Electronics & Accessories',
      'Services & Repairs',
      'Office Supplies',
      'Hardware & Tools',
      'Wholesale Items',
    ],
    defaultUnits: [
      { name: 'Piece', shortName: 'Piece' },
      { name: 'Bottle', shortName: 'Bottle' },
      { name: 'Pack', shortName: 'Pack' },
      { name: 'Box', shortName: 'Box' },
      { name: 'Carton', shortName: 'Carton' },
      { name: 'Packet', shortName: 'Packet' },
      { name: 'Dozen', shortName: 'Dozen' },
      { name: 'Pair', shortName: 'Pair' },
      { name: 'Set', shortName: 'Set' },
      { name: 'Kg', shortName: 'Kg' },
      { name: 'Gram', shortName: 'Gram' },
      { name: 'Liter', shortName: 'Liter' },
      { name: 'Meter', shortName: 'Meter' },
      { name: 'Service', shortName: 'Service' },
    ],
    defaultBrands: ['Generic', 'Standard', 'OEM', 'In-House Service'],
    moduleLabels: {
      dashboard: 'Business Dashboard',
      sales: 'Sales & Invoicing',
      products_catalog: 'Products & Services',
      stock: 'Stock & Adjustment',
      mill_purchases: 'Small Business Purchases',
      customers_suppliers: 'Customers & Suppliers',
      returns: 'Returns',
      expenses_payments: 'Expenses & Costs',
      history: 'Sales & Purchase History',
      pdf_center: 'PDF Center',
      settings: 'Settings',
      admin: 'Admin Panel',
      about: 'About',
    },
  },
};

export function getBusinessModeConfig(businessType?: BusinessType | null): BusinessModeConfig {
  const mode = normalizeBusinessMode(businessType);
  const base = BUSINESS_MODE_CONFIGS[mode];
  const raw = String(businessType || '').trim().toLowerCase();
  if (raw === 'factory') {
    return {
      ...base,
      label: 'Factory Workspace',
      shortLabel: 'Factory',
      labelEn: 'Factory Workspace',
      labelUr: 'فیکٹری ورک اسپیس',
      purchasesTitle: 'Factory Purchases',
      moduleLabels: {
        ...base.moduleLabels,
        mill_purchases: 'Factory Purchases',
      },
    };
  }
  if (raw === 'flour_mill' || raw === 'mill') {
    return {
      ...base,
      label: 'Mill Workspace',
      shortLabel: 'Mill',
      labelEn: 'Mill Workspace',
      labelUr: 'فلور مل ورک اسپیس',
      purchasesTitle: 'Mill Purchases',
      moduleLabels: {
        ...base.moduleLabels,
        mill_purchases: 'Mill Purchases',
      },
    };
  }
  return base;
}

export function isModuleAllowedForBusinessType(
  module: ModuleKey,
  businessType?: BusinessType | null
): boolean {
  const config = getBusinessModeConfig(businessType);
  return config.allowedModules.includes(module);
}
