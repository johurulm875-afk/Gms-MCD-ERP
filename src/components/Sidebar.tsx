import React from 'react';
import { ActiveTab, UserProfile, AppTheme } from '../types';
import { GmsLogo } from './GmsLogo';
import { 
  LayoutDashboard, Package, Sparkles, User, BadgeCheck, Shield, 
  LogOut, Layers, Database, PanelLeftClose, PanelLeftOpen, Users,
  PackageCheck, FileText, CalendarDays
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isConnected: boolean;
  onOpenDbSetup: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: AppTheme;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onLogout,
  isConnected,
  onOpenDbSetup,
  isCollapsed = false,
  onToggleCollapse,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      badge: 'KPIs',
      color: 'text-indigo-500',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
    },
    {
      id: 'twill_tape' as ActiveTab,
      label: 'Twill Tape MCD',
      icon: Package,
      badge: 'Live',
      color: 'text-blue-500',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
    },
    {
      id: 'sewing_thread' as ActiveTab,
      label: 'Sewing Thread MCD',
      icon: Sparkles,
      badge: 'New',
      color: 'text-emerald-500',
      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
    },
    {
      id: 'drawstring_received' as ActiveTab,
      label: 'Daily Drawstring Received Update',
      icon: PackageCheck,
      badge: 'Daily',
      color: 'text-teal-500',
      activeBg: 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
    },
    {
      id: 'planning' as ActiveTab,
      label: 'Planning',
      icon: CalendarDays,
      badge: 'Plan',
      color: 'text-violet-500',
      activeBg: 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
    },
    {
      id: 'report' as ActiveTab,
      label: 'Report',
      icon: FileText,
      badge: 'Report',
      color: 'text-cyan-500',
      activeBg: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
    },
    {
      id: 'admin' as ActiveTab,
      label: 'Admin Panel',
      icon: Shield,
      badge: 'Users',
      color: 'text-amber-500',
      activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20',
      adminOnly: true
    },
    {
      id: 'profile' as ActiveTab,
      label: 'User Profile',
      icon: User,
      badge: userProfile?.username ? userProfile.username.split('@')[0] : 'Profile',
      color: 'text-purple-500',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
    }
  ];

  const isAdmin = userProfile?.role === 'ADMINISTRATOR' || 
    userProfile?.username?.toLowerCase() === 'admin@gms.com' || 
    userProfile?.username?.toLowerCase() === 'johurul';

  return (
    <aside className={`border-r flex flex-col justify-between h-full min-h-screen shrink-0 shadow-2xl z-30 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } ${
      isLight 
        ? 'bg-white border-slate-200 text-slate-800' 
        : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      
      {/* Top Header Logo & Brand */}
      <div>
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-2 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        } ${
          isCollapsed ? 'flex-col justify-center px-2' : ''
        }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <GmsLogo size={36} className="w-9 h-9" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className={`text-sm font-black tracking-tight leading-tight truncate ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  GMS MCD ERP
                </h2>
                <p className={`text-[10px] font-bold truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>GMS MCD ERP SYSTEM</p>
              </div>
            )}
          </div>

          {/* Toggle Sidebar Collapse Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isCollapsed ? "Expand Sidebar" : "Hide / Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-indigo-500" /> : <PanelLeftClose className="w-4 h-4 text-slate-400" />}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1.5 mt-2">
          {!isCollapsed && (
            <span className={`px-3 text-[10px] font-extrabold uppercase tracking-wider block mb-2 ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Main Navigation
            </span>
          )}

          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? `${item.label} (${item.badge})` : undefined}
                className={`w-full rounded-xl text-xs font-bold transition-all flex items-center group ${
                  isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between'
                } ${
                  isActive
                    ? item.activeBg
                    : isLight 
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isLight 
                        ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Database Status Button */}
        <div className="px-3 mt-4">
          <button
            type="button"
            onClick={onOpenDbSetup}
            title={isCollapsed ? (isConnected ? "Supabase Connected" : "Supabase Offline") : undefined}
            className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center transition-all ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
              <Database className="w-4 h-4 text-emerald-500 shrink-0" />
              {!isCollapsed && <span>Supabase DB</span>}
            </div>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'} ${isCollapsed ? 'ml-1' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sidebar Footer: Logged in user & Developer Badge */}
      <div className={`p-4 border-t space-y-3 ${
        isLight ? 'border-slate-200 bg-slate-50/80' : 'border-slate-800 bg-slate-950/60'
      } ${isCollapsed ? 'p-2' : ''}`}>
        
        {/* User Mini Profile */}
        <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-indigo-500/40 bg-slate-800 shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-1 text-slate-400" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {userProfile?.full_name || 'Md. Johurul Islam'}
                </p>
                <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {userProfile?.designation || 'System Administrator'}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-slate-200' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Developer Badge Footer */}
        {!isCollapsed && (
          <div className={`pt-2 border-t text-center ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <BadgeCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>System Developer: <strong className={isLight ? 'text-slate-900' : 'text-white'}>Md. Johurul Islam</strong></span>
            </div>
          </div>
        )}

      </div>

    </aside>
  );
};


