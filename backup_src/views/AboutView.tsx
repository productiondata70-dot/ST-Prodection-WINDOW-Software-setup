import React from 'react';
import {
  Info,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Database,
  Building2,
  Award,
} from 'lucide-react';
import { AppDatabase, AppLanguage } from '../types';
import { translations } from '../services/translations';

interface AboutViewProps {
  db: AppDatabase;
  language: AppLanguage;
}

export const AboutView: React.FC<AboutViewProps> = ({ db, language }) => {
  const t = translations[language] || translations.en;

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
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block">Software Version</span>
            <span className="text-xl font-bold font-mono text-white">1.0.0</span>
            <span className="text-[10px] text-blue-300 block font-mono mt-0.5">Build v2026.10.02</span>
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
              Developer Credit & Direct Engineering Support
            </h2>
            <p className="text-xs text-slate-500">Contact Tanzeel for custom features, deployments, and industrial software.</p>
          </div>
        </div>

        {/* Developer Credit Box */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lead Software Engineer
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              Developed by Tanzeel
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Direct Contact:</span>
              <a
                href="https://wa.me/923000081849"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold shadow-xs transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>WhatsApp: 03000081849</span>
              </a>
            </div>
          </div>

          <a
            href="https://wa.me/923000081849?text=Hello%20Tanzeel,%20I%20am%20interested%20in%20custom%20business%20software%20development."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 shadow-sm transition-all"
          >
            <span>Message on WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Official Advertisement Statement */}
        <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 leading-relaxed space-y-2">
          <div className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
            Custom Business Software Services
          </div>
          <p className="text-sm font-medium">
            "{t.adServices}"
          </p>
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
