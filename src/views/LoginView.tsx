import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  LogIn,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Building2,
  X,
  Shield,
  Key,
} from 'lucide-react';
import { AppDatabase, UserAccount } from '../types';
import { StorageService } from '../services/storage';

interface LoginViewProps {
  db: AppDatabase;
  onLoginSuccess: (user: UserAccount) => void;
  onMasterAdminLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  db,
  onLoginSuccess,
  onMasterAdminLogin,
}) => {
  const storage = StorageService.getInstance();

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Sign In State ---
  const [identifier, setIdentifier] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [secretInput, setSecretInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Master Admin Portal Modal State ---
  const [isMasterAdminModalOpen, setIsMasterAdminModalOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('TanzeelSt');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // --- Handle Regular Business Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your Email or Username (ای میل یا یوزر نام درج کریں).');
      return;
    }
    if (!secretInput) {
      setError('Please enter your Password or Security PIN (پاسورڈ یا پن درج کریں).');
      return;
    }

    setIsLoading(true);

    try {
      const authResult = storage.authenticateOffline(
        cleanIdentifier,
        secretInput,
        loginMethod
      );

      setIsLoading(false);

      if (authResult.success && authResult.user) {
        // Enforce account status check
        if (authResult.user.isBlocked || authResult.user.accountStatus === 'disabled' || authResult.user.accountStatus === 'suspended') {
          setError('This account is locked or inactive. Please contact the Master Administrator.');
          return;
        }

        // Check business account status
        const allBiz = storage.getAllBusinesses();
        const biz = allBiz.find(b => b.id === authResult.user?.businessId);
        if (biz && (biz.accountStatus === 'suspended' || biz.accountStatus === 'expired')) {
          setError(`Business account "${biz.businessName}" is locked. Please contact the Master Administrator.`);
          return;
        }

        // Switch workspace to matched business if needed
        if (authResult.user.businessId && authResult.user.businessId !== storage.getActiveBusinessId()) {
          storage.switchBusinessWorkspace(authResult.user.businessId, authResult.user.name);
        }

        onLoginSuccess(authResult.user);
      } else {
        setError(authResult.error || 'Invalid credentials. Please verify your username and password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Login failed. Please check your credentials.');
    }
  };

  // --- Handle Master Admin Portal Login ---
  const handleMasterAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setIsAdminLoading(true);

    try {
      const result = storage.verifyMasterAdmin(adminUsername, adminPassword);
      setIsAdminLoading(false);

      if (result.success) {
        setIsMasterAdminModalOpen(false);
        setAdminPassword('');
        onMasterAdminLogin();
      } else {
        setAdminError(result.error || 'Invalid administrator username or password.');
      }
    } catch (err: any) {
      setIsAdminLoading(false);
      setAdminError(err?.message || 'Administrator authorization failed.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 overflow-hidden font-sans select-none">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10">
        {/* Top Header */}
        <div className="pt-8 pb-4 px-6 text-center border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            ST Production & Stock Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your business operations & inventory
          </p>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleLoginSubmit} className="p-6 sm:p-7 space-y-4">
          {/* Email or Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Username or Email (یوزر نام یا ای میل)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center pointer-events-none">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={e => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="Enter username or email..."
                autoFocus
                required
                className="w-full pl-12 pr-4 py-2.5 bg-slate-950/80 border border-white/15 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>

          {/* Auth Method Toggle: Password vs PIN */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setSecretInput('');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password (پاسورڈ)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('pin');
                setSecretInput('');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                loginMethod === 'pin'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security PIN (پن)</span>
            </button>
          </div>

          {/* Password or PIN Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {loginMethod === 'pin' ? 'Security PIN Code (پن کوڈ)' : 'Account Password (پاسورڈ)'}
            </label>
            <div className="relative flex items-center">
              <div
                className={`absolute left-3 w-7 h-7 rounded-lg border flex items-center justify-center pointer-events-none ${
                  loginMethod === 'pin'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                }`}
              >
                {loginMethod === 'pin' ? (
                  <KeyRound className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
              </div>
              <input
                type="password"
                value={secretInput}
                onChange={e => {
                  setSecretInput(e.target.value);
                  setError(null);
                }}
                placeholder={loginMethod === 'pin' ? 'Enter PIN code' : 'Enter password'}
                required
                className="w-full pl-12 pr-4 py-2.5 bg-slate-950/80 border border-white/15 rounded-2xl text-center text-base tracking-widest font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 active:scale-[0.98] transition-all text-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In (لاگ ان کریں)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer: Discreet Master Administrator Portal Link */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">
            ST Enterprise v1.0.2
          </span>
          <button
            type="button"
            onClick={() => {
              setAdminError(null);
              setIsMasterAdminModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs font-semibold"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Master Admin Portal</span>
          </button>
        </div>
      </div>

      {/* ================= MASTER ADMINISTRATOR LOGIN MODAL ================= */}
      {isMasterAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Master Administrator Portal
                  </h2>
                  <p className="text-xs text-slate-400">
                    Dedicated central administration authentication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMasterAdminModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <p className="font-semibold">Confidential Management Access</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Manage businesses, user accounts, module permissions, and global workspaces.
              </p>
            </div>

            {/* Admin Form */}
            <form onSubmit={handleMasterAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center pointer-events-none">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    placeholder="Enter admin username (e.g. TanzeelSt)"
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center pointer-events-none">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password (e.g. Tanzeel56)"
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMasterAdminModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdminLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                >
                  {isAdminLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Authenticate & Enter Admin Panel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
