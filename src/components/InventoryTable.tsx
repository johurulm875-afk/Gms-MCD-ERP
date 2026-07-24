import React, { useState } from 'react';
import { TwillTapeItem, UserProfile } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { getItemRowStyle } from '../utils/statusHelper';
import { 
  ArrowUpDown, 
  Edit, 
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
  Lock
} from 'lucide-react';

interface InventoryTableProps {
  items: TwillTapeItem[];
  isLoading: boolean;
  onEditItem: (item: TwillTapeItem) => void;
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
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

        {/* Page Size Selector & Excel Export */}
        <div className="flex items-center gap-3 text-slate-600">
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

          <span>Showing {paginatedItems.length} of {items.length} items</span>
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
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse text-xs">
          
          {/* Sticky Table Header */}
          <thead>
            <tr className="bg-slate-900 text-slate-200 uppercase tracking-wider font-bold text-[11px] select-none sticky top-0 z-10">
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1"># <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('buyer_name')}>
                <div className="flex items-center gap-1">Buyer <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('style')}>
                <div className="flex items-center gap-1">Style <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 bg-indigo-950 text-indigo-200 cursor-pointer hover:bg-indigo-900" onClick={() => handleSort('store_ref')}>
                <div className="flex items-center gap-1 font-extrabold">Store Ref. Index <ArrowUpDown className="w-3 h-3 text-indigo-400" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('job_no')}>
                <div className="flex items-center gap-1">Job No <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('colour')}>
                <div className="flex items-center gap-1">Colour <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800">
                Item & Size
              </th>
              <th className="py-3 px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('order_no')}>
                <div className="flex items-center gap-1">Order No / PO <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('booking_qty')}>
                <div className="flex items-center justify-end gap-1">Book Qty <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 text-right bg-emerald-950/80 text-emerald-200 cursor-pointer hover:bg-emerald-900" onClick={() => handleSort('receive_qty')}>
                <div className="flex items-center justify-end gap-1 font-extrabold">Recv Qty <ArrowUpDown className="w-3 h-3 text-emerald-400" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800">
                Recv Date / Challan
              </th>
              <th className="py-3 px-3 border-b border-slate-800 text-right bg-blue-950/80 text-blue-200 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('issue_qty')}>
                <div className="flex items-center justify-end gap-1 font-extrabold">Issue Qty <ArrowUpDown className="w-3 h-3 text-blue-400" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800">
                Issue Date / Challan
              </th>
              <th className="py-3 px-3 border-b border-slate-800 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('balance_qty')}>
                <div className="flex items-center justify-end gap-1">Balance <ArrowUpDown className="w-3 h-3 opacity-60" /></div>
              </th>
              <th className="py-3 px-3 border-b border-slate-800 text-center">
                Quick Actions
              </th>
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-200/60 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2 font-bold text-slate-700 animate-pulse">
                    <Layers className="w-5 h-5 animate-spin text-indigo-600" />
                    Loading inventory records from Supabase...
                  </div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-500">
                  <div className="max-w-sm mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">No matching inventory rows found</p>
                    <p className="text-xs text-slate-500">Try adjusting your buyer filter or search terms above.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const styleInfo = getItemRowStyle(item.booking_qty, item.receive_qty);

                return (
                  <tr key={item.id} className={`${styleInfo.rowBg} group transition-colors`}>
                    
                    {/* ID */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 font-bold">
                      {item.id}
                    </td>

                    {/* Buyer Name */}
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {item.buyer_name}
                    </td>

                    {/* Style */}
                    <td className="py-3 px-3 font-semibold text-slate-800 max-w-[140px] truncate" title={item.style}>
                      {item.style}
                    </td>

                    {/* Store Ref Index (CLICKABLE QUICK ACTION) */}
                    <td className="py-3 px-3 font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => onQuickStoreRefAction(item.store_ref)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white hover:bg-indigo-700 rounded-lg shadow-2xs transition-all hover:scale-105"
                        title="Click to quick receive/issue for this Store Ref"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>{item.store_ref}</span>
                      </button>
                    </td>

                    {/* Job No */}
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {item.job_no || '-'}
                    </td>

                    {/* Colour (CLICKABLE FOR TRANSACTION HISTORY) */}
                    <td className="py-3 px-3 font-bold uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => onViewHistory && onViewHistory(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-black transition-all hover:scale-105 ${
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

                    {/* Item Name & CM */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <div className="font-semibold">{item.item_name}</div>
                      <div className="text-[10px] text-slate-500">{item.cm} ({item.yds})</div>
                    </td>

                    {/* Order No / PO */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 max-w-[160px] truncate" title={item.order_no}>
                      {item.order_no}
                    </td>

                    {/* Booking Qty */}
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                      <span className={(item.receive_qty || 0) === 0 && item.booking_qty > 0 ? "inline-block px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 font-black shadow-2xs" : "text-slate-900"}>
                        {item.booking_qty.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{item.yds}</span>
                      </span>
                    </td>

                    {/* Receive Qty */}
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      item.receive_qty > 0 ? 'text-emerald-800' : 'text-slate-400'
                    }`}>
                      {item.receive_qty.toLocaleString()}
                    </td>

                    {/* Receive Date & Challan (MULTIPLE DATES & CHALLANS SUPPORT) */}
                    <td 
                      className="py-3 px-3 text-[11px] text-slate-700 cursor-pointer hover:bg-emerald-50/60 transition-colors"
                      onClick={() => onViewHistory && onViewHistory(item)}
                      title="Click to view date-wise receive history"
                    >
                      {item.receive_logs && item.receive_logs.length > 0 ? (
                        <div className="space-y-0.5">
                          {item.receive_logs.slice(0, 2).map((log, lIdx) => (
                            <div key={lIdx} className="leading-tight text-[10px]">
                              <span className="font-bold font-mono text-emerald-800">{log.date}</span>
                              <span className="text-slate-500 ml-1">Ch:{log.challan}</span>
                              <span className="font-bold text-emerald-700 ml-1">(+{log.qty})</span>
                            </div>
                          ))}
                          {item.receive_logs.length > 2 && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                              +{item.receive_logs.length - 2} more dates
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800">{item.receive_date || '—'}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.receive_challan ? `Ch: ${item.receive_challan}` : ''}</div>
                        </div>
                      )}
                    </td>

                    {/* Issue Qty */}
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      item.issue_qty > 0 ? 'text-blue-800' : 'text-slate-400'
                    }`}>
                      {item.issue_qty.toLocaleString()}
                    </td>

                    {/* Issue Date & Challan (MULTIPLE DATES & CHALLANS SUPPORT) */}
                    <td 
                      className="py-3 px-3 text-[11px] text-slate-700 cursor-pointer hover:bg-blue-50/60 transition-colors"
                      onClick={() => onViewHistory && onViewHistory(item)}
                      title="Click to view date-wise issue history"
                    >
                      {item.issue_logs && item.issue_logs.length > 0 ? (
                        <div className="space-y-0.5">
                          {item.issue_logs.slice(0, 2).map((log, lIdx) => (
                            <div key={lIdx} className="leading-tight text-[10px]">
                              <span className="font-bold font-mono text-blue-800">{log.date}</span>
                              <span className="text-slate-500 ml-1">Ch:{log.challan}</span>
                              <span className="font-bold text-blue-700 ml-1">(-{log.qty})</span>
                            </div>
                          ))}
                          {item.issue_logs.length > 2 && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                              +{item.issue_logs.length - 2} more dates
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800">{item.issue_date || '—'}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.issue_challan ? `Ch: ${item.issue_challan}` : ''}</div>
                        </div>
                      )}
                    </td>

                    {/* Balance Qty */}
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.balance_qty > 0 ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'text-slate-500'
                      }`}>
                        {item.balance_qty.toLocaleString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewHistory && onViewHistory(item)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 transition-colors shadow-2xs text-[10px] font-extrabold flex items-center gap-1"
                          title="View Date-wise Transaction History & Log"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          Log
                        </button>

                        {isEditable ? (
                          <>
                            <button
                              onClick={() => onEditItem(item)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-indigo-600 transition-colors shadow-2xs"
                              title="Full Edit Row"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onQuickStoreRefAction(item.store_ref)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors shadow-2xs text-[10px] font-bold flex items-center gap-1"
                              title="Quick Receive/Issue"
                            >
                              <Zap className="w-3 h-3 text-amber-600" />
                              Quick
                            </button>
                          </>
                        ) : (
                          <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold flex items-center gap-1" title="Read-Only User Mode">
                            <Lock className="w-3 h-3 text-slate-400" />
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

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 font-medium">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({items.length} total records)
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
