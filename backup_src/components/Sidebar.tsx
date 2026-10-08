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
} from 'lucide-react';
import { ModuleKey, AppTheme, AppLanguage } from '../types';
import { translations } from '../services/translations';

interface SidebarProps {
  currentModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  protectedModules: Partial<Record<ModuleKey, boolean>>;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  protectedModules,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
}) => {
  const t = translations[language] || translations.en;

  const navItems: Array<{ key: ModuleKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { key: 'production', label: t.production, icon: Factory },
    { key: 'stock', label: t.stock, icon: Boxes },
    { key: 'sales', label: t.sales, icon: ShoppingCart },
    { key: 'returns', label: t.returns, icon: RotateCcw },
    { key: 'waste_recycle', label: t.wasteRecycle, icon: Trash2 },
    { key: 'history', label: t.history, icon: History },
    { key: 'pdf_center', label: t.pdfCenter, icon: FileText },
    { key: 'settings', label: t.settings, icon: Settings },
    { key: 'admin', label: t.adminPanel, icon: ShieldAlert },
    { key: 'about', label: t.about, icon: Info },
  ];

  return (
    <aside className="w-64 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.key;
          const isProtected = protectedModules[item.key];

          return (
            <button
              key={item.key}
              onClick={() => onSelectModule(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
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
            <option value="midnight-dark">Midnight Dark</option>
            <option value="emerald-dark">Emerald Dark</option>
            <option value="cobalt-blue">Cobalt Blue</option>
          </select>
        </div>
      </div>
    </aside>
  );
};
