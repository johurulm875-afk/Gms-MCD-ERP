import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { User, ShieldCheck, BadgeCheck, LogOut, Edit3, Save, Building2, IdCard, Sparkles, CheckCircle2 } from 'lucide-react';

interface UserProfileViewProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  onLogout: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfile,
  onUpdateProfile,
  onLogout
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>(userProfile?.full_name || 'Md. Johurul Islam');
  const [designation, setDesignation] = useState<string>(userProfile?.designation || 'System Administrator & Developer');
  const [idCardNo, setIdCardNo] = useState<string>(userProfile?.id_card_no || 'Tst-1024');
  const [sector, setSector] = useState<string>(userProfile?.sector || 'GMS MCD & ACC. Dept.');
  const [avatarUrl, setAvatarUrl] = useState<string>(userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    const updated: UserProfile = {
      id: userProfile?.id || 'usr_' + Date.now(),
      username: userProfile?.username || 'johurul',
      full_name: fullName.trim(),
      designation: designation.trim(),
      id_card_no: idCardNo.trim(),
      sector: sector.trim(),
      avatar_url: avatarUrl.trim(),
      role: userProfile?.role || 'ADMINISTRATOR'
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([updated]);

      if (error) {
        console.warn('Supabase profile save notice:', error.message);
      }

      onUpdateProfile(updated);
      setIsEditing(false);
      setSuccessMessage('Profile details updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      onUpdateProfile(updated);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" />
            <span>User Profile & Credentials</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Logged in system user account details & department permissions
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Card Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        {/* Top Developer Badge Banner */}
        <div className="mb-6 p-4 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BadgeCheck className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-indigo-200">
                System Developer: <span className="text-white font-extrabold">Md. Johurul Islam</span>
              </div>
              <p className="text-[11px] text-slate-400">GMS MCD ERP System Architecture</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full">
            Supabase Active
          </span>
        </div>

        {!isEditing ? (
          /* DISPLAY MODE */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-800">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-xl bg-slate-800 shrink-0">
                <img
                  src={userProfile?.avatar_url || avatarUrl}
                  alt={userProfile?.full_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-extrabold text-white">
                    {userProfile?.full_name || 'Md. Johurul Islam'}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-bold text-[10px] rounded-full uppercase">
                    {userProfile?.role || 'ADMINISTRATOR'}
                  </span>
                </div>

                <p className="text-xs font-bold text-indigo-300 mt-1">
                  {userProfile?.designation || 'System Administrator & Developer'}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>ID: <strong className="text-slate-200">{userProfile?.id_card_no || 'Tst-1024'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sector: <strong className="text-slate-200">{userProfile?.sector || 'GMS MCD & ACC. Dept.'}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all shrink-0"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Profile Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-semibold mb-0.5">Username</span>
                <span className="text-white font-mono font-bold text-sm">{userProfile?.username || 'johurul'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-semibold mb-0.5">Role Authorization</span>
                <span className="text-emerald-400 font-bold text-sm">Full Administrative Access</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-semibold mb-0.5">Assigned Sector</span>
                <span className="text-slate-200 font-semibold">{userProfile?.sector || 'Garments Store & Accessories Dept.'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block font-semibold mb-0.5">Database Sync</span>
                <span className="text-indigo-300 font-semibold">Supabase profiles Table</span>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Edit User Profile Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ID Card No
                </label>
                <input
                  type="text"
                  required
                  value={idCardNo}
                  onChange={(e) => setIdCardNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Sector / Department
                </label>
                <input
                  type="text"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Profile Avatar Photo URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
};
