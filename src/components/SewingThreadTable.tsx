import React, { useState, useMemo, useEffect } from 'react';
import XLSX from 'xlsx-js-style';
import { SewingThreadItem, StatusFilter, TransactionLog, UserProfile, QuickUpdatePayload, AppTheme } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { SewingThreadNewBookingModal } from './SewingThreadNewBookingModal';
import { SewingThreadQuickStoreRefModal } from './SewingThreadQuickStoreRefModal';
import { 
  Search, Plus, Filter, Tag, Download, RefreshCw, History, ArrowUpDown, 
  CheckCircle2, Clock, Package, Edit, Trash2, Zap, FileText, Upload, Sparkles, X, ChevronRight, Save, Lock 
} from 'lucide-react';

interface SewingThreadTableProps {
  items: SewingThreadItem[];
  isLoading: boolean;
  onAddBooking: (newItemData: Omit<SewingThreadItem, 'id'> | Omit<SewingThreadItem, 'id'>[]) => Promise<void>;
  onUpdateBooking: (updatedItem: SewingThreadItem) => Promise<void>;
  onDeleteBooking: (id: number) => Promise<void>;
  onSaveQuickUpdates?: (updates: QuickUpdatePayload[]) => Promise<void>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
  theme?: AppTheme;
  openNewBookingSignal?: number;
}

