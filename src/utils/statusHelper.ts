import { StatusFilter } from '../types';

export function getItemStatus(bookingQty: number | string, receiveQty: number | string): 'PENDING' | 'PARTIAL' | 'FULFILLED' {
  const b = Number(bookingQty) || 0;
  const r = Number(receiveQty) || 0;
  
  if (b > 0 && r === 0) return 'PENDING';
  if (r > 0 && r < b) return 'PARTIAL';
  return 'FULFILLED';
}

export function getItemRowStyle(bookingQty: number | string, receiveQty: number | string) {
  const status = getItemStatus(bookingQty, receiveQty);
  
  if (status === 'PENDING') {
    // 🟡 Pending receive (0 received): Clean white row background, yellow highlighting ONLY on Colour and Booking Qty cells
    return {
      rowBg: 'bg-white hover:bg-slate-50 text-slate-900 border-l-4 border-l-amber-500 transition-colors',
      badgeClass: 'bg-amber-100 text-amber-950 font-bold px-2.5 py-0.5 rounded-full border border-amber-300 text-xs inline-flex items-center gap-1.5 shadow-xs',
      statusLabel: 'Pending Receive (Yellow Cells)',
      dotColor: 'bg-amber-500',
      code: 'YELLOW',
      isPendingYellow: true,
      pendingCellClass: 'bg-amber-200 text-amber-950 font-black border border-amber-400 rounded px-2 py-0.5 shadow-2xs'
    };
  } else if (status === 'PARTIAL') {
    // 🔵 LIGHT BLUE: Clean white row background with blue indicator
    return {
      rowBg: 'bg-white hover:bg-blue-50/50 text-slate-900 border-l-4 border-l-blue-500 transition-colors',
      badgeClass: 'bg-blue-100 text-blue-950 font-bold px-2.5 py-0.5 rounded-full border border-blue-300 text-xs inline-flex items-center gap-1.5 shadow-xs',
      statusLabel: 'Partial Receive (Blue)',
      dotColor: 'bg-blue-500',
      code: 'BLUE',
      isPendingYellow: false,
      pendingCellClass: ''
    };
  } else {
    // ⚪ WHITE: bg-white (Balance 0 / Fully received / fulfilled)
    return {
      rowBg: 'bg-white hover:bg-slate-50 border-l-4 border-l-emerald-500 text-slate-800 transition-colors',
      badgeClass: 'bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-full border border-slate-300 text-xs inline-flex items-center gap-1.5',
      statusLabel: 'Fulfilled (Balance 0 - White)',
      dotColor: 'bg-emerald-500',
      code: 'WHITE',
      isPendingYellow: false,
      pendingCellClass: ''
    };
  }
}

export function matchesStatusFilter(bookingQty: number | string, receiveQty: number | string, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  const status = getItemStatus(bookingQty, receiveQty);
  return status === filter;
}
