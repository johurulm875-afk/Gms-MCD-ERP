import React, { useState, useMemo } from 'react';
import { DrawstringItem, TransactionLog, AppTheme, UserProfile } from '../types';
import { canUserModifyData } from '../utils/permissionHelper';
import { 
  PackageCheck, Search, Filter, Plus, FileSpreadsheet, Zap, 
  Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronLeft, 
  ChevronRight, ArrowUpDown, History, Layers, Check, X, Lock
} from 'lucide-react';
import { getItemRowStyle } from '../utils/statusHelper';

interface DailyDrawstringReceivedUpdateProps {
  items: DrawstringItem[];
  isLoading?: boolean;
  onUpdateItem: (updatedItem: DrawstringItem) => void;
  onAddItem?: (newItem: Omit<DrawstringItem, 'id'>) => void;
  theme?: AppTheme;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
}

export const DailyDrawstringReceivedUpdate: React.FC<DailyDrawstringReceivedUpdateProps> = ({
  items,
  isLoading = false,
  onUpdateItem,
  onAddItem,
  theme = 'light',
  currentUser,
  canEdit
}) => {
  const isLight = theme === 'light';
  const isEditable = canEdit ?? canUserModifyData(currentUser || null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Receive Modal State
  const [selectedItemForReceive, setSelectedItemForReceive] = useState<DrawstringItem | null>(null);
  const [receiveQtyInput, setReceiveQtyInput] = useState('');
  const [receiveChallanInput, setReceiveChallanInput] = useState('');
  const [receiveDateInput, setReceiveDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [remarksInput, setRemarksInput] = useState('');

  // Add New Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemData, setNewItemData] = useState({
    buyer_name: '',
    date: new Date().toISOString().split('T')[0],
    booking_challan: '',
    style: '',
    order_no: '',
    store_ref: '',
    colour: '',
    drawstring_type: 'Round Drawstring',
    size_mm: '6mm',
    unit: 'YDS' as 'YDS' | 'PCS' | 'MTRS',
    booking_qty: 0,
    receive_qty: 0,
    receive_date: '',
    receive_challan: '',
    issue_qty: 0,
    issue_date: '',
    issue_challan: '',
    balance_qty: 0,
    remarks: ''
  });

  // History Modal State
  const [historyItem, setHistoryItem] = useState<DrawstringItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Unique Buyers for Filter
  const buyers = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.buyer_name))).filter(Boolean);
    return ['ALL', ...list];
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        !searchTerm ||
        item.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.store_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.colour.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.drawstring_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.booking_challan.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBuyer = selectedBuyer === 'ALL' || item.buyer_name === selectedBuyer;

      let matchesStatus = true;
      if (selectedStatus === 'PENDING') {
        matchesStatus = item.receive_qty === 0;
      } else if (selectedStatus === 'PARTIAL') {
        matchesStatus = item.receive_qty > 0 && item.receive_qty < item.booking_qty;
      } else if (selectedStatus === 'FULFILLED') {
        matchesStatus = item.receive_qty >= item.booking_qty;
      }

      const matchesDate = !dateFilter || item.receive_date === dateFilter || item.date === dateFilter;

      return matchesSearch && matchesBuyer && matchesStatus && matchesDate;
    });
  }, [items, searchTerm, selectedBuyer, selectedStatus, dateFilter]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  // Submit Receive Update
  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReceive) return;

    const addQty = parseFloat(receiveQtyInput) || 0;
    if (addQty <= 0) {
      alert('Please enter a valid receive quantity');
      return;
    }

    const newReceiveTotal = (selectedItemForReceive.receive_qty || 0) + addQty;
    const newBalance = Math.max(0, selectedItemForReceive.booking_qty - newReceiveTotal);

    const newLog: TransactionLog = {
      id: `rcv_${Date.now()}`,
      type: 'RECEIVE',
      date: receiveDateInput,
      challan: receiveChallanInput || 'CH-' + Math.floor(1000 + Math.random() * 9000),
      qty: addQty,
      remarks: remarksInput || 'Daily Drawstring Receive Update',
      created_at: new Date().toISOString()
    };

    const updated: DrawstringItem = {
      ...selectedItemForReceive,
      receive_qty: newReceiveTotal,
      receive_date: receiveDateInput,
      receive_challan: receiveChallanInput || selectedItemForReceive.receive_challan,
      balance_qty: newBalance,
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

  // Submit New Booking
  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.buyer_name || !newItemData.style || !newItemData.store_ref) {
      alert('Please fill in Buyer Name, Style, and MCD Ref');
      return;
    }

    const bookingQty = Number(newItemData.booking_qty) || 0;
    const itemToAdd: DrawstringItem = {
      id: Date.now(),
      ...newItemData,
      booking_qty: bookingQty,
      receive_qty: 0,
      issue_qty: 0,
      balance_qty: bookingQty,
      receive_logs: [],
      issue_logs: []
    };

    if (onAddItem) {
      onAddItem(itemToAdd);
    } else {
      onUpdateItem(itemToAdd);
    }

    setIsAddModalOpen(false);
    setNewItemData({
      buyer_name: '',
      date: new Date().toISOString().split('T')[0],
      booking_challan: '',
      style: '',
      order_no: '',
      store_ref: '',
      colour: '',
      drawstring_type: 'Round Drawstring',
      size_mm: '6mm',
      unit: 'YDS',
      booking_qty: 0,
      receive_qty: 0,
      receive_date: '',
      receive_challan: '',
      issue_qty: 0,
      issue_date: '',
      issue_challan: '',
      balance_qty: 0,
      remarks: ''
    });
  };

  // Export to CSV/Excel
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = ['MCD Ref', 'Date', 'Buyer', 'Style', 'Order No', 'Challan', 'Drawstring Type', 'Size', 'Colour', 'Booking Qty', 'Receive Qty', 'Receive Date', 'Receive Challan', 'Balance Qty', 'Unit', 'Status'];
    const rows = filteredItems.map(item => {
      let status = 'FULFILLED';
      if (item.receive_qty === 0) status = 'PENDING';
      else if (item.receive_qty < item.booking_qty) status = 'PARTIAL';

      return [
        `"${item.store_ref}"`,
        `"${item.date}"`,
        `"${item.buyer_name}"`,
        `"${item.style}"`,
        `"${item.order_no}"`,
        `"${item.booking_challan}"`,
        `"${item.drawstring_type}"`,
        `"${item.size_mm || ''}"`,
        `"${item.colour}"`,
        item.booking_qty,
        item.receive_qty,
        `"${item.receive_date || ''}"`,
        `"${item.receive_challan || ''}"`,
        item.balance_qty,
        `"${item.unit}"`,
        `"${status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Drawstring_Received_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
                <h1 className="text-xl font-black tracking-tight">Daily Drawstring Received Update</h1>
                <span className="px-2.5 py-0.5 bg-teal-500/30 border border-teal-400/40 text-teal-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  MCD Live
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-1">
                Log daily received drawstring quantities, track delivery challans, and maintain real-time store balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>Export CSV</span>
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Drawstring Entry</span>
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
              placeholder="Search Buyer, Style, MCD Ref, Colour, Drawstring Type..."
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
              <option value="PENDING">🟨 Pending (0% Recv)</option>
              <option value="PARTIAL">🟦 Partial (In Progress)</option>
              <option value="FULFILLED">🟩 Fulfilled (100% Recv)</option>
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

      {/* Main Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className={`text-[11px] font-black uppercase tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <th className="py-3.5 px-3">MCD Ref</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Buyer</th>
                <th className="py-3.5 px-3">Style / Order</th>
                <th className="py-3.5 px-3">Type & Size</th>
                <th className="py-3.5 px-3">Colour</th>
                <th className="py-3.5 px-3 text-right">Booking Qty</th>
                <th className="py-3.5 px-3 text-right">Recv Qty</th>
                <th className="py-3.5 px-3 text-center">Recv Date</th>
                <th className="py-3.5 px-3 text-center">Recv Challan</th>
                <th className="py-3.5 px-3 text-right">Balance</th>
                <th className="py-3.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-xs font-semibold">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    <span>Loading Drawstring Inventory...</span>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-bold">
                    No drawstring received records found. Click "New Drawstring Entry" to create one.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const rowStyle = getItemRowStyle(item.booking_qty, item.receive_qty);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${rowStyle.rowBg}`}
                    >
                      {/* MCD Ref */}
                      <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {item.store_ref}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.date}
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                        {item.buyer_name}
                      </td>

                      {/* Style & Order */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{item.style}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.order_no}</div>
                      </td>

                      {/* Drawstring Type & Size */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.drawstring_type}</span>
                        {item.size_mm && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20">
                            {item.size_mm}
                          </span>
                        )}
                      </td>

                      {/* Colour */}
                      <td className="py-3 px-3 font-medium">
                        <span className={(item.receive_qty || 0) === 0 && item.booking_qty > 0 ? "inline-block px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black border border-amber-400 shadow-2xs" : "text-slate-900 dark:text-slate-100 font-bold"}>
                          {item.colour}
                        </span>
                      </td>

                      {/* Booking Qty */}
                      <td className="py-3 px-3 text-right font-extrabold">
                        <span className={(item.receive_qty || 0) === 0 && item.booking_qty > 0 ? "inline-block px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black border border-amber-400 shadow-2xs" : "text-slate-900 dark:text-white font-bold"}>
                          {item.booking_qty.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                        </span>
                      </td>

                      {/* Received Qty */}
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {item.receive_qty.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>

                      {/* Receive Date */}
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                        {item.receive_date || '-'}
                      </td>

                      {/* Receive Challan */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        {item.receive_challan ? (
                          <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/20">
                            {item.receive_challan}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-3 text-right font-extrabold text-amber-600 dark:text-amber-400">
                        {item.balance_qty.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditable ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemForReceive(item);
                                setReceiveDateInput(new Date().toISOString().split('T')[0]);
                                setReceiveQtyInput('');
                                setReceiveChallanInput('');
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-[11px] rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              title="Log Daily Receive Qty"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Update</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-500" />
                              View Only
                            </span>
                          )}

                          {item.receive_logs && item.receive_logs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryItem(item)}
                              className={`p-1 rounded-lg border transition-all ${
                                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                              title="View Receive History Logs"
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
                <h3 className="font-extrabold text-base">Daily Drawstring Receive Log</h3>
              </div>
              <button 
                onClick={() => setSelectedItemForReceive(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Details Card */}
            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex justify-between font-mono text-teal-500 font-bold">
                <span>MCD Ref: {selectedItemForReceive.store_ref}</span>
                <span>{selectedItemForReceive.buyer_name}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white">Style: {selectedItemForReceive.style}</div>
              <div className="text-slate-500">Type: {selectedItemForReceive.drawstring_type} ({selectedItemForReceive.colour})</div>
              <div className="flex justify-between pt-1 border-t text-[11px] font-extrabold dark:border-slate-800">
                <span>Booking Qty: {selectedItemForReceive.booking_qty.toLocaleString()} {selectedItemForReceive.unit}</span>
                <span className="text-emerald-500">Already Received: {selectedItemForReceive.receive_qty.toLocaleString()} {selectedItemForReceive.unit}</span>
              </div>
            </div>

            {/* Receive Form */}
            <form onSubmit={handleReceiveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Today's Received Quantity ({selectedItemForReceive.unit}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="e.g. 500"
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
                  <label className="block text-xs font-bold mb-1">Delivery Challan No</label>
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
                <label className="block text-xs font-bold mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Good quality, 1st lot received"
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  className={`w-full p-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForReceive(null)}
                  className="w-1/2 py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-600/30 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Received Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW DRAWSTRING ENTRY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-xl p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-500" />
                <h3 className="font-extrabold text-base">New Drawstring Booking Entry</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">MCD Ref *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DS-101"
                    value={newItemData.store_ref}
                    onChange={(e) => setNewItemData({...newItemData, store_ref: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HM / ZARA"
                    value={newItemData.buyer_name}
                    onChange={(e) => setNewItemData({...newItemData, buyer_name: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Style *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ST-2081"
                    value={newItemData.style}
                    onChange={(e) => setNewItemData({...newItemData, style: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Order No</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-4481"
                    value={newItemData.order_no}
                    onChange={(e) => setNewItemData({...newItemData, order_no: e.target.value})}
                    className={`w-full p-2 text-xs rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Drawstring Type</label>
                  <select
                    value={newItemData.drawstring_type}
                    onChange={(e) => setNewItemData({...newItemData, drawstring_type: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <option value="Round Drawstring">Round Drawstring</option>
                    <option value="Flat Drawstring">Flat Drawstring</option>
                    <option value="Braided Drawstring">Braided Drawstring</option>
                    <option value="Elastic Drawstring">Elastic Drawstring</option>
                    <option value="Cotton Drawstring">Cotton Drawstring</option>
                    <option value="Polyester Drawstring">Polyester Drawstring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Size (mm/inch)</label>
                  <input
                    type="text"
                    placeholder="e.g. 6mm"
                    value={newItemData.size_mm}
                    onChange={(e) => setNewItemData({...newItemData, size_mm: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Colour</label>
                  <input
                    type="text"
                    placeholder="e.g. Black / Navy"
                    value={newItemData.colour}
                    onChange={(e) => setNewItemData({...newItemData, colour: e.target.value})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Booking Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newItemData.booking_qty || ''}
                    onChange={(e) => setNewItemData({...newItemData, booking_qty: Number(e.target.value)})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Unit</label>
                  <select
                    value={newItemData.unit}
                    onChange={(e) => setNewItemData({...newItemData, unit: e.target.value as any})}
                    className={`w-full p-2 text-xs font-bold rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <option value="YDS">YDS</option>
                    <option value="PCS">PCS</option>
                    <option value="MTRS">MTRS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Booking Challan</label>
                  <input
                    type="text"
                    placeholder="e.g. BK-209"
                    value={newItemData.booking_challan}
                    onChange={(e) => setNewItemData({...newItemData, booking_challan: e.target.value})}
                    className={`w-full p-2 text-xs rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-600/30"
                >
                  Create Booking Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY LOGS MODAL */}
      {historyItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-base">Receive History Logs - {historyItem.store_ref}</h3>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {historyItem.receive_logs?.map((log) => (
                <div key={log.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div>
                    <div className="font-extrabold text-emerald-500">+{log.qty.toLocaleString()} {historyItem.unit}</div>
                    <div className="text-[10px] text-slate-400">Date: {log.date} | Challan: {log.challan}</div>
                    {log.remarks && <div className="text-[10px] text-slate-500 mt-0.5">{log.remarks}</div>}
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded border border-emerald-500/20">
                    RECEIVE LOG
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setHistoryItem(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
