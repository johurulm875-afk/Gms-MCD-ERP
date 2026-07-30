import React, { useState, useEffect, useMemo } from 'react';
import XLSX from 'xlsx-js-style';
import { supabase } from './supabaseClient';
import { 
  TwillTapeItem, SewingThreadItem, DrawstringItem, PlanningItem, UserProfile, ActiveTab, QuickUpdatePayload, 
  StatusFilter, InventoryStats, TransactionLog, AppTheme 
} from './types';
import { INITIAL_SAMPLE_DATA } from './data/initialData';
import { INITIAL_SEWING_THREAD_DATA } from './data/sewingThreadData';
import { StatsDashboard } from './components/StatsDashboard';
import { QuickStoreRefModal } from './components/QuickStoreRefModal';
import { NewBookingModal } from './components/NewBookingModal';
import { EditBookingModal } from './components/EditBookingModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { InventoryTable } from './components/InventoryTable';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './components/MainDashboard';
import { SewingThreadTable } from './components/SewingThreadTable';
import { DailyDrawstringReceivedUpdate } from './components/DailyDrawstringReceivedUpdate';
import { DrawstringReport } from './components/DrawstringReport';
import { PlanningView } from './components/PlanningView';
import { UserProfileView } from './components/UserProfileView';
import { AdminPanel } from './components/AdminPanel';
import { GmsLogo } from './components/GmsLogo';
import { matchesStatusFilter, getItemStatus } from './utils/statusHelper';
import { generateCompanyMultiSheetExcel, normalizeBuyerName, ExcelColumnDef } from './utils/excelExportHelper';

