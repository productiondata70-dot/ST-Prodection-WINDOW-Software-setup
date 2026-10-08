import React, { useState, useEffect } from 'react';
import {
  Bell,
  Cloud,
  CloudAlert,
  CloudCheck,
  Lock,
  Minus,
  Square,
  X,
  History,
  Shield,
  Building2,
  User,
  Users,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';
import { BusinessProfile, UserAccount } from '../types';
import { getBusinessModeConfig, normalizeBusinessMode } from '../services/businessMode';

interface HeaderProps {
  profile: BusinessProfile | null;
  currentUser: UserAccount | null;
  hasUnsyncedChanges: boolean;
  googleDriveConnected: boolean;
  lastBackupTime?: string;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenActivityLog: () => void;
  onLockApp: () => void;
  onBackupNow: () => void;
  onRequestClose: () => void;
  onSwitchUser?: () => void;
  onLogout?: () => void;
  lang: 'en' | 'ur' | 'hi';
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  currentUser,
  hasUnsyncedChanges,
  googleDriveConnected,
  lastBackupTime,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenActivityLog,
  onLockApp,
  onBackupNow,
  onRequestClose,
  onSwitchUser,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 select-none shrink-0 z-30 transition-colors">
      {/* Left: Window identity & Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            ST
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {getBusinessModeConfig(profile?.businessType).appTitle}
              </span>
              {profile && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate max-w-[180px]">{profile.businessName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      normalizeBusinessMode(profile.businessType) === 'shopping_mart'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : normalizeBusinessMode(profile.businessType) === 'small_business'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {getBusinessModeConfig(profile.businessType).labelEn}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Date & Time Clock */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-full border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-medium text-slate-600 dark:text-slate-400">{formattedDate}</span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400 tracking-wider">
          {formattedTime}
        </span>
      </div>

      {/* Right: Actions, Sync, User, Notifications, Window Controls */}
      <div className="flex items-center gap-2">
        {/* Cloud Sync Status Indicator */}
        <button
          onClick={onBackupNow}
          title={
            !googleDriveConnected
              ? 'Google Drive is Not Connected. Open Settings to connect your real Google account.'
              : hasUnsyncedChanges
              ? 'Backup Pending. Click to synchronize database to Google Drive.'
              : lastBackupTime
              ? `Google Drive Backup Synced. Last: ${new Date(lastBackupTime).toLocaleTimeString()}`
              : 'Google Drive Connected. Ready to back up.'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            !googleDriveConnected
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              : hasUnsyncedChanges
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 border border-emerald-300 dark:border-emerald-800'
          }`}
        >
          {!googleDriveConnected ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline">Drive Not Connected</span>
            </>
          ) : hasUnsyncedChanges ? (
            <>
              <CloudAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden xl:inline">Sync Pending</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            </>
          ) : (
            <>
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xl:inline">Drive Synced</span>
            </>
          )}
        </button>

        {/* Activity Log Icon */}
        <button
          onClick={onOpenActivityLog}
          title="Open Audit Trail & Activity Log"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenNotifications}
          title="Notifications"
          className="relative p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
          )}
        </button>

        {/* Current User Identity Badge (Read-only, no in-app user switching permitted) */}
        {currentUser && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
            title={`Active Session: ${currentUser.name} (${currentUser.role})`}
          >
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold">{currentUser.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">({currentUser.role})</span>
          </div>
        )}

        {/* Logout Action (Requirement 1: Sole account action visible inside authenticated interface) */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Logout from active session (لاگ آؤٹ)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}

        {/* Lock Application */}
        <button
          onClick={onLockApp}
          title="Lock Application (PIN required to unlock)"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Vertical divider */}
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>

        {/* Windows Desktop Window Controls */}
        <div className="flex items-center">
          <button
            title="Minimize"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => {}}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Maximize / Restore"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            title="Close Application"
            className="p-1.5 rounded hover:bg-rose-500 hover:text-white text-slate-500 transition-colors"
            onClick={onRequestClose}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
