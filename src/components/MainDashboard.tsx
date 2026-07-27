import React, { useState, useMemo } from 'react';
import { TwillTapeItem, SewingThreadItem, DrawstringItem, UserProfile, ActiveTab } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid
} from 'recharts';
import { 
  Package, Sparkles, ShieldCheck, ArrowRight, PackageCheck,
  Award, BarChart2, PieChart as PieIcon, Zap
} from 'lucide-react';

interface MainDashboardProps {
  twillItems: TwillTapeItem[];
  sewingItems: SewingThreadItem[];
  drawstringItems?: DrawstringItem[];
  userProfile: UserProfile | null;
  onNavigateTab: (tab: ActiveTab) => void;
}

// Helper to format numbers cleanly with comma separators
export function formatQuantityLabel(qty: number): string {
  const num = Math.max(0, Number(qty) || 0);
  return num.toLocaleString();
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
    { name: 'Drawstring Due', value: Math.round(metrics.ds.due), unit: 'PCS', color: '#0ea5e9' }
  ], [metrics]);

  // Custom Chart Tooltip displaying exact numbers + specific unit (Light Theme)
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border-2 border-indigo-200 text-slate-900 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <p className="font-black text-indigo-950 text-sm border-b border-indigo-100 pb-1 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              <span>{label}</span>
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-300 font-mono font-bold">
              GMS Analytics
            </span>
          </p>
          {payload.map((entry: any, index: number) => {
            const val = Number(entry.value) || 0;
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
                  <span className="text-slate-700 font-bold">{entry.name}:</span>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900">{val.toLocaleString()}</span>
                  {unitLabel && (
                    <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
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
    <div className="space-y-6 pb-12 font-sans">
      
      {/* 1. TOP WELCOME BANNER (BRIGHT WHITE & ELEGANT SKY/INDIGO GRADIENT) */}
      <div className="bg-gradient-to-r from-white via-indigo-50/90 to-sky-50/90 border-2 border-indigo-200/90 rounded-3xl p-6 shadow-md relative overflow-hidden text-slate-900 transition-all duration-300 hover:shadow-xl">
        {/* Animated Glow Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
        
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* ENLARGED PROFILE PICTURE WITH THICK BORDER & COLORFUL ROTATING LIGHT RING */}
            <div className="relative p-[5px] rounded-3xl group shrink-0">
              {/* Spinning Colorful Rainbow Light Ring Effect */}
              <div className="absolute -inset-1.5 rounded-3xl bg-[conic-gradient(from_0deg,#ff0000,#ff8800,#ffff00,#00ff66,#00ffff,#0066ff,#cc00ff,#ff0000)] animate-[spin_3.5s_linear_infinite] blur-[3px] opacity-90 group-hover:opacity-100 transition duration-300" />
              
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[22px] overflow-hidden border-4 border-white shadow-2xl bg-slate-950 flex items-center justify-center">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile?.full_name || 'User Profile'} 
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <ShieldCheck className="w-14 h-14 text-indigo-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Welcome back, {userProfile?.full_name || 'Md. Johurul Islam'}</span>
                  <span className="inline-block animate-bounce text-amber-500">✨</span>
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full shadow-xs border border-amber-300 animate-pulse">
                  {userProfile?.role || 'Developer & Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{userProfile?.designation || 'System Administrator & Developer'}</span>
                <span>•</span>
                <span>{userProfile?.sector || 'GMS MCD & ACC. Dept.'}</span>
                <span className="font-mono text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md font-bold text-[10px]">
                  ID: {userProfile?.id_card_no || 'Tst-1024'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Navigation Fast Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab('sewing_thread')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Sewing Thread</span>
            </button>

            <button
              onClick={() => onNavigateTab('twill_tape')}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Twill Tape</span>
            </button>

            <button
              onClick={() => onNavigateTab('drawstring_received')}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Drawstring MCD</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. OVERALL STORE HIGHLIGHT BANNER */}
      <div className="bg-gradient-to-r from-white via-indigo-50/80 to-sky-50/80 text-slate-900 p-5 rounded-3xl shadow-md border-2 border-indigo-200 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        
        {/* Shimmer Light Bar Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-sky-500 animate-pulse" />

        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl shadow-md shrink-0 animate-bounce" style={{ animationDuration: '2.5s' }}>
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                GMS MCD MATERIAL SUMMARY
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700 mt-1">
              Live material totals and remaining store inventory: <strong className="text-emerald-700">Sewing Thread (CONE)</strong>, <strong className="text-indigo-700">Twill Tape (YDS)</strong>, and <strong className="text-sky-700">Drawstring (PCS)</strong>.
            </p>
          </div>
        </div>

        {/* Quick Unit Summary Light Cards */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono">
          {/* Sewing */}
          <div className="bg-white text-slate-900 px-3.5 py-2 rounded-2xl border-2 border-emerald-400 shadow-sm text-xs font-black flex items-center gap-2 hover:scale-105 transition-all">
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>🧵 Sewing Due:</span>
            </span>
            <span className="text-slate-900 font-extrabold">{metrics.sewing.due.toLocaleString()} CONE</span>
          </div>

          {/* Twill */}
          <div className="bg-white text-slate-900 px-3.5 py-2 rounded-2xl border-2 border-indigo-400 shadow-sm text-xs font-black flex items-center gap-2 hover:scale-105 transition-all">
            <span className="text-indigo-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>🎗️ Twill Due:</span>
            </span>
            <span className="text-slate-900 font-extrabold">{metrics.twill.due.toLocaleString()} YDS</span>
          </div>

          {/* Drawstring */}
          <div className="bg-white text-slate-900 px-3.5 py-2 rounded-2xl border-2 border-sky-400 shadow-sm text-xs font-black flex items-center gap-2 hover:scale-105 transition-all">
            <span className="text-sky-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              <span>🧶 Drawstring Due:</span>
            </span>
            <span className="text-slate-900 font-extrabold">{metrics.ds.due.toLocaleString()} PCS</span>
          </div>
        </div>
      </div>

      {/* 3. MATERIAL-WISE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: SEWING THREAD BREAKDOWN */}
        <div className="bg-white border-2 border-emerald-300 rounded-3xl p-5 shadow-sm space-y-4 hover:border-emerald-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg shadow-xs">
                🧵
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Sewing Thread
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.sewing.count} Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              CONE
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-bold">Booking Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-slate-900">{metrics.sewing.booking.toLocaleString()}</span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                  CONE
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 font-bold">Received Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-emerald-800">{metrics.sewing.recv.toLocaleString()}</span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded">
                  CONE
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50 border border-amber-300">
              <span className="text-amber-900 font-extrabold">Remaining Due:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-amber-950">{metrics.sewing.due.toLocaleString()}</span>
                <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                  CONE
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-600 font-bold">
              <span>Receive Completion:</span>
              <span className="text-emerald-700 font-mono font-black">
                {metrics.sewing.booking > 0 ? `${Math.round((metrics.sewing.recv / metrics.sewing.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.sewing.booking > 0 ? Math.min(100, (metrics.sewing.recv / metrics.sewing.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: TWILL TAPE BREAKDOWN */}
        <div className="bg-white border-2 border-indigo-300 rounded-3xl p-5 shadow-sm space-y-4 hover:border-indigo-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-lg shadow-xs">
                🎗️
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Twill Tape
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.twill.count} Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-300">
              YDS
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-bold">Booking Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-slate-900">{metrics.twill.booking.toLocaleString()}</span>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-300">
                  YDS
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-indigo-800 font-bold">Received Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-indigo-800">{metrics.twill.recv.toLocaleString()}</span>
                <span className="text-[10px] font-black text-indigo-800 bg-indigo-200 px-1.5 py-0.5 rounded">
                  YDS
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50 border border-amber-300">
              <span className="text-amber-900 font-extrabold">Remaining Due:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-amber-950">{metrics.twill.due.toLocaleString()}</span>
                <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                  YDS
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-600 font-bold">
              <span>Receive Completion:</span>
              <span className="text-indigo-700 font-mono font-black">
                {metrics.twill.booking > 0 ? `${Math.round((metrics.twill.recv / metrics.twill.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.twill.booking > 0 ? Math.min(100, (metrics.twill.recv / metrics.twill.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: DRAWSTRING BREAKDOWN */}
        <div className="bg-white border-2 border-sky-300 rounded-3xl p-5 shadow-sm space-y-4 hover:border-sky-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-800 font-black text-lg shadow-xs">
                🧶
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Drawstring
                </h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold">{metrics.ds.count} Bookings</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-sky-100 text-sky-800 border border-sky-300">
              PCS
            </span>
          </div>

          <div className="space-y-2 font-mono">
            {/* Booking Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-bold">Booking Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-slate-900">{metrics.ds.booking.toLocaleString()}</span>
                <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-300">
                  PCS
                </span>
              </div>
            </div>

            {/* Received Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-sky-50 border border-sky-200">
              <span className="text-sky-800 font-bold">Received Qty:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-sky-800">{metrics.ds.recv.toLocaleString()}</span>
                <span className="text-[10px] font-black text-sky-800 bg-sky-200 px-1.5 py-0.5 rounded">
                  PCS
                </span>
              </div>
            </div>

            {/* Due Qty */}
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50 border border-amber-300">
              <span className="text-amber-900 font-extrabold">Remaining Due:</span>
              <div className="text-right flex items-center gap-1">
                <span className="font-black text-amber-950">{metrics.ds.due.toLocaleString()}</span>
                <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                  PCS
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-600 font-bold">
              <span>Receive Completion:</span>
              <span className="text-sky-700 font-mono font-black">
                {metrics.ds.booking > 0 ? `${Math.round((metrics.ds.recv / metrics.ds.booking) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.ds.booking > 0 ? Math.min(100, (metrics.ds.recv / metrics.ds.booking) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 4. SMART INTERACTIVE RECHARTS SECTION */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* CHART HEADER & TAB NAVIGATION SWITCHER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600 animate-bounce" />
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                GMS Executive Analytics & Material Charts
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Live visual comparison of Booking Qty, Received Qty, and Remaining Due Qty with respective units.
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveChartTab('OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'OVERVIEW'
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              📊 Overview All Items
            </button>

            <button
              onClick={() => setActiveChartTab('SEWING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'SEWING'
                  ? 'bg-emerald-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              🧵 Sewing Thread (CONE)
            </button>

            <button
              onClick={() => setActiveChartTab('TWILL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'TWILL'
                  ? 'bg-indigo-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              🎗️ Twill Tape (YDS)
            </button>

            <button
              onClick={() => setActiveChartTab('DRAWSTRING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeChartTab === 'DRAWSTRING'
                  ? 'bg-sky-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
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
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                {activeChartTab === 'OVERVIEW' && 'All Materials Booking vs Received vs Due Comparison'}
                {activeChartTab === 'SEWING' && 'Buyer-Wise Sewing Thread Booking, Recv & Due Chart (CONE)'}
                {activeChartTab === 'TWILL' && 'Buyer-Wise Twill Tape Booking, Recv & Due Chart (YDS)'}
                {activeChartTab === 'DRAWSTRING' && 'Buyer-Wise Drawstring Booking, Recv & Due Chart (PCS)'}
              </span>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'OVERVIEW' ? (
                  <BarChart data={categoryChartData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#94a3b8" />
                    <XAxis dataKey="shortName" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
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
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#94a3b8" />
                    <XAxis dataKey="buyer" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
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
          <div className="bg-gradient-to-b from-slate-50 to-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>Remaining Due Breakdown</span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mb-3">
                Pending due materials ratio by unit type.
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

            {/* Always Visible Summary List */}
            <div className="space-y-2 border-t border-slate-200 pt-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:scale-102 transition-transform">
                <span className="text-emerald-700 font-black flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>🧵 Sewing Due:</span>
                </span>
                <div className="text-right font-black">
                  <span className="text-slate-900">{metrics.sewing.due.toLocaleString()} CONE</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:scale-102 transition-transform">
                <span className="text-indigo-700 font-black flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>🎗️ Twill Due:</span>
                </span>
                <div className="text-right font-black">
                  <span className="text-indigo-700">{metrics.twill.due.toLocaleString()} YDS</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:scale-102 transition-transform">
                <span className="text-sky-700 font-black flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                  <span>🧶 Drawstring Due:</span>
                </span>
                <div className="text-right font-black">
                  <span className="text-sky-700">{metrics.ds.due.toLocaleString()} PCS</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. TOP BUYERS MATERIAL BREAKDOWN TABLE */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 bg-gradient-to-r from-indigo-800 via-indigo-900 to-blue-900 text-white flex items-center justify-between border-b border-indigo-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
              Top Buyers Material Summary & Due Breakdown
            </h3>
          </div>
          <span className="text-[11px] text-indigo-100 font-mono bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-600 font-bold">
            {buyerSpecificChartData.length} Buyers Loaded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b-2 border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Buyer Name</th>
                <th className="py-3.5 px-4 text-right">🧵 Sewing Thread Due</th>
                <th className="py-3.5 px-4 text-right">🎗️ Twill Tape Due</th>
                <th className="py-3.5 px-4 text-right">🧶 Drawstring Due</th>
                <th className="py-3.5 px-4 text-right bg-amber-50 text-amber-900">Total Buyer Due</th>
                <th className="py-3.5 px-4 text-center bg-slate-200/70 text-slate-900">Buyer Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium font-mono">
              {buyerSpecificChartData.map((b, idx) => {
                const totalItemsCount = (b.sewingDue > 0 ? 1 : 0) + (b.twillDue > 0 ? 1 : 0) + (b.dsDue > 0 ? 1 : 0);
                const totalBuyerDue = b.sewingDue + b.twillDue + b.dsDue;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 font-sans">
                      {b.buyer}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-700 font-bold">
                      {b.sewingDue > 0 ? `${b.sewingDue.toLocaleString()} CONE` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-indigo-700 font-bold">
                      {b.twillDue > 0 ? `${b.twillDue.toLocaleString()} YDS` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sky-700 font-bold">
                      {b.dsDue > 0 ? `${b.dsDue.toLocaleString()} PCS` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right bg-amber-50/60 font-black text-amber-950">
                      {totalBuyerDue > 0 ? totalBuyerDue.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-slate-50/50">
                      {totalItemsCount > 0 ? (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300 inline-block">
                          {totalItemsCount} Material(s) Pending
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 inline-block">
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
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
                Module 1
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.twill.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">🎗️ Twill Tape MCD</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Manage Twill Tape, Herringbone, H.B. Tape bookings, store refs, PDF parse, and statuses (Unit: YDS).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('twill_tape')}
            className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all transform group-hover:scale-102 cursor-pointer"
          >
            <span>Open Twill Tape MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 2: Sewing Thread */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                Module 2
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.sewing.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">🧵 Sewing Thread MCD</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Manage Sewing Thread, Brand, Ticket Number, Color Code, Cone counts, and PDF parse (Unit: CONE).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('sewing_thread')}
            className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all transform group-hover:scale-102 cursor-pointer"
          >
            <span>Open Sewing Thread MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 3: Drawstring Received */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs hover:border-sky-500 hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-xs font-bold">
                Module 3
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">{metrics.ds.count} Bookings</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">🧶 Drawstring MCD</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Manage Drawstring Received bookings, Challan numbers, Item details, and Receive Qty (Unit: PCS).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('drawstring_received')}
            className="mt-5 w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all transform group-hover:scale-102 cursor-pointer"
          >
            <span>Open Drawstring MCD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module Card 4: Drawstring Issue */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                Module 4
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">Floor Dispatch</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">📦 Drawstring Issue</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Record floor issue history, line dispatches, requisition tracking, and remaining stock balances.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('drawstring_issue')}
            className="mt-5 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all transform group-hover:scale-102 cursor-pointer"
          >
            <span>Open Floor Issue Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
