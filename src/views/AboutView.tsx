import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Laptop,
  Database,
  Building2,
  Award,
  RefreshCw,
  Download,
  AlertCircle,
  Sparkles,
  Check,
  Clock,
  HardDriveDownload,
} from 'lucide-react';
import { AppDatabase, AppLanguage } from '../types';
import { translations } from '../services/translations';
import {
  UpdaterService,
  UpdateState,
  formatVersion,
} from '../services/updater';
import { StorageService } from '../services/storage';

interface AboutViewProps {
  db: AppDatabase;
  language: AppLanguage;
}

export const AboutView: React.FC<AboutViewProps> = ({ db, language }) => {
  const t = translations[language] || translations.en;
  const updater = UpdaterService.getInstance();
  const storage = StorageService.getInstance();

  const [updateState, setUpdateState] = useState<UpdateState>(updater.getState());
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = updater.subscribe(newState => {
      setUpdateState(newState);
    });
    return () => unsubscribe();
  }, [updater]);

  const handleCheckForUpdates = async () => {
    setStatusFeedback(null);
    const result = await updater.checkForUpdates({ silent: false });
    if (result.status === 'up-to-date' && !result.updateAvailable) {
      setStatusFeedback(
        `Your application is up to date (${formatVersion(result.currentVersion)}).`
      );
    }
  };

  const handleDownloadAndInstall = async () => {
    setStatusFeedback(null);
    // Guarantee local database and settings backup before downloading/installing update
    const dbSnapshot = storage.exportSerializedDatabase();
    storage.logActivity(
      'Software Update',
      'System Updater',
      `Initiated download & installation of update ${formatVersion(
        updateState.latestVersion
      )} (from ${formatVersion(updateState.currentVersion)}). Local database backed up safely.`
    );

    const res = await updater.downloadAndInstallUpdate(dbSnapshot, true);
    if (res.success && !window.desktopAPI?.installUpdate) {
      setStatusFeedback(
        `Update package (${
          updateState.assetName || `Setup-${updateState.latestVersion}.exe`
        }) downloaded. Run the installer to complete the update.`
      );
    }
  };

  const handleInstallNow = async () => {
    const dbSnapshot = storage.exportSerializedDatabase();
    await updater.installDownloadedUpdate(dbSnapshot);
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const isChecking = updateState.status === 'checking';
  const isDownloading = updateState.status === 'downloading';
  const isDownloaded = updateState.status === 'downloaded';
  const isInstalling = updateState.status === 'installing';
  const isBusy = isChecking || isDownloading || isInstalling;

  return (
    <div className="space-y-6 pb-12 select-none max-w-4xl mx-auto">
      {/* Top Hero Brand Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Windows Desktop Release</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ST Production and Stock Manager
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Industrial flour mill management, bag counting, production percentages, stock ledger, sales dispatch, and cloud synchronization.
            </p>
          </div>

          <div className="shrink-0 p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/15 text-center min-w-[160px]">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
              Software Version
            </span>
            <span className="text-xl font-bold font-mono text-white">
              {formatVersion(updateState.currentVersion)}
            </span>
            <span className="text-[10px] text-blue-300 block font-mono mt-0.5">
              {updateState.updateAvailable
                ? `Update Available: ${formatVersion(updateState.latestVersion)}`
                : 'Build v2026.10.02'}
            </span>
          </div>
        </div>
      </div>

      {/* Automatic Windows Application Update Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                updateState.updateAvailable
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
              }`}
            >
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Software Update & Version Control
              </h2>
              <p className="text-xs text-slate-500">
                Automatic Windows application update system — Safe in-place upgrade with 100% data preservation.
              </p>
            </div>
          </div>

          {updateState.lastCheckedAt && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Checked:{' '}
                {new Date(updateState.lastCheckedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Version & Update Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Version */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Current Version:
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {formatVersion(updateState.currentVersion)}
            </div>
            <span className="text-[11px] text-slate-400 block">
              Installed Release
            </span>
          </div>

          {/* Update Status */}
          <div
            className={`p-4 rounded-2xl border space-y-1 ${
              updateState.updateAvailable
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
                : updateState.status === 'error'
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70'
                : 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/60'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {updateState.updateAvailable ? 'Update Available:' : 'Update Status:'}
            </span>
            <div className="flex items-center gap-2">
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                    Checking...
                  </span>
                </>
              ) : isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                    Downloading ({updateState.progress.percent}%)
                  </span>
                </>
              ) : isInstalling ? (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    Installing & Restarting...
                  </span>
                </>
              ) : updateState.updateAvailable ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">
                    {formatVersion(updateState.latestVersion)}
                  </span>
                </>
              ) : updateState.status === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    Check Failed
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                    Up to Date
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {updateState.updateAvailable
                ? 'Newer Windows release available'
                : updateState.status === 'error'
                ? 'Connection required'
                : 'Running latest version'}
            </span>
          </div>

          {/* Available Update */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Available Update:
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {updateState.updateAvailable
                ? formatVersion(updateState.latestVersion)
                : 'None'}
            </div>
            <span className="text-[11px] text-slate-400 block">
              {updateState.updateAvailable
                ? updateState.assetSize > 0
                  ? `Installer (${formatBytes(updateState.assetSize)})`
                  : 'Windows Setup Package'
                : `Latest: ${formatVersion(updateState.currentVersion)}`}
            </span>
          </div>
        </div>

        {/* Download Progress Bar (Shown during download / ready to install) */}
        {(isDownloading || isDownloaded || isInstalling) && (
          <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span className="flex items-center gap-2">
                {isInstalling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Installing update and restarting application...</span>
                  </>
                ) : isDownloaded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      Update {formatVersion(updateState.latestVersion)} downloaded and verified!
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 animate-bounce text-blue-600" />
                    <span>
                      Downloading Windows Update {formatVersion(updateState.latestVersion)}...
                    </span>
                  </>
                )}
              </span>
              <span className="font-mono text-sm">
                {updateState.progress.percent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-blue-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, updateState.progress.percent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <span>
                {updateState.progress.totalBytes > 0
                  ? `${formatBytes(updateState.progress.transferredBytes)} / ${formatBytes(
                      updateState.progress.totalBytes
                    )}`
                  : updateState.assetName || 'Windows Setup Package (.exe)'}
              </span>
              {updateState.progress.bytesPerSecond > 0 && isDownloading && (
                <span>{formatBytes(updateState.progress.bytesPerSecond)}/s</span>
              )}
            </div>
          </div>
        )}

        {/* Release Notes (When an update is available) */}
        {updateState.updateAvailable && updateState.releaseNotes && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Release Notes ({formatVersion(updateState.latestVersion)})
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
              {updateState.releaseNotes}
            </p>
          </div>
        )}

        {/* Status / Feedback Messages */}
        {statusFeedback && !updateState.error && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {updateState.status === 'error' && updateState.error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{updateState.error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking for Updates...' : 'Check for Updates'}</span>
            </button>

            {updateState.updateAvailable && !isDownloaded && (
              <button
                type="button"
                onClick={handleDownloadAndInstall}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloading
                    ? `Downloading Update (${updateState.progress.percent}%)...`
                    : 'Download & Install Update'}
                </span>
              </button>
            )}

            {isDownloaded && window.desktopAPI?.installUpdate && (
              <button
                type="button"
                onClick={handleInstallNow}
                disabled={isInstalling}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Install Update & Restart Application</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Database, Stock, Invoices & Cloud Sync Preserved During Updates</span>
          </div>
        </div>
      </div>

      {/* Developer Branding & Service Advertisement (Section 22) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Software Engineering & Company Information
            </h2>
            <p className="text-xs text-slate-500">
              ST Software & Apps developers Company — Custom features, deployments, and industrial software.
            </p>
          </div>
        </div>

        {/* Developer Credit Box */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Developed & Maintained By
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              ST Software & Apps developers Company
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Enterprise Solutions & Industrial Automation Systems
              </span>
            </div>
          </div>
        </div>

        {/* Official Advertisement Statement */}
        <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 leading-relaxed space-y-2">
          <div className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
            Custom Business Software Services
          </div>
          <p className="text-sm font-medium">"{t.adServices}"</p>
          <div className="text-slate-600 dark:text-slate-400 pt-1 text-[11px]">
            Tailored solutions built for flour mills, oil mills, textile factories, wholesale grain dealers, distribution agencies, and inventory warehouses.
          </div>
        </div>
      </div>

      {/* System Architecture Specifications */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Architecture & Persistent Storage Guarantee
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Persistent Local DB</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Schema v{db.schemaVersion} with atomic transactions and referential integrity.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-indigo-600" />
              <span>Offline First</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Full functionality during network disconnection; local records stay safe.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Facility Profile</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Configured for {db.profile?.businessName || 'Industrial Mill'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
