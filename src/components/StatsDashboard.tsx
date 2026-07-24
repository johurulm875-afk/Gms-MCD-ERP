import React from 'react';
import { InventoryStats, AppTheme } from '../types';
import { Package, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';

interface StatsDashboardProps {
  stats: InventoryStats;
  activeFilter: string;
  onSelectFilter: (filter: 'ALL' | 'PENDING' | 'PARTIAL' | 'FULFILLED') => void;
  theme?: AppTheme;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats, activeFilter, onSelectFilter, theme = 'light' }) => {
  const isLight = theme === 'light';

  const cardBase = isLight 
    ? 'bg-white border-slate-200 text-slate-900 shadow-xs' 
    : 'bg-slate-900 border-slate-800 text-white shadow-md';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Bookings */}
      <div 
        onClick={() => onSelectFilter('ALL')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${cardBase} ${
          activeFilter === 'ALL' ? 'ring-2 ring-indigo-500 border-indigo-400' : 'hover:border-indigo-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Bookings</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.totalBookings} <span className="text-xs font-semibold text-slate-400">items</span></div>
            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Qty: <span className="font-extrabold">{stats.totalBookingQty.toLocaleString()}</span> YDS
            </div>
          </div>
          <span className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
            All
          </span>
        </div>
      </div>

      {/* 2. Total Received Qty */}
      <div className={`p-4 rounded-2xl border ${cardBase}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Received Qty</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-emerald-500">{stats.totalReceivedQty.toLocaleString()} <span className="text-xs font-semibold text-slate-400">YDS</span></div>
          <div className={`text-xs mt-0.5 flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>In MCD</span>
            <span className="font-bold text-emerald-500">
              {stats.totalBookingQty > 0 ? `${Math.round((stats.totalReceivedQty / stats.totalBookingQty) * 100)}% recv` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Issued/Delivered Qty */}
      <div className={`p-4 rounded-2xl border ${cardBase}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Issued</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-blue-500">{stats.totalIssuedQty.toLocaleString()} <span className="text-xs font-semibold text-slate-400">YDS</span></div>
          <div className={`text-xs mt-0.5 flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>To floor</span>
            <span className="font-bold text-indigo-400">Bal: {stats.totalBalanceQty.toLocaleString()} YDS</span>
          </div>
        </div>
      </div>

      {/* 4. Total Pending Items (Yellow Count) */}
      <div 
        onClick={() => onSelectFilter('PENDING')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
          isLight ? 'bg-amber-50/90 border-amber-200 text-amber-950' : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
        } ${
          activeFilter === 'PENDING' ? 'ring-2 ring-amber-500 border-amber-400' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">Pending Receive</span>
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-black">{stats.totalPendingCount} <span className="text-xs font-semibold text-amber-600">rows</span></div>
            <div className="text-xs font-medium mt-0.5">🟡 Booking raised, 0 Received</div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            Filter 🟡
          </span>
        </div>
      </div>
    </div>
  );
};
