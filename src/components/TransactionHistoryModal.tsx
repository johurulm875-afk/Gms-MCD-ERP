import React, { useState } from 'react';
import { TwillTapeItem, TransactionLog } from '../types';
import { X, Calendar, Hash, Tag, Plus, CheckCircle2, AlertCircle, ArrowDownCircle, ArrowUpCircle, History, Package, Clock, Edit2 } from 'lucide-react';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TwillTapeItem | null;
  onAddLog?: (itemId: number, log: TransactionLog) => Promise<void>;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddLog
}) => {
  if (!isOpen || !item) return null;

  function getTodayFormatted(): string {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  const [showAddLogForm, setShowAddLogForm] = useState(false);
  const [logType, setLogType] = useState<'RECEIVE' | 'ISSUE'>('RECEIVE');
  const [logDate, setLogDate] = useState(getTodayFormatted());
  const [logChallan, setLogChallan] = useState('');
  const [logBatchNo, setLogBatchNo] = useState('');
  const [logQty, setLogQty] = useState<number | ''>('');
  const [logRemarks, setLogRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine legacy single receive_date / issue_date with logs array for a complete timeline
  const allLogs: TransactionLog[] = [];

  if (item.receive_logs && item.receive_logs.length > 0) {
    allLogs.push(...item.receive_logs);
  } else if (item.receive_qty > 0) {
    allLogs.push({
      id: 'legacy-recv-1',
      type: 'RECEIVE',
      date: item.receive_date || item.date || 'Initial Date',
      challan: item.receive_challan || 'Initial Challan',
      qty: item.receive_qty,
      remarks: 'Initial Receive Entry'
    });
  }

  if (item.issue_logs && item.issue_logs.length > 0) {
    allLogs.push(...item.issue_logs);
  } else if (item.issue_qty > 0) {
    allLogs.push({
      id: 'legacy-iss-1',
      type: 'ISSUE',
      date: item.issue_date || 'Initial Issue Date',
      challan: item.issue_challan || 'Initial Issue Challan',
      qty: item.issue_qty,
      remarks: 'Initial Issue Entry'
    });
  }

  // Sort logs by date or ID
  allLogs.sort((a, b) => b.date.localeCompare(a.date));

  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logQty || Number(logQty) <= 0) return;

    try {
      setIsSubmitting(true);
      const newLog: TransactionLog = {
        id: Date.now().toString(),
        type: logType,
        date: logDate || getTodayFormatted(),
        challan: logChallan || 'N/A',
        batch_no: logBatchNo || undefined,
        qty: Number(logQty),
        remarks: logRemarks
      };

      if (onAddLog) {
        await onAddLog(item.id, newLog);
      }

      setLogQty('');
      setLogChallan('');
      setLogBatchNo('');
      setLogRemarks('');
      setShowAddLogForm(false);
    } catch (err) {
      console.error("Failed to add transaction log:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Date-wise Receive & Issue History</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  {item.colour}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Store Ref: <strong className="text-amber-300">{item.store_ref}</strong> {item.job_no && `| Job: ${item.job_no}`} | Buyer: {item.buyer_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Key Metrics Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Booking Qty</span>
            <span className="font-mono text-sm font-extrabold text-slate-900">{item.booking_qty.toLocaleString()} {item.yds}</span>
          </div>

          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-emerald-700">Total Received</span>
            <span className="font-mono text-sm font-extrabold text-emerald-800">{item.receive_qty.toLocaleString()} {item.yds}</span>
          </div>

          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-blue-700">Total Issued</span>
            <span className="font-mono text-sm font-extrabold text-blue-800">{item.issue_qty.toLocaleString()} {item.yds}</span>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase text-amber-800">Current Balance</span>
            <span className="font-mono text-sm font-extrabold text-amber-900">{item.balance_qty.toLocaleString()} {item.yds}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Item Context Details Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-700">
            <div><strong>Style:</strong> {item.style}</div>
            <div><strong>PO / Order No:</strong> {item.order_no}</div>
            <div><strong>Item Spec:</strong> {item.item_name} ({item.cm})</div>
            <div><strong>Booking Date:</strong> {item.date}</div>
            <div><strong>Booking Challan:</strong> {item.booking_challan}</div>
            <div><strong>Remarks:</strong> {item.remarks || 'None'}</div>
          </div>

          {/* Add Transaction Entry Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Transaction Log Timeline ({allLogs.length} entries)
            </h3>

            {onAddLog && (
              <button
                type="button"
                onClick={() => setShowAddLogForm(!showAddLogForm)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddLogForm ? 'Cancel Form' : 'Log New Receive / Issue'}
              </button>
            )}
          </div>

          {/* Add Log Form */}
          {showAddLogForm && (
            <form onSubmit={handleAddLogSubmit} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add New Transaction (Date & Challan Entry)
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Type</label>
                  <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value as 'RECEIVE' | 'ISSUE')}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    <option value="RECEIVE">🟢 RECEIVE (+)</option>
                    <option value="ISSUE">🔵 ISSUE (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="text"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    placeholder="DD.MM.YYYY"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Challan No</label>
                  <input
                    type="text"
                    value={logChallan}
                    onChange={(e) => setLogChallan(e.target.value)}
                    placeholder="e.g. CH-202"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Batch No</label>
                  <input
                    type="text"
                    value={logBatchNo}
                    onChange={(e) => setLogBatchNo(e.target.value)}
                    placeholder="Batch / Roll #"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Quantity ({item.yds})</label>
                  <input
                    type="number"
                    step="any"
                    value={logQty}
                    onChange={(e) => setLogQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Note / Remarks</label>
                <input
                  type="text"
                  value={logRemarks}
                  onChange={(e) => setLogRemarks(e.target.value)}
                  placeholder="Optional note for this entry..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLogForm(false)}
                  className="px-3 py-1 rounded bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          )}

          {/* Timeline of Logs */}
          {allLogs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
              No receive or issue transaction logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {allLogs.map((log, idx) => (
                <div key={log.id || idx} className="relative pl-8 group">
                  
                  {/* Timeline Indicator Node */}
                  <div className={`absolute left-1.5 top-2.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                    log.type === 'RECEIVE'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-blue-500 text-blue-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'RECEIVE' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  </div>

                  {/* Transaction Entry Card */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    log.type === 'RECEIVE'
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : 'bg-blue-50/50 border-blue-200 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                          log.type === 'RECEIVE'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {log.type}
                        </span>

                        <span className="font-bold text-xs text-slate-900">
                          Date: <span className="font-mono underline">{log.date}</span>
                        </span>

                        <span className="text-xs text-slate-600 font-mono">
                          Challan: <strong className="text-slate-900">{log.challan}</strong>
                        </span>

                        {log.batch_no && (
                          <span className="text-xs font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300 font-bold">
                            Batch: {log.batch_no}
                          </span>
                        )}
                      </div>

                      <div className={`font-mono text-sm font-extrabold ${
                        log.type === 'RECEIVE' ? 'text-emerald-700' : 'text-blue-700'
                      }`}>
                        {log.type === 'RECEIVE' ? '+' : '-'}{log.qty.toLocaleString()} {item.yds}
                      </div>
                    </div>

                    {log.remarks && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        "{log.remarks}"
                      </p>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
};
