import React, { useState, useMemo } from 'react';
import XLSX from 'xlsx-js-style';
import { DrawstringItem, TransactionLog, AppTheme, UserProfile } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { generateCompanyMultiSheetExcel, normalizeBuyerName, ExcelColumnDef } from '../utils/excelExportHelper';
import { 
  PackageCheck, Search, Plus, FileSpreadsheet, Zap, Download,
  RefreshCw, ChevronLeft, ChevronRight, History, X, Lock, Edit3, Trash2, Save
} from 'lucide-react';
import { DrawstringNewBookingModal } from './DrawstringNewBookingModal';

interface DailyDrawstringReceivedUpdateProps {
  items: DrawstringItem[];
  isLoading?: boolean;
  onUpdateItem: (updatedItem: DrawstringItem) => void;
  onAddItem?: (newItem: Omit<DrawstringItem, 'id'> | Omit<DrawstringItem, 'id'>[]) => Promise<void> | void;
  onDeleteItem?: (id: number) => void;
  theme?: AppTheme;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
}

export const DailyDrawstringReceivedUpdate: React.FC<DailyDrawstringReceivedUpdateProps> = ({
  items,
  isLoading = false,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  theme = 'light',
  currentUser,
  canEdit
}) => {
  const isLight = theme === 'light';
  // Allow edit if canEdit is explicitly true OR if currentUser passes check, default to true for smooth user experience
  const isEditable = canEdit ?? (currentUser ? canUserModifyData(currentUser) : true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Per-column filter inputs matching all 15 Supabase columns
  const [colFilters, setColFilters] = useState({
    buyer: '',
    sl_no: '',
    booking_date: '',
    ref_no_job_no: '',
    sr_gt_no: '',
    po_no: '',
    item_name: '',
    color: '',
    size: '',
    booking_qty: '',
    rcv_qty: '',
    due_qty: '',
    last_rcvd_qty: '',
    rcvd_date: '',
    remarks: ''
  });

  const handleColFilterChange = (key: keyof typeof colFilters, val: string) => {
    setColFilters(prev => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedBuyer('ALL');
    setSelectedStatus('ALL');
    setDateFilter('');
    setColFilters({
      buyer: '',
      sl_no: '',
      booking_date: '',
      ref_no_job_no: '',
      sr_gt_no: '',
      po_no: '',
      item_name: '',
      color: '',
      size: '',
      booking_qty: '',
      rcv_qty: '',
      due_qty: '',
      last_rcvd_qty: '',
      rcvd_date: '',
      remarks: ''
    });
    setCurrentPage(1);
  };

  // Full Row Edit State
  const [editingItem, setEditingItem] = useState<DrawstringItem | null>(null);

  // Receive Modal State
  const [selectedItemForReceive, setSelectedItemForReceive] = useState<DrawstringItem | null>(null);
  const [receiveQtyInput, setReceiveQtyInput] = useState('');
  const [receiveChallanInput, setReceiveChallanInput] = useState('');
  const [receiveDateInput, setReceiveDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [remarksInput, setRemarksInput] = useState('');

  // New Booking Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // History Modal State
  const [historyItem, setHistoryItem] = useState<DrawstringItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Unique Buyers for Filter
  const buyers = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const b = i.buyer || i.buyer_name;
      if (b) set.add(normalizeBuyerName(b));
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [items]);

  // Instant Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const bName = item.buyer || item.buyer_name || '';
      if (selectedBuyer !== 'ALL') {
        if (normalizeBuyerName(bName) !== normalizeBuyerName(selectedBuyer)) return false;
      }
      const bDate = item.booking_date || item.date || '';
      const refJob = item.ref_no_job_no || item.style || item.booking_challan || '';
      const srGt = item.sr_gt_no || item.store_ref || '';
      const poNo = item.po_no || item.order_no || '';
      const iName = item.item_name || item.drawstring_type || '';
      const col = item.color || item.colour || '';
      const sizeVal = item.size || item.size_mm || '';
      const bQty = item.booking_qty ?? 0;
      const rQty = item.rcv_qty ?? item.receive_qty ?? 0;
      const dQty = item.due_qty ?? item.balance_qty ?? Math.max(0, bQty - rQty);
      const lastRcvd = item.last_rcvd_qty ?? 0;
      const rcvdDateStr = item.rcvd_date || item.receive_date || '';
      const rem = item.remarks || '';
      const slNoStr = String(item.sl_no || item.id || '');

      const matchesSearch = 
        !searchTerm ||
        bName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refJob.toLowerCase().includes(searchTerm.toLowerCase()) ||
        srGt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBuyer = selectedBuyer === 'ALL' || bName === selectedBuyer;

      let matchesStatus = true;
      if (selectedStatus === 'PENDING') {
        matchesStatus = rQty === 0;
      } else if (selectedStatus === 'PARTIAL') {
        matchesStatus = rQty > 0 && rQty < bQty;
      } else if (selectedStatus === 'FULFILLED') {
        matchesStatus = rQty >= bQty && bQty > 0;
      }

      const matchesDate = !dateFilter || rcvdDateStr.includes(dateFilter) || bDate.includes(dateFilter);

      // Per Column Filters
      const matchesBuyerCol = !colFilters.buyer || bName.toLowerCase().includes(colFilters.buyer.toLowerCase());
      const matchesSlCol = !colFilters.sl_no || slNoStr.toLowerCase().includes(colFilters.sl_no.toLowerCase());
      const matchesBookingDateCol = !colFilters.booking_date || bDate.toLowerCase().includes(colFilters.booking_date.toLowerCase());
      const matchesRefCol = !colFilters.ref_no_job_no || refJob.toLowerCase().includes(colFilters.ref_no_job_no.toLowerCase());
      const matchesSrGtCol = !colFilters.sr_gt_no || srGt.toLowerCase().includes(colFilters.sr_gt_no.toLowerCase());
      const matchesPoCol = !colFilters.po_no || poNo.toLowerCase().includes(colFilters.po_no.toLowerCase());
      const matchesItemCol = !colFilters.item_name || iName.toLowerCase().includes(colFilters.item_name.toLowerCase());
      const matchesColorCol = !colFilters.color || col.toLowerCase().includes(colFilters.color.toLowerCase());
      const matchesSizeCol = !colFilters.size || sizeVal.toLowerCase().includes(colFilters.size.toLowerCase());
      const matchesBookingQtyCol = !colFilters.booking_qty || String(bQty).includes(colFilters.booking_qty);
      const matchesRcvQtyCol = !colFilters.rcv_qty || String(rQty).includes(colFilters.rcv_qty);
      const matchesDueQtyCol = !colFilters.due_qty || String(dQty).includes(colFilters.due_qty);
      const matchesLastRcvdCol = !colFilters.last_rcvd_qty || String(lastRcvd).includes(colFilters.last_rcvd_qty);
      const matchesRcvdDateCol = !colFilters.rcvd_date || rcvdDateStr.toLowerCase().includes(colFilters.rcvd_date.toLowerCase());
      const matchesRemarksCol = !colFilters.remarks || rem.toLowerCase().includes(colFilters.remarks.toLowerCase());

      return matchesSearch && matchesBuyer && matchesStatus && matchesDate &&
        matchesBuyerCol && matchesSlCol && matchesBookingDateCol && matchesRefCol &&
        matchesSrGtCol && matchesPoCol && matchesItemCol && matchesColorCol &&
        matchesSizeCol && matchesBookingQtyCol && matchesRcvQtyCol && matchesDueQtyCol &&
        matchesLastRcvdCol && matchesRcvdDateCol && matchesRemarksCol;
    });
  }, [items, searchTerm, selectedBuyer, selectedStatus, dateFilter, colFilters]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  // Submit Receive Update (Sewing Thread receive logic with Drawstring Supabase fields)
  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReceive) return;

    const addQty = parseFloat(receiveQtyInput) || 0;
    if (addQty <= 0) {
      alert('Please enter a valid receive quantity');
      return;
    }

    const currentRcv = selectedItemForReceive.rcv_qty ?? selectedItemForReceive.receive_qty ?? 0;
    const bookingQty = selectedItemForReceive.booking_qty ?? 0;
    const newRcvTotal = currentRcv + addQty;
    const newDueQty = Math.max(0, bookingQty - newRcvTotal);

    // Format entry string e.g. "22/07/=186,"
    const dateObj = new Date(receiveDateInput);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rcvFormattedEntry = `${dd}/${mm}/=${addQty},`;

    const existingRcvdDateStr = selectedItemForReceive.rcvd_date || selectedItemForReceive.receive_date || '';
    const updatedRcvdDateStr = existingRcvdDateStr ? `${existingRcvdDateStr} ${rcvFormattedEntry}` : rcvFormattedEntry;

    const newLog: TransactionLog = {
      id: `rcv_${Date.now()}`,
      type: 'RECEIVE',
      date: receiveDateInput,
      challan: receiveChallanInput || 'CH-' + Math.floor(1000 + Math.random() * 9000),
      qty: addQty,
      remarks: remarksInput || 'Daily Receive Update',
      created_at: new Date().toISOString()
    };

    const updated: DrawstringItem = {
      ...selectedItemForReceive,
      rcv_qty: newRcvTotal,
      receive_qty: newRcvTotal,
      due_qty: newDueQty,
      balance_qty: newDueQty,
      last_rcvd_qty: addQty,
      rcvd_date: updatedRcvdDateStr,
      receive_date: receiveDateInput,
      receive_challan: receiveChallanInput || selectedItemForReceive.receive_challan,
      remarks: remarksInput ? `${selectedItemForReceive.remarks ? selectedItemForReceive.remarks + ' | ' : ''}${remarksInput}` : selectedItemForReceive.remarks,
      receive_logs: [...(selectedItemForReceive.receive_logs || []), newLog]
    };

    onUpdateItem(updated);

    // Reset Form
    setSelectedItemForReceive(null);
    setReceiveQtyInput('');
    setReceiveChallanInput('');
    setRemarksInput('');
  };

  // Save Full Edit Row
  const handleFullEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const bQty = Number(editingItem.booking_qty) || 0;
    const rQty = Number(editingItem.rcv_qty ?? editingItem.receive_qty) || 0;
    const dQty = Math.max(0, bQty - rQty);

    const updated: DrawstringItem = {
      ...editingItem,
      booking_qty: bQty,
      rcv_qty: rQty,
      receive_qty: rQty,
      due_qty: dQty,
      balance_qty: dQty,
      buyer_name: editingItem.buyer || editingItem.buyer_name,
      style: editingItem.ref_no_job_no || editingItem.style,
      order_no: editingItem.po_no || editingItem.order_no,
      store_ref: editingItem.sr_gt_no || editingItem.store_ref,
      colour: editingItem.color || editingItem.colour,
      drawstring_type: editingItem.item_name || editingItem.drawstring_type,
      size_mm: editingItem.size || editingItem.size_mm,
      date: editingItem.booking_date || editingItem.date,
      receive_date: editingItem.rcvd_date || editingItem.receive_date
    };

    onUpdateItem(updated);
    setEditingItem(null);
  };

  // Export to Excel (.xlsx) using XLSX
  const exportToExcel = () => {
    if (filteredItems.length === 0) {
      alert('No drawstring records available to export.');
      return;
    }

    const columns: ExcelColumnDef[] = [
      { header: 'SL', key: 'sl', width: 6, align: 'center' },
      { header: 'Buyer Name', key: 'buyer_display', width: 18, align: 'left' },
      { header: 'Booking Date', key: 'date_display', width: 13, align: 'center' },
      { header: 'Ref No / Job No', key: 'ref_display', width: 18, align: 'left' },
      { header: 'SR / GT No', key: 'sr_display', width: 14, align: 'left' },
      { header: 'PO No', key: 'po_display', width: 14, align: 'left' },
      { header: 'Item Name', key: 'item_display', width: 18, align: 'left' },
      { header: 'Color', key: 'color_display', width: 14, align: 'left' },
      { header: 'Size (MM)', key: 'size_display', width: 10, align: 'center' },
      { header: 'Booking Qty (Pcs)', key: 'booking_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Received Qty (Pcs)', key: 'rcv_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Due Qty (Pcs)', key: 'due_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Last Rcvd Qty (Pcs)', key: 'last_rcvd_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Rcvd Date Log', key: 'rcvd_date_display', width: 22, align: 'center' },
      { header: 'Remarks', key: 'remarks', width: 20, align: 'left' }
    ];

    const formattedData = filteredItems.map((item, index) => {
      const bQty = Number(item.booking_qty) || 0;
      const rQty = Number(item.rcv_qty ?? item.receive_qty) || 0;
      const dQty = Number(item.due_qty ?? item.balance_qty) || Math.max(0, bQty - rQty);

      return {
        ...item,
        sl: index + 1,
        buyer_display: item.buyer || item.buyer_name || '',
        date_display: item.booking_date || item.date || '',
        ref_display: item.ref_no_job_no || item.style || '',
        sr_display: item.sr_gt_no || item.store_ref || '',
        po_display: item.po_no || item.order_no || '',
        item_display: item.item_name || item.drawstring_type || '',
        color_display: item.color || item.colour || '',
        size_display: item.size || item.size_mm || '',
        booking_qty: bQty,
        rcv_qty: rQty,
        due_qty: dQty,
        last_rcvd_qty: Number(item.last_rcvd_qty) || 0,
        rcvd_date_display: item.rcvd_date || item.receive_date || ''
      };
    });

    generateCompanyMultiSheetExcel<any>({
      moduleName: 'Drawstring',
      fileNamePrefix: 'Drawstring_Daily_Received',
      data: formattedData,
      columns,
      getBuyerName: (i: any) => i.buyer || i.buyer_name || 'General Buyer',
      getBookingQty: (i: any) => Number(i.booking_qty) || 0,
      getReceiveQty: (i: any) => Number(i.rcv_qty ?? i.receive_qty) || 0,
      isUnreceived: (i: any) => (Number(i.rcv_qty) || 0) < (Number(i.booking_qty) || 0) || (Number(i.rcv_qty) || 0) === 0
    });
  };

  // Export CSV matching exact Supabase column layout
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'buyer', 'sl_no', 'booking_date', 'ref_no_job_no', 'sr_gt_no', 
      'po_no', 'item_name', 'color', 'size', 'booking_qty', 
      'rcv_qty', 'due_qty', 'last_rcvd_qty', 'rcvd_date', 'remarks'
    ];

    const rows = filteredItems.map((item, index) => {
      const bName = item.buyer || item.buyer_name || '';
      const slNo = item.sl_no || item.id || index + 1;
      const bDate = item.booking_date || item.date || '';
      const refJob = item.ref_no_job_no || item.style || '';
      const srGt = item.sr_gt_no || item.store_ref || '';
      const poNo = item.po_no || item.order_no || '';
      const iName = item.item_name || item.drawstring_type || '';
      const col = item.color || item.colour || '';
      const sizeVal = item.size || item.size_mm || '';
      const bQty = item.booking_qty ?? 0;
      const rQty = item.rcv_qty ?? item.receive_qty ?? 0;
      const dQty = item.due_qty ?? item.balance_qty ?? Math.max(0, bQty - rQty);
      const lastRcvd = item.last_rcvd_qty ?? 0;
      const rcvdDateStr = item.rcvd_date || item.receive_date || '';
      const rem = item.remarks || '';

      return [
        `"${bName}"`,
        `"${slNo}"`,
        `"${bDate}"`,
        `"${refJob}"`,
        `"${srGt}"`,
        `"${poNo}"`,
        `"${iName}"`,
        `"${col}"`,
        `"${sizeVal}"`,
        bQty,
        rQty,
        dQty,
        lastRcvd,
        `"${rcvdDateStr}"`,
        `"${rem}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Drawstring_Daily_Received_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white border-teal-700/50' 
          : 'bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white border-teal-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/20 border border-teal-400/30 rounded-2xl backdrop-blur-md">
              <PackageCheck className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Daily Drawstring Received & Booking</h1>
                <span className="px-2.5 py-0.5 bg-teal-500/30 border border-teal-400/40 text-teal-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Live Supabase Sync
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-1">
                Full Supabase schema: <code className="font-mono text-teal-300 bg-teal-950/60 px-1 rounded">buyer, sl_no, booking_date, ref_no_job_no, sr_gt_no, po_no, item_name, color, size, booking_qty, rcv_qty, due_qty, last_rcvd_qty, rcvd_date, remarks</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Download Excel (.xlsx) */}
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
              title="Download Excel (.xlsx) Report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Download Excel</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span>CSV</span>
            </button>

            {/* Quick RCVD Entry Button */}
            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  if (filteredItems.length > 0) {
                    setSelectedItemForReceive(filteredItems[0]);
                    setReceiveDateInput(new Date().toISOString().split('T')[0]);
                    setReceiveQtyInput('');
                    setReceiveChallanInput('');
                  } else if (items.length > 0) {
                    setSelectedItemForReceive(items[0]);
                    setReceiveDateInput(new Date().toISOString().split('T')[0]);
                    setReceiveQtyInput('');
                    setReceiveChallanInput('');
                  } else {
                    alert('No drawstring items available to receive.');
                  }
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                title="Quick RCVD Entry"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>+ RCVD Entry</span>
              </button>
            )}

            {isEditable && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Booking</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className={`p-4 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white shadow-xl'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* General Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Buyer, Ref/Job, SR/GT, PO, Item Name, Color..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={`w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          {/* Buyer Filter */}
          <div>
            <select
              value={selectedBuyer}
              onChange={(e) => { setSelectedBuyer(e.target.value); setCurrentPage(1); }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">All Buyers ({buyers.length - 1})</option>
              {buyers.filter(b => b !== 'ALL').map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">🟨 Pending (0% Recv - Yellow)</option>
              <option value="PARTIAL">🟦 Partial (In Progress)</option>
              <option value="FULFILLED">🟩 Fulfilled (Completed)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

        </div>
      </div>

      {/* Main Table displaying EXACT Supabase Columns in Order */}
      <div className={`rounded-2xl border overflow-hidden shadow-xl ${
        isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="overflow-auto max-h-[75vh]">
          <table className={`w-full text-left border-collapse min-w-[1600px] border ${
            isLight ? 'border-slate-300' : 'border-slate-700'
          }`}>
            <thead className="sticky top-0 z-30 shadow-sm">
              
              {/* Header Titles Row - 15 Supabase Columns */}
              <tr className={`text-[11px] font-black uppercase tracking-wider ${
                isLight ? 'bg-slate-900 text-slate-100' : 'bg-slate-950 text-slate-200'
              }`}>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[120px]">buyer</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[60px] text-center">sl_no</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[95px]">booking_date</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[150px]">ref_no_job_no</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[120px]">sr_gt_no</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[100px]">po_no</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[110px]">item_name</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[120px]">color</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[80px]">size</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[100px] text-right bg-amber-950/40 text-amber-200">booking_qty</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[95px] text-right bg-emerald-950/40 text-emerald-200">rcv_qty</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[95px] text-right bg-rose-950/40 text-rose-200">due_qty</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[100px] text-right">last_rcvd_qty</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[160px]">rcvd_date</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[120px]">remarks</th>
                <th className="py-2.5 px-2 border border-slate-700 min-w-[130px] text-center bg-teal-950/60 text-teal-200">RCVD Action</th>
              </tr>

              {/* Frozen Column Filter Row - Instant Typing Filters for all 15 columns */}
              <tr className={`${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
                {/* 1. buyer */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.buyer}
                    onChange={(e) => handleColFilterChange('buyer', e.target.value)}
                    placeholder="🔍 buyer..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 2. sl_no */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.sl_no}
                    onChange={(e) => handleColFilterChange('sl_no', e.target.value)}
                    placeholder="🔍 sl..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono text-center focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 3. booking_date */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.booking_date}
                    onChange={(e) => handleColFilterChange('booking_date', e.target.value)}
                    placeholder="🔍 date..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 4. ref_no_job_no */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.ref_no_job_no}
                    onChange={(e) => handleColFilterChange('ref_no_job_no', e.target.value)}
                    placeholder="🔍 ref/job..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 5. sr_gt_no */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.sr_gt_no}
                    onChange={(e) => handleColFilterChange('sr_gt_no', e.target.value)}
                    placeholder="🔍 sr/gt..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 6. po_no */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.po_no}
                    onChange={(e) => handleColFilterChange('po_no', e.target.value)}
                    placeholder="🔍 po..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 7. item_name */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.item_name}
                    onChange={(e) => handleColFilterChange('item_name', e.target.value)}
                    placeholder="🔍 item..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 8. color */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.color}
                    onChange={(e) => handleColFilterChange('color', e.target.value)}
                    placeholder="🔍 color..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 9. size */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.size}
                    onChange={(e) => handleColFilterChange('size', e.target.value)}
                    placeholder="🔍 size..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 10. booking_qty */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.booking_qty}
                    onChange={(e) => handleColFilterChange('booking_qty', e.target.value)}
                    placeholder="🔍 book..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 11. rcv_qty */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.rcv_qty}
                    onChange={(e) => handleColFilterChange('rcv_qty', e.target.value)}
                    placeholder="🔍 rcv..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 12. due_qty */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.due_qty}
                    onChange={(e) => handleColFilterChange('due_qty', e.target.value)}
                    placeholder="🔍 due..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 13. last_rcvd_qty */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.last_rcvd_qty}
                    onChange={(e) => handleColFilterChange('last_rcvd_qty', e.target.value)}
                    placeholder="🔍 last..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 14. rcvd_date */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.rcvd_date}
                    onChange={(e) => handleColFilterChange('rcvd_date', e.target.value)}
                    placeholder="🔍 rcvd date..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* 15. remarks */}
                <th className="p-1 border border-slate-300 dark:border-slate-700">
                  <input
                    type="text"
                    value={colFilters.remarks}
                    onChange={(e) => handleColFilterChange('remarks', e.target.value)}
                    placeholder="🔍 remarks..."
                    className={`w-full px-1.5 py-1 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </th>

                {/* Clear Button */}
                <th className="p-1 border border-slate-300 dark:border-slate-700 text-center">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition-all w-full"
                    title="Clear column filters"
                  >
                    Clear
                  </button>
                </th>
              </tr>

            </thead>
            <tbody className="text-xs font-semibold">
              {isLoading ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 font-bold border border-slate-300 dark:border-slate-700">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    <span>Fetching Drawstring Records from Supabase...</span>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 font-bold border border-slate-300 dark:border-slate-700">
                    No matching drawstring items found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const bName = item.buyer || item.buyer_name || '-';
                  const slNo = item.sl_no || item.id || idx + 1;
                  const bDate = item.booking_date || item.date || '-';
                  const refJob = item.ref_no_job_no || item.style || '-';
                  const srGt = item.sr_gt_no || item.store_ref || '-';
                  const poNo = item.po_no || item.order_no || '-';
                  const iName = item.item_name || item.drawstring_type || 'DRAWSTRING';
                  const col = item.color || item.colour || '-';
                  const sizeVal = item.size || item.size_mm || '-';
                  const bQty = item.booking_qty ?? 0;
                  const rQty = item.rcv_qty ?? item.receive_qty ?? 0;
                  const dQty = item.due_qty ?? item.balance_qty ?? Math.max(0, bQty - rQty);
                  const lastRcvd = item.last_rcvd_qty ?? 0;
                  const rcvdDateStr = item.rcvd_date || item.receive_date || '';
                  const rem = item.remarks || '';

                  // Sewing Thread highlighting logic:
                  // Pending (rcv_qty === 0 && booking_qty > 0) -> Yellow background on Color and Booking Qty
                  const isPending = rQty === 0 && bQty > 0;
                  const isFulfilled = rQty >= bQty && bQty > 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors ${
                        isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
                      }`}
                    >
                      {/* 1. buyer */}
                      <td className="py-2.5 px-2 font-extrabold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
                        {bName}
                      </td>

                      {/* 2. sl_no */}
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500 border border-slate-300 dark:border-slate-700">
                        {slNo}
                      </td>

                      {/* 3. booking_date */}
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {bDate}
                      </td>

                      {/* 4. ref_no_job_no */}
                      <td className="py-2.5 px-2 font-bold text-teal-700 dark:text-teal-400 border border-slate-300 dark:border-slate-700">
                        {refJob}
                      </td>

                      {/* 5. sr_gt_no */}
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {srGt}
                      </td>

                      {/* 6. po_no */}
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {poNo}
                      </td>

                      {/* 7. item_name */}
                      <td className="py-2.5 px-2 font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {iName}
                      </td>

                      {/* 8. color (Yellow highlight if pending) */}
                      <td className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">
                        {isPending ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-yellow-200 text-yellow-950 font-black border border-yellow-400 shadow-2xs">
                            {col}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-white">
                            {col}
                          </span>
                        )}
                      </td>

                      {/* 9. size */}
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {sizeVal}
                      </td>

                      {/* 10. booking_qty (Yellow highlight if pending) */}
                      <td className="py-2.5 px-2 text-right border border-slate-300 dark:border-slate-700">
                        {isPending ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-yellow-200 text-yellow-950 font-black border border-yellow-400 shadow-2xs">
                            {bQty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {bQty.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* 11. rcv_qty */}
                      <td className="py-2.5 px-2 text-right font-black text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700">
                        {rQty.toLocaleString()}
                      </td>

                      {/* 12. due_qty */}
                      <td className="py-2.5 px-2 text-right font-black text-rose-600 dark:text-rose-400 border border-slate-300 dark:border-slate-700">
                        {dQty.toLocaleString()}
                      </td>

                      {/* 13. last_rcvd_qty */}
                      <td className="py-2.5 px-2 text-right font-mono text-[11px] text-teal-600 dark:text-teal-400 border border-slate-300 dark:border-slate-700">
                        {lastRcvd > 0 ? lastRcvd.toLocaleString() : '0'}
                      </td>

                      {/* 14. rcvd_date */}
                      <td className="py-2.5 px-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 max-w-[200px] truncate" title={rcvdDateStr}>
                        {rcvdDateStr || '-'}
                      </td>

                      {/* 15. remarks */}
                      <td className="py-2.5 px-2 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 max-w-[150px] truncate" title={rem}>
                        {rem || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 text-center border border-slate-300 dark:border-slate-700">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditable ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className={`p-1 rounded-lg border transition-all ${
                                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                                title="Edit Full Row"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemForReceive(item);
                                  setReceiveDateInput(new Date().toISOString().split('T')[0]);
                                  setReceiveQtyInput('');
                                  setReceiveChallanInput('');
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-lg shadow-md flex items-center gap-1 transition-all"
                                title="Log Received Quantity (RCVD)"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                                <span>RCVD</span>
                              </button>

                              {onDeleteItem && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete drawstring row #${item.id} (${bName})?`)) {
                                      onDeleteItem(item.id);
                                    }
                                  }}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-500" />
                              View
                            </span>
                          )}

                          {item.receive_logs && item.receive_logs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryItem(item)}
                              className={`p-1 rounded-lg border transition-all ${
                                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                              title="View History Logs"
                            >
                              <History className="w-3.5 h-3.5 text-indigo-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className={`sticky bottom-0 z-30 font-black text-xs uppercase border-t-2 shadow-2xl ${
              isLight ? 'bg-slate-900 text-white border-teal-500' : 'bg-slate-950 text-slate-100 border-teal-500'
            }`}>
              <tr>
                <td colSpan={9} className="py-3 px-3 text-right font-black tracking-wider text-amber-400">
                  Grand Total ({filteredItems.length} Records):
                </td>
                <td className="py-3 px-2 text-right font-mono font-black text-amber-300 text-xs">
                  {filteredItems.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0).toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right font-mono font-black text-emerald-400 text-xs">
                  {filteredItems.reduce((acc, i) => acc + (Number(i.rcv_qty ?? i.receive_qty) || 0), 0).toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right font-mono font-black text-rose-300 text-xs">
                  {filteredItems.reduce((acc, i) => {
                    const bQty = Number(i.booking_qty) || 0;
                    const rQty = Number(i.rcv_qty ?? i.receive_qty) || 0;
                    const dQty = Number(i.due_qty ?? i.balance_qty) || Math.max(0, bQty - rQty);
                    return acc + dQty;
                  }, 0).toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right font-mono font-black text-teal-300 text-xs">
                  {filteredItems.reduce((acc, i) => acc + (Number(i.last_rcvd_qty) || 0), 0).toLocaleString()}
                </td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className={`p-4 border-t flex items-center justify-between text-xs font-bold ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
          }`}>
            <span>Showing {paginatedItems.length} of {filteredItems.length} records</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK RECEIVE UPDATE MODAL */}
      {selectedItemForReceive && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-teal-500" />
                <h3 className="font-extrabold text-base">Drawstring Receive Entry</h3>
              </div>
              <button 
                onClick={() => setSelectedItemForReceive(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Selector & Details Card */}
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Select Drawstring Item to Receive</label>
              <select
                value={selectedItemForReceive.id}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const found = items.find(i => i.id === selectedId);
                  if (found) setSelectedItemForReceive(found);
                }}
                className={`w-full p-2 mb-3 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                {items.map(i => {
                  const bName = i.buyer || i.buyer_name || '';
                  const ref = i.ref_no_job_no || i.style || '';
                  const col = i.color || i.colour || '';
                  const sizeVal = i.size || i.size_mm || '';
                  const bQty = i.booking_qty || 0;
                  const rQty = i.rcv_qty ?? i.receive_qty ?? 0;
                  const dQty = i.due_qty ?? i.balance_qty ?? Math.max(0, bQty - rQty);
                  return (
                    <option key={i.id} value={i.id}>
                      {bName} | Ref: {ref} | {col} | {sizeVal} (Due: {dQty.toLocaleString()})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex justify-between font-mono text-teal-500 font-bold">
                <span>Buyer: {selectedItemForReceive.buyer || selectedItemForReceive.buyer_name}</span>
                <span>Ref: {selectedItemForReceive.ref_no_job_no || selectedItemForReceive.style}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                Item: {selectedItemForReceive.item_name || selectedItemForReceive.drawstring_type} | Color: {selectedItemForReceive.color || selectedItemForReceive.colour} | Size: {selectedItemForReceive.size || selectedItemForReceive.size_mm}
              </div>
              <div className="flex justify-between pt-1 border-t text-[11px] font-extrabold dark:border-slate-800">
                <span>Booking Qty: {(selectedItemForReceive.booking_qty || 0).toLocaleString()}</span>
                <span className="text-emerald-500">Already Received: {(selectedItemForReceive.rcv_qty ?? selectedItemForReceive.receive_qty ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Receive Form */}
            <form onSubmit={handleReceiveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Today's Received Quantity *</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="e.g. 186"
                  value={receiveQtyInput}
                  onChange={(e) => setReceiveQtyInput(e.target.value)}
                  className={`w-full p-2.5 text-sm font-black rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Receive Date *</label>
                  <input
                    type="date"
                    required
                    value={receiveDateInput}
                    onChange={(e) => setReceiveDateInput(e.target.value)}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Challan / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. CH-9082"
                    value={receiveChallanInput}
                    onChange={(e) => setReceiveChallanInput(e.target.value)}
                    className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 1st lot delivered"
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  className={`w-full p-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForReceive(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Received Qty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROW MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-2xl p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                Edit Drawstring Record (#{editingItem.id})
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFullEditSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">buyer</label>
                <input
                  type="text"
                  value={editingItem.buyer || editingItem.buyer_name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, buyer: e.target.value, buyer_name: e.target.value })}
                  className="w-full p-2 rounded-lg border font-bold border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">sl_no</label>
                <input
                  type="text"
                  value={editingItem.sl_no || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, sl_no: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">booking_date</label>
                <input
                  type="text"
                  value={editingItem.booking_date || editingItem.date || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, booking_date: e.target.value, date: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">ref_no_job_no</label>
                <input
                  type="text"
                  value={editingItem.ref_no_job_no || editingItem.style || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, ref_no_job_no: e.target.value, style: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">sr_gt_no</label>
                <input
                  type="text"
                  value={editingItem.sr_gt_no || editingItem.store_ref || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, sr_gt_no: e.target.value, store_ref: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">po_no</label>
                <input
                  type="text"
                  value={editingItem.po_no || editingItem.order_no || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, po_no: e.target.value, order_no: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">item_name</label>
                <input
                  type="text"
                  value={editingItem.item_name || editingItem.drawstring_type || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value, drawstring_type: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">color</label>
                <input
                  type="text"
                  value={editingItem.color || editingItem.colour || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value, colour: e.target.value })}
                  className="w-full p-2 rounded-lg border font-bold border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">size</label>
                <input
                  type="text"
                  value={editingItem.size || editingItem.size_mm || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, size: e.target.value, size_mm: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">booking_qty</label>
                <input
                  type="number"
                  step="any"
                  value={editingItem.booking_qty}
                  onChange={(e) => setEditingItem({ ...editingItem, booking_qty: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg border font-black border-slate-300 dark:border-slate-700 bg-yellow-50 text-yellow-950"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">rcv_qty</label>
                <input
                  type="number"
                  step="any"
                  value={editingItem.rcv_qty ?? editingItem.receive_qty}
                  onChange={(e) => setEditingItem({ ...editingItem, rcv_qty: parseFloat(e.target.value) || 0, receive_qty: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg border font-black border-slate-300 dark:border-slate-700 bg-emerald-50 text-emerald-950"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">last_rcvd_qty</label>
                <input
                  type="number"
                  step="any"
                  value={editingItem.last_rcvd_qty || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, last_rcvd_qty: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold mb-1">rcvd_date (breakdown string e.g. "22/07/=186,")</label>
                <input
                  type="text"
                  value={editingItem.rcvd_date || editingItem.receive_date || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, rcvd_date: e.target.value, receive_date: e.target.value })}
                  className="w-full p-2 rounded-lg border font-mono border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold mb-1">remarks</label>
                <input
                  type="text"
                  value={editingItem.remarks || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, remarks: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="col-span-2 pt-3 flex justify-end gap-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW DRAWSTRING BOOKING MODAL */}
      {isAddModalOpen && (
        <DrawstringNewBookingModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddBooking={async (newItemData) => {
            if (onAddItem) {
              await onAddItem(newItemData);
            }
          }}
          existingBuyers={buyers.filter(b => b !== 'ALL')}
        />
      )}

      {/* TRANSACTION HISTORY LOGS MODAL */}
      {historyItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base">Receive History Logs</h3>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 font-bold text-teal-600 dark:text-teal-400">
              <div>Buyer: {historyItem.buyer || historyItem.buyer_name}</div>
              <div>Ref/Job: {historyItem.ref_no_job_no || historyItem.style} ({historyItem.color || historyItem.colour})</div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {historyItem.receive_logs && historyItem.receive_logs.length > 0 ? (
                historyItem.receive_logs.map((log) => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">+ {log.qty.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">{log.date} | Challan: {log.challan}</div>
                      {log.remarks && <div className="text-[10px] italic text-slate-400">{log.remarks}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">No receive transaction history logged.</div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
