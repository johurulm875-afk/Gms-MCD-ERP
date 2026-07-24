import React, { useState } from 'react';
import { SewingThreadItem } from '../types';
import { X, Plus, Package, Tag, Save, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    meter: '5000M',
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
      meter: '5000M',
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

