import React, { useMemo } from 'react';
import { TwillTapeItem, SewingThreadItem, DrawstringItem, UserProfile, ActiveTab } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Package, CheckCircle2, Clock, Truck, TrendingUp, Layers, ArrowUpRight, 
  Sparkles, ShieldCheck, ChevronRight, Bookmark, ArrowRight, Tag, Database, PackageCheck
} from 'lucide-react';

interface MainDashboardProps {
  twillItems: TwillTapeItem[];
  sewingItems: SewingThreadItem[];
  drawstringItems?: DrawstringItem[];
  userProfile: UserProfile | null;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  twillItems,
  sewingItems,
  drawstringItems = [],
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

    // Drawstring stats
    const drawstringBookingQty = drawstringItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const drawstringRecvQty = drawstringItems.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
    const drawstringIssueQty = drawstringItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);
    const drawstringPendingCount = drawstringItems.filter(i => i.booking_qty > 0 && i.receive_qty === 0).length;

    return {
      totalBookingsCount: twillItems.length + sewingItems.length + drawstringItems.length,
      totalBookingQty: twillBookingQty + sewingBookingQty + drawstringBookingQty,
      totalReceivedQty: twillRecvQty + sewingRecvQty + drawstringRecvQty,
      totalIssuedQty: twillIssueQty + sewingIssueQty + drawstringIssueQty,
      totalPendingCount: twillPendingCount + sewingPendingCount + drawstringPendingCount,
      twillCount: twillItems.length,
      sewingCount: sewingItems.length,
      drawstringCount: drawstringItems.length,
      twillRecvQty,
      sewingRecvQty,
      drawstringRecvQty
    };
  }, [twillItems, sewingItems, drawstringItems]);

  // Buyer Comparison Data for Recharts Bar Chart
  const buyerChartData = useMemo(() => {
    const buyersMap: Record<string, { buyer: string; twillQty: number; sewingQty: number; drawstringQty: number }> = {};

    twillItems.forEach(item => {
      const b = item.buyer_name || 'Others';
      if (!buyersMap[b]) buyersMap[b] = { buyer: b, twillQty: 0, sewingQty: 0, drawstringQty: 0 };
      buyersMap[b].twillQty += Number(item.receive_qty) || 0;
    });

    sewingItems.forEach(item => {
      const b = item.buyer_name || 'Others';
      if (!buyersMap[b]) buyersMap[b] = { buyer: b, twillQty: 0, sewingQty: 0, drawstringQty: 0 };
      buyersMap[b].sewingQty += Number(item.receive_qty) || 0;
    });

    drawstringItems.forEach(item => {
      const b = item.buyer_name || 'Others';
      if (!buyersMap[b]) buyersMap[b] = { buyer: b, twillQty: 0, sewingQty: 0, drawstringQty: 0 };
      buyersMap[b].drawstringQty += Number(item.receive_qty) || 0;
    });

    return Object.values(buyersMap).slice(0, 8); // Top buyers
  }, [twillItems, sewingItems, drawstringItems]);

  // Pie Chart Data: Module Breakdown
  const pieData = useMemo(() => [
    { name: 'Twill Tape Received', value: Math.round(kpis.twillRecvQty) },
    { name: 'Sewing Thread Received', value: Math.round(kpis.sewingRecvQty) },
    { name: 'Drawstring Received', value: Math.round(kpis.drawstringRecvQty) }
  ], [kpis]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#06b6d4'];

  return (
    <div className="space-y-6 pb-8">
      
      {/* Top Welcome Banner (Clean Light Indigo Gradient) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 border border-indigo-700/30 rounded-2xl p-6 shadow-md relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-400 shadow-md bg-white flex items-center justify-center shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome back, {userProfile?.full_name || 'Md. Johurul Islam'}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-indigo-100 border border-white/30 px-2.5 py-0.5 rounded-full">
                  {userProfile?.role || 'System Developer & Admin'}
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 font-medium mt-1">
                {userProfile?.designation || 'System Administrator & Developer'} • {userProfile?.sector || 'GMS MCD & ACC. Dept.'} (ID: {userProfile?.id_card_no || 'Tst-1024'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab('twill_tape')}
              className="px-3.5 py-2 bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Twill Tape</span>
            </button>

            <button
              onClick={() => onNavigateTab('sewing_thread')}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sewing Thread</span>
            </button>

            <button
              onClick={() => onNavigateTab('drawstring_received')}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Drawstring MCD</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS GRID (Pure White Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{kpis.totalBookingsCount} <span className="text-xs font-semibold text-slate-500">Bookings</span></div>
            <div className="text-xs text-indigo-700 font-semibold mt-1 flex items-center gap-1">
              <span>{kpis.totalBookingQty.toLocaleString()} Total Units</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Twill: {kpis.twillCount}</span>
            <span>Thread: {kpis.sewingCount}</span>
            <span>Drawstring: {kpis.drawstringCount}</span>
          </div>
        </div>

        {/* Card 2: Total Received */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Received Qty</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{Math.round(kpis.totalReceivedQty).toLocaleString()}</div>
            <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <span>Stock Received in Store</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
            <span>Twill: {Math.round(kpis.twillRecvQty).toLocaleString()}</span>
            <span>Thread: {Math.round(kpis.sewingRecvQty).toLocaleString()}</span>
            <span>DS: {Math.round(kpis.drawstringRecvQty).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Total Delivered / Issued */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Delivered (Issued)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{Math.round(kpis.totalIssuedQty).toLocaleString()}</div>
            <div className="text-xs text-blue-700 font-semibold mt-1 flex items-center gap-1">
              <span>Issued to Sewing Floor</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Fulfilled Dispatch Rate</span>
            <span className="text-blue-700 font-extrabold">
              {kpis.totalReceivedQty > 0 ? `${Math.round((kpis.totalIssuedQty / kpis.totalReceivedQty) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Pending */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Pending Items</span>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">{kpis.totalPendingCount} <span className="text-xs font-semibold text-slate-500">Items</span></div>
            <div className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <span>Yellow Status (Awaiting Stock)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Action Required</span>
            <span className="text-amber-700 font-bold">Follow up Challan</span>
          </div>
        </div>

      </div>

      {/* RECHARTS VISUAL ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Buyer Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Buyer-Wise Material Receive Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500">Comparison of Received Qty across Twill Tape vs Sewing Thread</p>
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="buyer" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="twillQty" name="Twill Tape Recv Qty" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sewingQty" name="Sewing Thread Recv Qty" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="drawstringQty" name="Drawstring Recv Qty" fill="#0891b2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Module Ratio Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Inventory Volume Ratio</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Distribution of total store receipts</p>

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
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-slate-600">Twill Tape Total</span>
              </div>
              <span className="text-slate-900 font-mono font-bold">{Math.round(kpis.twillRecvQty).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span className="text-slate-600">Sewing Thread Total</span>
              </div>
              <span className="text-slate-900 font-mono font-bold">{Math.round(kpis.sewingRecvQty).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-600" />
                <span className="text-slate-600">Drawstring Total</span>
              </div>
              <span className="text-slate-900 font-mono font-bold">{Math.round(kpis.drawstringRecvQty).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* QUICK MODULE ACCESS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Module Card 1: Twill Tape */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold">
                Module 1
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{kpis.twillCount} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">🎗️ Twill Tape MCD Management</h4>
            <p className="text-xs text-slate-500 mt-1">
              Manage Twill Tape, Herringbone, H.B. Tape bookings, MCD ref indexes, PDF booking parse, and color-coded statuses.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('twill_tape')}
            className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Open Twill Tape MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 2: Sewing Thread */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                Module 2
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{kpis.sewingCount} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">🧵 Sewing Thread MCD Management</h4>
            <p className="text-xs text-slate-500 mt-1">
              Track Thread Count, Shade No, Spun Polyester cones, PDF booking parse, and issue/receive logs.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('sewing_thread')}
            className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Open Sewing Thread MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 3: Daily Drawstring Received Update */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-xs font-bold">
                Module 3
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">Daily Update</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">🧶 Daily Drawstring Received Update</h4>
            <p className="text-xs text-slate-500 mt-1">
              Log daily received drawstring quantities, delivery challans, round/flat drawstring types, and real-time store balances.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('drawstring_received')}
            className="mt-6 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Open Drawstring Receive Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 4: Planning */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-violet-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-full text-xs font-bold">
                Module 4
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">MRP & Plan</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">📅 Accessories & Store Planning</h4>
            <p className="text-xs text-slate-500 mt-1">
              Plan material requirements, target delivery schedules, buyer allocations, and store pipeline.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('planning')}
            className="mt-6 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Open Planning Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 5: Report */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-cyan-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded-full text-xs font-bold">
                Module 5
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">Analytics</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">📊 Store Inventory & Receive Report</h4>
            <p className="text-xs text-slate-500 mt-1">
              Executive store reports, date range filtering, buyer-wise summary, and print/export features.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('report')}
            className="mt-6 w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>View Full Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
