import React, { useState } from 'react';
import { TwillTapeItem } from '../types';
import { X, Plus, Package, Tag, Save, CheckCircle2 } from 'lucide-react';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBooking: (newItem: Omit<TwillTapeItem, 'id'> | Omit<TwillTapeItem, 'id'>[]) => Promise<void>;
  existingBuyers?: string[];
}

interface ColourRow {
  id: string;
  colour: string;
  booking_qty: number | '';
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onAddBooking,
  existingBuyers = ['Stanley Stella', 'KARIBAN', 'DIADORA']
}) => {
  function getTodayFormatted(): string {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  const [formData, setFormData] = useState<Omit<TwillTapeItem, 'id'>>({
    buyer_name: 'Stanley Stella',
    date: getTodayFormatted(),
    booking_challan: '',
    style: '',
    order_no: 'PO No ',
    store_ref: 'GMST-FB-26-',
    job_no: '',
    colour: '',
    item_name: 'H.B. TAPE',
    cm: '1.2CM',
    yds: 'YDS',
    booking_qty: 0,
    receive_qty: 0,
    receive_date: '',
    receive_challan: '',
    issue_qty: 0,
    issue_date: '',
    issue_challan: '',
    balance_qty: 0,
    remarks: ''
  });

  // Multi-colour rows state
  const [colourRows, setColourRows] = useState<ColourRow[]>([
    { id: '1', colour: '', booking_qty: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customBuyer, setCustomBuyer] = useState('');
  const [useCustomBuyer, setUseCustomBuyer] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedCount, setSavedCount] = useState(1);

  const doResetForm = () => {
    setFormData({
      buyer_name: existingBuyers[0] || 'Stanley Stella',
      date: getTodayFormatted(),
      booking_challan: '',
      style: '',
      order_no: 'PO No ',
      store_ref: 'GMST-FB-26-',
      job_no: '',
      colour: '',
      item_name: 'H.B. TAPE',
      cm: '1.2CM',
      yds: 'YDS',
      booking_qty: 0,
      receive_qty: 0,
      receive_date: '',
      receive_challan: '',
      issue_qty: 0,
      issue_date: '',
      issue_challan: '',
      balance_qty: 0,
      remarks: ''
    });
    setColourRows([
      { id: '1', colour: '', booking_qty: '' }
    ]);
    setCustomBuyer('');
    setUseCustomBuyer(false);
  };

  const handleAddColourRow = () => {
    setColourRows(prev => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(), colour: '', booking_qty: '' }
    ]);
  };

  const handleRemoveColourRow = (id: string) => {
    if (colourRows.length === 1) return;
    setColourRows(prev => prev.filter(r => r.id !== id));
  };

  const handleColourRowChange = (id: string, field: 'colour' | 'booking_qty', value: string | number) => {
    setColourRows(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleChange = (field: keyof Omit<TwillTapeItem, 'id'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const processSubmit = async (shouldCloseModal: boolean) => {
    try {
      setIsSubmitting(true);
      const finalBuyer = useCustomBuyer ? customBuyer.trim() : formData.buyer_name;
      
      const validColourRows = colourRows.filter(r => r.colour.trim().length > 0);
      if (validColourRows.length === 0) {
        alert("Please enter at least one Colour name");
        setIsSubmitting(false);
        return;
      }

      // Generate a booking object for each colour
      const itemsToInsert: Omit<TwillTapeItem, 'id'>[] = validColourRows.map(row => {
        const bQty = Number(row.booking_qty) || 0;
        const rQty = Number(formData.receive_qty) || 0;
        const iQty = Number(formData.issue_qty) || 0;

        if (iQty > rQty) {
          throw new Error(`❌ Issue Qty (${iQty}) cannot exceed Receive Qty (${rQty})! (ইস্যু পরিমাণ রিসিভ পরিমাণের চেয়ে বেশি হতে পারবে না)`);
        }

        const balQty = rQty > 0 ? Math.max(0, rQty - iQty) : 0;

        const finalRecvDate = rQty > 0 ? (formData.receive_date || '') : '';
        const finalIssueDate = iQty > 0 ? (formData.issue_date || '') : '';

        return {
          ...formData,
          buyer_name: finalBuyer || 'General Buyer',
          colour: row.colour.trim().toUpperCase(),
          booking_qty: bQty,
          receive_qty: rQty,
          receive_date: finalRecvDate,
          receive_challan: rQty > 0 ? (formData.receive_challan || '') : '',
          issue_qty: iQty,
          issue_date: finalIssueDate,
          issue_challan: iQty > 0 ? (formData.issue_challan || '') : '',
          balance_qty: balQty
        };
      });

      await onAddBooking(itemsToInsert.length === 1 ? itemsToInsert[0] : itemsToInsert);

      // Show prominent centered success popup
      setSavedCount(itemsToInsert.length);
      setShowSuccessPopup(true);

      // Reset form immediately
      doResetForm();

      setTimeout(() => {
        setShowSuccessPopup(false);
        if (shouldCloseModal) {
          onClose();
        }
      }, 1200);

    } catch (err) {
      console.error("Error creating booking:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processSubmit(false); // Default to Save & Add Next
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

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New Booking Entry</h2>
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
          
          {/* SECTION 1: Buyer & General Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              1. Buyer & Order Identification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Buyer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buyer Name *</label>
                {!useCustomBuyer ? (
                  <select
                    value={formData.buyer_name}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setUseCustomBuyer(true);
                      } else {
                        handleChange('buyer_name', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Booking Date *</label>
                <input
                  type="text"
                  value={formData.date || ''}
                  onChange={(e) => handleChange('date', e.target.value)}
                  placeholder="DD.MM.YYYY"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Booking Challan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Booking Challan *</label>
                <input
                  type="text"
                  value={formData.booking_challan || ''}
                  onChange={(e) => handleChange('booking_challan', e.target.value)}
                  placeholder="e.g. 26787"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Style */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style *</label>
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => handleChange('style', e.target.value)}
                  placeholder="e.g. SASU004 Changer 2.0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Order No / PO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order No (PO) *</label>
                <input
                  type="text"
                  value={formData.order_no}
                  onChange={(e) => handleChange('order_no', e.target.value)}
                  placeholder="e.g. PO No 10002455"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Store Ref (MAIN INDEX) */}
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center justify-between">
                  <span>Store Ref. Index *</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">Main Search Key</span>
                </label>
                <input
                  type="text"
                  value={formData.store_ref || ''}
                  onChange={(e) => handleChange('store_ref', e.target.value)}
                  placeholder="e.g. GMST-FB-26-00593"
                  className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Job No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job No
                </label>
                <input
                  type="text"
                  value={formData.job_no || ''}
                  onChange={(e) => handleChange('job_no', e.target.value)}
                  placeholder="e.g. JOB-26-0593"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>
          </div>

          {/* SECTION 2: Item Specification & Multi-Colour Entry */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              2. Item Specifications & Multi-Colour Entry
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name</label>
                <select
                  value={formData.item_name}
                  onChange={(e) => handleChange('item_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="H.B. TAPE">H.B. TAPE</option>
                  <option value="HERRING BONE">HERRING BONE</option>
                  <option value="Rib Tape">Rib Tape</option>
                  <option value="Gross Grain Tape">Gross Grain Tape</option>
                  <option value="Drawstring">Drawstring</option>
                  <option value="Stripe Tape">Stripe Tape</option>
                  <option value="Elastic Tape">Elastic Tape</option>
                </select>
              </div>

              {/* CM (Width) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Size (CM)</label>
                <input
                  type="text"
                  value={formData.cm}
                  onChange={(e) => handleChange('cm', e.target.value)}
                  placeholder="e.g. 1.2CM, 1CM"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Unit (YDS) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.yds}
                  onChange={(e) => handleChange('yds', e.target.value)}
                  placeholder="YDS"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* MULTI-COLOUR (+) ENTRY BLOCK */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5 uppercase">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Colours & Booking Quantities (Multi-Insert)
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Add multiple colours for this garment store ref in 1 click!
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
                  <div key={row.id} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-300 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 w-5 shrink-0">
                      #{index + 1}
                    </span>

                    {/* Colour Name */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={row.colour}
                        onChange={(e) => handleColourRowChange(row.id, 'colour', e.target.value)}
                        placeholder="Colour Name (e.g. BLACK, HEATHER GREY)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    {/* Booking Qty */}
                    <div className="w-36 shrink-0">
                      <input
                        type="number"
                        step="any"
                        value={row.booking_qty}
                        onChange={(e) => handleColourRowChange(row.id, 'booking_qty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="Booking Qty (YDS)"
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
                        title="Remove colour"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Initial Receive Qty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Receive Qty (Optional)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.receive_qty || ''}
                  onChange={(e) => handleChange('receive_qty', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Receive Date</label>
                <input
                  type="text"
                  value={formData.receive_date}
                  onChange={(e) => handleChange('receive_date', e.target.value)}
                  placeholder="DD.MM.YYYY"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="e.g. Special priority order, urgent receive..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
