import React, { useState, useEffect } from 'react';
import { SewingThreadItem, QuickUpdatePayload, TransactionLog, AppTheme } from '../types';
import {
  Search,
  X,
  Check,
  Calendar,
  Save,
  AlertCircle,
  RefreshCw,
  Filter,
  Zap,
  Sun,
  Moon,
  Tag,
  Sparkles
} from 'lucide-react';

interface SewingThreadQuickStoreRefModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStoreRef?: string;
  allItems: SewingThreadItem[];
  onSaveQuickUpdates: (updates: QuickUpdatePayload[]) => Promise<void>;
  existingBuyers?: string[];
  theme?: AppTheme;
}

interface SewingRowState {
  id: number;
  prev_receive_qty: number;
  today_receive_qty: number | '';
  receive_qty: number;
  receive_date: string;
  receive_challan: string;

  prev_issue_qty: number;
  today_issue_qty: number | '';
  issue_qty: number;
  issue_date: string;
  issue_challan: string;

  balance_qty: number;
  remarks: string;
}

export const SewingThreadQuickStoreRefModal: React.FC<SewingThreadQuickStoreRefModalProps> = ({
  isOpen,
  onClose,
  initialStoreRef = '',
  allItems,
  onSaveQuickUpdates,
  existingBuyers = [],
  theme: initialTheme = 'light'
}) => {
  const [workspaceTheme, setWorkspaceTheme] = useState<AppTheme>(initialTheme);

  function getTodayFormatted(): string {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  const [globalWorkingDate, setGlobalWorkingDate] = useState<string>(getTodayFormatted());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState(initialStoreRef);
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [matchingItems, setMatchingItems] = useState<SewingThreadItem[]>([]);
  const [rowStates, setRowStates] = useState<Record<number, SewingRowState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Unique lists for quick filter chips
  const uniqueStoreRefs = Array.from(new Set(allItems.map(i => i.store_ref || i.s_thread_ref || '').filter(Boolean))).sort();
  const allBuyers = Array.from(new Set([...existingBuyers, ...allItems.map(i => i.buyer_name || i.buyer || '').filter(Boolean)])).sort();
  const allStyles = Array.from(new Set(allItems.map(i => i.style || '').filter(Boolean))).sort();

  useEffect(() => {
    if (initialStoreRef) {
      setSearchTerm(initialStoreRef);
    }
  }, [initialStoreRef]);

  useEffect(() => {
    setWorkspaceTheme(initialTheme);
  }, [initialTheme]);

  // Filter items based on buyer selection, style, & search term
  useEffect(() => {
    let filtered = [...allItems];

    if (selectedBuyer && selectedBuyer !== 'ALL') {
      filtered = filtered.filter(i => (i.buyer_name || i.buyer || '').toLowerCase() === selectedBuyer.toLowerCase());
    }

    if (selectedStyle && selectedStyle !== 'ALL') {
      filtered = filtered.filter(i => (i.style || '').toLowerCase() === selectedStyle.toLowerCase());
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(item => {
        const ref = (item.store_ref || item.s_thread_ref || '').toLowerCase();
        const buyer = (item.buyer_name || item.buyer || '').toLowerCase();
        const style = (item.style || '').toLowerCase();
        const colour = (item.colour || item.color || '').toLowerCase();
        const job = (item.job_no || '').toLowerCase();
        const shade = (item.shade_no || item.pantone || '').toLowerCase();
        const count = (item.thread_count || item.count || '').toLowerCase();

        return (
          ref.includes(term) ||
          buyer.includes(term) ||
          style.includes(term) ||
          colour.includes(term) ||
          job.includes(term) ||
          shade.includes(term) ||
          count.includes(term)
        );
      });
    }

    setMatchingItems(filtered);

    // Initialize row states with empty input boxes
    const initialRowStates: Record<number, SewingRowState> = {};
    filtered.forEach(item => {
      const prevRecv = item.receive_qty || 0;
      const prevIss = item.issue_qty || 0;
      initialRowStates[item.id] = {
        id: item.id,
        prev_receive_qty: prevRecv,
        today_receive_qty: '',
        receive_qty: prevRecv,
        receive_date: '',
        receive_challan: '',

        prev_issue_qty: prevIss,
        today_issue_qty: '',
        issue_qty: prevIss,
        issue_date: '',
        issue_challan: '',

        balance_qty: item.balance_qty || 0,
        remarks: item.remarks || ''
      };
    });
    setRowStates(initialRowStates);
  }, [searchTerm, selectedBuyer, selectedStyle, allItems]);

  // Recalculate row receive/issue total and balance
  const recalculateRow = (state: SewingRowState): SewingRowState => {
    const addedRecv = typeof state.today_receive_qty === 'number' ? state.today_receive_qty : 0;
    const addedIss = typeof state.today_issue_qty === 'number' ? state.today_issue_qty : 0;

    const totalRecv = state.prev_receive_qty + addedRecv;
    const totalIss = state.prev_issue_qty + addedIss;
    const newBalance = totalRecv > 0 ? Math.max(0, totalRecv - totalIss) : 0;

    return {
      ...state,
      receive_qty: totalRecv,
      issue_qty: totalIss,
      balance_qty: newBalance
    };
  };

  const handleTodayReceiveChange = (id: number, valStr: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      const added = valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0);
      return {
        ...prev,
        [id]: recalculateRow({ ...current, today_receive_qty: added })
      };
    });
  };

  const handleTodayIssueChange = (id: number, valStr: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      const added = valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0);
      return {
        ...prev,
        [id]: recalculateRow({ ...current, today_issue_qty: added })
      };
    });
  };

  const handleFieldChange = (id: number, field: keyof SewingRowState, value: any) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, [field]: value }
      };
    });
  };

  // Submit quick updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatesToSave: QuickUpdatePayload[] = (Object.values(rowStates) as SewingRowState[]).map(r => {
      const addedRecvTotal = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
      const addedIssTotal = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;
      const effectiveDate = globalWorkingDate.trim() || getTodayFormatted();

      const newRecvLog: TransactionLog | undefined = addedRecvTotal > 0 ? {
        id: Date.now().toString() + Math.random().toString(),
        type: 'RECEIVE',
        date: r.receive_date || effectiveDate,
        challan: r.receive_challan || 'N/A',
        qty: addedRecvTotal,
        remarks: r.remarks
      } : undefined;

      const newIssLog: TransactionLog | undefined = addedIssTotal > 0 ? {
        id: Date.now().toString() + Math.random().toString(),
        type: 'ISSUE',
        date: r.issue_date || effectiveDate,
        challan: r.issue_challan || 'N/A',
        qty: addedIssTotal,
        remarks: r.remarks
      } : undefined;

      return {
        id: r.id,
        receive_qty: Number(r.receive_qty) || 0,
        receive_date: r.receive_date || effectiveDate,
        receive_challan: r.receive_challan || '',
        issue_qty: Number(r.issue_qty) || 0,
        issue_date: r.issue_date || effectiveDate,
        issue_challan: r.issue_challan || '',
        balance_qty: Number(r.balance_qty) || 0,
        remarks: r.remarks || '',
        new_receive_log: newRecvLog,
        new_issue_log: newIssLog
      };
    });

    if (updatesToSave.length === 0) return;

    try {
      setIsSaving(true);
      await onSaveQuickUpdates(updatesToSave);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error("Failed to save sewing thread quick updates:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDark = workspaceTheme === 'dark';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* 1. TOP HEADER BAR */}
      <div className={`px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 border-b shadow-md ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-900 text-white border-slate-800'
      }`}>
        
        {/* Left Brand & Global Working Date */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">Sewing Thread Receive & Issue Workspace</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Quick Entry
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Update thread cone receive & issue entries easily. Working date applies to all rows automatically.
              </p>
            </div>
          </div>

          {/* GLOBAL WORKING DATE CONTROL */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-500/50 shadow-inner">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-extrabold uppercase text-emerald-300">Working Date:</span>
            <input
              type="text"
              value={globalWorkingDate}
              onChange={(e) => setGlobalWorkingDate(e.target.value)}
              placeholder="DD.MM.YYYY"
              className="w-28 px-2 py-0.5 bg-slate-950 border border-emerald-400 text-emerald-200 font-mono font-extrabold text-xs rounded text-center focus:outline-none focus:ring-1 focus:ring-emerald-400"
              title="Global Working Date for today's transactions"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setWorkspaceTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1.5 shadow-xs transition-all"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>White Skin</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-300" />
                <span>Dark Skin</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || matchingItems.length === 0}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg flex items-center gap-2 transition-all ${
              saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save {matchingItems.length} Thread Rows
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. FILTERS CONTROL BAR */}
      <div className={`p-3.5 border-b shrink-0 space-y-2.5 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          <div className="md:col-span-3">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Filter className="w-3 h-3 text-emerald-500" />
              Buyer
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Buyers ({allItems.length})</option>
              {allBuyers.map(buyer => (
                <option key={buyer} value={buyer}>{buyer}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Tag className="w-3 h-3 text-amber-500" />
              Style
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Styles ({allStyles.length})</option>
              {allStyles.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Search className="w-3 h-3 text-emerald-500" />
              Search Store Ref / Style / Shade No / Count / Colour
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Store Ref, Shade No, Count, Colour..."
                className={`w-full pl-8 pr-16 py-1.5 rounded-lg font-mono text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-300 text-slate-800 hover:bg-slate-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Quick Suggestion Chips for Store Refs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Store Refs:</span>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium border shrink-0 transition-colors ${
              !searchTerm
                ? 'bg-emerald-600 text-white border-emerald-500'
                : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            All
          </button>
          {uniqueStoreRefs.slice(0, 10).map((ref) => (
            <button
              key={ref}
              type="button"
              onClick={() => setSearchTerm(ref)}
              className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium border shrink-0 transition-colors ${
                searchTerm === ref
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500' : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-emerald-500'
              }`}
            >
              {ref}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN TABLE WORKSPACE */}
      <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        {matchingItems.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-300 bg-white'
          }`}>
            <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching thread items found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Select a different Buyer/Style or clear your search term.
            </p>
          </div>
        ) : (
          <div className="min-w-[1100px]">
            <table className={`w-full text-left border-collapse text-xs ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}>
              <thead>
                <tr className={`uppercase tracking-wider font-extrabold text-[10px] select-none sticky top-0 z-10 ${
                  isDark
                    ? 'bg-slate-900 text-slate-300 border-b-2 border-slate-700'
                    : 'bg-slate-800 text-white border-b-2 border-slate-900'
                }`}>
                  <th className={`py-2 px-3 border min-w-[180px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Buyer / Store Ref / Job
                  </th>
                  <th className={`py-2 px-3 border min-w-[160px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Style & Colour
                  </th>
                  <th className={`py-2 px-3 border min-w-[120px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Thread Count & Shade
                  </th>
                  <th className={`py-2 px-3 border min-w-[100px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Booking Qty
                  </th>
                  <th className={`py-2 px-3 border min-w-[260px] ${
                    isDark ? 'bg-emerald-950/80 text-emerald-200 border-slate-700' : 'bg-emerald-800 text-white border-slate-400'
                  }`}>
                    1. RECEIVE ENTRY (+ Challan)
                  </th>
                  <th className={`py-2 px-3 border min-w-[260px] ${
                    isDark ? 'bg-blue-950/80 text-blue-200 border-slate-700' : 'bg-blue-800 text-white border-slate-400'
                  }`}>
                    2. ISSUE ENTRY (+ Challan)
                  </th>
                  <th className={`py-2 px-3 border min-w-[100px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Balance Qty
                  </th>
                  <th className={`py-2 px-3 border min-w-[130px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody className="font-medium">
                {matchingItems.map((item) => {
                  const state = rowStates[item.id] || {
                    id: item.id,
                    prev_receive_qty: item.receive_qty || 0,
                    today_receive_qty: '',
                    receive_qty: item.receive_qty || 0,
                    receive_date: '',
                    receive_challan: '',

                    prev_issue_qty: item.issue_qty || 0,
                    today_issue_qty: '',
                    issue_qty: item.issue_qty || 0,
                    issue_date: '',
                    issue_challan: '',

                    balance_qty: item.balance_qty || 0,
                    remarks: item.remarks || ''
                  };

                  const isPending = item.booking_qty > 0 && state.receive_qty === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isDark ? 'bg-slate-900/90 hover:bg-slate-800/80 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      {/* Buyer / Store Ref / Job */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs leading-tight">{item.buyer_name || item.buyer}</div>
                        <div className="mt-1">
                          <span className={`inline-block font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded border ${
                            isDark ? 'bg-slate-950 text-amber-300 border-slate-800' : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}>
                            {item.store_ref || item.s_thread_ref}
                          </span>
                        </div>
                        {item.job_no && (
                          <div className="text-[10px] text-indigo-500 font-mono mt-0.5 font-bold">
                            Job: {item.job_no}
                          </div>
                        )}
                      </td>

                      {/* Style & Colour */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs truncate max-w-[150px]" title={item.style}>
                          {item.style}
                        </div>
                        <div className="mt-1">
                          <span className={isPending ? "inline-block px-2 py-0.5 bg-amber-200 text-amber-950 font-black border border-amber-400 rounded text-[10px]" : "font-extrabold uppercase text-slate-900 dark:text-white text-[11px]"}>
                            {item.colour || item.color}
                          </span>
                        </div>
                      </td>

                      {/* Thread Count & Shade No */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs text-indigo-700 dark:text-indigo-300">
                          {item.thread_count || item.count || '40/2'}
                        </div>
                        <div className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                          Shade: {item.shade_no || item.pantone || 'N/A'}
                        </div>
                      </td>

                      {/* Booking Qty */}
                      <td className={`py-2.5 px-3 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-mono font-extrabold text-xs">
                          <span className={isPending ? "inline-block px-2 py-0.5 bg-amber-200 text-amber-950 font-black border border-amber-400 rounded" : "text-slate-900 dark:text-amber-300"}>
                            {item.booking_qty?.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* RECEIVE CELL */}
                      <td className={`py-2 px-3 align-top border ${
                        isDark ? 'bg-emerald-950/20 border-slate-800' : 'bg-emerald-50/40 border-slate-300'
                      }`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-500 font-medium">
                              Prev: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{state.prev_receive_qty}</strong>
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">+ Today Recv:</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={state.today_receive_qty}
                                onChange={(e) => handleTodayReceiveChange(item.id, e.target.value)}
                                placeholder="0"
                                className={`w-20 px-2 py-1 font-mono font-bold text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  isDark ? 'bg-slate-950 border-emerald-600 text-emerald-300' : 'bg-white border-emerald-400 text-emerald-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-500">Challan No</label>
                            <input
                              type="text"
                              value={state.receive_challan}
                              onChange={(e) => handleFieldChange(item.id, 'receive_challan', e.target.value)}
                              placeholder="Challan #"
                              className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-end pt-0.5">
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                              Total Recv: {state.receive_qty}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ISSUE CELL */}
                      <td className={`py-2 px-3 align-top border ${
                        isDark ? 'bg-blue-950/20 border-slate-800' : 'bg-blue-50/40 border-slate-300'
                      }`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-500 font-medium">
                              Prev: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{state.prev_issue_qty}</strong>
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">+ Today Issue:</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={state.today_issue_qty}
                                onChange={(e) => handleTodayIssueChange(item.id, e.target.value)}
                                placeholder="0"
                                className={`w-20 px-2 py-1 font-mono font-bold text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  isDark ? 'bg-slate-950 border-blue-600 text-blue-300' : 'bg-white border-blue-400 text-blue-900'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-500">Issue Challan</label>
                            <input
                              type="text"
                              value={state.issue_challan}
                              onChange={(e) => handleFieldChange(item.id, 'issue_challan', e.target.value)}
                              placeholder="Challan #"
                              className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-end pt-0.5">
                            <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                              Total Issue: {state.issue_qty}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Balance Qty */}
                      <td className={`py-2.5 px-3 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-mono font-black text-xs">
                          <span className={`px-2 py-0.5 rounded border ${
                            state.balance_qty <= 0
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 font-bold'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          }`}>
                            {state.balance_qty}
                          </span>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <input
                          type="text"
                          value={state.remarks}
                          onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                          placeholder="Remarks..."
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
