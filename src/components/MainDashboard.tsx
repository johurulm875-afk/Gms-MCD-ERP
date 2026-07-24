import React, { useMemo } from 'react';
import { TwillTapeItem, SewingThreadItem, UserProfile, ActiveTab } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Package, CheckCircle2, Clock, Truck, TrendingUp, Layers, ArrowUpRight, 
  Sparkles, ShieldCheck, ChevronRight, Bookmark, ArrowRight, Tag, Database
} from 'lucide-react';

interface MainDashboardProps {
  twillItems: TwillTapeItem[];
  sewingItems: SewingThreadItem[];
  userProfile: UserProfile | null;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  twillItems,
  sewingItems,
  userProfile,
  onNavigateTab
}) => {
  // Combined KPI Stats
  const kpis = useMemo(() => {
    // Twill stats
    const twillBookingQty = twillItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const twillRecvQty = twillItems.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
    const twillIssueQty = twillItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);
    const twillPendingCount = twillItems.filter(i => i.booking_qty > 0 && i.receive_qty === 0).length;

    // Sewing stats
    const sewingBookingQty = sewingItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const sewingRecvQty = sewingItems.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
    const sewingIssueQty = sewingItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);
    const sewingPendingCount = sewingItems.filter(i => i.booking_qty > 0 && i.receive_qty === 0).length;

    return {
      totalBookingsCount: twillItems.length + sewingItems.length,
      totalBookingQty: twillBookingQty + sewingBookingQty,
      totalReceivedQty: twillRecvQty + sewingRecvQty,
      totalIssuedQty: twillIssueQty + sewingIssueQty,
      totalPendingCount: twillPendingCount + sewingPendingCount,
      twillCount: twillItems.length,
      sewingCount: sewingItems.length,
      twillRecvQty,
      sewingRecvQty
    };
  }, [twillItems, sewingItems]);

  // Buyer Comparison Data for Recharts Bar Chart
  const buyerChartData = useMemo(() => {
    const buyersMap: Record<string, { buyer: string; twillQty: number; sewingQty: number }> = {};

    twillItems.forEach(item => {
      const b = item.buyer_name || 'Others';
      if (!buyersMap[b]) buyersMap[b] = { buyer: b, twillQty: 0, sewingQty: 0 };
      buyersMap[b].twillQty += Number(item.receive_qty) || 0;
    });

    sewingItems.forEach(item => {
      const b = item.buyer_name || 'Others';
      if (!buyersMap[b]) buyersMap[b] = { buyer: b, twillQty: 0, sewingQty: 0 };
      buyersMap[b].sewingQty += Number(item.receive_qty) || 0;
    });

    return Object.values(buyersMap).slice(0, 8); // Top buyers
  }, [twillItems, sewingItems]);

  // Pie Chart Data: Module Breakdown
  const pieData = useMemo(() => [
    { name: 'Twill Tape Received', value: Math.round(kpis.twillRecvQty) },
    { name: 'Sewing Thread Received', value: Math.round(kpis.sewingRecvQty) }
  ], [kpis]);

  const PIE_COLORS = ['#6366f1', '#10b981'];

  return (
    <div className="space-y-6 pb-8">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-md bg-slate-800 flex items-center justify-center shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Welcome back, {userProfile?.full_name || 'Md. Johurul Islam'}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                  {userProfile?.role || 'System Developer & Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {userProfile?.designation || 'System Administrator & Developer'} • {userProfile?.sector || 'GMS MCD & ACC. Dept.'} (ID: {userProfile?.id_card_no || 'Tst-1024'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('twill_tape')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Twill Tape MCD</span>
            </button>

            <button
              onClick={() => onNavigateTab('sewing_thread')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sewing Thread MCD</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Bookings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bookings</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{kpis.totalBookingsCount} <span className="text-xs font-semibold text-slate-400">Bookings</span></div>
            <div className="text-xs text-indigo-300 font-semibold mt-1 flex items-center gap-1">
              <span>{kpis.totalBookingQty.toLocaleString()} Total Units</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Twill Tape: {kpis.twillCount}</span>
            <span>Sewing Thread: {kpis.sewingCount}</span>
          </div>
        </div>

        {/* Card 2: Total Received */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received Qty</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{Math.round(kpis.totalReceivedQty).toLocaleString()}</div>
            <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <span>Stock Received in Store</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Twill: {Math.round(kpis.twillRecvQty).toLocaleString()}</span>
            <span>Thread: {Math.round(kpis.sewingRecvQty).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Total Delivered / Issued */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Delivered (Issued)</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{Math.round(kpis.totalIssuedQty).toLocaleString()}</div>
            <div className="text-xs text-blue-400 font-semibold mt-1 flex items-center gap-1">
              <span>Issued to Sewing Floor</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Fulfilled Dispatch Rate</span>
            <span className="text-blue-300 font-bold">
              {kpis.totalReceivedQty > 0 ? `${Math.round((kpis.totalIssuedQty / kpis.totalReceivedQty) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Pending */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pending Items</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400">{kpis.totalPendingCount} <span className="text-xs font-semibold text-slate-400">Items</span></div>
            <div className="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1">
              <span>Yellow Status (Awaiting Stock)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Action Required</span>
            <span className="text-amber-400 font-bold">Follow up Challan</span>
          </div>
        </div>

      </div>

      {/* RECHARTS VISUAL ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Buyer Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Buyer-Wise Material Receive Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400">Comparison of Received Qty across Twill Tape vs Sewing Thread</p>
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="buyer" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="twillQty" name="Twill Tape Recv Qty" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sewingQty" name="Sewing Thread Recv Qty" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Module Ratio Pie Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Inventory Volume Ratio</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">Distribution of total store receipts</p>

            <div className="h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-slate-300">Twill Tape Total</span>
              </div>
              <span className="text-white font-mono">{Math.round(kpis.twillRecvQty).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Sewing Thread Total</span>
              </div>
              <span className="text-white font-mono">{Math.round(kpis.sewingRecvQty).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* QUICK MODULE ACCESS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Module Card 1: Twill Tape */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold">
                Module 1
              </span>
              <span className="text-xs text-slate-400 font-mono">{kpis.twillCount} Bookings Active</span>
            </div>
            <h4 className="text-lg font-extrabold text-white">🎗️ Twill Tape MCD Management</h4>
            <p className="text-xs text-slate-400 mt-1">
              Manage Twill Tape, Herringbone, H.B. Tape bookings, MCD ref indexes, PDF booking parse, and color-coded statuses.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('twill_tape')}
            className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>Open Twill Tape MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 2: Sewing Thread */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                Module 2
              </span>
              <span className="text-xs text-slate-400 font-mono">{kpis.sewingCount} Bookings Active</span>
            </div>
            <h4 className="text-lg font-extrabold text-white">🧵 Sewing Thread MCD Management</h4>
            <p className="text-xs text-slate-400 mt-1">
              Track Thread Count, Shade No, Spun Polyester cones, PDF booking parse, and issue/receive logs.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('sewing_thread')}
            className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>Open Sewing Thread MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 3: Daily Drawstring Received Update */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-teal-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-bold">
                Module 3
              </span>
              <span className="text-xs text-slate-400 font-mono">Daily Update</span>
            </div>
            <h4 className="text-lg font-extrabold text-white">🧶 Daily Drawstring Received Update</h4>
            <p className="text-xs text-slate-400 mt-1">
              Log daily received drawstring quantities, delivery challans, round/flat drawstring types, and real-time store balances.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('drawstring_received')}
            className="mt-6 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>Open Drawstring Receive Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 4: Planning */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-violet-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-xs font-bold">
                Module 4
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">MRP & Plan</span>
            </div>
            <h4 className="text-lg font-extrabold text-white">📅 Accessories & Store Planning</h4>
            <p className="text-xs text-slate-400 mt-1">
              Plan material requirements, target delivery schedules, buyer allocations, and store pipeline.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('planning')}
            className="mt-6 w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>Open Planning Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 5: Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-cyan-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-bold">
                Module 5
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">Analytics</span>
            </div>
            <h4 className="text-lg font-extrabold text-white">📊 Store Inventory & Receive Report</h4>
            <p className="text-xs text-slate-400 mt-1">
              Executive store reports, date range filtering, buyer-wise summary, and print/export features.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('report')}
            className="mt-6 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>View Full Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
