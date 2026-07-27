import React, { useState, useMemo, useEffect } from 'react';
import { DrawstringItem, SewingThreadItem, AppTheme, UserProfile } from '../types';
import XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';
import { 
  AlertTriangle, CheckCircle2, Download, Printer, Search, Filter, 
  FileSpreadsheet, ShieldAlert, Sparkles, Layers, Package, RefreshCw, X,
  Clock, FileText, ArrowUpRight, TrendingUp, UserCheck, Check
} from 'lucide-react';

interface DrawstringReportProps {
  items?: DrawstringItem[];
  sewingItems?: SewingThreadItem[];
  theme?: AppTheme;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
  onUpdateItem?: (updatedItem: DrawstringItem) => void;
  onUpdateSewingItem?: (updatedItem: SewingThreadItem) => void;
  onDeleteItem?: (id: number) => void;
}

export const DrawstringReport: React.FC<DrawstringReportProps> = ({
  items = [],
  sewingItems = [],
  theme = 'light',
  onUpdateItem,
  onUpdateSewingItem
}) => {
  const isLight = theme === 'light';

  // Active Report Tab: 'sewing_due' | 'qc_not_ok' | 'sewing' | 'drawstring'
  const [activeTab, setActiveTab] = useState<'sewing_due' | 'qc_not_ok' | 'sewing' | 'drawstring'>('sewing_due');
  
  // Filter within QC Not OK: 'ALL' | 'SEWING' | 'DRAWSTRING'
  const [qcCategory, setQcCategory] = useState<'ALL' | 'SEWING' | 'DRAWSTRING'>('ALL');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');

  // Supabase direct fetched due items state for real-time backup
  const [supabaseDueItems, setSupabaseDueItems] = useState<SewingThreadItem[]>([]);
  const [isFetchingSupabase, setIsFetchingSupabase] = useState(false);

  // Function to fetch directly from Supabase table / view
  const fetchSupabaseDueData = async () => {
    setIsFetchingSupabase(true);
    try {
      // Query supabase sewing_thread table or view where booking_qty > receive_qty
      const { data, error } = await supabase
        .from('sewing_thread')
        .select('*');

      if (!error && data && data.length > 0) {
        // Filter rows where booking_qty > receive_qty
        const dueRows = data.filter((r: any) => {
          const b = Number(r.booking_qty) || 0;
          const rec = Number(r.receive_qty) || 0;
          return b > rec;
        });
        setSupabaseDueItems(dueRows);
      }
    } catch (e) {
      console.warn("Notice: Could not fetch due items directly from Supabase, using live state:", e);
    } finally {
      setIsFetchingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSupabaseDueData();
  }, []);

  // 1. SEWING THREAD DUE / PENDING ITEMS (Main source synced real-time with sewingItems)
  const sewingDueItems = useMemo(() => {
    // Combine local real-time state items with any items from Supabase
    const sourceList = sewingItems.length > 0 ? sewingItems : supabaseDueItems;
    return sourceList.filter(item => {
      const bQty = Number(item.booking_qty) || 0;
      const rQty = Number(item.receive_qty) || 0;
      return bQty > rQty;
    });
  }, [sewingItems, supabaseDueItems]);

  // Unique Buyers across all due items
  const dueBuyersList = useMemo(() => {
    const set = new Set<string>();
    sewingDueItems.forEach(i => {
      const b = i.buyer_name || i.buyer || '';
      if (b) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [sewingDueItems]);

  // Unique Styles across all due items
  const dueStylesList = useMemo(() => {
    const set = new Set<string>();
    sewingDueItems.forEach(i => {
      if (i.style) set.add(i.style.trim());
    });
    return Array.from(set).sort();
  }, [sewingDueItems]);

  // Buyer-Wise Summary Breakdown for Due Items
  const buyerWiseSummary = useMemo(() => {
    const summaryMap: { [buyer: string]: { buyer: string; totalItems: number; stylesCount: Set<string>; totalBookingQty: number; totalRecvQty: number; totalDueQty: number } } = {};

    sewingDueItems.forEach(item => {
      const buyerName = (item.buyer_name || item.buyer || 'Unassigned').trim();
      const bQty = Number(item.booking_qty) || 0;
      const rQty = Number(item.receive_qty) || 0;
      const dueQty = Math.max(0, bQty - rQty);

      if (!summaryMap[buyerName]) {
        summaryMap[buyerName] = {
          buyer: buyerName,
          totalItems: 0,
          stylesCount: new Set<string>(),
          totalBookingQty: 0,
          totalRecvQty: 0,
          totalDueQty: 0
        };
      }

      summaryMap[buyerName].totalItems += 1;
      if (item.style) summaryMap[buyerName].stylesCount.add(item.style.trim());
      summaryMap[buyerName].totalBookingQty += bQty;
      summaryMap[buyerName].totalRecvQty += rQty;
      summaryMap[buyerName].totalDueQty += dueQty;
    });

    return Object.values(summaryMap).map(s => ({
      ...s,
      uniqueStyles: s.stylesCount.size
    })).sort((a, b) => b.totalDueQty - a.totalDueQty);
  }, [sewingDueItems]);

  // Filtered Sewing Due Items based on Buyer, Style, and Search Term
  const filteredSewingDueItems = useMemo(() => {
    return sewingDueItems.filter(i => {
      const buyer = (i.buyer_name || i.buyer || '').toUpperCase();
      if (selectedBuyer !== 'ALL' && buyer !== selectedBuyer.toUpperCase()) return false;

      const style = (i.style || '').toUpperCase();
      if (selectedStyle !== 'ALL' && style !== selectedStyle.toUpperCase()) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        buyer.toLowerCase().includes(term) ||
        (i.job_no || '').toLowerCase().includes(term) ||
        (i.style || '').toLowerCase().includes(term) ||
        (i.order_no || '').toLowerCase().includes(term) ||
        (i.sr_gt || '').toLowerCase().includes(term) ||
        (i.s_thread_ref || i.store_ref || '').toLowerCase().includes(term) ||
        (i.colour || i.color || '').toLowerCase().includes(term) ||
        (i.shade_no || i.pantone || '').toLowerCase().includes(term) ||
        (i.supplier || '').toLowerCase().includes(term)
      );
    });
  }, [sewingDueItems, selectedBuyer, selectedStyle, searchTerm]);

  // Total Summary Metrics for Due Report
  const dueMetrics = useMemo(() => {
    const totalDueItems = filteredSewingDueItems.length;
    const uniqueJobsSet = new Set<string>();
    const uniqueStylesSet = new Set<string>();
    let totalBooking = 0;
    let totalRecv = 0;
    let totalDue = 0;

    filteredSewingDueItems.forEach(i => {
      if (i.job_no) uniqueJobsSet.add(i.job_no.trim());
      if (i.style) uniqueStylesSet.add(i.style.trim());
      const b = Number(i.booking_qty) || 0;
      const r = Number(i.receive_qty) || 0;
      totalBooking += b;
      totalRecv += r;
      totalDue += Math.max(0, b - r);
    });

    return {
      totalDueItems,
      totalPendingJobs: uniqueJobsSet.size,
      totalPendingStyles: uniqueStylesSet.size,
      totalBooking,
      totalRecv,
      totalDue
    };
  }, [filteredSewingDueItems]);


  // 2. QC NOT OK ITEMS
  const sewingQcNotOkItems = useMemo(() => {
    return sewingItems.filter(item => {
      const val = item.qc_not_ok;
      return val === true || val === 'true' || val === 'QC NOT OK' || val === 'NOT OK';
    });
  }, [sewingItems]);

  const drawstringQcNotOkItems = useMemo(() => {
    return items.filter(item => {
      const val = item.qc_not_ok;
      return val === true || val === 'true' || val === 'QC NOT OK' || val === 'NOT OK';
    });
  }, [items]);

  const totalQcNotOkCount = sewingQcNotOkItems.length + drawstringQcNotOkItems.length;

  // Collect unique buyers for main filtering
  const allBuyers = useMemo(() => {
    const buyersSet = new Set<string>();
    sewingItems.forEach(i => { if (i.buyer_name || i.buyer) buyersSet.add((i.buyer_name || i.buyer!).trim()); });
    items.forEach(i => { if (i.buyer_name || i.buyer) buyersSet.add((i.buyer_name || i.buyer!).trim()); });
    return Array.from(buyersSet).sort();
  }, [sewingItems, items]);

  // Filtered lists for rendering based on search and buyer selection
  const filteredSewingQcNotOk = useMemo(() => {
    return sewingQcNotOkItems.filter(i => {
      const b = i.buyer_name || i.buyer || '';
      if (selectedBuyer !== 'ALL' && b.toUpperCase() !== selectedBuyer.toUpperCase()) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.toLowerCase().includes(term) ||
        (i.job_no || '').toLowerCase().includes(term) ||
        (i.style || '').toLowerCase().includes(term) ||
        (i.order_no || '').toLowerCase().includes(term) ||
        (i.sr_gt || '').toLowerCase().includes(term) ||
        (i.s_thread_ref || i.store_ref || '').toLowerCase().includes(term) ||
        (i.colour || i.color || '').toLowerCase().includes(term) ||
        (i.supplier || '').toLowerCase().includes(term)
      );
    });
  }, [sewingQcNotOkItems, selectedBuyer, searchTerm]);

  const filteredDrawstringQcNotOk = useMemo(() => {
    return drawstringQcNotOkItems.filter(i => {
      const b = i.buyer_name || i.buyer || '';
      if (selectedBuyer !== 'ALL' && b.toUpperCase() !== selectedBuyer.toUpperCase()) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.toLowerCase().includes(term) ||
        (i.ref_no_job_no || i.job_no || '').toLowerCase().includes(term) ||
        (i.style || '').toLowerCase().includes(term) ||
        (i.po_no || i.order_no || '').toLowerCase().includes(term) ||
        (i.sr_gt_no || i.sr_gt || '').toLowerCase().includes(term) ||
        (i.store_ref || i.s_thread_ref || '').toLowerCase().includes(term) ||
        (i.colour || i.color || '').toLowerCase().includes(term) ||
        (i.supplier || '').toLowerCase().includes(term)
      );
    });
  }, [drawstringQcNotOkItems, selectedBuyer, searchTerm]);

  // All Sewing items filtered
  const filteredAllSewing = useMemo(() => {
    return sewingItems.filter(i => {
      const b = i.buyer_name || i.buyer || '';
      if (selectedBuyer !== 'ALL' && b.toUpperCase() !== selectedBuyer.toUpperCase()) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.toLowerCase().includes(term) ||
        (i.job_no || '').toLowerCase().includes(term) ||
        (i.style || '').toLowerCase().includes(term) ||
        (i.order_no || '').toLowerCase().includes(term) ||
        (i.sr_gt || '').toLowerCase().includes(term) ||
        (i.s_thread_ref || i.store_ref || '').toLowerCase().includes(term) ||
        (i.colour || i.color || '').toLowerCase().includes(term) ||
        (i.supplier || '').toLowerCase().includes(term)
      );
    });
  }, [sewingItems, selectedBuyer, searchTerm]);

  // All Drawstring items filtered
  const filteredAllDrawstring = useMemo(() => {
    return items.filter(i => {
      const b = i.buyer_name || i.buyer || '';
      if (selectedBuyer !== 'ALL' && b.toUpperCase() !== selectedBuyer.toUpperCase()) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.toLowerCase().includes(term) ||
        (i.ref_no_job_no || i.job_no || '').toLowerCase().includes(term) ||
        (i.style || '').toLowerCase().includes(term) ||
        (i.po_no || i.order_no || '').toLowerCase().includes(term) ||
        (i.sr_gt_no || i.sr_gt || '').toLowerCase().includes(term) ||
        (i.store_ref || i.s_thread_ref || '').toLowerCase().includes(term) ||
        (i.colour || i.color || '').toLowerCase().includes(term) ||
        (i.supplier || '').toLowerCase().includes(term)
      );
    });
  }, [items, selectedBuyer, searchTerm]);

  // Toggle QC status back to OK for Sewing Thread
  const handleResolveSewingQc = (item: SewingThreadItem) => {
    if (onUpdateSewingItem) {
      onUpdateSewingItem({
        ...item,
        qc_not_ok: false
      });
    }
  };

  // Toggle QC status back to OK for Drawstring
  const handleResolveDrawstringQc = (item: DrawstringItem) => {
    if (onUpdateItem) {
      onUpdateItem({
        ...item,
        qc_not_ok: false
      });
    }
  };

  // Export Sewing Thread Due Report to Excel
  const handleExportDueExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detailed Due Rows
    const headers = [
      'Buyer Name', 'Job No', 'Style', 'SR/GT No', 'Fabric S/R & Trims Booking No (s_thread_ref)', 
      'Color Name', 'Count / Spec', 'Shade / Pantone', 'Booking Date', 
      'Total Booking Qty', 'Total Received Qty', 'Remaining Due Qty', 'Supplier', 'Remarks'
    ];

    const rows = filteredSewingDueItems.map(i => {
      const bQty = Number(i.booking_qty) || 0;
      const rQty = Number(i.receive_qty) || 0;
      const dueQty = Math.max(0, bQty - rQty);

      return [
        i.buyer_name || i.buyer || '',
        i.job_no || '',
        i.style || '',
        i.sr_gt || '',
        i.s_thread_ref || i.store_ref || '',
        i.colour || i.color || '',
        i.count || i.thread_count || i.item_name || '',
        i.shade_no || i.pantone || '',
        i.date || i.rcvd_date || '',
        bQty,
        rQty,
        dueQty,
        i.supplier || '',
        i.remarks || ''
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      ['SEWING THREAD DUE / PENDING REPORT'],
      [`Generated Date: ${new Date().toLocaleDateString()} | Total Pending Items: ${dueMetrics.totalDueItems} | Total Due Qty: ${dueMetrics.totalDue.toLocaleString()} Cones`],
      [],
      headers, 
      ...rows,
      [],
      ['TOTALS', '', '', '', '', '', '', '', '', dueMetrics.totalBooking, dueMetrics.totalRecv, dueMetrics.totalDue, '', '']
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Sewing Thread Due Report');

    // Sheet 2: Buyer-wise Summary
    const buyerHeaders = ['Buyer Name', 'Total Due Items', 'Pending Styles Count', 'Total Booking Qty', 'Total Received Qty', 'Remaining Due Qty'];
    const buyerRows = buyerWiseSummary.map(b => [
      b.buyer,
      b.totalItems,
      b.uniqueStyles,
      b.totalBookingQty,
      b.totalRecvQty,
      b.totalDueQty
    ]);

    const wsBuyer = XLSX.utils.aoa_to_sheet([
      ['BUYER-WISE SEWING THREAD DUE SUMMARY'],
      [],
      buyerHeaders,
      ...buyerRows
    ]);

    XLSX.utils.book_append_sheet(wb, wsBuyer, 'Buyer Summary');

    XLSX.writeFile(wb, `Sewing_Thread_Due_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Sewing Thread Due Report to PDF using jsPDF
  const handleExportDuePdf = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Title
    doc.setFontSize(16);
    doc.setTextColor(190, 18, 60); // Rose red
    doc.text('MCD STORE - SEWING THREAD DUE / PENDING REPORT', 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated On: ${new Date().toLocaleString()} | Filter Buyer: ${selectedBuyer} | Style: ${selectedStyle}`, 14, 21);

    // Summary Cards Text Box
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(14, 25, 269, 14, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Pending Jobs: ${dueMetrics.totalPendingJobs}   |   Pending Styles: ${dueMetrics.totalPendingStyles}   |   Booking Qty: ${dueMetrics.totalBooking.toLocaleString()}   |   Received Qty: ${dueMetrics.totalRecv.toLocaleString()}   |   TOTAL REMAINING DUE QTY: ${dueMetrics.totalDue.toLocaleString()} Cones`, 18, 33);

    // Table Data
    const tableHeaders = [
      ['Buyer Name', 'Job No', 'Style', 'SR/GT No', 'Trims / S_Thread Ref', 'Color & Spec', 'Shade', 'Booking', 'Received', 'Due Qty', 'Supplier']
    ];

    const tableRows = filteredSewingDueItems.map(i => {
      const bQty = Number(i.booking_qty) || 0;
      const rQty = Number(i.receive_qty) || 0;
      const dueQty = Math.max(0, bQty - rQty);

      return [
        i.buyer_name || i.buyer || '-',
        i.job_no || '-',
        i.style || '-',
        i.sr_gt || '-',
        i.s_thread_ref || i.store_ref || '-',
        `${i.colour || i.color || '-'} (${i.count || i.thread_count || ''})`,
        i.shade_no || i.pantone || '-',
        bQty.toLocaleString(),
        rQty.toLocaleString(),
        dueQty.toLocaleString(),
        i.supplier || '-'
      ];
    });

    autoTable(doc, {
      startY: 43,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [190, 18, 60] },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] } // Highlight Due in Red
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    doc.save(`Sewing_Thread_Due_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export QC NOT OK to Excel
  const handleExportQcExcel = () => {
    const wb = XLSX.utils.book_new();

    if (qcCategory === 'ALL' || qcCategory === 'SEWING') {
      const sewingHeaders = [
        'Buyer Name', 'Booking Date', 'Job No', 'Style Ref & Desc', 'PO No / Order No', 
        'SR/GT No', 'Store Ref / Thread Ref', 'Thread Count / Spec', 'Meter / Cone Length', 
        'Per Body Consm', 'Colour', 'Shade / Pantone', 'WO Qty', 'Recv Date', 
        'Recv Challan', 'Recv Qty', 'Issue Date', 'Issue Challan', 'Issue Qty', 
        'Balance Qty', 'Supplier', 'QC Status', 'Remarks'
      ];

      const sewingRows = filteredSewingQcNotOk.map(i => [
        i.buyer_name || i.buyer || '',
        i.date || i.rcvd_date || '',
        i.job_no || '',
        i.style || '',
        i.order_no || '',
        i.sr_gt || '',
        i.s_thread_ref || i.store_ref || '',
        i.count || i.thread_count || i.item_name || '',
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
        'QC NOT OK',
        i.remarks || ''
      ]);

      const wsSewing = XLSX.utils.aoa_to_sheet([
        sewingHeaders, 
        ...sewingRows,
        [],
        ['SEWING THREAD QC NOT OK GRAND TOTAL', '', '', '', '', '', '', '', '', '', '', '', 
          filteredSewingQcNotOk.reduce((s, i) => s + (Number(i.booking_qty) || 0), 0), '', '', 
          filteredSewingQcNotOk.reduce((s, i) => s + (Number(i.receive_qty) || 0), 0), '', '', '', 
          filteredSewingQcNotOk.reduce((s, i) => s + (Number(i.balance_qty) || 0), 0), '', '', '']
      ]);
      XLSX.utils.book_append_sheet(wb, wsSewing, 'Sewing Thread QC NOT OK');
    }

    if (qcCategory === 'ALL' || qcCategory === 'DRAWSTRING') {
      const dsHeaders = [
        'Buyer Name', 'Booking Date', 'Job No', 'Style', 'SR/GT No', 'Store Ref', 
        'PO No', 'Item Name', 'Color', 'Size', 'Booking Qty', 'Recv Qty', 
        'Due/Balance Qty', 'Recv Date', 'Supplier', 'QC Status', 'Remarks'
      ];

      const dsRows = filteredDrawstringQcNotOk.map(i => [
        i.buyer_name || i.buyer || '',
        i.booking_date || i.date || '',
        i.ref_no_job_no || i.job_no || '',
        i.style || '',
        i.sr_gt_no || i.sr_gt || '',
        i.store_ref || i.s_thread_ref || '',
        i.po_no || i.order_no || '',
        i.item_name || i.drawstring_type || '',
        i.colour || i.color || '',
        i.size || i.size_mm || '',
        Number(i.booking_qty) || 0,
        Number(i.receive_qty || i.rcv_qty) || 0,
        Number(i.balance_qty || i.due_qty) || 0,
        i.rcvd_date || i.receive_date || '',
        i.supplier || '',
        'QC NOT OK',
        i.remarks || ''
      ]);

      const wsDs = XLSX.utils.aoa_to_sheet([
        dsHeaders, 
        ...dsRows,
        [],
        ['DRAWSTRING QC NOT OK GRAND TOTAL', '', '', '', '', '', '', '', '', '', 
          filteredDrawstringQcNotOk.reduce((s, i) => s + (Number(i.booking_qty) || 0), 0), 
          filteredDrawstringQcNotOk.reduce((s, i) => s + (Number(i.receive_qty || i.rcv_qty) || 0), 0), 
          filteredDrawstringQcNotOk.reduce((s, i) => s + (Number(i.balance_qty || i.due_qty) || 0), 0), '', '', '', '']
      ]);
      XLSX.utils.book_append_sheet(wb, wsDs, 'Drawstring QC NOT OK');
    }

    XLSX.writeFile(wb, `QC_NOT_OK_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER BAR */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${
            activeTab === 'sewing_due'
              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400'
              : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400'
          }`}>
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>MCD Store Reports & Analytics</span>
              {sewingDueItems.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-mono font-extrabold animate-pulse">
                  {sewingDueItems.length} Due Items
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time synchronized Sewing Thread Due / Pending report, QC NOT OK records, and main store files
            </p>
          </div>
        </div>

        {/* PRIMARY NAVIGATION TAB SWITCHER */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          
          {/* TAB 1: SEWING THREAD DUE / PENDING REPORT */}
          <button
            onClick={() => setActiveTab('sewing_due')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sewing_due'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Clock className="w-4 h-4 text-rose-200" />
            <span>Sewing Thread Due Report</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'sewing_due' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {sewingDueItems.length}
            </span>
          </button>

          {/* TAB 2: QC NOT OK REPORT */}
          <button
            onClick={() => setActiveTab('qc_not_ok')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'qc_not_ok'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>QC NOT OK Report</span>
            {totalQcNotOkCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'qc_not_ok' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {totalQcNotOkCount}
              </span>
            )}
          </button>

          {/* TAB 3: SEWING THREAD MAIN */}
          <button
            onClick={() => setActiveTab('sewing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sewing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Sewing Thread Main</span>
            <span className="text-[10px] opacity-75">({sewingItems.length})</span>
          </button>

          {/* TAB 4: DRAWSTRING MAIN */}
          <button
            onClick={() => setActiveTab('drawstring')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'drawstring'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Drawstring Main</span>
            <span className="text-[10px] opacity-75">({items.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER & TOOLBAR SECTION */}
      <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        
        {/* Left Side: Search, Buyer, and Style Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Job No, Style, Color, Shade, Booking Ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none transition-all ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-rose-500 focus:bg-white text-slate-800' 
                  : 'bg-slate-950 border-slate-800 focus:border-rose-500 focus:bg-slate-900 text-white'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Buyer Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className={`py-2 px-3 text-xs rounded-xl border outline-none font-medium cursor-pointer ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-700' 
                  : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="ALL">All Buyers ({activeTab === 'sewing_due' ? dueBuyersList.length : allBuyers.length})</option>
              {(activeTab === 'sewing_due' ? dueBuyersList : allBuyers).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Style Filter (Only for Sewing Due tab) */}
          {activeTab === 'sewing_due' && dueStylesList.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className={`py-2 px-3 text-xs rounded-xl border outline-none font-medium cursor-pointer ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-700' 
                    : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Styles ({dueStylesList.length})</option>
                {dueStylesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* QC Category Filter */}
          {activeTab === 'qc_not_ok' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setQcCategory('ALL')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  qcCategory === 'ALL'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({sewingQcNotOkItems.length + drawstringQcNotOkItems.length})
              </button>

              <button
                onClick={() => setQcCategory('SEWING')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  qcCategory === 'SEWING'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sewing Thread ({sewingQcNotOkItems.length})
              </button>

              <button
                onClick={() => setQcCategory('DRAWSTRING')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  qcCategory === 'DRAWSTRING'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Drawstring ({drawstringQcNotOkItems.length})
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Refresh & Export Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'sewing_due' && (
            <>
              <button
                onClick={fetchSupabaseDueData}
                disabled={isFetchingSupabase}
                className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Refresh Due Data from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSupabase ? 'animate-spin' : ''}`} />
                <span>Sync Supabase</span>
              </button>

              <button
                onClick={handleExportDueExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download Excel Spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportDuePdf}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Export PDF Report"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </>
          )}

          {activeTab === 'qc_not_ok' && (
            <button
              onClick={handleExportQcExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Export</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* VIEW SECTION 1: SEWING THREAD DUE / PENDING REPORT TAB */}
      {activeTab === 'sewing_due' && (
        <div className="space-y-6">

          {/* KEY SUMMARY STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CARD 1: Total Pending Items */}
            <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between relative overflow-hidden ${
              isLight ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200 text-rose-950' : 'bg-slate-900 border-rose-900/50 text-rose-100'
            }`}>
              <div className="z-10">
                <p className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Pending Items</p>
                <h3 className="text-3xl font-black mt-1 font-mono">{dueMetrics.totalDueItems}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Booking Qty {'>'} Received Qty</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20">
                <Clock className="w-7 h-7" />
              </div>
            </div>

            {/* CARD 2: Total Pending Jobs & Styles */}
            <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between relative overflow-hidden ${
              isLight ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 text-amber-950' : 'bg-slate-900 border-amber-900/50 text-amber-100'
            }`}>
              <div className="z-10">
                <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Jobs & Styles</p>
                <h3 className="text-3xl font-black mt-1 font-mono">
                  {dueMetrics.totalPendingJobs} <span className="text-sm font-bold text-slate-500">Jobs</span> / {dueMetrics.totalPendingStyles} <span className="text-sm font-bold text-slate-500">Styles</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">Unique active pending orders</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
                <Layers className="w-7 h-7" />
              </div>
            </div>

            {/* CARD 3: Total Booking Qty */}
            <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between relative overflow-hidden ${
              isLight ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200 text-blue-950' : 'bg-slate-900 border-blue-900/50 text-blue-100'
            }`}>
              <div className="z-10">
                <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Booking Qty</p>
                <h3 className="text-3xl font-black mt-1 font-mono">{dueMetrics.totalBooking.toLocaleString()}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Total Ordered Cones</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                <Package className="w-7 h-7" />
              </div>
            </div>

            {/* CARD 4: Remaining Due Quantity (Highlighted) */}
            <div className={`p-5 rounded-3xl border shadow-md flex items-center justify-between relative overflow-hidden bg-gradient-to-br from-rose-600 to-rose-700 text-white`}>
              <div className="z-10">
                <p className="text-xs font-black uppercase tracking-wider text-rose-200">TOTAL REMAINING DUE QTY</p>
                <h3 className="text-3xl font-black mt-1 font-mono">{dueMetrics.totalDue.toLocaleString()} <span className="text-sm font-bold opacity-80">Cones</span></h3>
                <p className="text-[11px] text-rose-100 mt-1">Received: {dueMetrics.totalRecv.toLocaleString()} Cones</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/20 text-white border border-white/30 animate-pulse">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>

          </div>

          {/* BUYER-WISE SUMMARY BREAKDOWN GRID */}
          <div className={`p-6 rounded-3xl border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Buyer-Wise Sewing Thread Due Summary
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {buyerWiseSummary.length} Active Buyers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {buyerWiseSummary.map((b) => (
                <div 
                  key={b.buyer} 
                  onClick={() => setSelectedBuyer(b.buyer)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedBuyer.toUpperCase() === b.buyer.toUpperCase()
                      ? 'bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                      : isLight 
                        ? 'bg-slate-50 hover:bg-rose-50/50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400 truncate max-w-[150px]" title={b.buyer}>
                      {b.buyer}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {b.uniqueStyles} Styles
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                    <span className="text-[11px] text-slate-500 font-medium">Pending Due:</span>
                    <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                      {b.totalDueQty.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Cones</span>
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Booking: {b.totalBookingQty.toLocaleString()}</span>
                    <span>Received: {b.totalRecvQty.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN SEWING THREAD DUE DATA TABLE */}
          <div className={`rounded-3xl border overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-sm font-black tracking-wide text-rose-300 flex items-center gap-2">
                  <span>🧵 Pending Sewing Thread Due Items List</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono">
                    {filteredSewingDueItems.length} Records
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Filtered Buyer: <strong className="text-white">{selectedBuyer}</strong> | Style: <strong className="text-white">{selectedStyle}</strong>
              </span>
            </div>

            {filteredSewingDueItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-slate-700 dark:text-slate-200">No Pending Due Items Found!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All sewing thread bookings under these filter options are fully received or no pending items match your search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}>
                    <tr>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SL</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Buyer Name</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Job No & Style</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SR / GT No</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Fabric S/R & Trims Booking No</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Color Name & Count/Spec</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Shade / Pantone</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Total Booking Qty</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Total Received Qty</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">Remaining Due Qty</th>
                      <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Supplier</th>
                      <th className="py-3 px-2 text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {filteredSewingDueItems.map((item, idx) => {
                      const bQty = Number(item.booking_qty) || 0;
                      const rQty = Number(item.receive_qty) || 0;
                      const dueQty = Math.max(0, bQty - rQty);

                      return (
                        <tr 
                          key={item.id || idx}
                          className={`transition-colors hover:bg-rose-50/40 dark:hover:bg-rose-950/20 ${
                            isLight ? 'text-slate-800' : 'text-slate-200'
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-slate-400 border-r border-slate-300 dark:border-slate-800">{idx + 1}</td>
                          
                          {/* 1. Buyer Name */}
                          <td className="py-2.5 px-2 font-black text-rose-600 dark:text-rose-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {item.buyer_name || item.buyer || 'GMS Buyer'}
                          </td>

                          {/* 2. Job No & Style */}
                          <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                            <div className="font-black font-mono text-slate-900 dark:text-white">{item.job_no || '-'}</div>
                            <div className="text-[11px] text-slate-500 max-w-[140px] truncate" title={item.style}>{item.style || '-'}</div>
                          </td>

                          {/* 3. SR / GT No */}
                          <td className="py-2.5 px-2 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {item.sr_gt || '-'}
                          </td>

                          {/* 4. Fabric S/R & Trims Booking No (s_thread_ref) */}
                          <td className="py-2.5 px-2 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {item.s_thread_ref || item.store_ref || '-'}
                          </td>

                          {/* 5. Color Name & Count/Spec */}
                          <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.colour || item.color || '-'}</div>
                            <div className="text-[11px] text-slate-500">{item.count || item.thread_count || item.item_name || 'Spec N/A'}</div>
                          </td>

                          {/* 6. Shade / Pantone */}
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {item.shade_no || item.pantone || '-'}
                          </td>

                          {/* 7. Total Booking Qty */}
                          <td className="py-2.5 px-2 text-right font-black font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {bQty.toLocaleString()}
                          </td>

                          {/* 8. Total Received Qty */}
                          <td className="py-2.5 px-2 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            {rQty.toLocaleString()}
                          </td>

                          {/* 9. Remaining Due Qty (Highlighted in Red / Orange) */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap border-r border-slate-300 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/30">
                            <span className="px-2.5 py-1 rounded-lg font-black font-mono text-xs bg-rose-600 text-white shadow-sm border border-rose-700 inline-flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>{dueQty.toLocaleString()} Cones</span>
                            </span>
                          </td>

                          {/* 10. Supplier */}
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                            {item.supplier || '-'}
                          </td>

                          {/* 11. Remarks */}
                          <td className="py-2.5 px-2 text-slate-500 max-w-[130px] truncate text-center" title={item.remarks}>
                            {item.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* TABLE FOOTER SUMMARY ROW */}
                  <tfoot className={`font-black text-xs uppercase border-t-2 ${
                    isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-100 border-slate-700'
                  }`}>
                    <tr>
                      <td colSpan={7} className="py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-800">
                        TOTAL PENDING SUMMARY:
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800">
                        {dueMetrics.totalBooking.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800">
                        {dueMetrics.totalRecv.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/80 border-r border-slate-300 dark:border-slate-800">
                        {dueMetrics.totalDue.toLocaleString()} Cones
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW SECTION 2: QC NOT OK REPORT TAB */}
      {activeTab === 'qc_not_ok' && (() => {
        const sewingQcWoTotal = filteredSewingQcNotOk.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
        const sewingQcRecvTotal = filteredSewingQcNotOk.reduce((acc, i) => acc + (Number(i.receive_qty) || 0), 0);
        const sewingQcBalTotal = filteredSewingQcNotOk.reduce((acc, i) => acc + (Number(i.balance_qty) || 0), 0);

        const dsQcWoTotal = filteredDrawstringQcNotOk.reduce((acc, i) => acc + (Number(i.booking_qty) || 0), 0);
        const dsQcRecvTotal = filteredDrawstringQcNotOk.reduce((acc, i) => acc + (Number(i.receive_qty || i.rcv_qty) || 0), 0);
        const dsQcBalTotal = filteredDrawstringQcNotOk.reduce((acc, i) => acc + (Number(i.balance_qty || i.due_qty) || 0), 0);

        const grandQcWoTotal = (qcCategory === 'DRAWSTRING' ? 0 : sewingQcWoTotal) + (qcCategory === 'SEWING' ? 0 : dsQcWoTotal);
        const grandQcRecvTotal = (qcCategory === 'DRAWSTRING' ? 0 : sewingQcRecvTotal) + (qcCategory === 'SEWING' ? 0 : dsQcRecvTotal);
        const grandQcBalTotal = (qcCategory === 'DRAWSTRING' ? 0 : sewingQcBalTotal) + (qcCategory === 'SEWING' ? 0 : dsQcBalTotal);

        return (
          <div className="space-y-6">

            {/* KPI STAT CARDS FOR QC NOT OK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-rose-50/80 border-rose-200 text-rose-950' : 'bg-rose-950/40 border-rose-900/60 text-rose-100'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total QC NOT OK</p>
                  <h3 className="text-2xl font-black mt-0.5">{totalQcNotOkCount} Records</h3>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-blue-50/80 border-blue-200 text-blue-950' : 'bg-blue-950/40 border-blue-900/60 text-blue-100'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total WO Qty</p>
                  <h3 className="text-2xl font-black font-mono mt-0.5 text-blue-600 dark:text-blue-400">{grandQcWoTotal.toLocaleString()}</h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-300">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-teal-50/80 border-teal-200 text-teal-950' : 'bg-teal-950/40 border-teal-900/60 text-teal-100'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Total Recv Qty</p>
                  <h3 className="text-2xl font-black font-mono mt-0.5 text-teal-600 dark:text-teal-400">{grandQcRecvTotal.toLocaleString()}</h3>
                </div>
                <div className="p-3 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-300">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-rose-100/80 border-rose-300 text-rose-950' : 'bg-rose-900/60 border-rose-700 text-rose-100'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Total Balance Qty</p>
                  <h3 className="text-2xl font-black font-mono mt-0.5 text-rose-600 dark:text-rose-300 animate-pulse">
                    {grandQcBalTotal.toLocaleString()}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-rose-600/30 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* QC NOT OK FILE GRAND TOTAL SUMMARY BANNER */}
            {totalQcNotOkCount > 0 && (
              <div className="p-5 rounded-3xl border shadow-md flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white border-rose-800/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 animate-pulse">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">
                        File Summary
                      </span>
                      <span className="text-xs text-rose-300 font-medium">({totalQcNotOkCount} Non-Conforming Records)</span>
                    </div>
                    <h3 className="text-lg font-black tracking-wide text-white mt-0.5">
                      QC NOT OK FILE GRAND TOTAL
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-center min-w-[120px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WO Qty</p>
                    <p className="text-lg font-black font-mono text-blue-400">{grandQcWoTotal.toLocaleString()}</p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-center min-w-[120px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recv Qty</p>
                    <p className="text-lg font-black font-mono text-emerald-400">{grandQcRecvTotal.toLocaleString()}</p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-rose-950/80 border border-rose-600 text-center min-w-[140px] shadow-lg shadow-rose-950/50">
                    <p className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Balance Qty</p>
                    <p className="text-xl font-black font-mono text-rose-400">
                      {grandQcBalTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {totalQcNotOkCount === 0 && (
              <div className={`p-12 rounded-3xl border text-center space-y-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  No QC NOT OK Items Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  সব আইটেম বর্তমানে QC OK অবস্থায় আছে। Sewing Thread বা Drawstring মেইন শিট থেকে কোনো আইটেমে "QC NOT OK" সিলেক্ট করলে তা অটোমেটিক্যালি এই রিপোর্টে চলে আসবে।
                </p>
              </div>
            )}

            {/* TABLE SECTION 1: SEWING THREAD QC NOT OK */}
            {(qcCategory === 'ALL' || qcCategory === 'SEWING') && filteredSewingQcNotOk.length > 0 && (
              <div className={`rounded-3xl border overflow-hidden shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="p-4 bg-blue-950 text-white flex items-center justify-between border-b border-blue-900">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="text-sm font-black tracking-wide text-blue-200 flex items-center gap-2">
                      <span>🧵 Sewing Thread QC NOT OK Items</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                        {filteredSewingQcNotOk.length} items
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Main Sewing Thread File Columns</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}>
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Buyer</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Date</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Job No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Style</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Order/PO No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SR/GT No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Thread Ref</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Thread Spec/Count</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Meter</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Per Body Consm</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Colour</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Shade/Pantone</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">WO Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Recv Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Balance Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Supplier</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-center">QC Status</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Remarks</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {filteredSewingQcNotOk.map((item) => (
                        <tr 
                          key={item.id}
                          className={`transition-colors bg-rose-500/5 hover:bg-rose-500/10 ${
                            isLight ? 'text-slate-800' : 'text-slate-200'
                          }`}
                        >
                          <td className="py-2.5 px-2 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.buyer_name || item.buyer || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.date || '-'}</td>
                          <td className="py-2.5 px-2 font-mono font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.job_no || '-'}</td>
                          <td className="py-2.5 px-2 max-w-[150px] truncate border-r border-slate-300 dark:border-slate-800" title={item.style}>{item.style || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.order_no || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.sr_gt || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.s_thread_ref || item.store_ref || '-'}</td>
                          <td className="py-2.5 px-2 max-w-[150px] truncate border-r border-slate-300 dark:border-slate-800" title={item.count || item.thread_count || item.item_name}>{item.count || item.thread_count || item.item_name || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.meter || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.per_body_consm || '-'}</td>
                          <td className="py-2.5 px-2 font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.colour || item.color || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.shade_no || item.pantone || '-'}</td>
                          <td className="py-2.5 px-2 text-right font-black font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.booking_qty?.toLocaleString() ?? 0}</td>
                          <td className="py-2.5 px-2 text-right font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.receive_qty?.toLocaleString() ?? 0}</td>
                          <td className="py-2.5 px-2 text-right font-black font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.balance_qty?.toLocaleString() ?? 0}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.supplier || '-'}</td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm border border-rose-600">
                              QC NOT OK
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 max-w-[130px] truncate border-r border-slate-300 dark:border-slate-800" title={item.remarks}>{item.remarks || '-'}</td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleResolveSewingQc(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow cursor-pointer flex items-center gap-1 mx-auto"
                              title="Mark as QC OK & return to normal list"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark QC OK</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={`font-black uppercase tracking-wider text-xs border-t-2 ${
                      isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-100 border-slate-800'
                    }`}>
                      <tr>
                        <td colSpan={12} className="py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-800">
                          SEWING THREAD QC NOT OK GRAND TOTAL:
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                          {sewingQcWoTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                          {sewingQcRecvTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/60">
                          {sewingQcBalTotal.toLocaleString()}
                        </td>
                        <td colSpan={4} className="py-3 px-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TABLE SECTION 2: DRAWSTRING QC NOT OK */}
            {(qcCategory === 'ALL' || qcCategory === 'DRAWSTRING') && filteredDrawstringQcNotOk.length > 0 && (
              <div className={`rounded-3xl border overflow-hidden shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="p-4 bg-teal-950 text-white flex items-center justify-between border-b border-teal-900">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="text-sm font-black tracking-wide text-teal-200 flex items-center gap-2">
                      <span>🧶 Drawstring QC NOT OK Items</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                        {filteredDrawstringQcNotOk.length} items
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Drawstring Main File Columns</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}>
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Buyer</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Booking Date</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Job No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Style</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SR/GT No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Store Ref</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">PO No</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Item Name</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Color</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Size</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Booking Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Recv Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Due Qty</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Recv Date</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Supplier</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-center">QC Status</th>
                        <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Remarks</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {filteredDrawstringQcNotOk.map((item) => (
                        <tr 
                          key={item.id}
                          className={`transition-colors bg-rose-500/5 hover:bg-rose-500/10 ${
                            isLight ? 'text-slate-800' : 'text-slate-200'
                          }`}
                        >
                          <td className="py-2.5 px-2 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.buyer_name || item.buyer || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.booking_date || item.date || '-'}</td>
                          <td className="py-2.5 px-2 font-mono font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.ref_no_job_no || item.job_no || '-'}</td>
                          <td className="py-2.5 px-2 max-w-[150px] truncate border-r border-slate-300 dark:border-slate-800" title={item.style}>{item.style || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.sr_gt_no || item.sr_gt || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.store_ref || item.s_thread_ref || '-'}</td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.po_no || item.order_no || '-'}</td>
                          <td className="py-2.5 px-2 max-w-[150px] truncate border-r border-slate-300 dark:border-slate-800" title={item.item_name || item.drawstring_type}>{item.item_name || item.drawstring_type || '-'}</td>
                          <td className="py-2.5 px-2 font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.colour || item.color || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.size || item.size_mm || '-'}</td>
                          <td className="py-2.5 px-2 text-right font-black font-mono whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.booking_qty?.toLocaleString() ?? 0}</td>
                          <td className="py-2.5 px-2 text-right font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{(item.receive_qty || item.rcv_qty || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right font-black font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{(item.balance_qty || item.due_qty || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.rcvd_date || item.receive_date || '-'}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">{item.supplier || '-'}</td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm border border-rose-600">
                              QC NOT OK
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 max-w-[130px] truncate border-r border-slate-300 dark:border-slate-800" title={item.remarks}>{item.remarks || '-'}</td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleResolveDrawstringQc(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow cursor-pointer flex items-center gap-1 mx-auto"
                              title="Mark as QC OK & return to normal list"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark QC OK</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={`font-black uppercase tracking-wider text-xs border-t-2 ${
                      isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-100 border-slate-800'
                    }`}>
                      <tr>
                        <td colSpan={10} className="py-3 px-3 text-right font-black border-r border-slate-300 dark:border-slate-800">
                          DRAWSTRING QC NOT OK GRAND TOTAL:
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                          {dsQcWoTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                          {dsQcRecvTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800 text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/60">
                          {dsQcBalTotal.toLocaleString()}
                        </td>
                        <td colSpan={5} className="py-3 px-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* VIEW SECTION 3: ALL SEWING THREAD REPORT TAB */}
      {activeTab === 'sewing' && (
        <div className={`rounded-3xl border overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <h3 className="text-sm font-black tracking-wide text-blue-300 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Full Sewing Thread Main Report ({filteredAllSewing.length} Items)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Buyer</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Date</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Job No</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Style</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Order No</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SR/GT</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Thread Ref</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Thread Count</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Meter</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Per Body Consm</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Colour</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Shade/Pantone</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">WO Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Recv Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Balance Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Supplier</th>
                  <th className="py-3 px-2 text-center">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredAllSewing.map((item) => {
                  const isQcNotOk = item.qc_not_ok === true || item.qc_not_ok === 'true' || item.qc_not_ok === 'QC NOT OK';
                  return (
                    <tr key={item.id} className={isQcNotOk ? 'bg-rose-500/10' : ''}>
                      <td className="py-2.5 px-2 font-bold border-r border-slate-300 dark:border-slate-800">{item.buyer_name || item.buyer || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.date || '-'}</td>
                      <td className="py-2.5 px-2 font-mono font-bold border-r border-slate-300 dark:border-slate-800">{item.job_no || '-'}</td>
                      <td className="py-2.5 px-2 max-w-[140px] truncate border-r border-slate-300 dark:border-slate-800" title={item.style}>{item.style || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.order_no || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.sr_gt || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.s_thread_ref || item.store_ref || '-'}</td>
                      <td className="py-2.5 px-2 max-w-[140px] truncate border-r border-slate-300 dark:border-slate-800">{item.count || item.thread_count || item.item_name || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.meter || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.per_body_consm || '-'}</td>
                      <td className="py-2.5 px-2 font-bold border-r border-slate-300 dark:border-slate-800">{item.colour || item.color || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.shade_no || item.pantone || '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold border-r border-slate-300 dark:border-slate-800">{item.booking_qty?.toLocaleString() ?? 0}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300 dark:border-slate-800">{item.receive_qty?.toLocaleString() ?? 0}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold border-r border-slate-300 dark:border-slate-800">{item.balance_qty?.toLocaleString() ?? 0}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.supplier || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        {isQcNotOk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            QC NOT OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW SECTION 4: ALL DRAWSTRING REPORT TAB */}
      {activeTab === 'drawstring' && (
        <div className={`rounded-3xl border overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <h3 className="text-sm font-black tracking-wide text-teal-300 flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Full Drawstring Main Report ({filteredAllDrawstring.length} Items)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`text-[11px] uppercase tracking-wider font-extrabold border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Buyer</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Booking Date</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Job No</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Style</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">SR/GT</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Store Ref</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">PO No</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Item Name</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Color</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Size</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Booking Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Recv Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800 text-right">Balance Qty</th>
                  <th className="py-3 px-2 border-r border-slate-300 dark:border-slate-800">Supplier</th>
                  <th className="py-3 px-2 text-center">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredAllDrawstring.map((item) => {
                  const isQcNotOk = item.qc_not_ok === true || item.qc_not_ok === 'true' || item.qc_not_ok === 'QC NOT OK';
                  return (
                    <tr key={item.id} className={isQcNotOk ? 'bg-rose-500/10' : ''}>
                      <td className="py-2.5 px-2 font-bold border-r border-slate-300 dark:border-slate-800">{item.buyer_name || item.buyer || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.booking_date || item.date || '-'}</td>
                      <td className="py-2.5 px-2 font-mono font-bold border-r border-slate-300 dark:border-slate-800">{item.ref_no_job_no || item.job_no || '-'}</td>
                      <td className="py-2.5 px-2 max-w-[140px] truncate border-r border-slate-300 dark:border-slate-800" title={item.style}>{item.style || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.sr_gt_no || item.sr_gt || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.store_ref || item.s_thread_ref || '-'}</td>
                      <td className="py-2.5 px-2 font-mono border-r border-slate-300 dark:border-slate-800">{item.po_no || item.order_no || '-'}</td>
                      <td className="py-2.5 px-2 max-w-[140px] truncate border-r border-slate-300 dark:border-slate-800">{item.item_name || item.drawstring_type || '-'}</td>
                      <td className="py-2.5 px-2 font-bold border-r border-slate-300 dark:border-slate-800">{item.colour || item.color || '-'}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.size || item.size_mm || '-'}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold border-r border-slate-300 dark:border-slate-800">{item.booking_qty?.toLocaleString() ?? 0}</td>
                      <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300 dark:border-slate-800">{(item.receive_qty || item.rcv_qty || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold border-r border-slate-300 dark:border-slate-800">{(item.balance_qty || item.due_qty || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-800">{item.supplier || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        {isQcNotOk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            QC NOT OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
