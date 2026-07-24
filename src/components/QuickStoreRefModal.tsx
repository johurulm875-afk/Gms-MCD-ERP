import React, { useState, useEffect } from 'react';
import { TwillTapeItem, QuickUpdatePayload, TransactionLog, AppTheme } from '../types';
import {
  Search,
  X,
  Check,
  Calendar,
  Hash,
  Save,
  AlertCircle,
  RefreshCw,
  Filter,
  Zap,
  Info,
  Plus,
  Trash2,
  Sun,
  Moon,
  Layers,
  Tag
} from 'lucide-react';
import { getItemRowStyle } from '../utils/statusHelper';

interface QuickStoreRefModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStoreRef?: string;
  allItems: TwillTapeItem[];
  onSaveQuickUpdates: (updates: QuickUpdatePayload[]) => Promise<void>;
  existingBuyers?: string[];
  theme?: AppTheme;
}

export interface SubBatchEntry {
  id: string;
  qty: number | '';
  challan: string;
  batch_no: string;
}

interface ItemRowState {
  id: number;
  prev_receive_qty: number;
  today_receive_qty: number | '';
  receive_qty: number;
  receive_date: string;
  receive_challan: string;
  receive_batch_no: string;
  receive_sub_batches: SubBatchEntry[];

  prev_issue_qty: number;
  today_issue_qty: number | '';
  issue_qty: number;
  issue_date: string;
  issue_challan: string;
  issue_batch_no: string;
  issue_sub_batches: SubBatchEntry[];

  balance_qty: number;
  remarks: string;
}

