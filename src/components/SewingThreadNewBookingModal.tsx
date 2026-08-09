import React, { useState, useRef } from 'react';
import { SewingThreadItem } from '../types';
import { X, Plus, Package, Tag, Save, Sparkles, CheckCircle2, AlertTriangle, Upload, FileText, Loader2, ArrowRight, Key, RefreshCw, Layers } from 'lucide-react';
import { extractPdfClientSide, forwardFillHeaderInfo, deduplicateExtractedItems } from '../utils/clientGeminiExtractor';
import { convertPdfToJpegImages, getPdfTotalPages } from '../utils/pdfToImage';

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

  // AI PDF / Image Extractor state
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [pageProgress, setPageProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'range'>('all');
  const [startPageInput, setStartPageInput] = useState<number>(1);
  const [endPageInput, setEndPageInput] = useState<string>('');

  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<any[] | null>(null);
  const [detectedDocGrandTotal, setDetectedDocGrandTotal] = useState<number | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [lastUploadedFiles, setLastUploadedFiles] = useState<File[] | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>(() => (localStorage.getItem('ai_provider') as 'gemini' | 'openrouter') || 'gemini');
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => localStorage.getItem('openrouter_api_key') || '');
  const [openRouterModel, setOpenRouterModel] = useState<string>(() => {
    const saved = localStorage.getItem('openrouter_model');
    if (!saved || saved === 'qwen/qwen-2.5-vl-72b-instruct:free') {
      return 'qwen/qwen-2.5-vl-72b-instruct';
    }
    return saved;
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const pdfFile = fileList.find(f => f.type.includes('pdf') || f.name.endsWith('.pdf'));
    const imageFiles = fileList.filter(f => f.type.startsWith('image/'));

    if (!pdfFile && imageFiles.length === 0) {
      setPdfError("Please select a valid PDF or Image file (JPG, PNG, WEBP).");
      return;
    }

    setLastUploadedFiles(fileList);
    setIsAnalyzingPdf(true);
    setPdfError(null);
    setDetectedDocGrandTotal(null);
    setAnalysisStatus("Loading file(s)...");
    setPageProgress(null);
    const uploadedNames = fileList.map(f => f.name).join(', ');
    setPdfFileName(uploadedNames);

    try {
      let accumulatedItems: any[] = [];

      if (imageFiles.length > 0) {
        // Handle images 1 by 1
        const readPromises = imageFiles.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }));

        const imagesBase64 = await Promise.all(readPromises);

        for (let i = 0; i < imagesBase64.length; i++) {
          setPageProgress({ current: i + 1, total: imagesBase64.length });
          setAnalysisStatus(`Extracting Image ${i + 1} of ${imagesBase64.length}... (${accumulatedItems.length} items found so far)`);

          const singleImage = [imagesBase64[i]];
          let pageItems: any[] = [];

          try {
            const res = await fetch('/api/extract-sewing-thread-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imagesBase64: singleImage,
                aiProvider,
                apiKey: userApiKey || undefined,
                openRouterKey: openRouterKey || undefined,
                openRouterModel
              })
            });

            const rawText = await res.text();
            if (rawText && !rawText.startsWith('<') && !rawText.includes('<html>')) {
              const data = JSON.parse(rawText);
              if (res.ok && data.success && Array.isArray(data.data)) {
                pageItems = data.data;
              } else if (data.error) {
                const errStr = String(data.error);
                if (res.status === 429 || errStr.includes('429') || errStr.includes('quota')) {
                  throw new Error("Gemini free limit reached. Switch to Qwen OpenRouter Key or wait 15 seconds.");
                }
                throw new Error(errStr);
              }
            }
          } catch (backendErr) {
            console.warn(`Backend error on image ${i + 1}, falling back to client extractor:`, backendErr);
            pageItems = await extractPdfClientSide(
              singleImage,
              'image/jpeg',
              userApiKey,
              { aiProvider, openRouterKey, openRouterModel }
            );
          }

          if (Array.isArray(pageItems) && pageItems.length > 0) {
            accumulatedItems = [...accumulatedItems, ...pageItems];
            setExtractedItems(prev => [...(prev || []), ...pageItems]);
          }
        }
      } else if (pdfFile) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfFile);
        });

        setAnalysisStatus("Counting PDF pages...");
        const totalPagesCount = await getPdfTotalPages(base64Data);
        setPdfTotalPages(totalPagesCount);

        let sPage = 1;
        let ePage = totalPagesCount;

        if (pageRangeMode === 'range') {
          sPage = Math.max(1, startPageInput || 1);
          ePage = endPageInput ? Math.min(totalPagesCount, Math.max(sPage, Number(endPageInput) || totalPagesCount)) : totalPagesCount;
        }

        setAnalysisStatus(`Rendering page(s) ${sPage} to ${ePage} of ${totalPagesCount}...`);
        const { pages } = await convertPdfToJpegImages(base64Data, sPage, ePage);

        if (!pages || pages.length === 0) {
          throw new Error("Could not render selected pages from PDF.");
        }

        // Automatic page-by-page extraction loop!
        for (let i = 0; i < pages.length; i++) {
          const pageObj = pages[i];
          setPageProgress({ current: i + 1, total: pages.length });
          setAnalysisStatus(`Extracting Page ${pageObj.pageNum} of ${totalPagesCount}... (${accumulatedItems.length} items found so far)`);

          // Extract page image cleanly (forwardFillHeaderInfo handles cross-page header inheritance)
          const singlePageImage = [pageObj.dataUrl];
          let pageItems: any[] = [];

          try {
            const res = await fetch('/api/extract-sewing-thread-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imagesBase64: singlePageImage,
                aiProvider,
                apiKey: userApiKey || undefined,
                openRouterKey: openRouterKey || undefined,
                openRouterModel
              })
            });

            const rawText = await res.text();
            if (rawText && !rawText.startsWith('<') && !rawText.includes('<html>')) {
              const data = JSON.parse(rawText);
              if (res.ok && data.success && Array.isArray(data.data)) {
                pageItems = data.data;
              } else if (data.error) {
                const errStr = String(data.error);
                if (res.status === 429 || errStr.includes('429') || errStr.includes('quota')) {
                  throw new Error("Gemini free limit reached. Switch to Qwen OpenRouter Key below or wait 15 seconds.");
                }
                throw new Error(errStr);
              }
            }
          } catch (backendErr: any) {
            console.warn(`Backend error on page ${pageObj.pageNum}, falling back to client extractor:`, backendErr);
            pageItems = await extractPdfClientSide(
              singlePageImage,
              'image/jpeg',
              userApiKey,
              { aiProvider, openRouterKey, openRouterModel }
            );
          }

          if (Array.isArray(pageItems) && pageItems.length > 0) {
            accumulatedItems = deduplicateExtractedItems(forwardFillHeaderInfo([...accumulatedItems, ...pageItems]));
            for (const item of pageItems) {
              if (item.doc_grand_total && !isNaN(Number(item.doc_grand_total))) {
                const gTotalVal = Number(item.doc_grand_total);
                if (gTotalVal > 0) {
                  setDetectedDocGrandTotal(gTotalVal);
                }
              }
            }
            // Update UI in real-time with forward-filled cumulative items!
            setExtractedItems(accumulatedItems);
          }
        }
      }

      if (accumulatedItems.length === 0) {
        setPdfError("No thread booking rows could be extracted from the document. Please verify page range or document formatting.");
      }
    } catch (err: any) {
      console.error("Extraction Error:", err);
      const msg = String(err?.message || err);
      if (
        msg.includes("Gemini API Key") ||
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("OpenRouter") ||
        msg.includes("rate limit")
      ) {
        setShowApiKeyInput(true);
      }
      setPdfError(msg || "An error occurred while parsing document.");
    } finally {
      setIsAnalyzingPdf(false);
      setAnalysisStatus(null);
      setPageProgress(null);
    }
  };

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
    await handleFileUpload([file]);
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
          date: item.booking_date || item.date || getTodayFormatted(),
          booking_challan: '',
          style: item.style || '',
          order_no: item.order_no || item.po_no || '',
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
          meter: (item.meter && !String(item.meter).toUpperCase().includes('CM') && !String(item.meter).includes('114')) ? String(item.meter) : '4000',
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
          
          {/* SECTION 0: AI PDF / Image Work Order Extractor */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white border border-indigo-800/80 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                    <span>AI PDF / Image Work Order Extractor</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      {aiProvider === 'openrouter' ? 'Qwen 2.5 Vision (Free)' : 'Gemini 3.6 Flash'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Upload PDF or 1-3 Images (JPG, PNG) to extract booking line items automatically
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(prev => !prev)}
                  title="AI Provider Settings & API Keys"
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                >
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>AI Keys / Settings</span>
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
                      <span>Analyzing File(s)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload PDF / Images</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Provider & API Keys Configuration Panel */}
            {showApiKeyInput && (
              <div className="p-3.5 bg-slate-900/95 border border-emerald-500/40 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Select AI Provider & Configure API Keys</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('gemini');
                        localStorage.setItem('ai_provider', 'gemini');
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                        aiProvider === 'gemini'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Google Gemini API
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('openrouter');
                        localStorage.setItem('ai_provider', 'openrouter');
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                        aiProvider === 'openrouter'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Qwen Free (OpenRouter)
                    </button>
                  </div>
                </div>

                {/* Gemini Settings */}
                {aiProvider === 'gemini' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Gemini API Key (Optional for fallback / rate limit bypass):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Enter Gemini API Key (AIzaSy...)"
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
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* OpenRouter Settings */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-indigo-300">
                        OpenRouter API Key & Preferred Vision Model:
                      </label>
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        Get free key at openrouter.ai ↗
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        placeholder="sk-or-v1-..."
                        value={openRouterKey}
                        onChange={(e) => {
                          setOpenRouterKey(e.target.value);
                          localStorage.setItem('openrouter_api_key', e.target.value);
                        }}
                        className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-white font-mono text-xs outline-none"
                      />
                      <select
                        value={openRouterModel}
                        onChange={(e) => {
                          setOpenRouterModel(e.target.value);
                          localStorage.setItem('openrouter_model', e.target.value);
                        }}
                        className="bg-slate-950 border border-slate-800 text-indigo-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="qwen/qwen-2.5-vl-72b-instruct">Qwen 2.5 Vision (72B)</option>
                        <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (Free)</option>
                        <option value="meta-llama/llama-3.2-11b-vision-instruct:free">Llama 3.2 Vision (Free)</option>
                        <option value="openrouter/auto">Auto Route (OpenRouter)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('openrouter_api_key', openRouterKey);
                          localStorage.setItem('openrouter_model', openRouterModel);
                          setShowApiKeyInput(false);
                        }}
                        className="px-3 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-xs hover:bg-indigo-400 transition-colors cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF Page Extraction Settings */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>PDF Page Extraction Mode:</span>
                    </label>
                    {pdfTotalPages && (
                      <span className="text-[10px] text-amber-400 font-mono font-semibold bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
                        {pdfTotalPages} Pages Detected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-white">
                      <input
                        type="radio"
                        name="pageRangeMode"
                        checked={pageRangeMode === 'all'}
                        onChange={() => setPageRangeMode('all')}
                        className="accent-amber-500 cursor-pointer"
                      />
                      <span>Extract All Pages (1 page at a time)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-white">
                      <input
                        type="radio"
                        name="pageRangeMode"
                        checked={pageRangeMode === 'range'}
                        onChange={() => setPageRangeMode('range')}
                        className="accent-amber-500 cursor-pointer"
                      />
                      <span>Specific Page Range:</span>
                    </label>
                    {pageRangeMode === 'range' && (
                      <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <span>Page</span>
                        <input
                          type="number"
                          min={1}
                          value={startPageInput}
                          onChange={(e) => setStartPageInput(Math.max(1, Number(e.target.value)))}
                          className="w-12 bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded px-1.5 py-0.5 text-center outline-none focus:border-amber-500"
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min={startPageInput}
                          placeholder={pdfTotalPages ? String(pdfTotalPages) : "End"}
                          value={endPageInput}
                          onChange={(e) => setEndPageInput(e.target.value)}
                          className="w-12 bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded px-1.5 py-0.5 text-center outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Live Page-by-Page Progress Banner */}
            {isAnalyzingPdf && (
              <div className="p-4 bg-slate-900/90 border border-indigo-500/50 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 font-bold text-indigo-200">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
                    <span>{analysisStatus || 'Analyzing PDF page by page...'}</span>
                  </div>
                  {pageProgress && (
                    <span className="font-mono bg-indigo-950 border border-indigo-800 px-2.5 py-1 rounded-md text-xs font-bold text-indigo-300 shrink-0">
                      Page {pageProgress.current} / {pageProgress.total}
                    </span>
                  )}
                </div>
                {pageProgress && pageProgress.total > 0 && (
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${Math.round((pageProgress.current / pageProgress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error Message with Interactive Retry */}
            {pdfError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{pdfError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider('openrouter');
                      localStorage.setItem('ai_provider', 'openrouter');
                      setShowApiKeyInput(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Switch to Qwen Free
                  </button>
                  {lastUploadedFiles && (
                    <button
                      type="button"
                      disabled={isAnalyzingPdf}
                      onClick={() => handleFileUpload(lastUploadedFiles)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingPdf ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzingPdf ? 'Retrying...' : 'Retry Parsing'}</span>
                    </button>
                  )}
                </div>
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
                      onClick={() => setExtractedItems(null)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-rose-300 transition-colors"
                      title="Clear extracted list"
                    >
                      Clear
                    </button>
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

                {/* Grand Total Check & Comparison Card */}
                {(() => {
                  const convertedTotal = Math.round((extractedItems.reduce((acc, it) => acc + (Number(it.booking_qty) || 0), 0) + Number.EPSILON) * 100) / 100;
                  const pdfGrandTotal = detectedDocGrandTotal;
                  const hasPdfTotal = pdfGrandTotal !== null && pdfGrandTotal > 0;
                  const isMatch = hasPdfTotal ? Math.abs(convertedTotal - pdfGrandTotal) < 0.1 : null;

                  return (
                    <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">Grand Total Verification Check</span>
                        </div>
                        {hasPdfTotal && (
                          <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                            isMatch 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          }`}>
                            {isMatch ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Totals Match! (100% Accurately Processed)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Quantity Mismatch Detected!</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Extracted Cones Sum */}
                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                            Converted File Grand Total ({extractedItems.length} items)
                          </div>
                          <div className="text-lg font-black text-amber-400 font-mono">
                            {convertedTotal.toLocaleString()} <span className="text-xs font-bold text-slate-300">Cones</span>
                          </div>
                        </div>

                        {/* Printed PDF Grand Total */}
                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                            <span>Printed PDF Grand Total</span>
                            <span className="text-[9px] text-slate-500">(Auto-detected / Editable)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              placeholder="Enter Printed Total..."
                              value={detectedDocGrandTotal !== null ? detectedDocGrandTotal : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setDetectedDocGrandTotal(val);
                              }}
                              className="w-full bg-slate-950 text-emerald-300 font-mono font-bold text-base px-2.5 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-xs font-bold text-slate-300 shrink-0">Cones</span>
                          </div>
                        </div>
                      </div>

                      {hasPdfTotal && !isMatch && (
                        <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-lg text-[11px] text-rose-300 flex items-center justify-between">
                          <span>
                            ⚠️ Converted items total (<strong>{convertedTotal}</strong>) differs from printed PDF total (<strong>{pdfGrandTotal}</strong>).
                          </span>
                          <span className="font-mono font-bold text-rose-200 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                            Diff: {Math.round((convertedTotal - pdfGrandTotal) * 100) / 100} Cones
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

