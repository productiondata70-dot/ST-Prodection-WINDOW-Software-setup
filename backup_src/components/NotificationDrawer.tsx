import React, { useState } from 'react';
import { X, Bell, History, CheckCheck, Filter, Search, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppNotification, ActivityLogEvent } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'notifications' | 'activity';
  notifications: AppNotification[];
  activityLogs: ActivityLogEvent[];
  onMarkAllNotificationsRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  defaultTab = 'notifications',
  notifications,
  activityLogs,
  onMarkAllNotificationsRead,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'activity'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && log.result === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications ({notifications.filter(n => !n.isRead).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity Log ({activityLogs.length})</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Notifications */}
        {activeTab === 'notifications' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">System alerts and notices</span>
              <button
                onClick={onMarkAllNotificationsRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No notifications yet.</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      notif.isRead
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-slate-900 dark:text-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-blue-600 dark:text-blue-400">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{notif.message}</p>
                    <div className="mt-2 text-[10px] text-slate-400">Sender: {notif.sender}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Activity Logs & Audit Trail */}
        {activeTab === 'activity' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter and Search */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex items-center gap-1">
                {['all', 'success', 'warning', 'error'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      filterType === type
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No activity records match query.</div>
              ) : (
                filteredLogs.map(log => {
                  const Icon =
                    log.result === 'success'
                      ? CheckCircle2
                      : log.result === 'warning'
                      ? AlertTriangle
                      : AlertCircle;
                  const iconColor =
                    log.result === 'success'
                      ? 'text-emerald-500'
                      : log.result === 'warning'
                      ? 'text-amber-500'
                      : 'text-rose-500';

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                          <span>{log.eventType}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {log.description}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                        <span>User: {log.user}</span>
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
