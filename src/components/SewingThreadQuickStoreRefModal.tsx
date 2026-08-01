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

  // Auto save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Excel-style column filters for every column
  const [colFilters, setColFilters] = useState({
    buyer_ref_job: '',
    booking_info: '',
    style_colour: '',
    item_name: '',
    count_shade: '',
    sr_gt: '',
    meter_consm: '',
    supplier: '',
    booking_qty: '',
    receive_qty: '',
    issue_qty: '',
    balance_qty: '',
    remarks: ''
  });

  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const clearAllColFilters = () => {
    setColFilters({
      buyer_ref_job: '',
      booking_info: '',
      style_colour: '',
      item_name: '',
      count_shade: '',
      sr_gt: '',
      meter_consm: '',
      supplier: '',
      booking_qty: '',
      receive_qty: '',
      issue_qty: '',
      balance_qty: '',
      remarks: ''
    });
  };

  const hasActiveColFilters = Object.values(colFilters).some(val => String(val || '').trim().length > 0);

  // Unique lists for quick filter chips & suggestions
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

  // Filter items based on buyer selection, style, search term & column filters
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
        const itemNm = (item.item_name || '').toLowerCase();
        const supp = (item.supplier || '').toLowerCase();
        const srGt = (item.sr_gt || '').toLowerCase();

        return (
          ref.includes(term) ||
          buyer.includes(term) ||
          style.includes(term) ||
          colour.includes(term) ||
          job.includes(term) ||
          shade.includes(term) ||
          count.includes(term) ||
          itemNm.includes(term) ||
          supp.includes(term) ||
          srGt.includes(term)
        );
      });
    }

    // Apply Column Filters instantly
    if (colFilters.buyer_ref_job) {
      const q = colFilters.buyer_ref_job.toLowerCase();
      filtered = filtered.filter(i =>
        (i.buyer_name || i.buyer || '').toLowerCase().includes(q) ||
        (i.store_ref || i.s_thread_ref || '').toLowerCase().includes(q) ||
        (i.job_no || '').toLowerCase().includes(q)
      );
    }
    if (colFilters.booking_info) {
      const q = colFilters.booking_info.toLowerCase();
      filtered = filtered.filter(i =>
        (i.date || '').toLowerCase().includes(q) ||
        (i.booking_challan || '').toLowerCase().includes(q) ||
        (i.order_no || '').toLowerCase().includes(q)
      );
    }
    if (colFilters.style_colour) {
      const q = colFilters.style_colour.toLowerCase();
      filtered = filtered.filter(i =>
        (i.style || '').toLowerCase().includes(q) ||
        (i.colour || i.color || '').toLowerCase().includes(q)
      );
    }
    if (colFilters.item_name) {
      const q = colFilters.item_name.toLowerCase();
      filtered = filtered.filter(i => (i.item_name || '').toLowerCase().includes(q));
    }
    if (colFilters.count_shade) {
      const q = colFilters.count_shade.toLowerCase();
      filtered = filtered.filter(i =>
        (i.thread_count || i.count || '').toLowerCase().includes(q) ||
        (i.shade_no || i.pantone || '').toLowerCase().includes(q)
      );
    }
    if (colFilters.sr_gt) {
      const q = colFilters.sr_gt.toLowerCase();
      filtered = filtered.filter(i => (i.sr_gt || '').toLowerCase().includes(q));
    }
    if (colFilters.meter_consm) {
      const q = colFilters.meter_consm.toLowerCase();
      filtered = filtered.filter(i =>
        (i.meter || '').toLowerCase().includes(q) ||
        (i.per_body_consm || '').toLowerCase().includes(q)
      );
    }
    if (colFilters.supplier) {
      const q = colFilters.supplier.toLowerCase();
      filtered = filtered.filter(i => (i.supplier || '').toLowerCase().includes(q));
    }
    if (colFilters.booking_qty) {
      filtered = filtered.filter(i => String(i.booking_qty || 0).includes(colFilters.booking_qty));
    }
    if (colFilters.receive_qty) {
      filtered = filtered.filter(i => String(i.receive_qty || 0).includes(colFilters.receive_qty));
    }
    if (colFilters.issue_qty) {
      filtered = filtered.filter(i => String(i.issue_qty || 0).includes(colFilters.issue_qty));
    }
    if (colFilters.balance_qty) {
      filtered = filtered.filter(i => String(i.balance_qty || 0).includes(colFilters.balance_qty));
    }
    if (colFilters.remarks) {
      const q = colFilters.remarks.toLowerCase();
      filtered = filtered.filter(i => (i.remarks || '').toLowerCase().includes(q));
    }

    setMatchingItems(filtered);

    // Merge/Initialize row states preserving any active unsaved user inputs
    setRowStates(prev => {
      const nextStates: Record<number, SewingRowState> = { ...prev };
      filtered.forEach(item => {
        const prevRecv = item.receive_qty || 0;
        const prevIss = item.issue_qty || 0;

        if (nextStates[item.id]) {
          const current = nextStates[item.id];
          const addedR = typeof current.today_receive_qty === 'number' ? current.today_receive_qty : 0;
          const addedI = typeof current.today_issue_qty === 'number' ? current.today_issue_qty : 0;
          const totalR = prevRecv + addedR;
          const totalI = prevIss + addedI;
          nextStates[item.id] = {
            ...current,
            prev_receive_qty: prevRecv,
            prev_issue_qty: prevIss,
            receive_qty: totalR,
            issue_qty: totalI,
            balance_qty: totalR > 0 ? Math.max(0, totalR - totalI) : 0
          };
        } else {
          nextStates[item.id] = {
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
        }
      });
      return nextStates;
    });
  }, [searchTerm, selectedBuyer, selectedStyle, allItems, colFilters]);

  // Excel-style Enter key navigation to move focus down to the next row
  const handleKeyDownNavigation = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    rowIndex: number,
    fieldCol: string
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      let targetRowIndex = rowIndex;
      if (e.key === 'Enter') {
        targetRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
      } else if (e.key === 'ArrowDown') {
        targetRowIndex = rowIndex + 1;
      } else if (e.key === 'ArrowUp') {
        targetRowIndex = rowIndex - 1;
      }

      if (targetRowIndex !== rowIndex) {
        const targetInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[data-row-idx="${targetRowIndex}"][data-col="${fieldCol}"]`
        );
        if (targetInput) {
          e.preventDefault();
          targetInput.focus();
          if (typeof targetInput.select === 'function') {
            targetInput.select();
          }
        }
      }
    }
  };

  // Debounced Auto-Save trigger
  useEffect(() => {
    if (!autoSaveEnabled || isSaving) return;

    const rowsWithChanges = (Object.values(rowStates) as SewingRowState[]).filter(r => {
      const hasRecv = typeof r.today_receive_qty === 'number' && r.today_receive_qty > 0;
      const hasIss = typeof r.today_issue_qty === 'number' && r.today_issue_qty > 0;
      return hasRecv || hasIss;
    });

    if (rowsWithChanges.length === 0) return;

    const hasInvalid = rowsWithChanges.some(r => {
      const addedRecv = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
      const addedIss = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;
      const recvMissing = addedRecv > 0 && !r.receive_challan?.trim();
      const issMissing = addedIss > 0 && !r.issue_challan?.trim();
      const issueExceeded = Number(r.issue_qty || 0) > Number(r.receive_qty || 0);
      return recvMissing || issMissing || issueExceeded;
    });

    if (hasInvalid) return;

    const timer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        setIsSaving(true);

        const effectiveDate = globalWorkingDate.trim() || getTodayFormatted();
        const updatesToSave: QuickUpdatePayload[] = rowsWithChanges.map(r => {
          const addedRecvTotal = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
          const addedIssTotal = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;

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

          const finalRecvDate = addedRecvTotal > 0 ? (r.receive_date || effectiveDate) : (r.receive_date || '');
          const finalRecvChallan = r.receive_challan || '';
          const finalIssDate = addedIssTotal > 0 ? (r.issue_date || effectiveDate) : (r.issue_date || '');
          const finalIssChallan = r.issue_challan || '';

          return {
            id: r.id,
            receive_qty: Number(r.receive_qty) || 0,
            receive_date: finalRecvDate,
            receive_challan: finalRecvChallan,
            issue_qty: Number(r.issue_qty) || 0,
            issue_date: finalIssDate,
            issue_challan: finalIssChallan,
            balance_qty: Number(r.balance_qty) || 0,
            remarks: r.remarks || '',
            new_receive_log: newRecvLog,
            new_issue_log: newIssLog
          };
        });

        await onSaveQuickUpdates(updatesToSave);

        setRowStates(prev => {
          const nextState = { ...prev };
          rowsWithChanges.forEach(r => {
            const current = nextState[r.id];
            if (current) {
              nextState[r.id] = {
                ...current,
                prev_receive_qty: current.receive_qty,
                today_receive_qty: '',
                prev_issue_qty: current.issue_qty,
                today_issue_qty: ''
              };
            }
          });
          return nextState;
        });

        setAutoSaveStatus('saved');
        setSaveSuccess(true);
        setTimeout(() => {
          setAutoSaveStatus('idle');
          setSaveSuccess(false);
        }, 2500);
      } catch (err) {
        console.error("Sewing auto save failed:", err);
        setAutoSaveStatus('idle');
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [rowStates, autoSaveEnabled, isSaving, globalWorkingDate, onSaveQuickUpdates]);

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

  // Submit quick updates manually
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allRowStates = Object.values(rowStates) as SewingRowState[];

    // 1. Filter rows that have entries/changes
    const changedRows = allRowStates.filter(r => {
      const addedRecv = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
      const addedIss = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;
      const origItem = allItems.find(i => i.id === r.id);
      const remarksChanged = (r.remarks || '') !== (origItem?.remarks || '');
      return addedRecv > 0 || addedIss > 0 || remarksChanged;
    });

    if (changedRows.length === 0) {
      alert("⚠️ No changes or quantities entered! Please enter Receive or Issue Qty.");
      return;
    }

    // 2. Validate: Issue Qty cannot exceed Received Qty
    const invalidExceeded = changedRows.find(
      r => Number(r.issue_qty || 0) > Number(r.receive_qty || 0)
    );

    if (invalidExceeded) {
      const matchedItem = allItems.find(i => i.id === invalidExceeded.id);
      const maxAvailable = Number(invalidExceeded.receive_qty || 0);
      const attemptedIssue = Number(invalidExceeded.issue_qty || 0);
      const styleStr = matchedItem?.style ? ` for style ${matchedItem.style}` : '';
      const colStr = matchedItem?.colour || matchedItem?.color ? ` (${matchedItem?.colour || matchedItem?.color})` : '';
      alert(
        `❌ Issue Qty (${attemptedIssue}) cannot exceed Received Qty (${maxAvailable})${styleStr}${colStr}!\n\n(রিসিভ পরিমাণের চেয়ে বেশি ইস্যু দেওয়া যাবে না। লাল চিহ্নিত ঘর সংশোধন করুন।)`
      );
      return;
    }

    // 3. Validate: Challan Number is compulsory for Receive or Issue entry
    const missingChallan = changedRows.find(r => {
      const addedRecv = typeof r.today_receive_qty === 'number' ? r.today_receive_qty : 0;
      const addedIss = typeof r.today_issue_qty === 'number' ? r.today_issue_qty : 0;
      const recvMissing = addedRecv > 0 && !r.receive_challan?.trim();
      const issMissing = addedIss > 0 && !r.issue_challan?.trim();
      return recvMissing || issMissing;
    });

    if (missingChallan) {
      const matchedItem = allItems.find(i => i.id === missingChallan.id);
      const styleStr = matchedItem?.style ? ` for style ${matchedItem.style}` : '';
      alert(
        `❌ Challan Number Required!\n\n(চালান নম্বর ছাড়া রিসিভ বা ইস্যু সেভ করা যাবে না। যে রো ফাকা থাকবে তা লাল রঙ হয়ে যাবে, দয়া করে চালান নম্বর দিন।)${styleStr}`
      );
      return;
    }

    const updatesToSave: QuickUpdatePayload[] = changedRows.map(r => {
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

      const finalRecvDate = addedRecvTotal > 0 ? (r.receive_date || effectiveDate) : (r.receive_date || '');
      const finalRecvChallan = r.receive_challan || '';
      const finalIssDate = addedIssTotal > 0 ? (r.issue_date || effectiveDate) : (r.issue_date || '');
      const finalIssChallan = r.issue_challan || '';

      return {
        id: r.id,
        receive_qty: Number(r.receive_qty) || 0,
        receive_date: finalRecvDate,
        receive_challan: finalRecvChallan,
        issue_qty: Number(r.issue_qty) || 0,
        issue_date: finalIssDate,
        issue_challan: finalIssChallan,
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

      // Reset row inputs locally
      setRowStates(prev => {
        const nextState = { ...prev };
        changedRows.forEach(r => {
          const current = nextState[r.id];
          if (current) {
            nextState[r.id] = {
              ...current,
              prev_receive_qty: current.receive_qty,
              today_receive_qty: '',
              prev_issue_qty: current.issue_qty,
              today_issue_qty: ''
            };
          }
        });
        return nextState;
      });

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
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden w-screen h-screen animate-in fade-in duration-200 transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* 1. TOP HEADER BAR */}
      <div className={`px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b shadow-md ${
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
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">Sewing Thread Receive & Issue Workspace</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Full Page
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                All Supabase columns with Excel-style column filters & instant search.
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

        {/* Right Actions & Theme Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Auto-Save Toggle & Indicator */}
          <button
            type="button"
            onClick={() => setAutoSaveEnabled(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
              autoSaveEnabled
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50 shadow-2xs'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Automatic Background Saving"
          >
            <span className={`w-2 h-2 rounded-full ${
              autoSaveStatus === 'saving'
                ? 'bg-amber-400 animate-ping'
                : autoSaveStatus === 'saved'
                ? 'bg-emerald-400'
                : autoSaveEnabled
                ? 'bg-emerald-500'
                : 'bg-slate-500'
            }`} />
            <span>
              {autoSaveStatus === 'saving'
                ? 'Auto Saving...'
                : autoSaveStatus === 'saved'
                ? 'Auto Saved ✓'
                : `Auto Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`}
            </span>
          </button>

          {/* Workspace Theme Toggle */}
          <button
            type="button"
            onClick={() => setWorkspaceTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1.5 shadow-xs transition-all"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">White Skin</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-300" />
                <span className="hidden sm:inline">Dark Skin</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || matchingItems.length === 0}
            className={`px-4 sm:px-5 py-1.5 text-xs font-bold text-white rounded-xl shadow-lg flex items-center gap-2 transition-all ${
              saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save {matchingItems.length} Rows</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. FILTERS CONTROL BAR */}
      <div className={`p-3 border-b shrink-0 space-y-2.5 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          <div className="md:col-span-3">
            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Filter className="w-3 h-3 text-emerald-500" />
              Buyer Dropdown
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
              Style Dropdown
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

          <div className="md:col-span-6 relative">
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Search className="w-3 h-3 text-emerald-500" />
                Global Search (Ref / Job / Style / Colour / Count / Shade / Supplier)
              </label>

              {hasActiveColFilters && (
                <button
                  type="button"
                  onClick={clearAllColFilters}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                  title="Clear all column filters"
                >
                  <X className="w-3 h-3" />
                  Clear Column Filters
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Click or type to search Store Ref, Job No, Colour..."
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

              {/* Excel-Style Clickable Filter Suggestions Box Dropdown */}
              {showSearchDropdown && uniqueStoreRefs.length > 0 && (
                <div
                  className={`absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-xl z-40 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="p-2 border-b border-slate-700/50 flex items-center justify-between text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    <span>Excel Store Ref Filter Suggestions ({uniqueStoreRefs.length} Refs)</span>
                    <button
                      type="button"
                      onClick={() => setShowSearchDropdown(false)}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setShowSearchDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold rounded hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>All Store Refs ({allItems.length} items)</span>
                      <span className="text-[10px] opacity-70">SHOW ALL</span>
                    </button>
                    {uniqueStoreRefs
                      .filter(ref => !searchTerm || String(ref || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((ref) => {
                        const count = allItems.filter(i => (i.store_ref || i.s_thread_ref) === ref).length;
                        return (
                          <button
                            key={ref}
                            type="button"
                            onClick={() => {
                              setSearchTerm(ref);
                              setShowSearchDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 font-mono text-xs font-bold rounded hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>{ref}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/20 text-emerald-300 font-sans">{count} items</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
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
          {uniqueStoreRefs.slice(0, 12).map((ref) => (
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

      {/* 3. MAIN TABLE WORKSPACE (FULL PAGE + FREEZE HEADERS) */}
      <div className={`flex-1 overflow-auto p-2 sm:p-3 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        {matchingItems.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-300 bg-white'
          }`}>
            <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching thread items found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Select a different Buyer/Style or clear your column filters.
            </p>
          </div>
        ) : (
          <div className="min-w-[1500px]">
            <table className={`w-full text-left border-collapse text-xs ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}>
              <thead>
                {/* 1. COLUMN TITLE HEADER ROW (FROZEN STICKY TOP) */}
                <tr className={`uppercase tracking-wider font-extrabold text-[10px] select-none sticky top-0 z-30 shadow-xs ${
                  isDark
                    ? 'bg-slate-900 text-slate-300 border-b-2 border-slate-700'
                    : 'bg-slate-800 text-white border-b-2 border-slate-900'
                }`}>
                  <th className={`py-2 px-2.5 border min-w-[180px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Buyer / Store Ref / Job
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[150px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Booking Date / Challan
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[150px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Style & Colour
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[140px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Item Name
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[140px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Count & Shade/Pantone
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[140px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    SR / GT Ref
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[120px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Meter / Consm
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[120px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Supplier
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[100px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Booking Qty
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[260px] ${
                    isDark ? 'bg-emerald-950/80 text-emerald-200 border-slate-700' : 'bg-emerald-800 text-white border-slate-400'
                  }`}>
                    1. RECEIVE ENTRY (+ Challan)
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[260px] ${
                    isDark ? 'bg-blue-950/80 text-blue-200 border-slate-700' : 'bg-blue-800 text-white border-slate-400'
                  }`}>
                    2. ISSUE ENTRY (+ Challan)
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[100px] text-right ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Balance Qty
                  </th>
                  <th className={`py-2 px-2.5 border min-w-[130px] ${isDark ? 'border-slate-700' : 'border-slate-400'}`}>
                    Remarks
                  </th>
                </tr>

                {/* 2. EXCEL-STYLE COLUMN FILTER INPUT ROW (STICKY FROZEN BELOW TITLE HEADER) */}
                <tr className={`sticky top-[31px] z-20 border-b shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-700 border-slate-600'}`}>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.buyer_ref_job}
                      onChange={e => setColFilters(prev => ({ ...prev, buyer_ref_job: e.target.value }))}
                      placeholder="🔍 Filter Buyer/Ref/Job..."
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.booking_info}
                      onChange={e => setColFilters(prev => ({ ...prev, booking_info: e.target.value }))}
                      placeholder="🔍 Filter Date/Challan..."
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.style_colour}
                      onChange={e => setColFilters(prev => ({ ...prev, style_colour: e.target.value }))}
                      placeholder="🔍 Filter Style/Colour..."
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.item_name}
                      onChange={e => setColFilters(prev => ({ ...prev, item_name: e.target.value }))}
                      placeholder="Filter Item Name"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.count_shade}
                      onChange={e => setColFilters(prev => ({ ...prev, count_shade: e.target.value }))}
                      placeholder="Filter Count/Shade"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.sr_gt}
                      onChange={e => setColFilters(prev => ({ ...prev, sr_gt: e.target.value }))}
                      placeholder="🔍 Filter SR/GT (e.g. GMST...)"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold ${
                        isDark ? 'bg-amber-950/60 border-amber-800 text-amber-200 placeholder-amber-500' : 'bg-slate-900 border-amber-500 text-amber-300 placeholder-amber-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.meter_consm}
                      onChange={e => setColFilters(prev => ({ ...prev, meter_consm: e.target.value }))}
                      placeholder="Filter Meter/Consm"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.supplier}
                      onChange={e => setColFilters(prev => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Filter Supplier"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.booking_qty}
                      onChange={e => setColFilters(prev => ({ ...prev, booking_qty: e.target.value }))}
                      placeholder="Filter Booking"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 text-right ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.receive_qty}
                      onChange={e => setColFilters(prev => ({ ...prev, receive_qty: e.target.value }))}
                      placeholder="Filter Receive Qty"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-emerald-950 border-emerald-800 text-emerald-100 placeholder-emerald-400' : 'bg-emerald-950 border-emerald-700 text-emerald-100 placeholder-emerald-300'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.issue_qty}
                      onChange={e => setColFilters(prev => ({ ...prev, issue_qty: e.target.value }))}
                      placeholder="Filter Issue Qty"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                        isDark ? 'bg-blue-950 border-blue-800 text-blue-100 placeholder-blue-400' : 'bg-blue-950 border-blue-700 text-blue-100 placeholder-blue-300'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.balance_qty}
                      onChange={e => setColFilters(prev => ({ ...prev, balance_qty: e.target.value }))}
                      placeholder="Filter Bal"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 text-right ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                  <th className="p-1">
                    <input
                      type="text"
                      value={colFilters.remarks}
                      onChange={e => setColFilters(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Filter Remarks"
                      className={`w-full px-2 py-1 text-[10px] rounded font-mono font-normal border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-900 border-slate-600 text-white placeholder-slate-400'
                      }`}
                    />
                  </th>
                </tr>
              </thead>

              <tbody className="font-medium">
                {matchingItems.map((item, rIdx) => {
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
                      key={`${item.id}_${rIdx}`}
                      className={`transition-colors ${
                        isDark ? 'bg-slate-900/90 hover:bg-slate-800/80 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      {/* Buyer / Store Ref / Job */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs leading-tight">{item.buyer_name || item.buyer}</div>
                        <div className="mt-1">
                          <span className={`inline-block font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded border ${
                            isDark ? 'bg-slate-950 text-amber-300 border-slate-800' : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}>
                            {item.store_ref || item.s_thread_ref}
                          </span>
                        </div>
                        {item.job_no && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono mt-0.5 font-bold">
                            Job: {item.job_no}
                          </div>
                        )}
                      </td>

                      {/* Booking Date & Booking Challan / Order No */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.date || 'N/A'}
                        </div>
                        {item.booking_challan && (
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Ch: {item.booking_challan}
                          </div>
                        )}
                        {item.order_no && (
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            Ord: {item.order_no}
                          </div>
                        )}
                      </td>

                      {/* Style & Colour */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs truncate max-w-[140px]" title={item.style}>
                          {item.style}
                        </div>
                        <div className="mt-1">
                          <span className={isPending ? "inline-block px-2 py-0.5 bg-amber-200 text-amber-950 font-black border border-amber-400 rounded text-[10px]" : "font-extrabold uppercase text-slate-900 dark:text-white text-[11px]"}>
                            {item.colour || item.color}
                          </span>
                        </div>
                      </td>

                      {/* Item Name */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-medium text-xs text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={item.item_name}>
                          {item.item_name || 'Sewing Thread'}
                        </div>
                      </td>

                      {/* Thread Count & Shade No */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-bold text-xs text-indigo-700 dark:text-indigo-300">
                          {item.thread_count || item.count || '40/2'}
                        </div>
                        <div className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                          Shade: {item.shade_no || item.pantone || 'N/A'}
                        </div>
                      </td>

                      {/* SR / GT Ref Column */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        {item.sr_gt ? (
                          <span className={`inline-block font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded border ${
                            isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}>
                            {item.sr_gt}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">N/A</span>
                        )}
                      </td>

                      {/* Meter / Consm */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        {item.meter && (
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                            Mtr: {item.meter}
                          </div>
                        )}
                        {item.per_body_consm && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Consm: {item.per_body_consm}
                          </div>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate max-w-[110px]" title={item.supplier}>
                          {item.supplier || 'N/A'}
                        </div>
                      </td>

                      {/* Booking Qty */}
                      <td className={`py-2 px-2.5 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <div className="font-mono font-extrabold text-xs">
                          <span className={isPending ? "inline-block px-2 py-0.5 bg-amber-200 text-amber-950 font-black border border-amber-400 rounded" : "text-slate-900 dark:text-amber-300"}>
                            {item.booking_qty?.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* RECEIVE CELL */}
                      {(() => {
                        const addedRecv = typeof state.today_receive_qty === 'number' ? state.today_receive_qty : 0;
                        const isRecvChallanMissing = addedRecv > 0 && !state.receive_challan?.trim();

                        return (
                          <td className={`py-2 px-2.5 align-top border ${
                            isRecvChallanMissing
                              ? 'bg-red-50 dark:bg-red-950/70 border-red-400 dark:border-red-800'
                              : (isDark ? 'bg-emerald-950/20 border-slate-800' : 'bg-emerald-50/40 border-slate-300')
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
                                    data-row-idx={rIdx}
                                    data-col="today_receive_qty"
                                    value={state.today_receive_qty}
                                    onChange={(e) => handleTodayReceiveChange(item.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDownNavigation(e, rIdx, 'today_receive_qty')}
                                    placeholder="0"
                                    className={`w-20 px-2 py-1 font-mono font-bold text-xs rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                      isDark ? 'bg-slate-950 border-emerald-600 text-emerald-300' : 'bg-white border-emerald-400 text-emerald-900'
                                    }`}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="block text-[9px] font-bold uppercase text-slate-500">Challan No</label>
                                  {isRecvChallanMissing && (
                                    <span className="text-[9px] font-bold text-red-600 dark:text-red-400">⚠️ Required</span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  data-row-idx={rIdx}
                                  data-col="receive_challan"
                                  value={state.receive_challan}
                                  onChange={(e) => handleFieldChange(item.id, 'receive_challan', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownNavigation(e, rIdx, 'receive_challan')}
                                  placeholder="Challan #"
                                  className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none transition-all ${
                                    isRecvChallanMissing
                                      ? 'bg-red-100 dark:bg-red-950/90 border-red-500 text-red-900 dark:text-red-100 font-bold focus:ring-2 focus:ring-red-500 ring-2 ring-red-400 placeholder:text-red-400 animate-pulse'
                                      : (isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-emerald-500')
                                  }`}
                                />
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                                  Total Recv: {state.receive_qty}
                                </span>
                                {isRecvChallanMissing && (
                                  <span className="text-[9px] font-bold text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-950 px-1 py-0.2 rounded border border-red-300">
                                    ❌ Missing Challan No
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })()}

                      {/* ISSUE CELL */}
                      {(() => {
                        const addedIss = typeof state.today_issue_qty === 'number' ? state.today_issue_qty : 0;
                        const isIssChallanMissing = addedIss > 0 && !state.issue_challan?.trim();
                        const isIssueExceeded = Number(state.issue_qty || 0) > Number(state.receive_qty || 0);
                        const hasIssueError = isIssChallanMissing || isIssueExceeded;

                        return (
                          <td className={`py-2 px-2.5 align-top border ${
                            hasIssueError
                              ? 'bg-red-50 dark:bg-red-950/70 border-red-400 dark:border-red-800'
                              : (isDark ? 'bg-blue-950/20 border-slate-800' : 'bg-blue-50/40 border-slate-300')
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
                                    data-row-idx={rIdx}
                                    data-col="today_issue_qty"
                                    value={state.today_issue_qty}
                                    onChange={(e) => handleTodayIssueChange(item.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDownNavigation(e, rIdx, 'today_issue_qty')}
                                    placeholder="0"
                                    className={`w-20 px-2 py-1 font-mono font-bold text-xs rounded border focus:outline-none focus:ring-1 ${
                                      isIssueExceeded
                                        ? 'bg-red-100 border-red-500 text-red-900 focus:ring-red-500 ring-2 ring-red-400 font-black'
                                        : (isDark ? 'bg-slate-950 border-blue-600 text-blue-300 focus:ring-blue-500' : 'bg-white border-blue-400 text-blue-900 focus:ring-blue-500')
                                    }`}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="block text-[9px] font-bold uppercase text-slate-500">Issue Challan</label>
                                  {isIssChallanMissing && (
                                    <span className="text-[9px] font-bold text-red-600 dark:text-red-400">⚠️ Required</span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  data-row-idx={rIdx}
                                  data-col="issue_challan"
                                  value={state.issue_challan}
                                  onChange={(e) => handleFieldChange(item.id, 'issue_challan', e.target.value)}
                                  onKeyDown={(e) => handleKeyDownNavigation(e, rIdx, 'issue_challan')}
                                  placeholder="Challan #"
                                  className={`w-full px-2 py-1 font-mono text-xs rounded border focus:outline-none transition-all ${
                                    isIssChallanMissing
                                      ? 'bg-red-100 dark:bg-red-950/90 border-red-500 text-red-900 dark:text-red-100 font-bold focus:ring-2 focus:ring-red-500 ring-2 ring-red-400 placeholder:text-red-400 animate-pulse'
                                      : (isDark ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500')
                                  }`}
                                />
                              </div>

                              <div className="flex flex-col items-end pt-0.5">
                                <span className={`text-[10px] font-mono font-bold ${
                                  isIssueExceeded ? 'text-red-600 dark:text-red-400 font-black' : 'text-blue-700 dark:text-blue-300'
                                }`}>
                                  Total Issue: {state.issue_qty}
                                </span>
                                {isIssueExceeded && (
                                  <span className="text-[10px] font-bold text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-950/90 px-1.5 py-0.5 rounded border border-red-300 mt-1">
                                    ❌ Exceeds Received Qty ({state.receive_qty})
                                  </span>
                                )}
                                {isIssChallanMissing && (
                                  <span className="text-[9px] font-bold text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-950 px-1 py-0.2 rounded border border-red-300 mt-0.5">
                                    ❌ Missing Challan No
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })()}

                      {/* Balance Qty */}
                      <td className={`py-2 px-2.5 align-top text-right border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
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
                      <td className={`py-2 px-2.5 align-top border ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                        <input
                          type="text"
                          data-row-idx={rIdx}
                          data-col="remarks"
                          value={state.remarks}
                          onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                          onKeyDown={(e) => handleKeyDownNavigation(e, rIdx, 'remarks')}
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
              <tfoot className={`sticky bottom-0 z-30 font-black text-xs uppercase border-t-2 shadow-2xl ${
                isDark ? 'bg-slate-950 text-slate-100 border-indigo-500' : 'bg-slate-900 text-white border-indigo-600'
              }`}>
                <tr>
                  <td colSpan={8} className="py-3 px-3 text-right font-black tracking-wider text-amber-400">
                    Grand Total ({matchingItems.length} Items):
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-amber-300 text-sm">
                    {matchingItems.reduce((acc, item) => acc + (Number(item.booking_qty) || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-emerald-400 text-sm">
                    Total Recv: {matchingItems.reduce((acc, item) => {
                      const st = rowStates[item.id];
                      return acc + (st ? Number(st.receive_qty || 0) : Number(item.receive_qty || 0));
                    }, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-blue-400 text-sm">
                    Total Issue: {matchingItems.reduce((acc, item) => {
                      const st = rowStates[item.id];
                      return acc + (st ? Number(st.issue_qty || 0) : Number(item.issue_qty || 0));
                    }, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-amber-300 text-sm">
                    {matchingItems.reduce((acc, item) => {
                      const st = rowStates[item.id];
                      return acc + (st ? Number(st.balance_qty || 0) : Number(item.balance_qty || 0));
                    }, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
