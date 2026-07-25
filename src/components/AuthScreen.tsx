import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { GmsLogo } from './GmsLogo';
import { Lock, User, ShieldCheck, ArrowRight, Sparkles, BadgeCheck, AlertCircle, ShieldAlert, Layers } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regDesignation, setRegDesignation] = useState<string>('MCD Store Operator');
  const [regIdCardNo, setRegIdCardNo] = useState<string>('');
  const [regSector, setRegSector] = useState<string>('GMS MCD Dept.');
  const [regRole, setRegRole] = useState<string>('USER');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const inputUser = loginUsername.trim().toLowerCase();
    const inputPass = loginPassword.trim();

    try {
      // 1. Check Primary Admin Account
      if (
        (inputUser === 'admin@gms.com' || inputUser === 'johurul' || inputUser === 'admin') &&
        (inputPass === 'ruma7862' || inputPass === '123456')
      ) {
        const adminUser: UserProfile = {
          id: 'usr_admin_001',
          username: 'admin@gms.com',
          password: 'ruma7862',
          full_name: 'Md. Johurul Islam',
          designation: 'System Administrator & Developer',
          id_card_no: 'Tst-1024',
          sector: 'GMS MCD & ACC. Dept.',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'ADMINISTRATOR'
        };
        onLoginSuccess(adminUser);
        return;
      }

      // 2. Check Sub Admin Preset
      if (
        (inputUser === 'subadmin@gms.com' || inputUser === 'subadmin') &&
        (inputPass === 'subadmin123' || inputPass === '123456')
      ) {
        const subAdminUser: UserProfile = {
          id: 'usr_subadmin_001',
          username: 'subadmin@gms.com',
          password: 'subadmin123',
          full_name: 'Sub-Admin Officer',
          designation: 'MCD Assistant Manager',
          id_card_no: 'SUB-2041',
          sector: 'GMS MCD Dept.',
          role: 'SUB_ADMIN'
        };
        onLoginSuccess(subAdminUser);
        return;
      }

      // 3. Check Standard User Preset
      if (
        (inputUser === 'user@gms.com' || inputUser === 'user' || inputUser === 'store.operator@gms.com') &&
        (inputPass === 'user123' || inputPass === '123456')
      ) {
        const standardUser: UserProfile = {
          id: 'usr_store_exec_1',
          username: 'user@gms.com',
          password: 'user123',
          full_name: 'Anwar Hossain (Store Viewer)',
          designation: 'MCD Store Operator',
          id_card_no: 'EMP-2041',
          sector: 'Accessories Store',
          role: 'USER'
        };
        onLoginSuccess(standardUser);
        return;
      }

      // 4. Check local storage custom registered users
      const savedCustomUsers = localStorage.getItem('erp_custom_users');
      if (savedCustomUsers) {
        try {
          const customUsers: UserProfile[] = JSON.parse(savedCustomUsers);
          const found = customUsers.find(
            u => u.username.toLowerCase() === inputUser && (u.password === inputPass || !u.password)
          );
          if (found) {
            // Check Approval Status
            if (found.status === 'PENDING' || (found.is_approved === false && found.status !== 'APPROVED' && found.role !== 'ADMINISTRATOR')) {
              setErrorMessage('⚠️ Account Pending Admin Approval! Your registration has been received, but your account is waiting for Admin approval. Please request Admin (Md. Johurul Islam) to approve your account in the Admin Panel.\n(আপনার অ্যাকাউন্টটি এখনও অ্যাডমিন এপ্রুভ করেনি)');
              setIsLoading(false);
              return;
            }
            if (found.status === 'REJECTED') {
              setErrorMessage('❌ Account Registration Rejected! Your account request was rejected by Admin.');
              setIsLoading(false);
              return;
            }
            onLoginSuccess(found);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 5. Try finding in Supabase profiles table
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', loginUsername.trim().toLowerCase())
        .maybeSingle();

      if (data) {
        if (data.password && data.password !== inputPass) {
          setErrorMessage('Invalid password for this user account.');
          setIsLoading(false);
          return;
        }
        const profile = data as UserProfile;
        if (profile.status === 'PENDING' || (profile.is_approved === false && profile.status !== 'APPROVED' && profile.role !== 'ADMINISTRATOR')) {
          setErrorMessage('⚠️ Account Pending Admin Approval! Your registration has been received, but your account is waiting for Admin approval. Please request Admin (Md. Johurul Islam) to approve your account in the Admin Panel.\n(আপনার অ্যাকাউন্টটি এখনও অ্যাডমিন এপ্রুভ করেনি)');
          setIsLoading(false);
          return;
        }
        if (profile.status === 'REJECTED') {
          setErrorMessage('❌ Account Registration Rejected! Your account request was rejected by Admin.');
          setIsLoading(false);
          return;
        }
        onLoginSuccess(profile);
        return;
      }

      // If no account found
      setErrorMessage('Incorrect username/email or password. Please check your credentials or register a new user.');
    } catch (err: any) {
      console.warn('Auth notice:', err);
      setErrorMessage('Authentication error. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required fields (Full Name, Username/Email, Password).');
      setIsLoading(false);
      return;
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      username: regUsername.trim().toLowerCase(),
      password: regPassword.trim(),
      full_name: regFullName.trim(),
      designation: regDesignation.trim() || 'Store Operator',
      id_card_no: regIdCardNo.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      sector: regSector.trim() || 'GMS MCD Dept.',
      role: 'USER',
      status: 'PENDING',
      is_approved: false,
      created_at: new Date().toISOString()
    };

    try {
      // 1. Try to persist to Supabase profiles table
      try {
        await supabase.from('profiles').insert([newUser]);
      } catch (sbErr) {
        console.warn('Supabase profile registration notice:', sbErr);
      }

      // 2. Persist locally to erp_custom_users
      const existing = localStorage.getItem('erp_custom_users');
      let customUsersList: UserProfile[] = [];
      if (existing) {
        try { customUsersList = JSON.parse(existing); } catch (e) {}
      }
      customUsersList.unshift(newUser);
      localStorage.setItem('erp_custom_users', JSON.stringify(customUsersList));

      setSuccessMessage('✅ Registration submitted successfully! Your account is currently PENDING Admin Approval. Once Admin (Md. Johurul Islam) approves your account in the Admin Panel, you will be able to log in. (রেজিস্ট্রেশন জমা হয়েছে! অ্যাডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।)');
      setRegFullName('');
      setRegUsername('');
      setRegPassword('');
      setRegIdCardNo('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create user account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between items-center p-4 relative overflow-hidden select-none">
      
      {/* FULL PAGE WHITE ANIMATED BACKGROUND LIGHT EFFECTS */}
      {/* 1. Animated Radial Light Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-300/40 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none" />

      {/* 2. Floating Animated Orbs */}
      <div className="absolute top-20 left-1/4 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-400/20 to-blue-400/30 border border-indigo-200/50 animate-bounce pointer-events-none" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-28 right-1/4 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/30 border border-emerald-200/50 animate-bounce pointer-events-none" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-12 w-8 h-8 rounded-full bg-amber-300/30 border border-amber-200/50 animate-ping pointer-events-none" style={{ animationDuration: '4s' }} />

      {/* 3. Subtle Light Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* Top Brand Header */}
      <div className="w-full max-w-md pt-8 text-center z-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex justify-center mb-3">
          <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-slate-200">
            <GmsLogo size={52} className="w-13 h-13" />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/90 border border-indigo-200 rounded-full text-indigo-700 text-xs font-black mb-2 shadow-md backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>GMS MCD ERP SYSTEM</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          GMS MCD ERP SYSTEM
        </h1>
        <p className="text-xs font-semibold text-slate-600 mt-1">
          Multi-Module Textile & Garments Accessories Portal
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white/90 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10 my-6 animate-in zoom-in-95 duration-500">
        
        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Register Account</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Username or Email ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin@gms.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 mt-3"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to GMS MCD ERP'}</span>
              <ArrowRight className="w-4 h-4 text-indigo-200" />
            </button>

            {/* Quick Role Fill Preset Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-200 space-y-2">
              <p className="text-[11px] font-extrabold text-slate-500 text-center">Quick Role Login Fill (Quick Demo):</p>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('admin@gms.com');
                    setLoginPassword('ruma7862');
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl font-bold text-indigo-900 flex items-center justify-between px-3 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Admin</span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-mono">admin@gms.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('subadmin@gms.com');
                    setLoginPassword('subadmin123');
                  }}
                  className="w-full py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl font-bold text-violet-900 flex items-center justify-between px-3 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                    <span>Sub Admin (Entry, Edit & Delete)</span>
                  </div>
                  <span className="text-[10px] text-violet-700 font-mono">subadmin@gms.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('user@gms.com');
                    setLoginPassword('user123');
                  }}
                  className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl font-bold text-amber-900 flex items-center justify-between px-3 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Standard User (View & Download Only)</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-mono">user@gms.com</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODE 2: USER REGISTRATION FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Username / Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="rafiq@gms.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="MCD Store Operator"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  ID Card No.
                </label>
                <input
                  type="text"
                  value={regIdCardNo}
                  onChange={(e) => setRegIdCardNo(e.target.value)}
                  placeholder="EMP-3091"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Account Role: <strong className="text-slate-900">Standard User (USER)</strong></span>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Requires Admin Approval</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 mt-4"
            >
              <span>{isLoading ? 'Registering Account...' : 'Register New User Account'}</span>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>
          </form>
        )}

      </div>

      {/* Developer Banner Footer */}
      <div className="z-10 pb-4 text-center">
        <div className="inline-flex items-center gap-2 bg-white/90 border border-slate-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-slate-700 shadow-md backdrop-blur-md">
          <BadgeCheck className="w-4 h-4 text-indigo-600" />
          <span>System Developer: <strong className="text-slate-900 font-black">Md. Johurul Islam</strong></span>
        </div>
      </div>

    </div>
  );
};


