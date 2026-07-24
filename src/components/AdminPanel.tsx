import React, { useState, useEffect } from 'react';
import { UserProfile, AppTheme } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Users, UserPlus, Eye, EyeOff, Key, Trash2, Edit3, Shield, ShieldAlert, CheckCircle2, 
  Search, RefreshCw, UserCheck, Lock, AlertCircle, Building, IdCard, Mail
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  theme?: AppTheme;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  theme = 'dark',
  showToast
}) => {
  const isLight = theme === 'light';
  const isAdmin = currentUser?.role === 'ADMINISTRATOR' || 
    currentUser?.username?.toLowerCase() === 'admin@gms.com' || 
    currentUser?.username?.toLowerCase() === 'johurul';

  if (!isAdmin) {
    return (
      <div className={`p-8 rounded-3xl border text-center my-12 max-w-lg mx-auto shadow-2xl animate-in zoom-in-95 ${
        isLight ? 'bg-white border-rose-200 text-slate-800' : 'bg-slate-900 border-rose-900/50 text-white'
      }`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-black text-rose-600 mb-2">Access Denied (অ্যাক্সেস সংরক্ষিত)</h2>
        <p className="text-xs font-semibold text-slate-500 mb-5 leading-relaxed">
          Standard User accounts cannot access the Admin Panel. Only System Administrators have permission to manage users and view sensitive configuration.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-800 text-xs font-black rounded-xl border border-rose-200 shadow-2xs">
          <span>Your Role:</span>
          <span className="px-2 py-0.5 bg-rose-200 text-rose-950 rounded-md font-mono">{currentUser?.role || 'USER'}</span>
        </div>
      </div>
    );
  }

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  // New User Form Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form input fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    designation: 'MCD Executive',
    id_card_no: '',
    sector: 'GMS MCD Dept.',
    role: 'USER'
  });

  // Default seed list of initial system users
  const initialDefaultUsers: UserProfile[] = [
    {
      id: 'usr_admin_001',
      username: 'admin@gms.com',
      password: 'ruma7862',
      full_name: 'Md. Johurul Islam',
      designation: 'System Administrator & Developer',
      id_card_no: 'Tst-1024',
      sector: 'GMS MCD & ACC. Dept.',
      role: 'ADMINISTRATOR',
      created_at: '2026-01-01'
    },
    {
      id: 'usr_johurul_alias',
      username: 'johurul',
      password: 'ruma7862',
      full_name: 'Md. Johurul Islam',
      designation: 'System Administrator & Developer',
      id_card_no: 'Tst-1024',
      sector: 'GMS MCD & ACC. Dept.',
      role: 'ADMINISTRATOR',
      created_at: '2026-01-02'
    },
    {
      id: 'usr_store_exec_1',
      username: 'store.operator@gms.com',
      password: 'user123',
      full_name: 'Anwar Hossain',
      designation: 'MCD Officer',
      id_card_no: 'EMP-2041',
      sector: 'Accessories & Twill MCD',
      role: 'USER',
      created_at: '2026-02-15'
    }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    let allUsers: UserProfile[] = [];

    // Load from localStorage first
    const savedCustom = localStorage.getItem('erp_custom_users');
    let localUsers: UserProfile[] = [];
    if (savedCustom) {
      try {
        localUsers = JSON.parse(savedCustom);
      } catch (e) {
        localUsers = [];
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (data && data.length > 0) {
        allUsers = [...data as UserProfile[]];
      }
    } catch (err) {
      console.warn("Supabase profiles query notice:", err);
    }

    // Merge initial seed, local users, and supabase profiles without duplicates
    const userMap = new Map<string, UserProfile>();

    initialDefaultUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    allUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));

    const merged = Array.from(userMap.values());
    setUsers(merged);
    setIsLoading(false);
  };

  const saveCustomUsersToLocalStorage = (updatedList: UserProfile[]) => {
    localStorage.setItem('erp_custom_users', JSON.stringify(updatedList));
  };

  const handleTogglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      designation: 'Store Executive',
      id_card_no: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      sector: 'Garments Store Dept.',
      role: 'USER'
    });
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password || '',
      full_name: user.full_name,
      designation: user.designation,
      id_card_no: user.id_card_no,
      sector: user.sector,
      role: user.role || 'USER'
    });
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.full_name.trim()) {
      showToast("Username and Full Name are required", "error");
      return;
    }

    if (editingUser) {
      // Update existing user
      const updatedUser: UserProfile = {
        ...editingUser,
        username: formData.username.trim(),
        password: formData.password.trim(),
        full_name: formData.full_name.trim(),
        designation: formData.designation.trim(),
        id_card_no: formData.id_card_no.trim(),
        sector: formData.sector.trim(),
        role: formData.role
      };

      try {
        await supabase
          .from('profiles')
          .update(updatedUser)
          .eq('id', editingUser.id);
      } catch (e) {
        console.warn("Supabase update notice:", e);
      }

      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      setUsers(updatedList);
      saveCustomUsersToLocalStorage(updatedList);
      showToast(`User ${updatedUser.username} updated successfully!`, "success");
    } else {
      // Create new user ID
      const newUser: UserProfile = {
        id: 'usr_' + Date.now(),
        username: formData.username.trim(),
        password: formData.password.trim() || 'gms1234',
        full_name: formData.full_name.trim(),
        designation: formData.designation.trim(),
        id_card_no: formData.id_card_no.trim(),
        sector: formData.sector.trim(),
        role: formData.role,
        created_at: new Date().toISOString().slice(0, 10)
      };

      try {
        await supabase.from('profiles').insert([newUser]);
      } catch (e) {
        console.warn("Supabase insert notice:", e);
      }

      const updatedList = [newUser, ...users];
      setUsers(updatedList);
      saveCustomUsersToLocalStorage(updatedList);
      showToast(`Created new user ID: ${newUser.username}`, "success");
    }

    setIsAddUserModalOpen(false);
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username.toLowerCase() === 'admin@gms.com') {
      showToast("Primary System Admin account cannot be deleted!", "error");
      return;
    }

    if (!confirm(`Are you sure you want to delete user ID "${username}"?`)) return;

    try {
      await supabase.from('profiles').delete().eq('id', userId);
    } catch (e) {
      console.warn("Delete error:", e);
    }

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveCustomUsersToLocalStorage(updated);
    showToast(`Deleted user account ${username}`, "info");
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.id_card_no?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q) ||
      u.sector?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span>Admin Panel & User Management</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/30">
                Admin Exclusive
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              System Administrator: <strong>Md. Johurul Islam</strong> (admin@gms.com) • Manage user IDs & credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={fetchUsers}
            className={`p-2 rounded-xl border transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-indigo-200" />
            <span>+ Create New User ID</span>
          </button>
        </div>
      </div>

      {/* Control Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, ID card, designation..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isLight 
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
            }`}
          />
        </div>

        <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Total User Accounts: <span className="text-indigo-500 font-extrabold">{users.length}</span>
        </div>
      </div>

      {/* Users Table Card */}
      <div className={`rounded-2xl border shadow-lg overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`uppercase text-[11px] font-extrabold tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <th className="py-3.5 px-4">User Info & Name</th>
                <th className="py-3.5 px-4">Username / Email</th>
                <th className="py-3.5 px-4 text-amber-500">Password</th>
                <th className="py-3.5 px-4">Designation & Sector</th>
                <th className="py-3.5 px-4">ID Card No</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-bold">No user accounts found matching query</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const showPass = !!visiblePasswords[user.id];
                  const isAdmin = user.role === 'ADMINISTRATOR' || user.username.toLowerCase() === 'admin@gms.com';
                  const userRole = (user.role || '').toUpperCase();

                  return (
                    <tr key={user.id} className={`hover:bg-slate-500/5 transition-colors font-medium`}>
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center shrink-0 border ${
                            isAdmin 
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm' 
                              : isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}>
                            {user.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {user.full_name}
                            </p>
                            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Username / Email */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs">
                        <span className={`px-2.5 py-1 rounded-lg border ${
                          isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-indigo-300'
                        }`}>
                          {user.username}
                        </span>
                      </td>

                      {/* Password with View Toggle */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs tracking-wider ${
                            showPass 
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-extrabold' 
                              : isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}>
                            {showPass ? (user.password || 'ruma7862') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePassword(user.id)}
                            className={`p-1 rounded-lg transition-colors ${
                              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title={showPass ? "Hide Password" : "Show Plaintext Password"}
                          >
                            {showPass ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Designation & Sector */}
                      <td className="py-3.5 px-4">
                        <div className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {user.designation}
                        </div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {user.sector}
                        </div>
                      </td>

                      {/* ID Card No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs">
                        <span className={`px-2 py-0.5 rounded border ${
                          isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {user.id_card_no}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {userRole === 'ADMINISTRATOR' || userRole === 'ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                            ADMINISTRATOR (Full Admin)
                          </span>
                        ) : userRole === 'SUB_ADMIN' || userRole === 'SUB ADMIN' || userRole === 'SUB-ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-violet-500/20 text-violet-300 border-violet-500/30">
                            SUB ADMIN (Entry/Edit/Delete)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            USER (Read & Download Only)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="Edit User Profile / Change Password"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-800/60'
                              }`}
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative animate-in zoom-in-95 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-extrabold">
                  {editingUser ? 'Edit User Profile' : 'Create New User Account (Admin Panel)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Md. Johurul Islam"
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Username / Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                    placeholder="user@gms.com"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-amber-500">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="e.g. pass123"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isLight ? 'bg-amber-50 border-amber-300 text-slate-900' : 'bg-slate-950 border-amber-800 text-amber-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Store Executive"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    ID Card No
                  </label>
                  <input
                    type="text"
                    value={formData.id_card_no}
                    onChange={(e) => setFormData(p => ({ ...p, id_card_no: e.target.value }))}
                    placeholder="e.g. EMP-1041"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Sector / Department
                  </label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData(p => ({ ...p, sector: e.target.value }))}
                    placeholder="e.g. Garments Store Dept."
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    Account Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    <option value="USER">USER (Read-Only & Download)</option>
                    <option value="SUB_ADMIN">SUB ADMIN (Data Entry, Edit & Delete)</option>
                    <option value="ADMINISTRATOR">ADMINISTRATOR (Full Admin Control)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-700/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingUser ? 'Save Profile Changes' : 'Create User Account'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
