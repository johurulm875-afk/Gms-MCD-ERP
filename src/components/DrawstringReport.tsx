import React, { useState, useMemo } from 'react';
import { DrawstringItem, AppTheme, UserProfile } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { 
  FileText, Calendar, Filter, FileSpreadsheet, Printer, 
  TrendingUp, CheckCircle2, Clock, AlertCircle, PackageCheck, 
  BarChart3, ArrowDownRight, ArrowUpRight, Search, Edit3, Trash2, Save, X, Lock
} from 'lucide-react';

interface DrawstringReportProps {
  items: DrawstringItem[];
  theme?: AppTheme;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
  onUpdateItem?: (updatedItem: DrawstringItem) => void;
  onDeleteItem?: (id: number) => void;
}

export const DrawstringReport: React.FC<DrawstringReportProps> = ({
  items,
  theme = 'light',
  currentUser,
  canEdit,
  onUpdateItem,
  onDeleteItem
}) => {
  const isLight = theme === 'light';
  const isEditable = canEdit ?? canUserModifyData(currentUser || null);

  // Edit State
  const [editingItem, setEditingItem] = useState<DrawstringItem | null>(null);

  // Report Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Buyers list
  const buyers = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.buyer_name))).filter(Boolean);
    return ['ALL', ...list];
  }, [items]);

  // Types list
  const drawstringTypes = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.drawstring_type))).filter(Boolean);
    return ['ALL', ...list];
  }, [items]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        !searchQuery ||
        item.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.store_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.drawstring_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.colour.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBuyer = selectedBuyer === 'ALL' || item.buyer_name === selectedBuyer;
      const matchesType = selectedType === 'ALL' || item.drawstring_type === selectedType;

      const itemDate = item.receive_date || item.date;
      const matchesFrom = !fromDate || (itemDate && itemDate >= fromDate);
      const matchesTo = !toDate || (itemDate && itemDate <= toDate);

      return matchesSearch && matchesBuyer && matchesType && matchesFrom && matchesTo;
    });
  }, [items, searchQuery, selectedBuyer, selectedType, fromDate, toDate]);

  // Aggregated Report Metrics
  const metrics = useMemo(() => {
    const totalBookings = filteredItems.length;
    const totalBookingQty = filteredItems.reduce((acc, i) => acc + (i.booking_qty || 0), 0);
    const totalReceivedQty = filteredItems.reduce((acc, i) => acc + (i.receive_qty || 0), 0);
    const totalBalanceQty = filteredItems.reduce((acc, i) => acc + (i.balance_qty || 0), 0);

    const pendingCount = filteredItems.filter(i => i.receive_qty === 0).length;
    const partialCount = filteredItems.filter(i => i.receive_qty > 0 && i.receive_qty < i.booking_qty).length;
    const fulfilledCount = filteredItems.filter(i => i.receive_qty >= i.booking_qty).length;

    const fulfillmentRate = totalBookingQty > 0 
      ? Math.round((totalReceivedQty / totalBookingQty) * 100) 
      : 0;

    return {
      totalBookings,
      totalBookingQty,
      totalReceivedQty,
      totalBalanceQty,
      pendingCount,
      partialCount,
      fulfilledCount,
      fulfillmentRate
    };
  }, [filteredItems]);

  // Buyer-wise Summary Grouping
  const buyerSummary = useMemo(() => {
    const map = new Map<string, { buyer: string; bookings: number; bookingQty: number; receiveQty: number; balanceQty: number }>();

    filteredItems.forEach(item => {
      const current = map.get(item.buyer_name) || {
        buyer: item.buyer_name,
        bookings: 0,
        bookingQty: 0,
        receiveQty: 0,
        balanceQty: 0
      };

      current.bookings += 1;
      current.bookingQty += item.booking_qty || 0;
      current.receiveQty += item.receive_qty || 0;
      current.balanceQty += item.balance_qty || 0;

      map.set(item.buyer_name, current);
    });

    return Array.from(map.values()).sort((a, b) => b.bookingQty - a.bookingQty);
  }, [filteredItems]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = ['MCD Ref', 'Buyer', 'Style', 'Order No', 'Drawstring Type', 'Colour', 'Booking Qty', 'Received Qty', 'Receive Date', 'Receive Challan', 'Balance Qty', 'Unit'];
    const rows = filteredItems.map(item => [
      `"${item.store_ref}"`,
      `"${item.buyer_name}"`,
      `"${item.style}"`,
      `"${item.order_no}"`,
      `"${item.drawstring_type}"`,
      `"${item.colour}"`,
      item.booking_qty,
      item.receive_qty,
      `"${item.receive_date || ''}"`,
      `"${item.receive_challan || ''}"`,
      item.balance_qty,
      `"${item.unit}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Drawstring_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-cyan-900 via-teal-900 to-slate-900 text-white border-cyan-700/50' 
          : 'bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white border-cyan-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl backdrop-blur-md">
              <FileText className="w-7 h-7 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Drawstring Inventory & Receive Report</h1>
                <span className="px-2.5 py-0.5 bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  MCD Analytics
                </span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-1">
                Executive store analytics, buyer fulfillment rates, and comprehensive daily receive reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-cyan-300" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel / CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Bookings */}
        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
            <PackageCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalBookings}</div>
          <div className="text-xs text-slate-500 mt-1 font-semibold">
            {metrics.totalBookingQty.toLocaleString()} YDS / PCS Total
          </div>
        </div>

        {/* Total Received */}
        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Received</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.totalReceivedQty.toLocaleString()}</div>
          <div className="text-xs text-emerald-600/80 font-bold mt-1">
            {metrics.fulfillmentRate}% Total Fulfilled Rate
          </div>
        </div>

        {/* Total Balance */}
        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Balance</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.totalBalanceQty.toLocaleString()}</div>
          <div className="text-xs text-amber-600/80 font-bold mt-1">
            {metrics.pendingCount} Pending / {metrics.partialCount} Partial
          </div>
        </div>

        {/* Fulfilled Ratio */}
        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Fulfillment Status</span>
            <CheckCircle2 className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{metrics.fulfilledCount} <span className="text-xs font-bold text-slate-400">Completed</span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-cyan-500 h-full transition-all" style={{ width: `${Math.min(100, metrics.fulfillmentRate)}%` }} />
          </div>
        </div>

      </div>

      {/* Control Filters Bar */}
      <div className={`p-4 rounded-2xl border print:hidden ${
        isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white shadow-xl'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search Style, Buyer, Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          {/* Buyer Filter */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Buyer Filter</label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              {buyers.map(b => (
                <option key={b} value={b}>{b === 'ALL' ? 'All Buyers' : b}</option>
              ))}
            </select>
          </div>

          {/* Drawstring Type Filter */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Type Filter</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              {drawstringTypes.map(t => (
                <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

        </div>
      </div>

      {/* Buyer Summary Table Card */}
      <div className={`p-5 rounded-2xl border shadow-xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h3 className="font-black text-base">Buyer-wise Drawstring Summary</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">{buyerSummary.length} Buyers</span>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse text-xs border border-slate-300 dark:border-slate-700">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className={`font-black uppercase tracking-wider border-b text-[10px] ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'
              }`}>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-700">Buyer Name</th>
                <th className="py-2.5 px-3 text-center border border-slate-300 dark:border-slate-700">Bookings Count</th>
                <th className="py-2.5 px-3 text-right border border-slate-300 dark:border-slate-700">Booking Qty</th>
                <th className="py-2.5 px-3 text-right border border-slate-300 dark:border-slate-700">Received Qty</th>
                <th className="py-2.5 px-3 text-right border border-slate-300 dark:border-slate-700">Balance Qty</th>
                <th className="py-2.5 px-3 text-right border border-slate-300 dark:border-slate-700">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
              {buyerSummary.map((b) => {
                const pct = b.bookingQty > 0 ? Math.round((b.receiveQty / b.bookingQty) * 100) : 0;
                return (
                  <tr key={b.buyer} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">{b.buyer}</td>
                    <td className="py-2.5 px-3 text-center font-mono border border-slate-300 dark:border-slate-700">{b.bookings}</td>
                    <td className="py-2.5 px-3 text-right font-bold border border-slate-300 dark:border-slate-700">{b.bookingQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700">{b.receiveQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-amber-600 dark:text-amber-400 border border-slate-300 dark:border-slate-700">{b.balanceQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right border border-slate-300 dark:border-slate-700">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        pct >= 100 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                          : pct > 0 
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' 
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      }`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Report Table Card */}
      <div className={`p-5 rounded-2xl border shadow-xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-base">Detailed Drawstring Inventory & Receive Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">Showing {filteredItems.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className={`font-black uppercase tracking-wider border-b text-[10px] ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'
              }`}>
                <th className="py-2.5 px-3">MCD Ref</th>
                <th className="py-2.5 px-3">Buyer</th>
                <th className="py-2.5 px-3">Style / Order</th>
                <th className="py-2.5 px-3">Type & Size</th>
                <th className="py-2.5 px-3">Colour</th>
                <th className="py-2.5 px-3 text-right">Booking Qty</th>
                <th className="py-2.5 px-3 text-right">Recv Qty</th>
                <th className="py-2.5 px-3 text-center">Recv Date</th>
                <th className="py-2.5 px-3 text-center">Recv Challan</th>
                <th className="py-2.5 px-3 text-right">Balance Qty</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isEditable && (onUpdateItem || onDeleteItem) && (
                  <th className="py-2.5 px-3 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
              {filteredItems.map((item) => {
                let statusBadge = 'Pending';
                let statusClass = 'bg-amber-500/10 text-amber-600 border-amber-500/30';

                if (item.receive_qty >= item.booking_qty) {
                  statusBadge = 'Fulfilled';
                  statusClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
                } else if (item.receive_qty > 0) {
                  statusBadge = 'Partial';
                  statusClass = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">{item.store_ref}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{item.buyer_name}</td>
                    <td className="py-2.5 px-3 font-bold">{item.style} <span className="text-[10px] text-slate-400 block font-normal">{item.order_no}</span></td>
                    <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-bold">{item.drawstring_type} {item.size_mm ? `(${item.size_mm})` : ''}</td>
                    <td className="py-2.5 px-3 font-medium">{item.colour}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{item.booking_qty.toLocaleString()} {item.unit}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{item.receive_qty.toLocaleString()} {item.unit}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{item.receive_date || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">{item.receive_challan || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-amber-600 dark:text-amber-400">{item.balance_qty.toLocaleString()} {item.unit}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                        {statusBadge}
                      </span>
                    </td>
                    {isEditable && (onUpdateItem || onDeleteItem) && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {onUpdateItem && (
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 border text-slate-700 transition-all"
                              title="Edit Report Record"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                            </button>
                          )}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete drawstring record #${item.id} (${item.style})?`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-800 transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DRAWSTRING ITEM MODAL */}
      {editingItem && onUpdateItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-xl p-6 rounded-2xl border shadow-2xl space-y-4 my-8 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800 bg-cyan-700 -mx-6 -mt-6 p-4 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Edit Drawstring Report Record (#{editingItem.id})</h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="hover:bg-white/20 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateItem(editingItem);
                setEditingItem(null);
              }}
              className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">MCD Ref Code</label>
                  <input
                    type="text"
                    value={editingItem.store_ref || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, store_ref: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold font-mono text-cyan-600 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={editingItem.buyer_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, buyer_name: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Style Name</label>
                  <input
                    type="text"
                    value={editingItem.style || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, style: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Order No</label>
                  <input
                    type="text"
                    value={editingItem.order_no || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, order_no: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Drawstring Type</label>
                  <input
                    type="text"
                    value={editingItem.drawstring_type || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, drawstring_type: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Size (mm)</label>
                  <input
                    type="text"
                    value={editingItem.size_mm || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, size_mm: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Colour</label>
                  <input
                    type="text"
                    value={editingItem.colour || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, colour: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Unit</label>
                  <select
                    value={editingItem.unit || 'YDS'}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value as any })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  >
                    <option value="YDS">YDS</option>
                    <option value="PCS">PCS</option>
                    <option value="MTRS">MTRS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Booking Qty</label>
                  <input
                    type="number"
                    value={editingItem.booking_qty}
                    onChange={(e) => {
                      const bQty = Number(e.target.value) || 0;
                      const rQty = editingItem.receive_qty || 0;
                      const bal = Math.max(0, bQty - rQty);
                      setEditingItem({ ...editingItem, booking_qty: bQty, balance_qty: bal });
                    }}
                    className={`w-full p-2 border rounded-xl font-bold font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Receive Qty</label>
                  <input
                    type="number"
                    value={editingItem.receive_qty || 0}
                    onChange={(e) => {
                      const rQty = Number(e.target.value) || 0;
                      const bQty = editingItem.booking_qty || 0;
                      const bal = Math.max(0, bQty - rQty);
                      setEditingItem({ ...editingItem, receive_qty: rQty, balance_qty: bal });
                    }}
                    className={`w-full p-2 border rounded-xl font-bold font-mono text-emerald-600 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Receive Date</label>
                  <input
                    type="date"
                    value={editingItem.receive_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, receive_date: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Receive Challan</label>
                  <input
                    type="text"
                    value={editingItem.receive_challan || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, receive_challan: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editingItem.remarks || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, remarks: e.target.value })}
                  className={`w-full p-2 border rounded-xl ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  placeholder="Notes..."
                />
              </div>

              <div className="flex gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-1/2 py-2 border font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Report Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