import { 
  Search, Plus, Zap, Database, RefreshCw, Download, Filter, Package, 
  CheckCircle2, AlertCircle, Clock, Layers, Sparkles, FileSpreadsheet, 
  Moon, Sun, Tag, BadgeCheck, LogOut, Menu, X, User,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

export default function App() {
  // Auth state with 12-hour auto logout logic
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('erp_user');
    const loginTimeStr = localStorage.getItem('erp_login_time');

    if (saved) {
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        if (!isNaN(loginTime) && Date.now() - loginTime >= TWELVE_HOURS_MS) {
          localStorage.removeItem('erp_user');
          localStorage.removeItem('erp_login_time');
          return null;
        }
      }
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.id_card_no === 'SYS-001' || parsed.id_card_no === 'SYS-002') {
          parsed.id_card_no = 'Tst-1024';
        }
        if (parsed.role === 'ADMINISTRATOR' || parsed.username === 'admin@gms.com' || parsed.username === 'johurul') {
          parsed.designation = 'System Administrator & Developer';
          parsed.sector = 'GMS MCD & ACC. Dept.';
          parsed.id_card_no = 'Tst-1024';
        }

        // Restore permanent avatar if saved
        const normUser = (parsed.username || '').toLowerCase();
        const savedAvatar = localStorage.getItem('erp_avatar_' + normUser) ||
                            localStorage.getItem('erp_avatar_admin@gms.com') ||
                            localStorage.getItem('erp_avatar_johurul');
        if (savedAvatar) {
          parsed.avatar_url = savedAvatar;
        }

        return parsed;
      } catch (e) { return null; }
    }
    // No logged in user by default -> Show Login Page first
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('erp_user', JSON.stringify(currentUser));
      if (!localStorage.getItem('erp_login_time')) {
        localStorage.setItem('erp_login_time', Date.now().toString());
      }
    } else {
      localStorage.removeItem('erp_user');
      localStorage.removeItem('erp_login_time');
    }
  }, [currentUser]);

  // Periodic check for 12 hours auto-logout
  useEffect(() => {
    if (!currentUser) return;

    const checkSessionExpiry = () => {
      const loginTimeStr = localStorage.getItem('erp_login_time');
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        if (!isNaN(loginTime) && Date.now() - loginTime >= TWELVE_HOURS_MS) {
          localStorage.removeItem('erp_user');
          localStorage.removeItem('erp_login_time');
          setCurrentUser(null);
          showToast('Session expired after 12 hours. Please log in again.', 'info');
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Active ERP Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Twill Tape State
  const [items, setItems] = useState<TwillTapeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('twill_tape_items', JSON.stringify(items));
    }
  }, [items]);

  // Sewing Thread State
  const [sewingThreadItems, setSewingThreadItems] = useState<SewingThreadItem[]>([]);
  const [isSewingLoading, setIsSewingLoading] = useState<boolean>(false);

  useEffect(() => {
    if (sewingThreadItems.length > 0) {
      localStorage.setItem('sewing_thread_items', JSON.stringify(sewingThreadItems));
    }
  }, [sewingThreadItems]);

  // Drawstring State
  const [drawstringItems, setDrawstringItems] = useState<DrawstringItem[]>([]);

  useEffect(() => {
    if (drawstringItems.length > 0) {
      localStorage.setItem('drawstring_items', JSON.stringify(drawstringItems));
    }
  }, [drawstringItems]);

  const handleUpdateDrawstringItem = async (updatedItem: DrawstringItem) => {
    let nextList: DrawstringItem[] = [];
    setDrawstringItems(prev => {
      const exists = prev.some(i => i.id === updatedItem.id);
      if (exists) {
        nextList = prev.map(i => i.id === updatedItem.id ? updatedItem : i);
      } else {
        nextList = [updatedItem, ...prev];
      }
      localStorage.setItem('drawstring_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Drawstring ${updatedItem.store_ref || updatedItem.id} updated successfully!`, 'success');

    // Attempt Supabase upsert
    try {
      const payload = {
        id: updatedItem.id,
        buyer: updatedItem.buyer_name || updatedItem.buyer || '',
        buyer_name: updatedItem.buyer_name || updatedItem.buyer || '',
        booking_date: updatedItem.date || updatedItem.booking_date || '',
        date: updatedItem.date || updatedItem.booking_date || '',
        ref_no_job_no: updatedItem.style || updatedItem.ref_no_job_no || '',
        style: updatedItem.style || updatedItem.ref_no_job_no || '',
        sr_gt_no: updatedItem.store_ref || updatedItem.sr_gt_no || '',
        store_ref: updatedItem.store_ref || updatedItem.sr_gt_no || '',
        po_no: updatedItem.order_no || updatedItem.po_no || '',
        order_no: updatedItem.order_no || updatedItem.po_no || '',
        item_name: updatedItem.drawstring_type || updatedItem.item_name || '',
        drawstring_type: updatedItem.drawstring_type || updatedItem.item_name || '',
        color: updatedItem.colour || updatedItem.color || '',
        colour: updatedItem.colour || updatedItem.color || '',
        size: updatedItem.size_mm || updatedItem.size || '',
        size_mm: updatedItem.size_mm || updatedItem.size || '',
        booking_qty: Number(updatedItem.booking_qty) || 0,
        rcv_qty: Number(updatedItem.receive_qty ?? updatedItem.rcv_qty) || 0,
        receive_qty: Number(updatedItem.receive_qty ?? updatedItem.rcv_qty) || 0,
        due_qty: Number(updatedItem.balance_qty ?? updatedItem.due_qty) || 0,
        balance_qty: Number(updatedItem.balance_qty ?? updatedItem.due_qty) || 0,
        last_rcvd_qty: Number(updatedItem.last_rcvd_qty) || 0,
        rcvd_date: updatedItem.receive_date || updatedItem.rcvd_date || '',
        receive_date: updatedItem.receive_date || updatedItem.rcvd_date || '',
        receive_challan: updatedItem.receive_challan || '',
        remarks: updatedItem.remarks || '',
        unit: updatedItem.unit || 'PCS'
      };
      const { error } = await supabase.from('drawstring').upsert([payload]);
      if (error) {
        console.warn("Supabase drawstring upsert notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase drawstring sync notice:", err);
    }
  };

  const handleAddDrawstringItem = async (newItemData: Omit<DrawstringItem, 'id'> | Omit<DrawstringItem, 'id'>[]) => {
    const newItemsArray = Array.isArray(newItemData) ? newItemData : [newItemData];
    
    const itemsWithIds: DrawstringItem[] = newItemsArray.map((item, idx) => ({
      ...item,
      id: Date.now() + idx
    }));

    setDrawstringItems(prev => {
      const nextList = [...itemsWithIds, ...prev];
      localStorage.setItem('drawstring_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`${itemsWithIds.length} New Drawstring Booking item(s) created!`, 'success');

    try {
      const payloads = itemsWithIds.map(itemWithId => ({
        id: itemWithId.id,
        buyer: itemWithId.buyer_name || itemWithId.buyer || '',
        buyer_name: itemWithId.buyer_name || itemWithId.buyer || '',
        booking_date: itemWithId.date || itemWithId.booking_date || '',
        date: itemWithId.date || itemWithId.booking_date || '',
        ref_no_job_no: itemWithId.style || itemWithId.ref_no_job_no || '',
        style: itemWithId.style || itemWithId.ref_no_job_no || '',
        sr_gt_no: itemWithId.store_ref || itemWithId.sr_gt_no || '',
        store_ref: itemWithId.store_ref || itemWithId.sr_gt_no || '',
        po_no: itemWithId.order_no || itemWithId.po_no || '',
        order_no: itemWithId.order_no || itemWithId.po_no || '',
        item_name: itemWithId.drawstring_type || itemWithId.item_name || '',
        drawstring_type: itemWithId.drawstring_type || itemWithId.item_name || '',
        color: itemWithId.colour || itemWithId.color || '',
        colour: itemWithId.colour || itemWithId.color || '',
        size: itemWithId.size_mm || itemWithId.size || '',
        size_mm: itemWithId.size_mm || itemWithId.size || '',
        booking_qty: Number(itemWithId.booking_qty) || 0,
        rcv_qty: Number(itemWithId.receive_qty ?? itemWithId.rcv_qty) || 0,
        receive_qty: Number(itemWithId.receive_qty ?? itemWithId.rcv_qty) || 0,
        due_qty: Number(itemWithId.balance_qty ?? itemWithId.due_qty ?? itemWithId.booking_qty) || 0,
        balance_qty: Number(itemWithId.balance_qty ?? itemWithId.due_qty ?? itemWithId.booking_qty) || 0,
        last_rcvd_qty: Number(itemWithId.last_rcvd_qty) || 0,
        rcvd_date: itemWithId.receive_date || itemWithId.rcvd_date || '',
        receive_date: itemWithId.receive_date || itemWithId.rcvd_date || '',
        receive_challan: itemWithId.receive_challan || '',
        remarks: itemWithId.remarks || '',
        unit: itemWithId.unit || 'PCS'
      }));

      const { error } = await supabase.from('drawstring').upsert(payloads);
      if (error) {
        console.warn("Supabase drawstring insert notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase drawstring insert notice:", err);
    }
  };

  const handleDeleteDrawstringItem = async (id: number) => {
    setDrawstringItems(prev => {
      const nextList = prev.filter(i => i.id !== id);
      localStorage.setItem('drawstring_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Drawstring item #${id} deleted`, 'info');

    try {
      const { error } = await supabase.from('drawstring').delete().eq('id', id);
      if (error) {
        console.warn("Supabase drawstring delete notice:", error.message);
      }
    } catch (err) {
      console.warn("Supabase drawstring delete notice:", err);
    }
  };

  // Planning State
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);

  useEffect(() => {
    if (planningItems.length > 0) {
      localStorage.setItem('mcd_planning_items', JSON.stringify(planningItems));
    }
  }, [planningItems]);

  const handleAddPlanningItem = (item: Omit<PlanningItem, 'id'>) => {
    const newItem: PlanningItem = { ...item, id: Date.now() };
    setPlanningItems(prev => [newItem, ...prev]);
    showToast(`Planning entry created for ${item.buyer_name} (${item.style})`, 'success');
  };

  const handleUpdatePlanningItem = (updated: PlanningItem) => {
    setPlanningItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    showToast(`Planning item status updated`, 'success');
  };

  const handleDeletePlanningItem = (id: number) => {
    setPlanningItems(prev => prev.filter(i => i.id !== id));
    showToast(`Planning entry removed`, 'info');
  };

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Desktop sidebar collapse & hide state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('erp_sidebar_collapsed') === 'true';
  });
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('erp_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Theme state: light or dark
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('twill_theme') as AppTheme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('twill_theme', theme);
  }, [theme]);

  // Guard Admin Panel route for non-admin users
  const isAdminUser = currentUser?.role === 'ADMINISTRATOR' || 
    currentUser?.username?.toLowerCase() === 'admin@gms.com' || 
    currentUser?.username?.toLowerCase() === 'johurul';

  useEffect(() => {
    if (activeTab === 'admin' && !isAdminUser) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdminUser]);

  // Search & Filter state for Twill Tape
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedStyle, setSelectedStyle] = useState<string>('ALL');
  const [generalSearch, setGeneralSearch] = useState<string>('');
  const [quickStoreRefSearch, setQuickStoreRefSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Modals state
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  const [quickStoreRefTarget, setQuickStoreRefTarget] = useState<string>('');
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [sewingNewBookingSignal, setSewingNewBookingSignal] = useState<number>(0);
  const [editingItem, setEditingItem] = useState<TwillTapeItem | null>(null);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState<boolean>(false);
  const [historyModalItem, setHistoryModalItem] = useState<TwillTapeItem | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to run promises with a strict timeout so UI never hangs
  function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 2500): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Database operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([
      Promise.resolve(promiseLike).finally(() => clearTimeout(timeoutId)),
      timeoutPromise
    ]);
  }

  // Helper to fetch ALL rows beyond Supabase's default 1000 row limit using range pagination
  const fetchAllRowsFromSupabase = async <T,>(tableName: string): Promise<T[]> => {
    let allRecords: T[] = [];
    let start = 0;
    const chunkSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      let data: any[] | null = null;
      let error: any = null;

      try {
        const res = await withTimeout(
          supabase
            .from(tableName)
            .select('*')
            .order('id', { ascending: false })
            .range(start, start + chunkSize - 1),
          5000
        );
        data = res.data;
        error = res.error;
      } catch (err1) {
        // Fallback: try without ordering by 'id' in case table lacks an 'id' column
        try {
          const res = await withTimeout(
            supabase
              .from(tableName)
              .select('*')
              .range(start, start + chunkSize - 1),
            5000
          );
          data = res.data;
          error = res.error;
        } catch (err2) {
          error = err2;
        }
      }

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        allRecords = allRecords.concat(data as T[]);
        if (data.length < chunkSize) {
          keepFetching = false;
        } else {
          start += chunkSize;
        }
      } else {
        keepFetching = false;
      }
    }

    return allRecords;
  };

  // Fetch Inventory Datasets from Supabase on mount
  useEffect(() => {
    fetchInventory();
    fetchSewingInventory();
    fetchDrawstringInventory();
  }, []);

  const syncUnsyncedTwillTape = async (unsyncedItems: TwillTapeItem[]) => {
    if (!unsyncedItems || unsyncedItems.length === 0) return;
    try {
      const payloads = unsyncedItems.map(item => ({
        id: item.id,
        buyer_name: item.buyer_name || (item as any).buyer || '',
        buyer: item.buyer_name || (item as any).buyer || '',
        date: item.date || '',
        booking_challan: item.booking_challan || '',
        style: item.style || '',
        order_no: item.order_no || '',
        store_ref: item.store_ref || (item as any).twill_ref || '',
        twill_ref: item.store_ref || (item as any).twill_ref || '',
        job_no: item.job_no || '',
        colour: item.colour || (item as any).color || '',
        color: item.colour || (item as any).color || '',
        item_name: item.item_name || 'H.B. TAPE',
        cm: item.cm || '',
        yds: item.yds || 'YDS',
        booking_qty: Number(item.booking_qty) || 0,
        receive_qty: Number(item.receive_qty) || 0,
        rcvd_qty: Number(item.receive_qty) || 0,
        receive_date: item.receive_date || '',
        rcvd_date: item.receive_date || '',
        receive_challan: item.receive_challan || '',
        rcvd_challan: item.receive_challan || '',
        issue_qty: Number(item.issue_qty) || 0,
        iss_qty: Number(item.issue_qty) || 0,
        issue_date: item.issue_date || '',
        iss_date: item.issue_date || '',
        issue_challan: item.issue_challan || '',
        iss_challan: item.issue_challan || '',
        balance_qty: Number(item.balance_qty) || 0,
        remarks: item.remarks || '',
        receive_logs: item.receive_logs || [],
        issue_logs: item.issue_logs || []
      }));

      const { error } = await supabase.from('twill_tape').upsert(payloads);
      if (error) {
        console.warn("Supabase twill_tape auto-sync notice:", error.message);
      } else {
        console.log("Successfully auto-synced local twill tape items to Supabase:", unsyncedItems.length);
      }
    } catch (e) {
      console.warn("Twill tape auto-sync error:", e);
    }
  };

  const syncUnsyncedSewingThread = async (unsyncedItems: SewingThreadItem[]) => {
    if (!unsyncedItems || unsyncedItems.length === 0) return;
    try {
      const payloads = unsyncedItems.map(item => ({
        id: item.id,
        buyer_name: item.buyer_name || item.buyer || '',
        buyer: item.buyer_name || item.buyer || '',
        date: item.date || '',
        booking_challan: item.booking_challan || '',
        style: item.style || '',
        order_no: item.order_no || '',
        store_ref: item.store_ref || item.s_thread_ref || '',
        s_thread_ref: item.store_ref || item.s_thread_ref || '',
        job_no: item.job_no || '',
        colour: item.colour || item.color || '',
        color: item.colour || item.color || '',
        item_name: item.item_name || 'Spun Polyester Thread',
        thread_count: item.thread_count || item.count || '',
        count: item.thread_count || item.count || '',
        shade_no: item.shade_no || item.pantone || '',
        pantone: item.shade_no || item.pantone || '',
        meter: item.meter || '',
        per_body_consm: item.per_body_consm || '',
        supplier: item.supplier || '',
        booking_qty: Number(item.booking_qty) || 0,
        receive_qty: Number(item.receive_qty) || 0,
        rcvd_date: item.receive_date || item.rcvd_date || '',
        receive_date: item.receive_date || item.rcvd_date || '',
        rcvd_challan: item.receive_challan || item.rcvd_challan || '',
        receive_challan: item.receive_challan || item.rcvd_challan || '',
        issue_qty: Number(item.issue_qty) || 0,
        issue_date: item.issue_date || '',
        issue_challan: item.issue_challan || '',
        balance_qty: Number(item.balance_qty) || 0,
        remarks: item.remarks || '',
        receive_logs: item.receive_logs || [],
        issue_logs: item.issue_logs || []
      }));

      const { error } = await supabase.from('sewing_thread').upsert(payloads);
      if (error) {
        console.warn("Supabase sewing_thread auto-sync notice:", error.message);
      } else {
        console.log("Successfully auto-synced local sewing thread items to Supabase:", unsyncedItems.length);
      }
    } catch (e) {
      console.warn("Sewing thread auto-sync error:", e);
    }
  };

  const syncUnsyncedDrawstring = async (unsyncedItems: DrawstringItem[]) => {
    if (!unsyncedItems || unsyncedItems.length === 0) return;
    try {
      const payloads = unsyncedItems.map(item => ({
        id: item.id,
        buyer: item.buyer_name || item.buyer || '',
        buyer_name: item.buyer_name || item.buyer || '',
        booking_date: item.date || item.booking_date || '',
        date: item.date || item.booking_date || '',
        ref_no_job_no: item.style || item.ref_no_job_no || '',
        style: item.style || item.ref_no_job_no || '',
        sr_gt_no: item.store_ref || item.sr_gt_no || '',
        store_ref: item.store_ref || item.sr_gt_no || '',
        po_no: item.order_no || item.po_no || '',
        order_no: item.order_no || item.po_no || '',
        item_name: item.drawstring_type || item.item_name || '',
        drawstring_type: item.drawstring_type || item.item_name || '',
        color: item.colour || item.color || '',
        colour: item.colour || item.color || '',
        size: item.size_mm || item.size || '',
        size_mm: item.size_mm || item.size || '',
        booking_qty: Number(item.booking_qty) || 0,
        rcv_qty: Number(item.receive_qty ?? item.rcv_qty) || 0,
        receive_qty: Number(item.receive_qty ?? item.rcv_qty) || 0,
        due_qty: Number(item.balance_qty ?? item.due_qty) || 0,
        balance_qty: Number(item.balance_qty ?? item.due_qty) || 0,
        last_rcvd_qty: Number(item.last_rcvd_qty) || 0,
        rcvd_date: item.receive_date || item.rcvd_date || '',
        receive_date: item.receive_date || item.rcvd_date || '',
        receive_challan: item.receive_challan || '',
        issue_qty: Number(item.issue_qty) || 0,
        issue_date: item.issue_date || '',
        issue_challan: item.issue_challan || '',
        remarks: item.remarks || '',
        unit: item.unit || 'PCS'
      }));

      const { error } = await supabase.from('drawstring').upsert(payloads);
      if (error) {
        console.warn("Supabase drawstring auto-sync notice:", error.message);
      } else {
        console.log("Successfully auto-synced local drawstring items to Supabase:", unsyncedItems.length);
      }
    } catch (e) {
      console.warn("Drawstring auto-sync error:", e);
    }
  };

  const fetchDrawstringInventory = async () => {
    try {
      const records = await fetchAllRowsFromSupabase<any>('drawstring').catch(() => []);
      let localItems: DrawstringItem[] = [];
      try {
        const saved = localStorage.getItem('drawstring_items');
        if (saved) localItems = JSON.parse(saved);
      } catch (e) {}

      if (records && records.length > 0) {
        const mappedRecords: DrawstringItem[] = records.map((r: any, idx: number) => {
          const bName = r.buyer_name || r.buyer || r['Buyer'] || '';
          const stRef = r.store_ref || r.sr_gt_no || r['SR/GT'] || r['store_ref'] || '';
          const bQty = Number(r.booking_qty ?? 0);
          const rQty = Number(r.receive_qty ?? r.rcv_qty ?? 0);
          const iQty = Number(r.issue_qty ?? 0);
          const balQty = r.balance_qty !== undefined ? Number(r.balance_qty) : (r.due_qty !== undefined ? Number(r.due_qty) : Math.max(0, bQty - rQty));

          const qcRaw = r.qc_not_ok ?? r['qc_not_ok'] ?? r['QC NOT OK'] ?? r['QC Status'] ?? r['qc_status'] ?? r['qc'] ?? r['QC'];
          const isQcNotOk = qcRaw === true || qcRaw === 'true' || qcRaw === 'TRUE' || qcRaw === 'QC NOT OK' || qcRaw === 'NOT OK' || qcRaw === 'Not OK' || qcRaw === 'not ok' || qcRaw === 'YES' || qcRaw === 'yes' || qcRaw === 1 || qcRaw === '1' || String(r.remarks || r.note || r.comments || r['Remarks'] || '').toLowerCase().includes('qc not ok') || String(r.remarks || r.note || r.comments || r['Remarks'] || '').toLowerCase().includes('qc_not_ok');

          return {
            ...r,
            id: Number(r.id || r.sl_no || idx + 1),
            buyer_name: bName,
            buyer: bName,
            date: r.date || r.booking_date || '',
            booking_challan: r.booking_challan || r.ref_no_job_no || '',
            style: r.style || r.ref_no_job_no || '',
            order_no: r.order_no || r.po_no || '',
            store_ref: stRef,
            colour: r.colour || r.color || '',
            drawstring_type: r.drawstring_type || r.item_name || 'Drawstring',
            size_mm: r.size_mm || r.size || '',
            unit: (r.unit || 'YDS') as 'YDS' | 'PCS' | 'MTRS',
            booking_qty: bQty,
            receive_qty: rQty,
            receive_date: r.receive_date || r.rcvd_date || '',
            receive_challan: r.receive_challan || '',
            issue_qty: iQty,
            issue_date: r.issue_date || '',
            issue_challan: r.issue_challan || '',
            balance_qty: balQty,
            remarks: r.remarks || '',
            qc_not_ok: isQcNotOk,
            receive_logs: Array.isArray(r.receive_logs) ? r.receive_logs : [],
            issue_logs: Array.isArray(r.issue_logs) ? r.issue_logs : []
          };
        });

        // Merge local new bookings that might not be in Supabase yet
        const existingKeys = new Set(mappedRecords.map(item => `${(item.buyer_name || '').toLowerCase()}_${(item.style || '').toLowerCase()}_${(item.colour || '').toLowerCase()}_${(item.store_ref || '').toLowerCase()}_${item.booking_qty}`));
        
        const extraLocal = localItems.filter(l => {
          const k = `${(l.buyer_name || '').toLowerCase()}_${(l.style || '').toLowerCase()}_${(l.colour || '').toLowerCase()}_${(l.store_ref || '').toLowerCase()}_${l.booking_qty}`;
          return !existingKeys.has(k);
        });

        const finalMerged = [...extraLocal, ...mappedRecords].map((item, index) => ({
          ...item,
          id: index + 1
        }));

        setDrawstringItems(finalMerged);
        localStorage.setItem('drawstring_items', JSON.stringify(finalMerged));
      } else if (localItems.length > 0) {
        setDrawstringItems(localItems);
      }
    } catch (err) {
      console.warn("Drawstring connection notice:", err);
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    setDbErrorMessage(null);

    try {
      // 1. SUPABASE TABLE NAME: Fetch directly from 'twill_tape'
      // 2. REMOVE LIMIT / FETCH ALL ROWS: Fetch up to 10,000 rows using range(0, 9999)
      let records: any[] = [];
      try {
        const res = await withTimeout(
          supabase
            .from('twill_tape')
            .select('*')
            .range(0, 9999),
          8000
        );
        records = res.data || [];
        if (res.error) {
          console.warn("Notice fetching twill_tape from Supabase:", res.error.message);
        }
      } catch (e) {
        records = await fetchAllRowsFromSupabase<TwillTapeItem>('twill_tape').catch(() => []);
      }

      let localItems: TwillTapeItem[] = [];
      try {
        const saved = localStorage.getItem('twill_tape_items');
        if (saved) localItems = JSON.parse(saved);
      } catch (e) {}

      if (records && records.length > 0) {
        const mappedRecords: TwillTapeItem[] = records.map((r: any, idx: number) => {
          // 3. COLUMN MAPPING directly to twill_tape table fields
          const buyerVal = r.buyer ?? r.buyer_name ?? r['Buyer'] ?? '';
          const styleVal = r.style ?? '';
          const orderNoVal = r.order_no ?? '';
          const jobNoVal = r.job_no ?? '';
          const storeRefVal = r.store_ref ?? r.twill_ref ?? r.s_tape_ref ?? r.tape_ref ?? '';
          const colourVal = r.colour ?? r.color ?? '';
          const itemNameVal = r.item_name ?? 'H.B. TAPE';
          const cmVal = r.cm ?? r.size ?? r.width ?? '';
          const ydsVal = r.yds ?? 'YDS';
          const rcvdDateVal = r.rcvd_date ?? r.receive_date ?? '';
          const rcvdChallanVal = r.rcvd_challan ?? r.receive_challan ?? '';
          const bookingQtyVal = Number(r.booking_qty ?? r.booking_quantity ?? r.qty ?? 0);
          const receiveQtyVal = Number(r.receive_qty ?? r.rcvd_qty ?? 0);
          const issueDateVal = r.issue_date ?? r.iss_date ?? '';
          const issueChallanVal = r.issue_challan ?? r.iss_challan ?? '';
          const issueQtyVal = Number(r.issue_qty ?? r.iss_qty ?? 0);
          const balanceQtyVal = r.balance_qty !== undefined && r.balance_qty !== null
            ? Number(r.balance_qty)
            : (receiveQtyVal > 0 ? Math.max(0, receiveQtyVal - issueQtyVal) : bookingQtyVal);
          const batchNoVal = r.batch_no ?? '';
          const remarksVal = r.remarks ?? '';

          return {
            ...r,
            id: Number(r.id || idx + 1),
            buyer: buyerVal,
            buyer_name: buyerVal,
            date: r.date || rcvdDateVal || '',
            booking_challan: r.booking_challan || '',
            style: styleVal,
            order_no: orderNoVal,
            job_no: jobNoVal,
            store_ref: storeRefVal,
            twill_ref: storeRefVal,
            colour: colourVal,
            color: colourVal,
            item_name: itemNameVal,
            cm: cmVal,
            size: cmVal,
            yds: ydsVal,
            booking_qty: bookingQtyVal,
            receive_qty: receiveQtyVal,
            rcvd_qty: receiveQtyVal,
            receive_date: rcvdDateVal,
            rcvd_date: rcvdDateVal,
            receive_challan: rcvdChallanVal,
            rcvd_challan: rcvdChallanVal,
            issue_qty: issueQtyVal,
            iss_qty: issueQtyVal,
            issue_date: issueDateVal,
            iss_date: issueDateVal,
            issue_challan: issueChallanVal,
            iss_challan: issueChallanVal,
            balance_qty: balanceQtyVal,
            batch_no: batchNoVal,
            remarks: remarksVal,
            receive_logs: Array.isArray(r.receive_logs) ? r.receive_logs : [],
            issue_logs: Array.isArray(r.issue_logs) ? r.issue_logs : []
          };
        });

        // Merge newly added local unsynced bookings if present
        const existingKeys = new Set(mappedRecords.map(item => `${(item.buyer_name || '').toLowerCase()}_${(item.style || '').toLowerCase()}_${(item.colour || '').toLowerCase()}_${(item.store_ref || '').toLowerCase()}_${item.booking_qty}`));
        
        const extraLocal = localItems.filter(l => {
          const k = `${(l.buyer_name || '').toLowerCase()}_${(l.style || '').toLowerCase()}_${(l.colour || '').toLowerCase()}_${(l.store_ref || '').toLowerCase()}_${l.booking_qty}`;
          return !existingKeys.has(k);
        });

        const finalMerged = [...extraLocal, ...mappedRecords].map((item, index) => ({
          ...item,
          id: item.id || index + 1
        }));

        setItems(finalMerged);
        localStorage.setItem('twill_tape_items', JSON.stringify(finalMerged));
        setIsConnected(true);
      } else if (localItems.length > 0) {
        setItems(localItems);
        setIsConnected(true);
      } else {
        setItems([]);
        setIsConnected(true);
      }
    } catch (err: any) {
      console.warn("Supabase connection notice:", err?.message || err);
      setIsConnected(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackData = () => {
    setItems([]);
    localStorage.removeItem('twill_tape_items');
  };

  const fetchSewingInventory = async () => {
    setIsSewingLoading(true);

    try {
      const records1 = await fetchAllRowsFromSupabase<any>('sewing_thread').then(res => res.map(r => ({ ...r, _tableSource: 'st1' }))).catch(() => []);
      const records2 = await fetchAllRowsFromSupabase<any>('supabase_sewing_thread_all_rows').then(res => res.map(r => ({ ...r, _tableSource: 'st2' }))).catch(() => []);

      const combinedRaw = [...records1, ...records2];

      let localItems: SewingThreadItem[] = [];
      try {
        const saved = localStorage.getItem('sewing_thread_items');
        if (saved) localItems = JSON.parse(saved);
      } catch (e) {}

      if (combinedRaw.length > 0) {
        // Tag-based unique map preserving items from both tables
        const uniqueMap = new Map<string, any>();
        combinedRaw.forEach((r, idx) => {
          const key = `${r._tableSource || 'tbl'}_id_${r.id !== undefined && r.id !== null ? r.id : idx}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, r);
          }
        });

        const records = Array.from(uniqueMap.values());
        const mappedRecords: SewingThreadItem[] = records.map((r: any, idx: number) => {
          const bName = r['Buyer'] || r['buyer'] || r.buyer_name || r.buyer || '';
          const jobNoVal = r['Job No'] || r['job_no'] || r['job'] || r.job_no || r.job || '';
          const styleVal = r['Style'] || r['style'] || r.style || r.style_no || '';
          const orderNoVal = r['Order No'] || r['order_no'] || r.order_no || r.po_no || r.po || '';
          const srGtVal = r['SR/GT'] || r['sr_gt'] || r.sr_gt || r.sr_gt_no || r['sr/gt'] || '';
          const sThreadRefVal = r['S.Thread Ref.'] || r['s_thread_ref'] || r.s_thread_ref || r.store_ref || '';
          const storeRefVal = r.store_ref || sThreadRefVal || srGtVal || '';

          let countVal = String(r['Count'] || r['count'] || r.count || r.thread_count || '').trim();
          if (countVal.toLowerCase() === '150/d' || countVal.toLowerCase() === '150d' || countVal.toLowerCase() === '150/d/2') {
            countVal = '';
          }

          let meterVal = String(r['Meter'] || r['meter'] || r.meter || r.length || r.cone_meter || r.con_meter || '').trim();
          if (meterVal.toLowerCase() === '150/d' || meterVal.toLowerCase() === '150d' || meterVal.toLowerCase().includes('150/d')) {
            meterVal = '';
          }
          const perBodyConsmVal = r['Per Body Consm.'] || r['per_body_consm'] || r.per_body_consm || r.consm || r.consumption || '';
          const colourVal = r['COLOUR'] || r['Colour'] || r['colour'] || r.colour || r.color || r.shade_name || '';
          const pantoneVal = r['Pantone'] || r['pantone'] || r.shade_no || r.pantone || r.shade || '';

          const bQty = Number(r['Booking QTY'] ?? r['Booking Qty'] ?? r['booking_qty'] ?? r.booking_qty ?? r.booking_quantity ?? r.qty ?? 0);
          const rQty = Number(r['Receive Qty'] ?? r['receive_qty'] ?? r.receive_qty ?? r.rcvd_qty ?? r.rcv_qty ?? r.rec_qty ?? r.received_qty ?? 0);
          const iQty = Number(r['Issue Qty'] ?? r['issue_qty'] ?? r.issue_qty ?? r.iss_qty ?? r.issued_qty ?? 0);

          const balQty = r['Balance Qty'] !== undefined && r['Balance Qty'] !== null ? Number(r['Balance Qty']) 
            : (r.balance_qty !== undefined && r.balance_qty !== null ? Number(r.balance_qty) 
            : (r.due_qty !== undefined && r.due_qty !== null ? Number(r.due_qty) 
            : (r.bal_qty !== undefined && r.bal_qty !== null ? Number(r.bal_qty) 
            : Math.max(0, bQty - rQty))));

          const rDate = r['RCVD DATE'] || r['rcvd_date'] || r.rcvd_date || r.receive_date || r.rec_date || '';
          const rChallan = r['RCVD CHALLAN'] || r['rcvd_challan'] || r.rcvd_challan || r.receive_challan || r.rec_challan || '';
          const iDate = r['Issue Date'] || r['issue_date'] || r.issue_date || r.iss_date || '';
          const iChallan = r['Issue Challan'] || r['issue_challan'] || r.issue_challan || r.iss_challan || '';
          const supplierVal = r['Supplier'] || r.supplier || r.supplier_name || '';
          const remarksVal = r['Remarks'] || r.remarks || r.note || r.comments || '';

          const qcRaw = r.qc_not_ok ?? r['qc_not_ok'] ?? r['QC NOT OK'] ?? r['QC Status'] ?? r['qc_status'] ?? r['qc'] ?? r['QC'];
          const isQcNotOk = qcRaw === true || qcRaw === 'true' || qcRaw === 'TRUE' || qcRaw === 'QC NOT OK' || qcRaw === 'NOT OK' || qcRaw === 'Not OK' || qcRaw === 'not ok' || qcRaw === 'YES' || qcRaw === 'yes' || qcRaw === 1 || qcRaw === '1' || String(remarksVal).toLowerCase().includes('qc not ok') || String(remarksVal).toLowerCase().includes('qc_not_ok');

          return {
            ...r,
            id: Number(r.id || r.sl_no || idx + 1),
            buyer_name: bName,
            buyer: bName,
            date: r.date || r.booking_date || r.date_created || r.created_at || '',
            booking_challan: r.booking_challan || r.ref_no_job_no || r.ref_no || r.challan || '',
            style: styleVal,
            order_no: orderNoVal,
            sr_gt: srGtVal,
            store_ref: storeRefVal,
            s_thread_ref: sThreadRefVal,
            job_no: jobNoVal,
            colour: colourVal,
            color: colourVal,
            item_name: r.item_name || r.item || 'Spun Polyester Thread',
            thread_count: countVal,
            count: countVal,
            shade_no: pantoneVal,
            pantone: pantoneVal,
            meter: meterVal,
            per_body_consm: perBodyConsmVal,
            supplier: supplierVal,
            booking_qty: bQty,
            receive_qty: rQty,
            rcvd_qty: rQty,
            receive_date: rDate,
            rcvd_date: rDate,
            receive_challan: rChallan,
            rcvd_challan: rChallan,
            issue_qty: iQty,
            iss_qty: iQty,
            issue_date: iDate,
            issue_challan: iChallan,
            balance_qty: balQty,
            remarks: remarksVal,
            qc_not_ok: isQcNotOk,
            receive_logs: Array.isArray(r.receive_logs) ? r.receive_logs : [],
            issue_logs: Array.isArray(r.issue_logs) ? r.issue_logs : []
          };
        });

        // Merge local extra new bookings that might not be in Supabase yet
        const existingKeys = new Set(mappedRecords.map(item => `${(item.buyer_name || '').toLowerCase()}_${(item.style || '').toLowerCase()}_${(item.colour || '').toLowerCase()}_${(item.store_ref || '').toLowerCase()}_${item.booking_qty}`));
        
        const extraLocal = localItems.filter(l => {
          const k = `${(l.buyer_name || '').toLowerCase()}_${(l.style || '').toLowerCase()}_${(l.colour || '').toLowerCase()}_${(l.store_ref || '').toLowerCase()}_${l.booking_qty}`;
          return !existingKeys.has(k);
        });

        const finalMerged = [...extraLocal, ...mappedRecords].map((item, index) => ({
          ...item,
          id: index + 1
        }));

        setSewingThreadItems(finalMerged);
        localStorage.setItem('sewing_thread_items', JSON.stringify(finalMerged));
      } else if (localItems.length > 0) {
        setSewingThreadItems(localItems);
      }
    } catch (err) {
      console.warn("Sewing thread connection notice:", err);
    } finally {
      setIsSewingLoading(false);
    }
  };

  const loadSewingFallbackData = () => {
    setSewingThreadItems([]);
    localStorage.removeItem('sewing_thread_items');
  };

  // Seed Supabase Twill Tape Database
  const handleSeedDatabase = async () => {
    try {
      showToast("Seeding records into Supabase twill_tape table...", "info");

      const { error } = await withTimeout(
        supabase
          .from('twill_tape')
          .insert(INITIAL_SAMPLE_DATA),
        4000
      );

      if (error) throw error;

      showToast("Successfully seeded database with initial records!", "success");
      await fetchInventory();
    } catch (err: any) {
      console.error("Seed error:", err);
      showToast(`Seed notice: ${err?.message || 'Check if table twill_tape exists'}`, "error");
    }
  };

  // Add Twill Tape Booking
  const handleAddBooking = async (newItemData: Omit<TwillTapeItem, 'id'> | Omit<TwillTapeItem, 'id'>[]) => {
    const rawBatch = Array.isArray(newItemData) ? newItemData : [newItemData];
    const batchWithIds: TwillTapeItem[] = rawBatch.map((item, idx) => {
      const bName = item.buyer_name || (item as any).buyer || 'General Buyer';
      const stRef = item.store_ref || (item as any).twill_ref || (item as any).s_tape_ref || '';
      const col = item.colour || (item as any).color || '';
      const rDate = item.receive_date || (item as any).rcvd_date || '';
      const rChallan = item.receive_challan || (item as any).rcvd_challan || '';
      const iDate = item.issue_date || (item as any).iss_date || '';
      const iChallan = item.issue_challan || (item as any).iss_challan || '';

      return {
        ...item,
        id: (item as any).id || (Date.now() + idx),
        buyer_name: bName,
        buyer: bName,
        date: item.date || '',
        booking_challan: item.booking_challan || '',
        style: item.style || '',
        order_no: item.order_no || '',
        store_ref: stRef,
        job_no: item.job_no || '',
        colour: col,
        item_name: item.item_name || 'H.B. TAPE',
        cm: item.cm || '',
        yds: item.yds || 'YDS',
        booking_qty: Number(item.booking_qty) || 0,
        receive_qty: Number(item.receive_qty) || 0,
        receive_date: rDate,
        receive_challan: rChallan,
        issue_qty: Number(item.issue_qty) || 0,
        issue_date: iDate,
        issue_challan: iChallan,
        balance_qty: Number(item.balance_qty) || 0,
        remarks: item.remarks || '',
        receive_logs: item.receive_logs || [],
        issue_logs: item.issue_logs || []
      };
    });

    // 1. Instant local state update
    setItems(prev => {
      const nextList = [...batchWithIds, ...prev];
      localStorage.setItem('twill_tape_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Successfully saved ${batchWithIds.length} new twill tape booking(s)!`, "success");

    // 2. Asynchronous Supabase sync with timeout
    try {
      const dbPayloads = batchWithIds.map(item => ({
        buyer: item.buyer || item.buyer_name || '',
        style: item.style || '',
        order_no: item.order_no || '',
        job_no: item.job_no || '',
        store_ref: item.store_ref || '',
        colour: item.colour || item.color || '',
        item_name: item.item_name || 'H.B. TAPE',
        cm: item.cm || '',
        yds: item.yds || 'YDS',
        rcvd_date: item.receive_date || item.rcvd_date || '',
        rcvd_challan: item.receive_challan || item.rcvd_challan || '',
        booking_qty: Number(item.booking_qty) || 0,
        receive_qty: Number(item.receive_qty) || 0,
        issue_date: item.issue_date || '',
        issue_challan: item.issue_challan || '',
        issue_qty: Number(item.issue_qty) || 0,
        balance_qty: Number(item.balance_qty) || 0,
        batch_no: item.batch_no || '',
        remarks: item.remarks || ''
      }));

      await withTimeout(supabase.from('twill_tape').upsert(dbPayloads), 3500);
    } catch (err) {
      console.warn("Supabase twill_tape insert notice:", err);
    }
  };

  // Add Sewing Thread Booking
  const handleAddSewingBooking = async (newItemData: Omit<SewingThreadItem, 'id'> | Omit<SewingThreadItem, 'id'>[]) => {
    const rawBatch = Array.isArray(newItemData) ? newItemData : [newItemData];
    const batchWithIds: SewingThreadItem[] = rawBatch.map((item, idx) => {
      const bName = item.buyer_name || item.buyer || 'General Buyer';
      const stRef = item.store_ref || item.s_thread_ref || '';
      const col = item.colour || item.color || '';
      const tCount = item.thread_count || item.count || '';
      const sNo = item.shade_no || item.pantone || '';
      const rDate = item.receive_date || item.rcvd_date || '';
      const rChallan = item.receive_challan || item.rcvd_challan || '';

      return {
        ...item,
        id: (item as any).id || (Date.now() + idx),
        buyer_name: bName,
        buyer: bName,
        date: item.date || '',
        booking_challan: item.booking_challan || '',
        style: item.style || '',
        order_no: item.order_no || '',
        store_ref: stRef,
        s_thread_ref: stRef,
        job_no: item.job_no || '',
        colour: col,
        color: col,
        item_name: item.item_name || 'Spun Polyester Thread',
        thread_count: tCount,
        count: tCount,
        shade_no: sNo,
        pantone: sNo,
        meter: item.meter || '',
        per_body_consm: item.per_body_consm || '',
        supplier: item.supplier || '',
        booking_qty: Number(item.booking_qty) || 0,
        receive_qty: Number(item.receive_qty) || 0,
        rcvd_date: rDate,
        receive_date: rDate,
        rcvd_challan: rChallan,
        receive_challan: rChallan,
        issue_qty: Number(item.issue_qty) || 0,
        issue_date: item.issue_date || '',
        issue_challan: item.issue_challan || '',
        balance_qty: Number(item.balance_qty) || 0,
        remarks: item.remarks || '',
        receive_logs: item.receive_logs || [],
        issue_logs: item.issue_logs || []
      };
    });

    // 1. Instant local state update
    setSewingThreadItems(prev => {
      const nextList = [...batchWithIds, ...prev];
      localStorage.setItem('sewing_thread_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Successfully saved ${batchWithIds.length} sewing thread booking(s)!`, "success");

    // 2. Asynchronous Supabase sync with timeout
    try {
      await withTimeout(supabase.from('sewing_thread').upsert(batchWithIds), 3500);
    } catch (err) {
      console.warn("Supabase sewing_thread insert notice:", err);
    }
  };

  // Update Twill Tape Booking
  const handleUpdateBooking = async (updatedItem: TwillTapeItem) => {
    // 1. Instant local update
    setItems(prev => {
      const nextList = prev.map(item => item.id === updatedItem.id ? updatedItem : item);
      localStorage.setItem('twill_tape_items', JSON.stringify(nextList));
      return nextList;
    });
    if (historyModalItem && historyModalItem.id === updatedItem.id) {
      setHistoryModalItem(updatedItem);
    }
    showToast(`Updated item #${updatedItem.id} successfully`, "success");

    // 2. Background Supabase upsert with timeout
    try {
      const bName = updatedItem.buyer_name || (updatedItem as any).buyer || '';
      const stRef = updatedItem.store_ref || (updatedItem as any).twill_ref || '';
      const col = updatedItem.colour || (updatedItem as any).color || '';
      const rDate = updatedItem.receive_date || (updatedItem as any).rcvd_date || '';
      const rChallan = updatedItem.receive_challan || (updatedItem as any).rcvd_challan || '';
      const iDate = updatedItem.issue_date || (updatedItem as any).iss_date || '';
      const iChallan = updatedItem.issue_challan || (updatedItem as any).iss_challan || '';

      const payload = {
        id: updatedItem.id,
        buyer: bName,
        style: updatedItem.style || '',
        order_no: updatedItem.order_no || '',
        job_no: updatedItem.job_no || '',
        store_ref: stRef,
        colour: col,
        item_name: updatedItem.item_name || 'H.B. TAPE',
        cm: updatedItem.cm || '',
        yds: updatedItem.yds || 'YDS',
        rcvd_date: rDate,
        rcvd_challan: rChallan,
        booking_qty: Number(updatedItem.booking_qty) || 0,
        receive_qty: Number(updatedItem.receive_qty) || 0,
        issue_date: iDate,
        issue_challan: iChallan,
        issue_qty: Number(updatedItem.issue_qty) || 0,
        balance_qty: Number(updatedItem.balance_qty) || 0,
        batch_no: updatedItem.batch_no || '',
        remarks: updatedItem.remarks || ''
      };

      await withTimeout(
        supabase.from('twill_tape').upsert([payload]),
        3500
      );
    } catch (err) {
      console.warn("Notice updating twill_tape:", err);
    }
  };

  // Update Sewing Thread Booking
  const handleUpdateSewingBooking = async (updatedItem: SewingThreadItem) => {
    // 1. Instant local update
    setSewingThreadItems(prev => {
      const nextList = prev.map(item => item.id === updatedItem.id ? updatedItem : item);
      localStorage.setItem('sewing_thread_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Updated sewing thread item #${updatedItem.id}`, "success");

    // 2. Background Supabase upsert with timeout
    try {
      const bName = updatedItem.buyer_name || updatedItem.buyer || '';
      const stRef = updatedItem.store_ref || updatedItem.s_thread_ref || '';
      const col = updatedItem.colour || updatedItem.color || '';
      const tCount = updatedItem.thread_count || updatedItem.count || '';
      const sNo = updatedItem.shade_no || updatedItem.pantone || '';
      const rDate = updatedItem.receive_date || updatedItem.rcvd_date || '';
      const rChallan = updatedItem.receive_challan || updatedItem.rcvd_challan || '';
      const iDate = updatedItem.issue_date || '';
      const iChallan = updatedItem.issue_challan || '';

      const payload = {
        id: updatedItem.id,
        buyer_name: bName,
        buyer: bName,
        date: updatedItem.date || '',
        booking_challan: updatedItem.booking_challan || '',
        style: updatedItem.style || '',
        order_no: updatedItem.order_no || '',
        store_ref: stRef,
        s_thread_ref: stRef,
        job_no: updatedItem.job_no || '',
        colour: col,
        color: col,
        item_name: updatedItem.item_name || 'Spun Polyester Thread',
        thread_count: tCount,
        count: tCount,
        shade_no: sNo,
        pantone: sNo,
        meter: updatedItem.meter || '',
        per_body_consm: updatedItem.per_body_consm || '',
        supplier: updatedItem.supplier || '',
        booking_qty: Number(updatedItem.booking_qty) || 0,
        receive_qty: Number(updatedItem.receive_qty) || 0,
        rcvd_date: rDate,
        receive_date: rDate,
        rcvd_challan: rChallan,
        receive_challan: rChallan,
        issue_qty: Number(updatedItem.issue_qty) || 0,
        issue_date: iDate,
        issue_challan: iChallan,
        balance_qty: Number(updatedItem.balance_qty) || 0,
        remarks: updatedItem.remarks || '',
        receive_logs: updatedItem.receive_logs || [],
        issue_logs: updatedItem.issue_logs || []
      };

      await withTimeout(
        supabase.from('sewing_thread').upsert([payload]),
        3500
      );
    } catch (err) {
      console.warn("Error updating sewing thread item notice:", err);
    }
  };

  // Delete Twill Tape Booking
  const handleDeleteBooking = async (id: number) => {
    setItems(prev => {
      const nextList = prev.filter(i => i.id !== id);
      localStorage.setItem('twill_tape_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Deleted booking #${id}`, "info");

    try {
      await withTimeout(supabase.from('twill_tape').delete().eq('id', id), 3000);
    } catch (err) {
      console.warn("Error deleting twill tape item notice:", err);
    }
  };

  // Delete Sewing Thread Booking
  const handleDeleteSewingBooking = async (id: number) => {
    setSewingThreadItems(prev => {
      const nextList = prev.filter(i => i.id !== id);
      localStorage.setItem('sewing_thread_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Deleted sewing thread booking #${id}`, "info");

    try {
      await withTimeout(supabase.from('sewing_thread').delete().eq('id', id), 3000);
    } catch (err) {
      console.warn("Error deleting sewing item notice:", err);
    }
  };

  // Add single transaction log directly from history modal
  const handleAddSingleLog = async (itemId: number, log: TransactionLog) => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    let updatedRecv = target.receive_qty;
    let updatedIss = target.issue_qty;
    let updatedRecvDate = target.receive_date;
    let updatedRecvChallan = target.receive_challan;
    let updatedIssDate = target.issue_date;
    let updatedIssChallan = target.issue_challan;

    const existingRecvLogs = target.receive_logs ? [...target.receive_logs] : [];
    const existingIssLogs = target.issue_logs ? [...target.issue_logs] : [];

    if (log.type === 'RECEIVE') {
      updatedRecv += log.qty;
      updatedRecvDate = log.date;
      updatedRecvChallan = log.challan;
      existingRecvLogs.push(log);
    } else {
      updatedIss += log.qty;
      updatedIssDate = log.date;
      updatedIssChallan = log.challan;
      existingIssLogs.push(log);
    }

    const updatedBal = updatedRecv > 0 ? Math.max(0, updatedRecv - updatedIss) : 0;

    const updatedItem: TwillTapeItem = {
      ...target,
      receive_qty: updatedRecv,
      receive_date: updatedRecvDate,
      receive_challan: updatedRecvChallan,
      issue_qty: updatedIss,
      issue_date: updatedIssDate,
      issue_challan: updatedIssChallan,
      balance_qty: updatedBal,
      receive_logs: existingRecvLogs,
      issue_logs: existingIssLogs
    };

    await handleUpdateBooking(updatedItem);
  };

  // Batch Quick Updates by Store Ref
  const handleSaveQuickUpdates = async (updates: QuickUpdatePayload[]) => {
    // 1. Instant local update
    let nextList: TwillTapeItem[] = [];
    setItems(prev => {
      nextList = prev.map(item => {
        const match = updates.find(u => u.id === item.id);
        if (match) {
          const updatedRecvLogs = [...(item.receive_logs || [])];
          const updatedIssLogs = [...(item.issue_logs || [])];

          if (match.new_receive_log) updatedRecvLogs.push(match.new_receive_log);
          if (match.new_receive_logs) updatedRecvLogs.push(...match.new_receive_logs);
          if (match.new_issue_log) updatedIssLogs.push(match.new_issue_log);
          if (match.new_issue_logs) updatedIssLogs.push(...match.new_issue_logs);

          return {
            ...item,
            receive_qty: match.receive_qty,
            receive_date: match.receive_date,
            receive_challan: match.receive_challan,
            issue_qty: match.issue_qty,
            issue_date: match.issue_date,
            issue_challan: match.issue_challan,
            balance_qty: match.balance_qty,
            remarks: match.remarks !== undefined ? match.remarks : item.remarks,
            receive_logs: updatedRecvLogs,
            issue_logs: updatedIssLogs
          };
        }
        return item;
      });
      localStorage.setItem('twill_tape_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Batch updated ${updates.length} item(s) in real-time!`, "success");

    // 2. Build full payload objects and upsert to Supabase
    const updatedItems = nextList.filter(item => updates.some(u => u.id === item.id));
    const payloads = updatedItems.map(item => ({
      id: item.id,
      buyer_name: item.buyer_name || (item as any).buyer || '',
      buyer: item.buyer_name || (item as any).buyer || '',
      date: item.date || '',
      booking_challan: item.booking_challan || '',
      style: item.style || '',
      order_no: item.order_no || '',
      store_ref: item.store_ref || (item as any).twill_ref || '',
      twill_ref: item.store_ref || (item as any).twill_ref || '',
      job_no: item.job_no || '',
      colour: item.colour || (item as any).color || '',
      color: item.colour || (item as any).color || '',
      item_name: item.item_name || 'H.B. TAPE',
      cm: item.cm || '',
      yds: item.yds || 'YDS',
      booking_qty: Number(item.booking_qty) || 0,
      receive_qty: Number(item.receive_qty) || 0,
      rcvd_qty: Number(item.receive_qty) || 0,
      receive_date: item.receive_date || '',
      rcvd_date: item.receive_date || '',
      receive_challan: item.receive_challan || '',
      rcvd_challan: item.receive_challan || '',
      issue_qty: Number(item.issue_qty) || 0,
      iss_qty: Number(item.issue_qty) || 0,
      issue_date: item.issue_date || '',
      iss_date: item.issue_date || '',
      issue_challan: item.issue_challan || '',
      iss_challan: item.issue_challan || '',
      balance_qty: Number(item.balance_qty) || 0,
      remarks: item.remarks || '',
      receive_logs: item.receive_logs || [],
      issue_logs: item.issue_logs || []
    }));

    try {
      await withTimeout(
        supabase.from('twill_tape').upsert(payloads),
        4000
      );
    } catch (err) {
      console.warn("Notice saving twill tape quick updates:", err);
    }
  };

  // Batch Quick Updates by Store Ref for Sewing Thread
  const handleSaveSewingQuickUpdates = async (updates: QuickUpdatePayload[]) => {
    // 1. Instant local update
    let nextList: SewingThreadItem[] = [];
    setSewingThreadItems(prev => {
      nextList = prev.map(item => {
        const match = updates.find(u => u.id === item.id);
        if (match) {
          const updatedRecvLogs = [...(item.receive_logs || [])];
          const updatedIssLogs = [...(item.issue_logs || [])];

          if (match.new_receive_log) updatedRecvLogs.push(match.new_receive_log);
          if (match.new_receive_logs) updatedRecvLogs.push(...match.new_receive_logs);
          if (match.new_issue_log) updatedIssLogs.push(match.new_issue_log);
          if (match.new_issue_logs) updatedIssLogs.push(...match.new_issue_logs);

          return {
            ...item,
            receive_qty: match.receive_qty,
            receive_date: match.receive_date,
            receive_challan: match.receive_challan,
            issue_qty: match.issue_qty,
            issue_date: match.issue_date,
            issue_challan: match.issue_challan,
            balance_qty: match.balance_qty,
            remarks: match.remarks !== undefined ? match.remarks : item.remarks,
            receive_logs: updatedRecvLogs,
            issue_logs: updatedIssLogs
          };
        }
        return item;
      });
      localStorage.setItem('sewing_thread_items', JSON.stringify(nextList));
      return nextList;
    });
    showToast(`Batch updated ${updates.length} sewing thread item(s)!`, "success");

    // 2. Build full payload objects and upsert to Supabase
    const updatedItems = nextList.filter(item => updates.some(u => u.id === item.id));
    const payloads = updatedItems.map(item => ({
      id: item.id,
      buyer_name: item.buyer_name || item.buyer || '',
      buyer: item.buyer_name || item.buyer || '',
      date: item.date || '',
      booking_challan: item.booking_challan || '',
      style: item.style || '',
      order_no: item.order_no || '',
      store_ref: item.store_ref || item.s_thread_ref || '',
      s_thread_ref: item.store_ref || item.s_thread_ref || '',
      job_no: item.job_no || '',
      colour: item.colour || item.color || '',
      color: item.colour || item.color || '',
      item_name: item.item_name || 'Spun Polyester Thread',
      thread_count: item.thread_count || item.count || '',
      count: item.thread_count || item.count || '',
      shade_no: item.shade_no || item.pantone || '',
      pantone: item.shade_no || item.pantone || '',
      meter: item.meter || '',
      per_body_consm: item.per_body_consm || '',
      supplier: item.supplier || '',
      booking_qty: Number(item.booking_qty) || 0,
      receive_qty: Number(item.receive_qty) || 0,
      rcvd_date: item.receive_date || item.rcvd_date || '',
      receive_date: item.receive_date || item.rcvd_date || '',
      rcvd_challan: item.receive_challan || item.rcvd_challan || '',
      receive_challan: item.receive_challan || item.rcvd_challan || '',
      issue_qty: Number(item.issue_qty) || 0,
      issue_date: item.issue_date || '',
      issue_challan: item.issue_challan || '',
      balance_qty: Number(item.balance_qty) || 0,
      remarks: item.remarks || '',
      receive_logs: item.receive_logs || [],
      issue_logs: item.issue_logs || []
    }));

    try {
      await withTimeout(
        supabase.from('sewing_thread').upsert(payloads),
        4000
      );
    } catch (err) {
      console.warn("Notice saving sewing thread quick updates:", err);
    }
  };

  const triggerQuickStoreRefAction = (ref: string) => {
    setQuickStoreRefTarget(ref);
    setIsQuickActionOpen(true);
  };

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>(['STANLEY STELLA', 'KARIBAN', 'DIADORA']);
    items.forEach(i => {
      const b = i.buyer_name || (i as any).buyer;
      if (b) set.add(normalizeBuyerName(b));
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.style) set.add(i.style); });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedBuyer !== 'ALL') {
        const itemB = normalizeBuyerName(item.buyer_name || (item as any).buyer || '');
        const selB = normalizeBuyerName(selectedBuyer);
        if (itemB !== selB) return false;
      }
      if (selectedStyle !== 'ALL' && item.style !== selectedStyle) return false;
      if (!matchesStatusFilter(item.booking_qty, item.receive_qty, statusFilter)) return false;

      if (generalSearch.trim()) {
        const query = generalSearch.toLowerCase().trim();
        const matches = 
          item.style?.toLowerCase().includes(query) ||
          item.colour?.toLowerCase().includes(query) ||
          item.order_no?.toLowerCase().includes(query) ||
          item.store_ref?.toLowerCase().includes(query) ||
          item.job_no?.toLowerCase().includes(query) ||
          item.item_name?.toLowerCase().includes(query) ||
          item.booking_challan?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [items, selectedBuyer, selectedStyle, statusFilter, generalSearch]);

  const stats: InventoryStats = useMemo(() => {
    let totalBookingQty = 0;
    let totalReceivedQty = 0;
    let totalIssuedQty = 0;
    let totalPendingCount = 0;
    let totalPartialCount = 0;
    let totalFulfilledCount = 0;
    let totalBalanceQty = 0;

    items.forEach(item => {
      const bQty = Number(item.booking_qty) || 0;
      const rQty = Number(item.receive_qty) || 0;
      const iQty = Number(item.issue_qty) || 0;
      const bal = Number(item.balance_qty) || 0;

      totalBookingQty += bQty;
      totalReceivedQty += rQty;
      totalIssuedQty += iQty;
      totalBalanceQty += bal;

      const status = getItemStatus(bQty, rQty);
      if (status === 'PENDING') totalPendingCount++;
      else if (status === 'PARTIAL') totalPartialCount++;
      else totalFulfilledCount++;
    });

    return {
      totalBookings: items.length,
      totalBookingQty,
      totalReceivedQty,
      totalIssuedQty,
      totalPendingCount,
      totalPartialCount,
      totalFulfilledCount,
      totalBalanceQty
    };
  }, [items]);

  const exportToExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      showToast("No records available to export", "error");
      return;
    }

    const columns: ExcelColumnDef[] = [
      { header: 'SL', key: 'sl', width: 6, align: 'center' },
      { header: 'Buyer Name', key: 'buyer_name', width: 18, align: 'left' },
      { header: 'Style', key: 'style', width: 18, align: 'left' },
      { header: 'Order No', key: 'order_no', width: 14, align: 'left' },
      { header: 'Booking Ref.', key: 'store_ref', width: 14, align: 'left' },
      { header: 'Job No', key: 'job_no', width: 12, align: 'left' },
      { header: 'Colour', key: 'colour', width: 14, align: 'left' },
      { header: 'Item Name', key: 'item_name', width: 18, align: 'left' },
      { header: 'CM', key: 'cm', width: 8, align: 'center' },
      { header: 'YDS', key: 'yds', width: 8, align: 'center' },
      { header: 'Booking Qty (Yds)', key: 'booking_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Receive Qty (Yds)', key: 'receive_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Receive Date', key: 'receive_date', width: 13, align: 'center' },
      { header: 'Receive Challan', key: 'receive_challan', width: 16, align: 'left' },
      { header: 'Issue Qty (Yds)', key: 'issue_qty', type: 'number', width: 15, align: 'right' },
      { header: 'Issue Date', key: 'issue_date', width: 13, align: 'center' },
      { header: 'Issue Challan', key: 'issue_challan', width: 15, align: 'left' },
      { header: 'Balance Qty (Yds)', key: 'balance_qty', type: 'number', width: 16, align: 'right' },
      { header: 'Batch No', key: 'batch_no', width: 14, align: 'left' },
      { header: 'Remarks', key: 'remarks', width: 20, align: 'left' }
    ];

    const formattedData = filteredItems.map((item, idx) => ({
      ...item,
      sl: idx + 1,
      booking_qty: Number(item.booking_qty) || 0,
      receive_qty: Number(item.receive_qty) || 0,
      issue_qty: Number(item.issue_qty) || 0,
      balance_qty: Number(item.balance_qty) || 0
    }));

    generateCompanyMultiSheetExcel<any>({
      moduleName: 'Twill Tape',
      fileNamePrefix: 'twill_tape_inventory',
      data: formattedData,
      columns,
      getBuyerName: (item: any) => item.buyer_name || 'General Buyer',
      getBookingQty: (item: any) => Number(item.booking_qty) || 0,
      getReceiveQty: (item: any) => Number(item.receive_qty) || 0,
      isUnreceived: (item: any) => (Number(item.receive_qty) || 0) < (Number(item.booking_qty) || 0) || (Number(item.receive_qty) || 0) === 0
    });

    showToast(`Downloaded Twill Tape Excel with GMS Header, Buyer tabs & yellow highlighted unreceived items!`, "success");
  };

  const exportToCSV = () => {
    const headers = [
      'id', 'buyer_name', 'style', 'order_no', 'store_ref',
      'colour', 'item_name', 'cm', 'yds', 'booking_qty', 'receive_qty', 'receive_date',
      'receive_challan', 'issue_qty', 'issue_date', 'issue_challan', 'balance_qty', 'batch_no', 'remarks'
    ];

    const rows = filteredItems.map(item => [
      item.id,
      `"${(item.buyer_name || '').replace(/"/g, '""')}"`,
      `"${(item.style || '').replace(/"/g, '""')}"`,
      `"${(item.order_no || '').replace(/"/g, '""')}"`,
      `"${item.store_ref || ''}"`,
      `"${item.colour || ''}"`,
      `"${item.item_name || ''}"`,
      `"${item.cm || ''}"`,
      `"${item.yds || ''}"`,
      item.booking_qty,
      item.receive_qty,
      `"${item.receive_date || ''}"`,
      `"${item.receive_challan || ''}"`,
      item.issue_qty,
      `"${item.issue_date || ''}"`,
      `"${item.issue_challan || ''}"`,
      item.balance_qty,
      `"${(item.batch_no || '').replace(/"/g, '""')}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `twill_tape_inventory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredItems.length} records to CSV`, "info");
  };

  // IF NOT LOGGED IN -> SHOW AUTH SCREEN
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={(user) => {
          localStorage.setItem('erp_login_time', Date.now().toString());
          setCurrentUser(user);
        }} 
      />
    );
  }

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen font-sans flex antialiased transition-colors duration-300 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl font-medium text-xs border flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-white border-slate-700'
            : 'bg-emerald-900 text-white border-emerald-700'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      {!isSidebarHidden && (
        <div className="hidden md:block transition-all duration-300">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            userProfile={currentUser}
            onLogout={() => setCurrentUser(null)}
            isConnected={isConnected}
            onOpenDbSetup={() => setIsDbSetupOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            theme={theme}
          />
        </div>
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 md:hidden flex">
          <div className={`w-72 h-full ${isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
            <div className={`p-4 flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <GmsLogo size={20} className="w-5 h-5" />
                <span className="font-black text-xs">GMS MCD ERP SYSTEM</span>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => { setActiveTab(tab); setIsMobileSidebarOpen(false); }}
              userProfile={currentUser}
              onLogout={() => setCurrentUser(null)}
              isConnected={isConnected}
              onOpenDbSetup={() => setIsDbSetupOpen(true)}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* TOP HEADER NAVIGATION BAR */}
        <header className={`sticky top-0 z-20 backdrop-blur-md border-b transition-colors ${
          isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
        }`}>
          <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Left: Mobile Menu Trigger + Desktop Sidebar Toggle + Module Title */}
            <div className="flex items-center gap-2.5">
              
              {/* Desktop Sidebar Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (isSidebarHidden) {
                    setIsSidebarHidden(false);
                    setIsSidebarCollapsed(false);
                  } else {
                    setIsSidebarCollapsed(prev => !prev);
                  }
                }}
                className={`p-2 rounded-xl border hidden md:flex items-center gap-1.5 transition-all text-xs font-semibold shadow-2xs ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                }`}
                title={isSidebarCollapsed || isSidebarHidden ? "Expand Sidebar (সাইডবার খুলুন)" : "Collapse Sidebar (সাইডবার বন্ধ করুন)"}
              >
                {isSidebarCollapsed || isSidebarHidden ? (
                  <PanelLeftOpen className="w-5 h-5 text-indigo-500" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-slate-400" />
                )}
                <span className={`hidden lg:inline text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {isSidebarCollapsed || isSidebarHidden ? "Show Menu" : "Hide Menu"}
                </span>
              </button>

              {/* Mobile Menu Trigger */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`p-2 rounded-xl md:hidden ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                }`}
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                  <GmsLogo size={28} className="w-7 h-7" />
                </div>
                <div>
                  <h1 className={`text-sm sm:text-base font-black tracking-tight flex items-center gap-2 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    <span>GMS MCD ERP SYSTEM</span>
                  </h1>
                  <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    System Developer: <strong className={isLight ? 'text-slate-900 font-extrabold' : 'text-white font-bold'}>Md. Johurul Islam</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Quick Tools & User Controls */}
            <div className="flex items-center gap-2">
              
              {/* Theme Toggle Button (Black & White Theme Toggle) */}
              <button
                type="button"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-2xs ${
                  isLight 
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800' 
                    : 'bg-slate-100 hover:bg-white text-slate-900 border-slate-200'
                }`}
                title="Toggle Full Page Light / Dark Theme"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                )}
              </button>

              {/* Supabase Status Button */}
              <button
                type="button"
                onClick={() => setIsDbSetupOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isConnected ? 'Supabase' : 'Setup DB'}</span>
              </button>

              {/* User Avatar Button */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-0.5 text-slate-300" />
                  )}
                </div>
                <span className="hidden lg:inline">{currentUser?.full_name?.split(' ')[0] || 'Johurul'}</span>
              </button>

            </div>

          </div>
        </header>

        {/* BODY TAB ROUTER CONTENT */}
        <div className="p-3 sm:p-5 lg:p-6 w-full max-w-none flex-1 min-w-0">
          
          {/* TAB 1: MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <MainDashboard
              twillItems={items}
              sewingItems={sewingThreadItems}
              drawstringItems={drawstringItems}
              userProfile={currentUser}
              onNavigateTab={(tab) => setActiveTab(tab)}
              theme={theme}
            />
          )}

          {/* TAB 2: TWILL TAPE STORE */}
          {activeTab === 'twill_tape' && (
            <div className="space-y-6">
              
              {/* Top Control Bar for Twill Tape */}
              <div className={`p-4 rounded-2xl border shadow-lg flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}>
                <div>
                  <h2 className="text-base font-extrabold flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-500" />
                    <span>🎗️ Twill Tape MCD</span>
                  </h2>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    PDF Parsing, MCD Ref. Indexes, Yellow/Blue Status Coding, and Receive/Issue Logs
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchInventory}
                    disabled={isLoading}
                    className={`p-2 rounded-xl border ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title="Refresh Supabase"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
                  </button>

                  <button
                    onClick={exportToExcel}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    onClick={() => setIsNewBookingOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Booking</span>
                  </button>
                </div>
              </div>

              {/* Fast Action Banner */}
              <div className={`p-4 rounded-2xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${
                isLight 
                  ? 'bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border-indigo-200 text-slate-900' 
                  : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-800/80 text-white'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold">Fast MCD Ref. Quick Receive / Issue Action</h3>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Type a <code className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-mono font-bold">store_ref</code> code to open instant batch update modal.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={quickStoreRefSearch}
                    onChange={(e) => setQuickStoreRefSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') triggerQuickStoreRefAction(quickStoreRefSearch);
                    }}
                    placeholder="Type Store Ref..."
                    className={`px-3 py-2 border rounded-xl text-xs font-mono font-bold flex-1 md:w-64 ${
                      isLight ? 'bg-white border-indigo-300 text-slate-900' : 'bg-slate-800 border-indigo-500/40 text-white'
                    }`}
                  />
                  <button
                    onClick={() => triggerQuickStoreRefAction(quickStoreRefSearch)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Quick Update</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <StatsDashboard
                stats={stats}
                activeFilter={statusFilter}
                onSelectFilter={(f) => setStatusFilter(f)}
                theme={theme}
              />

              {/* Filter Controls Bar */}
              <div className={`p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={generalSearch}
                      onChange={(e) => setGeneralSearch(e.target.value)}
                      placeholder="Search Style, Colour, Store Ref..."
                      className={`w-full pl-8 pr-6 py-1.5 border rounded-xl text-xs ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Buyer:</span>
                    <select
                      value={selectedBuyer}
                      onChange={(e) => setSelectedBuyer(e.target.value)}
                      className={`bg-transparent text-xs font-bold focus:outline-none ${isLight ? 'text-indigo-900' : 'text-indigo-200'}`}
                    >
                      <option value="ALL" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>All Buyers</option>
                      {uniqueBuyers.map(b => (
                        <option key={b} value={b} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
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
                      {uniqueStyles.map(st => (
                        <option key={st} value={st} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${statusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${statusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950' : 'text-amber-500'}`}
                  >
                    Pending ({stats.totalPendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PARTIAL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${statusFilter === 'PARTIAL' ? 'bg-blue-600 text-white' : 'text-blue-500'}`}
                  >
                    Partial ({stats.totalPartialCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('FULFILLED')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${statusFilter === 'FULFILLED' ? 'bg-emerald-600 text-white' : 'text-emerald-500'}`}
                  >
                    Fulfilled ({stats.totalFulfilledCount})
                  </button>
                </div>
              </div>

              {/* Main Twill Tape Table */}
              <InventoryTable
                items={filteredItems}
                isLoading={isLoading}
                onEditItem={(item) => setEditingItem(item)}
                onDeleteItem={handleDeleteBooking}
                onQuickStoreRefAction={(storeRef) => triggerQuickStoreRefAction(storeRef)}
                onViewHistory={(item) => setHistoryModalItem(item)}
                onExportExcel={exportToExcel}
                theme={theme}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* TAB 3: SEWING THREAD STORE */}
          {activeTab === 'sewing_thread' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}>
                <div>
                  <h2 className="text-base font-extrabold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <span>🧵 Sewing Thread MCD</span>
                  </h2>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Thread Count, Shade No, Spun Polyester Cones, Booking/Receive/Issue Management
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSewingInventory}
                    disabled={isSewingLoading}
                    className={`p-2 rounded-xl border ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title="Refresh Sewing Thread Dataset"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSewingLoading ? 'animate-spin text-emerald-500' : ''}`} />
                  </button>

                  <button
                    onClick={() => setSewingNewBookingSignal(prev => prev + 1)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Sewing Thread Booking</span>
                  </button>
                </div>
              </div>

              <SewingThreadTable
                items={sewingThreadItems}
                isLoading={isSewingLoading}
                onAddBooking={handleAddSewingBooking}
                onUpdateBooking={handleUpdateSewingBooking}
                onDeleteBooking={handleDeleteSewingBooking}
                onSaveQuickUpdates={handleSaveSewingQuickUpdates}
                onRefresh={fetchSewingInventory}
                showToast={showToast}
                theme={theme}
                currentUser={currentUser}
                openNewBookingSignal={sewingNewBookingSignal}
              />
            </div>
          )}

          {/* TAB 4: DAILY DRAWSTRING RECEIVED UPDATE */}
          {activeTab === 'drawstring_received' && (
            <DailyDrawstringReceivedUpdate
              items={drawstringItems}
              onUpdateItem={handleUpdateDrawstringItem}
              onAddItem={handleAddDrawstringItem}
              onDeleteItem={handleDeleteDrawstringItem}
              theme={theme}
              currentUser={currentUser}
            />
          )}

          {/* TAB 5: PLANNING */}
          {activeTab === 'planning' && (
            <PlanningView
              planningItems={planningItems}
              onAddPlanningItem={handleAddPlanningItem}
              onUpdatePlanningItem={handleUpdatePlanningItem}
              onDeletePlanningItem={handleDeletePlanningItem}
              sewingThreadItems={sewingThreadItems}
              theme={theme}
            />
          )}

          {/* TAB 6: REPORT */}
          {(activeTab === 'report' || activeTab === 'drawstring_report') && (
            <DrawstringReport
              items={drawstringItems}
              sewingItems={sewingThreadItems}
              twillItems={items}
              theme={theme}
              currentUser={currentUser}
              onUpdateItem={handleUpdateDrawstringItem}
              onUpdateSewingItem={handleUpdateSewingBooking}
              onUpdateTwillItem={handleUpdateBooking}
              onDeleteItem={handleDeleteDrawstringItem}
            />
          )}

          {/* TAB 6: ADMIN PANEL */}
          {activeTab === 'admin' && (
            <AdminPanel
              currentUser={currentUser}
              theme={theme}
              showToast={showToast}
            />
          )}

          {/* TAB 5: USER PROFILE */}
          {activeTab === 'profile' && (
            <UserProfileView
              userProfile={currentUser}
              onUpdateProfile={(updated) => setCurrentUser(updated)}
              onLogout={() => setCurrentUser(null)}
              theme={theme}
            />
          )}

        </div>

        {/* SYSTEM DEVELOPER FOOTER */}
        <footer className={`border-t py-4 px-6 text-center text-xs mt-auto transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <div className="w-full px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GmsLogo size={18} className="w-4 h-4" />
              <span className="font-bold">GMS MCD ERP SYSTEM • Supabase Integrated</span>
            </div>
            <div className={`font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
              System Developer: <span className="text-indigo-600 font-black">Md. Johurul Islam</span>
            </div>
          </div>
        </footer>

      </div>

      {/* MODALS */}
      <QuickStoreRefModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        initialStoreRef={quickStoreRefTarget}
        allItems={items}
        onSaveQuickUpdates={handleSaveQuickUpdates}
        existingBuyers={uniqueBuyers}
        theme={theme}
      />

      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onAddBooking={handleAddBooking}
        existingBuyers={uniqueBuyers}
      />

      <EditBookingModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onUpdateBooking={handleUpdateBooking}
        onDeleteBooking={handleDeleteBooking}
      />

      <TransactionHistoryModal
        isOpen={!!historyModalItem}
        onClose={() => setHistoryModalItem(null)}
        item={historyModalItem}
        onAddLog={handleAddSingleLog}
      />

      <DatabaseSetupModal
        isOpen={isDbSetupOpen}
        onClose={() => setIsDbSetupOpen(false)}
        onSeedDatabase={handleSeedDatabase}
        itemCount={items.length}
        isConnected={isConnected}
        errorMessage={dbErrorMessage}
      />

    </div>
  );
}
