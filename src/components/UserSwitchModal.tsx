import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  KeyRound,
  Lock,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  UserPlus,
  Building2,
} from 'lucide-react';
import { UserAccount, UserRole, BusinessProfile } from '../types';
import { simpleHash } from '../services/storage';
import { normalizeBusinessMode } from '../services/businessMode';

interface UserSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  businesses?: BusinessProfile[];
  currentUser: UserAccount | null;
  onSwitchSuccess: (user: UserAccount) => void;
  onOpenSignUp?: () => void;
}

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({
  isOpen,
  onClose,
  users,
  businesses = [],
  currentUser,
  onSwitchSuccess,
  onOpenSignUp,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [enteredPin, setEnteredPin] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const getBizForUser = (u: UserAccount) => {
    const biz = businesses.find(b => b.id === u.businessId);
    const mode = normalizeBusinessMode(u.businessType || biz?.businessType || 'flour_mill');
    const modeLabel =
      mode === 'shopping_mart'
        ? 'Mart POS'
        : mode === 'small_business'
        ? 'Small Business'
        : 'Factory / Mill';
    return {
      id: u.businessId || biz?.id || 'FACTORY_001',
      name: biz?.businessName || modeLabel,
      mode,
      modeLabel,
    };
  };

  const handleSelectUser = (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      setErrorMessage('You are already signed in as ' + user.name);
      return;
    }
    if (user.isBlocked || user.accountStatus === 'suspended') {
      setErrorMessage(`Account for "${user.name}" is locked/suspended. Contact system administrator.`);
      return;
    }
    setSelectedUser(user);
    setEnteredPin('');
    setEnteredPassword('');
    setErrorMessage(null);
  };

  const handleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMessage('Please select a registered user to switch to.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    setTimeout(() => {
      let isValid = false;

      if (authMethod === 'pin') {
        if (!enteredPin.trim()) {
          setErrorMessage('Please enter the security PIN code for ' + selectedUser.name);
          setIsVerifying(false);
          return;
        }
        isValid = enteredPin.trim() === selectedUser.pinCode;
      } else {
        if (!enteredPassword) {
          setErrorMessage('Please enter the account password for ' + selectedUser.name);
          setIsVerifying(false);
          return;
        }
        isValid =
          simpleHash(enteredPassword) === selectedUser.passwordHash ||
          enteredPassword === selectedUser.passwordHash;
      }

      if (isValid) {
        // Safe session switch
        onSwitchSuccess(selectedUser);
        onClose();
      } else {
        setErrorMessage(
          `Invalid ${authMethod === 'pin' ? 'PIN code' : 'password'} for user "${selectedUser.name}". Access denied.`
        );
      }
      setIsVerifying(false);
    }, 250);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Administrator
          </span>
        );
      case 'operator':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Plant Operator
          </span>
        );
      case 'viewer':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Audit Viewer
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Switch Business Account (اکاؤنٹ تبدیل کریں)
              </h2>
              <p className="text-xs text-slate-500">
                Authenticate with registered user credentials to open their bound business workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenSignUp && (
              <button
                type="button"
                onClick={onOpenSignUp}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up New Business</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Active Session Info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500">Current Active User:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-white font-mono">
              {currentUser?.name || 'Administrator'}
            </span>
            {currentUser && getRoleBadge(currentUser.role)}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registered Users List */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Registered Business Account to Switch To:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {users.map(u => {
                const isCurrent = u.id === currentUser?.id;
                const isSelected = selectedUser?.id === u.id;
                const bizInfo = getBizForUser(u);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : isCurrent
                        ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 opacity-80 cursor-default'
                        : u.isBlocked
                        ? 'border-slate-200 bg-slate-100/60 dark:bg-slate-800/40 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {u.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          bizInfo.mode === 'shopping_mart'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                            : bizInfo.mode === 'small_business'
                            ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {bizInfo.modeLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate mb-1">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{bizInfo.name}</span>
                      <span className="font-mono text-[9px] text-slate-400">({bizInfo.id})</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">@{u.username}</span>
                      {isCurrent ? (
                        <span className="text-emerald-600 font-semibold text-[10px]">Active</span>
                      ) : u.isBlocked ? (
                        <span className="text-rose-600 font-semibold text-[10px]">Blocked</span>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authentication Input for Selected User */}
          {selectedUser && (
            <form onSubmit={handleSwitchSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Authenticate as {selectedUser.name}</span>
                </span>

                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('pin');
                      setErrorMessage(null);
                    }}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      authMethod === 'pin'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    PIN Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setErrorMessage(null);
                    }}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      authMethod === 'password'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Password
                  </button>
                </div>
              </div>

              {authMethod === 'pin' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Enter Security PIN (4-6 digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    placeholder="••••"
                    value={enteredPin}
                    onChange={e => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-mono font-bold tracking-widest text-lg outline-none focus:border-indigo-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Enter Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      placeholder="Account password"
                      value={enteredPassword}
                      onChange={e => setEnteredPassword(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Change User
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isVerifying ? 'Verifying...' : `Confirm Switch to ${selectedUser.name}`}</span>
                </button>
              </div>
            </form>
          )}

          {/* Note if only 1 user */}
          {users.length === 1 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Single User System: </span>
              <span>Only 1 administrator account is currently registered. Additional plant operators or shift supervisors can be added in the Admin Panel.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Sessions are locked before transferring control.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
