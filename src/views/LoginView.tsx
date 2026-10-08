import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Factory,
  ShoppingCart,
  Store,
  Mail,
  Building2,
  UserPlus,
  LogIn,
  Phone,
  MapPin,
} from 'lucide-react';
import { AppDatabase, UserAccount, BusinessMode } from '../types';
import { StorageService } from '../services/storage';
import { normalizeBusinessMode, getBusinessModeConfig } from '../services/businessMode';

interface LoginViewProps {
  db: AppDatabase;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  db,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const storage = StorageService.getInstance();
  const registeredAccounts = useMemo(() => storage.getAllRegisteredUsers(), [db]);

  const [viewMode, setViewMode] = useState<'login' | 'signup'>(initialMode);

  // Sign-In State
  const [identifier, setIdentifier] = useState<string>(
    registeredAccounts[0]?.user.email || registeredAccounts[0]?.user.username || ''
  );
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [secretInput, setSecretInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign-Up State
  const [signupName, setSignupName] = useState('');
  const [signupBusinessName, setSignupBusinessName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupPin, setSignupPin] = useState('1234');
  const [signupBusinessType, setSignupBusinessType] = useState<BusinessMode | ''>('');

  // Identify preview info for the typed email/username on login (read-only indicator)
  const matchedAccountPreview = useMemo(() => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;
    return (
      registeredAccounts.find(
        entry =>
          (entry.user.email && entry.user.email.toLowerCase() === clean) ||
          entry.user.username.toLowerCase() === clean ||
          entry.user.name.toLowerCase() === clean
      ) || null
    );
  }, [identifier, registeredAccounts]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      const result = storage.authenticateUser(identifier, secretInput, loginMethod);
      if (!result.success || !result.user) {
        setError(result.error || 'Authentication failed. Please check your credentials.');
        setSecretInput('');
        return;
      }
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!signupName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!signupBusinessName.trim()) {
      setError('Please enter your Business / Mill / Store Name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid Email Address.');
      return;
    }
    if (!signupBusinessType) {
      setError(
        'Please select a Business Type (Factory/Mill, Mart POS / Shopping Mart, or Small Business).'
      );
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    try {
      const { user } = storage.registerBusinessAccount({
        ownerName: signupName.trim(),
        businessName: signupBusinessName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        pinCode: signupPin.trim() || '1234',
        phone: signupPhone.trim(),
        address: signupAddress.trim(),
        businessType: signupBusinessType,
      });

      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to create business account.');
    }
  };

