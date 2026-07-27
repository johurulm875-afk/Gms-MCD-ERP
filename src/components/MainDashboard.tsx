import React, { useState, useMemo } from 'react';
import { TwillTapeItem, SewingThreadItem, DrawstringItem, UserProfile, ActiveTab } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid
} from 'recharts';
import { 
  Package, Sparkles, ShieldCheck, ArrowRight, PackageCheck,
  Award, BarChart2, PieChart as PieIcon
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
  // Selected Chart View Tab
  const [activeChartTab, setActiveChartTab] = useState<'OVERVIEW' | 'SEWING' | 'TWILL' | 'DRAWSTRING'>('OVERVIEW');

  // Comprehensive Metrics Calculation
  const metrics = useMemo(() => {
    // 1. Sewing Thread Metrics (Unit: CONE)
    const sewingBooking = sewingItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const sewingRecv = sewingItems.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
    const sewingDue = Math.max(0, sewingBooking - sewingRecv);
    const sewingIssued = sewingItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);

    // 2. Twill Tape Metrics (Unit: YDS)
    const twillBooking = twillItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const twillRecv = twillItems.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
    const twillDue = Math.max(0, twillBooking - twillRecv);
    const twillIssued = twillItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);

    // 3. Drawstring Metrics (Unit: PCS)
    const dsBooking = drawstringItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
    const dsRecv = drawstringItems.reduce((acc, i) => acc + (Number(i.receive_qty ?? i.rcv_qty) || 0), 0);
    const dsDue = Math.max(0, dsBooking - dsRecv);
    const dsIssued = drawstringItems.reduce((acc, i) => acc + (Number(i.issue_qty) || 0), 0);

    return {
      sewing: { booking: sewingBooking, recv: sewingRecv, due: sewingDue, issued: sewingIssued, count: sewingItems.length },
      twill: { booking: twillBooking, recv: twillRecv, due: twillDue, issued: twillIssued, count: twillItems.length },
      ds: { booking: dsBooking, recv: dsRecv, due: dsDue, issued: dsIssued, count: drawstringItems.length }
    };
  }, [sewingItems, twillItems, drawstringItems]);

  // Main Category Comparison Chart Data
  const categoryChartData = useMemo(() => [
    {
      name: '🧵 Sewing Thread',
      shortName: 'Sewing Thread',
      unit: 'CONE',
      Booking: Math.round(metrics.sewing.booking),
      Received: Math.round(metrics.sewing.recv),
      Due: Math.round(metrics.sewing.due)
    },
    {
      name: '🎗️ Twill Tape',
      shortName: 'Twill Tape',
      unit: 'YDS',
      Booking: Math.round(metrics.twill.booking),
      Received: Math.round(metrics.twill.recv),
      Due: Math.round(metrics.twill.due)
    },
    {
      name: '🧶 Drawstring',
      shortName: 'Drawstring',
      unit: 'PCS',
      Booking: Math.round(metrics.ds.booking),
      Received: Math.round(metrics.ds.recv),
      Due: Math.round(metrics.ds.due)
    }
  ], [metrics]);

  // Buyer Level Chart Data for Individual Item Types
  const buyerSpecificChartData = useMemo(() => {
    const map: Record<string, { buyer: string; sewingBooking: number; sewingRecv: number; sewingDue: number; twillBooking: number; twillRecv: number; twillDue: number; dsBooking: number; dsRecv: number; dsDue: number }> = {};

    sewingItems.forEach(i => {
      const b = (i.buyer_name || i.buyer || 'Others').trim();
      if (!map[b]) map[b] = { buyer: b, sewingBooking: 0, sewingRecv: 0, sewingDue: 0, twillBooking: 0, twillRecv: 0, twillDue: 0, dsBooking: 0, dsRecv: 0, dsDue: 0 };
      const bk = Number(i.booking_qty) || 0;
      const rc = Number(i.receive_qty) || 0;
      map[b].sewingBooking += bk;
      map[b].sewingRecv += rc;
      map[b].sewingDue += Math.max(0, bk - rc);
    });

    twillItems.forEach(i => {
      const b = (i.buyer_name || i.buyer || 'Others').trim();
      if (!map[b]) map[b] = { buyer: b, sewingBooking: 0, sewingRecv: 0, sewingDue: 0, twillBooking: 0, twillRecv: 0, twillDue: 0, dsBooking: 0, dsRecv: 0, dsDue: 0 };
      const bk = Number(i.booking_qty) || 0;
      const rc = Number(i.receive_qty) || 0;
      map[b].twillBooking += bk;
      map[b].twillRecv += rc;
      map[b].twillDue += Math.max(0, bk - rc);
    });

    drawstringItems.forEach(i => {
      const b = (i.buyer_name || i.buyer || 'Others').trim();
      if (!map[b]) map[b] = { buyer: b, sewingBooking: 0, sewingRecv: 0, sewingDue: 0, twillBooking: 0, twillRecv: 0, twillDue: 0, dsBooking: 0, dsRecv: 0, dsDue: 0 };
      const bk = Number(i.booking_qty) || 0;
      const rc = Number(i.receive_qty ?? i.rcv_qty) || 0;
      map[b].dsBooking += bk;
      map[b].dsRecv += rc;
      map[b].dsDue += Math.max(0, bk - rc);
    });

    return Object.values(map).slice(0, 10);
  }, [sewingItems, twillItems, drawstringItems]);

  // Pie Chart Data: Overall Status Ratio
  const pieData = useMemo(() => [
    { name: 'Sewing Thread Due', value: Math.round(metrics.sewing.due), unit: 'CONE', color: '#10b981' },
    { name: 'Twill Tape Due', value: Math.round(metrics.twill.due), unit: 'YDS', color: '#6366f1' },
    { name: 'Drawstring Due', value: Math.round(metrics.ds.due), unit: 'PCS', color: '#14b8a6' }
  ], [metrics]);

  // Custom Chart Tooltip displaying exact numbers + specific unit
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-2 z-50">
          <p className="font-black text-amber-300 text-sm border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              GMS Store Analytics
            </span>
          </p>
          {payload.map((entry: any, index: number) => {
            const val = Number(entry.value) || 0;
            // Determine unit based on chart tab or item name
            let unitLabel = '';
            if (activeChartTab === 'SEWING') unitLabel = 'CONE';
            else if (activeChartTab === 'TWILL') unitLabel = 'YDS';
            else if (activeChartTab === 'DRAWSTRING') unitLabel = 'PCS';
            else if (entry.payload?.unit) unitLabel = entry.payload.unit;
            else if (label?.includes('Sewing')) unitLabel = 'CONE';
            else if (label?.includes('Twill')) unitLabel = 'YDS';
            else if (label?.includes('Drawstring')) unitLabel = 'PCS';

            return (
              <div key={`tooltip-${index}`} className="flex items-center justify-between gap-6 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300 font-bold">{entry.name}:</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-white">{val.toLocaleString()}</span>
                  {unitLabel && (
                    <span className="ml-1.5 font-black text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
                      {unitLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. TOP WELCOME BANNER */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 border border-indigo-800/40 rounded-3xl p-6 shadow-lg relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-white flex items-center justify-center shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <ShieldCheck className="w-9 h-9 text-indigo-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome back, {userProfile?.full_name || 'Md. Johurul Islam'}
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  {userProfile?.role || 'Developer & Admin'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium mt-1">
                {userProfile?.designation || 'System Administrator & Developer'} • {userProfile?.sector || 'GMS MCD & ACC. Dept.'} (ID: {userProfile?.id_card_no || 'Tst-1024'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab('sewing_thread')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sewing Thread</span>
            </button>

            <button
              onClick={() => onNavigateTab('twill_tape')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Twill Tape</span>
            </button>

            <button
              onClick={() => onNavigateTab('drawstring_received')}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Drawstring MCD</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. OVERALL STORE HIGHLIGHT BANNER WITH EXACT UNITS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-indigo-800/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-900/60 text-amber-400 rounded-2xl border border-indigo-700/50 shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                GMS MCD MATERIAL SUMMARY
              </span>
              <span className="text-xs font-black text-indigo-200 uppercase tracking-wide">
                (SEWING THREAD: CONE • TWILL TAPE: YDS • DRAWSTRING: PCS)
              </span>
            </div>
            <p className="text-xs font-medium text-slate-300 mt-1">
              Live material totals displayed in their standard factory units: <strong className="text-emerald-400">Sewing Thread (CONE)</strong>, <strong className="text-indigo-400">Twill Tape (YDS)</strong>, and <strong className="text-teal-400">Drawstring (PCS)</strong>.
            </p>
          </div>
        </div>

        {/* Quick Unit Summary */}
        <div className="flex items-center gap-2 flex-wrap font-mono">
          <div className="bg-slate-950/80 text-white px-3.5 py-2 rounded-xl border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
            <span className="text-emerald-400">🧵 Sewing Thread Due:</span>
            <span className="text-white">{metrics.sewing.due.toLocaleString()} CONE</span>
          </div>

          <div className="bg-slate-950/80 text-white px-3.5 py-2 rounded-xl border border-indigo-500/40 text-xs font-black flex items-center gap-1.5">
            <span className="text-indigo-400">🎗️ Twill Tape Due:</span>
            <span className="text-white">{metrics.twill.due.toLocaleString()} YDS</span>
          </div>

          <div className="bg-slate-950/80 text-white px-3.5 py-2 rounded-xl border border-teal-500/40 text-xs font-black flex items-center gap-1.5">
            <span className="text-teal-400">🧶 Drawstring Due:</span>
            <span className="text-white">{metrics.ds.due.toLocaleString()} PCS</span>
          </div>
        </div>
      </div>

      {/* 3. MATERIAL-WISE SUMMARY CARDS WITH CONE / YDS / PCS UNITS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: SEWING THREAD BREAKDOWN (CONE) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 rounded-3xl p-5 shadow-sm space-y-4 hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black">
                🧵
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Sewing Thread
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.sewing.count} Total Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Unit: CONE
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-bold">Booking Qty:</span>
              <div className="text-right">
                <span className="font-black text-slate-900 dark:text-white">{metrics.sewing.booking.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  CONE
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Received Qty:</span>
              <div className="text-right">
                <span className="font-black text-emerald-700 dark:text-emerald-300">{metrics.sewing.recv.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-emerald-700 bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded">
                  CONE
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
              <span className="text-amber-700 dark:text-amber-400 font-bold">Remaining Due:</span>
              <div className="text-right">
                <span className="font-black text-amber-700 dark:text-amber-300">{metrics.sewing.due.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-amber-700 bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  CONE
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-bold">
              <span>Receive Completion:</span>
              <span className="text-emerald-600 font-mono">
                {metrics.sewing.booking > 0 ? `${Math.round((metrics.sewing.recv / metrics.sewing.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.sewing.booking > 0 ? Math.min(100, (metrics.sewing.recv / metrics.sewing.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: TWILL TAPE BREAKDOWN (YDS) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-3xl p-5 shadow-sm space-y-4 hover:border-indigo-500 transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-black">
                🎗️
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Twill Tape
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.twill.count} Total Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              Unit: YDS
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-bold">Booking Qty:</span>
              <div className="text-right">
                <span className="font-black text-slate-900 dark:text-white">{metrics.twill.booking.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-800">
                  YDS
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50">
              <span className="text-indigo-700 dark:text-indigo-400 font-bold">Received Qty:</span>
              <div className="text-right">
                <span className="font-black text-indigo-700 dark:text-indigo-300">{metrics.twill.recv.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-indigo-700 bg-indigo-200 dark:bg-indigo-900 px-1.5 py-0.5 rounded">
                  YDS
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
              <span className="text-amber-700 dark:text-amber-400 font-bold">Remaining Due:</span>
              <div className="text-right">
                <span className="font-black text-amber-700 dark:text-amber-300">{metrics.twill.due.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-amber-700 bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  YDS
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-bold">
              <span>Receive Completion:</span>
              <span className="text-indigo-600 font-mono">
                {metrics.twill.booking > 0 ? `${Math.round((metrics.twill.recv / metrics.twill.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.twill.booking > 0 ? Math.min(100, (metrics.twill.recv / metrics.twill.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: DRAWSTRING BREAKDOWN (PCS) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-teal-500/30 rounded-3xl p-5 shadow-sm space-y-4 hover:border-teal-500 transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-black">
                🧶
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Drawstring
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.ds.count} Total Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Unit: PCS
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-bold">Booking Qty:</span>
              <div className="text-right">
                <span className="font-black text-slate-900 dark:text-white">{metrics.ds.booking.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-teal-600 bg-teal-100 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-800">
                  PCS
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50">
              <span className="text-teal-700 dark:text-teal-400 font-bold">Received Qty:</span>
              <div className="text-right">
                <span className="font-black text-teal-700 dark:text-teal-300">{metrics.ds.recv.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-teal-700 bg-teal-200 dark:bg-teal-900 px-1.5 py-0.5 rounded">
                  PCS
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
              <span className="text-amber-700 dark:text-amber-400 font-bold">Remaining Due:</span>
              <div className="text-right">
                <span className="font-black text-amber-700 dark:text-amber-300">{metrics.ds.due.toLocaleString()}</span>
                <span className="ml-1.5 text-[10px] font-black text-amber-700 bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  PCS
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-bold">
              <span>Receive Completion:</span>
              <span className="text-teal-600 font-mono">
                {metrics.ds.booking > 0 ? `${Math.round((metrics.ds.recv / metrics.ds.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.ds.booking > 0 ? Math.min(100, (metrics.ds.recv / metrics.ds.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 4. SMART INTERACTIVE RECHARTS SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* CHART HEADER & TAB NAVIGATION SWITCHER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                GMS Executive Analytics & Material Charts
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live visual comparison of Booking Qty, Received Qty, and Remaining Due Qty with respective units.
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveChartTab('OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'OVERVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📊 Overview All Items
            </button>

            <button
              onClick={() => setActiveChartTab('SEWING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'SEWING'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🧵 Sewing Thread (CONE)
            </button>

            <button
              onClick={() => setActiveChartTab('TWILL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'TWILL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🎗️ Twill Tape (YDS)
            </button>

            <button
              onClick={() => setActiveChartTab('DRAWSTRING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'DRAWSTRING'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🧶 Drawstring (PCS)
            </button>
          </div>
        </div>

        {/* CHART AREA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: MAIN COMPOSED / BAR CHART */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                {activeChartTab === 'OVERVIEW' && 'All Materials Booking vs Received vs Due Comparison'}
                {activeChartTab === 'SEWING' && 'Buyer-Wise Sewing Thread Booking, Recv & Due Chart (CONE)'}
                {activeChartTab === 'TWILL' && 'Buyer-Wise Twill Tape Booking, Recv & Due Chart (YDS)'}
                {activeChartTab === 'DRAWSTRING' && 'Buyer-Wise Drawstring Booking, Recv & Due Chart (PCS)'}
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                Units: Sewing Thread (CONE) • Twill Tape (YDS) • Drawstring (PCS)
              </span>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'OVERVIEW' ? (
                  <BarChart data={categoryChartData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="shortName" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Booking" name="Booking Qty" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Received" name="Received Qty" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Due" name="Remaining Due Qty" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart 
                    data={buyerSpecificChartData.map(b => ({
                      buyer: b.buyer,
                      Booking: Math.round(activeChartTab === 'SEWING' ? b.sewingBooking : activeChartTab === 'TWILL' ? b.twillBooking : b.dsBooking),
                      Received: Math.round(activeChartTab === 'SEWING' ? b.sewingRecv : activeChartTab === 'TWILL' ? b.twillRecv : b.dsRecv),
                      Due: Math.round(activeChartTab === 'SEWING' ? b.sewingDue : activeChartTab === 'TWILL' ? b.twillDue : b.dsDue),
                    }))} 
                    margin={{ top: 20, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="buyer" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Booking" name="Booking Qty" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Received" name="Received Qty" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Due" name="Remaining Due Qty" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: PIE RATIO & MATERIAL DUE SUMMARY */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-emerald-500" />
                  <span>Material Wise Remaining Due Breakdown</span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Distribution of pending due materials across Sewing Thread, Twill Tape, and Drawstring.
              </p>

              <div className="h-[180px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Always Visible Summary List with exact units */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>🧵 Sewing Thread Due:</span>
                </span>
                <span className="font-black text-slate-900 dark:text-white">
                  {metrics.sewing.due.toLocaleString()} CONE
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-indigo-600 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>🎗️ Twill Tape Due:</span>
                </span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">
                  {metrics.twill.due.toLocaleString()} YDS
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-teal-600 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span>🧶 Drawstring Due:</span>
                </span>
                <span className="font-black text-teal-600 dark:text-teal-400">
                  {metrics.ds.due.toLocaleString()} PCS
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. TOP BUYERS MATERIAL BREAKDOWN TABLE WITH EXACT UNITS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
              Top Buyers Material Summary & Due Breakdown
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {buyerSpecificChartData.length} Buyers Loaded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Buyer Name</th>
                <th className="py-3 px-3 text-right">🧵 Sewing Thread Due (CONE)</th>
                <th className="py-3 px-3 text-right">🎗️ Twill Tape Due (YDS)</th>
                <th className="py-3 px-3 text-right">🧶 Drawstring Due (PCS)</th>
                <th className="py-3 px-3 text-center bg-slate-200/60 dark:bg-slate-800 text-slate-900 dark:text-white">Buyer Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium font-mono">
              {buyerSpecificChartData.map((b, idx) => {
                const totalItemsCount = (b.sewingDue > 0 ? 1 : 0) + (b.twillDue > 0 ? 1 : 0) + (b.dsDue > 0 ? 1 : 0);

                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 dark:text-white font-sans">
                      {b.buyer}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-bold">
                      {b.sewingDue > 0 ? `${b.sewingDue.toLocaleString()} CONE` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-600 font-bold">
                      {b.twillDue > 0 ? `${b.twillDue.toLocaleString()} YDS` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-teal-600 font-bold">
                      {b.dsDue > 0 ? `${b.dsDue.toLocaleString()} PCS` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center bg-slate-50/60 dark:bg-slate-950/30">
                      {totalItemsCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-400/40">
                          {totalItemsCount} Material(s) Pending
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-400/40">
                          All Received
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. QUICK MODULE ACCESS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Module Card 1: Twill Tape */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold">
                Module 1
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.twill.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">🎗️ Twill Tape MCD</h4>
            <p className="text-xs text-slate-500 mt-1">
              Manage Twill Tape, Herringbone, H.B. Tape bookings, store refs, PDF parse, and statuses (Unit: YDS).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('twill_tape')}
            className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>Open Twill Tape MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 2: Sewing Thread */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">
                Module 2
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.sewing.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">🧵 Sewing Thread MCD</h4>
            <p className="text-xs text-slate-500 mt-1">
              Track Thread Count, Shade No, Spun Polyester cones, PDF parse, and issue/receive logs (Unit: CONE).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('sewing_thread')}
            className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>Open Sewing Thread MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 3: Daily Drawstring Received Update */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-teal-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-bold">
                Module 3
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.ds.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">🧶 Drawstring MCD Log</h4>
            <p className="text-xs text-slate-500 mt-1">
              Log daily received drawstring quantities, delivery challans, round/flat types, and real-time balances (Unit: PCS).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('drawstring_received')}
            className="mt-5 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>Open Drawstring MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 4: Daily Drawstring Due Report */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">
                Module 5
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">Due Reports</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">📊 Drawstring & Thread Due Report</h4>
            <p className="text-xs text-slate-500 mt-1">
              Executive daily drawstring and sewing thread due lists with Excel & PDF exports.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('report')}
            className="mt-5 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <span>Open Due List Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
