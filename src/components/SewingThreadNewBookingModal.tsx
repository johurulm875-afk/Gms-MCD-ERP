import React, { useState, useRef } from 'react';
import { SewingThreadItem } from '../types';
import { X, Plus, Package, Tag, Save, Sparkles, CheckCircle2, AlertTriangle, Upload, FileText, Loader2, ArrowRight, Key } from 'lucide-react';
import { extractPdfClientSide } from '../utils/clientGeminiExtractor';

interface SewingThreadNewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBooking: (newItem: Omit<SewingThreadItem, 'id'> | Omit<SewingThreadItem, 'id'>[]) => Promise<void>;
  existingBuyers?: string[];
}

interface ThreadColourRow {
  id: string;
  colour: string;
  thread_count: string;
  shade_no: string;
  booking_qty: number | '';
}

export const SewingThreadNewBookingModal: React.FC<SewingThreadNewBookingModalProps> = ({
  isOpen,
  onClose,
  onAddBooking,
  existingBuyers = ['Stanley Stella', 'KARIBAN', 'DIADORA', 'H&M', 'ZARA']
}) => {
  function getTodayFormatted(): string {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  const [formData, setFormData] = useState<Omit<SewingThreadItem, 'id'>>({
    buyer_name: 'Stanley Stella',
    buyer: 'Stanley Stella',
    date: getTodayFormatted(),
    booking_challan: '',
    style: '',
    order_no: '',
    sr_gt: '',
    store_ref: 'GMST-ST-26-',
    s_thread_ref: 'GMST-ST-26-',
    job_no: '',
    colour: '',
    color: '',
    item_name: 'Spun Polyester Thread',
    thread_count: '40/2',
    count: '40/2',
    shade_no: '',
    pantone: '',
    meter: '',
    per_body_consm: '',
    supplier: '',
    qc_not_ok: false,
    booking_qty: 0,
    receive_qty: 0,
    rcvd_date: '',
    receive_date: '',
    rcvd_challan: '',
    receive_challan: '',
    issue_qty: 0,
    issue_date: '',
    issue_challan: '',
    balance_qty: 0,
    remarks: '',
    receive_logs: [],
    issue_logs: []
  });

  // Multi-colour / shade rows state
  const [colourRows, setColourRows] = useState<ThreadColourRow[]>([
    { id: '1', colour: '', thread_count: '40/2', shade_no: '', booking_qty: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customBuyer, setCustomBuyer] = useState('');
  const [useCustomBuyer, setUseCustomBuyer] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedCount, setSavedCount] = useState(1);

  // AI PDF Extractor state
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<any[] | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doResetForm = () => {
    setFormData({
      buyer_name: existingBuyers[0] || 'Stanley Stella',
      buyer: existingBuyers[0] || 'Stanley Stella',
      date: getTodayFormatted(),
      booking_challan: '',
      style: '',
      order_no: '',
      sr_gt: '',
      store_ref: 'GMST-ST-26-',
      s_thread_ref: 'GMST-ST-26-',
      job_no: '',
      colour: '',
      color: '',
      item_name: 'Spun Polyester Thread',
      thread_count: '40/2',
      count: '40/2',
      shade_no: '',
      pantone: '',
      meter: '',
      per_body_consm: '',
      supplier: '',
      qc_not_ok: false,
      booking_qty: 0,
      receive_qty: 0,
      rcvd_date: '',
      receive_date: '',
      rcvd_challan: '',
      receive_challan: '',
      issue_qty: 0,
      issue_date: '',
      issue_challan: '',
      balance_qty: 0,
      remarks: '',
      receive_logs: [],
      issue_logs: []
    });
    setColourRows([
      { id: '1', colour: '', thread_count: '40/2', shade_no: '', booking_qty: '' }
    ]);
    setCustomBuyer('');
    setUseCustomBuyer(false);
    setExtractedItems(null);
    setPdfFileName(null);
    setPdfError(null);
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setPdfError("Please select a valid PDF Work Order / Booking Report file.");
      return;
    }

    setIsAnalyzingPdf(true);
    setPdfError(null);
    setExtractedItems(null);
    setPdfFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          let items: any[] = [];
          let isBackendSuccess = false;

          // 1. First try backend Express API
          try {
            const res = await fetch('/api/extract-sewing-thread-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdfBase64: base64Data, mimeType: 'application/pdf' })
            });

            const rawText = await res.text();
            if (res.ok && rawText && !rawText.startsWith('<') && !rawText.includes('<html>')) {
              const data = JSON.parse(rawText);
              if (data.success && Array.isArray(data.data)) {
                items = data.data;
                isBackendSuccess = true;
              }
            }
          } catch (backendErr) {
            console.warn("Backend API not reachable (GitHub Pages / static host), falling back to client-side extraction:", backendErr);
          }

          // 2. If backend endpoint returned HTML/404 or failed (e.g. on GitHub Pages), fallback to client-side Gemini extraction
          if (!isBackendSuccess) {
            console.log("Using Client-Side Gemini Extraction for GitHub Pages static host...");
            items = await extractPdfClientSide(base64Data, 'application/pdf', userApiKey);
          }

          if (!Array.isArray(items) || items.length === 0) {
            setPdfError("No thread booking rows could be extracted from this PDF. Please check the document format.");
          } else {
            setExtractedItems(items);
          }
        } catch (err: any) {
          console.error("PDF Extraction Error:", err);
          if (err.message?.includes("Gemini API Key")) {
            setShowApiKeyInput(true);
          }
          setPdfError(err.message || "An error occurred while parsing PDF.");
        } finally {
          setIsAnalyzingPdf(false);
        }
      };

      reader.onerror = () => {
        setPdfError("Failed to read PDF file.");
        setIsAnalyzingPdf(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setPdfError(err.message || "Unexpected upload error.");
      setIsAnalyzingPdf(false);
    }
  };

  const applyExtractedToForm = () => {
    if (!extractedItems || extractedItems.length === 0) return;
    const headerItem = extractedItems[0];

    const extractedBuyer = headerItem.buyer || headerItem.buyer_name || '';
    if (extractedBuyer) {
      if (!existingBuyers.includes(extractedBuyer)) {
        setUseCustomBuyer(true);
        setCustomBuyer(extractedBuyer);
      } else {
        setUseCustomBuyer(false);
      }
    }

    setFormData(prev => ({
      ...prev,
      buyer: extractedBuyer || prev.buyer,
      buyer_name: extractedBuyer || prev.buyer_name,
      job_no: headerItem.job_no || prev.job_no,
      style: headerItem.style || prev.style,
      order_no: headerItem.order_no || prev.order_no,
      sr_gt: headerItem.sr_gt || prev.sr_gt,
      store_ref: headerItem.s_thread_ref || headerItem.store_ref || prev.store_ref,
      s_thread_ref: headerItem.s_thread_ref || headerItem.store_ref || prev.s_thread_ref,
      supplier: headerItem.supplier || prev.supplier,
      thread_count: headerItem.count || headerItem.thread_count || prev.thread_count,
      count: headerItem.count || headerItem.thread_count || prev.count,
      meter: (headerItem.meter && !String(headerItem.meter).toUpperCase().includes('CM') && !String(headerItem.meter).includes('114')) ? String(headerItem.meter) : prev.meter,
      per_body_consm: headerItem.per_body_consm != null ? String(headerItem.per_body_consm) : prev.per_body_consm,
      remarks: headerItem.remarks || prev.remarks
    }));

    const rows: ThreadColourRow[] = extractedItems.map((item, idx) => ({
      id: String(idx + 1) + Date.now(),
      colour: (item.colour || item.color || '').toUpperCase(),
      thread_count: item.count || item.thread_count || headerItem.count || '40/2',
      shade_no: item.pantone || item.shade_no || '',
      booking_qty: Number(item.booking_qty) || 0
    }));

    setColourRows(rows);
    setExtractedItems(null);
  };

  const saveExtractedDirectly = async () => {
    if (!extractedItems || extractedItems.length === 0) return;
    try {
      setIsSubmitting(true);
      const itemsToInsert: Omit<SewingThreadItem, 'id'>[] = extractedItems.map(item => {
        const bQty = Number(item.booking_qty) || 0;
        const bName = item.buyer || item.buyer_name || formData.buyer_name || 'General Buyer';
        const stRef = item.s_thread_ref || item.store_ref || formData.store_ref || 'GMST-ST-26-001';
        const col = (item.colour || item.color || '').toUpperCase();
        const tCount = item.count || item.thread_count || '40/2';
        const sNo = item.pantone || item.shade_no || '';

        return {
          buyer: bName,
          buyer_name: bName,
          date: getTodayFormatted(),
          booking_challan: '',
          style: item.style || '',
          order_no: item.order_no || '',
          sr_gt: item.sr_gt || '',
          store_ref: stRef,
          s_thread_ref: stRef,
          job_no: item.job_no || '',
          colour: col,
          color: col,
          item_name: 'Spun Polyester Thread',
          count: tCount,
          thread_count: tCount,
          shade_no: sNo,
          pantone: sNo,
          meter: (item.meter && !String(item.meter).toUpperCase().includes('CM') && !String(item.meter).includes('114')) ? String(item.meter) : '',
          per_body_consm: item.per_body_consm != null ? String(item.per_body_consm) : '',
          supplier: item.supplier || '',
          qc_not_ok: false,
          booking_qty: bQty,
          receive_qty: 0,
          rcvd_date: '',
          receive_date: '',
          rcvd_challan: '',
          receive_challan: '',
          issue_qty: 0,
          issue_date: '',
          issue_challan: '',
          balance_qty: bQty,
          remarks: item.remarks || '',
          receive_logs: [],
          issue_logs: []
        };
      });

      await onAddBooking(itemsToInsert.length === 1 ? itemsToInsert[0] : itemsToInsert);
      setSavedCount(itemsToInsert.length);
      setShowSuccessPopup(true);
      doResetForm();

      setTimeout(() => {
        setShowSuccessPopup(false);
        onClose();
      }, 1200);

    } catch (err) {
      console.error("Error direct importing extracted items:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddColourRow = () => {
    const lastRow = colourRows[colourRows.length - 1];
    setColourRows(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        colour: '',
        thread_count: lastRow ? lastRow.thread_count : formData.thread_count || '40/2',
        shade_no: '',
        booking_qty: ''
      }
    ]);
  };

  const handleRemoveColourRow = (id: string) => {
    if (colourRows.length === 1) return;
    setColourRows(prev => prev.filter(r => r.id !== id));
  };

  const handleColourRowChange = (id: string, field: keyof ThreadColourRow, value: string | number) => {
    setColourRows(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleChange = (field: keyof Omit<SewingThreadItem, 'id'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const processSubmit = async (shouldCloseModal: boolean) => {
    try {
      setIsSubmitting(true);
      const finalBuyer = useCustomBuyer ? customBuyer.trim() : (formData.buyer_name || formData.buyer || '');
      
      const validColourRows = colourRows.filter(r => r.colour.trim().length > 0);
      if (validColourRows.length === 0) {
        alert("Please enter at least one Colour name");
        setIsSubmitting(false);
        return;
      }

      const stRef = formData.store_ref || formData.s_thread_ref || '';

      // Generate a booking object for each colour/shade row matching Supabase columns
      const itemsToInsert: Omit<SewingThreadItem, 'id'>[] = validColourRows.map(row => {
        const bQty = Number(row.booking_qty) || 0;
        const rQty = Number(formData.receive_qty) || 0;
        const iQty = Number(formData.issue_qty) || 0;

        if (iQty > rQty) {
          throw new Error(`❌ Issue Qty (${iQty}) cannot exceed Receive Qty (${rQty})! (ইস্যু পরিমাণ রিসিভ পরিমাণের চেয়ে বেশি হতে পারবে না)`);
        }

        const balQty = rQty > 0 ? Math.max(0, rQty - iQty) : 0;
        const col = row.colour.trim().toUpperCase();
        const tCount = row.thread_count || formData.thread_count || '40/2';
        const sNo = row.shade_no.trim().toUpperCase() || formData.shade_no || formData.pantone || '';

        return {
          ...formData,
          buyer: finalBuyer || 'General Buyer',
          buyer_name: finalBuyer || 'General Buyer',
          date: formData.date || getTodayFormatted(),
          booking_challan: formData.booking_challan || '',
          style: formData.style || '',
          order_no: formData.order_no || '',
          sr_gt: formData.sr_gt || '',
          store_ref: stRef,
          s_thread_ref: stRef,
          job_no: formData.job_no || '',
          colour: col,
          color: col,
          item_name: formData.item_name || 'Spun Polyester Thread',
          count: tCount,
          thread_count: tCount,
          shade_no: sNo,
          pantone: sNo,
          meter: formData.meter || '',
          per_body_consm: formData.per_body_consm || '',
          supplier: formData.supplier || '',
          qc_not_ok: formData.qc_not_ok || false,
          booking_qty: bQty,
          receive_qty: rQty,
          rcvd_date: formData.receive_date || formData.rcvd_date || '',
          receive_date: formData.receive_date || formData.rcvd_date || '',
          rcvd_challan: formData.receive_challan || formData.rcvd_challan || '',
          receive_challan: formData.receive_challan || formData.rcvd_challan || '',
          issue_qty: iQty,
          issue_date: formData.issue_date || '',
          issue_challan: formData.issue_challan || '',
          balance_qty: balQty,
          remarks: formData.remarks || ''
        };
      });

      await onAddBooking(itemsToInsert.length === 1 ? itemsToInsert[0] : itemsToInsert);

      // Show prominent centered success modal
      setSavedCount(itemsToInsert.length);
      setShowSuccessPopup(true);

      // Reset form immediately so all fields/rows become completely blank for next posting
      doResetForm();

      setTimeout(() => {
        setShowSuccessPopup(false);
        if (shouldCloseModal) {
          onClose();
        }
      }, 1200);

    } catch (err) {
      console.error("Error creating sewing thread booking:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processSubmit(false); // Default to Save & Add Next (keep modal open)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      
      {/* Center Success Popup Overlay */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-emerald-500 text-center max-w-sm mx-auto animate-in zoom-in-90 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">Saved Successfully!</h3>
            <p className="text-sm font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-full inline-block border border-emerald-200 mb-2">
              {savedCount} Item(s) Posted / সফলভাবে সেভ হয়েছে!
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Form rows cleared! Next booking form ready.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New Sewing Thread Booking</h2>
              <p className="text-xs text-slate-300">Continuous Batch Booking Enabled (Auto Blank on Save)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 0: AI PDF Work Order Extractor */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white border border-indigo-800/80 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                    <span>AI PDF Work Order Extractor</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      Gemini 3.6 Flash
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Upload Garments Sewing Thread Booking PDF to extract all line items automatically
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(prev => !prev)}
                  title="Configure Gemini API Key for GitHub Pages / Static Hosting"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <Key className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  type="button"
                  disabled={isAnalyzingPdf}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Analyzing PDF...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload PDF Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Gemini API Key Input for GitHub Pages */}
            {showApiKeyInput && (
              <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GitHub Pages / Client-Side Gemini API Key</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Saved in browser localStorage
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key (e.g. AIzaSy...)"
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-white font-mono text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('gemini_api_key', userApiKey);
                      setShowApiKeyInput(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {pdfError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}

            {/* AI Extraction Results Preview Banner */}
            {extractedItems && extractedItems.length > 0 && (
              <div className="mt-3 p-4 bg-slate-900/90 border border-emerald-500/50 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white">
                        Extracted {extractedItems.length} Thread Booking Item(s)
                      </span>
                      {pdfFileName && <span className="text-[11px] text-slate-400 ml-2">({pdfFileName})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyExtractedToForm}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Populate Form Below
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={saveExtractedDirectly}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Directly Import & Save All ({extractedItems.length})
                    </button>
                  </div>
                </div>

                {/* Header Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                  <div><span className="text-slate-500">Buyer:</span> <strong className="text-emerald-300">{extractedItems[0]?.buyer || extractedItems[0]?.buyer_name || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Job No:</span> <strong className="text-white">{extractedItems[0]?.job_no || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Style:</span> <strong className="text-white">{extractedItems[0]?.style || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Order/PO:</span> <strong className="text-white">{extractedItems[0]?.order_no || 'N/A'}</strong></div>
                </div>

                {/* Extracted Line Items List */}
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {extractedItems.map((item, idx) => {
                    const cleanQty = Math.round(((Number(item.booking_qty) || 0) + Number.EPSILON) * 100) / 100;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-800/80 p-2 rounded border border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold uppercase text-white">{item.colour || item.color}</span>
                          {item.count && <span className="text-[11px] text-slate-400">({item.count})</span>}
                          {item.pantone && <span className="text-[11px] font-mono text-emerald-300">{item.pantone}</span>}
                        </div>
                        <div className="font-extrabold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                          {cleanQty} Cones
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 1: Buyer & Order Identification */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              1. Buyer & Order Details (buyer, job_no, style, order_no, sr_gt, s_thread_ref)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Buyer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buyer * (`buyer`)</label>
                {!useCustomBuyer ? (
                  <select
                    value={formData.buyer_name || formData.buyer}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setUseCustomBuyer(true);
                      } else {
                        handleChange('buyer_name', e.target.value);
                        handleChange('buyer', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {existingBuyers.map(buyer => (
                      <option key={buyer} value={buyer}>{buyer}</option>
                    ))}
                    <option value="CUSTOM">+ Add Custom Buyer...</option>
                  </select>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customBuyer}
                      onChange={(e) => setCustomBuyer(e.target.value)}
                      placeholder="Enter buyer name..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setUseCustomBuyer(false)}
                      className="px-2 py-1 text-[11px] bg-slate-200 hover:bg-slate-300 rounded text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Job No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job No (`job_no`)</label>
                <input
                  type="text"
                  value={formData.job_no || ''}
                  onChange={(e) => handleChange('job_no', e.target.value)}
                  placeholder="e.g. JOB-26-0593"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style * (`style`)</label>
                <input
                  type="text"
                  value={formData.style || ''}
                  onChange={(e) => handleChange('style', e.target.value)}
                  placeholder="e.g. SASU004 Changer 2.0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Order No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order No / PO * (`order_no`)</label>
                <input
                  type="text"
                  value={formData.order_no || ''}
                  onChange={(e) => handleChange('order_no', e.target.value)}
                  placeholder="e.g. PO No 10002455"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* SR/GT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SR / GT (`sr_gt`)</label>
                <input
                  type="text"
                  value={formData.sr_gt || ''}
                  onChange={(e) => handleChange('sr_gt', e.target.value)}
                  placeholder="e.g. SR-101 / GT-02"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Store Ref / s_thread_ref */}
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center justify-between">
                  <span>Store Ref. (`s_thread_ref`) *</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">Store Key</span>
                </label>
                <input
                  type="text"
                  value={formData.store_ref || formData.s_thread_ref || ''}
                  onChange={(e) => {
                    handleChange('store_ref', e.target.value);
                    handleChange('s_thread_ref', e.target.value);
                  }}
                  placeholder="e.g. GMST-ST-26-00100"
                  className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

            </div>
          </div>

          {/* SECTION 2: Thread Technical Specifications & Supplier */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              2. Technical Specifications (`count`, `meter`, `per_body_consm`, `supplier`, `qc_not_ok`)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Count / Thread Count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thread Count (`count`)</label>
                <input
                  type="text"
                  value={formData.thread_count || formData.count || ''}
                  onChange={(e) => {
                    handleChange('thread_count', e.target.value);
                    handleChange('count', e.target.value);
                  }}
                  placeholder="e.g. 40/2, 20/2, 50/2"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Meter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meter / Cone (`meter`)</label>
                <input
                  type="text"
                  value={formData.meter || ''}
                  onChange={(e) => handleChange('meter', e.target.value)}
                  placeholder="e.g. 5000M"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Per Body Consumption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Per Body Consm (`per_body_consm`)</label>
                <input
                  type="text"
                  value={formData.per_body_consm || ''}
                  onChange={(e) => handleChange('per_body_consm', e.target.value)}
                  placeholder="e.g. 120M/Garment"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier (`supplier`)</label>
                <input
                  type="text"
                  value={formData.supplier || ''}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="e.g. Coats, Wellspun, A&E"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            {/* QC Status toggle */}
            <div className="pt-2 flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">QC Status (`qc_not_ok`):</label>
              <button
                type="button"
                onClick={() => handleChange('qc_not_ok', !formData.qc_not_ok)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  formData.qc_not_ok 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {formData.qc_not_ok ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>QC NOT OK (Flagged)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>QC OK (Passed)</span>
                  </>
                )}
              </button>
            </div>

            {/* MULTI-COLOUR (+) ENTRY BLOCK */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5 uppercase">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Colour (`colour`), Pantone / Shade (`pantone`) & Booking Qty (`booking_qty`)
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Add multiple colours, pantones, and quantities for this booking
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddColourRow}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  + Add Colour
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {colourRows.map((row, index) => (
                  <div key={row.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-300 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 w-5 shrink-0">
                      #{index + 1}
                    </span>

                    {/* Colour Name */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={row.colour}
                        onChange={(e) => handleColourRowChange(row.id, 'colour', e.target.value)}
                        placeholder="Colour Name (`colour`) e.g. BLACK"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    {/* Thread Count */}
                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        value={row.thread_count}
                        onChange={(e) => handleColourRowChange(row.id, 'thread_count', e.target.value)}
                        placeholder="Count (`count`)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Shade / Pantone */}
                    <div className="w-28 shrink-0">
                      <input
                        type="text"
                        value={row.shade_no}
                        onChange={(e) => handleColourRowChange(row.id, 'shade_no', e.target.value)}
                        placeholder="Pantone/Shade (`pantone`)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Booking Qty */}
                    <div className="w-32 shrink-0">
                      <input
                        type="number"
                        step="any"
                        value={row.booking_qty}
                        onChange={(e) => handleColourRowChange(row.id, 'booking_qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="Book Qty (`booking_qty`)"
                        className="w-full px-2.5 py-1.5 bg-yellow-50 border border-yellow-300 rounded text-xs font-bold text-yellow-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        required
                      />
                    </div>

                    {/* Remove Row Button */}
                    {colourRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColourRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (`remarks`)</label>
            <input
              type="text"
              value={formData.remarks || ''}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="e.g. Urgent delivery, shade matching required..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => processSubmit(true)}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all active:scale-98 disabled:opacity-50"
              >
                Save & Close (সেভ ও বন্ধ করুন)
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save & Add Next (সেভ ও নতুন বুকিং)'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

