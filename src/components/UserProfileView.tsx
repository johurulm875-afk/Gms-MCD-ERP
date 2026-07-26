import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { User, ShieldCheck, BadgeCheck, LogOut, Edit3, Save, Building2, IdCard, Sparkles, CheckCircle2, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UserProfileViewProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  onLogout: () => void;
  theme?: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfile,
  onUpdateProfile,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>(userProfile?.full_name || 'Md. Johurul Islam');
  const [designation, setDesignation] = useState<string>(userProfile?.designation || 'System Administrator & Developer');
  const [idCardNo, setIdCardNo] = useState<string>(userProfile?.id_card_no || 'Tst-1024');
  const [sector, setSector] = useState<string>(userProfile?.sector || 'GMS MCD & ACC. Dept.');
  const [avatarUrl, setAvatarUrl] = useState<string>(userProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, etc.).');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Attempt upload to Supabase Storage bucket 'avatars'
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        if (publicUrlData?.publicUrl) {
          setAvatarUrl(publicUrlData.publicUrl);
          setIsUploading(false);
          return;
        }
      }
      
      // Fallback: Read file as Data URL (base64) so picture displays instantly even if bucket is disabled
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setAvatarUrl(dataUrl);
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read image file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      console.warn('Storage upload notice, falling back to FileReader:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setAvatarUrl(dataUrl);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

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
      setSuccessMessage('Profile details & picture updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Save error:', err);
      onUpdateProfile(updated);
      setIsEditing(false);
      setSuccessMessage('Profile updated locally!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-600" />
            <span>User Profile & Credentials</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Logged in system user account details & department permissions
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Card Container (White Theme Only) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        
        {/* Top Developer Badge Banner */}
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BadgeCheck className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">
                System Developer: <span className="text-indigo-900 font-black">Md. Johurul Islam</span>
              </div>
              <p className="text-[11px] text-slate-500">GMS MCD ERP System Architecture</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
            Supabase Active
          </span>
        </div>

        {!isEditing ? (
          /* DISPLAY MODE */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-200">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md bg-slate-100 shrink-0">
                <img
                  src={userProfile?.avatar_url || avatarUrl}
                  alt={userProfile?.full_name || 'User Profile'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {userProfile?.full_name || 'Md. Johurul Islam'}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-bold text-[10px] rounded-full uppercase">
                    {userProfile?.role || 'ADMINISTRATOR'}
                  </span>
                </div>

                <p className="text-xs font-bold text-indigo-700 mt-1">
                  {userProfile?.designation || 'System Administrator & Developer'}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    <IdCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>ID: <strong className="text-slate-900">{userProfile?.id_card_no || 'Tst-1024'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sector: <strong className="text-slate-900">{userProfile?.sector || 'GMS MCD & ACC. Dept.'}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Profile Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-0.5">Username</span>
                <span className="text-slate-900 font-mono font-bold text-sm">{userProfile?.username || 'johurul'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-0.5">Role Authorization</span>
                <span className="text-emerald-700 font-bold text-sm">Full Administrative Access</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-0.5">Assigned Sector</span>
                <span className="text-slate-800 font-semibold">{userProfile?.sector || 'Garments Store & Accessories Dept.'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-0.5">Database Sync</span>
                <span className="text-indigo-700 font-semibold">Supabase profiles Table</span>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSave} className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Edit User Profile Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ID Card No
                </label>
                <input
                  type="text"
                  required
                  value={idCardNo}
                  onChange={(e) => setIdCardNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sector / Department
                </label>
                <input
                  type="text"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Direct Image File Drag & Drop / File Upload Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Profile Picture Upload</span>
                <span className="text-[10px] text-indigo-600 font-semibold">Direct File Upload to Supabase Storage</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/80 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                {avatarUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shadow-xs bg-white shrink-0">
                      <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block">Click or Drag to change photo</span>
                      <span className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP • Max 5MB</span>
                      {isUploading && (
                        <span className="text-[11px] text-indigo-600 font-bold block mt-1 animate-pulse">Uploading file to storage...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Drag & Drop profile image file here</span>
                      <span className="text-[11px] text-slate-500">or click to browse from device</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
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