export const SewingThreadTable: React.FC<SewingThreadTableProps> = ({
  items,
  isLoading,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking,
  onSaveQuickUpdates,
  onRefresh,
  showToast,
  currentUser,
  canEdit,
  theme = 'light',
  openNewBookingSignal = 0
}) => {
  const isEditable = canEdit ?? canUserModifyData(currentUser || null);
  const isLight = theme === 'light';

  // Filters
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [generalSearch, setGeneralSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<keyof SewingThreadItem>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Quick Action Bar Search State
  const [quickStoreRefSearch, setQuickStoreRefSearch] = useState<string>('');

  // Modals state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [isQuickWorkspaceOpen, setIsQuickWorkspaceOpen] = useState<boolean>(false);
  const [quickWorkspaceTargetRef, setQuickWorkspaceTargetRef] = useState<string>('');
  const [editingItem, setEditingItem] = useState<SewingThreadItem | null>(null);

  useEffect(() => {
    if (openNewBookingSignal && openNewBookingSignal > 0) {
      setIsNewBookingOpen(true);
    }
  }, [openNewBookingSignal]);

  // Extract unique buyers & styles
  const uniqueBuyers = useMemo(() => Array.from(new Set(items.map(i => i.buyer_name || i.buyer).filter(Boolean))), [items]);
  const uniqueStyles = useMemo(() => Array.from(new Set(items.map(i => i.style).filter(Boolean))), [items]);

  // Per-column filter state for instant typing search
  const [sewingColFilters, setSewingColFilters] = useState({
    id: '',
    buyer: '',
    job_no: '',
    style: '',
    order_no: '',
    sr_gt: '',
    store_ref: '',
    count: '',
    colour: '',
    shade: '',
    booking_qty: '',
    recv_qty: '',
    issue_qty: '',
    balance_qty: '',
    supplier: '',
    remarks: ''
  });

  const handleSewingColFilterChange = (key: keyof typeof sewingColFilters, val: string) => {
    setSewingColFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearSewingColFilters = () => {
    setGeneralSearch('');
    setSelectedBuyer('ALL');
    setSelectedStyle('ALL');
    setStatusFilter('ALL');
    setSewingColFilters({
      id: '',
      buyer: '',
      job_no: '',
      style: '',
      order_no: '',
      sr_gt: '',
      store_ref: '',
      count: '',
      colour: '',
      shade: '',
      booking_qty: '',
      recv_qty: '',
      issue_qty: '',
      balance_qty: '',
      supplier: '',
      remarks: ''
    });
  };

  // Status Helper
  const getItemStatus = (bookingQty: number, receiveQty: number) => {
    if (bookingQty > 0 && (receiveQty || 0) === 0) return 'PENDING';
    if ((receiveQty || 0) > 0 && (receiveQty || 0) < bookingQty) return 'PARTIAL';
    return 'FULFILLED';
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Buyer filter
      if (selectedBuyer !== 'ALL' && (item.buyer_name || item.buyer) !== selectedBuyer) return false;
      // Style filter
      if (selectedStyle !== 'ALL' && item.style !== selectedStyle) return false;

      // Status filter
      const status = getItemStatus(item.booking_qty, item.receive_qty);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;

      // General search
      if (generalSearch.trim()) {
        const q = generalSearch.toLowerCase();
        const match = 
          (item.buyer_name || item.buyer)?.toLowerCase().includes(q) ||
          item.style?.toLowerCase().includes(q) ||
          (item.colour || item.color)?.toLowerCase().includes(q) ||
          (item.store_ref || item.s_thread_ref)?.toLowerCase().includes(q) ||
          item.order_no?.toLowerCase().includes(q) ||
          (item.thread_count || item.count)?.toLowerCase().includes(q) ||
          (item.shade_no || item.pantone)?.toLowerCase().includes(q) ||
          item.sr_gt?.toLowerCase().includes(q) ||
          item.job_no?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Column Filters (Live instant search as user types)
      if (sewingColFilters.id && !String(item.id).includes(sewingColFilters.id)) return false;
      if (sewingColFilters.buyer && !(item.buyer_name || item.buyer || '').toLowerCase().includes(sewingColFilters.buyer.toLowerCase())) return false;
      if (sewingColFilters.job_no && !(item.job_no || '').toLowerCase().includes(sewingColFilters.job_no.toLowerCase())) return false;
      if (sewingColFilters.style && !(item.style || '').toLowerCase().includes(sewingColFilters.style.toLowerCase())) return false;
      if (sewingColFilters.order_no && !(item.order_no || '').toLowerCase().includes(sewingColFilters.order_no.toLowerCase())) return false;
      if (sewingColFilters.sr_gt && !(item.sr_gt || '').toLowerCase().includes(sewingColFilters.sr_gt.toLowerCase())) return false;
      if (sewingColFilters.store_ref && !(item.store_ref || item.s_thread_ref || '').toLowerCase().includes(sewingColFilters.store_ref.toLowerCase())) return false;
      if (sewingColFilters.count && !(item.thread_count || item.count || '').toLowerCase().includes(sewingColFilters.count.toLowerCase())) return false;
      if (sewingColFilters.colour && !(item.colour || item.color || '').toLowerCase().includes(sewingColFilters.colour.toLowerCase())) return false;
      if (sewingColFilters.shade && !(item.shade_no || item.pantone || '').toLowerCase().includes(sewingColFilters.shade.toLowerCase())) return false;
      if (sewingColFilters.booking_qty && !String(item.booking_qty).includes(sewingColFilters.booking_qty)) return false;
      if (sewingColFilters.recv_qty && !String(item.receive_qty || 0).includes(sewingColFilters.recv_qty)) return false;
      if (sewingColFilters.issue_qty && !String(item.issue_qty || 0).includes(sewingColFilters.issue_qty)) return false;
      if (sewingColFilters.balance_qty && !String(item.balance_qty || 0).includes(sewingColFilters.balance_qty)) return false;
      if (sewingColFilters.supplier && !(item.supplier || '').toLowerCase().includes(sewingColFilters.supplier.toLowerCase())) return false;
      if (sewingColFilters.remarks && !(item.remarks || '').toLowerCase().includes(sewingColFilters.remarks.toLowerCase())) return false;

      return true;
    }).sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, selectedBuyer, selectedStyle, statusFilter, generalSearch, sewingColFilters, sortField, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    const totalPending = items.filter(i => i.booking_qty > 0 && (i.receive_qty || 0) === 0).length;
    const totalPartial = items.filter(i => (i.receive_qty || 0) > 0 && (i.receive_qty || 0) < i.booking_qty).length;
    const totalFulfilled = items.filter(i => (i.receive_qty || 0) >= i.booking_qty).length;

    return { totalPending, totalPartial, totalFulfilled };
  }, [items]);

  const handleSort = (field: keyof SewingThreadItem) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleOpenQuickWorkspace = (targetRef: string = '') => {
    setQuickWorkspaceTargetRef(targetRef);
    setIsQuickWorkspaceOpen(true);
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Buyer Name',
      'Job No',
      'Style',
      'Order No / PO',
      'SR / GT',
      'Store Ref',
      'Thread Count',
      'Meter / Cone',
      'Per Body Consm',
      'Colour',
      'Shade / Pantone',
      'Booking Qty',
      'Receive Date',
      'Receive Challan',
      'Receive Qty',
      'Issue Date',
      'Issue Challan',
      'Issue Qty',
      'Balance Qty',
      'Supplier',
      'QC Status',
      'Remarks'
    ];

    const createStyledWorksheet = (itemList: SewingThreadItem[]) => {
      const dataRows = itemList.map(i => [
        i.id,
        i.buyer_name || i.buyer || '',
        i.job_no || '',
        i.style || '',
        i.order_no || '',
        i.sr_gt || '',
        i.s_thread_ref || i.store_ref || '',
        i.thread_count || i.count || '',
        i.meter || '',
        i.per_body_consm || '',
        i.colour || i.color || '',
        i.shade_no || i.pantone || '',
        Number(i.booking_qty) || 0,
        i.receive_date || i.rcvd_date || '',
        i.receive_challan || i.rcvd_challan || '',
        Number(i.receive_qty) || 0,
        i.issue_date || '',
        i.issue_challan || '',
        Number(i.issue_qty) || 0,
        Number(i.balance_qty) || 0,
        i.supplier || '',
        i.qc_not_ok ? 'QC NOT OK' : 'QC OK',
        i.remarks || ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Row Heights
      ws['!rows'] = [
        { hpt: 28 }, // Header row
        ...itemList.map(() => ({ hpt: 20 })) // Data rows
      ];

      // Column Widths calculation
      const colWidths = headers.map((h, colIdx) => {
        let maxLen = h.length;
        dataRows.forEach(row => {
          const val = row[colIdx] != null ? String(row[colIdx]) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 35) };
      });
      ws['!cols'] = colWidths;

      // Styling parameters
      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      };

      const headerStyle = {
        fill: { fgColor: { rgb: '1E3A8A' } }, // Deep Navy
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'medium', color: { rgb: '1E3A8A' } },
          bottom: { style: 'medium', color: { rgb: '1E3A8A' } },
          left: { style: 'thin', color: { rgb: '3B82F6' } },
          right: { style: 'thin', color: { rgb: '3B82F6' } }
        }
      };

      // 1. Style Header Cells
      headers.forEach((_, c) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      });

      // 2. Style Data Cells
      itemList.forEach((item, rowIdx) => {
        const r = rowIdx + 1; // Row 0 is header
        const bookingQty = Number(item.booking_qty) || 0;
        const receiveQty = Number(item.receive_qty) || 0;

        // Unreceived or pending receive check
        const isUnreceived = receiveQty < bookingQty || receiveQty === 0;
        const isZeroReceive = receiveQty === 0;

        headers.forEach((colName, c) => {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) return;

          const isBookingQtyCol = colName === 'Booking Qty';
          const isColourCol = colName === 'Colour';
          const isNumericCol = ['Booking Qty', 'Receive Qty', 'Issue Qty', 'Balance Qty'].includes(colName);
          const isCenterCol = ['ID', 'QC Status', 'Receive Date', 'Issue Date', 'Thread Count'].includes(colName);

          // Default styling
          let fgColor = rowIdx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
          let fontColor = '1F2937';
          let isBold = false;

          // Apply Yellow Highlights for Unreceived Bookings ONLY on 'Booking Qty' and 'Colour'
          if (isUnreceived) {
            if (isBookingQtyCol) {
              fgColor = 'FFFF00'; // Bright Yellow
              fontColor = '991B1B'; // Bold Dark Red text
              isBold = true;
            } else if (isColourCol) {
              fgColor = 'FFFF00'; // Bright Yellow for Colour
              fontColor = '1F2937';
              isBold = true;
            }
          }

          ws[cellRef].s = {
            fill: { fgColor: { rgb: fgColor } },
            font: { name: 'Calibri', sz: 10, bold: isBold, color: { rgb: fontColor } },
            border: thinBorder,
            alignment: {
              vertical: 'center',
              horizontal: isNumericCol ? 'right' : (isCenterCol ? 'center' : 'left'),
              wrapText: true
            }
          };
        });
      });

      return ws;
    };

    const wb = XLSX.utils.book_new();

    // 1. All Items Master Sheet
    const wsMaster = createStyledWorksheet(filteredItems);
    XLSX.utils.book_append_sheet(wb, wsMaster, "All Sewing Threads");

    // 2. Separate Sheets for Each Buyer
    const buyerMap: Record<string, SewingThreadItem[]> = {};
    filteredItems.forEach(item => {
      const bName = (item.buyer_name || item.buyer || 'General Buyer').trim();
      if (!buyerMap[bName]) {
        buyerMap[bName] = [];
      }
      buyerMap[bName].push(item);
    });

    Object.keys(buyerMap).forEach(bName => {
      const buyerItems = buyerMap[bName];
      const wsBuyer = createStyledWorksheet(buyerItems);

      // Clean sheet name (Excel 31 char limit, no invalid chars : \ / ? * [ ])
      let safeName = bName.replace(/[:\\/?*\[\]]/g, '').trim().slice(0, 30);
      if (!safeName) safeName = 'Buyer';

      // Avoid duplicate sheet names
      let finalSheetName = safeName;
      let counter = 1;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${safeName.slice(0, 25)}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(wb, wsBuyer, finalSheetName);
    });

    XLSX.writeFile(wb, `sewing_thread_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Excel downloaded with styled sheets & yellow highlighted unreceived bookings!', 'success');
  };

  // Internal save fallback for quick updates if onSaveQuickUpdates is not passed directly
  const handleInternalSaveQuickUpdates = async (updates: QuickUpdatePayload[]) => {
    if (onSaveQuickUpdates) {
      await onSaveQuickUpdates(updates);
    } else {
      // Loop update each item via onUpdateBooking
      for (const update of updates) {
        const existing = items.find(i => i.id === update.id);
        if (existing) {
          const updatedRecvLogs = [...(existing.receive_logs || [])];
          const updatedIssLogs = [...(existing.issue_logs || [])];

          if (update.new_receive_log) updatedRecvLogs.push(update.new_receive_log);
          if (update.new_receive_logs) updatedRecvLogs.push(...update.new_receive_logs);
          if (update.new_issue_log) updatedIssLogs.push(update.new_issue_log);
          if (update.new_issue_logs) updatedIssLogs.push(...update.new_issue_logs);

          const updatedItem: SewingThreadItem = {
            ...existing,
            receive_qty: update.receive_qty,
            receive_date: update.receive_date,
            receive_challan: update.receive_challan,
            issue_qty: update.issue_qty,
            issue_date: update.issue_date,
            issue_challan: update.issue_challan,
            balance_qty: update.balance_qty,
            remarks: update.remarks !== undefined ? update.remarks : existing.remarks,
            receive_logs: updatedRecvLogs,
            issue_logs: updatedIssLogs
          };
          await onUpdateBooking(updatedItem);
        }
      }
      showToast(`Updated ${updates.length} sewing thread item(s)`);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* FAST SEWING THREAD ACTION BANNER (LIKE TWILL TAPE) */}
      <div className={`p-4 rounded-2xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${
        isLight 
          ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-emerald-200 text-slate-900' 
          : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-800/80 text-white'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold">Fast Sewing Thread Quick Receive / Issue Action</h3>
          </div>
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Type a <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">store_ref</code> or search query to open the instant batch receive & issue workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={quickStoreRefSearch}
            onChange={(e) => setQuickStoreRefSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleOpenQuickWorkspace(quickStoreRefSearch);
            }}
            placeholder="Type Store Ref or Style..."
            className={`px-3 py-2 border rounded-xl text-xs font-mono font-bold flex-1 md:w-64 ${
              isLight ? 'bg-white border-emerald-300 text-slate-900' : 'bg-slate-800 border-emerald-500/40 text-white'
            }`}
          />
          <button
            onClick={() => handleOpenQuickWorkspace(quickStoreRefSearch)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Quick Receive / Issue</span>
          </button>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className={`border rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        
        {/* Left: Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={generalSearch}
              onChange={(e) => setGeneralSearch(e.target.value)}
              placeholder="Search Style, Shade, Count, Ref..."
              className={`w-full pl-8 pr-6 py-1.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            />
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
          }`}>
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Buyer:</span>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`bg-transparent text-xs font-bold focus:outline-none ${isLight ? 'text-emerald-900' : 'text-emerald-200'}`}
            >
              <option value="ALL" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>All Buyers ({items.length})</option>
              {uniqueBuyers.map(b => (
                <option key={b} value={b} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{b}</option>
              ))}
            </select>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
          }`}>
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Style:</span>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className={`bg-transparent text-xs font-bold focus:outline-none max-w-[150px] truncate ${isLight ? 'text-amber-900' : 'text-amber-200'}`}
            >
              <option value="ALL" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>All Styles</option>
              {uniqueStyles.map(s => (
                <option key={s} value={s} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className={`p-2 rounded-xl border transition-all ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
          </button>

          {isEditable && (
            <button
              onClick={() => setIsNewBookingOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Thread Booking</span>
            </button>
          )}
        </div>

      </div>

      {/* STATUS BADGE TABS */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl border transition-all ${
            statusFilter === 'ALL'
              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
              : isLight ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          All Items ({items.length})
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : isLight ? 'bg-white text-amber-600 border-slate-300 hover:bg-amber-50' : 'bg-slate-950 text-amber-400 border-slate-800 hover:bg-amber-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Pending ({stats.totalPending})</span>
        </button>

        <button
          onClick={() => setStatusFilter('PARTIAL')}
          className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
            statusFilter === 'PARTIAL'
              ? 'bg-blue-600 text-white border-blue-400 font-bold'
              : isLight ? 'bg-white text-blue-600 border-slate-300 hover:bg-blue-50' : 'bg-slate-950 text-blue-400 border-slate-800 hover:bg-blue-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Partial ({stats.totalPartial})</span>
        </button>

        <button
          onClick={() => setStatusFilter('FULFILLED')}
          className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
            statusFilter === 'FULFILLED'
              ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
              : isLight ? 'bg-white text-emerald-600 border-slate-300 hover:bg-emerald-50' : 'bg-slate-950 text-emerald-400 border-slate-800 hover:bg-emerald-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Fulfilled ({stats.totalFulfilled})</span>
        </button>
      </div>

      {/* TABLE DATA WITH CELL BORDERS AND FROZEN HEADERS */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl ${
        isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="overflow-auto max-h-[75vh]">
          <table className={`w-full text-left border-collapse text-xs border ${
            isLight ? 'border-slate-300' : 'border-slate-700'
          }`}>
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className={`uppercase tracking-wider font-bold text-[11px] select-none whitespace-nowrap ${
                isLight ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-300'
              }`}>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>#</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('buyer_name')}>Buyer</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('job_no')}>Job No</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('style')}>Style</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('order_no')}>Order No</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white">SR/GT</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 bg-indigo-950/80 text-indigo-200 cursor-pointer hover:text-white" onClick={() => handleSort('store_ref')}>Store Ref</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('thread_count')}>Count</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Meter</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Per Body Consm</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('colour')}>Colour</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 cursor-pointer hover:text-white" onClick={() => handleSort('shade_no')}>Pantone / Shade</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-right">Book Qty</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Recv Date</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Recv Challan</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-right bg-emerald-950/80 text-emerald-200">Recv Qty</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Issue Date</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Issue Challan</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-right bg-blue-950/80 text-blue-200">Issue Qty</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-right">Balance Qty</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Supplier</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">QC Status</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700">Remarks</th>
                <th className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-center">Actions</th>
              </tr>

              {/* Frozen Per-Column Filter Input Row */}
              <tr className={`${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[45px]">
                  <input type="text" value={sewingColFilters.id} onChange={e => handleSewingColFilterChange('id', e.target.value)} placeholder="#" className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[90px]">
                  <input type="text" value={sewingColFilters.buyer} onChange={e => handleSewingColFilterChange('buyer', e.target.value)} placeholder="Buyer..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[70px]">
                  <input type="text" value={sewingColFilters.job_no} onChange={e => handleSewingColFilterChange('job_no', e.target.value)} placeholder="Job..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[90px]">
                  <input type="text" value={sewingColFilters.style} onChange={e => handleSewingColFilterChange('style', e.target.value)} placeholder="Style..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[80px]">
                  <input type="text" value={sewingColFilters.order_no} onChange={e => handleSewingColFilterChange('order_no', e.target.value)} placeholder="Order..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.sr_gt} onChange={e => handleSewingColFilterChange('sr_gt', e.target.value)} placeholder="SR/GT..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[90px]">
                  <input type="text" value={sewingColFilters.store_ref} onChange={e => handleSewingColFilterChange('store_ref', e.target.value)} placeholder="Store Ref..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.count} onChange={e => handleSewingColFilterChange('count', e.target.value)} placeholder="Count..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[50px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[50px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[80px]">
                  <input type="text" value={sewingColFilters.colour} onChange={e => handleSewingColFilterChange('colour', e.target.value)} placeholder="Colour..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[80px]">
                  <input type="text" value={sewingColFilters.shade} onChange={e => handleSewingColFilterChange('shade', e.target.value)} placeholder="Shade..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.booking_qty} onChange={e => handleSewingColFilterChange('booking_qty', e.target.value)} placeholder="Book..." className="w-full px-1 py-0.5 text-[10px] rounded border text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.recv_qty} onChange={e => handleSewingColFilterChange('recv_qty', e.target.value)} placeholder="Recv..." className="w-full px-1 py-0.5 text-[10px] rounded border text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.issue_qty} onChange={e => handleSewingColFilterChange('issue_qty', e.target.value)} placeholder="Issue..." className="w-full px-1 py-0.5 text-[10px] rounded border text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                  <input type="text" value={sewingColFilters.balance_qty} onChange={e => handleSewingColFilterChange('balance_qty', e.target.value)} placeholder="Bal..." className="w-full px-1 py-0.5 text-[10px] rounded border text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[70px]">
                  <input type="text" value={sewingColFilters.supplier} onChange={e => handleSewingColFilterChange('supplier', e.target.value)} placeholder="Supplier..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[50px]"></th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[70px]">
                  <input type="text" value={sewingColFilters.remarks} onChange={e => handleSewingColFilterChange('remarks', e.target.value)} placeholder="Remarks..." className="w-full px-1 py-0.5 text-[10px] rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-700 min-w-[90px] text-center">
                  <button type="button" onClick={clearSewingColFilters} className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded w-full">Clear</button>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={25} className="py-12 text-center text-slate-500 font-medium border border-slate-300 dark:border-slate-700">
                    No sewing thread items found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isPending = (item.booking_qty > 0 && (item.receive_qty || 0) === 0);
                  const isFulfilled = (item.balance_qty <= 0 || (item.receive_qty || 0) >= item.booking_qty);

                  // Row style: clean white background for all rows
                  const rowStyle = 'bg-white text-slate-900 border-l-4 ' + 
                    (isFulfilled ? 'border-l-emerald-500' : isPending ? 'border-l-amber-500' : 'border-l-blue-500');

                  return (
                    <tr key={item.id} className={`${rowStyle} transition-colors hover:bg-slate-50/80`}>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-600 border border-slate-300 dark:border-slate-700">{item.id}</td>
                      <td className="py-2.5 px-2 font-extrabold whitespace-nowrap text-slate-900 border border-slate-300 dark:border-slate-700">{item.buyer_name || item.buyer || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.job_no || '-'}</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-800 max-w-[130px] truncate border border-slate-300 dark:border-slate-700" title={item.style || ''}>{item.style || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.order_no || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.sr_gt || '-'}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-indigo-900 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.store_ref || item.s_thread_ref || '-'}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-800 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.thread_count || item.count || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.meter || '-'}</td>
                      <td className="py-2.5 px-2 text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.per_body_consm || '-'}</td>

                      {/* Colour Cell: Highlighted in Yellow ONLY if receive_qty == 0 */}
                      <td className="py-2.5 px-2 font-bold uppercase whitespace-nowrap border border-slate-300 dark:border-slate-700">
                        <span className={isPending ? "inline-block px-2.5 py-1 bg-amber-200 text-amber-950 border border-amber-400 rounded-md font-black shadow-2xs" : "text-slate-900 font-extrabold"}>
                          {item.colour || item.color || '-'}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-mono font-semibold text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.shade_no || item.pantone || '-'}</td>

                      {/* Booking Qty Cell: Highlighted in Yellow ONLY if receive_qty == 0 */}
                      <td className="py-2.5 px-2 text-right font-mono font-extrabold whitespace-nowrap border border-slate-300 dark:border-slate-700">
                        <span className={isPending ? "inline-block px-2.5 py-1 bg-amber-200 text-amber-950 border border-amber-400 rounded-md font-black shadow-2xs" : "text-slate-900 font-extrabold"}>
                          {item.booking_qty?.toLocaleString() ?? 0}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.receive_date || item.rcvd_date || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.receive_challan || item.rcvd_challan || '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-900 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.receive_qty?.toLocaleString() ?? 0}</td>

                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.issue_date || '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.issue_challan || '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-900 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.issue_qty?.toLocaleString() ?? 0}</td>

                      {/* Balance Qty Cell: if balance is 0, clean white background badge */}
                      <td className="py-2.5 px-2 text-right font-mono font-extrabold whitespace-nowrap border border-slate-300 dark:border-slate-700">
                        <span className={`px-2 py-0.5 rounded border ${
                          item.balance_qty <= 0
                            ? 'bg-slate-100 text-slate-600 border-slate-200 font-bold'
                            : 'bg-amber-100 text-amber-950 border-amber-300 font-black'
                        }`}>
                          {item.balance_qty?.toLocaleString() ?? 0}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-slate-700 whitespace-nowrap border border-slate-300 dark:border-slate-700">{item.supplier || '-'}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap border border-slate-300 dark:border-slate-700">
                        {item.qc_not_ok ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            QC NOT OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 text-[11px] max-w-[150px] truncate border border-slate-300 dark:border-slate-700" title={item.remarks}>{item.remarks || '-'}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isEditable ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-indigo-600 transition-all shadow-2xs"
                                title="Edit Sewing Thread Booking"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenQuickWorkspace(item.store_ref || item.s_thread_ref || item.style || '')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                                title="Open Receive / Issue Workspace"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>Receive / Issue</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete sewing thread record #${item.id} (${item.style})?`)) {
                                    onDeleteBooking(item.id);
                                  }
                                }}
                                className="p-1 text-rose-600 hover:text-rose-800 transition-all hover:bg-rose-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-500" />
                              View Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. NEW SEWING THREAD BOOKING MODAL */}
      <SewingThreadNewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onAddBooking={onAddBooking}
        existingBuyers={uniqueBuyers}
      />

      {/* 2. SEWING THREAD QUICK STORE REF RECEIVE / ISSUE WORKSPACE MODAL */}
      <SewingThreadQuickStoreRefModal
        isOpen={isQuickWorkspaceOpen}
        onClose={() => setIsQuickWorkspaceOpen(false)}
        initialStoreRef={quickWorkspaceTargetRef}
        allItems={items}
        onSaveQuickUpdates={handleInternalSaveQuickUpdates}
        existingBuyers={uniqueBuyers}
        theme={theme}
      />

      {/* 3. EDIT SEWING THREAD BOOKING MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="p-4 border-b flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Edit Sewing Thread Booking Record (#{editingItem.id})</h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateBooking(editingItem);
                setEditingItem(null);
                showToast("Sewing Thread record updated successfully!", "success");
              }}
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={editingItem.buyer_name || editingItem.buyer || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, buyer_name: e.target.value, buyer: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Job No</label>
                  <input
                    type="text"
                    value={editingItem.job_no || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, job_no: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Style Name</label>
                  <input
                    type="text"
                    value={editingItem.style || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, style: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Order No / PO</label>
                  <input
                    type="text"
                    value={editingItem.order_no || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, order_no: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">SR / GT Ref</label>
                  <input
                    type="text"
                    value={editingItem.sr_gt || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, sr_gt: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Store Ref Code</label>
                  <input
                    type="text"
                    value={editingItem.store_ref || editingItem.s_thread_ref || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, store_ref: e.target.value, s_thread_ref: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono font-bold text-indigo-600 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Thread Count</label>
                  <input
                    type="text"
                    value={editingItem.thread_count || editingItem.count || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, thread_count: e.target.value, count: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Colour</label>
                  <input
                    type="text"
                    value={editingItem.colour || editingItem.color || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, colour: e.target.value, color: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-bold ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Shade No / Pantone</label>
                  <input
                    type="text"
                    value={editingItem.shade_no || editingItem.pantone || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, shade_no: e.target.value, pantone: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Booking Qty (Cones)</label>
                  <input
                    type="number"
                    value={editingItem.booking_qty}
                    onChange={(e) => {
                      const bQty = Number(e.target.value) || 0;
                      const rQty = editingItem.receive_qty || 0;
                      const iQty = editingItem.issue_qty || 0;
                      const bal = rQty > 0 ? Math.max(0, rQty - iQty) : bQty;
                      setEditingItem({ ...editingItem, booking_qty: bQty, balance_qty: bal });
                    }}
                    className={`w-full p-2 border rounded-xl font-bold font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Receive Qty</label>
                  <input
                    type="number"
                    value={editingItem.receive_qty || 0}
                    onChange={(e) => {
                      const rQty = Number(e.target.value) || 0;
                      const iQty = editingItem.issue_qty || 0;
                      const bal = rQty > 0 ? Math.max(0, rQty - iQty) : editingItem.booking_qty;
                      setEditingItem({ ...editingItem, receive_qty: rQty, balance_qty: bal });
                    }}
                    className={`w-full p-2 border rounded-xl font-bold font-mono text-emerald-600 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Receive Date</label>
                  <input
                    type="date"
                    value={editingItem.receive_date || editingItem.rcvd_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, receive_date: e.target.value, rcvd_date: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Receive Challan</label>
                  <input
                    type="text"
                    value={editingItem.receive_challan || editingItem.rcvd_challan || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, receive_challan: e.target.value, rcvd_challan: e.target.value })}
                    className={`w-full p-2 border rounded-xl font-mono ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Issue Qty</label>
                  <input
                    type="number"
                    value={editingItem.issue_qty || 0}
                    onChange={(e) => {
                      const iQty = Number(e.target.value) || 0;
                      const rQty = editingItem.receive_qty || 0;
                      const bal = rQty > 0 ? Math.max(0, rQty - iQty) : editingItem.booking_qty;
                      setEditingItem({ ...editingItem, issue_qty: iQty, balance_qty: bal });
                    }}
                    className={`w-full p-2 border rounded-xl font-bold font-mono text-blue-600 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className={`w-full p-2 border rounded-xl ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1 text-xs">Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={editingItem.remarks || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, remarks: e.target.value })}
                  className={`w-full p-2 border rounded-xl text-xs ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800 border-slate-700 text-white'}`}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
