import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, X } from 'lucide-react';
import { simpleHash } from '../services/storage';

interface LockScreenProps {
  title?: string;
  subtitle?: string;
  expectedPin: string;
  expectedPasswordHash: string;
  onSuccess: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  title = 'System Locked',
  subtitle = 'Enter your security PIN or Administrator Password to proceed.',
  expectedPin,
  expectedPasswordHash,
  onSuccess,
  onCancel,
  canCancel = false,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (usePasswordMode) {
      if (simpleHash(passwordInput) === expectedPasswordHash) {
        onSuccess();
      } else {
        setFailedAttempts(prev => prev + 1);
        setErrorMsg('Invalid password. Access denied.');
      }
    } else {
      if (pinInput === expectedPin) {
        onSuccess();
      } else {
        setFailedAttempts(prev => prev + 1);
        setErrorMsg('Invalid PIN code. Access denied.');
      }
    }
  };

  const handleNumClick = (digit: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length >= 4 && next === expectedPin) {
        onSuccess();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col items-center text-center relative">
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 ring-8 ring-blue-50/50 dark:ring-blue-950/20">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{subtitle}</p>

        {errorMsg && (
          <div className="w-full mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!usePasswordMode ? (
          <div className="w-full mt-5 space-y-4">
            {/* PIN Dots */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    idx < pinInput.length
                      ? 'bg-blue-600 scale-110'
                      : 'border-2 border-slate-300 dark:border-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* PIN Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') setPinInput('');
                    else if (btn === '⌫') setPinInput(pinInput.slice(0, -1));
                    else handleNumClick(btn);
                  }}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-base font-bold transition-all active:scale-95 flex items-center justify-center font-mono shadow-xs"
                >
                  {btn}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerify()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              Verify PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="w-full mt-5 space-y-3">
            <input
              type="password"
              placeholder="Enter administrator password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              Unlock with Password
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 w-full flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              setUsePasswordMode(!usePasswordMode);
              setErrorMsg('');
            }}
            className="hover:text-blue-600 font-medium"
          >
            {usePasswordMode ? 'Use Quick PIN' : 'Use Admin Password'}
          </button>
          {failedAttempts > 0 && (
            <span className="text-[11px] text-rose-500">Failed attempts: {failedAttempts}</span>
          )}
        </div>
      </div>
    </div>
  );
};
