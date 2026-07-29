import React, { useState, useMemo } from 'react';
import { PlanningItem, SewingThreadItem, AppTheme } from '../types';
import { 
  CalendarDays, Plus, Search, Filter, Printer, FileSpreadsheet,
  AlertTriangle, Clock, CheckCircle, Package, ArrowUpRight, ChevronRight,
  TrendingUp, Edit, Trash2, X, FileCheck, CheckCircle2
} from 'lucide-react';
import { PlanningAuditReport } from './PlanningAuditReport';

interface PlanningViewProps {
  planningItems: PlanningItem[];
  onAddPlanningItem: (item: Omit<PlanningItem, 'id'>) => void;
  onUpdatePlanningItem: (item: PlanningItem) => void;
  onDeletePlanningItem?: (id: number) => void;
  sewingThreadItems?: SewingThreadItem[];
  theme?: AppTheme;
}

export const PlanningView: React.FC<PlanningViewProps> = ({
  planningItems,
  onAddPlanningItem,
  onUpdatePlanningItem,
  onDeletePlanningItem,
  sewingThreadItems = [],
  theme = 'light'
}) => {
  const isLight = theme === 'light';

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditReport, setShowAuditReport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    buyer_name: '',
    style: '',
    order_no: '',
    item_type: 'Drawstring',
    required_qty: 1000,
    unit: 'YDS',
    target_date: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
    status: 'PLANNED' as 'PLANNED' | 'IN_BOOKING' | 'RECEIVED' | 'IN_PRODUCTION',
    mcd_ref: '',
    planner_name: 'MCD Planner',
    remarks: ''
  });

  // Unique Buyers
  const buyers = useMemo(() => {
    const set = new Set(planningItems.map(i => i.buyer_name).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [planningItems]);

  // Filtered Items
  const filtered = useMemo(() => {
    return planningItems.filter(item => {
      const matchesSearch = 
        !searchQuery ||
        item.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBuyer = selectedBuyer === 'ALL' || item.buyer_name === selectedBuyer;
      const matchesPriority = selectedPriority === 'ALL' || item.priority === selectedPriority;
      const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

      return matchesSearch && matchesBuyer && matchesPriority && matchesStatus;
    });
  }, [planningItems, searchQuery, selectedBuyer, selectedPriority, selectedStatus]);

  // Metrics
  const stats = useMemo(() => {
    const total = planningItems.length;
    const highPriority = planningItems.filter(i => i.priority === 'HIGH').length;
    const planned = planningItems.filter(i => i.status === 'PLANNED').length;
    const inBooking = planningItems.filter(i => i.status === 'IN_BOOKING').length;
    const received = planningItems.filter(i => i.status === 'RECEIVED').length;
    const inProduction = planningItems.filter(i => i.status === 'IN_PRODUCTION').length;

    return { total, highPriority, planned, inBooking, received, inProduction };
  }, [planningItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyer_name || !formData.style) return;

    onAddPlanningItem({
      ...formData,
      mcd_ref: formData.mcd_ref || `PLN-${Date.now().toString().slice(-4)}`
    });

    setShowAddModal(false);
    setFormData({
      buyer_name: '',
      style: '',
      order_no: '',
      item_type: 'Drawstring',
      required_qty: 1000,
      unit: 'YDS',
      target_date: new Date().toISOString().split('T')[0],
      priority: 'MEDIUM',
      status: 'PLANNED',
      mcd_ref: '',
      planner_name: 'MCD Planner',
      remarks: ''
    });
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['MCD Ref', 'Buyer', 'Style', 'Order No', 'Item Type', 'Required Qty', 'Unit', 'Target Date', 'Priority', 'Status', 'Planner', 'Remarks'];
    const rows = filtered.map(item => [
      `"${item.mcd_ref || ''}"`,
      `"${item.buyer_name}"`,
      `"${item.style}"`,
      `"${item.order_no}"`,
      `"${item.item_type}"`,
      item.required_qty,
      `"${item.unit}"`,
      `"${item.target_date}"`,
      `"${item.priority}"`,
      `"${item.status}"`,
      `"${item.planner_name || ''}"`,
      `"${item.remarks || ''}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MCD_Planning_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border shadow-lg relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white border-violet-700/50' 
          : 'bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white border-violet-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-500/20 border border-violet-400/30 rounded-2xl backdrop-blur-md">
              <CalendarDays className="w-8 h-8 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Accessories Store Planning Schedule</h1>
                <span className="px-2.5 py-0.5 bg-violet-500/30 border border-violet-400/40 text-violet-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  MCD MRP Engine
                </span>
              </div>
              <p className="text-xs text-violet-200/80 mt-1">
                Plan material requirements, target delivery dates, buyer allocations, and store order pipeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAuditReport(!showAuditReport)}
              className={`px-4 py-2.5 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                showAuditReport 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 ring-2 ring-emerald-300' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400/40'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-200" />
              <span>Planning Order vs Sewing Thread Audit Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-violet-300" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-black text-xs rounded-xl shadow-lg shadow-violet-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Planning Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* PLANNING ORDER VS SEWING THREAD AUDIT REPORT COMPONENT */}
      {showAuditReport && (
        <div className="pt-2">
          <PlanningAuditReport
            sewingThreadItems={sewingThreadItems}
            theme={theme}
            onClose={() => setShowAuditReport(false)}
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Planned</span>
            <CalendarDays className="w-5 h-5 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1 font-semibold">
            Active Planning Entries
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">High Priority</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.highPriority}</div>
          <div className="text-xs text-rose-600/80 font-bold mt-1">
            Requires Immediate Booking
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">In Booking</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.inBooking}</div>
          <div className="text-xs text-amber-600/80 font-bold mt-1">
            Supplier Order Issued
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received / Prod</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.received + stats.inProduction}</div>
          <div className="text-xs text-emerald-600/80 font-bold mt-1">
            Store Ready / Allocated
          </div>
        </div>

      </div>

      {/* Control Bar */}
      <div className={`p-4 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Buyer, Style, Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Buyer Filter</label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              {buyers.map(b => (
                <option key={b} value={b}>{b === 'ALL' ? 'All Buyers' : b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_BOOKING">In Booking</option>
              <option value="RECEIVED">Received</option>
              <option value="IN_PRODUCTION">In Production</option>
            </select>
          </div>

        </div>
      </div>

      {/* Planning Table */}
      <div className={`p-5 rounded-2xl border shadow-xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            <h3 className="font-black text-base">Store Planning Schedule & Pipeline</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">Showing {filtered.length} Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[950px]">
            <thead>
              <tr className={`font-black uppercase tracking-wider border-b text-[10px] ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-300'
              }`}>
                <th className="py-2.5 px-3">MCD Ref</th>
                <th className="py-2.5 px-3">Buyer</th>
                <th className="py-2.5 px-3">Style / Order</th>
                <th className="py-2.5 px-3">Item Type</th>
                <th className="py-2.5 px-3 text-right">Required Qty</th>
                <th className="py-2.5 px-3 text-center">Target Date</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Planner & Remarks</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
              {filtered.map((item) => {
                let priorityBadge = 'bg-slate-500/10 text-slate-600 border-slate-500/30';
                if (item.priority === 'HIGH') priorityBadge = 'bg-rose-500/10 text-rose-600 border-rose-500/30 font-black';
                if (item.priority === 'MEDIUM') priorityBadge = 'bg-amber-500/10 text-amber-600 border-amber-500/30';
                if (item.priority === 'LOW') priorityBadge = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';

                let statusBadge = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
                if (item.status === 'RECEIVED') statusBadge = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
                if (item.status === 'IN_PRODUCTION') statusBadge = 'bg-purple-500/10 text-purple-600 border-purple-500/30';
                if (item.status === 'IN_BOOKING') statusBadge = 'bg-amber-500/10 text-amber-600 border-amber-500/30';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-violet-600 dark:text-violet-400">{item.mcd_ref || `PLN-${item.id}`}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{item.buyer_name}</td>
                    <td className="py-2.5 px-3 font-bold">{item.style} <span className="text-[10px] text-slate-400 block font-normal">{item.order_no}</span></td>
                    <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.item_type}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">{item.required_qty.toLocaleString()} {item.unit}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{item.target_date}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${priorityBadge}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdatePlanningItem({ ...item, status: e.target.value as any })}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border cursor-pointer ${statusBadge}`}
                      >
                        <option value="PLANNED">PLANNED</option>
                        <option value="IN_BOOKING">IN BOOKING</option>
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="IN_PRODUCTION">IN PRODUCTION</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-900 dark:text-slate-200 font-bold">{item.planner_name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.remarks || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onDeletePlanningItem && (
                        <button
                          type="button"
                          onClick={() => onDeletePlanningItem(item.id)}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Planning Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="p-4 border-b flex items-center justify-between dark:border-slate-800 bg-violet-600 text-white">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                <h3 className="font-black text-sm">Add New Accessories Planning Entry</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. H&M"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Style Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOODIE-99"
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Order No / PO</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8832"
                    value={formData.order_no}
                    onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Item Type</label>
                  <select
                    value={formData.item_type}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value="Drawstring">Drawstring</option>
                    <option value="Twill Tape">Twill Tape</option>
                    <option value="Sewing Thread">Sewing Thread</option>
                    <option value="Elastic Tape">Elastic Tape</option>
                    <option value="Button">Button</option>
                    <option value="Zipper">Zipper</option>
                    <option value="Ribbon">Ribbon</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Required Qty</label>
                  <input
                    type="number"
                    value={formData.required_qty}
                    onChange={(e) => setFormData({ ...formData, required_qty: Number(e.target.value) })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value="YDS">YDS</option>
                    <option value="CONES">CONES</option>
                    <option value="PCS">PCS</option>
                    <option value="DZN">DZN</option>
                    <option value="KG">KG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Planner Name</label>
                  <input
                    type="text"
                    value={formData.planner_name}
                    onChange={(e) => setFormData({ ...formData, planner_name: e.target.value })}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or store notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30"
                >
                  Save Planning Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
