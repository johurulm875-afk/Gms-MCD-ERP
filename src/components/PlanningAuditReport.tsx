import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Search, Filter, 
  Eye, X, Download, RefreshCw, Layers, Building2, Tag, FileText, 
  Database, HelpCircle, Check, ArrowRight
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { SewingThreadItem, AppTheme } from '../types';
import { supabase } from '../supabaseClient';
import { generateCompanyMultiSheetExcel, ExcelColumnDef } from '../utils/excelExportHelper';

export interface PlanningAuditOrderRow {
  id: string;
  slNo: number;
  buyer: string;
  styleName: string;
  orderNo: string;
  storeRef: string; // "Stoe Reff." / Store Ref
  jobNumber: string;
  orderQtyPcs: number;
  ccd: string;
  status: 'MATCHED' | 'BOOKING DUE';
  matchedRecords: SewingThreadItem[];
  rawRow?: Record<string, any>;
}

interface PlanningAuditReportProps {
  sewingThreadItems?: SewingThreadItem[];
  theme?: AppTheme;
  onClose?: () => void;
}

export const PlanningAuditReport: React.FC<PlanningAuditReportProps> = ({
  sewingThreadItems = [],
  theme = 'light',
  onClose
}) => {
  const isLight = theme === 'light';

  // State
  const [uploadedRows, setUploadedRows] = useState<PlanningAuditOrderRow[]>([]);
  const [dbSewingItems, setDbSewingItems] = useState<SewingThreadItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCHED' | 'BOOKING DUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyerFilter, setSelectedBuyerFilter] = useState('ALL');

  // Detail Modal State
  const [selectedMatchRow, setSelectedMatchRow] = useState<PlanningAuditOrderRow | null>(null);

  // 1. Fetch complete database records from Supabase (`supabase_sewing_thread_all_rows` and `sewing_thread`)
  const fetchSupabaseSewingRecords = async () => {
    setIsLoadingDb(true);
    let combined: SewingThreadItem[] = [...sewingThreadItems];

    try {
      // Query table 1: supabase_sewing_thread_all_rows
      const { data: allRowsData, error: err1 } = await supabase
        .from('supabase_sewing_thread_all_rows')
        .select('*');

      if (!err1 && allRowsData && allRowsData.length > 0) {
        combined = [...combined, ...allRowsData];
      }

      // Query table 2: sewing_thread
      const { data: stData, error: err2 } = await supabase
        .from('sewing_thread')
        .select('*');

      if (!err2 && stData && stData.length > 0) {
        combined = [...combined, ...stData];
      }
    } catch (e) {
      console.warn("Notice fetching sewing thread records for audit:", e);
    } finally {
      // Deduplicate by ID / store_ref + style + job_no
      const uniqueMap = new Map<string, SewingThreadItem>();
      combined.forEach(item => {
        const key = item.id ? `id_${item.id}` : `${item.store_ref || item.s_thread_ref}_${item.style}_${item.job_no}_${item.colour}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      setDbSewingItems(Array.from(uniqueMap.values()));
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchSupabaseSewingRecords();
  }, [sewingThreadItems]);

  // Helper string normalizer for robust cross-matching
  const normalize = (str: any) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[\s\-_/\\]+/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Cross Matching logic function
  const matchRowAgainstDatabase = (
    storeRef: string,
    styleName: string,
    jobNumber: string,
    buyer: string,
    dbList: SewingThreadItem[]
  ): SewingThreadItem[] => {
    const normStoreRef = normalize(storeRef);
    const normStyle = normalize(styleName);
    const normJobNo = normalize(jobNumber);
    const normBuyer = normalize(buyer);

    const matches = dbList.filter(db => {
      const dbStoreRef = normalize(db.store_ref || db.s_thread_ref || db.sr_gt || '');
      const dbStyle = normalize(db.style || '');
      const dbJobNo = normalize(db.job_no || '');
      const dbBuyer = normalize(db.buyer_name || db.buyer || '');

      // Condition A: Store Ref exact match
      if (normStoreRef && dbStoreRef && normStoreRef === dbStoreRef) {
        return true;
      }

      // Condition B: Job Number + Style Name match
      if (normJobNo && normStyle && dbJobNo && dbStyle && normJobNo === dbJobNo && normStyle === dbStyle) {
        return true;
      }

      // Condition C: Job Number match alone (if non-empty and long enough)
      if (normJobNo && dbJobNo && normJobNo.length >= 3 && normJobNo === dbJobNo) {
        if (!normBuyer || !dbBuyer || normBuyer === dbBuyer) {
          return true;
        }
      }

      // Condition D: Store Ref contained in database store ref / s_thread_ref
      if (normStoreRef && dbStoreRef && (dbStoreRef.includes(normStoreRef) || normStoreRef.includes(dbStoreRef))) {
        return true;
      }

      return false;
    });

    return matches;
  };

  // Parse Excel file upload with dynamic column auto-fitting & header auto-detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsProcessingExcel(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          setIsProcessingExcel(false);
          return;
        }

        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 1. Get raw 2D array of cells
        const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

        if (!raw2D || raw2D.length === 0) {
          alert('Uploaded Excel sheet is empty or invalid.');
          setIsProcessingExcel(false);
          return;
        }

        // 2. Find real header row (skipping top title rows or blank lines)
        let headerRowIdx = 0;
        let maxHeaderScore = -1;

        for (let r = 0; r < Math.min(15, raw2D.length); r++) {
          const rowCells = raw2D[r] || [];
          const nonCount = rowCells.filter((c: any) => c !== undefined && c !== null && String(c).trim() !== '').length;
          
          let keywordMatches = 0;
          rowCells.forEach((c: any) => {
            const s = String(c).toLowerCase().trim();
            if (['buyer', 'style', 'order', 'qty', 'job', 'store', 'ref', 'po', 'ccd', 'product', 'pcs', 'month', 'item', 'customer', 'quant'].some(kw => s.includes(kw))) {
              keywordMatches += 3;
            }
          });

          const score = nonCount + keywordMatches;
          if (score > maxHeaderScore && nonCount >= 2) {
            maxHeaderScore = score;
            headerRowIdx = r;
          }
        }

        // Headers array
        const headers = (raw2D[headerRowIdx] || []).map((h: any, i: number) => {
          const s = String(h || '').trim();
          return s ? s : `Column_${i + 1}`;
        });

        // 3. Construct clean row objects starting after headerRowIdx
        const rawJson: any[] = [];
        for (let r = headerRowIdx + 1; r < raw2D.length; r++) {
          const rowCells = raw2D[r] || [];
          const isRowEmpty = rowCells.every((c: any) => c === undefined || c === null || String(c).trim() === '');
          if (isRowEmpty) continue;

          const rowObj: Record<string, any> = {};
          headers.forEach((h: string, colIdx: number) => {
            rowObj[h] = rowCells[colIdx] !== undefined && rowCells[colIdx] !== null ? String(rowCells[colIdx]).trim() : '';
          });
          rawJson.push(rowObj);
        }

        if (rawJson.length === 0) {
          alert('No data rows found in uploaded file.');
          setIsProcessingExcel(false);
          return;
        }

        const sourceDb = dbSewingItems.length > 0 ? dbSewingItems : sewingThreadItems;

        // Dynamic helper to search any Excel row for matching field keywords
        const getDynamicColumnValue = (rowObj: Record<string, any>, keywords: string[]): string => {
          if (!rowObj) return '';
          const entries = Object.entries(rowObj);
          
          // 1. Exact normalized key match
          for (const keyword of keywords) {
            const normKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!normKeyword) continue;
            for (const [key, val] of entries) {
              if (val === undefined || val === null) continue;
              const cleanKey = key.trim().replace(/^[\uFEFF\s"']+|[\s"']+$|[\r\n]+/g, '');
              const normKey = cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normKey === normKeyword) {
                const s = String(val).trim();
                if (s !== '' && s !== 'undefined' && s !== 'null') return s;
              }
            }
          }

          // 2. Substring key match (avoiding empty key matches)
          for (const keyword of keywords) {
            const normKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!normKeyword || normKeyword.length < 2) continue;
            for (const [key, val] of entries) {
              if (val === undefined || val === null) continue;
              const cleanKey = key.trim().replace(/^[\uFEFF\s"']+|[\s"']+$|[\r\n]+/g, '');
              const normKey = cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!normKey || normKey.startsWith('column_')) continue;

              if (normKey.includes(normKeyword) || (normKey.length >= 3 && normKeyword.includes(normKey))) {
                const s = String(val).trim();
                if (s !== '' && s !== 'undefined' && s !== 'null') return s;
              }
            }
          }

          return '';
        };

        const parsed: PlanningAuditOrderRow[] = rawJson.map((row, index) => {
          // Dynamic key extraction - automatically handles any Excel layout/headers
          let buyer = getDynamicColumnValue(row, ['buyer', 'buyer_name', 'buyer name', 'customer', 'cust', 'client', 'brand']);
          let styleName = getDynamicColumnValue(row, ['style name', 'style', 'style_name', 'style/ref', 'style ref', 'type of product', 'product', 'stylename', 'item']);
          let orderNo = getDynamicColumnValue(row, ['order no.', 'order no', 'order_no', 'order', 'po', 'po no.', 'po_no', 'po number', 'orderno']);
          let storeRef = getDynamicColumnValue(row, ['stoe reff.', 'stoe reff', 'stoe ref', 'store ref', 'store_ref', 'fabric s/r', 'sr/gt', 's/r', 's_thread_ref', 'store_reff', 'stoereff', 'storereff', 'fabric ref']);
          let jobNumber = getDynamicColumnValue(row, ['job number', 'job no', 'job_no', 'job', 'job #', 'jobnumber', 'job_number']);
          let rawQty = getDynamicColumnValue(row, ['quantity in piece', 'order qty', 'qty (pcs)', 'qty', 'pcs', 'order_qty', 'quantity', 'quantityinpiece', 'pieces']);
          let ccd = getDynamicColumnValue(row, ['ccd', 'target date', 'delivery date', 'ccd date', 'target_date', 'ship_date', 'month', 'date']);

          // Smart fallback if primary keys are empty in row
          const validEntries = Object.entries(row)
            .filter(([k, v]) => !k.toLowerCase().startsWith('column_') && v !== undefined && v !== null && String(v).trim() !== '')
            .map(([k, v]) => ({ key: k, val: String(v).trim() }));

          if (!buyer && validEntries.length > 0) {
            const found = validEntries.find(e => !/^\d+$/.test(e.val) && !/^\d{4}-\d{2}-\d{2}$/.test(e.val));
            if (found) buyer = found.val;
          }

          if (!styleName && validEntries.length > 1) {
            const found = validEntries.find(e => e.val !== buyer && !/^\d+$/.test(e.val));
            if (found) styleName = found.val;
          }

          if (!storeRef) {
            const found = validEntries.find(e => /GMST|FB-|SR-|GT-|REF/i.test(e.val) || /^[A-Z0-9]{4,}-[A-Z0-9-]+$/i.test(e.val));
            if (found) storeRef = found.val;
          }

          if (!orderNo) {
            const found = validEntries.find(e => /GM\d+|PO\d+|ORD/i.test(e.val) || (e.val !== buyer && e.val !== styleName && e.val !== storeRef && /^[A-Z0-9]{4,}$/i.test(e.val)));
            if (found) orderNo = found.val;
          }

          const qtyPcs = Number(rawQty.replace(/[^0-9.]/g, '')) || 0;

          // Execute Cross-Matching
          const matchedRecords = matchRowAgainstDatabase(storeRef, styleName, jobNumber, buyer, sourceDb);
          const status: 'MATCHED' | 'BOOKING DUE' = matchedRecords.length > 0 ? 'MATCHED' : 'BOOKING DUE';

          return {
            id: `row_${index}_${Date.now()}`,
            slNo: index + 1,
            buyer: buyer || '-',
            styleName: styleName || '-',
            orderNo: orderNo || '-',
            storeRef: storeRef || '-',
            jobNumber: jobNumber || '-',
            orderQtyPcs: isNaN(qtyPcs) ? 0 : qtyPcs,
            ccd: ccd || '-',
            status,
            matchedRecords,
            rawRow: row
          };
        });

        setUploadedRows(parsed);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
      } finally {
        setIsProcessingExcel(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Re-run matching if database items update
  const handleReMatch = () => {
    if (uploadedRows.length === 0) return;
    setIsProcessingExcel(true);
    const sourceDb = dbSewingItems.length > 0 ? dbSewingItems : sewingThreadItems;

    const reMatched = uploadedRows.map(row => {
      const matchedRecords = matchRowAgainstDatabase(row.storeRef, row.styleName, row.jobNumber, row.buyer, sourceDb);
      const status: 'MATCHED' | 'BOOKING DUE' = matchedRecords.length > 0 ? 'MATCHED' : 'BOOKING DUE';
      return {
        ...row,
        status,
        matchedRecords
      };
    });

    setUploadedRows(reMatched);
    setIsProcessingExcel(false);
  };

  // Demo Sample Data Loader
  const handleLoadSampleData = () => {
    setIsProcessingExcel(true);
    setFileName('Sample_Planning_Actual_Order_Status.xlsx');

    const sampleOrders = [
      { buyer: 'Stanley Stella', styleName: 'STTU789 - FREESTYLER', orderNo: 'PO-98214', storeRef: 'SR-2026-881', jobNumber: 'JOB-9012', qtyPcs: 12500, ccd: '2026-08-15' },
      { buyer: 'KARIBAN', styleName: 'K401 - Hooded Sweat', orderNo: 'PO-33412', storeRef: 'SR-2026-554', jobNumber: 'JOB-8821', qtyPcs: 8400, ccd: '2026-08-18' },
      { buyer: 'DIADORA', styleName: 'DIA-RUNNER-20', orderNo: 'PO-77123', storeRef: 'SR-2026-102', jobNumber: 'JOB-4410', qtyPcs: 15000, ccd: '2026-08-20' },
      { buyer: 'Stanley Stella', styleName: 'STSU822 - CRUSER ZIP', orderNo: 'PO-98215', storeRef: 'SR-2026-990', jobNumber: 'JOB-9015', qtyPcs: 6200, ccd: '2026-08-22' },
      { buyer: 'KARIBAN', styleName: 'K356 - Vintage Polo', orderNo: 'PO-33418', storeRef: 'SR-2026-711', jobNumber: 'JOB-8830', qtyPcs: 4500, ccd: '2026-08-25' },
      { buyer: 'PUMA', styleName: 'PM-DRI-FIT-CREW', orderNo: 'PO-11209', storeRef: 'SR-2026-999', jobNumber: 'JOB-1102', qtyPcs: 20000, ccd: '2026-08-28' },
      { buyer: 'DIADORA', styleName: 'DIA-SPORT-TEE', orderNo: 'PO-77140', storeRef: 'SR-2026-303', jobNumber: 'JOB-4422', qtyPcs: 9800, ccd: '2026-08-30' },
      { buyer: 'Stanley Stella', styleName: 'STTU755 - EXPRESSER', orderNo: 'PO-98299', storeRef: 'SR-2026-123', jobNumber: 'JOB-9099', qtyPcs: 11000, ccd: '2026-09-02' }
    ];

    const sourceDb = dbSewingItems.length > 0 ? dbSewingItems : sewingThreadItems;

    setTimeout(() => {
      const parsed: PlanningAuditOrderRow[] = sampleOrders.map((row, index) => {
        const matchedRecords = matchRowAgainstDatabase(row.storeRef, row.styleName, row.jobNumber, row.buyer, sourceDb);
        const status: 'MATCHED' | 'BOOKING DUE' = matchedRecords.length > 0 ? 'MATCHED' : 'BOOKING DUE';

        return {
          id: `sample_${index}`,
          slNo: index + 1,
          buyer: row.buyer,
          styleName: row.styleName,
          orderNo: row.orderNo,
          storeRef: row.storeRef,
          jobNumber: row.jobNumber,
          orderQtyPcs: row.qtyPcs,
          ccd: row.ccd,
          status,
          matchedRecords
        };
      });

      setUploadedRows(parsed);
      setIsProcessingExcel(false);
    }, 400);
  };

  // Buyer list from uploaded excel
  const uploadedBuyers = useMemo(() => {
    const set = new Set<string>();
    uploadedRows.forEach(r => {
      if (r.buyer) set.add(r.buyer);
    });
    return Array.from(set).sort();
  }, [uploadedRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return uploadedRows.filter(row => {
      // Status filter
      if (filterStatus !== 'ALL' && row.status !== filterStatus) return false;

      // Buyer filter
      if (selectedBuyerFilter !== 'ALL' && row.buyer.toUpperCase() !== selectedBuyerFilter.toUpperCase()) return false;

      // Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.buyer.toLowerCase().includes(q) ||
        row.styleName.toLowerCase().includes(q) ||
        row.jobNumber.toLowerCase().includes(q) ||
        row.orderNo.toLowerCase().includes(q) ||
        row.storeRef.toLowerCase().includes(q)
      );
    });
  }, [uploadedRows, filterStatus, selectedBuyerFilter, searchQuery]);

  // Summary Metrics
  const auditMetrics = useMemo(() => {
    const totalOrders = uploadedRows.length;
    const matchedCount = uploadedRows.filter(r => r.status === 'MATCHED').length;
    const dueCount = uploadedRows.filter(r => r.status === 'BOOKING DUE').length;
    const totalQtyPcs = uploadedRows.reduce((acc, r) => acc + r.orderQtyPcs, 0);
    const matchedQtyPcs = uploadedRows.filter(r => r.status === 'MATCHED').reduce((acc, r) => acc + r.orderQtyPcs, 0);
    const dueQtyPcs = uploadedRows.filter(r => r.status === 'BOOKING DUE').reduce((acc, r) => acc + r.orderQtyPcs, 0);
    const matchRate = totalOrders > 0 ? Math.round((matchedCount / totalOrders) * 100) : 0;

    return {
      totalOrders,
      matchedCount,
      dueCount,
      totalQtyPcs,
      matchedQtyPcs,
      dueQtyPcs,
      matchRate
    };
  }, [uploadedRows]);

  // Export BOOKING DUE items to Excel
  const handleExportBookingDueExcel = () => {
    const bookingDueRows = uploadedRows.filter(r => r.status === 'BOOKING DUE');
    if (bookingDueRows.length === 0) {
      alert('No Booking Due items found in current audit.');
      return;
    }

    const columns: ExcelColumnDef[] = [
      { header: 'SL', key: 'slNo', width: 6, align: 'center' },
      { header: 'Buyer', key: 'buyer', width: 18, align: 'left' },
      { header: 'Style Name', key: 'styleName', width: 22, align: 'left' },
      { header: 'Order No', key: 'orderNo', width: 16, align: 'left' },
      { header: 'Store Ref (Stoe Reff.)', key: 'storeRef', width: 20, align: 'left' },
      { header: 'Job Number', key: 'jobNumber', width: 16, align: 'left' },
      { header: 'Order Qty (Pcs)', key: 'orderQtyPcs', type: 'number', width: 16, align: 'right' },
      { header: 'CCD / Target Date', key: 'ccd', width: 14, align: 'center' },
      { header: 'Audit Status', key: 'status_label', width: 16, align: 'center' },
      { header: 'Required Follow-up', key: 'followup', width: 26, align: 'left' }
    ];

    const formattedData = bookingDueRows.map((r, idx) => ({
      ...r,
      slNo: idx + 1,
      status_label: 'BOOKING DUE',
      followup: 'Issue Sewing Thread Booking to MCD Store immediately'
    }));

    generateCompanyMultiSheetExcel<any>({
      moduleName: 'Planning Audit - Sewing Thread Booking Due',
      fileNamePrefix: 'Planning_Sewing_Thread_Booking_Due_Report',
      data: formattedData,
      columns,
      getBuyerName: (r) => r.buyer || 'General Buyer',
      getBookingQty: (r) => r.orderQtyPcs,
      isUnreceived: () => true
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* HEADER BANNER */}
      <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-700/50' 
          : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-emerald-800/60'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl backdrop-blur-md">
              <FileText className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight">Planning Order vs Sewing Thread Audit Report</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Real-time Cross Match Engine
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                Upload Actual Order Status Excel file to verify Store Ref, Style & Job Number against Sewing Thread Database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {uploadedRows.length > 0 && (
              <button
                type="button"
                onClick={handleReMatch}
                disabled={isLoadingDb || isProcessingExcel}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
                title="Re-run matching against latest database records"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-300 ${isLoadingDb ? 'animate-spin' : ''}`} />
                <span>Re-Audit DB</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Database className="w-4 h-4 text-emerald-200" />
              <span>Load Demo Excel</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
                title="Close Audit Section"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UPLOAD & DATABASE STATUS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* EXCEL UPLOAD BOX */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-md ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                1. Upload Planning Order Status Excel
              </h3>
            </div>
            {fileName && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-mono font-bold truncate max-w-[200px]">
                {fileName}
              </span>
            )}
          </div>

          <div className="relative group border-2 border-dashed rounded-2xl border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 transition-all bg-emerald-50/40 dark:bg-emerald-950/10 p-8 text-center cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Click to Browse or Drag & Drop Excel File Here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Expected Excel Columns: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Buyer, Style Name, Order No., Stoe Reff., Job Number, Quantity in Piece, CCD</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm">
                <Upload className="w-3.5 h-3.5" /> Select .xlsx File
              </span>
            </div>
          </div>
        </div>

        {/* DATABASE STATUS CARD */}
        <div className={`p-6 rounded-3xl border shadow-md flex flex-col justify-between ${
          isLight ? 'bg-gradient-to-br from-slate-50 to-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Sewing Thread DB Status</span>
              <span className={`w-2.5 h-2.5 rounded-full ${isLoadingDb ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            </div>

            <h4 className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {dbSewingItems.length.toLocaleString()} <span className="text-xs font-normal text-slate-500">Records</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Loaded from Supabase <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">supabase_sewing_thread_all_rows</code> & local store.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-4 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
              <span>Matching Rules:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Store Ref & Job No</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
              <span>Status Output:</span>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">MATCHED</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">BOOKING DUE</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SUMMARY STAT METRICS CARDS */}
      {uploadedRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Orders */}
          <div className={`p-5 rounded-3xl border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Audited Orders</span>
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {auditMetrics.totalOrders}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Total Order Qty: {auditMetrics.totalQtyPcs.toLocaleString()} Pcs
            </p>
          </div>

          {/* Card 2: Matched Orders */}
          <div className={`p-5 rounded-3xl border shadow-sm ${
            isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-900 border-emerald-900/60'
          }`}>
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">Matched Booking Orders</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {auditMetrics.matchedCount}
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-bold">
              Matched Pcs: {auditMetrics.matchedQtyPcs.toLocaleString()} Pcs ({auditMetrics.matchRate}%)
            </p>
          </div>

          {/* Card 3: Booking Due Orders */}
          <div className={`p-5 rounded-3xl border shadow-sm ${
            isLight ? 'bg-rose-50/80 border-rose-300' : 'bg-slate-900 border-rose-900/60'
          }`}>
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">Booking Due Orders</span>
              <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {auditMetrics.dueCount}
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 font-bold">
              Due Pcs: {auditMetrics.dueQtyPcs.toLocaleString()} Pcs Pending
            </p>
          </div>

          {/* Card 4: Action Button */}
          <div className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-center items-center text-center ${
            isLight ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200' : 'bg-slate-900 border-indigo-900'
          }`}>
            <button
              onClick={handleExportBookingDueExcel}
              disabled={auditMetrics.dueCount === 0}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                auditMetrics.dueCount > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export {auditMetrics.dueCount} Booking Due Excel</span>
            </button>
            <p className="text-[11px] text-slate-500 mt-2">
              Instant follow-up file for commercial team
            </p>
          </div>

        </div>
      )}

      {/* CONTROL BAR & TABLE SECTION */}
      {uploadedRows.length > 0 && (
        <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          
          {/* CONTROL BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
            
            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({uploadedRows.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('MATCHED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'MATCHED'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Matched ({auditMetrics.matchedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('BOOKING DUE')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === 'BOOKING DUE'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Booking Due ({auditMetrics.dueCount})</span>
              </button>
            </div>

            {/* Right Controls: Search & Buyer Select */}
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Buyer, Style, Job..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Buyer Dropdown */}
              {uploadedBuyers.length > 0 && (
                <select
                  value={selectedBuyerFilter}
                  onChange={(e) => setSelectedBuyerFilter(e.target.value)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border outline-none cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                >
                  <option value="ALL">All Buyers ({uploadedBuyers.length})</option>
                  {uploadedBuyers.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

            </div>

          </div>

          {/* MAIN PLANNING AUDIT TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner">
            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
              <thead className={`font-black uppercase text-[11px] tracking-wider border-b ${
                isLight 
                  ? 'bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white border-slate-300' 
                  : 'bg-slate-950 text-emerald-300 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3 px-3 text-center border-r border-slate-700/60 w-12">Sl No</th>
                  <th className="py-3 px-3 border-r border-slate-700/60">Buyer</th>
                  <th className="py-3 px-3 border-r border-slate-700/60">Style Name</th>
                  <th className="py-3 px-3 border-r border-slate-700/60">Job Number / Order No</th>
                  <th className="py-3 px-3 border-r border-slate-700/60">Store Ref (Stoe Reff.)</th>
                  <th className="py-3 px-3 text-right border-r border-slate-700/60">Order Qty (Pcs)</th>
                  <th className="py-3 px-3 text-center border-r border-slate-700/60">CCD</th>
                  <th className="py-3 px-3 text-center border-r border-slate-700/60">Audit Status</th>
                  <th className="py-3 px-3 text-center">Action / Booking Match</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                      No order status rows match your current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isMatched = row.status === 'MATCHED';

                    return (
                      <tr 
                        key={row.id}
                        className={`transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${
                          isLight ? 'text-slate-800' : 'text-slate-200'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-400 border-r border-slate-300 dark:border-slate-800">
                          {row.slNo}
                        </td>

                        <td className="py-3 px-3 font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {row.buyer}
                        </td>

                        <td className="py-3 px-3 font-bold border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {row.styleName}
                        </td>

                        <td className="py-3 px-3 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          <div className="font-mono font-black text-slate-900 dark:text-white">{row.jobNumber}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.orderNo}</div>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {row.storeRef}
                        </td>

                        <td className="py-3 px-3 text-right font-black font-mono border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {row.orderQtyPcs.toLocaleString()} Pcs
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {row.ccd}
                        </td>

                        {/* Audit Status Badge */}
                        <td className="py-3 px-3 text-center border-r border-slate-300 dark:border-slate-800 whitespace-nowrap">
                          {isMatched ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>MATCHED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>BOOKING DUE</span>
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isMatched ? (
                            <button
                              type="button"
                              onClick={() => setSelectedMatchRow(row)}
                              className="px-3 py-1.5 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 mx-auto transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Booking Details ({row.matchedRecords.length})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedMatchRow(row)}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 mx-auto transition-all cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-rose-500" />
                              <span>View Excel Row ({Object.keys(row.rawRow || {}).length || 7} Cols)</span>
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* INTERACTIVE MATCH DETAIL MODAL / SLIDE-OVER DRAWER */}
      {selectedMatchRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-center justify-between ${
              isLight ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-800' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  selectedMatchRow.matchedRecords.length > 0 
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200' 
                    : 'bg-rose-500/20 border-rose-400/30 text-rose-200'
                }`}>
                  {selectedMatchRow.matchedRecords.length > 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight">
                      {selectedMatchRow.matchedRecords.length > 0 
                        ? 'Matched Sewing Thread Booking Records' 
                        : 'Uploaded Excel Row Details (No Booking Match)'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                      selectedMatchRow.matchedRecords.length > 0
                        ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                        : 'bg-rose-500/30 border-rose-400/40 text-rose-200'
                    }`}>
                      {selectedMatchRow.matchedRecords.length > 0 
                        ? `${selectedMatchRow.matchedRecords.length} Match(es) Found` 
                        : 'BOOKING DUE'}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Order Ref: <span className="font-mono font-bold">{selectedMatchRow.storeRef}</span> | Style: <span className="font-bold">{selectedMatchRow.styleName}</span> | Job: <span className="font-mono font-bold">{selectedMatchRow.jobNumber}</span> | Buyer: <span className="font-bold">{selectedMatchRow.buyer}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMatchRow(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Order Summary Banner */}
            <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium flex-wrap gap-2 ${
              isLight ? 'bg-indigo-50/60 border-indigo-100 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Buyer Name:</span>{' '}
                <span className="font-black text-emerald-700 dark:text-emerald-400">{selectedMatchRow.buyer}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Order Qty:</span>{' '}
                <span className="font-black font-mono text-slate-900 dark:text-white">{selectedMatchRow.orderQtyPcs.toLocaleString()} Pcs</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Order No:</span>{' '}
                <span className="font-mono font-bold">{selectedMatchRow.orderNo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">CCD:</span>{' '}
                <span className="font-mono font-bold">{selectedMatchRow.ccd}</span>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">

              {/* SECTION 1: RAW UPLOADED EXCEL ROW COLUMNS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Uploaded Excel Row Auto-Fitted Columns ({
                      selectedMatchRow.rawRow ? Object.keys(selectedMatchRow.rawRow).length : 7
                    } Columns Detected)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    File: <code className="font-bold text-emerald-500">{fileName || 'Uploaded_File.xlsx'}</code>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800">
                  <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                    <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                      isLight ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-950 text-emerald-400'
                    }`}>
                      <tr>
                        {selectedMatchRow.rawRow ? (
                          Object.keys(selectedMatchRow.rawRow).map((colName) => (
                            <th key={colName} className="py-2.5 px-3 border-r border-emerald-800 whitespace-nowrap">
                              {colName}
                            </th>
                          ))
                        ) : (
                          <>
                            <th className="py-2.5 px-3 border-r border-emerald-800">Buyer</th>
                            <th className="py-2.5 px-3 border-r border-emerald-800">Style Name</th>
                            <th className="py-2.5 px-3 border-r border-emerald-800">Order No</th>
                            <th className="py-2.5 px-3 border-r border-emerald-800">Store Ref</th>
                            <th className="py-2.5 px-3 border-r border-emerald-800">Job Number</th>
                            <th className="py-2.5 px-3 text-right border-r border-emerald-800">Quantity (Pcs)</th>
                            <th className="py-2.5 px-3 text-center">CCD</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      <tr className="bg-emerald-50/20 dark:bg-emerald-950/10">
                        {selectedMatchRow.rawRow ? (
                          Object.entries(selectedMatchRow.rawRow).map(([colName, colVal], idx) => (
                            <td key={idx} className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap font-semibold">
                              {colVal !== undefined && colVal !== null && String(colVal).trim() !== '' ? String(colVal) : '-'}
                            </td>
                          ))
                        ) : (
                          <>
                            <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.buyer}</td>
                            <td className="py-2.5 px-3 font-bold border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.styleName}</td>
                            <td className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.orderNo}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.storeRef}</td>
                            <td className="py-2.5 px-3 font-mono border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.jobNumber}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.orderQtyPcs.toLocaleString()} Pcs</td>
                            <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300 dark:border-slate-800">{selectedMatchRow.ccd}</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: SUPABASE SEWING THREAD MATCHES */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>Supabase Database Sewing Thread Booking Matches ({selectedMatchRow.matchedRecords.length} Items)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Auto-synced from <code className="font-bold text-indigo-400">supabase_sewing_thread_all_rows</code>
                  </span>
                </div>

                {selectedMatchRow.matchedRecords.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <h5 className="text-sm font-black text-rose-800 dark:text-rose-300">No Booking Record Found in Database</h5>
                    <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
                      No matching sewing thread booking entry was found in Supabase for Store Ref <code className="font-mono font-bold px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60">{selectedMatchRow.storeRef}</code> or Job Number <code className="font-mono font-bold px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60">{selectedMatchRow.jobNumber}</code>.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const priorityOrder = [
                      'buyer_name', 'buyer', 'style', 'job_no', 's_thread_ref', 'store_ref', 'sr_gt',
                      'colour', 'color', 'count', 'thread_count', 'meter',
                      'booking_qty', 'receive_qty', 'balance_qty', 'unit', 'supplier', 'remarks'
                    ];

                    const keysSet = new Set<string>();
                    selectedMatchRow.matchedRecords.forEach(r => {
                      Object.keys(r).forEach(k => {
                        if (!['id', 'created_at', 'updated_at'].includes(k) && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
                          keysSet.add(k);
                        }
                      });
                    });

                    const dynamicKeys = Array.from(keysSet).sort((a, b) => {
                      const idxA = priorityOrder.indexOf(a);
                      const idxB = priorityOrder.indexOf(b);
                      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                      if (idxA !== -1) return -1;
                      if (idxB !== -1) return 1;
                      return a.localeCompare(b);
                    });

                    const formatLabel = (k: string) => {
                      const labels: Record<string, string> = {
                        s_thread_ref: 'S.Thread Ref',
                        store_ref: 'Store Ref',
                        sr_gt: 'SR / GT No',
                        colour: 'Color',
                        color: 'Color',
                        count: 'Count',
                        thread_count: 'Count',
                        meter: 'Meter / Cone',
                        booking_qty: 'Booking Qty',
                        receive_qty: 'Receive Qty',
                        balance_qty: 'Balance Qty',
                        buyer_name: 'Buyer Name',
                        buyer: 'Buyer Name',
                        job_no: 'Job No',
                        style: 'Style Name',
                        po_no: 'PO No',
                        order_no: 'Order No'
                      };
                      return labels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    };

                    return (
                      <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800">
                        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                          <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                            isLight ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-950 text-indigo-300'
                          }`}>
                            <tr>
                              <th className="py-2.5 px-3 text-center border-r border-indigo-800 w-10">#</th>
                              {dynamicKeys.map(k => (
                                <th 
                                  key={k} 
                                  className={`py-2.5 px-3 border-r border-indigo-800 whitespace-nowrap ${
                                    k.includes('qty') || k.includes('amount') || k.includes('pcs') ? 'text-right' : ''
                                  }`}
                                >
                                  {formatLabel(k)}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                            {selectedMatchRow.matchedRecords.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-300 dark:border-slate-800">
                                  {idx + 1}
                                </td>
                                {dynamicKeys.map(k => {
                                  const val = item[k];
                                  const isNum = typeof val === 'number' || (k.includes('qty') && !isNaN(Number(val)));
                                  const displayVal = isNum && val !== '' ? Number(val).toLocaleString() : (val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '-');

                                  return (
                                    <td 
                                      key={k} 
                                      className={`py-2.5 px-3 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap ${
                                        isNum ? 'text-right font-mono font-bold' : ''
                                      } ${
                                        k === 's_thread_ref' || k === 'store_ref' ? 'font-mono font-bold text-indigo-600 dark:text-indigo-400' : ''
                                      } ${
                                        k === 'receive_qty' ? 'text-emerald-600 dark:text-emerald-400' : ''
                                      } ${
                                        k === 'balance_qty' ? 'text-rose-600 dark:text-rose-400 font-black' : ''
                                      }`}
                                    >
                                      {displayVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-end ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedMatchRow(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-md cursor-pointer hover:opacity-90 transition-opacity"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
