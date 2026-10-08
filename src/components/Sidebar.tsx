import React from 'react';
import {
  LayoutDashboard,
  Factory,
  Boxes,
  ShoppingCart,
  RotateCcw,
  Trash2,
  History,
  FileText,
  Settings,
  ShieldAlert,
  Info,
  Lock,
  Globe,
  Palette,
  Truck,
  Package,
  Users,
  Wallet,
  Store,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { ModuleKey, AppTheme, AppLanguage, UserAccount, BusinessMode } from '../types';
import { StorageService } from '../services/storage';
import { translations } from '../services/translations';
import {
  getBusinessModeConfig,
  isModuleAllowedForBusinessType,
  normalizeBusinessMode,
} from '../services/businessMode';

interface SidebarProps {
  currentModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  protectedModules: Partial<Record<ModuleKey, boolean>>;
  currentUser?: UserAccount | null;
  storage?: StorageService;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  protectedModules,
  currentUser,
  storage,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  onLogout,
}) => {
  const t = translations[language] || translations.en;
  const activeBiz = storage?.getActiveBusiness();
  const businessType = activeBiz?.businessType || 'flour_mill';
  const mode = normalizeBusinessMode(businessType);
  const modeConfig = getBusinessModeConfig(businessType);

  const navItems: Array<{
    key: ModuleKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'dashboard',
      label: language === 'en' ? modeConfig.moduleLabels.dashboard || t.dashboard : t.dashboard,
      icon: LayoutDashboard,
    },
    {
      key: 'production',
      label: t.production,
      icon: Factory,
    },
    {
      key: 'sales',
      label: language === 'en' ? modeConfig.moduleLabels.sales || t.sales : t.sales,
      icon: ShoppingCart,
    },
    {
      key: 'products_catalog',
      label: modeConfig.moduleLabels.products_catalog || 'Products Catalog',
      icon: Package,
    },
    {
      key: 'stock',
      label: language === 'en' ? modeConfig.moduleLabels.stock || t.stock : t.stock,
      icon: Boxes,
    },
    {
      key: 'mill_purchases',
      label:
        language === 'en'
          ? modeConfig.moduleLabels.mill_purchases || (t as any).millPurchases || 'Purchases'
          : (t as any).millPurchases || 'Mill Purchases',
      icon: Truck,
    },
    {
      key: 'customers_suppliers',
      label: modeConfig.moduleLabels.customers_suppliers || 'Customers & Suppliers',
      icon: Users,
    },
    {
      key: 'expenses_payments',
      label: modeConfig.moduleLabels.expenses_payments || 'Expenses & Payments',
      icon: Wallet,
    },
    {
      key: 'returns',
      label: t.returns,
      icon: RotateCcw,
    },
    {
      key: 'waste_recycle',
      label: t.wasteRecycle,
      icon: Trash2,
    },
    {
      key: 'history',
      label: language === 'en' ? modeConfig.moduleLabels.history || t.history : t.history,
      icon: History,
    },
    {
      key: 'pdf_center',
      label: language === 'en' ? modeConfig.moduleLabels.pdf_center || t.pdfCenter : t.pdfCenter,
      icon: FileText,
    },
    {
      key: 'settings',
      label: t.settings,
      icon: Settings,
    },
    {
      key: 'admin',
      label: t.adminPanel,
      icon: ShieldAlert,
    },
    {
      key: 'about',
      label: t.about,
      icon: Info,
    },
  ];

  // RBAC + Business Mode Filter: Only show modules permitted for active Business Mode AND current user's role
  const visibleNavItems = navItems.filter(item => {
    if (!isModuleAllowedForBusinessType(item.key, businessType)) return false;
    if (!currentUser || !storage) return true;
    return storage.hasPermission(currentUser, item.key);
  });

  return (
    <aside className="w-64 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Top Bound Business Workspace Identity Card + Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto">
        {/* Bound Business Workspace Card */}
        <div className="mb-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  mode === 'shopping_mart'
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : mode === 'small_business'
                    ? 'bg-purple-500/15 text-purple-600'
                    : 'bg-blue-500/15 text-blue-600'
                }`}
              >
                {mode === 'shopping_mart' ? (
                  <Store className="w-4 h-4" />
                ) : mode === 'small_business' ? (
                  <Briefcase className="w-4 h-4" />
                ) : (
                  <Factory className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {modeConfig.labelEn}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    {activeBiz?.id || 'FACTORY_001'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {activeBiz?.businessName || modeConfig.labelEn}
                </div>
              </div>
            </div>
          </div>

          {onLogout && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={onLogout}
                title="Securely log out of active session"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout (لاگ آؤٹ)</span>
              </button>
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>

        {visibleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.key;
          const isProtected = protectedModules[item.key];

          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:scale-105'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isProtected && (
                <Lock
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Preferences Quick Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-white/40 dark:bg-slate-900/40">
        {/* Language selector */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Language</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'en' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('ur')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'ur' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              اردو
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'hi' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Theme quick toggle */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span>Theme</span>
          </div>
          <select
            value={theme}
            onChange={e => onThemeChange(e.target.value as AppTheme)}
            className="text-xs bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ios-light">iOS Light</option>
            <option value="ios-colorful">iOS Colorful (New)</option>
            <option value="flourpro-light">FlourPro Light</option>
            <option value="midnight-dark">Midnight Dark</option>
            <option value="emerald-dark">Emerald Dark</option>
            <option value="cobalt-blue">Cobalt Blue</option>
          </select>
        </div>
      </div>
    </aside>
  );
};
