import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Package,
  Cloud,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Languages,
} from 'lucide-react';
import { BusinessProfile, BusinessType } from '../types';
import { autoTranslateToUrdu } from '../services/translations';

interface SetupWizardProps {
  onComplete: (
    adminUser: { name: string; username: string; pinCode: string; password: string },
    profile: BusinessProfile,
    products: Array<{ nameEn: string; nameUr: string; category: string; bagSizes: number[] }>,
    bagSizes: number[],
    driveConfig?: { connected: boolean; email?: string }
  ) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Step 1: Admin
  const [adminName, setAdminName] = useState('Tanzeel');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPin, setAdminPin] = useState('1234');

  // Step 2: Business Profile
  const [businessName, setBusinessName] = useState('Al-Rehman Flour Mills');
  const [businessType, setBusinessType] = useState<BusinessType>('flour_mill');
  const [address, setAddress] = useState('G.T. Road, Industrial Zone');
  const [contactNumber, setContactNumber] = useState('03000081849');
  const [email, setEmail] = useState('info@alrehmanmill.com');
  const [plantSupervisor, setPlantSupervisor] = useState('Muhammad Akram');
  const [factoryManager, setFactoryManager] = useState('Haji Tariq Mehmood');
  const [ownerName, setOwnerName] = useState('Tanzeel Ur Rehman');
  const [currency, setCurrency] = useState('PKR');

  // Step 3: Bag Sizes & Initial Products
  const [bagSizesList, setBagSizesList] = useState<number[]>([20, 25, 50, 80]);
  const [newBagSizeInput, setNewBagSizeInput] = useState<string>('');

  const [productsList, setProductsList] = useState<Array<{ nameEn: string; nameUr: string; category: string; bagSizes: number[] }>>([
    { nameEn: 'Aata (Wheat Flour)', nameUr: 'آٹا', category: 'Atta / Flour', bagSizes: [20, 50, 80] },
    { nameEn: 'Maida (Super Fine)', nameUr: 'میدہ', category: 'Maida', bagSizes: [50, 80] },
    { nameEn: 'Chakki Atta', nameUr: 'چکی آٹا', category: 'Whole Wheat', bagSizes: [20, 25] },
    { nameEn: 'Suji (Semolina)', nameUr: 'سوجی', category: 'Suji', bagSizes: [50] },
    { nameEn: 'Jokar (Wheat Bran)', nameUr: 'چوکر', category: 'Bran', bagSizes: [40, 50] },
  ]);

  const [newProdEn, setNewProdEn] = useState('');
  const [newProdUr, setNewProdUr] = useState('');
  const [newProdCat, setNewProdCat] = useState('');

  // Step 4: Backup & Sync
  const [enableDriveBackup, setEnableDriveBackup] = useState(true);
  const [driveEmail, setDriveEmail] = useState('');
  const [enableFirebase, setEnableFirebase] = useState(false);

  const handleTranslateProd = (en: string) => {
    setNewProdEn(en);
    const translated = autoTranslateToUrdu(en);
    if (translated && !newProdUr) {
      setNewProdUr(translated);
    }
  };

  const handleAddBagSize = () => {
    const val = parseInt(newBagSizeInput, 10);
    if (!isNaN(val) && val > 0 && !bagSizesList.includes(val)) {
      setBagSizesList([...bagSizesList, val].sort((a, b) => a - b));
      setNewBagSizeInput('');
    }
  };

  const handleRemoveBagSize = (size: number) => {
    setBagSizesList(bagSizesList.filter(s => s !== size));
  };

  const handleAddProduct = () => {
    if (!newProdEn.trim()) {
      setErrorMsg('Product name in English is required.');
      return;
    }
    setProductsList([
      ...productsList,
      {
        nameEn: newProdEn.trim(),
        nameUr: newProdUr.trim() || autoTranslateToUrdu(newProdEn.trim()) || newProdEn.trim(),
        category: newProdCat.trim() || 'General Flour',
        bagSizes: bagSizesList.slice(0, 2),
      },
    ]);
    setNewProdEn('');
    setNewProdUr('');
    setNewProdCat('');
    setErrorMsg('');
  };

  const handleRemoveProduct = (index: number) => {
    setProductsList(productsList.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!adminName.trim() || !adminUsername.trim()) {
        setErrorMsg('Please enter administrator name and username.');
        return;
      }
      if (!adminPassword || adminPassword.length < 4) {
        setErrorMsg('Password must be at least 4 characters.');
        return;
      }
      if (adminPassword !== adminConfirmPassword) {
        setErrorMsg('Password and Confirm Password do not match.');
        return;
      }
      if (!adminPin || adminPin.length < 4 || adminPin.length > 6) {
        setErrorMsg('PIN must be 4 to 6 numeric digits.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!businessName.trim()) {
        setErrorMsg('Please enter your business or mill name.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (bagSizesList.length === 0) {
        setErrorMsg('At least one bag size is required.');
        return;
      }
      if (productsList.length === 0) {
        setErrorMsg('Please configure at least one product.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleFinish = () => {
    const profile: BusinessProfile = {
      id: 'prof-main-1',
      businessName: businessName.trim(),
      businessType,
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      plantSupervisor: plantSupervisor.trim(),
      factoryManager: factoryManager.trim(),
      ownerName: ownerName.trim(),
      registrationNumber: 'NTN-8947291',
      currency: currency.trim() || 'PKR',
      notes: 'Initial production system profile.',
      updatedAt: new Date().toISOString(),
    };

    onComplete(
      {
        name: adminName.trim(),
        username: adminUsername.trim(),
        password: adminPassword,
        pinCode: adminPin.trim(),
      },
      profile,
      productsList,
      bagSizesList,
      {
        connected: enableDriveBackup,
        email: driveEmail.trim() || undefined,
      }
    );
  };

  const steps = [
    { num: 1, title: 'Administrator', icon: Shield },
    { num: 2, title: 'Business Profile', icon: Building2 },
    { num: 3, title: 'Products & Bags', icon: Package },
    { num: 4, title: 'Cloud & Backup', icon: Cloud },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                First Launch Setup
              </span>
              <span className="text-xs text-slate-400">Step {currentStep} of 4</span>
            </div>
            <h2 className="text-lg font-bold mt-1 tracking-tight">ST Production & Stock Manager</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Configure credentials, factory profile, and initial master data to begin.
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400">Developed by Tanzeel</span>
            <p className="text-xs text-emerald-400 font-mono font-medium">WhatsApp: 03000081849</p>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;

            return (
              <div key={st.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden md:inline ${
                    isCurrent ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {st.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body Content per Step */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800 dark:text-slate-200">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Step 1: Administrator */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Administrator Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This master account configures all permissions, PIN protection, and financial reports.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="e.g. Tanzeel Ur Rehman"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={e => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quick Security PIN (4-6 Digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234"
                    className="w-48 px-3 py-2 text-sm font-mono tracking-widest text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used for rapid unlocking, module access verification, and sales cancellation approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Business Profile */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Business & Mill Profile</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your facility type and enter business particulars for official invoices and production logs.
                </p>
              </div>

              {/* Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'flour_mill', label: 'Flour Mill (فلور مل)', desc: 'Wheat grinding & flour dispatch' },
                  { type: 'factory', label: 'Factory / Plant', desc: 'General industrial unit' },
                  { type: 'shop', label: 'Shop / Wholesale Agency', desc: 'Grain & flour trading outlet' },
                ].map(opt => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setBusinessType(opt.type as BusinessType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      businessType === opt.type
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business / Mill Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Al-Madina Flour Mills"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Facility / Mill Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Main G.T. Road, Industrial Estate"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plant Supervisor Name
                  </label>
                  <input
                    type="text"
                    value={plantSupervisor}
                    onChange={e => setPlantSupervisor(e.target.value)}
                    placeholder="Supervisor on shift"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Factory / Mill Manager
                  </label>
                  <input
                    type="text"
                    value={factoryManager}
                    onChange={e => setFactoryManager(e.target.value)}
                    placeholder="General Manager"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Proprietor / Owner Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="Mill Owner"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    placeholder="PKR or Rs"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Products & Bag Sizes */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Products & Bag Sizes Setup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure default bag sizes (e.g. 20kg, 50kg, 80kg) and your initial flour/grain product lines.
                </p>
              </div>

              {/* Bag Sizes */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Available Bag Sizes (Kilograms)
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {bagSizesList.map(size => (
                    <div
                      key={size}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs"
                    >
                      <span>{size} kg</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBagSize(size)}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Size kg"
                      value={newBagSizeInput}
                      onChange={e => setNewBagSizeInput(e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBagSize}
                      className="px-2 py-1 bg-slate-900 dark:bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Configured Product Lines
                </label>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {productsList.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{p.nameEn}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400" dir="rtl">{p.nameUr}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Category: {p.category} | Sizes: {p.bagSizes.map(s => `${s}kg`).join(', ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Product Inline */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-300">Add Custom Product</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Product Name (English)"
                        value={newProdEn}
                        onChange={e => handleTranslateProd(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="اردو نام (Urdu Name)"
                        value={newProdUr}
                        onChange={e => setNewProdUr(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Category"
                        value={newProdCat}
                        onChange={e => setNewProdCat(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Backup & Sync */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cloud Backup & Synchronization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure Google Drive automated snapshot storage and multi-device sync preferences.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Google Drive Cloud Snapshot Storage
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Automatic 5-second delta change-detection check & local snapshot generation
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableDriveBackup}
                      onChange={e => setEnableDriveBackup(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>

                  {enableDriveBackup && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Google Account Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={driveEmail}
                        onChange={e => setDriveEmail(e.target.value)}
                        placeholder="e.g. manager@gmail.com"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Firebase Multi-Device Real-time Sync
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Synchronize production & stock ledgers with mobile Android/iOS companion apps
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableFirebase}
                    onChange={e => setEnableFirebase(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Setup & Launch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
