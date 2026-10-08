import React, { useState, useEffect } from 'react';
import {
  ModuleKey,
  AppTheme,
  AppLanguage,
  AppDatabase,
  UserAccount,
} from './types';
import { StorageService } from './services/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WatermarkFooter } from './components/WatermarkFooter';
import { SetupWizard } from './components/SetupWizard';
import { LockScreen } from './components/LockScreen';
import { NotificationDrawer } from './components/NotificationDrawer';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ProductionView } from './views/ProductionView';
import { ProductsCatalogView } from './views/ProductsCatalogView';
import { StockView } from './views/StockView';
import { MillPurchasesView } from './views/MillPurchasesView';
import { SalesView } from './views/SalesView';
import { CustomersSuppliersView } from './views/CustomersSuppliersView';
import { ExpensesPaymentsView } from './views/ExpensesPaymentsView';
import { ReturnsView } from './views/ReturnsView';
import { WasteRecycleView } from './views/WasteRecycleView';
import { HistoryView } from './views/HistoryView';
import { PdfCenterView } from './views/PdfCenterView';
import { SettingsView } from './views/SettingsView';
import { AdminPanelView } from './views/AdminPanelView';
import { AboutView } from './views/AboutView';
import { UpdaterService } from './services/updater';
import { isModuleAllowedForBusinessType } from './services/businessMode';
import './services/firebase';

