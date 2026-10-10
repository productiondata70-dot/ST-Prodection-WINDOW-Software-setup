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
    colorClass: string;
    gradientBg: string;
  }> = [
    {
      key: 'dashboard',
      label: language === 'en' ? modeConfig.moduleLabels.dashboard || t.dashboard : t.dashboard,
      icon: LayoutDashboard,
      colorClass: 'text-blue-500',
      gradientBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600',
    },
    {
      key: 'production',
      label: t.production,
      icon: Factory,
      colorClass: 'text-emerald-500',
      gradientBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
    },
    {
      key: 'sales',
      label: language === 'en' ? modeConfig.moduleLabels.sales || t.sales : t.sales,
      icon: ShoppingCart,
      colorClass: 'text-violet-500',
      gradientBg: 'bg-gradient-to-tr from-violet-600 to-purple-600',
    },
    {
      key: 'products_catalog',
      label: modeConfig.moduleLabels.products_catalog || 'Products Catalog',
      icon: Package,
      colorClass: 'text-sky-500',
      gradientBg: 'bg-gradient-to-tr from-sky-500 to-blue-600',
    },
    {
      key: 'stock',
      label: language === 'en' ? modeConfig.moduleLabels.stock || t.stock : t.stock,
      icon: Boxes,
      colorClass: 'text-amber-500',
      gradientBg: 'bg-gradient-to-tr from-amber-500 to-orange-600',
    },
    {
      key: 'mill_purchases',
      label:
        language === 'en'
          ? modeConfig.moduleLabels.mill_purchases || (t as any).millPurchases || 'Purchases'
          : (t as any).millPurchases || 'Mill Purchases',
      icon: Truck,
      colorClass: 'text-indigo-500',
      gradientBg: 'bg-gradient-to-tr from-indigo-500 to-blue-600',
    },
    {
      key: 'customers_suppliers',
      label: modeConfig.moduleLabels.customers_suppliers || 'Customers & Suppliers',
      icon: Users,
      colorClass: 'text-pink-500',
      gradientBg: 'bg-gradient-to-tr from-pink-500 to-rose-600',
    },
    {
      key: 'expenses_payments',
      label: modeConfig.moduleLabels.expenses_payments || 'Expenses & Payments',
      icon: Wallet,
      colorClass: 'text-rose-500',
      gradientBg: 'bg-gradient-to-tr from-rose-500 to-red-600',
    },
    {
      key: 'returns',
      label: t.returns,
      icon: RotateCcw,
      colorClass: 'text-orange-500',
      gradientBg: 'bg-gradient-to-tr from-orange-500 to-amber-600',
    },
    {
      key: 'waste_recycle',
      label: t.wasteRecycle,
      icon: Trash2,
      colorClass: 'text-slate-500',
      gradientBg: 'bg-gradient-to-tr from-slate-600 to-slate-800',
    },
    {
      key: 'history',
      label: language === 'en' ? modeConfig.moduleLabels.history || t.history : t.history,
      icon: History,
      colorClass: 'text-cyan-500',
      gradientBg: 'bg-gradient-to-tr from-cyan-600 to-teal-600',
    },
    {
      key: 'pdf_center',
      label: language === 'en' ? modeConfig.moduleLabels.pdf_center || t.pdfCenter : t.pdfCenter,
      icon: FileText,
      colorClass: 'text-red-500',
      gradientBg: 'bg-gradient-to-tr from-red-500 to-pink-600',
    },
    {
      key: 'settings',
      label: t.settings,
      icon: Settings,
      colorClass: 'text-teal-500',
      gradientBg: 'bg-gradient-to-tr from-teal-500 to-emerald-600',
    },
    {
      key: 'admin',
      label: t.adminPanel,
      icon: ShieldAlert,
      colorClass: 'text-amber-600',
      gradientBg: 'bg-gradient-to-tr from-amber-600 to-red-600',
    },
    {
      key: 'about',
      label: t.about,
      icon: Info,
      colorClass: 'text-blue-500',
      gradientBg: 'bg-gradient-to-tr from-blue-500 to-cyan-500',
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
        </div>

        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>

        {visibleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.key;
          const isProtected = protectedModules[item.key];
          const isVivid = theme === 'vivid-pro';
          const isDeskeraPlum = theme === 'deskera-plum';
          const isDeskeraNavy = theme === 'deskera-navy';
          const isDeskeraEmerald = theme === 'deskera-emerald';
          const isDeskeraCrimson = theme === 'deskera-crimson';
          const isDeskeraSlate = theme === 'deskera-slate';
          const isDeskera = isDeskeraPlum || isDeskeraNavy || isDeskeraEmerald || isDeskeraCrimson || isDeskeraSlate;

          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? isDeskeraPlum
                    ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/25'
                    : isDeskeraNavy
                    ? 'bg-blue-600/35 text-white shadow-sm ring-1 ring-blue-400/30'
                    : isDeskeraEmerald
                    ? 'bg-emerald-600/35 text-white shadow-sm ring-1 ring-emerald-400/30'
                    : isDeskeraCrimson
                    ? 'bg-rose-600/35 text-white shadow-sm ring-1 ring-rose-400/30'
                    : isDeskeraSlate
                    ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                    : isVivid
                    ? `${item.gradientBg} text-white shadow-md shadow-blue-500/25`
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : isDeskera
                  ? 'text-white/75 hover:bg-white/10 hover:text-white'
                  : isVivid
                  ? 'text-slate-700 hover:bg-white hover:shadow-xs hover:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-2xs'
                      : isDeskera
                      ? 'bg-white/10 text-white shadow-2xs'
                      : isVivid
                      ? `${item.gradientBg} text-white shadow-2xs`
                      : `bg-slate-100 dark:bg-slate-800 ${item.colorClass}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {isProtected && (
                <Lock
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
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
            className="text-xs bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500 max-w-[130px] truncate"
          >
            <option value="deskera-plum">Deskera Plum (تصویر والی تھیم)</option>
            <option value="deskera-navy">Deskera Navy (نیوی بلیو)</option>
            <option value="deskera-emerald">Deskera Emerald (ایمرلڈ)</option>
            <option value="deskera-crimson">Deskera Crimson (برگنڈی)</option>
            <option value="deskera-slate">Deskera Onyx (سلیٹ گریفائٹ)</option>
            <option value="vivid-pro">Vivid Pro Colorful (فول کلر)</option>
            <option value="ios-colorful">iOS Colorful</option>
            <option value="ios-light">iOS Light</option>
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
