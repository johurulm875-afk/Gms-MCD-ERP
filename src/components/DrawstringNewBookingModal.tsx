import React, { useState } from 'react';
import { DrawstringItem } from '../types';
import { X, Plus, Package, Tag, Save, Sparkles, CheckCircle2 } from 'lucide-react';

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