export default function App() {
  const storage = StorageService.getInstance();
  const [db, setDb] = useState<AppDatabase>(storage.getDatabase());

  const [currentModule, setCurrentModule] = useState<ModuleKey>('dashboard');
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('st_active_user_id'));
  });
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationDrawerTab, setNotificationDrawerTab] = useState<'notifications' | 'activity'>('notifications');

  // Module or action PIN gate
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);
  const [pendingModuleKey, setPendingModuleKey] = useState<ModuleKey | null>(null);

  // Close Application warning modal
  const [isClosePromptOpen, setIsClosePromptOpen] = useState(false);

  // Transfer item from Stock to Sales draft
  const [salesDraftItem, setSalesDraftItem] = useState<{ productId: string; bagSizeKg: number; bags: number } | null>(null);

  // Subscribe to storage mutations
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setDb({ ...storage.getDatabase() });
    });
    return () => unsubscribe();
  }, [storage]);

  // Automatic background update check on application startup
  useEffect(() => {
    const timer = setTimeout(() => {
      UpdaterService.getInstance()
        .checkForUpdates({ silent: true })
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Apply Theme & Direction
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-emerald', 'theme-cobalt', 'theme-flourpro', 'theme-ios-colorful');

    if (db.settings.theme === 'midnight-dark') {
      root.classList.add('dark');
    } else if (db.settings.theme === 'emerald-dark') {
      root.classList.add('dark', 'theme-emerald');
    } else if (db.settings.theme === 'cobalt-blue') {
      root.classList.add('theme-cobalt');
    } else if (db.settings.theme === 'flourpro-light') {
      root.classList.add('theme-flourpro');
    } else if (db.settings.theme === 'ios-colorful') {
      root.classList.add('theme-ios-colorful');
    }

    if (db.settings.language === 'ur') {
      root.setAttribute('dir', 'rtl');
    } else {
      root.setAttribute('dir', 'ltr');
    }
  }, [db.settings.theme, db.settings.language]);

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('st_active_user_id') || '';
  });

  const allSystemUsers = storage.getAllUsers();
  const currentUser: UserAccount | null = currentUserId
    ? allSystemUsers.find(u => u.id === currentUserId) ||
      db.users.find(u => u.id === currentUserId) ||
      null
    : null;
  const adminPin = currentUser ? currentUser.pinCode : '1234';
  const adminPasswordHash = currentUser ? currentUser.passwordHash : '';

  // Enforce dynamic business mode module isolation at route/navigation level
  useEffect(() => {
    if (!currentUser) return;
    const activeBiz = storage.getActiveBusiness();
    const targetBizType = currentUser.businessType || activeBiz?.businessType || db.profile?.businessType;
    if (!isModuleAllowedForBusinessType(currentModule, targetBizType)) {
      setCurrentModule('dashboard');
    }
  }, [currentUser?.businessType, db.profile?.businessType, currentModule]);

  const activateUserAndWorkspace = (targetUser: UserAccount) => {
    // Clear any temporary active session state so no previous business data remains in memory
    setSalesDraftItem(null);
    setPendingModuleKey(null);
    setPendingProtectedAction(null);

    if (targetUser.businessId && targetUser.businessId !== storage.getActiveBusinessId()) {
      storage.switchBusinessWorkspace(targetUser.businessId, targetUser.name);
    }

    setCurrentUserId(targetUser.id);
    localStorage.setItem('st_active_user_id', targetUser.id);
    setIsAuthenticated(true);
    setIsAppLocked(false);

    const updatedBiz = storage.getActiveBusiness();
    const targetBizType = targetUser.businessType || updatedBiz?.businessType || 'flour_mill';

    // Always land on an allowed module for the newly loaded business workspace
    if (
      !isModuleAllowedForBusinessType(currentModule, targetBizType) ||
      !storage.hasPermission(targetUser, currentModule)
    ) {
      setCurrentModule('dashboard');
    }
  };

  const handleLogout = () => {
    storage.logActivity(
      'User Logout',
      currentUser?.name || 'User',
      'Session securely logged out by user. Cleared active session state.'
    );
    // 1. Properly terminate authenticated session
    // 2. Clear all temporary user and session-specific state
    setSalesDraftItem(null);
    setPendingModuleKey(null);
    setPendingProtectedAction(null);
    setCurrentUserId('');
    localStorage.removeItem('st_active_user_id');
    // 3. Keep business and persistent storage intact
    // 4. Redirect user directly to Login page
    setAuthInitialTab('login');
    setIsAuthenticated(false);
    setCurrentModule('dashboard');
  };

  // Select Module with RBAC Permission Check & PIN Guard Check
  const handleSelectModule = (mod: ModuleKey) => {
    const activeBiz = storage.getActiveBusiness();
    const targetBizType = currentUser?.businessType || activeBiz?.businessType || db.profile?.businessType;
    if (!isModuleAllowedForBusinessType(mod, targetBizType)) {
      return;
    }

    if (currentUser && !storage.hasPermission(currentUser, mod)) {
      return;
    }

    if (db.settings.moduleProtection && db.settings.moduleProtection[mod]) {
      setPendingModuleKey(mod);
    } else {
      setCurrentModule(mod);
    }
  };

  const handleProtectedAction = (action: () => void) => {
    setPendingProtectedAction(() => action);
  };

  const handleTransferToSales = (productId: string, bagSizeKg: number, bags: number) => {
    setSalesDraftItem({ productId, bagSizeKg, bags });
    setCurrentModule('sales');
  };

  const handleCloseRequest = () => {
    setIsClosePromptOpen(true);
  };

  // If first launch and setup incomplete, display setup wizard
  if (!db.settings.isSetupComplete) {
    return (
      <SetupWizard
        onComplete={(admin, profile, products, bagSizes, drive) => {
          storage.completeSetup(admin, profile, products, bagSizes, drive);
          const newAdmin = storage.getDatabase().users[0];
          if (newAdmin) {
            activateUserAndWorkspace(newAdmin);
          }
        }}
      />
    );
  }

  // If unauthenticated or active user session is not found, strictly require login
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginView
        db={db}
        initialMode={authInitialTab}
        onLoginSuccess={user => {
          activateUserAndWorkspace(user);
          setCurrentModule('dashboard');
        }}
      />
    );
  }

  // If master system lock is active
  if (isAppLocked) {
    return (
      <LockScreen
        title="ST Production and Stock Manager"
        subtitle="Desktop application locked. Enter PIN or Admin Password to resume shift."
        expectedPin={adminPin}
        expectedPasswordHash={adminPasswordHash}
        onSuccess={() => setIsAppLocked(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Windows Desktop Header Bar */}
      <Header
        profile={db.profile}
        currentUser={currentUser}
        hasUnsyncedChanges={db.settings.hasUnsyncedChanges}
        googleDriveConnected={db.settings.googleDriveConnected}
        lastBackupTime={db.settings.googleDriveLastBackup}
        unreadNotificationsCount={db.notifications.filter(n => !n.isRead).length}
        onOpenNotifications={() => {
          setNotificationDrawerTab('notifications');
          setIsNotificationsOpen(true);
        }}
        onOpenActivityLog={() => {
          setNotificationDrawerTab('activity');
          setIsNotificationsOpen(true);
        }}
        onLockApp={() => setIsAppLocked(true)}
        onBackupNow={() => storage.performCloudBackup(currentUser ? currentUser.name : 'Admin')}
        onRequestClose={handleCloseRequest}
        onLogout={handleLogout}
        lang={db.settings.language}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={handleSelectModule}
          protectedModules={db.settings.moduleProtection || {}}
          currentUser={currentUser}
          storage={storage}
          theme={db.settings.theme}
          onThemeChange={theme =>
            storage.updateSettings({ theme }, currentUser ? currentUser.name : 'Admin')
          }
          language={db.settings.language}
          onLanguageChange={language =>
            storage.updateSettings({ language }, currentUser ? currentUser.name : 'Admin')
          }
          onLogout={handleLogout}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentModule === 'dashboard' && (
              <DashboardView
                db={db}
                onNavigate={handleSelectModule}
                language={db.settings.language}
              />
            )}

            {currentModule === 'production' &&
              isModuleAllowedForBusinessType('production', db.profile?.businessType) && (
                <ProductionView
                  db={db}
                  storage={storage}
                  currentUser={currentUser ? currentUser.name : 'Operator'}
                  language={db.settings.language}
                />
              )}

            {currentModule === 'products_catalog' &&
              isModuleAllowedForBusinessType('products_catalog', db.profile?.businessType) && (
                <ProductsCatalogView
                  db={db}
                  currentUser={currentUser || db.users[0]}
                  isDark={db.settings.theme === 'midnight-dark' || db.settings.theme === 'emerald-dark'}
                />
              )}

            {currentModule === 'stock' && (
              <StockView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                onNavigateToSalesWithDraft={handleTransferToSales}
                onNavigateToPdf={() => setCurrentModule('pdf_center')}
                language={db.settings.language}
              />
            )}

            {currentModule === 'mill_purchases' && (
              <MillPurchasesView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                language={db.settings.language}
              />
            )}

            {currentModule === 'sales' && (
              <SalesView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Clerk'}
                initialDraftItem={salesDraftItem}
                onClearDraft={() => setSalesDraftItem(null)}
                language={db.settings.language}
              />
            )}

            {currentModule === 'customers_suppliers' &&
              isModuleAllowedForBusinessType('customers_suppliers', db.profile?.businessType) && (
                <CustomersSuppliersView
                  db={db}
                  currentUser={currentUser || db.users[0]}
                  isDark={db.settings.theme === 'midnight-dark' || db.settings.theme === 'emerald-dark'}
                />
              )}

            {currentModule === 'expenses_payments' &&
              isModuleAllowedForBusinessType('expenses_payments', db.profile?.businessType) && (
                <ExpensesPaymentsView
                  db={db}
                  currentUser={currentUser || db.users[0]}
                  isDark={db.settings.theme === 'midnight-dark' || db.settings.theme === 'emerald-dark'}
                />
              )}

            {currentModule === 'returns' && (
              <ReturnsView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                language={db.settings.language}
              />
            )}

            {currentModule === 'waste_recycle' &&
              isModuleAllowedForBusinessType('waste_recycle', db.profile?.businessType) && (
                <WasteRecycleView
                  db={db}
                  storage={storage}
                  currentUser={currentUser ? currentUser.name : 'Admin'}
                  onRequestPinAuth={handleProtectedAction}
                  language={db.settings.language}
                />
              )}

            {currentModule === 'history' && (
              <HistoryView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                language={db.settings.language}
              />
            )}

            {currentModule === 'pdf_center' && (
              <PdfCenterView db={db} language={db.settings.language} />
            )}

            {currentModule === 'settings' && (
              <SettingsView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                onRequestPinAuth={handleProtectedAction}
                language={db.settings.language}
                onLanguageChange={lang =>
                  storage.updateSettings({ language: lang }, currentUser?.name || 'Admin')
                }
                theme={db.settings.theme}
                onThemeChange={th =>
                  storage.updateSettings({ theme: th }, currentUser?.name || 'Admin')
                }
              />
            )}

            {currentModule === 'admin' && (
              <AdminPanelView
                db={db}
                storage={storage}
                currentUser={currentUser ? currentUser.name : 'Admin'}
                onRequestPinAuth={handleProtectedAction}
                language={db.settings.language}
              />
            )}

            {currentModule === 'about' && (
              <AboutView db={db} language={db.settings.language} />
            )}
          </div>
        </main>
      </div>

      {/* Developer Watermark Status Bar (Section 22) */}
      <WatermarkFooter db={db} />

      {/* Notifications & Activity Log Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        defaultTab={notificationDrawerTab}
        notifications={db.notifications}
        activityLogs={db.activityLogs}
        onMarkAllNotificationsRead={() => storage.markAllNotificationsAsRead()}
      />

      {/* Module PIN Verification Gate */}
      {pendingModuleKey && (
        <LockScreen
          title="Protected Module"
          subtitle={`The "${pendingModuleKey}" section requires security PIN authorization.`}
          expectedPin={adminPin}
          expectedPasswordHash={adminPasswordHash}
          canCancel={true}
          onCancel={() => setPendingModuleKey(null)}
          onSuccess={() => {
            setCurrentModule(pendingModuleKey);
            setPendingModuleKey(null);
          }}
        />
      )}

      {/* Sensitive Action PIN Verification Gate */}
      {pendingProtectedAction && (
        <LockScreen
          title="Authorization Required"
          subtitle="Enter your security PIN or Admin password to confirm this action."
          expectedPin={adminPin}
          expectedPasswordHash={adminPasswordHash}
          canCancel={true}
          onCancel={() => setPendingProtectedAction(null)}
          onSuccess={() => {
            pendingProtectedAction();
            setPendingProtectedAction(null);
          }}
        />
      )}

      {/* Close Application Warning Dialog (Section 13.6 & 16.5) */}
      {isClosePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Application Close Verification
            </h3>
            {db.settings.hasUnsyncedChanges ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200">
                Backup Pending: Your latest transactions have not yet been confirmed in cloud storage.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                All records are saved safely in your persistent database ledger.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {db.settings.hasUnsyncedChanges && (
                <button
                  type="button"
                  onClick={() => {
                    storage.performCloudBackup(currentUser?.name || 'Admin');
                    setIsClosePromptOpen(false);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Synchronize Backup Now & Close
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsClosePromptOpen(false);
                }}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel & Resume Work
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