export const QuickStoreRefModal: React.FC<QuickStoreRefModalProps> = ({
  isOpen,
  onClose,
  initialStoreRef = '',
  allItems,
  onSaveQuickUpdates,
  existingBuyers = [],
  theme: initialTheme = 'light'
}) => {
  // Theme state for Full Workspace: Light or Dark
  const [workspaceTheme, setWorkspaceTheme] = useState<AppTheme>(initialTheme);

  // Global Working Date at the top header (Default: Today's date e.g. 23.07.2026)
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
  const [matchingItems, setMatchingItems] = useState<TwillTapeItem[]>([]);
  const [rowStates, setRowStates] = useState<Record<number, ItemRowState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active expanded breakdown row ID for receive / issue
  const [expandedRecvId, setExpandedRecvId] = useState<number | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<number | null>(null);

  // Extract unique Store References, Buyers, and Styles for quick selection
  const uniqueStoreRefs = Array.from(new Set(allItems.map(i => i.store_ref).filter(Boolean))).sort();
  const allBuyers = Array.from(new Set([...existingBuyers, ...allItems.map(i => i.buyer_name).filter(Boolean)])).sort();
  const allStyles = Array.from(new Set(allItems.map(i => i.style).filter(Boolean))).sort();

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
      filtered = filtered.filter(i => i.buyer_name.toLowerCase() === selectedBuyer.toLowerCase());
    }

    if (selectedStyle && selectedStyle !== 'ALL') {
      filtered = filtered.filter(i => i.style.toLowerCase() === selectedStyle.toLowerCase());
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(item =>
        item.store_ref.toLowerCase().includes(term) ||
        (item.job_no && item.job_no.toLowerCase().includes(term)) ||
        item.style.toLowerCase().includes(term) ||
        item.order_no.toLowerCase().includes(term) ||
        item.buyer_name.toLowerCase().includes(term) ||
        item.colour.toLowerCase().includes(term)
      );
    }

    setMatchingItems(filtered);

    // Initialize row states with CLEAN EMPTY INPUT BOXES by default
    const initialRowStates: Record<number, ItemRowState> = {};
    filtered.forEach(item => {
      const prevRecv = item.receive_qty || 0;
      const prevIss = item.issue_qty || 0;
      initialRowStates[item.id] = {
        id: item.id,
        prev_receive_qty: prevRecv,
        today_receive_qty: '',
        receive_qty: prevRecv,
        receive_date: '', // KEEP BOX EMPTY
        receive_challan: '', // KEEP BOX EMPTY
        receive_batch_no: '', // KEEP BOX EMPTY
        receive_sub_batches: [],

        prev_issue_qty: prevIss,
        today_issue_qty: '',
        issue_qty: prevIss,
        issue_date: '', // KEEP BOX EMPTY
        issue_challan: '', // KEEP BOX EMPTY
        issue_batch_no: '', // KEEP BOX EMPTY
        issue_sub_batches: [],

        balance_qty: item.balance_qty || 0,
        remarks: item.remarks || ''
      };
    });
    setRowStates(initialRowStates);
  }, [searchTerm, selectedBuyer, selectedStyle, allItems]);

  // Helper to recalculate row total receive/issue & balance
  const recalculateRow = (state: ItemRowState): ItemRowState => {
    // 1. Calculate Today's Receive Sum (from sub-batches if present, or today_receive_qty input)
    let addedRecv = 0;
    if (state.receive_sub_batches && state.receive_sub_batches.length > 0) {
      addedRecv = state.receive_sub_batches.reduce((sum, b) => sum + (typeof b.qty === 'number' ? b.qty : 0), 0);
    } else {
      addedRecv = typeof state.today_receive_qty === 'number' ? state.today_receive_qty : 0;
    }

    // 2. Calculate Today's Issue Sum
    let addedIss = 0;
    if (state.issue_sub_batches && state.issue_sub_batches.length > 0) {
      addedIss = state.issue_sub_batches.reduce((sum, b) => sum + (typeof b.qty === 'number' ? b.qty : 0), 0);
    } else {
      addedIss = typeof state.today_issue_qty === 'number' ? state.today_issue_qty : 0;
    }

    const totalRecv = state.prev_receive_qty + addedRecv;
    const totalIss = state.prev_issue_qty + addedIss;
    const newBalance = totalRecv > 0 ? Math.max(0, totalRecv - totalIss) : 0;

    return {
      ...state,
      today_receive_qty: state.receive_sub_batches.length > 0 ? addedRecv : state.today_receive_qty,
      receive_qty: totalRecv,
      today_issue_qty: state.issue_sub_batches.length > 0 ? addedIss : state.today_issue_qty,
      issue_qty: totalIss,
      balance_qty: newBalance
    };
  };

  // Direct Today Receive Input
  const handleTodayReceiveChange = (id: number, valStr: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const added = valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0);
      const updatedState = recalculateRow({
        ...current,
        today_receive_qty: added
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // Direct Today Issue Input
  const handleTodayIssueChange = (id: number, valStr: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const added = valStr === '' ? '' : Math.max(0, parseFloat(valStr) || 0);
      const updatedState = recalculateRow({
        ...current,
        today_issue_qty: added
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // Generic Field Change
  const handleFieldChange = (id: number, field: keyof ItemRowState, value: any) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Add Sub-batch for Receive (+)
  const handleAddReceiveSubBatch = (id: number) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const newBatch: SubBatchEntry = {
        id: Date.now().toString() + Math.random().toString(),
        qty: '',
        challan: current.receive_challan || '',
        batch_no: current.receive_batch_no || `BATCH-${current.receive_sub_batches.length + 1}`
      };

      const updatedBatches = [...current.receive_sub_batches, newBatch];
      const updatedState = recalculateRow({
        ...current,
        receive_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
    setExpandedRecvId(id);
  };

  // Update Receive Sub-batch item
  const handleUpdateReceiveSubBatch = (id: number, batchId: string, field: keyof SubBatchEntry, value: any) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const updatedBatches = current.receive_sub_batches.map(b => {
        if (b.id === batchId) {
          return {
            ...b,
            [field]: field === 'qty' ? (value === '' ? '' : Math.max(0, parseFloat(value) || 0)) : value
          };
        }
        return b;
      });

      const updatedState = recalculateRow({
        ...current,
        receive_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // Remove Receive Sub-batch
  const handleRemoveReceiveSubBatch = (id: number, batchId: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const updatedBatches = current.receive_sub_batches.filter(b => b.id !== batchId);
      const updatedState = recalculateRow({
        ...current,
        receive_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // Add Sub-batch for Issue (+)
  const handleAddIssueSubBatch = (id: number) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const newBatch: SubBatchEntry = {
        id: Date.now().toString() + Math.random().toString(),
        qty: '',
        challan: current.issue_challan || '',
        batch_no: current.issue_batch_no || `BATCH-${current.issue_sub_batches.length + 1}`
      };

      const updatedBatches = [...current.issue_sub_batches, newBatch];
      const updatedState = recalculateRow({
        ...current,
        issue_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
    setExpandedIssueId(id);
  };

  // Update Issue Sub-batch item
  const handleUpdateIssueSubBatch = (id: number, batchId: string, field: keyof SubBatchEntry, value: any) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const updatedBatches = current.issue_sub_batches.map(b => {
        if (b.id === batchId) {
          return {
            ...b,
            [field]: field === 'qty' ? (value === '' ? '' : Math.max(0, parseFloat(value) || 0)) : value
          };
        }
        return b;
      });

      const updatedState = recalculateRow({
        ...current,
        issue_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // Remove Issue Sub-batch
  const handleRemoveIssueSubBatch = (id: number, batchId: string) => {
    setRowStates(prev => {
      const current = prev[id];
      if (!current) return prev;

      const updatedBatches = current.issue_sub_batches.filter(b => b.id !== batchId);
      const updatedState = recalculateRow({
        ...current,
        issue_sub_batches: updatedBatches
      });

      return {
        ...prev,
        [id]: updatedState
      };
    });
  };

  // SUBMIT BATCH UPDATES
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatesToSave: QuickUpdatePayload[] = (Object.values(rowStates) as ItemRowState[]).map(r => {
      const addedRecvTotal = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
      const addedIssTotal = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;

      const effectiveDate = globalWorkingDate.trim() || getTodayFormatted();

      // Receive Logs Generation (Multi-batch or single entry)
      const newRecvLogs: TransactionLog[] = [];
      if (r.receive_sub_batches && r.receive_sub_batches.length > 0) {
        r.receive_sub_batches.forEach(sb => {
          const q = typeof sb.qty === 'number' ? sb.qty : 0;
          if (q > 0) {
            newRecvLogs.push({
              id: Date.now().toString() + Math.random().toString(),
              type: 'RECEIVE',
              date: r.receive_date || effectiveDate,
              challan: sb.challan || r.receive_challan || 'N/A',
              batch_no: sb.batch_no || r.receive_batch_no || undefined,
              qty: q,
              remarks: r.remarks
            });
          }
        });
      } else if (addedRecvTotal > 0) {
        newRecvLogs.push({
          id: Date.now().toString() + Math.random().toString(),
          type: 'RECEIVE',
          date: r.receive_date || effectiveDate,
          challan: r.receive_challan || 'N/A',
          batch_no: r.receive_batch_no || undefined,
          qty: addedRecvTotal,
          remarks: r.remarks
        });
      }

      // Issue Logs Generation (Multi-batch or single entry)
      const newIssLogs: TransactionLog[] = [];
      if (r.issue_sub_batches && r.issue_sub_batches.length > 0) {
        r.issue_sub_batches.forEach(sb => {
          const q = typeof sb.qty === 'number' ? sb.qty : 0;
          if (q > 0) {
            newIssLogs.push({
              id: Date.now().toString() + Math.random().toString(),
              type: 'ISSUE',
              date: r.issue_date || effectiveDate,
              challan: sb.challan || r.issue_challan || 'N/A',
              batch_no: sb.batch_no || r.issue_batch_no || undefined,
              qty: q,
              remarks: r.remarks
            });
          }
        });
      } else if (addedIssTotal > 0) {
        newIssLogs.push({
          id: Date.now().toString() + Math.random().toString(),
          type: 'ISSUE',
          date: r.issue_date || effectiveDate,
          challan: r.issue_challan || 'N/A',
          batch_no: r.issue_batch_no || undefined,
          qty: addedIssTotal,
          remarks: r.remarks
        });
      }

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
        new_receive_logs: newRecvLogs.length > 0 ? newRecvLogs : undefined,
        new_issue_logs: newIssLogs.length > 0 ? newIssLogs : undefined
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
      console.error("Failed to save quick updates:", err);
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
      
      {/* 1. TOP HEADER BAR WITH THEME & GLOBAL WORKING DATE */}
      <div className={`px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 border-b shadow-md ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-900 text-white border-slate-800'
      }`}>
        
        {/* Left Brand & Global Working Date */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md">
              <Zap className="w-5 h-5 text-yellow-200 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">Full-Page Quick Receive & Issue Workspace</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Multi-Batch Grid
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Type receive & issue entries with Challan No & Batch No. Working date applies to all rows automatically.
              </p>
            </div>
          </div>

          {/* GLOBAL WORKING DATE HEADER CONTROL */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/50 shadow-inner">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold uppercase text-amber-300">Working Date:</span>
            <input
              type="text"
              value={globalWorkingDate}
              onChange={(e) => setGlobalWorkingDate(e.target.value)}
              placeholder="DD.MM.YYYY"
              className="w-28 px-2 py-0.5 bg-slate-950 border border-amber-400 text-amber-200 font-mono font-extrabold text-xs rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
              title="Global Working Date for today's transactions (e.g., 23.07.2026)"
            />
            <span className="text-[10px] text-slate-400 hidden lg:inline">(Applied automatically)</span>
          </div>
        </div>

        {/* Right Actions & Theme Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Workspace Theme Toggle */}
          <button
            type="button"
            onClick={() => setWorkspaceTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 shadow-xs transition-all"
            title={`Switch to ${isDark ? 'Light / White' : 'Dark'} Skin`}
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
              saveSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-98'
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
                Save {matchingItems.length} Rows
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. FILTERS CONTROL BAR: Buyer, Style, Search & Quick Store Ref Chips */}
      <div className={`p-3.5 border-b shrink-0 space-y-2.5 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Buyer Filter Dropdown */}
          <div className="md:col-span-3">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Filter className="w-3 h-3 text-indigo-500" />
              Buyer
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Buyers ({allItems.length})</option>
              {allBuyers.map(buyer => (
                <option key={buyer} value={buyer}>
                  {buyer} ({allItems.filter(i => i.buyer_name === buyer).length})
                </option>
              ))}
            </select>
          </div>

          {/* Style Filter Dropdown */}
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
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Styles ({allStyles.length})</option>
              {allStyles.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-6">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Search className="w-3 h-3 text-indigo-500" />
              Search Store Ref / Job / Style / Colour
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search GMST-FB-26-00593, Colour, Job No..."
                className={`w-full pl-8 pr-16 py-1.5 rounded-lg font-mono text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                ? 'bg-indigo-600 text-white border-indigo-500'
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
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-indigo-500'
              }`}
            >
              {ref}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN TABLE WORKSPACE WITH CRISP GRID BORDERS */}
      <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        {matchingItems.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-300 bg-white'
          }`}>
            <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching items found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Select a different Buyer/Style or clear your search term.
            </p>
          </div>
        ) : (
          <div className="min-w-[1320px]">
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
                    Buyer / Store Ref / Job No
                  </th>
                  <th className={`py-2 px-3 border min-w-[160px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Style & Colour
                  </th>
                  <th className={`py-2 px-3 border min-w-[100px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Booking Qty
                  </th>
                  <th className={`py-2 px-3 border min-w-[360px] ${
                    isDark ? 'bg-emerald-950/80 text-emerald-200 border-slate-700' : 'bg-emerald-800 text-white border-slate-400'
                  }`}>
                    1. RECEIVE ENTRY (+ Challan / Batch / Multi-batch)
                  </th>
                  <th className={`py-2 px-3 border min-w-[360px] ${
                    isDark ? 'bg-blue-950/80 text-blue-200 border-slate-700' : 'bg-blue-800 text-white border-slate-400'
                  }`}>
                    2. ISSUE ENTRY (+ Challan / Batch / Multi-batch)
                  </th>
                  <th className={`py-2 px-3 border min-w-[110px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Balance Qty
                  </th>
                  <th className={`py-2 px-3 border min-w-[140px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
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
                    receive_batch_no: '',
                    receive_sub_batches: [],

                    prev_issue_qty: item.issue_qty || 0,
                    today_issue_qty: '',
                    issue_qty: item.issue_qty || 0,
                    issue_date: '',
                    issue_challan: '',
                    issue_batch_no: '',
                    issue_sub_batches: [],

                    balance_qty: item.balance_qty || 0,
                    remarks: item.remarks || ''
                  };

                  const rowStyle = getItemRowStyle(item.booking_qty, state.receive_qty);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isDark
                          ? 'bg-slate-900/90 hover:bg-slate-800/80 text-slate-100'
                          : 'bg-white hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      {/* 1. Buyer / Store Ref / Job No */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs leading-tight">{item.buyer_name}</div>
                        <div className="mt-1">
                          <span className={`inline-block font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded border ${
                            isDark ? 'bg-slate-950 text-amber-300 border-slate-800' : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}>
                            {item.store_ref}
                          </span>
                        </div>
                        {item.job_no && (
                          <div className="text-[10px] text-indigo-500 font-mono mt-0.5 font-bold">
                            Job: {item.job_no}
                          </div>
                        )}
                      </td>

                      {/* 2. Style & Colour */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs truncate max-w-[170px]" title={item.style}>
                          {item.style}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-indigo-300 border border-slate-700">
                            {item.colour}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.item_name} ({item.cm})</div>
                      </td>

                      {/* 3. Booking Qty */}
                      <td className={`py-2.5 px-3 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-mono font-extrabold text-xs text-amber-600 dark:text-yellow-300">
                          {item.booking_qty.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{item.yds}</span>
                        </div>
                        <div className="mt-1">
                          <span className={rowStyle.badgeClass}>
                            {rowStyle.statusLabel}
                          </span>
                        </div>
                      </td>

                      {/* 4. RECEIVE CELL (Challan + Batch + Multi-batch (+) support) */}
                      <td className={`py-2 px-3 align-top border ${
                        isDark ? 'bg-emerald-950/20 border-slate-800' : 'bg-emerald-50/40 border-slate-300'
                      }`}>
                        <div className="space-y-1.5">
                          {/* Row Top: Prev Recv & Today Recv */}
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

                          {/* Inputs: Challan No & Batch No */}
                          <div className="grid grid-cols-2 gap-1.5">
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
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500">Batch / Roll No</label>
                              <input
                                type="text"
                                value={state.receive_batch_no}
                                onChange={(e) => handleFieldChange(item.id, 'receive_batch_no', e.target.value)}
                                placeholder="Batch #"
                                className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Multi-Batch (+) Button */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddReceiveSubBatch(item.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-all"
                              title="Click (+) to enter multiple sub-batches (e.g. 500 + 700 + 1200)"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Sub-Batch breakdown (+)</span>
                            </button>

                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                              Total: {state.receive_qty} {item.yds}
                            </span>
                          </div>

                          {/* Render Sub-Batches List if created */}
                          {state.receive_sub_batches && state.receive_sub_batches.length > 0 && (
                            <div className="space-y-1 p-2 rounded bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px]">
                              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                                Receive Sub-Batches ({state.receive_sub_batches.length}):
                              </div>
                              {state.receive_sub_batches.map((sb, sbIdx) => (
                                <div key={sb.id} className="flex items-center gap-1">
                                  <span className="font-bold text-slate-500">#{sbIdx + 1}</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sb.qty}
                                    onChange={(e) => handleUpdateReceiveSubBatch(item.id, sb.id, 'qty', e.target.value)}
                                    placeholder="Qty"
                                    className="w-16 px-1.5 py-0.5 font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={sb.challan}
                                    onChange={(e) => handleUpdateReceiveSubBatch(item.id, sb.id, 'challan', e.target.value)}
                                    placeholder="Challan #"
                                    className="w-20 px-1.5 py-0.5 font-mono text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={sb.batch_no}
                                    onChange={(e) => handleUpdateReceiveSubBatch(item.id, sb.id, 'batch_no', e.target.value)}
                                    placeholder="Batch #"
                                    className="w-20 px-1.5 py-0.5 font-mono text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReceiveSubBatch(item.id, sb.id)}
                                    className="p-1 text-red-600 hover:text-red-800"
                                    title="Delete this sub-batch"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      </td>

                      {/* 5. ISSUE CELL (Challan + Batch + Multi-batch (+) support) */}
                      <td className={`py-2 px-3 align-top border ${
                        isDark ? 'bg-blue-950/20 border-slate-800' : 'bg-blue-50/40 border-slate-300'
                      }`}>
                        <div className="space-y-1.5">
                          {/* Row Top: Prev Issue & Today Issue */}
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

                          {/* Inputs: Challan No & Batch No */}
                          <div className="grid grid-cols-2 gap-1.5">
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
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-500">Batch / Roll No</label>
                              <input
                                type="text"
                                value={state.issue_batch_no}
                                onChange={(e) => handleFieldChange(item.id, 'issue_batch_no', e.target.value)}
                                placeholder="Batch #"
                                className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Multi-Batch (+) Button */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddIssueSubBatch(item.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs transition-all"
                              title="Click (+) to enter multiple sub-batches for issue"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Issue Sub-batch breakdown (+)</span>
                            </button>

                            <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                              Total: {state.issue_qty} {item.yds}
                            </span>
                          </div>

                          {/* Render Sub-Batches List if created */}
                          {state.issue_sub_batches && state.issue_sub_batches.length > 0 && (
                            <div className="space-y-1 p-2 rounded bg-blue-100/60 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-[10px]">
                              <div className="font-bold text-blue-900 dark:text-blue-200">
                                Issue Sub-Batches ({state.issue_sub_batches.length}):
                              </div>
                              {state.issue_sub_batches.map((sb, sbIdx) => (
                                <div key={sb.id} className="flex items-center gap-1">
                                  <span className="font-bold text-slate-500">#{sbIdx + 1}</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sb.qty}
                                    onChange={(e) => handleUpdateIssueSubBatch(item.id, sb.id, 'qty', e.target.value)}
                                    placeholder="Qty"
                                    className="w-16 px-1.5 py-0.5 font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-blue-400 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={sb.challan}
                                    onChange={(e) => handleUpdateIssueSubBatch(item.id, sb.id, 'challan', e.target.value)}
                                    placeholder="Challan #"
                                    className="w-20 px-1.5 py-0.5 font-mono text-xs bg-white dark:bg-slate-900 border border-blue-400 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={sb.batch_no}
                                    onChange={(e) => handleUpdateIssueSubBatch(item.id, sb.id, 'batch_no', e.target.value)}
                                    placeholder="Batch #"
                                    className="w-20 px-1.5 py-0.5 font-mono text-xs bg-white dark:bg-slate-900 border border-blue-400 rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIssueSubBatch(item.id, sb.id)}
                                    className="p-1 text-red-600 hover:text-red-800"
                                    title="Delete this sub-batch"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      </td>

                      {/* 6. Balance Qty */}
                      <td className={`py-2.5 px-3 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className={`font-mono font-extrabold text-xs px-2 py-1 rounded inline-block ${
                          state.balance_qty > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {state.balance_qty.toLocaleString()} {item.yds}
                        </div>
                      </td>

                      {/* 7. Remarks */}
                      <td className={`py-2.5 px-3 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <input
                          type="text"
                          value={state.remarks}
                          onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                          placeholder="Remarks..."
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
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

      {/* 4. FOOTER BAR WITH SAVE ACTION */}
      <div className={`px-6 py-3 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <div className="text-xs font-medium">
          Working Date: <strong className="text-amber-600 dark:text-amber-400">{globalWorkingDate || getTodayFormatted()}</strong> | Showing <strong>{matchingItems.length}</strong> row(s)
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close Workspace
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || matchingItems.length === 0}
            className={`px-6 py-2 text-xs font-bold text-white rounded-xl shadow-lg flex items-center gap-2 transition-all ${
              saveSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-98'
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
                Save All {matchingItems.length} Update(s)
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