  const getBusinessTypeBadge = (bizType?: string) => {
    const mode = normalizeBusinessMode(bizType);
    if (mode === 'shopping_mart') {
      return {
        label: 'Mart POS / Shopping Mart',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        Icon: ShoppingCart,
      };
    }
    if (mode === 'small_business') {
      return {
        label: 'Small Business',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        Icon: Store,
      };
    }
    return {
      label: 'Factory / Mill',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      Icon: Factory,
    };
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 select-none overflow-y-auto">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-white my-6">
        {/* Top Header */}
        <div className="p-6 pb-5 text-center border-b border-white/10 bg-white/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {viewMode === 'login'
              ? 'Business Account Sign In'
              : 'Create Isolated Business Account'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {viewMode === 'login'
              ? 'Sign in with your registered account — your Business Workspace loads automatically'
              : 'Select your Business Type to provision an isolated workspace, catalog & database'}
          </p>

          {/* Mode Toggle Tabs: Sign In vs Sign Up */}
          {(!db.settings.hideSignUpWhenDisabled || db.settings.allowSignUp !== false) && (
            <div className={`grid ${db.settings.allowSignUp === false ? 'grid-cols-1' : 'grid-cols-2'} gap-2 p-1 bg-slate-900/70 rounded-xl border border-white/10 mt-4 max-w-sm mx-auto`}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'login'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              {db.settings.allowSignUp !== false && (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signup');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'signup'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up (Create Account)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* SIGN IN VIEW */}
        {viewMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {/* Quick Registered Business Accounts Selector */}
            {registeredAccounts.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Registered Business Accounts on This Device
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                  {registeredAccounts.map(({ user, business }) => {
                    const badge = getBusinessTypeBadge(
                      business?.businessType || user.businessType
                    );
                    const BadgeIcon = badge.Icon;
                    const isSelected =
                      (user.email &&
                        identifier.trim().toLowerCase() === user.email.toLowerCase()) ||
                      identifier.trim().toLowerCase() === user.username.toLowerCase();

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setIdentifier(user.email || user.username);
                          setError(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/25 border-blue-400 text-white shadow-sm'
                            : 'bg-slate-900/50 border-white/10 text-slate-300 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <span>{business?.businessName || user.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({business?.id || user.businessId || 'FACTORY_001'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            User: <strong className="text-slate-200">{user.name}</strong> (
                            {user.email || `@${user.username}`}) · Role: {user.role.toUpperCase()}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Email or Username Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email or username..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {matchedAccountPreview && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                  <span>
                    Bound Workspace:{' '}
                    <strong>
                      {matchedAccountPreview.business?.businessName || 'Assigned Business'}
                    </strong>{' '}
                    ({matchedAccountPreview.business?.id || matchedAccountPreview.user.businessId})
                  </span>
                  <span className="font-bold uppercase">
                    {
                      getBusinessModeConfig(
                        matchedAccountPreview.business?.businessType ||
                          matchedAccountPreview.user.businessType
                      ).shortLabel
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Auth Method Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/60 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setSecretInput('');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  loginMethod === 'password'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('pin');
                  setSecretInput('');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  loginMethod === 'pin'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Security PIN</span>
              </button>
            </div>

            {/* Secret Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                {loginMethod === 'pin' ? 'Enter Security PIN' : 'Enter Account Password'}
              </label>
              <input
                type="password"
                value={secretInput}
                onChange={e => setSecretInput(e.target.value)}
                placeholder={loginMethod === 'pin' ? '••••' : 'Enter password...'}
                autoFocus
                required
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/15 rounded-xl text-center text-lg tracking-widest font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer"
            >
              Sign In to Business Workspace
            </button>

            <div className="text-center pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setViewMode('signup');
                  setError(null);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer"
              >
                Need a new Factory/Mill, Mart POS, or Small Business account? Sign Up →
              </button>
            </div>
          </form>
        ) : (
          /* SIGN UP VIEW */
          <form onSubmit={handleSignUpSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Name (Full Name) *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="e.g. Muhammad Tariq"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Business / Mill / Store Name *
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={signupBusinessName}
                    onChange={e => setSignupBusinessName(e.target.value)}
                    placeholder="e.g. Al-Barakah Mart / Noor Flour Mills"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="owner@business.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={signupPhone}
                    onChange={e => setSignupPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Business Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={signupAddress}
                  onChange={e => setSignupAddress(e.target.value)}
                  placeholder="Main Commercial Market, Lahore"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* REQUIREMENT 3: 4 SUPPORTED MODES (FACTORY, MILL, MART POS, SMALL BUSINESS) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
                Business Mode (Permanently Bound to Account) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    mode: 'factory' as BusinessMode,
                    title: 'Factory',
                    subtitle: 'Industrial production, shift batches, bill of materials, dispatches & factory purchases',
                    Icon: Factory,
                    activeBorder: 'border-blue-400 bg-blue-600/25',
                  },
                  {
                    mode: 'mill' as BusinessMode,
                    title: 'Flour Mill',
                    subtitle: 'Grain milling shifts, multi-bag sizes, grain purchases, mill ledger & dispatches',
                    Icon: Building2,
                    activeBorder: 'border-sky-400 bg-sky-600/25',
                  },
                  {
                    mode: 'shopping_mart' as BusinessMode,
                    title: 'Mart POS / Shopping Mart',
                    subtitle: 'Barcode scanner POS billing, 58/80mm thermal receipts, retail catalog & brands',
                    Icon: ShoppingCart,
                    activeBorder: 'border-emerald-400 bg-emerald-600/25',
                  },
                  {
                    mode: 'small_business' as BusinessMode,
                    title: 'Small Business',
                    subtitle: 'Products & services, client invoicing, receivables, cash expenses & profit tracking',
                    Icon: Store,
                    activeBorder: 'border-amber-400 bg-amber-600/25',
                  },
                ]
                  .filter(option => {
                    const allowed = db.settings.allowedSignUpBusinessModes || [
                      'factory',
                      'mill',
                      'shopping_mart',
                      'small_business',
                    ];
                    return allowed.includes(option.mode);
                  })
                  .map(option => {
                    const Icon = option.Icon;
                    const isSelected = signupBusinessType === option.mode;
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => {
                          setSignupBusinessType(option.mode);
                          setError(null);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? `${option.activeBorder} ring-2 ring-white/30 shadow-lg`
                            : 'bg-slate-900/60 border-white/10 hover:bg-slate-900/90 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-white bg-white text-slate-900' : 'border-slate-500'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900" />}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-white">{option.title}</div>
                          <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                            {option.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="Min 4 chars"
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={signupConfirmPassword}
                  onChange={e => setSignupConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Quick Lock PIN
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={signupPin}
                  onChange={e => setSignupPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-sm cursor-pointer"
            >
              Create Account
            </button>

            <div className="text-center pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                }}
                className="text-xs text-slate-300 hover:text-white font-semibold hover:underline cursor-pointer"
              >
                Already have an account? Sign In →
              </button>
            </div>
          </form>
        )}

        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-white/10 text-center text-[11px] text-slate-400">
          Developed by <strong>Sulaimanoothad58-collab</strong> · ST Software & Apps developers Company
        </div>
      </div>
    </div>
  );
};
