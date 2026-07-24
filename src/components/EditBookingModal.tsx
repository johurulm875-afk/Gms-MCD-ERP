import React, { useState, useEffect } from 'react';
import { TwillTapeItem } from '../types';
import { X, Save, Trash2, Edit3, Package, Tag, Clock } from 'lucide-react';
import { getItemRowStyle } from '../utils/statusHelper';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TwillTapeItem | null;
  onUpdateBooking: (updatedItem: TwillTapeItem) => Promise<void>;
  onDeleteBooking: (id: number) => Promise<void>;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdateBooking,
  onDeleteBooking
}) => {
  const [formData, setFormData] = useState<TwillTapeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setConfirmDelete(false);
    }
  }, [item]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof TwillTapeItem, value: string | number) => {
    setFormData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      
      if (field === 'booking_qty' || field === 'receive_qty' || field === 'issue_qty') {
        const rQty = field === 'receive_qty' ? Number(value) || 0 : prev.receive_qty;
        const iQty = field === 'issue_qty' ? Number(value) || 0 : prev.issue_qty;
        updated.balance_qty = rQty > 0 ? Math.max(0, rQty - iQty) : 0;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (Number(formData.issue_qty || 0) > Number(formData.receive_qty || 0)) {
      alert(`❌ Issue Qty (${formData.issue_qty}) cannot exceed Receive Qty (${formData.receive_qty})! (ইস্যু পরিমাণ রিসিভ পরিমাণের চেয়ে বেশি হতে পারবে না)`);
      return;
    }

    try {
      setIsSaving(true);
      await onUpdateBooking(formData);
      onClose();
    } catch (err) {
      console.error("Failed to update booking:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData) return;
    try {
      setIsDeleting(true);
      await onDeleteBooking(formData.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete booking:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusStyle = getItemRowStyle(formData.booking_qty, formData.receive_qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Edit Booking #{formData.id}</h2>
                <span className={statusStyle.badgeClass}>
                  {statusStyle.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300">Update complete details for this inventory row</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Buyer Name</label>
              <input
                type="text"
                value={formData.buyer_name}
                onChange={(e) => handleChange('buyer_name', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Booking Date</label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Booking Challan</label>
              <input
                type="text"
                value={formData.booking_challan}
                onChange={(e) => handleChange('booking_challan', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Style</label>
              <input
                type="text"
                value={formData.style}
                onChange={(e) => handleChange('style', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Order No (PO)</label>
              <input
                type="text"
                value={formData.order_no}
                onChange={(e) => handleChange('order_no', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">Store Ref Index</label>
              <input
                type="text"
                value={formData.store_ref || ''}
                onChange={(e) => handleChange('store_ref', e.target.value)}
                className="w-full px-3 py-2 bg-indigo-50 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job No</label>
              <input
                type="text"
                value={formData.job_no || ''}
                onChange={(e) => handleChange('job_no', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Item Specs & Quantities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Colour</label>
              <input
                type="text"
                value={formData.colour}
                onChange={(e) => handleChange('colour', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Name</label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => handleChange('item_name', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CM Width</label>
              <input
                type="text"
                value={formData.cm}
                onChange={(e) => handleChange('cm', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.yds}
                onChange={(e) => handleChange('yds', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Receive & Issue Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Booking Qty */}
            <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 space-y-2">
              <label className="block text-xs font-bold text-yellow-900">Booking Qty</label>
              <input
                type="number"
                step="any"
                value={formData.booking_qty}
                onChange={(e) => handleChange('booking_qty', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Receive Qty & Date */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <label className="block text-xs font-bold text-emerald-900">Receive Qty & Date</label>
              <input
                type="number"
                step="any"
                value={formData.receive_qty}
                onChange={(e) => handleChange('receive_qty', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Recv Qty"
              />
              <input
                type="text"
                value={formData.receive_date}
                onChange={(e) => handleChange('receive_date', e.target.value)}
                placeholder="Recv Date (DD.MM.YYYY)"
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={formData.receive_challan}
                onChange={(e) => handleChange('receive_challan', e.target.value)}
                placeholder="Recv Challan #"
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Issue Qty & Date */}
            {(() => {
              const isExceeded = Number(formData.issue_qty || 0) > Number(formData.receive_qty || 0);
              return (
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isExceeded ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'
                }`}>
                  <label className={`block text-xs font-bold ${isExceeded ? 'text-red-900' : 'text-blue-900'}`}>
                    Issue Qty & Date
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.issue_qty}
                    onChange={(e) => handleChange('issue_qty', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      isExceeded ? 'border-red-500 focus:ring-red-500 ring-1 ring-red-400' : 'border-blue-300 focus:ring-blue-500'
                    }`}
                    placeholder="Issue Qty"
                  />
                  {isExceeded && (
                    <p className="text-[11px] font-bold text-red-600 bg-red-100 p-1.5 rounded border border-red-200">
                      ❌ Issue ({formData.issue_qty}) exceeds Received Qty ({formData.receive_qty})
                    </p>
                  )}
                  <input
                    type="text"
                    value={formData.issue_date}
                    onChange={(e) => handleChange('issue_date', e.target.value)}
                    placeholder="Issue Date (DD.MM.YYYY)"
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={formData.issue_challan}
                    onChange={(e) => handleChange('issue_challan', e.target.value)}
                    placeholder="Issue Challan #"
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              );
            })()}

          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Row
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
