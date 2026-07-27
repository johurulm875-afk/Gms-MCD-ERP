import React, { useState, useRef } from 'react';
import { DrawstringItem } from '../types';
import { X, Plus, Package, Tag, Save, Sparkles, CheckCircle2, Upload, FileText, Loader2, ArrowRight, Key, AlertTriangle } from 'lucide-react';
import { extractPdfClientSide } from '../utils/clientGeminiExtractor';

interface DrawstringNewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBooking: (newItem: Omit<DrawstringItem, 'id'> | Omit<DrawstringItem, 'id'>[]) => Promise<void>;
  existingBuyers?: string[];
}

interface DrawstringVariantRow {
  id: string;
  color: string;
  size: string;
  booking_qty: number | '';
  item_name: string;
}

export const DrawstringNewBookingModal: React.FC<DrawstringNewBookingModalProps> = ({
  isOpen,
  onClose,
  onAddBooking,
  existingBuyers = ['STANLEY STELLA', 'KARIBAN', 'JAKO', 'COCOMO', 'ESSENTIAL', 'JADOUBE-OLC']
}) => {
  function getTodayFormatted(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const [headerData, setHeaderData] = useState({
    buyer: existingBuyers[0] || 'STANLEY STELLA',
    booking_date: getTodayFormatted(),
    ref_no_job_no: '',
    sr_gt_no: '',
    po_no: '',
    remarks: ''
  });

  const [variantRows, setVariantRows] = useState<DrawstringVariantRow[]>([
    { id: '1', color: '', size: '114 CM', booking_qty: '', item_name: 'DRAWSTRING' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customBuyer, setCustomBuyer] = useState('');
  const [useCustomBuyer, setUseCustomBuyer] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedCount, setSavedCount] = useState(1);

  // PDF Extraction States
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<any[] | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setHeaderData({
      buyer: existingBuyers[0] || 'STANLEY STELLA',
      booking_date: getTodayFormatted(),
      ref_no_job_no: '',
      sr_gt_no: '',
      po_no: '',
      remarks: ''
    });
    setVariantRows([
      { id: '1', color: '', size: '114 CM', booking_qty: '', item_name: 'DRAWSTRING' }
    ]);
    setCustomBuyer('');
    setUseCustomBuyer(false);
    setExtractedItems(null);
    setPdfError(null);
    setPdfFileName(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setPdfError("Please select a valid PDF Work Order / Booking Report file.");
      return;
    }

    setIsAnalyzingPdf(true);
    setPdfError(null);
    setExtractedItems(null);
    setPdfFileName(file.name);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
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
            console.warn("Backend API not reachable, falling back to client-side extraction:", backendErr);
          }

          // 2. Fallback to client-side Gemini extraction
          if (!isBackendSuccess) {
            console.log("Using Client-Side Gemini Extraction...");
            items = await extractPdfClientSide(base64Data, 'application/pdf', userApiKey);
          }

          if (!Array.isArray(items) || items.length === 0) {
            setPdfError("No drawstring booking rows could be extracted from this PDF. Please check the document format.");
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
    } catch (err: any) {
      setPdfError(err.message || "Failed to read PDF file.");
      setIsAnalyzingPdf(false);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const populateFormFromPdf = () => {
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

    setHeaderData(prev => ({
      ...prev,
      buyer: extractedBuyer || prev.buyer,
      booking_date: headerItem.booking_date || headerItem.date || prev.booking_date || getTodayFormatted(),
      ref_no_job_no: headerItem.job_no || headerItem.ref_no_job_no || prev.ref_no_job_no,
      sr_gt_no: headerItem.sr_gt || headerItem.sr_gt_no || prev.sr_gt_no,
      po_no: headerItem.order_no || headerItem.po_no || prev.po_no,
      remarks: headerItem.remarks || prev.remarks
    }));

    const rows: DrawstringVariantRow[] = extractedItems.map((item, idx) => ({
      id: `${Date.now()}-${idx}`,
      item_name: (item.count || item.item_name || 'DRAWSTRING').toString().toUpperCase(),
      color: (item.colour || item.color || '').toString().toUpperCase(),
      size: (item.meter || item.pantone || item.size || '114 CM').toString().toUpperCase(),
      booking_qty: Number(item.booking_qty) || ''
    }));

    setVariantRows(rows);
  };

  const handleDirectImportAll = async () => {
    if (!extractedItems || extractedItems.length === 0) return;

    try {
      setIsSubmitting(true);

      const itemsToInsert: Omit<DrawstringItem, 'id'>[] = extractedItems.map(item => {
        const finalBuyer = (item.buyer || item.buyer_name || headerData.buyer || 'STANLEY STELLA').toString().toUpperCase();
        const bQty = Number(item.booking_qty) || 0;
        const colorName = (item.colour || item.color || 'STANDARD').toString().toUpperCase();
        const itemName = (item.count || item.item_name || 'DRAWSTRING').toString().toUpperCase();
        const sizeVal = (item.meter || item.pantone || item.size || '114 CM').toString().toUpperCase();
        const jobNo = (item.job_no || item.ref_no_job_no || headerData.ref_no_job_no || 'DS-JOB').toString();
        const srGt = (item.sr_gt || item.sr_gt_no || headerData.sr_gt_no || 'DS-SRGT').toString();
        const poNo = (item.order_no || item.po_no || headerData.po_no || 'DS-PO').toString();

        return {
          buyer: finalBuyer,
          buyer_name: finalBuyer,
          booking_date: item.booking_date || headerData.booking_date || getTodayFormatted(),
          date: item.booking_date || headerData.booking_date || getTodayFormatted(),
          ref_no_job_no: jobNo,
          style: item.style || jobNo || itemName,
          sr_gt_no: srGt,
          store_ref: item.s_thread_ref || srGt || 'DS-REF',
          po_no: poNo,
          order_no: poNo,
          item_name: itemName,
          drawstring_type: itemName,
          color: colorName,
          colour: colorName,
          size: sizeVal,
          size_mm: sizeVal,
          unit: 'PCS',
          booking_qty: bQty,
          rcv_qty: 0,
          receive_qty: 0,
          due_qty: bQty,
          balance_qty: bQty,
          last_rcvd_qty: 0,
          rcvd_date: item.rcvd_date || '',
          receive_date: '',
          receive_challan: '',
          issue_qty: 0,
          issue_date: '',
          issue_challan: '',
          remarks: item.remarks || '',
          receive_logs: [],
          issue_logs: []
        };
      });

      await onAddBooking(itemsToInsert.length === 1 ? itemsToInsert[0] : itemsToInsert);

      setSavedCount(itemsToInsert.length);
      setShowSuccessPopup(true);

      resetForm();

      setTimeout(() => {
        setShowSuccessPopup(false);
        onClose();
      }, 1300);

    } catch (err) {
      console.error("Error direct importing extracted drawstring items:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRow = () => {
    const lastRow = variantRows[variantRows.length - 1];
    setVariantRows(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        color: '',
        size: lastRow ? lastRow.size : '114 CM',
        booking_qty: '',
        item_name: lastRow ? lastRow.item_name : 'DRAWSTRING'
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (variantRows.length === 1) return;
    setVariantRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof DrawstringVariantRow, value: string | number) => {
    setVariantRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const processSubmit = async (shouldCloseModal: boolean) => {
    try {
      setIsSubmitting(true);
      const finalBuyer = useCustomBuyer ? customBuyer.trim().toUpperCase() : (headerData.buyer || 'STANLEY STELLA');
      
      const validRows = variantRows.filter(r => r.color.trim().length > 0 && Number(r.booking_qty) > 0);
      if (validRows.length === 0) {
        alert("Please enter at least one valid row with Color name and Booking Qty > 0");
        setIsSubmitting(false);
        return;
      }

      const itemsToInsert: Omit<DrawstringItem, 'id'>[] = validRows.map(row => {
        const bQty = Number(row.booking_qty) || 0;
        const colorName = row.color.trim().toUpperCase();
        const itemName = row.item_name.trim().toUpperCase() || 'DRAWSTRING';
        const sizeVal = row.size.trim().toUpperCase() || '';

        return {
          buyer: finalBuyer,
          buyer_name: finalBuyer,
          booking_date: headerData.booking_date || getTodayFormatted(),
          date: headerData.booking_date || getTodayFormatted(),
          ref_no_job_no: headerData.ref_no_job_no.trim(),
          style: headerData.ref_no_job_no.trim() || itemName,
          sr_gt_no: headerData.sr_gt_no.trim(),
          store_ref: headerData.sr_gt_no.trim() || 'DS-REF',
          po_no: headerData.po_no.trim(),
          order_no: headerData.po_no.trim(),
          item_name: itemName,
          drawstring_type: itemName,
          color: colorName,
          colour: colorName,
          size: sizeVal,
          size_mm: sizeVal,
          unit: 'PCS',
          booking_qty: bQty,
          rcv_qty: 0,
          receive_qty: 0,
          due_qty: bQty,
          balance_qty: bQty,
          last_rcvd_qty: 0,
          rcvd_date: '',
          receive_date: '',
          receive_challan: '',
          issue_qty: 0,
          issue_date: '',
          issue_challan: '',
          remarks: headerData.remarks.trim(),
          receive_logs: [],
          issue_logs: []
        };
      });

      await onAddBooking(itemsToInsert.length === 1 ? itemsToInsert[0] : itemsToInsert);

      setSavedCount(itemsToInsert.length);
      setShowSuccessPopup(true);

      resetForm();

      setTimeout(() => {
        setShowSuccessPopup(false);
        if (shouldCloseModal) {
          onClose();
        }
      }, 1200);

    } catch (err) {
      console.error("Error creating drawstring booking:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processSubmit(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      
      {/* Center Success Popup Overlay */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-teal-500 text-center max-w-sm mx-auto animate-in zoom-in-90 duration-200">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-teal-50">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">Booking Saved!</h3>
            <p className="text-sm font-bold text-teal-700 bg-teal-50 py-1.5 px-3 rounded-full inline-block border border-teal-200 mb-2">
              {savedCount} Drawstring Item(s) Posted
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              Rows auto-cleared for next entry!
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New Drawstring Booking Entry</h2>
              <p className="text-xs text-slate-300">Exact Supabase Drawstring Columns Schema</p>
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
          
          {/* AI PDF EXTRACTOR BOX */}
          <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/40 text-white space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-teal-300 flex items-center gap-1.5">
                    <span>PDF Booking Auto Extractor (Gemini AI)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                      Supabase Schema
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Upload Garments Drawstring Booking PDF to extract all line items automatically
                  </p>
                </div>
              </div>

              {/* Upload & API Key Action Buttons */}
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(prev => !prev)}
                  title="Configure Gemini API Key for Client-side / Static Hosting"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <Key className="w-4 h-4 text-teal-400" />
                </button>

                <button
                  type="button"
                  disabled={isAnalyzingPdf}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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

            {/* Optional Gemini API Key Input */}
            {showApiKeyInput && (
              <div className="p-3 bg-slate-950 border border-teal-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    <span>Client-Side Gemini API Key (For Static / GitHub Pages)</span>
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
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 py-1.5 text-white font-mono text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('gemini_api_key', userApiKey);
                      setShowApiKeyInput(false);
                    }}
                    className="px-3 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-teal-400 transition-colors cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {pdfError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{pdfError}</p>
                  <p className="text-[11px] text-red-300/80 mt-0.5">
                    Try uploading a clear Work Order PDF or enter your Gemini API Key if using static hosting.
                  </p>
                </div>
              </div>
            )}

            {/* Extracted Data Result Banner */}
            {extractedItems && extractedItems.length > 0 && (
              <div className="p-3.5 bg-teal-950/90 border border-teal-400/50 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-800/80 pb-2">
                  <div>
                    <span className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      <span>Extracted {extractedItems.length} Drawstring Booking Item(s)</span>
                    </span>
                    <p className="text-[11px] text-teal-200/80">
                      File: {pdfFileName || 'Uploaded Document'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={populateFormFromPdf}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs rounded-lg border border-teal-500/40 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Populate Form Below</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDirectImportAll}
                      className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-lg shadow-md flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Directly Import & Save All ({extractedItems.length})</span>
                    </button>
                  </div>
                </div>

                {/* Preview Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div><span className="text-slate-400">Buyer:</span> <strong className="text-teal-300">{extractedItems[0]?.buyer || extractedItems[0]?.buyer_name || 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Job No:</span> <strong className="text-white">{extractedItems[0]?.job_no || extractedItems[0]?.ref_no_job_no || 'N/A'}</strong></div>
                  <div><span className="text-slate-400">SR/GT No:</span> <strong className="text-white">{extractedItems[0]?.sr_gt || extractedItems[0]?.sr_gt_no || 'N/A'}</strong></div>
                  <div><span className="text-slate-400">PO No:</span> <strong className="text-white">{extractedItems[0]?.order_no || extractedItems[0]?.po_no || 'N/A'}</strong></div>
                </div>

                {/* Extracted Item List Preview */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {extractedItems.map((item, idx) => (
                    <div key={idx} className="text-[11px] bg-slate-900/60 px-2.5 py-1.5 rounded flex items-center justify-between border border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-teal-400">#{idx + 1}</span>
                        <span className="font-bold text-white uppercase">{item.count || item.item_name || 'DRAWSTRING'}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-bold text-amber-300">{item.colour || item.color}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-300">{item.meter || item.size || '114 CM'}</span>
                      </div>
                      <span className="font-extrabold text-teal-300 shrink-0 ml-2">
                        {item.booking_qty} PCS
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* SECTION 1: Header / Reference Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600" />
              1. Booking Reference (`buyer`, `booking_date`, `ref_no_job_no`, `sr_gt_no`, `po_no`)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Buyer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buyer * (`buyer`)</label>
                {!useCustomBuyer ? (
                  <select
                    value={headerData.buyer}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setUseCustomBuyer(true);
                      } else {
                        setHeaderData(prev => ({ ...prev, buyer: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
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

              {/* Booking Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Booking Date (`booking_date`)</label>
                <input
                  type="date"
                  value={headerData.booking_date}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, booking_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Ref No / Job No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ref No / Job No * (`ref_no_job_no`)</label>
                <input
                  type="text"
                  value={headerData.ref_no_job_no}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, ref_no_job_no: e.target.value }))}
                  placeholder="e.g. GMST-25-00831 or Booking No: GMST-TB-25-00147"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* SR/GT No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SR / GT No (`sr_gt_no`)</label>
                <input
                  type="text"
                  value={headerData.sr_gt_no}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, sr_gt_no: e.target.value }))}
                  placeholder="e.g. GMST-FB-00528"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* PO No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PO No (`po_no`)</label>
                <input
                  type="text"
                  value={headerData.po_no}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, po_no: e.target.value }))}
                  placeholder="e.g. 10000889"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

            </div>
          </div>

          {/* SECTION 2: Item Specification & Multi-Row Variants */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase">
                  <Tag className="w-3.5 h-3.5 text-teal-600" />
                  2. Drawstring Items (`item_name`, `color`, `size`, `booking_qty`)
                </h4>
                <p className="text-[11px] text-teal-800">
                  Add one or multiple items, colors, sizes, and quantities for this booking
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                + Add Item Row
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {variantRows.map((row, index) => (
                <div key={row.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-lg border border-teal-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-700 w-5 shrink-0">
                    #{index + 1}
                  </span>

                  {/* Item Name */}
                  <div className="w-32 shrink-0">
                    <input
                      type="text"
                      value={row.item_name}
                      onChange={(e) => handleRowChange(row.id, 'item_name', e.target.value)}
                      placeholder="Item Name (`item_name`)"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Color */}
                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      value={row.color}
                      onChange={(e) => handleRowChange(row.id, 'color', e.target.value)}
                      placeholder="Color (`color`) e.g. DESERT DUST, BLACK"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  {/* Size */}
                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => handleRowChange(row.id, 'size', e.target.value)}
                      placeholder="Size (`size`) e.g. 114 CM"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Booking Qty */}
                  <div className="w-32 shrink-0">
                    <input
                      type="number"
                      step="any"
                      value={row.booking_qty}
                      onChange={(e) => handleRowChange(row.id, 'booking_qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="Booking Qty (`booking_qty`)"
                      className="w-full px-2.5 py-1.5 bg-yellow-50 border border-yellow-300 rounded text-xs font-bold text-yellow-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                  </div>

                  {/* Remove Row Button */}
                  {variantRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
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

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (`remarks`)</label>
            <input
              type="text"
              value={headerData.remarks}
              onChange={(e) => setHeaderData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="e.g. Urgent delivery required..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                Save & Close
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
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
