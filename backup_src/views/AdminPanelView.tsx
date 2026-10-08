import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  UserPlus,
  UserX,
  UserCheck,
  Send,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Lock,
} from 'lucide-react';
import { AppDatabase, UserAccount, UserRole, Product, AppLanguage } from '../types';
import { StorageService, simpleHash } from '../services/storage';
import { autoTranslateToUrdu, translations } from '../services/translations';

interface AdminPanelViewProps {
  db: AppDatabase;
  storage: StorageService;
  currentUser: string;
  onRequestPinAuth: (action: () => void) => void;
  language: AppLanguage;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  db,
  storage,
  currentUser,
  onRequestPinAuth,
  language,
}) => {
  const t = translations[language] || translations.en;

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  // Product Master Management State
  const [newProdEn, setNewProdEn] = useState('');
  const [newProdUr, setNewProdUr] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newProdSizes, setNewProdSizes] = useState<number[]>([50, 80]);

  // Bag Size Management State
  const [newBagSizeKg, setNewBagSizeKg] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestPinAuth(() => {
      if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword) {
        setNotificationMsg({ type: 'error', text: 'All user account fields are required.' });
        return;
      }

      const newUser: UserAccount = {
        id: 'usr-' + Date.now(),
        name: newUserName.trim(),
        username: newUserUsername.trim().toLowerCase(),
        role: newUserRole,
        pinCode: newUserPin.trim(),
        passwordHash: simpleHash(newUserPassword),
        isBlocked: false,
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      storage.logActivity('User Created', currentUser, `Created user account "${newUser.name}" (${newUser.role})`);
      storage.saveToDisk();

      setNotificationMsg({ type: 'success', text: `User account for ${newUser.name} created successfully.` });
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
    });
  };

  const handleToggleBlockUser = (user: UserAccount) => {
    onRequestPinAuth(() => {
      user.isBlocked = !user.isBlocked;
      user.blockReason = user.isBlocked ? 'Blocked by Administrator' : undefined;
      storage.logActivity(
        'User Status Changed',
        currentUser,
        `${user.isBlocked ? 'Blocked' : 'Unblocked'} user "${user.name}"`
      );
      storage.saveToDisk();
      setNotificationMsg({
        type: 'success',
        text: `User "${user.name}" ${user.isBlocked ? 'has been blocked' : 'has been unblocked'}.`,
      });
    });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;

    storage.addNotification(broadcastTitle.trim(), broadcastMsg.trim(), currentUser, broadcastPriority);
    storage.logActivity('Broadcast Sent', currentUser, `Sent announcement "${broadcastTitle.trim()}"`);
    setNotificationMsg({ type: 'success', text: 'Notification broadcasted to all terminals.' });
    setBroadcastTitle('');
    setBroadcastMsg('');
  };

  const handleAddProductMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdEn.trim()) return;

    onRequestPinAuth(() => {
      storage.addProduct(
        {
          nameEn: newProdEn.trim(),
          nameUr: newProdUr.trim() || autoTranslateToUrdu(newProdEn.trim()) || newProdEn.trim(),
          category: newProdCat.trim() || 'General Flour',
          type: 'Manufactured Product',
          bagSizes: newProdSizes.length > 0 ? newProdSizes : [50],
        },
        currentUser
      );

      setNotificationMsg({ type: 'success', text: `Product "${newProdEn.trim()}" added to master database.` });
      setNewProdEn('');
      setNewProdUr('');
      setNewProdCat('');
    });
  };

  const handleArchiveProduct = (id: string, name: string) => {
    onRequestPinAuth(() => {
      storage.archiveProduct(id, currentUser, 'Archived via Admin Panel');
      setNotificationMsg({ type: 'success', text: `Product "${name}" archived to Recycle Bin.` });
    });
  };

  const handleAddBagSize = (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseInt(newBagSizeKg, 10);
    if (isNaN(size) || size <= 0) return;

    onRequestPinAuth(() => {
      if (db.bagSizes.some(b => b.sizeKg === size)) {
        setNotificationMsg({ type: 'error', text: `${size} kg bag size already exists.` });
        return;
      }
      db.bagSizes.push({
        id: `bs-${size}`,
        sizeKg: size,
        label: `${size} kg`,
        isDefault: false,
      });
      storage.logActivity('Bag Size Added', currentUser, `Added new standard bag size: ${size} kg`);
      storage.saveToDisk();
      setNotificationMsg({ type: 'success', text: `Bag size ${size} kg added successfully.` });
      setNewBagSizeKg('');
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.adminPanel} (ایڈمن پینل و اختیارات)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            User access control, temporary blocking, system broadcasts, product catalogs, and bag size master parameters.
          </p>
        </div>
      </div>

      {notificationMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Grid of Admin Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: User Accounts & Temporary Blocking (Section 16 & 18) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Accounts & Access</h3>
                <p className="text-[11px] text-slate-500">Manage shift operators, clerks, and block credentials.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="space-y-2">
            {db.users.map(u => (
              <div
                key={u.id}
                className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{u.name}</span>
                    <span className="text-slate-400 font-mono">(@{u.username})</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {u.role}
                    </span>
                    {u.isBlocked && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Created: {new Date(u.createdAt).toLocaleDateString()} · PIN: ****
                  </div>
                </div>

                {u.role !== 'admin' && (
                  <button
                    onClick={() => handleToggleBlockUser(u)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      u.isBlocked
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    {u.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    <span>{u.isBlocked ? 'Unblock' : 'Block User'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: In-App System Broadcasts (Section 18) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Send className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Announcement</h3>
              <p className="text-[11px] text-slate-500">Send high-priority notifications to all terminals and staff.</p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Announcement Title *
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Mandatory Shift Handover Notice"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Priority Level
                </label>
                <select
                  value={broadcastPriority}
                  onChange={e => setBroadcastPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="normal">Normal Information</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Operational Action</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Message Body *
              </label>
              <textarea
                rows={2}
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Enter notice text..."
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none resize-none"
              />
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Broadcast</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 3: Master Products Catalog Management (Section 5) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Master Product Management & Urdu Transliteration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Products with existing transaction history are safely archived rather than deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Add Product Form */}
          <form onSubmit={handleAddProductMaster} className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-900 dark:text-white">Add New Product to Master Catalog</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="English Name (e.g. Chakki Atta)"
                  value={newProdEn}
                  onChange={e => {
                    setNewProdEn(e.target.value);
                    const ur = autoTranslateToUrdu(e.target.value);
                    if (ur && !newProdUr) setNewProdUr(ur);
                  }}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="اردو نام (Urdu Name)"
                  value={newProdUr}
                  onChange={e => setNewProdUr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Category (e.g. Whole Wheat)"
                  value={newProdCat}
                  onChange={e => setNewProdCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shrink-0"
                >
                  Save Product
                </button>
              </div>
            </div>
          </form>

          {/* Master Product List */}
          <div className="space-y-2">
            {db.products.map(p => (
              <div
                key={p.id}
                className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{p.nameEn}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">{p.nameUr}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.category}
                    </span>
                    {!p.isActive && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-700">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Bag sizes: {p.bagSizes.map(s => `${s}kg`).join(', ')}
                  </div>
                </div>

                {p.isActive && (
                  <button
                    type="button"
                    onClick={() => handleArchiveProduct(p.id, p.nameEn)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New User Account Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 select-none">
          <form
            onSubmit={handleAddUser}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create User Account</h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Aslam Khan"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value)}
                  placeholder="e.g. aslam"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="operator">Operator (Staff)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Quick PIN (4-6 Digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newUserPin}
                    onChange={e => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Enter login password"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Save User
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
