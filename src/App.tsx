import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
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

import { 
  Search, Plus, Zap, Database, RefreshCw, Download, Filter, Package, 
  CheckCircle2, AlertCircle, Clock, Layers, Sparkles, FileSpreadsheet, 
  Moon, Sun, Tag, BadgeCheck, LogOut, Menu, X, User,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('erp_user');
    if (saved) {
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
        return parsed;
      } catch (e) { return null; }
    }
    // No logged in user by default -> Show Login Page first
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('erp_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('erp_user');
    }
  }, [currentUser]);

  // Active ERP Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Twill Tape State
  const [items, setItems] = useState<TwillTapeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  // Sewing Thread State
  const [sewingThreadItems, setSewingThreadItems] = useState<SewingThreadItem[]>([]);
  const [isSewingLoading, setIsSewingLoading] = useState<boolean>(false);

  // Drawstring State
  const [drawstringItems, setDrawstringItems] = useState<DrawstringItem[]>(() => {
    const saved = localStorage.getItem('drawstring_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 101,
        buyer_name: 'H&M',
        date: '2026-07-20',
        booking_challan: 'BK-DS-01',
        style: 'HOODIE-88',
        order_no: 'PO-991',
        store_ref: 'DS-201',
        colour: 'Black',
        drawstring_type: 'Round Drawstring',
        size_mm: '6mm',
        unit: 'YDS',
        booking_qty: 2500,
        receive_qty: 1500,
        receive_date: '2026-07-22',
        receive_challan: 'CH-9012',
        issue_qty: 1000,
        issue_date: '2026-07-22',
        issue_challan: 'IS-401',
        balance_qty: 1000,
        remarks: '1st lot received',
        receive_logs: [
          { id: 'l1', type: 'RECEIVE', date: '2026-07-22', challan: 'CH-9012', qty: 1500, remarks: '1st lot received' }
        ]
      },
      {
        id: 102,
        buyer_name: 'ZARA',
        date: '2026-07-21',
        booking_challan: 'BK-DS-02',
        style: 'JOGGER-404',
        order_no: 'PO-992',
        store_ref: 'DS-202',
        colour: 'Navy',
        drawstring_type: 'Flat Drawstring',
        size_mm: '10mm',
        unit: 'YDS',
        booking_qty: 1800,
        receive_qty: 1800,
        receive_date: '2026-07-23',
        receive_challan: 'CH-9045',
        issue_qty: 500,
        issue_date: '2026-07-23',
        issue_challan: 'IS-402',
        balance_qty: 0,
        remarks: 'Completed',
        receive_logs: [
          { id: 'l2', type: 'RECEIVE', date: '2026-07-23', challan: 'CH-9045', qty: 1800, remarks: 'Full delivery' }
        ]
      },
      {
        id: 103,
        buyer_name: 'PULL & BEAR',
        date: '2026-07-22',
        booking_challan: 'BK-DS-03',
        style: 'JACKET-12',
        order_no: 'PO-993',
        store_ref: 'DS-203',
        colour: 'White',
        drawstring_type: 'Braided Drawstring',
        size_mm: '8mm',
        unit: 'YDS',
        booking_qty: 3000,
        receive_qty: 0,
        receive_date: '',
        receive_challan: '',
        issue_qty: 0,
        issue_date: '',
        issue_challan: '',
        balance_qty: 3000,
        remarks: 'Pending receive',
        receive_logs: []
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('drawstring_items', JSON.stringify(drawstringItems));
  }, [drawstringItems]);

  const handleUpdateDrawstringItem = (updatedItem: DrawstringItem) => {
    setDrawstringItems(prev => {
      const exists = prev.some(i => i.id === updatedItem.id);
      if (exists) {
        return prev.map(i => i.id === updatedItem.id ? updatedItem : i);
      }
      return [updatedItem, ...prev];
    });
    showToast(`Drawstring ${updatedItem.store_ref} updated successfully!`, 'success');
  };

  const handleAddDrawstringItem = (newItem: Omit<DrawstringItem, 'id'>) => {
    const itemWithId: DrawstringItem = {
      ...newItem,
      id: Date.now()
    };
    setDrawstringItems(prev => [itemWithId, ...prev]);
    showToast(`New Drawstring Booking ${itemWithId.store_ref} created!`, 'success');
  };

  // Planning State
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>(() => {
    const saved = localStorage.getItem('mcd_planning_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 1,
        mcd_ref: 'PLN-101',
        buyer_name: 'H&M',
        style: 'HOODIE-88',
        order_no: 'PO-991',
        item_type: 'Drawstring',
        required_qty: 2500,
        unit: 'YDS',
        target_date: '2026-07-28',
        priority: 'HIGH',
        status: 'IN_BOOKING',
        planner_name: 'Store Manager',
        remarks: 'Sample approved, order placed'
      },
      {
        id: 2,
        mcd_ref: 'PLN-102',
        buyer_name: 'ZARA',
        style: 'JOGGER-404',
        order_no: 'PO-992',
        item_type: 'Twill Tape',
        required_qty: 5000,
        unit: 'YDS',
        target_date: '2026-07-30',
        priority: 'MEDIUM',
        status: 'PLANNED',
        planner_name: 'MCD Planner',
        remarks: 'Booking pending approval'
      },
      {
        id: 3,
        mcd_ref: 'PLN-103',
        buyer_name: 'PULL & BEAR',
        style: 'JACKET-12',
        order_no: 'PO-993',
        item_type: 'Sewing Thread',
        required_qty: 1200,
        unit: 'CONES',
        target_date: '2026-08-05',
        priority: 'LOW',
        status: 'PLANNED',
        planner_name: 'MCD Planner',
        remarks: 'Shade match in progress'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('mcd_planning_items', JSON.stringify(planningItems));
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

  // Helper to fetch ALL rows beyond Supabase's default 1000 row limit using range pagination
  const fetchAllRowsFromSupabase = async <T,>(tableName: string): Promise<T[]> => {
    let allRecords: T[] = [];
    let start = 0;
    const chunkSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: false })
        .range(start, start + chunkSize - 1);

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
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    setDbErrorMessage(null);

    try {
      const records = await fetchAllRowsFromSupabase<TwillTapeItem>('twill_tape');
      if (records && records.length > 0) {
        setItems(records);
        setIsConnected(true);
      } else {
        setIsConnected(true);
        loadFallbackData();
      }
    } catch (err: any) {
      console.error("Supabase connection error:", err);
      setDbErrorMessage(err?.message || "Could not connect to Supabase table");
      setIsConnected(false);
      loadFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackData = () => {
    const memoryItems: TwillTapeItem[] = INITIAL_SAMPLE_DATA.map((item, idx) => ({
      ...item,
      id: idx + 101
    }));
    setItems(memoryItems);
  };

  const fetchSewingInventory = async () => {
    setIsSewingLoading(true);
    try {
      const records = await fetchAllRowsFromSupabase<SewingThreadItem>('sewing_thread');
      if (records && records.length > 0) {
        // Map Supabase field names if needed (e.g. buyer -> buyer_name, s_thread_ref -> store_ref)
        const mappedRecords = records.map(r => ({
          ...r,
          buyer_name: r.buyer_name || r.buyer || 'GMS Buyer',
          store_ref: r.store_ref || r.s_thread_ref || `TH-${r.id}`,
          thread_count: r.thread_count || r.count || '',
          receive_date: r.receive_date || r.rcvd_date || '',
          receive_challan: r.receive_challan || r.rcvd_challan || ''
        }));
        setSewingThreadItems(mappedRecords);
      } else {
        loadSewingFallbackData();
      }
    } catch (err) {
      console.error("Sewing thread connection error:", err);
      loadSewingFallbackData();
    } finally {
      setIsSewingLoading(false);
    }
  };

  const loadSewingFallbackData = () => {
    const memorySewingItems: SewingThreadItem[] = INITIAL_SEWING_THREAD_DATA.map((item, idx) => ({
      ...item,
      id: idx + 201
    }));
    setSewingThreadItems(memorySewingItems);
  };

  // Seed Supabase Twill Tape Database
  const handleSeedDatabase = async () => {
    try {
      showToast("Seeding records into Supabase twill_tape table...", "info");

      const { error } = await supabase
        .from('twill_tape')
        .insert(INITIAL_SAMPLE_DATA);

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
    const batch = Array.isArray(newItemData) ? newItemData : [newItemData];
    try {
      const { data, error } = await supabase
        .from('twill_tape')
        .insert(batch)
        .select();

      if (error) {
        const newLocalItems: TwillTapeItem[] = batch.map((item, idx) => ({
          ...item,
          id: Date.now() + idx
        }));
        setItems(prev => [...newLocalItems, ...prev]);
        showToast(`Added ${batch.length} new booking(s) locally`, "info");
      } else if (data && data.length > 0) {
        setItems(prev => [...(data as TwillTapeItem[]), ...prev]);
        showToast(`Successfully added ${data.length} new booking(s)!`, "success");
      } else {
        fetchInventory();
      }
    } catch (err) {
      console.error("Failed to add booking:", err);
      showToast("Error inserting row", "error");
    }
  };

  // Add Sewing Thread Booking
  const handleAddSewingBooking = async (newItemData: Omit<SewingThreadItem, 'id'> | Omit<SewingThreadItem, 'id'>[]) => {
    const rawBatch = Array.isArray(newItemData) ? newItemData : [newItemData];
    const batch = rawBatch.map(item => {
      const bName = item.buyer_name || item.buyer || 'General Buyer';
      const stRef = item.store_ref || item.s_thread_ref || '';
      const col = item.colour || item.color || '';
      const tCount = item.thread_count || item.count || '';
      const sNo = item.shade_no || item.pantone || '';
      const rDate = item.receive_date || item.rcvd_date || '';
      const rChallan = item.receive_challan || item.rcvd_challan || '';

      return {
        ...item,
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
        remarks: item.remarks || ''
      };
    });

    try {
      const { data, error } = await supabase
        .from('sewing_thread')
        .insert(batch)
        .select();

      if (error) {
        const newLocalItems: SewingThreadItem[] = batch.map((item, idx) => ({
          ...item,
          id: Date.now() + idx
        }));
        setSewingThreadItems(prev => [...newLocalItems, ...prev]);
        showToast(`Added ${batch.length} sewing thread booking(s) locally`, "info");
      } else if (data && data.length > 0) {
        setSewingThreadItems(prev => [...(data as SewingThreadItem[]), ...prev]);
        showToast(`Successfully added ${data.length} sewing thread booking(s)!`, "success");
      } else {
        fetchSewingInventory();
      }
    } catch (err) {
      console.error("Failed to add sewing thread booking:", err);
      showToast("Error inserting sewing thread row", "error");
    }
  };

  // Update Twill Tape Booking
  const handleUpdateBooking = async (updatedItem: TwillTapeItem) => {
    try {
      const { error } = await supabase
        .from('twill_tape')
        .update({
          buyer_name: updatedItem.buyer_name,
          date: updatedItem.date,
          booking_challan: updatedItem.booking_challan,
          style: updatedItem.style,
          order_no: updatedItem.order_no,
          store_ref: updatedItem.store_ref,
          job_no: updatedItem.job_no || '',
          colour: updatedItem.colour,
          item_name: updatedItem.item_name,
          cm: updatedItem.cm,
          yds: updatedItem.yds,
          booking_qty: updatedItem.booking_qty,
          receive_qty: updatedItem.receive_qty,
          receive_date: updatedItem.receive_date,
          receive_challan: updatedItem.receive_challan,
          issue_qty: updatedItem.issue_qty,
          issue_date: updatedItem.issue_date,
          issue_challan: updatedItem.issue_challan,
          balance_qty: updatedItem.balance_qty,
          remarks: updatedItem.remarks
        })
        .eq('id', updatedItem.id);

      setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      if (historyModalItem && historyModalItem.id === updatedItem.id) {
        setHistoryModalItem(updatedItem);
      }
      showToast(`Updated item #${updatedItem.id} successfully`, "success");
    } catch (err) {
      console.error("Error updating item:", err);
      showToast("Error updating booking", "error");
    }
  };

  // Update Sewing Thread Booking
  const handleUpdateSewingBooking = async (updatedItem: SewingThreadItem) => {
    try {
      const bName = updatedItem.buyer_name || updatedItem.buyer || '';
      const stRef = updatedItem.store_ref || updatedItem.s_thread_ref || '';
      const col = updatedItem.colour || updatedItem.color || '';
      const tCount = updatedItem.thread_count || updatedItem.count || '';
      const sNo = updatedItem.shade_no || updatedItem.pantone || '';
      const rDate = updatedItem.receive_date || updatedItem.rcvd_date || '';
      const rChallan = updatedItem.receive_challan || updatedItem.rcvd_challan || '';

      const { error } = await supabase
        .from('sewing_thread')
        .update({
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
          issue_date: updatedItem.issue_date || '',
          issue_challan: updatedItem.issue_challan || '',
          balance_qty: Number(updatedItem.balance_qty) || 0,
          remarks: updatedItem.remarks || ''
        })
        .eq('id', updatedItem.id);

      setSewingThreadItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      showToast(`Updated sewing thread item #${updatedItem.id}`, "success");
    } catch (err) {
      console.error("Error updating sewing thread item:", err);
      showToast("Error updating sewing thread booking", "error");
    }
  };

  // Delete Twill Tape Booking
  const handleDeleteBooking = async (id: number) => {
    try {
      await supabase.from('twill_tape').delete().eq('id', id);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast(`Deleted booking #${id}`, "info");
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  // Delete Sewing Thread Booking
  const handleDeleteSewingBooking = async (id: number) => {
    try {
      await supabase.from('sewing_thread').delete().eq('id', id);
      setSewingThreadItems(prev => prev.filter(i => i.id !== id));
      showToast(`Deleted sewing thread booking #${id}`, "info");
    } catch (err) {
      console.error("Error deleting sewing item:", err);
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
    try {
      for (const update of updates) {
        await supabase
          .from('twill_tape')
          .update({
            receive_qty: update.receive_qty,
            receive_date: update.receive_date,
            receive_challan: update.receive_challan,
            issue_qty: update.issue_qty,
            issue_date: update.issue_date,
            issue_challan: update.issue_challan,
            balance_qty: update.balance_qty,
            remarks: update.remarks
          })
          .eq('id', update.id);
      }

      setItems(prev => prev.map(item => {
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
      }));

      showToast(`Batch updated ${updates.length} item(s) in real-time!`, "success");
    } catch (err) {
      console.error("Error saving quick updates:", err);
      showToast("Failed to apply batch updates", "error");
    }
  };

  // Batch Quick Updates by Store Ref for Sewing Thread
  const handleSaveSewingQuickUpdates = async (updates: QuickUpdatePayload[]) => {
    try {
      for (const update of updates) {
        await supabase
          .from('sewing_thread')
          .update({
            receive_qty: update.receive_qty,
            receive_date: update.receive_date,
            rcvd_date: update.receive_date,
            receive_challan: update.receive_challan,
            rcvd_challan: update.receive_challan,
            issue_qty: update.issue_qty,
            issue_date: update.issue_date,
            issue_challan: update.issue_challan,
            balance_qty: update.balance_qty,
            remarks: update.remarks
          })
          .eq('id', update.id);
      }

      setSewingThreadItems(prev => prev.map(item => {
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
      }));

      showToast(`Batch updated ${updates.length} sewing thread item(s)!`, "success");
    } catch (err) {
      console.error("Error saving sewing quick updates:", err);
      showToast("Failed to apply sewing thread batch updates", "error");
    }
  };

  const triggerQuickStoreRefAction = (ref: string) => {
    setQuickStoreRefTarget(ref);
    setIsQuickActionOpen(true);
  };

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>(['Stanley Stella', 'KARIBAN', 'DIADORA']);
    items.forEach(i => { if (i.buyer_name) set.add(i.buyer_name); });
    return Array.from(set).sort();
  }, [items]);

  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.style) set.add(i.style); });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedBuyer !== 'ALL' && item.buyer_name !== selectedBuyer) return false;
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

    const exportData = filteredItems.map((item, index) => ({
      'SL': index + 1,
      'Buyer Name': item.buyer_name || '',
      'Booking Date': item.date || '',
      'Booking Challan': item.booking_challan || '',
      'Style': item.style || '',
      'Order No': item.order_no || '',
      'Store Ref.': item.store_ref || '',
      'Job No': item.job_no || '',
      'Colour': item.colour || '',
      'Item Name': item.item_name || '',
      'CM': item.cm || '',
      'YDS': item.yds || '',
      'Booking Qty (Pcs)': Number(item.booking_qty) || 0,
      'Receive Qty (Pcs)': Number(item.receive_qty) || 0,
      'Receive Date': item.receive_date || '',
      'Receive Challan': item.receive_challan || '',
      'Issue Qty (Pcs)': Number(item.issue_qty) || 0,
      'Issue Date': item.issue_date || '',
      'Issue Challan': item.issue_challan || '',
      'Balance Qty (Pcs)': Number(item.balance_qty) || 0,
      'Remarks': item.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Twill Tape Inventory');
    XLSX.writeFile(workbook, `twill_tape_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(`Downloaded Excel sheet with ${filteredItems.length} record(s)!`, "success");
  };

  const exportToCSV = () => {
    const headers = [
      'id', 'buyer_name', 'date', 'booking_challan', 'style', 'order_no', 'store_ref',
      'colour', 'item_name', 'cm', 'yds', 'booking_qty', 'receive_qty', 'receive_date',
      'receive_challan', 'issue_qty', 'issue_date', 'issue_challan', 'balance_qty', 'remarks'
    ];

    const rows = filteredItems.map(item => [
      item.id,
      `"${(item.buyer_name || '').replace(/"/g, '""')}"`,
      `"${item.date || ''}"`,
      `"${item.booking_challan || ''}"`,
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
    return <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          
          {/* TAB 1: MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <MainDashboard
              twillItems={items}
              sewingItems={sewingThreadItems}
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
                onQuickStoreRefAction={(storeRef) => triggerQuickStoreRefAction(storeRef)}
                onViewHistory={(item) => setHistoryModalItem(item)}
                onExportExcel={exportToExcel}
                theme={theme}
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
              theme={theme}
            />
          )}

          {/* TAB 5: PLANNING */}
          {activeTab === 'planning' && (
            <PlanningView
              planningItems={planningItems}
              onAddPlanningItem={handleAddPlanningItem}
              onUpdatePlanningItem={handleUpdatePlanningItem}
              onDeletePlanningItem={handleDeletePlanningItem}
              theme={theme}
            />
          )}

          {/* TAB 6: REPORT */}
          {(activeTab === 'report' || activeTab === 'drawstring_report') && (
            <DrawstringReport
              items={drawstringItems}
              theme={theme}
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
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
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
