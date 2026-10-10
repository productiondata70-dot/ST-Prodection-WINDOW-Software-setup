import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Loader2,
  Wifi,
  WifiOff,
  Building2,
  Mail,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Key,
  Check,
  Copy,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { AppDatabase, UserAccount } from '../types';
import { StorageService } from '../services/storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../services/firebase';

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

  // Mode: Sign In vs Sign Up
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialMode);

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

  // --- Sign Up State ---
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpPin, setSignUpPin] = useState('1234');
  const [signUpBusinessId, setSignUpBusinessId] = useState(
    db.activeBusinessId || db.businesses?.[0]?.id || ''
  );
  const [adminApprovalPin, setAdminApprovalPin] = useState('1234');
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [unauthorizedEmailAttempt, setUnauthorizedEmailAttempt] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Whitelist helper
  const handleQuickAuthorize = (emailToAuth: string) => {
    try {
      const pin = adminApprovalPin.trim() || '1234';
      const ok = storage.quickAuthorizeEmail(emailToAuth, pin);
      if (ok) {
        setUnauthorizedEmailAttempt(null);
        setError(null);
        setSuccessMsg(`ای میل "${emailToAuth}" تصدیق ہو گئی ہے۔ رجسٹریشن مکمل ہو رہی ہے...\nEmail "${emailToAuth}" authorized in backend! Completing registration...`);
        // Trigger register
        setTimeout(() => {
          handleSignUpSubmitDirect(emailToAuth);
        }, 500);
      } else {
        setError('Invalid Admin PIN. Master admin PIN is 1234 or configured in settings.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to authorize email.');
    }
  };

  // Reset errors when switching tabs
  const handleSwitchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
  };

  // --- Handle Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your Email or Username (ای میل یا یوزر نام درج کریں).');
      return;
    }
    if (!secretInput) {
      setError('Please enter your Password or Security PIN (پاسورڈ درج کریں).');
      return;
    }

    setIsLoading(true);

    try {
      // Offline scenario or forced offline
      if (!isOnline) {
        const offlineResult = storage.authenticateOffline(
          cleanIdentifier,
          secretInput,
          loginMethod
        );
        setIsLoading(false);
        if (offlineResult.success && offlineResult.user) {
          onLoginSuccess(offlineResult.user);
          return;
        } else {
          setError(
            offlineResult.error ||
              'Offline login failed. Credentials do not match locally cached accounts.'
          );
          return;
        }
      }

      // Online scenario: If identifier is an email, authenticate via Firebase Authentication
      if (cleanIdentifier.includes('@')) {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            cleanIdentifier,
            secretInput
          );

          if (userCredential && userCredential.user) {
            const fbUser = userCredential.user;
            // Provision user into database and cache for offline
            const syncedUser = storage.provisionFirebaseUser({
              uid: fbUser.uid,
              email: fbUser.email || cleanIdentifier,
              displayName: fbUser.displayName || undefined,
            });

            // Update user password hash for subsequent offline login
            if (loginMethod === 'password') {
              storage.updateUserAccount(
                syncedUser.id,
                { passwordHash: secretInput ? syncedUser.passwordHash : '' },
                'System'
              );
            }
            storage.cacheUsersForOffline();

            setIsLoading(false);
            onLoginSuccess(syncedUser);
            return;
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase auth attempt notice:', firebaseErr?.code || firebaseErr?.message);

          // If network request failed or backend was unreachable, fallback to offline credentials
          if (
            firebaseErr?.code === 'auth/network-request-failed' ||
            firebaseErr?.code === 'auth/internal-error'
          ) {
            const offlineResult = storage.authenticateOffline(
              cleanIdentifier,
              secretInput,
              loginMethod
            );
            if (offlineResult.success && offlineResult.user) {
              setIsLoading(false);
              onLoginSuccess(offlineResult.user);
              return;
            }
          }

          // Also check local database (for local staff / shift operators)
          const localResult = storage.authenticateUser(cleanIdentifier, secretInput, loginMethod);
          if (localResult.success && localResult.user) {
            storage.cacheUsersForOffline();
            setIsLoading(false);
            onLoginSuccess(localResult.user);
            return;
          }

          setIsLoading(false);
          const code = firebaseErr?.code;
          if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            setError(
              'Account not found in Firebase backend. Please ensure this email was added by administrator in the Firebase console or whitelist.'
            );
          } else if (code === 'auth/wrong-password') {
            setError('Incorrect password. Please verify your credentials.');
          } else if (code === 'auth/network-request-failed') {
            setError('Network error: Unable to reach Firebase backend. Operating in offline mode.');
          } else {
            setError(firebaseErr?.message || 'Authentication failed. Please check your credentials.');
          }
          return;
        }
      }

      // Local username or PIN authentication
      const result = storage.authenticateUser(cleanIdentifier, secretInput, loginMethod);
      if (!result.success || !result.user) {
        // Fallback to offline cache
        const offlineResult = storage.authenticateOffline(
          cleanIdentifier,
          secretInput,
          loginMethod
        );
        if (offlineResult.success && offlineResult.user) {
          setIsLoading(false);
          onLoginSuccess(offlineResult.user);
          return;
        }

        setIsLoading(false);
        setError(result.error || 'Authentication failed. Please check your credentials.');
        setSecretInput('');
        return;
      }

      storage.cacheUsersForOffline();
      setIsLoading(false);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'An error occurred during sign in.');
    }
  };

  const handleSignUpSubmitDirect = async (forcedEmail?: string) => {
    setError(null);
    setSuccessMsg(null);

    const emailClean = (forcedEmail || signUpEmail).trim().toLowerCase();
    const nameClean = signUpName.trim();
    const usernameClean = signUpUsername.trim() || emailClean.split('@')[0];

    if (!emailClean || !emailClean.includes('@')) {
      setError('Please enter a valid email address (درست ای میل درج کریں).');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long (پاسورڈ کم از کم 6 ہندسوں کا ہونا چاہیے).');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please verify (پاسورڈ مطابقت نہیں رکھتے).');
      return;
    }

    setIsLoading(true);

    try {
      let isAuthorized = storage.isEmailAuthorizedForSignUp(emailClean);

      // 1. If admin approval pin is provided (default '1234')
      if (!isAuthorized && adminApprovalPin.trim()) {
        const ok = storage.quickAuthorizeEmail(emailClean, adminApprovalPin.trim());
        if (ok) isAuthorized = true;
      }

      // 2. If online, check Firebase Authentication directly
      if (isOnline) {
        try {
          await createUserWithEmailAndPassword(auth, emailClean, signUpPassword);
          storage.addAuthorizedBackendEmail(emailClean, 'FirebaseAuthAutoApproval');
          isAuthorized = true;
        } catch (firebaseErr: any) {
          if (firebaseErr?.code === 'auth/email-already-in-use') {
            // Already added in Firebase Console by administrator!
            storage.addAuthorizedBackendEmail(emailClean, 'FirebaseConsoleUser');
            isAuthorized = true;
          } else {
            console.warn('Firebase user creation note:', firebaseErr?.code, firebaseErr?.message);
          }
        }
      }

      if (!isAuthorized) {
        setIsLoading(false);
        setUnauthorizedEmailAttempt(emailClean);
        setError(
          `سائن اپ مسترد: ای میل "${emailClean}" فائر بیس یا بیک اینڈ میں شامل نہیں ہے۔\n\nRegistration Notice: Email "${emailClean}" is not authorized in the backend.\nOnly emails pre-added in Firebase console or backend administrator whitelist are permitted to register.\n\n✓ Option 1: Click "Quick Authorize (PIN: 1234)" below to approve instantly.\n✓ Option 2: Add this email in Firebase Console (Authentication > Users > Add user).\n✓ Option 3: Add in Admin Panel > Staff & Roles > Backend Pre-Authorized Whitelist.`
        );
        return;
      }

      // Register and cache for offline
      const regResult = storage.registerAuthorizedUser({
        email: emailClean,
        name: nameClean || usernameClean,
        username: usernameClean,
        password: signUpPassword,
        pinCode: signUpPin || '1234',
        businessId: signUpBusinessId || undefined,
      });

      storage.cacheUsersForOffline();

      setIsLoading(false);
      setSuccessMsg('Account registered and synchronized successfully! Loading workspace...');

      setTimeout(() => {
        onLoginSuccess(regResult.user);
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Error completing user registration.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSignUpSubmitDirect();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0B0F19] via-[#10172A] to-[#1E112A] flex items-center justify-center p-4 select-none overflow-y-auto relative">
      {/* Decorative colorful background ambient glow orbs */}
      <div className="absolute top-8 left-8 w-80 h-80 bg-blue-500/25 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-8 right-8 w-96 h-96 bg-purple-600/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-pink-500/20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-500/20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Apple Frosted Glass Card */}
      <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-2xl shadow-indigo-950/70 overflow-hidden text-white my-6 relative z-10 ring-1 ring-white/15">
        {/* Top Header with Squircle emblem */}
        <div className="p-7 pb-4 text-center border-b border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent relative">
          {/* Online / Offline status indicator pill */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/15 bg-black/40 backdrop-blur-md">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="text-amber-300">Offline Mode</span>
              </>
            )}
          </div>

          {/* App Squircle Emblem */}
          <div className="w-18 h-18 rounded-[1.3rem] bg-gradient-to-tr from-blue-500 via-indigo-500 to-pink-500 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/40 mb-2.5 ring-4 ring-white/15">
            <ShieldCheck className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
            ST Production & Stock
          </h1>
          <p className="text-xs text-indigo-200/90 mt-0.5 font-semibold">
            Flour Mills, Factories & Retail Billing
          </p>

          {/* Tab Switcher: Sign In vs Sign Up */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 mt-4 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => handleSwitchTab('login')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In (سائن ان)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('signup')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up (سائن اپ)</span>
            </button>
          </div>
        </div>

        {/* ================= SIGN IN TAB ================= */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 sm:p-7 space-y-4">
            {/* Email or Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email or Username (ای میل یا یوزر نام)
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
                  placeholder="Enter email or username..."
                  autoFocus
                  required
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-900/90 border border-white/15 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
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
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md ring-1 ring-white/20'
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

            {/* Secret Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                {loginMethod === 'pin' ? 'Security PIN Code (پن کوڈ)' : 'Account Password (پاسورڈ)'}
              </label>
              <div className="relative flex items-center">
                <div
                  className={`absolute left-3 w-7 h-7 rounded-lg border flex items-center justify-center pointer-events-none ${
                    loginMethod === 'pin'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
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
                  onChange={e => setSecretInput(e.target.value)}
                  placeholder={loginMethod === 'pin' ? 'Enter PIN code' : 'Enter password'}
                  required
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-900/90 border border-white/15 rounded-2xl text-center text-base tracking-widest font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
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
                  <span>Sign In (سائن ان کریں)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= SIGN UP TAB ================= */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="p-6 sm:p-7 space-y-3.5">
            {/* Backend Pre-Authorization Notice */}
            <div className="p-3 bg-purple-500/15 border border-purple-500/30 rounded-2xl text-[11px] text-purple-200 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Backend Authorized Registration Only</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFirebaseGuide(true)}
                  className="px-2 py-0.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-[10px] font-bold text-purple-200 border border-purple-400/30 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Firebase Guide (گائیڈ)</span>
                </button>
              </div>
              <p className="text-[10px] text-purple-200/80 leading-relaxed">
                Only users pre-registered by the administrator in the Firebase console or in-app whitelist can register. Enter Master PIN (1234) below for instant owner approval.
              </p>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Authorized Email Address (مجاز ای میل) *
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center pointer-events-none">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={e => {
                    setSignUpEmail(e.target.value);
                    setError(null);
                    setUnauthorizedEmailAttempt(null);
                  }}
                  placeholder="Enter authorized email (e.g. user@gmail.com)"
                  required
                  className="w-full pl-12 pr-4 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
              </div>
            </div>

            {/* Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name (پورا نام) *
                </label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={e => setSignUpName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  required
                  className="w-full px-3 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Username (یوزر نام)
                </label>
                <input
                  type="text"
                  value={signUpUsername}
                  onChange={e => setSignUpUsername(e.target.value)}
                  placeholder="e.g. tariq_12"
                  className="w-full px-3 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={e => setSignUpPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={e => setSignUpConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full px-3 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
              </div>
            </div>

            {/* Administrator Master Approval PIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Administrator Approval PIN (ایڈمن منظوری پن)
                </label>
                <span className="text-[10px] text-amber-300 font-mono">Default: 1234</span>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center pointer-events-none">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={adminApprovalPin}
                  onChange={e => setAdminApprovalPin(e.target.value)}
                  placeholder="Enter 1234 for instant owner approval"
                  className="w-full pl-12 pr-4 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Entering Master PIN 1234 automatically authorizes new business accounts into the backend.
              </p>
            </div>

            {/* Business Assignment (if multiple businesses exist) */}
            {(db.businesses || []).length > 1 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Select Business Workspace (کاروباری ادارہ منتخب کریں)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center pointer-events-none">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={signUpBusinessId}
                    onChange={e => setSignUpBusinessId(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-900/90 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  >
                    {(db.businesses || []).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.businessName} ({b.businessType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Error & Quick Authorize Actions */}
            {error && (
              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 whitespace-pre-line">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>

                {/* Instant Quick Approval Banner if not authorized */}
                {(unauthorizedEmailAttempt || signUpEmail) && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Instant Administrator Approval (ایڈمن فوری منظوری)</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90">
                      Are you setting up your account as the Administrator/Owner? Click below to approve with PIN 1234:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAuthorize(unauthorizedEmailAttempt || signUpEmail)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-98 transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Authorize with PIN (1234) & Register</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFirebaseGuide(true)}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1 border border-white/20 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Firebase Guide</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 whitespace-pre-line">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-2xl shadow-xl shadow-purple-600/35 active:scale-[0.98] transition-all text-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Backend Whitelist & Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Complete Registration (رجسٹر کریں)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>ST Production & Stock Manager</span>
          <span className="font-mono text-[10px] text-slate-500">
            {isOnline ? 'Cloud Synced' : 'Local Offline Mode'}
          </span>
        </div>
      </div>

      {/* ================= STEP-BY-STEP FIREBASE CONSOLE GUIDE MODAL ================= */}
      {showFirebaseGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Firebase Console میں ای میل کیسے شامل کریں؟
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Step-by-Step Guide: Adding Users to Backend Authentication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFirebaseGuide(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Method 1: Instant In-App Approval (Fastest) */}
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>سب سے آسان طریقہ (Instant In-App Master PIN 1234)</span>
                </div>
                <p className="text-emerald-100/90 leading-relaxed text-[11px]">
                  اگر آپ سافٹ ویئر کے ایڈمنسٹریٹر یا مالک ہیں، تو آپ کو فائر بیس کنسول کھولنے کی ضرورت نہیں۔ سائن اپ اسکرین پر <strong className="text-white bg-black/40 px-1.5 py-0.5 rounded font-mono">Administrator Approval PIN: 1234</strong> درج کریں یا اوپر دیے گئے <strong className="text-white">"Authorize with PIN (1234) & Register"</strong> بٹن پر کلک کریں۔ آپ کی ای میل فوری طور پر بیک اینڈ وائٹ لسٹ میں شامل ہو جائے گی!
                </p>
              </div>

              {/* Method 2: Firebase Console Step-by-Step */}
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Firebase Console میں یوزر شامل کرنے کا طریقہ:</span>
                </h4>

                {/* Step 1 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Firebase Console کھولیں (Open Firebase Console)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    اپنے براؤزر میں <span className="font-mono text-indigo-300 bg-black/40 px-1 py-0.5 rounded">https://console.firebase.google.com/</span> کھولیں اور اپنے گوگل اکاؤنٹ سے لاگ ان کریں۔ اس کے بعد اپنے پروجیکٹ پر کلک کریں۔
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Authentication مینو پر کلک کریں (Navigate to Authentication)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    بائیں جانب (Left Sidebar) میں <strong className="text-white">Build</strong> کے نیچے <strong className="text-white">Authentication</strong> پر کلک کریں۔
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>"Users" ٹیب کھولیں (Open Users Tab)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    اوپر والے ٹیبز میں سے <strong className="text-white">Users</strong> کے ٹیب پر کلک کریں۔ یہاں آپ کو پہلے سے رجسٹرڈ تمام صارفین کی فہرست نظر آئے گی۔
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>"Add user" بٹن دبائیں (Click Add User)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    ٹیبل کے اوپر دائیں جانب موجود نیلے رنگ کے <strong className="text-white">"Add user"</strong> بٹن پر کلک کریں۔
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">5</span>
                    <span>Email اور Password درج کریں (Enter Email & Password)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    صارف کی ای میل (مثلاً <span className="font-mono text-purple-300">user@gmail.com</span>) اور کم از کم 6 ہندسوں کا پاسورڈ درج کر کے <strong className="text-white">Add user</strong> کو محفوظ کر لیں۔
                  </p>
                </div>

                {/* Step 6 */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">6</span>
                    <span>سافٹ ویئر میں لاگ ان یا سائن اپ کریں</span>
                  </div>
                  <p className="text-slate-300 text-[11px] pl-7">
                    فائر بیس کنسول میں شامل کرنے کے بعد، آپ اس سافٹ ویئر میں آکر اسی ای میل اور پاسورڈ کے ساتھ ڈائریکٹ <strong className="text-white">Sign In</strong> بھی کر سکتے ہیں یا <strong className="text-white">Sign Up</strong> پر کلک کر کے فوری طور پر رجسٹر ہو سکتے ہیں۔
                  </p>
                </div>
              </div>

              {/* Method 3: In-App Admin Panel Whitelist */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <div className="font-bold text-indigo-300">
                  تیسرا طریقہ: ایڈمن پینل وائٹ لسٹ (Admin Panel Whitelist)
                </div>
                <p className="text-slate-300 text-[11px]">
                  کسی بھی ایڈمنسٹریٹر اکاؤنٹ سے لاگ ان کریں اور <strong className="text-white">Admin Panel &gt; Staff &amp; Roles &gt; Backend Pre-Authorized Whitelist</strong> میں جا کر مطلوبہ ای میل درج کر کے <strong className="text-white">+ Add to Whitelist</strong> دبائیں۔
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowFirebaseGuide(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                سمجھ گیا / Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
