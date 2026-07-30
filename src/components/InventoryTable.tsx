import React, { useState } from 'react';
import { TwillTapeItem, UserProfile } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { getItemRowStyle } from '../utils/statusHelper';
import { 
  ArrowUpDown, 
  Edit, 
  Trash2,
  Zap, 
  Layers, 
  Tag, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  History,
  Lock,
  X
} from 'lucide-react';

interface InventoryTableProps {
  items: TwillTapeItem[];
  isLoading: boolean;
  onEditItem: (item: TwillTapeItem) => void;
  onDeleteItem?: (id: number) => void;
  onQuickStoreRefAction: (storeRef: string) => void;
  onViewHistory?: (item: TwillTapeItem) => void;
  onExportExcel?: () => void;
  theme?: 'light' | 'dark';
  currentUser?: UserProfile | null;
  canEdit?: boolean;
}

type SortField = keyof TwillTapeItem;

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  onEditItem,
  onDeleteItem,
  onQuickStoreRefAction,
  onViewHistory,
  onExportExcel,
  theme = 'light',
  currentUser,
  canEdit
}) => {
  const isEditable = canEdit ?? canUserModifyData(currentUser || null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Column Filters State
  const [colFilters, setColFilters] = useState({
    id: '',
    buyer_name: '',
    date: '',
    booking_challan: '',
    style: '',
    order_no: '',
    store_ref: '',
    job_no: '',
    colour: '',
    item_name: '',
    cm: '',
    yds: '',
    booking_qty: '',
    receive_qty: '',
    receive_date: '',
    receive_challan: '',
    issue_qty: '',
    issue_date: '',
    issue_challan: '',
    balance_qty: '',
    batch_no: '',
    remarks: ''
  });

  const handleColFilterChange = (field: keyof typeof colFilters, val: string) => {
    setColFilters(prev => ({ ...prev, [field]: val }));
    setCurrentPage(1);
  };

  const clearAllColFilters = () => {
    setColFilters({
      id: '',
      buyer_name: '',
      date: '',
      booking_challan: '',
      style: '',
      order_no: '',
      store_ref: '',
      job_no: '',
      colour: '',
      item_name: '',
      cm: '',
      yds: '',
      booking_qty: '',
      receive_qty: '',
      receive_date: '',
      receive_challan: '',
      issue_qty: '',
      issue_date: '',
      issue_challan: '',
      balance_qty: '',
      batch_no: '',
      remarks: ''
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(colFilters).some(v => String(v || '').trim().length > 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter items matching column inputs
  const filteredItems = items.filter(item => {
    if (colFilters.id && !String(item.id).toLowerCase().includes(colFilters.id.toLowerCase())) return false;
    if (colFilters.buyer_name && !item.buyer_name.toLowerCase().includes(colFilters.buyer_name.toLowerCase())) return false;
    if (colFilters.date && !(item.date || '').toLowerCase().includes(colFilters.date.toLowerCase())) return false;
    if (colFilters.booking_challan && !(item.booking_challan || '').toLowerCase().includes(colFilters.booking_challan.toLowerCase())) return false;
    if (colFilters.style && !item.style.toLowerCase().includes(colFilters.style.toLowerCase())) return false;
    if (colFilters.order_no && !item.order_no.toLowerCase().includes(colFilters.order_no.toLowerCase())) return false;
    if (colFilters.store_ref && !item.store_ref.toLowerCase().includes(colFilters.store_ref.toLowerCase())) return false;
    if (colFilters.job_no && !(item.job_no || '').toLowerCase().includes(colFilters.job_no.toLowerCase())) return false;
    if (colFilters.colour && !item.colour.toLowerCase().includes(colFilters.colour.toLowerCase())) return false;
    if (colFilters.item_name && !(item.item_name || '').toLowerCase().includes(colFilters.item_name.toLowerCase())) return false;
    if (colFilters.cm && !(item.cm || '').toLowerCase().includes(colFilters.cm.toLowerCase())) return false;
    if (colFilters.yds && !(item.yds || '').toLowerCase().includes(colFilters.yds.toLowerCase())) return false;
    if (colFilters.booking_qty && !String(item.booking_qty).includes(colFilters.booking_qty)) return false;
    if (colFilters.receive_qty && !String(item.receive_qty).includes(colFilters.receive_qty)) return false;
    if (colFilters.receive_date && !(item.receive_date || '').toLowerCase().includes(colFilters.receive_date.toLowerCase())) return false;
    if (colFilters.receive_challan && !(item.receive_challan || '').toLowerCase().includes(colFilters.receive_challan.toLowerCase())) return false;
    if (colFilters.issue_qty && !String(item.issue_qty).includes(colFilters.issue_qty)) return false;
    if (colFilters.issue_date && !(item.issue_date || '').toLowerCase().includes(colFilters.issue_date.toLowerCase())) return false;
    if (colFilters.issue_challan && !(item.issue_challan || '').toLowerCase().includes(colFilters.issue_challan.toLowerCase())) return false;
    if (colFilters.balance_qty && !String(item.balance_qty).includes(colFilters.balance_qty)) return false;
    if (colFilters.batch_no && !(item.batch_no || '').toLowerCase().includes(colFilters.batch_no.toLowerCase())) return false;
    if (colFilters.remarks && !(item.remarks || '').toLowerCase().includes(colFilters.remarks.toLowerCase())) return false;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const valA = a[sortField] ?? '';
    const valB = b[sortField] ?? '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Table Header Controls / Legend */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Row Color Legend:</span>
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            🟡 Yellow: Booking raised (0 Received)
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            🔵 Blue: Partial Receive
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ⚪ White: Fully Received / Fulfilled
          </div>
        </div>

        {/* Page Size Selector, Clear Column Filters & Excel Export */}
        <div className="flex items-center gap-3 text-slate-600">
          {hasActiveFilters && (
            <button
              onClick={clearAllColFilters}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 shadow-2xs transition-all active:scale-95"
              title="Clear all column search filter boxes"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Column Filters</span>
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all"
              title="Download Excel Spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Export Excel</span>
            </button>
          )}

          <span>Showing {paginatedItems.length} of {filteredItems.length} items (Total: {items.length})</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
          >
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

      </div>

      {/* Main Responsive Table */}
      <div className="overflow-auto max-h-[75vh]">
        <table className="w-full text-left border-collapse text-xs border border-slate-300 dark:border-slate-700">
          
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-30 shadow-sm">
            {/* Header Titles Row */}
            <tr className="bg-slate-900 text-slate-200 uppercase tracking-wider font-bold text-[11px] select-none whitespace-nowrap">
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">SL (#) <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('buyer_name')}>
                <div className="flex items-center gap-1">Buyer Name <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('style')}>
                <div className="flex items-center gap-1">Style <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('order_no')}>
                <div className="flex items-center gap-1">Order No <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 bg-indigo-950 text-indigo-200 cursor-pointer hover:bg-indigo-900" onClick={() => handleSort('store_ref')}>
                <div className="flex items-center gap-1 font-extrabold">Store Ref. <ArrowUpDown className="w-3 h-3 text-indigo-400" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('job_no')}>
                <div className="flex items-center gap-1">Job No <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('colour')}>
                <div className="flex items-center gap-1">Colour <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('item_name')}>
                <div className="flex items-center gap-1">Item Name <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('cm')}>
                <div className="flex items-center gap-1">CM <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('yds')}>
                <div className="flex items-center gap-1">YDS <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('booking_qty')}>
                <div className="flex items-center justify-end gap-1">Booking Qty (Pcs) <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 text-right bg-emerald-950/80 text-emerald-200 cursor-pointer hover:bg-emerald-900" onClick={() => handleSort('receive_qty')}>
                <div className="flex items-center justify-end gap-1 font-extrabold">Receive Qty (Pcs) <ArrowUpDown className="w-3 h-3 text-emerald-400" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('receive_date')}>
                <div className="flex items-center gap-1">Receive Date <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('receive_challan')}>
                <div className="flex items-center gap-1">Receive Challan <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 text-right bg-blue-950/80 text-blue-200 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('issue_qty')}>
                <div className="flex items-center justify-end gap-1 font-extrabold">Issue Qty (Pcs) <ArrowUpDown className="w-3 h-3 text-blue-400" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('issue_date')}>
                <div className="flex items-center gap-1">Issue Date <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('issue_challan')}>
                <div className="flex items-center gap-1">Issue Challan <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('balance_qty')}>
                <div className="flex items-center justify-end gap-1">Balance Qty (Pcs) <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('batch_no')}>
                <div className="flex items-center gap-1">Batch No <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('remarks')}>
                <div className="flex items-center gap-1">Remarks <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-2 border-b border-slate-800 text-center">
                Actions
              </th>
            </tr>

            {/* Column Filter Inputs Row */}
            <tr className="bg-slate-800/90 border-b border-slate-700">
              <th className="p-1"><input type="text" value={colFilters.id} onChange={e => handleColFilterChange('id', e.target.value)} placeholder="Filter SL" className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.buyer_name} onChange={e => handleColFilterChange('buyer_name', e.target.value)} placeholder="Filter Buyer" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.style} onChange={e => handleColFilterChange('style', e.target.value)} placeholder="Filter Style" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.order_no} onChange={e => handleColFilterChange('order_no', e.target.value)} placeholder="Filter Order" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.store_ref} onChange={e => handleColFilterChange('store_ref', e.target.value)} placeholder="Filter StoreRef" className="w-24 px-1 py-0.5 bg-indigo-950 border border-indigo-700 text-indigo-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.job_no} onChange={e => handleColFilterChange('job_no', e.target.value)} placeholder="Filter Job" className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.colour} onChange={e => handleColFilterChange('colour', e.target.value)} placeholder="Filter Colour" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.item_name} onChange={e => handleColFilterChange('item_name', e.target.value)} placeholder="Filter Item" className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.cm} onChange={e => handleColFilterChange('cm', e.target.value)} placeholder="Filter CM" className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.yds} onChange={e => handleColFilterChange('yds', e.target.value)} placeholder="Filter YDS" className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.booking_qty} onChange={e => handleColFilterChange('booking_qty', e.target.value)} placeholder="Filter Qty" className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal text-right" /></th>
              <th className="p-1"><input type="text" value={colFilters.receive_qty} onChange={e => handleColFilterChange('receive_qty', e.target.value)} placeholder="Filter Recv" className="w-16 px-1 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-100 text-[10px] rounded focus:outline-none focus:border-emerald-400 font-normal text-right" /></th>
              <th className="p-1"><input type="text" value={colFilters.receive_date} onChange={e => handleColFilterChange('receive_date', e.target.value)} placeholder="Filter R Date" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.receive_challan} onChange={e => handleColFilterChange('receive_challan', e.target.value)} placeholder="Filter R Ch" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.issue_qty} onChange={e => handleColFilterChange('issue_qty', e.target.value)} placeholder="Filter Iss" className="w-16 px-1 py-0.5 bg-blue-950 border border-blue-700 text-blue-100 text-[10px] rounded focus:outline-none focus:border-blue-400 font-normal text-right" /></th>
              <th className="p-1"><input type="text" value={colFilters.issue_date} onChange={e => handleColFilterChange('issue_date', e.target.value)} placeholder="Filter I Date" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.issue_challan} onChange={e => handleColFilterChange('issue_challan', e.target.value)} placeholder="Filter I Ch" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.balance_qty} onChange={e => handleColFilterChange('balance_qty', e.target.value)} placeholder="Filter Bal" className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal text-right" /></th>
              <th className="p-1"><input type="text" value={colFilters.batch_no} onChange={e => handleColFilterChange('batch_no', e.target.value)} placeholder="Filter Batch" className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1"><input type="text" value={colFilters.remarks} onChange={e => handleColFilterChange('remarks', e.target.value)} placeholder="Filter Rem" className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-100 text-[10px] rounded focus:outline-none focus:border-indigo-400 font-normal" /></th>
              <th className="p-1 text-center text-[10px] text-slate-400 font-normal">—</th>
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-200/60 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={21} className="py-16 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2 font-bold text-slate-700 animate-pulse">
                    <Layers className="w-5 h-5 animate-spin text-indigo-600" />
                    Loading inventory records from Supabase...
                  </div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={21} className="py-16 text-center text-slate-500">
                  <div className="max-w-sm mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">No matching inventory rows found</p>
                    <p className="text-xs text-slate-500">Try adjusting your column search filters above.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const styleInfo = getItemRowStyle(item.booking_qty, item.receive_qty);

                return (
                  <tr key={item.id} className={`${styleInfo.rowBg} group transition-colors whitespace-nowrap`}>
                    
                    {/* SL / ID */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500 font-bold">
                      {item.id}
                    </td>

                    {/* Buyer Name */}
                    <td className="py-2.5 px-2 font-bold text-slate-900">
                      {item.buyer_name}
                    </td>

                    {/* Style */}
                    <td className="py-2.5 px-2 font-semibold text-slate-800 max-w-[140px] truncate" title={item.style}>
                      {item.style}
                    </td>

                    {/* Order No / PO */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-700 max-w-[160px] truncate" title={item.order_no}>
                      {item.order_no}
                    </td>

                    {/* Store Ref Index (CLICKABLE QUICK ACTION) */}
                    <td className="py-2.5 px-2 font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => onQuickStoreRefAction(item.store_ref)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white hover:bg-indigo-700 rounded shadow-2xs transition-all hover:scale-105"
                        title="Click to quick receive/issue for this Store Ref"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>{item.store_ref}</span>
                      </button>
                    </td>

                    {/* Job No */}
                    <td className="py-2.5 px-2 font-mono text-xs font-semibold text-slate-700">
                      {item.job_no || '—'}
                    </td>

                    {/* Colour */}
                    <td className="py-2.5 px-2 font-bold uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => onViewHistory && onViewHistory(item)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-black transition-all hover:scale-105 ${
                          (item.receive_qty || 0) === 0 && item.booking_qty > 0
                            ? 'bg-amber-200 text-amber-950 border-amber-400 shadow-2xs font-extrabold'
                            : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to view date-wise receive & issue log for this colour"
                      >
                        <span>{item.colour}</span>
                        <History className="w-3 h-3 text-indigo-600 opacity-80" />
                      </button>
                    </td>

                    {/* Item Name */}
                    <td className="py-2.5 px-2 text-slate-800 font-semibold">
                      {item.item_name}
                    </td>

                    {/* CM */}
                    <td className="py-2.5 px-2 font-mono text-slate-700">
                      {item.cm}
                    </td>

                    {/* YDS */}
                    <td className="py-2.5 px-2 text-slate-600 font-semibold">
                      {item.yds}
                    </td>

                    {/* Booking Qty */}
                    <td className="py-2.5 px-2 text-right font-mono font-extrabold text-slate-900">
                      <span className={(item.receive_qty || 0) === 0 && item.booking_qty > 0 ? "inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 font-black shadow-2xs" : "text-slate-900"}>
                        {item.booking_qty.toLocaleString()}
                      </span>
                    </td>

                    {/* Receive Qty */}
                    <td className={`py-2.5 px-2 text-right font-mono font-bold ${
                      item.receive_qty > 0 ? 'text-emerald-800' : 'text-slate-400'
                    }`}>
                      {item.receive_qty.toLocaleString()}
                    </td>

                    {/* Receive Date */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800">
                      {(item.receive_qty > 0) ? (item.receive_date || '—') : '—'}
                    </td>

                    {/* Receive Challan */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800">
                      {(item.receive_qty > 0) ? (item.receive_challan || '—') : '—'}
                    </td>

                    {/* Issue Qty */}
                    <td className={`py-2.5 px-2 text-right font-mono font-bold ${
                      item.issue_qty > 0 ? 'text-blue-800' : 'text-slate-400'
                    }`}>
                      {item.issue_qty.toLocaleString()}
                    </td>

                    {/* Issue Date */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800">
                      {(item.issue_qty > 0) ? (item.issue_date || '—') : '—'}
                    </td>

                    {/* Issue Challan */}
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800">
                      {(item.issue_qty > 0) ? (item.issue_challan || '—') : '—'}
                    </td>

                    {/* Balance Qty */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.balance_qty > 0 ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'text-slate-500'
                      }`}>
                        {item.balance_qty.toLocaleString()}
                      </span>
                    </td>

                    {/* Batch No */}
                    <td className="py-2.5 px-2 font-mono text-slate-700 text-[11px]" title={item.batch_no}>
                      {item.batch_no || '—'}
                    </td>

                    {/* Remarks */}
                    <td className="py-2.5 px-2 text-slate-600 text-[11px] max-w-[120px] truncate" title={item.remarks}>
                      {item.remarks || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewHistory && onViewHistory(item)}
                          className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 transition-colors shadow-2xs text-[10px] font-extrabold flex items-center gap-1"
                          title="View Date-wise Transaction History & Log"
                        >
                          <History className="w-3 h-3 text-indigo-600" />
                          Log
                        </button>

                        {isEditable ? (
                          <>
                            <button
                              onClick={() => onEditItem(item)}
                              className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-indigo-600 transition-colors shadow-2xs"
                              title="Full Edit Row"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            {onDeleteItem && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete Twill Tape record #${item.id} (${item.style})?`)) {
                                    onDeleteItem(item.id);
                                  }
                                }}
                                className="p-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-900 transition-colors shadow-2xs"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => onQuickStoreRefAction(item.store_ref)}
                              className="p-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors shadow-2xs text-[10px] font-bold flex items-center gap-1"
                              title="Quick Receive/Issue"
                            >
                              <Zap className="w-3 h-3 text-amber-600" />
                              Quick
                            </button>
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold flex items-center gap-1" title="Read-Only User Mode">
                            <Lock className="w-3 h-3 text-slate-400" />
                            View
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

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 font-medium">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredItems.length} total records)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="px-3 py-1 bg-slate-200 font-mono font-bold rounded-lg text-slate-800">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
